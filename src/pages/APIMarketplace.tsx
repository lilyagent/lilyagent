import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { API } from '../types';
import { Search, Activity, Clock, TrendingUp, ArrowRight, Filter, CheckCircle, ArrowUpDown } from 'lucide-react';
import LilyFlowers from '../components/LilyFlowers';

type SortOption = 'popular' | 'newest' | 'price-low' | 'price-high' | 'rating';

const categories = ['All', 'AI/ML', 'Data', 'Finance', 'Social', 'Utilities', 'Other'];

export default function APIMarketplace() {
  const navigate = useNavigate();
  const [apis, setApis] = useState<API[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAPIs();
  }, [sortBy, selectedCategory]);

  async function loadAPIs() {
    try {
      setLoading(true);
      let query = supabase.from('apis').select('*').eq('is_active', true);

      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'price-low':
          query = query.order('price', { ascending: true });
          break;
        case 'price-high':
          query = query.order('price', { ascending: false });
          break;
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        default:
          query = query.order('total_calls', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        setApis(data);
      } else {
        setApis([
          {
            id: '1',
            name: 'OpenAI API',
            description: 'Access GPT-4 and other OpenAI models with simplified authentication',
            category: 'AI/ML',
            provider: 'OpenAI',
            price: 0.002,
            rating: 4.8,
            endpoint: 'https://api.labory.fun/v1/openai',
            total_calls: 15420,
            uptime_percentage: 99.9,
            avg_response_time: 342,
            is_verified: true,
            is_active: true,
            creator_id: '',
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'Weather Data',
            description: 'Real-time weather data and forecasts for any location worldwide',
            category: 'Data',
            provider: 'WeatherCo',
            price: 0.001,
            rating: 4.5,
            endpoint: 'https://api.labory.fun/v1/weather',
            total_calls: 8920,
            uptime_percentage: 99.5,
            avg_response_time: 180,
            is_verified: true,
            is_active: true,
            creator_id: '',
            created_at: new Date().toISOString(),
          },
          {
            id: '3',
            name: 'Crypto Prices',
            description: 'Real-time cryptocurrency prices and market data across 100+ exchanges',
            category: 'Finance',
            provider: 'CryptoData',
            price: 0.0015,
            rating: 4.7,
            endpoint: 'https://api.labory.fun/v1/crypto',
            total_calls: 12340,
            uptime_percentage: 99.8,
            avg_response_time: 245,
            is_verified: true,
            is_active: true,
            creator_id: '',
            created_at: new Date().toISOString(),
          },
          {
            id: '4',
            name: 'Image Generation',
            description: 'AI-powered image generation and manipulation API',
            category: 'AI/ML',
            provider: 'ImageGen',
            price: 0.05,
            rating: 4.6,
            endpoint: 'https://api.labory.fun/v1/images',
            total_calls: 5670,
            uptime_percentage: 98.9,
            avg_response_time: 1850,
            is_verified: false,
            is_active: true,
            creator_id: '',
            created_at: new Date().toISOString(),
          },
        ] as API[]);
      }
    } catch (error) {
      console.error('Error loading APIs:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAPIs = apis.filter(api =>
    searchQuery === '' ||
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen pt-24 px-6 pb-12 bg-gray-50">
      <LilyFlowers />
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">API Marketplace</h1>
          <p className="text-gray-600">Access premium APIs with instant crypto micropayments</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search APIs by name, provider, or description..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer bg-white"
              >
                <option value="popular">Most Popular</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-gray-600">Loading APIs...</p>
          </div>
        ) : filteredAPIs.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAPIs.map((api, index) => (
              <div
                key={api.id}
                onClick={() => navigate(`/apis/${api.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-primary-200 transition-all duration-300 cursor-pointer group animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {api.name}
                      </h3>
                      {api.is_verified && (
                        <CheckCircle className="w-5 h-5 text-primary-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{api.description}</p>
                    <div className="text-xs text-gray-500">by {api.provider}</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
                </div>

                <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <TrendingUp className="w-3 h-3" />
                      Calls
                    </div>
                    <div className="text-base font-semibold text-gray-900">{api.total_calls?.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Activity className="w-3 h-3" />
                      Uptime
                    </div>
                    <div className="text-base font-semibold text-success-600">{api.uptime_percentage?.toFixed(1) || 0}%</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Clock className="w-3 h-3" />
                      Speed
                    </div>
                    <div className="text-base font-semibold text-gray-900">{api.avg_response_time || 0}ms</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Price per call</div>
                    <div className="text-2xl font-bold text-gray-900">${api.price.toFixed(4)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Rating</div>
                    <div className="flex items-center gap-1">
                      <span className="text-warning-500">★</span>
                      <span className="text-lg font-semibold text-gray-900">{api.rating?.toFixed(1) || '0.0'}</span>
                    </div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No APIs found</h3>
            <p className="text-gray-600 text-center max-w-md">
              {searchQuery
                ? 'Try adjusting your search or filter to find what you\'re looking for.'
                : 'No APIs available in this category yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
