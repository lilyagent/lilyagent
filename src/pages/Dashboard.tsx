import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Bot, Zap, Users, ArrowUpRight } from 'lucide-react';
import type { Agent, DashboardStats } from '../types';
import LilyFlowers from '../components/LilyFlowers';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 6.57,
    activeAgents: 3,
    totalExecutions: 43,
    marketplaceAgents: 3,
  });
  const [topAgents, setTopAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const { data: agents } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('revenue', { ascending: false})
        .limit(5);

      if (agents && agents.length > 0) {
        const totalRevenue = agents.reduce((sum, agent) => sum + Number(agent.revenue), 0);
        const totalExecutions = agents.reduce((sum, agent) => sum + agent.executions, 0);

        setStats({
          totalRevenue,
          activeAgents: agents.length,
          totalExecutions,
          marketplaceAgents: agents.length,
        });
        setTopAgents(agents);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      subtitle: 'USDC',
      change: '+8.3%',
      icon: TrendingUp,
      color: 'text-success-500',
      bgColor: 'bg-success-50',
    },
    {
      title: 'Active Agents',
      value: stats.activeAgents.toString(),
      subtitle: 'Live',
      change: '+1',
      icon: Bot,
      color: 'text-primary-500',
      bgColor: 'bg-primary-50',
    },
    {
      title: 'Total Executions',
      value: stats.totalExecutions.toString(),
      subtitle: 'All Time',
      change: '+7',
      icon: Zap,
      color: 'text-warning-500',
      bgColor: 'bg-warning-50',
    },
    {
      title: 'Marketplace',
      value: stats.marketplaceAgents.toString(),
      subtitle: 'Listed',
      change: 'New',
      icon: Users,
      color: 'text-primary-500',
      bgColor: 'bg-primary-50',
    },
  ];

  return (
    <div className="relative min-h-screen pt-24 px-6 pb-12 bg-gray-50">
      <LilyFlowers />
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Agent performance and earnings summary</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className="text-sm font-medium text-success-500">{stat.change}</span>
              </div>
              <div className="text-sm text-gray-600 mb-1">{stat.title}</div>
              <div className="text-3xl font-semibold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.subtitle}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Top Performing Agents</h2>
            <button className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
              View All
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
              <p className="text-gray-500">Loading agents...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Agent
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Category
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Price
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Executions
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Revenue
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topAgents.length > 0 ? (
                    topAgents.map((agent, index) => (
                      <tr
                        key={agent.id}
                        className="hover:bg-gray-50 transition-colors duration-200"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{agent.name}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-600">
                            {agent.category}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                          ${Number(agent.price).toFixed(2)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{agent.executions}</td>
                        <td className="px-4 py-4 text-sm font-medium text-success-600">
                          ${Number(agent.revenue).toFixed(2)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-600">
                            Live
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">DevAssist Pro</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-600">
                            Code
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">$0.15</td>
                        <td className="px-4 py-4 text-sm text-gray-600">23</td>
                        <td className="px-4 py-4 text-sm font-medium text-success-600">$3.45</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-600">
                            Live
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">DataCrunch</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-600">
                            Data
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">$0.18</td>
                        <td className="px-4 py-4 text-sm text-gray-600">12</td>
                        <td className="px-4 py-4 text-sm font-medium text-success-600">$2.16</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-600">
                            Live
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">QuickResearch</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-600">
                            Research
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">$0.12</td>
                        <td className="px-4 py-4 text-sm text-gray-600">8</td>
                        <td className="px-4 py-4 text-sm font-medium text-success-600">$0.96</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-600">
                            Live
                          </span>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
