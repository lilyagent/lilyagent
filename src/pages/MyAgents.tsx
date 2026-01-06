import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Agent } from '../types';
import { ArrowRight, Wallet, Zap, TrendingUp } from 'lucide-react';
import LilyFlowers from '../components/LilyFlowers';

interface MyAgentsProps {
  walletAddress?: string;
}

export default function MyAgents({ walletAddress }: MyAgentsProps) {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (walletAddress) {
      loadMyAgents();
    } else {
      setLoading(false);
    }
  }, [walletAddress]);

  async function loadMyAgents() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen pt-24 px-6 pb-12 bg-gray-50">
      <LilyFlowers />
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Agents</h1>
          <p className="text-gray-600">Manage and monitor your AI agents</p>
        </div>

        {!walletAddress ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
            <p className="text-gray-600 text-center max-w-md">
              Connect your wallet to view and manage all agents you've created on the marketplace
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-gray-600">Loading your agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No agents yet</h3>
            <p className="text-gray-600 mb-6">You haven't created any agents yet</p>
            <button
              onClick={() => navigate('/dashboard/marketplace')}
              className="px-6 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              Explore Marketplace
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                {agents.length} {agents.length === 1 ? 'agent' : 'agents'} found
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent, index) => (
                <div
                  key={agent.id}
                  onClick={() => navigate(`/agents/${agent.id}`)}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-primary-200 transition-all duration-300 cursor-pointer group animate-scale-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                        {agent.name}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{agent.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-600">
                      {agent.category}
                    </span>
                    {agent.is_active ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Zap className="w-3 h-3" />
                        Executions
                      </div>
                      <div className="text-lg font-semibold text-gray-900">{agent.executions}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <TrendingUp className="w-3 h-3" />
                        Revenue
                      </div>
                      <div className="text-lg font-semibold text-gray-900">${Number(agent.revenue).toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Price</div>
                      <div className="text-lg font-semibold text-gray-900">${Number(agent.price).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Rating</div>
                      <div className="text-lg font-semibold text-gray-900">
                        ★ {agent.rating ? Number(agent.rating).toFixed(1) : '0.0'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
