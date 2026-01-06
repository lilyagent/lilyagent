import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Agent } from '../types';
import { Search, Zap, TrendingUp, ArrowRight, Filter } from 'lucide-react';
import LilyFlowers from '../components/LilyFlowers';

const categories = ['All', 'Research', 'Code', 'Finance', 'Writing', 'Data', 'Other'];

export default function Marketplace() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, [selectedCategory]);

  async function loadAgents() {
    try {
      let query = supabase.from('agents').select('*').eq('is_active', true);

      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      const { data } = await query.order('executions', { ascending: false });

      if (data && data.length > 0) {
        setAgents(data);
      } else {
        setAgents([
          {
            id: '1',
            name: 'DevAssist Pro',
            description: 'Helps with code debugging and refactoring. Works well with TypeScript/React projects.',
            category: 'Code',
            price: 0.15,
            rating: 0,
            executions: 23,
            revenue: 3.45,
            creator_id: '',
            is_active: true,
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'QuickResearch',
            description: 'Aggregates info from multiple sources - good for market analysis and competitor research',
            category: 'Research',
            price: 0.12,
            rating: 0,
            executions: 8,
            revenue: 0.96,
            creator_id: '',
            is_active: true,
            created_at: new Date().toISOString(),
          },
          {
            id: '3',
            name: 'DataCrunch',
            description: 'Processes CSV/JSON files and generates basic reports. Still working on Excel support.',
            category: 'Data',
            price: 0.18,
            rating: 0,
            executions: 12,
            revenue: 2.16,
            creator_id: '',
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ] as Agent[]);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen pt-24 px-6 pb-12 bg-gray-50">
      <LilyFlowers />
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Agent Marketplace</h1>
          <p className="text-gray-600">Browse and run AI agents built by the community</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents by name or description..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 mr-2">Category:</span>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-gray-600">Loading agents...</p>
          </div>
        ) : filteredAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent, index) => (
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
                      Price
                    </div>
                    <div className="text-lg font-semibold text-gray-900">${Number(agent.price).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No agents found</h3>
            <p className="text-gray-600 text-center max-w-md">
              {searchQuery
                ? 'Try adjusting your search or filter to find what you\'re looking for.'
                : 'No agents available in this category yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
