import { useState, useEffect } from 'react';
import { Key, Copy, Trash2, Eye, EyeOff, Plus, CheckCircle, AlertCircle, X } from 'lucide-react';
import { apiKeyService, APIKey, APIKeyWithSecret } from '../services/apiKeyService';
import { useWallet } from '../hooks/useWallet';

interface APIKeyManagerProps {
  apiId: string;
  apiName: string;
}

export default function APIKeyManager({ apiId, apiName }: APIKeyManagerProps) {
  const { connected, publicKey } = useWallet();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<APIKeyWithSecret | null>(null);
  const [keyName, setKeyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      loadKeys();
    }
  }, [connected, publicKey, apiId]);

  const loadKeys = async () => {
    if (!publicKey) return;

    setLoading(true);
    const userKeys = await apiKeyService.listUserAPIKeys(publicKey, apiId);
    setKeys(userKeys);
    setLoading(false);
  };

  const handleGenerateKey = async () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setGenerating(true);
    setError('');

    const result = await apiKeyService.createAPIKey({
      api_id: apiId,
      user_wallet_address: publicKey,
      name: keyName.trim() || undefined,
      expiresInDays: 365,
      rateLimitPerHour: 1000
    });

    setGenerating(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setNewKeyData(result);
    setShowNewKeyModal(false);
    await loadKeys();
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!publicKey || !confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    const success = await apiKeyService.revokeAPIKey(keyId, publicKey);
    if (success) {
      await loadKeys();
    }
  };

  const handleCopyKey = (key: string, keyId: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!connected) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-center">
          <Key size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">API Keys</h3>
          <p className="text-gray-600 mb-4">Connect your wallet to manage API keys</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Key size={24} />
            API Keys
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage your API keys for {apiName}
          </p>
        </div>
        <button
          onClick={() => setShowNewKeyModal(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={18} />
          Generate New Key
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading API keys...</p>
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Key size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 mb-4">No API keys yet</p>
          <p className="text-sm text-gray-500">Generate your first API key to start using this API</p>
        </div>
      ) : (
        <div className="space-y-4">
          {keys.map((key) => (
            <div
              key={key.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {key.name || 'Unnamed Key'}
                    </span>
                    {!key.is_active && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                        Revoked
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>Created: {formatDate(key.created_at)}</div>
                    {key.last_used_at && (
                      <div>Last used: {formatDate(key.last_used_at)}</div>
                    )}
                    <div>Requests: {key.total_requests?.toLocaleString() || 0}</div>
                    <div>Rate limit: {key.rate_limit_per_hour}/hour</div>
                  </div>
                </div>
                {key.is_active && (
                  <button
                    onClick={() => handleRevokeKey(key.id)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                    title="Revoke key"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                <code className="flex-1 text-sm font-mono text-gray-700">
                  {visibleKeys.has(key.id) ? key.key_prefix : key.key_prefix}
                </code>
                <button
                  onClick={() => toggleKeyVisibility(key.id)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                  title={visibleKeys.has(key.id) ? 'Hide key' : 'Show key'}
                >
                  {visibleKeys.has(key.id) ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button
                  onClick={() => handleCopyKey(key.key_prefix, key.id)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                  title="Copy key prefix"
                >
                  {copiedKey === key.id ? (
                    <CheckCircle size={18} className="text-green-600" />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate New Key Modal */}
      {showNewKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !generating && setShowNewKeyModal(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Generate API Key</h3>
              <button
                onClick={() => setShowNewKeyModal(false)}
                disabled={generating}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Name (Optional)
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Production, Development"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={generating}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleGenerateKey}
                  disabled={generating}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? 'Generating...' : 'Generate Key'}
                </button>
                <button
                  onClick={() => setShowNewKeyModal(false)}
                  disabled={generating}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Key Created Modal */}
      {newKeyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setNewKeyData(null)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-xl shadow-2xl p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">API Key Generated</h3>
              <p className="text-sm text-gray-600">
                Save this key securely - you won't be able to see it again!
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  <strong>Important:</strong> Copy this API key now. For security reasons, we cannot show it to you again.
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your API Key</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg p-3">
                  <code className="flex-1 text-sm font-mono text-gray-900 break-all">
                    {newKeyData.key}
                  </code>
                  <button
                    onClick={() => handleCopyKey(newKeyData.key, 'new-key')}
                    className="text-gray-500 hover:text-gray-700 p-1 flex-shrink-0"
                  >
                    {copiedKey === 'new-key' ? (
                      <CheckCircle size={20} className="text-green-600" />
                    ) : (
                      <Copy size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Rate Limit:</span>
                  <div className="font-medium text-gray-900">{newKeyData.rate_limit_per_hour}/hour</div>
                </div>
                <div>
                  <span className="text-gray-600">Expires:</span>
                  <div className="font-medium text-gray-900">
                    {newKeyData.expires_at ? formatDate(newKeyData.expires_at) : 'Never'}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setNewKeyData(null)}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              I've Saved My Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
