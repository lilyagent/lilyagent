import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Activity, Clock, TrendingUp, FileText, Code, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LilyFlowers from '../components/LilyFlowers';
import APIKeyManager from '../components/APIKeyManager';
import type { API, APIEndpoint, APIPricingModel } from '../types';

export default function APIDetail() {
  const { apiId } = useParams<{ apiId: string }>();
  const navigate = useNavigate();
  const [api, setApi] = useState<API | null>(null);
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [pricingModel, setPricingModel] = useState<APIPricingModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'endpoints' | 'pricing' | 'playground'>('overview');

  useEffect(() => {
    if (apiId) {
      fetchAPIDetails();
    }
  }, [apiId]);

  const fetchAPIDetails = async () => {
    try {
      const { data: apiData, error: apiError } = await supabase
        .from('apis')
        .select('*')
        .eq('id', apiId)
        .maybeSingle();

      if (apiError) throw apiError;

      if (apiData) {
        setApi(apiData);

        const { data: endpointsData } = await supabase
          .from('api_endpoints')
          .select('*')
          .eq('api_id', apiId)
          .eq('is_active', true);

        if (endpointsData) setEndpoints(endpointsData);

        const { data: pricingData } = await supabase
          .from('api_pricing_models')
          .select('*')
          .eq('api_id', apiId)
          .eq('is_active', true)
          .maybeSingle();

        if (pricingData) setPricingModel(pricingData);
      }
    } catch (err) {
      console.error('Failed to fetch API details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-6 flex items-center justify-center">
        <LilyFlowers />
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
          <div className="text-gray-600">Loading API details...</div>
        </div>
      </div>
    );
  }

  if (!api) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-6">
        <LilyFlowers />
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">API Not Found</h2>
            <button onClick={() => navigate(-1)} className="text-primary-600 hover:text-primary-700 font-medium">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 px-6 pb-12">
      <LilyFlowers />
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8 font-medium"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                    {api.name}
                  </h1>
                  {api.is_verified && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-50 text-primary-600">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-lg mb-3">{api.description}</p>
                <div className="text-sm text-gray-500">by {api.provider}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 text-center md:min-w-[200px]">
                <div className="text-sm text-gray-600 mb-2">Price per call</div>
                <div className="text-4xl font-bold text-gray-900 mb-1">${api.price.toFixed(4)}</div>
                <div className="text-sm text-gray-500">USDC</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <TrendingUp size={16} />
                  <span>Total Calls</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{api.total_calls?.toLocaleString() || 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Activity size={16} />
                  <span>Uptime</span>
                </div>
                <div className="text-3xl font-bold text-success-600">{api.uptime_percentage?.toFixed(1) || 0}%</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Clock size={16} />
                  <span>Avg Response</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{api.avg_response_time || 0}ms</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-sm text-gray-600 mb-2">Rating</div>
                <div className="flex items-center gap-1">
                  <span className="text-warning-500 text-2xl">★</span>
                  <span className="text-3xl font-bold text-gray-900">{api.rating?.toFixed(1) || '0.0'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-1 border-b border-gray-200 bg-white rounded-t-xl px-2 pt-2">
            {[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'endpoints', label: 'Endpoints', icon: Code },
              { id: 'pricing', label: 'Pricing', icon: Key },
              { id: 'playground', label: 'Playground', icon: Play },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative rounded-t-lg ${
                  selectedTab === tab.id
                    ? 'text-primary-600 bg-gray-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {selectedTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-500 rounded-t" />
                )}
              </button>
            ))}
          </div>
        </div>

        {selectedTab === 'overview' && (
          <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">API Overview</h2>
            <div className="space-y-6">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Base URL</div>
                <div className="bg-gray-900 text-gray-100 border border-gray-800 rounded-lg p-4 font-mono text-sm">
                  {api.base_url || api.endpoint}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Version</div>
                <div className="text-lg text-gray-900">{api.version || 'v1'}</div>
              </div>
              {api.documentation_url && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Documentation</div>
                  <a
                    href={api.documentation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 underline font-medium"
                  >
                    View Full Documentation →
                  </a>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Authentication</div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">API Key authentication via header:</p>
                  <code className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">Authorization: Bearer YOUR_API_KEY</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'endpoints' && (
          <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Endpoints</h2>
            {endpoints.length > 0 ? (
              <div className="space-y-4">
                {endpoints.map(endpoint => (
                  <div key={endpoint.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-md ${
                        endpoint.method === 'GET' ? 'bg-success-100 text-success-700' :
                        endpoint.method === 'POST' ? 'bg-primary-100 text-primary-700' :
                        endpoint.method === 'PUT' ? 'bg-warning-100 text-warning-700' :
                        endpoint.method === 'DELETE' ? 'bg-error-100 text-error-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="font-mono text-sm text-gray-900">{endpoint.path}</code>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{endpoint.description}</p>
                    {endpoint.example_request && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-700 mb-2">Example Request</div>
                        <pre className="bg-gray-900 text-gray-100 border border-gray-800 rounded-lg p-3 text-xs overflow-x-auto">
                          {JSON.stringify(endpoint.example_request, null, 2)}
                        </pre>
                      </div>
                    )}
                    {endpoint.example_response && (
                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-2">Example Response</div>
                        <pre className="bg-gray-900 text-gray-100 border border-gray-800 rounded-lg p-3 text-xs overflow-x-auto">
                          {JSON.stringify(endpoint.example_response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No endpoint documentation available yet
              </div>
            )}
          </div>
        )}

        {selectedTab === 'pricing' && (
          <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Pricing Model</h2>
            {pricingModel ? (
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Model Type</div>
                  <div className="text-lg text-gray-900 capitalize">{pricingModel.model_type}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="text-sm font-medium text-gray-700 mb-2">Price per Call</div>
                    <div className="text-2xl font-bold text-gray-900">${pricingModel.price_per_call.toFixed(4)} USDC</div>
                  </div>
                  {pricingModel.free_tier_limit > 0 && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="text-sm font-medium text-gray-700 mb-2">Free Tier</div>
                      <div className="text-2xl font-bold text-gray-900">{pricingModel.free_tier_limit} calls/month</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-4">Rate Limits</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">Per Minute</div>
                      <div className="text-xl font-semibold text-gray-900">{pricingModel.rate_limit_per_minute}</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">Per Day</div>
                      <div className="text-xl font-semibold text-gray-900">{pricingModel.rate_limit_per_day.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">Per Month</div>
                      <div className="text-xl font-semibold text-gray-900">{pricingModel.rate_limit_per_month.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                No pricing information available
              </div>
            )}
          </div>
        )}

        {selectedTab === 'playground' && (
          <div className="rounded-b-xl border border-t-0 border-gray-200">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">API Playground</h2>
              <p className="text-gray-600 mb-6">
                Test API endpoints directly from your browser. Generate an API key to get started.
              </p>
            </div>
            <div className="px-8 pb-8">
              <APIKeyManager apiId={apiId!} apiName={api.name} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
