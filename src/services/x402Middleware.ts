import { X402Protocol, X402Header } from './x402Protocol';

export interface X402RequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  serviceId: string;
  serviceType: 'agent' | 'api' | 'web_service';
  walletAddress: string;
  sessionToken?: string;
  paymentProof?: string;
}

export interface X402Response<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  paymentRequired?: boolean;
  requiredAmount?: number;
  x402Header?: string;
  remainingBalance?: number;
}

export class X402Middleware {
  private static async getServicePrice(
    serviceId: string,
    serviceType: 'agent' | 'api' | 'web_service'
  ): Promise<number> {
    const config = await X402Protocol.getServiceConfig(serviceId, serviceType);
    return config?.base_price || 0;
  }

  static async makeX402Request<T = any>(
    config: X402RequestConfig
  ): Promise<X402Response<T>> {
    try {
      const serviceConfig = await X402Protocol.getServiceConfig(
        config.serviceId,
        config.serviceType
      );

      if (!serviceConfig) {
        return {
          success: false,
          error: 'Service not configured for x402 payments'
        };
      }

      if (!serviceConfig.accepts_x402) {
        return {
          success: false,
          error: 'Service does not accept x402 payments'
        };
      }

      const amount = serviceConfig.base_price;

      if (config.sessionToken) {
        return await this.makeSessionPayment(config, amount);
      } else if (config.paymentProof) {
        return await this.makeProofPayment(config, amount, serviceConfig.owner_wallet);
      } else {
        return {
          success: false,
          paymentRequired: true,
          requiredAmount: amount,
          error: 'Payment required: provide sessionToken or paymentProof'
        };
      }
    } catch (error: any) {
      console.error('x402 request error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private static async makeSessionPayment<T>(
    config: X402RequestConfig,
    amount: number
  ): Promise<X402Response<T>> {
    try {
      const validation = await X402Protocol.validateSession(config.sessionToken!, amount);

      if (!validation.valid) {
        return {
          success: false,
          paymentRequired: true,
          requiredAmount: amount,
          error: validation.error
        };
      }

      const result = await X402Protocol.deductFromSession(
        config.sessionToken!,
        amount,
        config.url,
        this.getResourceType(config.serviceType),
        config.method
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          paymentRequired: result.errorCode === 'INSUFFICIENT_BALANCE'
        };
      }

      const headers = {
        ...config.headers,
        'X-402-Payment': X402Protocol.formatX402Header({
          sessionToken: config.sessionToken,
          walletAddress: config.walletAddress,
          amount,
          currency: 'USDC',
          timestamp: Date.now()
        })
      };

      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: config.body ? JSON.stringify(config.body) : undefined
      });

      const data = await response.json();

      return {
        success: response.ok,
        data,
        remainingBalance: result.remainingBalance,
        x402Header: headers['X-402-Payment']
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private static async makeProofPayment<T>(
    config: X402RequestConfig,
    amount: number,
    recipientAddress: string
  ): Promise<X402Response<T>> {
    try {
      const verified = await X402Protocol.verifyPaymentProof(
        config.paymentProof!,
        amount,
        recipientAddress
      );

      if (!verified) {
        return {
          success: false,
          error: 'Payment proof verification failed',
          paymentRequired: true,
          requiredAmount: amount
        };
      }

      await X402Protocol.logTransaction(
        config.walletAddress,
        config.url,
        this.getResourceType(config.serviceType),
        config.method,
        amount,
        'completed',
        undefined,
        config.paymentProof
      );

      const headers = {
        ...config.headers,
        'X-402-Payment': X402Protocol.formatX402Header({
          paymentProof: config.paymentProof,
          walletAddress: config.walletAddress,
          amount,
          currency: 'USDC',
          timestamp: Date.now()
        })
      };

      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: config.body ? JSON.stringify(config.body) : undefined
      });

      const data = await response.json();

      return {
        success: response.ok,
        data,
        x402Header: headers['X-402-Payment']
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private static getResourceType(serviceType: 'agent' | 'api' | 'web_service'): 'agent_execution' | 'api_call' | 'data_access' {
    switch (serviceType) {
      case 'agent':
        return 'agent_execution';
      case 'api':
        return 'api_call';
      case 'web_service':
        return 'data_access';
      default:
        return 'api_call';
    }
  }

  static async createAuthorizedSession(
    walletAddress: string,
    serviceId: string,
    serviceType: 'agent' | 'api' | 'web_service',
    authorizedAmount: number,
    durationHours: number = 24
  ): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
    const resourcePattern = `${serviceType}/${serviceId}/*`;
    return X402Protocol.createPaymentSession(
      walletAddress,
      authorizedAmount,
      resourcePattern,
      durationHours,
      false
    );
  }

  static createFetchInterceptor(
    walletAddress: string,
    getSessionToken: () => Promise<string | undefined>
  ) {
    const originalFetch = window.fetch;

    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      const sessionToken = await getSessionToken();

      if (sessionToken && init?.headers) {
        const headers = new Headers(init.headers);

        if (!headers.has('X-402-Payment')) {
          headers.set('X-402-Payment', X402Protocol.formatX402Header({
            sessionToken,
            walletAddress,
            amount: 0,
            currency: 'USDC',
            timestamp: Date.now()
          }));

          init = { ...init, headers };
        }
      }

      return originalFetch(input, init);
    };
  }

  static injectX402Header(
    request: Request | RequestInit,
    x402Header: string
  ): Request | RequestInit {
    if (request instanceof Request) {
      const headers = new Headers(request.headers);
      headers.set('X-402-Payment', x402Header);
      return new Request(request, { headers });
    } else {
      const headers = new Headers(request.headers);
      headers.set('X-402-Payment', x402Header);
      return { ...request, headers };
    }
  }

  static extractX402Header(headers: Headers): X402Header | null {
    const headerValue = headers.get('X-402-Payment');
    if (!headerValue) return null;
    return X402Protocol.parseX402Header(headerValue);
  }
}

export const x402Middleware = X402Middleware;
