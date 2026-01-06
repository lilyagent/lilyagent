import { useWallet } from '../hooks/useWallet';
import { safeTransfer } from '../utils/transactionUtils';
import { useState } from 'react';
import { Loader2, Wallet, CheckCircle, XCircle } from 'lucide-react';

export default function WalletUsageExample() {
  const { connected, publicKey, balance, connecting, error, connect, disconnect, refreshBalance, manager } = useWallet();
  const [transferStatus, setTransferStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [transferMessage, setTransferMessage] = useState('');

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleTransfer = async () => {
    if (!manager.getWallet() || !manager.getConnection()) {
      setTransferStatus('error');
      setTransferMessage('Wallet or connection not initialized');
      return;
    }

    setTransferStatus('processing');
    setTransferMessage('Processing transaction...');

    try {
      const result = await safeTransfer(
        manager.getWallet()!,
        manager.getConnection()!,
        'FbRDjtZRRtLmjok6NvzsxSey4gDAoTmr8RacPiaRZEWX',
        0.001,
        { commitment: 'confirmed' }
      );

      if (result.success) {
        setTransferStatus('success');
        setTransferMessage(`Transaction successful! Signature: ${result.signature}`);
        await refreshBalance();
      } else {
        setTransferStatus('error');
        setTransferMessage(result.error || 'Transaction failed');
      }
    } catch (error: any) {
      setTransferStatus('error');
      setTransferMessage(error.message || 'An error occurred');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Wallet Connection Example</h2>

        {!connected ? (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {connecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                <span>Connect Wallet</span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Public Key</span>
                <span className="text-xs font-mono text-gray-900">
                  {publicKey ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}` : 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Balance</span>
                <span className="text-sm font-medium text-gray-900">
                  {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">RPC Endpoint</span>
                <span className="text-xs font-mono text-gray-500">
                  {manager.getCurrentRpcEndpoint().split('//')[1]?.split('/')[0] || 'Unknown'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={refreshBalance}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors text-sm font-medium"
              >
                Refresh Balance
              </button>
              <button
                onClick={handleDisconnect}
                className="flex-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm font-medium"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Connection Error</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {connected && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Test Transaction</h3>

          <p className="text-sm text-gray-600 mb-4">
            Send 0.001 SOL to test the transaction system. This demonstrates safe transaction handling with proper error management.
          </p>

          <button
            onClick={handleTransfer}
            disabled={transferStatus === 'processing'}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {transferStatus === 'processing' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Send Test Transaction</span>
            )}
          </button>

          {transferMessage && (
            <div className={`mt-4 rounded-lg p-4 flex items-start gap-3 ${
              transferStatus === 'success'
                ? 'bg-green-50 border border-green-200'
                : transferStatus === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              {transferStatus === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : transferStatus === 'error' ? (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  transferStatus === 'success'
                    ? 'text-green-900'
                    : transferStatus === 'error'
                    ? 'text-red-900'
                    : 'text-blue-900'
                }`}>
                  {transferStatus === 'success' ? 'Success' : transferStatus === 'error' ? 'Error' : 'Processing'}
                </p>
                <p className={`text-xs mt-1 break-all ${
                  transferStatus === 'success'
                    ? 'text-green-700'
                    : transferStatus === 'error'
                    ? 'text-red-700'
                    : 'text-blue-700'
                }`}>
                  {transferMessage}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-bold mb-3">Usage Guide</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <p><strong className="text-gray-900">Import:</strong> <code className="bg-white px-2 py-1 rounded">import {'{ useWallet }'} from './hooks/useWallet';</code></p>
          <p><strong className="text-gray-900">Connect:</strong> Call <code className="bg-white px-2 py-1 rounded">connect()</code> to initiate wallet connection</p>
          <p><strong className="text-gray-900">Balance:</strong> Access via <code className="bg-white px-2 py-1 rounded">balance</code> (auto-updates on events)</p>
          <p><strong className="text-gray-900">Transactions:</strong> Use <code className="bg-white px-2 py-1 rounded">safeTransfer()</code> for safe SOL transfers</p>
          <p><strong className="text-gray-900">Diagnostics:</strong> Visit <code className="bg-white px-2 py-1 rounded">/diagnostics</code> for troubleshooting</p>
        </div>
      </div>
    </div>
  );
}
