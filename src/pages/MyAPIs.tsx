import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { API } from '../types';
import { Plus, Activity, DollarSign, TrendingUp, ArrowRight, Wallet } from 'lucide-react';
import LilyFlowers from '../components/LilyFlowers';
import CreateAPIModal from '../components/CreateAPIModal';

interface MyAPIsProps {
  walletAddress?: string;
}

export default function MyAPIs({ walletAddress }: MyAPIsProps) {
  const navigate = useNavigate();
  const [apis, setApis] = useState<API[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalAPIs: 0,
    totalCalls: 0,
    totalRevenue: 0,
    avgUptime: 0,
  });

  useEffect(() => {
    if (walletAddress) {
      loadMyAPIs();
    } else {
      setLoading(false);
    }
  }, [walletAddress]);

  async function loadMyAPIs() {
    if (!walletAddress) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('apis')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setApis(data);

        const totalCalls = data.reduce((sum, api) => sum + (api.total_calls || 0), 0);
        const totalRevenue = data.reduce((sum, api) => sum + (api.total_revenue || 0), 0);
        const avgUptime = data.length > 0
          ? data.reduce((sum, api) => sum + (api.uptime_percentage || 0), 0) / data.length
          : 0;

        setStats({
          totalAPIs: data.length,
          totalCalls,
          totalRevenue,
          avgUptime,
        });
      }
    } catch (err) {
      console.error('Failed to load APIs:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateAPI = () => {
    setIsCreateModalOpen(true);
  };

  const handleAPICreated = () => {
    setIsCreateModalOpen(false);
    loadMyAPIs();
  };

  if (!walletAddress) {
    return (
      <>
        <div className="relative min-h-screen pt-24 px-6 pb-12 bg-gray-50">
          <LilyFlowers />
          <div className="max-w-7xl mx-auto animate-fade-in">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">My APIs</h1>
              <p className="text-gray-600">Manage and monitor your API listings</p>
            </div>
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600 text-center max-w-md">
                Connect your wallet to view and manage all APIs you've listed on the marketplace
              </p>
            </div>
          </div>
        </div>
        <CreateAPIModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          walletAddress={walletAddress}
          onSuccess={handleAPICreated}
        />
      </>
    );
  }

  return (
    <div className="relative min-h-screen pt-24 px-6 pb-12 bg-gray-50">
      <LilyFlowers />
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My APIs</h1>
            <p className="text-gray-600">Manage and monitor your API listings</p>
          </div>
          <button
            onClick={handleCreateAPI}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus size={16} />
            Create API Listing
          </button>
        </div>

        {apis.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Activity className="w-4 h-4" />
                <span>Total APIs</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalAPIs}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span>Total Calls</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalCalls.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <DollarSign className="w-4 h-4" />
                <span>Total Revenue</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Activity className="w-4 h-4" />
                <span>Avg Uptime</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.avgUptime.toFixed(1)}%</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-gray-600">Loading your APIs...</p>
          </div>
        ) : apis.length > 0 ? (
          <div className="space-y-4">
            {apis.map((api, index) => (
              <div
                key={api.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-primary-200 transition-all duration-300 cursor-pointer group animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/apis/${api.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-2xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {api.name}
                      </h3>
                      {api.is_active ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                      {api.is_verified && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{api.description}</p>

                    <div className="grid grid-cols-5 gap-6">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Calls</div>
                        <div className="text-lg font-semibold text-gray-900">{api.total_calls?.toLocaleString() || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Revenue</div>
                        <div className="text-lg font-semibold text-gray-900">${api.total_revenue?.toFixed(2) || '0.00'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Uptime</div>
                        <div className="text-lg font-semibold text-gray-900">{api.uptime_percentage?.toFixed(1) || 0}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Response Time</div>
                        <div className="text-lg font-semibold text-gray-900">{api.avg_response_time || 0}ms</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Rating</div>
                        <div className="text-lg font-semibold text-gray-900">★ {api.rating?.toFixed(1) || '0.0'}</div>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0 ml-6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No APIs yet</h3>
            <p className="text-gray-600 mb-6 text-center max-w-md">
              Start building your API marketplace presence by creating your first API listing
            </p>
            <button
              onClick={handleCreateAPI}
              className="px-6 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Create Your First API
            </button>
          </div>
        )}
      </div>
      <CreateAPIModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        walletAddress={walletAddress}
        onSuccess={handleAPICreated}
      />
    </div>
  );
}
