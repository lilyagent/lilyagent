import { supabase } from '../lib/supabase';

export interface X402AnalyticsData {
  date: string;
  service_id: string | null;
  service_type: 'agent' | 'api' | 'web_service';
  total_transactions: number;
  total_volume_usdc: number;
  unique_users: number;
  avg_transaction_amount: number;
  success_rate: number;
  avg_response_time_ms: number;
}

export interface X402Stats {
  totalRevenue: number;
  totalTransactions: number;
  activeSessionsCount: number;
  averageSessionValue: number;
  successRate: number;
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    revenue: number;
    transactions: number;
  }>;
}

export class X402Analytics {
  static async getDailyStats(
    date: string,
    serviceId?: string
  ): Promise<X402AnalyticsData | null> {
    try {
      let query = supabase
        .from('x402_analytics')
        .select('*')
        .eq('date', date);

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        return null;
      }

      return data as X402AnalyticsData;
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      return null;
    }
  }

  static async getServiceStats(
    serviceId: string,
    serviceType: 'agent' | 'api' | 'web_service',
    days: number = 30
  ): Promise<X402AnalyticsData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('x402_analytics')
        .select('*')
        .eq('service_id', serviceId)
        .eq('service_type', serviceType)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching service stats:', error);
        return [];
      }

      return data as X402AnalyticsData[];
    } catch (error) {
      console.error('Error fetching service stats:', error);
      return [];
    }
  }

  static async getOverallStats(walletAddress?: string): Promise<X402Stats> {
    try {
      let transactionsQuery = supabase
        .from('x402_transactions')
        .select('amount_charged, status, response_time_ms');

      if (walletAddress) {
        transactionsQuery = transactionsQuery.eq('wallet_address', walletAddress);
      }

      const { data: transactions } = await transactionsQuery;

      let sessionsQuery = supabase
        .from('x402_payment_sessions')
        .select('authorized_amount, status');

      if (walletAddress) {
        sessionsQuery = sessionsQuery.eq('wallet_address', walletAddress);
      }

      const { data: sessions } = await sessionsQuery;

      const totalRevenue = transactions?.reduce(
        (sum, tx) => sum + (tx.status === 'completed' ? Number(tx.amount_charged) : 0),
        0
      ) || 0;

      const totalTransactions = transactions?.length || 0;

      const completedTransactions = transactions?.filter(tx => tx.status === 'completed').length || 0;
      const successRate = totalTransactions > 0
        ? (completedTransactions / totalTransactions) * 100
        : 0;

      const activeSessions = sessions?.filter(s => s.status === 'active') || [];
      const activeSessionsCount = activeSessions.length;

      const averageSessionValue = activeSessions.length > 0
        ? activeSessions.reduce((sum, s) => sum + Number(s.authorized_amount), 0) / activeSessions.length
        : 0;

      const topServicesQuery = await supabase
        .from('x402_analytics')
        .select('service_id, service_type, total_volume_usdc, total_transactions')
        .order('total_volume_usdc', { ascending: false })
        .limit(5);

      const topServices = topServicesQuery.data?.map(s => ({
        serviceId: s.service_id || 'unknown',
        serviceName: s.service_type,
        revenue: Number(s.total_volume_usdc),
        transactions: s.total_transactions
      })) || [];

      return {
        totalRevenue,
        totalTransactions,
        activeSessionsCount,
        averageSessionValue,
        successRate,
        topServices
      };
    } catch (error) {
      console.error('Error fetching overall stats:', error);
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        activeSessionsCount: 0,
        averageSessionValue: 0,
        successRate: 0,
        topServices: []
      };
    }
  }

  static async aggregateDailyStats(date: string): Promise<void> {
    try {
      const { data: transactions } = await supabase
        .from('x402_transactions')
        .select('*')
        .gte('created_at', date)
        .lt('created_at', new Date(new Date(date).getTime() + 86400000).toISOString());

      if (!transactions || transactions.length === 0) {
        return;
      }

      const serviceGroups = transactions.reduce((groups, tx) => {
        const key = `${tx.resource_type}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(tx);
        return groups;
      }, {} as Record<string, any[]>);

      for (const [serviceType, txs] of Object.entries(serviceGroups)) {
        const totalTransactions = txs.length;
        const totalVolume = txs.reduce((sum, tx) => sum + Number(tx.amount_charged), 0);
        const uniqueUsers = new Set(txs.map(tx => tx.wallet_address)).size;
        const completedTxs = txs.filter(tx => tx.status === 'completed');
        const successRate = (completedTxs.length / totalTransactions) * 100;
        const avgAmount = totalVolume / totalTransactions;
        const avgResponseTime = txs.reduce((sum, tx) => sum + (tx.response_time_ms || 0), 0) / totalTransactions;

        await supabase
          .from('x402_analytics')
          .upsert({
            date,
            service_id: null,
            service_type: this.mapResourceTypeToServiceType(serviceType),
            total_transactions: totalTransactions,
            total_volume_usdc: totalVolume,
            unique_users: uniqueUsers,
            avg_transaction_amount: avgAmount,
            success_rate: successRate,
            avg_response_time_ms: Math.round(avgResponseTime)
          }, {
            onConflict: 'date,service_id,service_type'
          });
      }
    } catch (error) {
      console.error('Error aggregating daily stats:', error);
    }
  }

  private static mapResourceTypeToServiceType(
    resourceType: string
  ): 'agent' | 'api' | 'web_service' {
    switch (resourceType) {
      case 'agent_execution':
        return 'agent';
      case 'api_call':
        return 'api';
      case 'data_access':
        return 'web_service';
      default:
        return 'api';
    }
  }

  static async getTransactionHistory(
    walletAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('x402_transactions')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching transaction history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }

  static async getRevenueTimeSeries(
    serviceId?: string,
    days: number = 30
  ): Promise<Array<{ date: string; revenue: number; transactions: number }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from('x402_analytics')
        .select('date, total_volume_usdc, total_transactions')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      const { data, error } = await query;

      if (error || !data) {
        return [];
      }

      return data.map(d => ({
        date: d.date,
        revenue: Number(d.total_volume_usdc),
        transactions: d.total_transactions
      }));
    } catch (error) {
      console.error('Error fetching revenue time series:', error);
      return [];
    }
  }

  static async scheduleAnalyticsAggregation(): Promise<void> {
    setInterval(async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      await this.aggregateDailyStats(dateStr);
    }, 24 * 60 * 60 * 1000);
  }
}

export const x402Analytics = new X402Analytics();
