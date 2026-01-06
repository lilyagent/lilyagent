import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TransactionHandler, TransactionResult } from '../utils/transactionUtils';
import { getSolPriceOracle, ConversionResult } from './solPriceOracle';
import { getTransactionMonitor } from './transactionMonitor';

const RECIPIENT_WALLET = 'FbRDjtZRRtLmjok6NvzsxSey4gDAoTmr8RacPiaRZEWX';
const AGENT_CREATION_FEE_USD = 0.25; // Changed to USD pricing
const COMMITMENT_LEVEL = 'confirmed';
const getHeliusEndpoint = () => {
  const apiKey = import.meta.env.VITE_HELIUS_API_KEY;
  return apiKey ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}` : null;
};

const RPC_ENDPOINTS = [
  getHeliusEndpoint(),
  'https://api.mainnet-beta.solana.com',
].filter(Boolean) as string[];

export interface SolanaWallet {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions?: (transactions: Transaction[]) => Promise<Transaction[]>;
  connection?: Connection;
}

export interface PaymentResult {
  success: boolean;
  signature?: string;
  error?: string;
  solAmount?: number;
  usdAmount?: number;
  conversionRate?: number;
}

export class SolanaPaymentService {
  private connection: Connection;
  private recipientPublicKey: PublicKey;
  private currentRpcIndex: number = 0;
  private transactionHandler: TransactionHandler;
  private priceOracle: ReturnType<typeof getSolPriceOracle>;

  constructor(rpcEndpoint?: string) {
    const endpoint = rpcEndpoint || RPC_ENDPOINTS[0];
    this.connection = new Connection(endpoint, { commitment: COMMITMENT_LEVEL, confirmTransactionInitialTimeout: 60000 });
    this.recipientPublicKey = new PublicKey(RECIPIENT_WALLET);
    this.transactionHandler = new TransactionHandler(this.connection, 'mainnet-beta');
    this.priceOracle = getSolPriceOracle(this.connection);
  }

  private async tryWithFallback<T>(operation: (connection: Connection) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
      const rpcIndex = (this.currentRpcIndex + i) % RPC_ENDPOINTS.length;
      const endpoint = RPC_ENDPOINTS[rpcIndex];

      try {
        const connection = new Connection(endpoint, { commitment: COMMITMENT_LEVEL, confirmTransactionInitialTimeout: 60000 });
        const result = await operation(connection);
        this.currentRpcIndex = rpcIndex;
        this.connection = connection;
        this.transactionHandler.setConnection(connection);
        return result;
      } catch (error: any) {
        console.warn(`RPC endpoint ${endpoint} failed:`, error.message);
        lastError = error;
      }
    }

    throw lastError || new Error('All RPC endpoints failed');
  }

  async checkWalletBalance(walletPublicKey: PublicKey): Promise<number> {
    try {
      return await this.tryWithFallback(async (connection) => {
        const balance = await connection.getBalance(walletPublicKey);
        return balance / LAMPORTS_PER_SOL;
      });
    } catch (error: any) {
      console.error('Error checking wallet balance:', error);
      throw new Error(`Failed to check wallet balance: ${error.message}`);
    }
  }

  async createPaymentTransaction(
    wallet: SolanaWallet,
    usdAmount: number = AGENT_CREATION_FEE_USD,
    transactionType: 'agent_payment' | 'x402_session' | 'credit_purchase' | 'other' = 'agent_payment'
  ): Promise<PaymentResult> {
    const monitor = getTransactionMonitor(this.connection);

    try {
      console.log('[Payment] Creating payment for USD amount:', usdAmount);

      // Convert USD to SOL
      const conversion = await this.priceOracle.usdToSol(usdAmount);
      console.log('[Payment] Conversion:', conversion);

      const result = await this.transactionHandler.sendSolTransfer(
        wallet,
        this.recipientPublicKey.toBase58(),
        conversion.solAmount,
        { commitment: COMMITMENT_LEVEL }
      );

      // Log transaction for monitoring
      if (result.success && result.signature) {
        await monitor.logTransaction({
          signature: result.signature,
          wallet_address: wallet.publicKey.toBase58(),
          transaction_type: transactionType,
          status: 'pending',
          amount_sol: conversion.solAmount,
          amount_usd: usdAmount,
          conversion_rate: conversion.rate,
          recipient_address: this.recipientPublicKey.toBase58()
        });
      } else if (!result.success) {
        console.error('[Payment] Transaction failed:', result.error);
      }

      return {
        success: result.success,
        signature: result.signature,
        error: result.error,
        solAmount: conversion.solAmount,
        usdAmount: usdAmount,
        conversionRate: conversion.rate
      };
    } catch (error: any) {
      console.error('[Payment] Payment transaction error:', error);
      return {
        success: false,
        error: error.message || 'Payment failed. Please try again',
      };
    }
  }

  async getSolPrice(): Promise<number> {
    return await this.priceOracle.getSolPrice();
  }

  async convertUsdToSol(usdAmount: number): Promise<ConversionResult> {
    return await this.priceOracle.usdToSol(usdAmount);
  }

  async convertSolToUsd(solAmount: number): Promise<ConversionResult> {
    return await this.priceOracle.solToUsd(solAmount);
  }

  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        commitment: COMMITMENT_LEVEL,
      });

      if (!transaction || transaction.meta?.err) {
        return false;
      }

      const recipientAddress = this.recipientPublicKey.toBase58();
      const accountKeys = transaction.transaction.message.accountKeys.map(key => key.toBase58());

      return accountKeys.includes(recipientAddress);
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }

  getExplorerUrl(signature: string, network: 'devnet' | 'mainnet-beta' = 'mainnet-beta'): string {
    return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
  }

  getAgentCreationFeeUsd(): number {
    return AGENT_CREATION_FEE_USD;
  }

  getConnection(): Connection {
    return this.connection;
  }
}

export const solanaPaymentService = new SolanaPaymentService();
