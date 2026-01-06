import { Connection, TransactionSignature } from '@solana/web3.js';
import { supabase } from '../lib/supabase';

export interface TransactionLog {
  id?: string;
  signature: string;
  wallet_address: string;
  transaction_type: 'agent_payment' | 'x402_session' | 'x402_usage' | 'credit_purchase' | 'other';
  status: 'pending' | 'confirmed' | 'failed';
  amount_sol: number;
  amount_usd: number;
  conversion_rate: number;
  recipient_address: string;
  metadata?: Record<string, any>;
  error_message?: string;
  confirmed_at?: string;
  created_at?: string;
}

export interface TransactionStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalSolVolume: number;
  totalUsdVolume: number;
  averageConfirmationTime: number;
}

class TransactionMonitor {
  private connection: Connection;
  private pollingInterval: number = 5000; // 5 seconds
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();

  constructor(connection: Connection) {
    this.connection = connection;
  }

  setConnection(connection: Connection): void {
    this.connection = connection;
  }

  async logTransaction(transaction: Omit<TransactionLog, 'id' | 'created_at'>): Promise<string | null> {
    try {
      console.log('[TransactionMonitor] Logging transaction:', transaction.signature);

      const { data, error } = await supabase
        .from('transaction_logs')
        .insert({
          ...transaction,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[TransactionMonitor] Error logging transaction:', error);
        return null;
      }

      console.log('[TransactionMonitor] Transaction logged successfully:', data.id);

      // Start monitoring this transaction
      this.startMonitoring(transaction.signature);

      return data.id;
    } catch (error) {
      console.error('[TransactionMonitor] Error logging transaction:', error);
      return null;
    }
  }

  async updateTransactionStatus(
    signature: string,
    status: 'confirmed' | 'failed',
    errorMessage?: string
  ): Promise<boolean> {
    try {
      const updates: any = {
        status,
        confirmed_at: status === 'confirmed' ? new Date().toISOString() : undefined,
        error_message: errorMessage
      };

      const { error } = await supabase
        .from('transaction_logs')
        .update(updates)
        .eq('signature', signature);

      if (error) {
        console.error('[TransactionMonitor] Error updating transaction:', error);
        return false;
      }

      console.log('[TransactionMonitor] Transaction status updated:', signature, status);

      // Stop monitoring if confirmed or failed
      this.stopMonitoring(signature);

      return true;
    } catch (error) {
      console.error('[TransactionMonitor] Error updating transaction:', error);
      return false;
    }
  }

  async checkTransactionStatus(signature: string): Promise<{
    status: 'confirmed' | 'failed' | 'pending' | 'not_found';
    error?: string;
  }> {
    try {
      const result = await this.connection.getSignatureStatus(signature, {
        searchTransactionHistory: true
      });

      if (!result || !result.value) {
        return { status: 'pending' };
      }

      if (result.value.err) {
        return {
          status: 'failed',
          error: JSON.stringify(result.value.err)
        };
      }

      if (result.value.confirmationStatus === 'confirmed' || result.value.confirmationStatus === 'finalized') {
        return { status: 'confirmed' };
      }

      return { status: 'pending' };
    } catch (error: any) {
      console.error('[TransactionMonitor] Error checking transaction:', error);
      return {
        status: 'not_found',
        error: error.message
      };
    }
  }

  startMonitoring(signature: string): void {
    // Don't start if already monitoring
    if (this.activeMonitors.has(signature)) {
      return;
    }

    console.log('[TransactionMonitor] Starting to monitor:', signature);

    const checkStatus = async () => {
      const status = await this.checkTransactionStatus(signature);

      if (status.status === 'confirmed') {
        await this.updateTransactionStatus(signature, 'confirmed');
      } else if (status.status === 'failed') {
        await this.updateTransactionStatus(signature, 'failed', status.error);
      } else if (status.status === 'pending') {
        // Keep monitoring
        console.log('[TransactionMonitor] Transaction still pending:', signature);
      } else {
        // not_found - might need more time
        console.log('[TransactionMonitor] Transaction not found yet:', signature);
      }
    };

    // Initial check
    checkStatus();

    // Set up polling
    const interval = setInterval(checkStatus, this.pollingInterval);
    this.activeMonitors.set(signature, interval);

    // Auto-stop after 5 minutes
    setTimeout(() => {
      this.stopMonitoring(signature);
    }, 5 * 60 * 1000);
  }

  stopMonitoring(signature: string): void {
    const interval = this.activeMonitors.get(signature);
    if (interval) {
      clearInterval(interval);
      this.activeMonitors.delete(signature);
      console.log('[TransactionMonitor] Stopped monitoring:', signature);
    }
  }

  stopAllMonitoring(): void {
    this.activeMonitors.forEach((interval, signature) => {
      clearInterval(interval);
      console.log('[TransactionMonitor] Stopped monitoring:', signature);
    });
    this.activeMonitors.clear();
  }

  async getTransactionHistory(
    walletAddress: string,
    limit: number = 50
  ): Promise<TransactionLog[]> {
    try {
      const { data, error } = await supabase
        .from('transaction_logs')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[TransactionMonitor] Error fetching history:', error);
        return [];
      }

      return data as TransactionLog[];
    } catch (error) {
      console.error('[TransactionMonitor] Error fetching history:', error);
      return [];
    }
  }

  async getTransactionStats(walletAddress?: string): Promise<TransactionStats> {
    try {
      let query = supabase
        .from('transaction_logs')
        .select('*');

      if (walletAddress) {
        query = query.eq('wallet_address', walletAddress);
      }

      const { data, error } = await query;

      if (error || !data) {
        return this.getEmptyStats();
      }

      const stats: TransactionStats = {
        totalTransactions: data.length,
        successfulTransactions: data.filter(t => t.status === 'confirmed').length,
        failedTransactions: data.filter(t => t.status === 'failed').length,
        pendingTransactions: data.filter(t => t.status === 'pending').length,
        totalSolVolume: data.reduce((sum, t) => sum + (t.amount_sol || 0), 0),
        totalUsdVolume: data.reduce((sum, t) => sum + (t.amount_usd || 0), 0),
        averageConfirmationTime: this.calculateAverageConfirmationTime(data)
      };

      return stats;
    } catch (error) {
      console.error('[TransactionMonitor] Error fetching stats:', error);
      return this.getEmptyStats();
    }
  }

  private calculateAverageConfirmationTime(transactions: any[]): number {
    const confirmedTxs = transactions.filter(t => t.status === 'confirmed' && t.confirmed_at);

    if (confirmedTxs.length === 0) {
      return 0;
    }

    const times = confirmedTxs.map(t => {
      const created = new Date(t.created_at).getTime();
      const confirmed = new Date(t.confirmed_at).getTime();
      return confirmed - created;
    });

    const sum = times.reduce((a, b) => a + b, 0);
    return sum / times.length / 1000; // Return in seconds
  }

  private getEmptyStats(): TransactionStats {
    return {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      totalSolVolume: 0,
      totalUsdVolume: 0,
      averageConfirmationTime: 0
    };
  }

  async getPendingTransactions(): Promise<TransactionLog[]> {
    try {
      const { data, error } = await supabase
        .from('transaction_logs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[TransactionMonitor] Error fetching pending transactions:', error);
        return [];
      }

      return data as TransactionLog[];
    } catch (error) {
      console.error('[TransactionMonitor] Error fetching pending transactions:', error);
      return [];
    }
  }

  async retryPendingTransactions(): Promise<number> {
    const pending = await this.getPendingTransactions();
    let retriedCount = 0;

    for (const transaction of pending) {
      // Only retry transactions older than 1 minute
      const createdAt = new Date(transaction.created_at!).getTime();
      const now = Date.now();
      const ageMinutes = (now - createdAt) / 1000 / 60;

      if (ageMinutes > 1) {
        this.startMonitoring(transaction.signature);
        retriedCount++;
      }
    }

    console.log('[TransactionMonitor] Retried', retriedCount, 'pending transactions');
    return retriedCount;
  }
}

export const createTransactionMonitor = (connection: Connection): TransactionMonitor => {
  return new TransactionMonitor(connection);
};

let globalMonitor: TransactionMonitor | null = null;

export const getTransactionMonitor = (connection: Connection): TransactionMonitor => {
  if (!globalMonitor) {
    globalMonitor = new TransactionMonitor(connection);
  } else {
    globalMonitor.setConnection(connection);
  }
  return globalMonitor;
};

export default TransactionMonitor;
