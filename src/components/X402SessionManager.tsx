import { useState, useEffect } from 'react';
import { Clock, DollarSign, ExternalLink, Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { X402Protocol, X402Session } from '../services/x402Protocol';
import { useWallet } from '../hooks/useWallet';

export default function X402SessionManager() {
  const { publicKey } = useWallet();
  const [sessions, setSessions] = useState<X402Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if (publicKey) {
      loadSessions();
    }
  }, [publicKey]);

  const loadSessions = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const userSessions = await X402Protocol.getUserSessions(publicKey);
      setSessions(userSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const handleRevokeSession = async (sessionToken: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return;

    const success = await X402Protocol.revokeSession(sessionToken);
    if (success) {
      loadSessions();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'expired':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'revoked':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'depleted':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={14} />;
      case 'expired':
      case 'revoked':
      case 'depleted':
        return <XCircle size={14} />;
      default:
        return null;
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return 'Less than 1 hour';
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <RefreshCw size={24} className="animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payment Sessions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your active x402 payment sessions
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={20} className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Sessions</h3>
          <p className="text-sm text-gray-600">
            Create a payment session to enable seamless recurring payments
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {sessions.map((session) => (
            <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {session.resource_pattern}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        session.status
                      )}`}
                    >
                      {getStatusIcon(session.status)}
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatTimeRemaining(session.expires_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign size={14} />
                      {Number(session.remaining_amount).toFixed(2)} remaining
                    </div>
                  </div>
                </div>
                {session.status === 'active' && (
                  <button
                    onClick={() => handleRevokeSession(session.session_token)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                  >
                    <Trash2 size={18} className="text-gray-400 group-hover:text-red-500" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Authorized</div>
                  <div className="font-semibold text-gray-900">
                    ${Number(session.authorized_amount).toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Spent</div>
                  <div className="font-semibold text-gray-900">
                    ${Number(session.spent_amount).toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Remaining</div>
                  <div className="font-semibold text-gray-900">
                    ${Number(session.remaining_amount).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div>
                  Created: {new Date(session.created_at).toLocaleDateString()}
                </div>
                {session.last_used_at && (
                  <div>
                    Last used: {new Date(session.last_used_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              {session.auto_renew && (
                <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  <RefreshCw size={12} />
                  Auto-renew enabled (${Number(session.renewal_amount).toFixed(2)})
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
