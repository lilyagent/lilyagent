import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionSignature,
  SendOptions
} from '@solana/web3.js';
import { SolanaWallet } from '../services/walletManager';

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  explorerUrl?: string;
}

export interface TransactionOptions {
  skipPreflight?: boolean;
  maxRetries?: number;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export class TransactionHandler {
  private connection: Connection;
  private network: 'mainnet-beta' | 'devnet' | 'testnet';

  constructor(connection: Connection, network: 'mainnet-beta' | 'devnet' | 'testnet' = 'mainnet-beta') {
    this.connection = connection;
    this.network = network;
  }

  async sendSolTransfer(
    wallet: SolanaWallet,
    recipientAddress: string,
    amountSOL: number,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    const commitment = options?.commitment || 'confirmed';

    try {
      if (!wallet.isConnected || !wallet.publicKey) {
        return {
          success: false,
          error: 'Wallet not connected. Please connect your wallet and try again.'
        };
      }

      const recipientPubkey = new PublicKey(recipientAddress);

      const balance = await this.connection.getBalance(wallet.publicKey);
      const requiredLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
      const estimatedFee = 5000;

      if (balance < requiredLamports + estimatedFee) {
        return {
          success: false,
          error: `Insufficient funds. You have ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL but need ${((requiredLamports + estimatedFee) / LAMPORTS_PER_SOL).toFixed(6)} SOL (including fees).`
        };
      }

      let blockhash: string;
      let lastValidBlockHeight: number;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const response = await this.connection.getLatestBlockhash(commitment);
          blockhash = response.blockhash;
          lastValidBlockHeight = response.lastValidBlockHeight;
          break;
        } catch (error: any) {
          attempts++;
          if (attempts === maxAttempts) {
            return {
              success: false,
              error: 'Failed to get latest blockhash. Network may be congested. Please try again.'
            };
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const transaction = new Transaction({
        feePayer: wallet.publicKey,
        blockhash: blockhash!,
        lastValidBlockHeight: lastValidBlockHeight!
      }).add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: recipientPubkey,
          lamports: requiredLamports
        })
      );

      const signedTransaction = await wallet.signTransaction(transaction);

      const sendOptions: SendOptions = {
        skipPreflight: options?.skipPreflight ?? false,
        preflightCommitment: commitment,
        maxRetries: options?.maxRetries ?? 3
      };

      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        sendOptions
      );

      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash: blockhash!,
          lastValidBlockHeight: lastValidBlockHeight!
        },
        commitment
      );

      if (confirmation.value.err) {
        return {
          success: false,
          error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        };
      }

      return {
        success: true,
        signature,
        explorerUrl: this.getExplorerUrl(signature)
      };

    } catch (error: any) {
      console.error('Transaction error:', error);

      if (error.message?.includes('User rejected')) {
        return {
          success: false,
          error: 'Transaction was cancelled. You rejected the transaction request.'
        };
      }

      if (error.message?.includes('insufficient funds')) {
        return {
          success: false,
          error: 'Insufficient funds for transaction and fees.'
        };
      }

      if (error.message?.includes('Blockhash not found')) {
        return {
          success: false,
          error: 'Transaction expired. Please try again. The network may be congested.'
        };
      }

      if (error.message?.includes('block height exceeded')) {
        return {
          success: false,
          error: 'Transaction took too long and expired. Please try again.'
        };
      }

      return {
        success: false,
        error: error.message || 'Transaction failed. Please try again.'
      };
    }
  }

  async sendTransaction(
    wallet: SolanaWallet,
    transaction: Transaction,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    const commitment = options?.commitment || 'confirmed';

    try {
      if (!wallet.isConnected || !wallet.publicKey) {
        return {
          success: false,
          error: 'Wallet not connected'
        };
      }

      let blockhash: string;
      let lastValidBlockHeight: number;

      const response = await this.connection.getLatestBlockhash(commitment);
      blockhash = response.blockhash;
      lastValidBlockHeight = response.lastValidBlockHeight;

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      const signedTransaction = await wallet.signTransaction(transaction);

      const sendOptions: SendOptions = {
        skipPreflight: options?.skipPreflight ?? false,
        preflightCommitment: commitment,
        maxRetries: options?.maxRetries ?? 3
      };

      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        sendOptions
      );

      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight
        },
        commitment
      );

      if (confirmation.value.err) {
        return {
          success: false,
          error: 'Transaction failed to confirm'
        };
      }

      return {
        success: true,
        signature,
        explorerUrl: this.getExplorerUrl(signature)
      };

    } catch (error: any) {
      console.error('Transaction error:', error);

      return {
        success: false,
        error: this.parseTransactionError(error)
      };
    }
  }

  private parseTransactionError(error: any): string {
    const message = error.message || '';

    if (message.includes('User rejected')) {
      return 'Transaction cancelled by user';
    }
    if (message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    if (message.includes('Blockhash not found')) {
      return 'Transaction expired - please try again';
    }
    if (message.includes('block height exceeded')) {
      return 'Transaction timeout - please try again';
    }
    if (message.includes('custom program error')) {
      const match = message.match(/custom program error: 0x(\w+)/);
      if (match) {
        return `Program error: ${match[1]}`;
      }
    }

    return message || 'Transaction failed';
  }

  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      return !!(transaction && !transaction.meta?.err);
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }

  async getTransactionStatus(signature: string): Promise<{
    confirmed: boolean;
    error?: string;
    slot?: number;
  }> {
    try {
      const status = await this.connection.getSignatureStatus(signature);

      if (!status.value) {
        return { confirmed: false, error: 'Transaction not found' };
      }

      return {
        confirmed: status.value.confirmationStatus === 'confirmed' ||
                   status.value.confirmationStatus === 'finalized',
        slot: status.value.slot,
        error: status.value.err ? JSON.stringify(status.value.err) : undefined
      };
    } catch (error: any) {
      return {
        confirmed: false,
        error: error.message
      };
    }
  }

  getExplorerUrl(signature: string): string {
    const cluster = this.network === 'mainnet-beta' ? '' : `?cluster=${this.network}`;
    return `https://explorer.solana.com/tx/${signature}${cluster}`;
  }

  async estimateTransactionFee(transaction: Transaction, payer: PublicKey): Promise<number> {
    try {
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payer;

      const message = transaction.compileMessage();
      const fee = await this.connection.getFeeForMessage(message, 'confirmed');

      return (fee.value || 5000) / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Fee estimation failed:', error);
      return 0.000005;
    }
  }

  setConnection(connection: Connection): void {
    this.connection = connection;
  }

  getConnection(): Connection {
    return this.connection;
  }
}

export async function safeTransfer(
  wallet: SolanaWallet,
  connection: Connection,
  recipientAddress: string,
  amountSOL: number,
  options?: TransactionOptions
): Promise<TransactionResult> {
  const handler = new TransactionHandler(connection);
  return handler.sendSolTransfer(wallet, recipientAddress, amountSOL, options);
}

export async function waitForTransaction(
  connection: Connection,
  signature: TransactionSignature,
  commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed',
  timeoutMs: number = 60000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const status = await connection.getSignatureStatus(signature);

      if (status.value?.confirmationStatus === commitment ||
          status.value?.confirmationStatus === 'finalized') {
        return !status.value.err;
      }

      if (status.value?.err) {
        return false;
      }
    } catch (error) {
      console.warn('Error checking transaction status:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return false;
}
