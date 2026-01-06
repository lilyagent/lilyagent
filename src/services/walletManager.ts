import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface SolanaWallet {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>;
  connect: (options?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  off?: (event: string, callback: (...args: any[]) => void) => void;
}

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  balance: number | null;
  connecting: boolean;
  error: string | null;
}

export interface DiagnosticResult {
  walletExists: boolean;
  canConnect: boolean;
  hasPublicKey: boolean;
  rpcWorks: boolean;
  canGetBalance: boolean;
  canSign: boolean;
  networkMatch: boolean;
  details: {
    walletType?: string;
    publicKey?: string;
    balance?: number;
    rpcEndpoint?: string;
    network?: string;
    errors: string[];
  };
}

const getHeliusEndpoint = () => {
  const apiKey = import.meta.env.VITE_HELIUS_API_KEY;
  return apiKey ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}` : null;
};

const RPC_ENDPOINTS = [
  getHeliusEndpoint(),
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana'
].filter(Boolean) as string[];

export class WalletManager {
  private wallet: SolanaWallet | null = null;
  private connection: Connection | null = null;
  private currentRpcIndex: number = 0;
  private listeners: Map<string, Set<Function>> = new Map();
  private eventHandlers: Map<string, Function> = new Map();

  async initialize(rpcEndpoint?: string): Promise<void> {
    const endpoint = rpcEndpoint || RPC_ENDPOINTS[0];
    this.connection = new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: false
    });

    await this.waitForWallet();
    await this.setupEventListeners();

    try {
      await this.connect(true);
    } catch (error) {
      console.log('Auto-connect not available');
    }
  }

  private async waitForWallet(): Promise<void> {
    return new Promise((resolve) => {
      if (window.solana) {
        resolve();
      } else {
        const checkWallet = () => {
          if (window.solana) {
            window.removeEventListener('load', checkWallet);
            resolve();
          }
        };
        window.addEventListener('load', checkWallet);
        setTimeout(() => resolve(), 3000);
      }
    });
  }

  private async setupEventListeners(): Promise<void> {
    if (!window.solana || !window.solana.on) return;

    const handleConnect = () => {
      this.wallet = window.solana as SolanaWallet;
      const publicKey = this.wallet?.publicKey?.toString();
      if (publicKey) {
        this.emit('connect', publicKey);
      }
    };

    const handleDisconnect = () => {
      this.wallet = null;
      this.emit('disconnect');
    };

    const handleAccountChange = (publicKey: PublicKey | null) => {
      if (publicKey) {
        this.emit('accountChanged', publicKey.toString());
      } else {
        this.wallet = null;
        this.emit('disconnect');
      }
    };

    this.eventHandlers.set('connect', handleConnect);
    this.eventHandlers.set('disconnect', handleDisconnect);
    this.eventHandlers.set('accountChanged', handleAccountChange);

    window.solana.on('connect', handleConnect);
    window.solana.on('disconnect', handleDisconnect);
    window.solana.on('accountChanged', handleAccountChange);
  }

  private emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  async connect(onlyIfTrusted: boolean = false): Promise<boolean> {
    try {
      if (!window.solana) {
        throw new Error('No Solana wallet found. Please install Phantom, Solflare, or another Solana wallet.');
      }

      const response = await window.solana.connect({ onlyIfTrusted });
      this.wallet = window.solana as SolanaWallet;

      const publicKey = response.publicKey.toString();
      console.log('✅ Wallet connected:', publicKey);

      this.emit('connect', publicKey);
      return true;
    } catch (error: any) {
      if (error.message?.includes('User rejected')) {
        console.log('User rejected connection request');
      } else {
        console.error('Connection failed:', error);
        this.emit('error', error.message);
      }
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.wallet && this.wallet.disconnect) {
      await this.wallet.disconnect();
    }
    this.wallet = null;
    this.emit('disconnect');
  }

  private async tryWithFallback<T>(
    operation: (connection: Connection) => Promise<T>,
    retries: number = RPC_ENDPOINTS.length
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      const rpcIndex = (this.currentRpcIndex + i) % RPC_ENDPOINTS.length;
      const endpoint = RPC_ENDPOINTS[rpcIndex];

      try {
        const connection = new Connection(endpoint, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 60000
        });

        const result = await operation(connection);

        this.currentRpcIndex = rpcIndex;
        this.connection = connection;

        return result;
      } catch (error: any) {
        console.warn(`RPC endpoint ${endpoint} failed:`, error.message);
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    throw lastError || new Error('All RPC endpoints failed');
  }

  async getBalance(forceRefresh: boolean = false): Promise<number> {
    if (!this.wallet || !this.connection) {
      throw new Error('Wallet or connection not initialized');
    }

    try {
      return await this.tryWithFallback(async (connection) => {
        const commitments: ('finalized' | 'confirmed' | 'processed')[] =
          ['finalized', 'confirmed', 'processed'];

        for (const commitment of commitments) {
          try {
            const balance = await connection.getBalance(
              this.wallet!.publicKey,
              commitment
            );
            if (balance > 0 || commitment === 'processed') {
              return balance / LAMPORTS_PER_SOL;
            }
          } catch (error) {
            console.warn(`Failed to get balance with ${commitment} commitment`);
          }
        }

        return 0;
      });
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async getBalanceInLamports(): Promise<number> {
    if (!this.wallet || !this.connection) {
      throw new Error('Wallet or connection not initialized');
    }

    return await this.tryWithFallback(async (connection) => {
      return await connection.getBalance(this.wallet!.publicKey, 'confirmed');
    });
  }

  getPublicKey(): string | null {
    return this.wallet?.publicKey.toString() || null;
  }

  getPublicKeyObject(): PublicKey | null {
    return this.wallet?.publicKey || null;
  }

  isConnected(): boolean {
    return this.wallet?.isConnected || false;
  }

  getConnection(): Connection | null {
    return this.connection;
  }

  getWallet(): SolanaWallet | null {
    return this.wallet;
  }

  getCurrentRpcEndpoint(): string {
    return RPC_ENDPOINTS[this.currentRpcIndex];
  }

  async switchRpcEndpoint(index?: number): Promise<void> {
    if (index !== undefined && index >= 0 && index < RPC_ENDPOINTS.length) {
      this.currentRpcIndex = index;
    } else {
      this.currentRpcIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    }

    const endpoint = RPC_ENDPOINTS[this.currentRpcIndex];
    this.connection = new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    });

    console.log('Switched to RPC endpoint:', endpoint);
  }

  async runDiagnostics(): Promise<DiagnosticResult> {
    const result: DiagnosticResult = {
      walletExists: false,
      canConnect: false,
      hasPublicKey: false,
      rpcWorks: false,
      canGetBalance: false,
      canSign: false,
      networkMatch: false,
      details: {
        errors: []
      }
    };

    try {
      result.walletExists = !!window.solana;
      if (window.solana?.isPhantom) {
        result.details.walletType = 'Phantom';
      } else if ((window as any).solflare) {
        result.details.walletType = 'Solflare';
      } else if (window.solana) {
        result.details.walletType = 'Unknown Solana Wallet';
      }

      if (!result.walletExists) {
        result.details.errors.push('No Solana wallet detected');
        return result;
      }

      if (!this.isConnected()) {
        try {
          await this.connect(false);
          result.canConnect = this.isConnected();
        } catch (error: any) {
          result.details.errors.push(`Connection failed: ${error.message}`);
        }
      } else {
        result.canConnect = true;
      }

      result.hasPublicKey = !!this.wallet?.publicKey;
      if (result.hasPublicKey) {
        result.details.publicKey = this.wallet!.publicKey.toString();
      } else {
        result.details.errors.push('No public key available');
      }

      try {
        if (this.connection) {
          const version = await this.connection.getVersion();
          result.rpcWorks = true;
          result.details.rpcEndpoint = this.getCurrentRpcEndpoint();
        }
      } catch (error: any) {
        result.details.errors.push(`RPC connection failed: ${error.message}`);
      }

      if (result.hasPublicKey && result.rpcWorks) {
        try {
          const balance = await this.getBalance();
          result.canGetBalance = true;
          result.details.balance = balance;
        } catch (error: any) {
          result.details.errors.push(`Balance retrieval failed: ${error.message}`);
        }
      }

      result.canSign = !!this.wallet?.signTransaction;

      try {
        const genesisHash = await this.connection!.getGenesisHash();
        result.details.network = genesisHash;
        result.networkMatch = true;
      } catch (error) {
        result.details.errors.push('Could not verify network');
      }

    } catch (error: any) {
      result.details.errors.push(`Diagnostic error: ${error.message}`);
    }

    return result;
  }

  async testRpcEndpoints(): Promise<Map<string, { success: boolean; latency?: number; error?: string }>> {
    const results = new Map();

    for (const endpoint of RPC_ENDPOINTS) {
      const startTime = Date.now();
      try {
        const connection = new Connection(endpoint, { commitment: 'confirmed' });
        await connection.getVersion();
        const latency = Date.now() - startTime;
        results.set(endpoint, { success: true, latency });
      } catch (error: any) {
        results.set(endpoint, { success: false, error: error.message });
      }
    }

    return results;
  }

  cleanup(): void {
    if (window.solana?.off) {
      this.eventHandlers.forEach((handler, event) => {
        window.solana!.off!(event, handler as any);
      });
    }
    this.eventHandlers.clear();
    this.listeners.clear();
  }
}

export const walletManager = new WalletManager();
