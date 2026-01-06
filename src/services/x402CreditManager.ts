import { supabase } from '../lib/supabase';
import { solanaPaymentService, SolanaWallet } from './solanaPayment';

export interface X402Credit {
  id: string;
  wallet_address: string;
  service_id: string | null;
  service_type: 'agent' | 'api' | 'web_service';
  credit_balance: number;
  total_purchased: number;
  total_spent: number;
  last_topup_tx: string | null;
  last_topup_amount: number | null;
  last_topup_at: string | null;
  auto_topup_enabled: boolean;
  auto_topup_threshold: number;
  auto_topup_amount: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTopUpResult {
  success: boolean;
  newBalance?: number;
  transactionSignature?: string;
  error?: string;
}

export interface CreditSpendResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

export class X402CreditManager {
  static async getCreditBalance(
    walletAddress: string,
    serviceId: string | null,
    serviceType: 'agent' | 'api' | 'web_service'
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('x402_payment_credits')
        .select('credit_balance')
        .eq('wallet_address', walletAddress)
        .eq('service_id', serviceId || '')
        .eq('service_type', serviceType)
        .maybeSingle();

      if (error || !data) {
        return 0;
      }

      return Number(data.credit_balance);
    } catch (error) {
      console.error('Error getting credit balance:', error);
      return 0;
    }
  }

  static async getAllCredits(walletAddress: string): Promise<X402Credit[]> {
    try {
      const { data, error } = await supabase
        .from('x402_payment_credits')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching credits:', error);
        return [];
      }

      return data as X402Credit[];
    } catch (error) {
      console.error('Error fetching credits:', error);
      return [];
    }
  }

  static async topUpCredits(
    wallet: SolanaWallet,
    serviceId: string | null,
    serviceType: 'agent' | 'api' | 'web_service',
    amountUSDC: number
  ): Promise<CreditTopUpResult> {
    try {
      console.log('[Credits] Creating payment transaction for', amountUSDC, 'USD');

      const paymentResult = await solanaPaymentService.createPaymentTransaction(
        wallet,
        amountUSDC
      );

      if (!paymentResult.success || !paymentResult.signature) {
        return {
          success: false,
          error: paymentResult.error || 'Payment failed'
        };
      }

      console.log('[Credits] Payment successful, tx:', paymentResult.signature);

      const walletAddress = wallet.publicKey.toBase58();

      const { data: existing } = await supabase
        .from('x402_payment_credits')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('service_id', serviceId || '')
        .eq('service_type', serviceType)
        .maybeSingle();

      let newBalance: number;

      if (existing) {
        newBalance = Number(existing.credit_balance) + amountUSDC;

        const { error: updateError } = await supabase
          .from('x402_payment_credits')
          .update({
            credit_balance: newBalance,
            total_purchased: Number(existing.total_purchased) + amountUSDC,
            last_topup_tx: paymentResult.signature,
            last_topup_amount: amountUSDC,
            last_topup_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating credits:', updateError);
          return { success: false, error: updateError.message };
        }
      } else {
        newBalance = amountUSDC;

        const { error: insertError } = await supabase
          .from('x402_payment_credits')
          .insert({
            wallet_address: walletAddress,
            service_id: serviceId,
            service_type: serviceType,
            credit_balance: newBalance,
            total_purchased: amountUSDC,
            total_spent: 0,
            last_topup_tx: paymentResult.signature,
            last_topup_amount: amountUSDC,
            last_topup_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error inserting credits:', insertError);
          return { success: false, error: insertError.message };
        }
      }

      return {
        success: true,
        newBalance,
        transactionSignature: paymentResult.signature
      };
    } catch (error: any) {
      console.error('Error topping up credits:', error);
      return { success: false, error: error.message };
    }
  }

  static async spendCredits(
    walletAddress: string,
    serviceId: string | null,
    serviceType: 'agent' | 'api' | 'web_service',
    amount: number
  ): Promise<CreditSpendResult> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('x402_payment_credits')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('service_id', serviceId || '')
        .eq('service_type', serviceType)
        .maybeSingle();

      if (fetchError || !existing) {
        return { success: false, error: 'Credit account not found' };
      }

      const currentBalance = Number(existing.credit_balance);

      if (currentBalance < amount) {
        if (existing.auto_topup_enabled && currentBalance < existing.auto_topup_threshold) {
          return {
            success: false,
            error: 'Insufficient credits. Auto top-up triggered but requires user action.'
          };
        }

        return { success: false, error: 'Insufficient credits' };
      }

      const newBalance = currentBalance - amount;
      const newTotalSpent = Number(existing.total_spent) + amount;

      const { error: updateError } = await supabase
        .from('x402_payment_credits')
        .update({
          credit_balance: newBalance,
          total_spent: newTotalSpent,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error spending credits:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true, newBalance };
    } catch (error: any) {
      console.error('Error spending credits:', error);
      return { success: false, error: error.message };
    }
  }

  static async enableAutoTopUp(
    walletAddress: string,
    serviceId: string | null,
    serviceType: 'agent' | 'api' | 'web_service',
    threshold: number,
    topUpAmount: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('x402_payment_credits')
        .update({
          auto_topup_enabled: true,
          auto_topup_threshold: threshold,
          auto_topup_amount: topUpAmount,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress)
        .eq('service_id', serviceId || '')
        .eq('service_type', serviceType);

      if (error) {
        console.error('Error enabling auto top-up:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error enabling auto top-up:', error);
      return false;
    }
  }

  static async disableAutoTopUp(
    walletAddress: string,
    serviceId: string | null,
    serviceType: 'agent' | 'api' | 'web_service'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('x402_payment_credits')
        .update({
          auto_topup_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress)
        .eq('service_id', serviceId || '')
        .eq('service_type', serviceType);

      if (error) {
        console.error('Error disabling auto top-up:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error disabling auto top-up:', error);
      return false;
    }
  }

  static async getCreditHistory(
    walletAddress: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('x402_transactions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching credit history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching credit history:', error);
      return [];
    }
  }

  static async getCreditStats(walletAddress: string): Promise<{
    totalSpent: number;
    totalPurchased: number;
    averageSpend: number;
    transactionCount: number;
  }> {
    try {
      const credits = await this.getAllCredits(walletAddress);

      const totalSpent = credits.reduce((sum, c) => sum + Number(c.total_spent), 0);
      const totalPurchased = credits.reduce((sum, c) => sum + Number(c.total_purchased), 0);

      const { data: transactions } = await supabase
        .from('x402_transactions')
        .select('amount_charged')
        .eq('wallet_address', walletAddress)
        .eq('status', 'completed');

      const transactionCount = transactions?.length || 0;
      const averageSpend = transactionCount > 0 ? totalSpent / transactionCount : 0;

      return {
        totalSpent,
        totalPurchased,
        averageSpend,
        transactionCount
      };
    } catch (error) {
      console.error('Error fetching credit stats:', error);
      return {
        totalSpent: 0,
        totalPurchased: 0,
        averageSpend: 0,
        transactionCount: 0
      };
    }
  }
}
