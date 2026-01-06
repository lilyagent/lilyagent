import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LilyFlowers from '../components/LilyFlowers';

interface ContractAddress {
  id: string;
  name: string;
  address: string;
  blockchain: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  address: string;
  blockchain: string;
  is_active: boolean;
  display_order: number;
}

export default function ContractAdmin() {
  const [contracts, setContracts] = useState<ContractAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    blockchain: 'Solana',
    is_active: true,
    display_order: 0,
  });

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

  const handleAdd = async () => {
    try {
      setError(null);

      if (!formData.name || !formData.address) {
        setError('Name and address are required');
        return;
      }

      const { error: insertError } = await supabase
        .from('contract_addresses')
        .insert([formData]);

      if (insertError) throw insertError;

      await fetchContracts();
      setShowAddForm(false);
      resetForm();
    } catch (err: any) {
      console.error('Error adding contract:', err);
      setError(err.message || 'Failed to add contract address');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      setError(null);

      const contractToUpdate = contracts.find((c) => c.id === id);
      if (!contractToUpdate) return;

      const { error: updateError } = await supabase
        .from('contract_addresses')
        .update({
          name: contractToUpdate.name,
          address: contractToUpdate.address,
          blockchain: contractToUpdate.blockchain,
          is_active: contractToUpdate.is_active,
          display_order: contractToUpdate.display_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchContracts();
      setEditingId(null);
    } catch (err: any) {
      console.error('Error updating contract:', err);
      setError(err.message || 'Failed to update contract address');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract address?')) {
      return;
    }

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('contract_addresses')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchContracts();
    } catch (err: any) {
      console.error('Error deleting contract:', err);
      setError(err.message || 'Failed to delete contract address');
    }
  };

  const updateContractField = (id: string, field: keyof ContractAddress, value: any) => {
    setContracts(
      contracts.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      blockchain: 'Solana',
      is_active: true,
      display_order: 0,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-20 px-6">
        <LilyFlowers />
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-800 rounded w-64"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 px-6">
      <LilyFlowers />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Contract Address Management</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 hover:bg-gray-200 transition-colors duration-200"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Cancel' : 'Add Contract'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="mb-8 p-6 bg-gray-900/50 border border-gray-800 rounded">
            <h2 className="text-lg font-semibold text-white mb-4">Add New Contract</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Platform Contract"
                  className="w-full bg-black border border-gray-800 text-white px-4 py-2 focus:outline-none focus:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                  Blockchain
                </label>
                <select
                  value={formData.blockchain}
                  onChange={(e) => setFormData({ ...formData, blockchain: e.target.value })}
                  className="w-full bg-black border border-gray-800 text-white px-4 py-2 focus:outline-none focus:border-gray-600"
                >
                  <option value="Solana">Solana</option>
                  <option value="Ethereum">Ethereum</option>
                  <option value="Polygon">Polygon</option>
                  <option value="Binance Smart Chain">Binance Smart Chain</option>
                  <option value="Avalanche">Avalanche</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                  Contract Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter contract address"
                  className="w-full bg-black border border-gray-800 text-white px-4 py-2 font-mono focus:outline-none focus:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-black border border-gray-800 text-white px-4 py-2 focus:outline-none focus:border-gray-600"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-white">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-6 py-2 bg-white text-black hover:bg-gray-200 transition-colors duration-200"
              >
                Add Contract
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {contracts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No contract addresses found. Add one to get started.
            </div>
          ) : (
            contracts.map((contract) => (
              <div
                key={contract.id}
                className="p-6 bg-gray-900/50 border border-gray-800 rounded"
              >
                {editingId === contract.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                          Name
                        </label>
                        <input
                          type="text"
                          value={contract.name}
                          onChange={(e) =>
                            updateContractField(contract.id, 'name', e.target.value)
                          }
                          className="w-full bg-black border border-gray-800 text-white px-4 py-2 focus:outline-none focus:border-gray-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                          Blockchain
                        </label>
                        <select
                          value={contract.blockchain}
                          onChange={(e) =>
                            updateContractField(contract.id, 'blockchain', e.target.value)
                          }
                          className="w-full bg-black border border-gray-800 text-white px-4 py-2 focus:outline-none focus:border-gray-600"
                        >
                          <option value="Solana">Solana</option>
                          <option value="Ethereum">Ethereum</option>
                          <option value="Polygon">Polygon</option>
                          <option value="Binance Smart Chain">Binance Smart Chain</option>
                          <option value="Avalanche">Avalanche</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                          Contract Address
                        </label>
                        <input
                          type="text"
                          value={contract.address}
                          onChange={(e) =>
                            updateContractField(contract.id, 'address', e.target.value)
                          }
                          className="w-full bg-black border border-gray-800 text-white px-4 py-2 font-mono focus:outline-none focus:border-gray-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={contract.display_order}
                          onChange={(e) =>
                            updateContractField(
                              contract.id,
                              'display_order',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-full bg-black border border-gray-800 text-white px-4 py-2 focus:outline-none focus:border-gray-600"
                        />
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contract.is_active}
                            onChange={(e) =>
                              updateContractField(contract.id, 'is_active', e.target.checked)
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-white">Active</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                      <button
                        onClick={() => {
                          setEditingId(null);
                          fetchContracts();
                        }}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdate(contract.id)}
                        className="flex items-center gap-2 px-6 py-2 bg-white text-black hover:bg-gray-200 transition-colors duration-200"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{contract.name}</h3>
                          {contract.is_active ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-500/20 text-gray-500 text-xs rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {contract.blockchain} • Order: {contract.display_order}
                        </p>
                        <code className="text-sm text-gray-400 font-mono break-all">
                          {contract.address}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setEditingId(contract.id)}
                          className="p-2 text-gray-400 hover:text-white transition-colors duration-200"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contract.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      Updated: {new Date(contract.updated_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
