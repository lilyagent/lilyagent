import { useState, useEffect } from 'react';
import { DollarSign, Zap, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import X402SessionManager from '../components/X402SessionManager';
import { X402CreditManager } from '../services/x402CreditManager';
import { x402Analytics } from '../services/x402Analytics';
import LilyFlowers from '../components/LilyFlowers';
import type { X402Credit } from '../types';

export default function X402Payments() {
  const { publicKey, connected } = useWallet();
  const [credits, setCredits] = useState<X402Credit[]>([]);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalPurchased: 0,
    averageSpend: 0,
    transactionCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      loadData();
    }
  }, [connected, publicKey]);

  const loadData = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const [creditsData, statsData] = await Promise.all([
        X402CreditManager.getAllCredits(publicKey),
        X402CreditManager.getCreditStats(publicKey)
      ]);

      setCredits(creditsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading x402 data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-6">
        <LilyFlowers />
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap size={32} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600">
              Connect your wallet to manage x402 payment sessions and credits
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-6 flex items-center justify-center">
        <LilyFlowers />
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
          <div className="text-gray-600">Loading payment data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 px-6 pb-12">
      <LilyFlowers />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">x402 Payments</h1>
            <p className="text-gray-600">
              Manage your payment sessions, credits, and transaction history
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <DollarSign size={20} className="text-primary-500" />
              </div>
              <div className="text-sm font-medium text-gray-600">Total Spent</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${stats.totalSpent.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">All-time expenditure</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-success-500" />
              </div>
              <div className="text-sm font-medium text-gray-600">Total Purchased</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${stats.totalPurchased.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Credits loaded</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-warning-50 rounded-lg flex items-center justify-center">
                <Activity size={20} className="text-warning-500" />
              </div>
              <div className="text-sm font-medium text-gray-600">Avg per Transaction</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${stats.averageSpend.toFixed(4)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Average cost</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Zap size={20} className="text-blue-500" />
              </div>
              <div className="text-sm font-medium text-gray-600">Transactions</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.transactionCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total count</div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Credit Balances</h2>
          {credits.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {credits.map((credit) => (
                <div key={credit.id} className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">
                        {credit.service_type}
                      </div>
                      <div className="font-semibold text-gray-900">
                        {credit.service_id ? `Service ${credit.service_id.slice(0, 8)}...` : 'Platform Credits'}
                      </div>
                    </div>
                    {credit.auto_topup_enabled && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-600">
                        Auto Top-up
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-1">Available Balance</div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${Number(credit.credit_balance).toFixed(2)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Purchased</div>
                      <div className="font-semibold text-gray-900">
                        ${Number(credit.total_purchased).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Spent</div>
                      <div className="font-semibold text-gray-900">
                        ${Number(credit.total_spent).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {credit.last_topup_at && (
                    <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                      Last top-up: {new Date(credit.last_topup_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Credits Yet</h3>
              <p className="text-sm text-gray-600">
                Purchase credits to enable instant payments across services
              </p>
            </div>
          )}
        </div>

        <div>
          <X402SessionManager />
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Zap size={18} />
            About x402 Payments
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              <strong>Payment Sessions:</strong> Preauthorize a specific amount for recurring payments without repeated wallet approvals
            </p>
            <p>
              <strong>Credits:</strong> Purchase credits for instant, gasless payments across all services
            </p>
            <p>
              <strong>Security:</strong> All sessions and credits are protected by blockchain-backed authorization
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
