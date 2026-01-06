import { PublicKey } from '@solana/web3.js';
import { solanaPaymentService } from './solanaPayment';
import { SolanaWallet } from './walletManager';
import { supabase } from '../lib/supabase';

export interface X402Header {
  sessionToken?: string;
  paymentProof?: string;
  walletAddress: string;
  amount: number;
  currency: string;
  timestamp: number;
  signature?: string;
}

export interface X402Session {
  id: string;
  wallet_address: string;
  session_token: string;
  authorized_amount: number;
  spent_amount: number;
  remaining_amount: number;
  resource_pattern: string;
  status: 'active' | 'expired' | 'revoked' | 'depleted';
  expires_at: string;
  auto_renew: boolean;
  renewal_amount: number;
  last_used_at: string | null;
  created_at: string;
}

export interface X402ServiceConfig {
  id: string;
  service_id: string;
  service_type: 'agent' | 'api' | 'web_service';
  service_name: string;
  owner_wallet: string;
  accepts_x402: boolean;
  pricing_model: 'per_request' | 'per_minute' | 'per_kb' | 'per_token';
  base_price: number;
  min_payment: number;
  max_payment: number | null;
  currency: 'USD' | 'SOL';
  requires_preauth: boolean;
  max_session_amount: number | null;
  allowed_origins: string[];
  webhook_url: string | null;
  is_active: boolean;
}

export interface X402PaymentResult {
  success: boolean;
  transactionId?: string;
  remainingBalance?: number;
  error?: string;
  errorCode?: string;
}

export class X402Protocol {
  private static generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static parseX402Header(headerValue: string): X402Header | null {
    try {
      const parts = headerValue.split(';').map(p => p.trim());
      const parsed: Partial<X402Header> = {};

      parts.forEach(part => {
        const [key, value] = part.split('=').map(s => s.trim());
        switch (key.toLowerCase()) {
          case 'session':
            parsed.sessionToken = value;
            break;
          case 'proof':
            parsed.paymentProof = value;
            break;
          case 'wallet':
            parsed.walletAddress = value;
            break;
          case 'amount':
            parsed.amount = parseFloat(value);
            break;
          case 'currency':
            parsed.currency = value;
            break;
          case 'timestamp':
            parsed.timestamp = parseInt(value);
            break;
          case 'signature':
            parsed.signature = value;
            break;
        }
      });

      if (!parsed.walletAddress) {
        return null;
      }

      return {
        sessionToken: parsed.sessionToken,
        paymentProof: parsed.paymentProof,
        walletAddress: parsed.walletAddress,
        amount: parsed.amount || 0,
        currency: parsed.currency || 'USDC',
        timestamp: parsed.timestamp || Date.now(),
        signature: parsed.signature
      };
    } catch (error) {
      console.error('Error parsing x402 header:', error);
      return null;
    }
  }

  static formatX402Header(params: X402Header): string {
    const parts: string[] = [];

    if (params.sessionToken) parts.push(`session=${params.sessionToken}`);
    if (params.paymentProof) parts.push(`proof=${params.paymentProof}`);
    parts.push(`wallet=${params.walletAddress}`);
    parts.push(`amount=${params.amount}`);
    parts.push(`currency=${params.currency}`);
    parts.push(`timestamp=${params.timestamp}`);
    if (params.signature) parts.push(`signature=${params.signature}`);

    return parts.join('; ');
  }

  static async createPaymentSession(
    wallet: SolanaWallet,
    walletAddress: string,
    authorizedAmountUsd: number,
    resourcePattern: string,
    durationHours: number = 24,
    autoRenew: boolean = false,
    executePayment: boolean = true
  ): Promise<{ success: boolean; sessionToken?: string; transactionSignature?: string; error?: string }> {
    try {
      console.log('[x402] Creating payment session:', {
        walletAddress,
        authorizedAmountUsd,
        resourcePattern,
        executePayment
      });

      let transactionSignature: string | undefined;

      // Execute actual blockchain payment if required
      if (executePayment) {
        console.log('[x402] Executing upfront payment of', authorizedAmountUsd, 'USD');

        const paymentResult = await solanaPaymentService.createPaymentTransaction(
          wallet,
          authorizedAmountUsd
        );

        if (!paymentResult.success) {
          console.error('[x402] Payment failed:', paymentResult.error);
          return {
            success: false,
            error: paymentResult.error || 'Payment transaction failed'
          };
        }

        transactionSignature = paymentResult.signature;
        console.log('[x402] Payment successful, signature:', transactionSignature);
      }

      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('x402_payment_sessions')
        .insert({
          wallet_address: walletAddress,
          session_token: sessionToken,
          authorized_amount: authorizedAmountUsd,
          spent_amount: 0,
          remaining_amount: authorizedAmountUsd,
          resource_pattern: resourcePattern,
          status: 'active',
          expires_at: expiresAt.toISOString(),
          auto_renew: autoRenew,
          renewal_amount: autoRenew ? authorizedAmountUsd : 0,
          initial_payment_signature: transactionSignature
        })
        .select()
        .single();

      if (error) {
        console.error('[x402] Error creating payment session:', error);
        return { success: false, error: error.message };
      }

      console.log('[x402] Session created successfully:', sessionToken);

      return {
        success: true,
        sessionToken,
        transactionSignature
      };
    } catch (error: any) {
      console.error('[x402] Error creating payment session:', error);
      return { success: false, error: error.message };
    }
  }

  static async getSession(sessionToken: string): Promise<X402Session | null> {
    try {
      const { data, error } = await supabase
        .from('x402_payment_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();

      if (error || !data) {
        return null;
      }

      return data as X402Session;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  static async validateSession(sessionToken: string, amount: number): Promise<{ valid: boolean; error?: string }> {
    const session = await this.getSession(sessionToken);

    if (!session) {
      return { valid: false, error: 'Session not found' };
    }

    if (session.status !== 'active') {
      return { valid: false, error: `Session is ${session.status}` };
    }

    if (new Date(session.expires_at) < new Date()) {
      await this.updateSessionStatus(sessionToken, 'expired');
      return { valid: false, error: 'Session expired' };
    }

    if (session.remaining_amount < amount) {
      return { valid: false, error: 'Insufficient session balance' };
    }

    return { valid: true };
  }

  static async deductFromSession(
    sessionToken: string,
    amount: number,
    resourceUrl: string,
    resourceType: 'agent_execution' | 'api_call' | 'data_access',
    httpMethod: string
  ): Promise<X402PaymentResult> {
    try {
      const session = await this.getSession(sessionToken);
      if (!session) {
        return { success: false, error: 'Session not found', errorCode: 'SESSION_NOT_FOUND' };
      }

      const validation = await this.validateSession(sessionToken, amount);
      if (!validation.valid) {
        return { success: false, error: validation.error, errorCode: 'VALIDATION_FAILED' };
      }

      const newSpent = session.spent_amount + amount;
      const newRemaining = session.remaining_amount - amount;

      const { error: updateError } = await supabase
        .from('x402_payment_sessions')
        .update({
          spent_amount: newSpent,
          remaining_amount: newRemaining,
          last_used_at: new Date().toISOString(),
          status: newRemaining <= 0 ? 'depleted' : 'active'
        })
        .eq('session_token', sessionToken);

      if (updateError) {
        return { success: false, error: updateError.message, errorCode: 'UPDATE_FAILED' };
      }

      const { data: txData, error: txError } = await supabase
        .from('x402_transactions')
        .insert({
          session_id: session.id,
          wallet_address: session.wallet_address,
          resource_url: resourceUrl,
          resource_type: resourceType,
          http_method: httpMethod,
          amount_charged: amount,
          x402_header: `session=${sessionToken}`,
          status: 'completed',
          response_code: 200
        })
        .select()
        .single();

      if (txError) {
        console.error('Error logging transaction:', txError);
      }

      return {
        success: true,
        transactionId: txData?.id,
        remainingBalance: newRemaining
      };
    } catch (error: any) {
      console.error('Error deducting from session:', error);
      return { success: false, error: error.message, errorCode: 'UNKNOWN_ERROR' };
    }
  }

  static async updateSessionStatus(
    sessionToken: string,
    status: 'active' | 'expired' | 'revoked' | 'depleted'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('x402_payment_sessions')
        .update({ status })
        .eq('session_token', sessionToken);

      return !error;
    } catch (error) {
      console.error('Error updating session status:', error);
      return false;
    }
  }

  static async revokeSession(sessionToken: string): Promise<boolean> {
    return this.updateSessionStatus(sessionToken, 'revoked');
  }

  static async getUserSessions(walletAddress: string): Promise<X402Session[]> {
    try {
      const { data, error } = await supabase
        .from('x402_payment_sessions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user sessions:', error);
        return [];
      }

      return data as X402Session[];
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }

  static async getServiceConfig(
    serviceId: string,
    serviceType: 'agent' | 'api' | 'web_service'
  ): Promise<X402ServiceConfig | null> {
    try {
      const { data, error } = await supabase
        .from('x402_service_configs')
        .select('*')
        .eq('service_id', serviceId)
        .eq('service_type', serviceType)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return data as X402ServiceConfig;
    } catch (error) {
      console.error('Error fetching service config:', error);
      return null;
    }
  }

  static async createServiceConfig(config: Omit<X402ServiceConfig, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; configId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('x402_service_configs')
        .insert(config)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, configId: data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async verifyPaymentProof(
    proof: string,
    expectedAmount: number,
    recipientAddress: string
  ): Promise<boolean> {
    try {
      const verified = await solanaPaymentService.verifyTransaction(proof);
      return verified;
    } catch (error) {
      console.error('Error verifying payment proof:', error);
      return false;
    }
  }

  static async logTransaction(
    walletAddress: string,
    resourceUrl: string,
    resourceType: 'agent_execution' | 'api_call' | 'data_access',
    httpMethod: string,
    amount: number,
    status: 'pending' | 'completed' | 'failed' | 'refunded',
    x402Header?: string,
    paymentProof?: string,
    errorMessage?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('x402_transactions')
        .insert({
          wallet_address: walletAddress,
          resource_url: resourceUrl,
          resource_type: resourceType,
          http_method: httpMethod,
          amount_charged: amount,
          x402_header: x402Header,
          payment_proof: paymentProof,
          status,
          error_message: errorMessage
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging transaction:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error logging transaction:', error);
      return null;
    }
  }

  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('x402_payment_sessions')
        .update({ status: 'expired' })
        .lt('expires_at', new Date().toISOString())
        .eq('status', 'active')
        .select();

      if (error) {
        console.error('Error cleaning up expired sessions:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }
}

export const x402Protocol = new X402Protocol();
