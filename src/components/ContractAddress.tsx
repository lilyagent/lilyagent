import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ContractAddressData {
  id: string;
  name: string;
  address: string;
  blockchain: string;
  is_active: boolean;
  display_order: number;
}

export default function ContractAddress() {
  const [contracts, setContracts] = useState<ContractAddressData[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('contract_addresses')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      setContracts(data || []);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError('Failed to load contract addresses');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (address: string, id: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const getExplorerUrl = (address: string, blockchain: string) => {
    switch (blockchain.toLowerCase()) {
      case 'solana':
        return `https://explorer.solana.com/address/${address}`;
      case 'ethereum':
        return `https://etherscan.io/address/${address}`;
      case 'polygon':
        return `https://polygonscan.com/address/${address}`;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (contracts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {contracts.map((contract) => {
        const explorerUrl = getExplorerUrl(contract.address, contract.blockchain);

        return (
          <div key={contract.id}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {contract.name}
              </span>
              <span className="text-xs text-gray-400 uppercase">
                {contract.blockchain}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-4 py-3">
              <code className="flex-1 text-sm text-gray-700 font-mono">
                {formatAddress(contract.address)}
              </code>

              <button
                onClick={() => copyToClipboard(contract.address, contract.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy address"
              >
                {copiedId === contract.id ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
