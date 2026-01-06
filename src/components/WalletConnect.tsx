import { useState, useEffect } from 'react';
import { Wallet, Check, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WalletConnectProps {
  onConnect: (walletAddress: string, walletType: string) => void;
  onDisconnect: () => void;
  isConnected: boolean;
  currentAddress?: string;
}

interface SolanaWallet {
  publicKey: { toString: () => string };
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
}

declare global {
  interface Window {
    solana?: SolanaWallet & { isPhantom?: boolean };
    solflare?: SolanaWallet;
    backpack?: SolanaWallet;
  }
}

const SUPPORTED_WALLETS = [
  { id: 'phantom', name: 'PHANTOM', property: 'solana', isPhantom: true },
  { id: 'metamask', name: 'METAMASK', property: 'ethereum' },
];

export default function WalletConnect({ onConnect, onDisconnect, isConnected, currentAddress }: WalletConnectProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installedWallets, setInstalledWallets] = useState<string[]>([]);

  useEffect(() => {
    const checkInstalledWallets = () => {
      const installed: string[] = [];
      if (window.solana?.isPhantom) {
        installed.push('phantom');
      }
      if ((window as any).ethereum) {
        installed.push('metamask');
      }
      setInstalledWallets(installed);
    };

    checkInstalledWallets();
    window.addEventListener('load', checkInstalledWallets);
    return () => window.removeEventListener('load', checkInstalledWallets);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const connectWallet = async (walletId: string) => {
    setConnecting(walletId);
    setError(null);

    try {
      const wallet = SUPPORTED_WALLETS.find(w => w.id === walletId);
      if (!wallet) throw new Error('Wallet not found');

      const walletObj = window[wallet.property as keyof Window] as SolanaWallet | undefined;
      if (!walletObj) {
        throw new Error(`${wallet.name} is not installed. Please install it first.`);
      }

      await walletObj.connect();
      const address = walletObj.publicKey.toString();

      const { error: dbError } = await supabase
        .from('user_wallets')
        .upsert({
          wallet_address: address,
          wallet_type: walletId,
          last_connected: new Date().toISOString(),
          is_active: true,
        }, {
          onConflict: 'wallet_address'
        });

      if (dbError) throw dbError;

      const { error: onboardingError } = await supabase
        .from('user_onboarding')
        .upsert({
          wallet_address: address,
          has_connected_wallet: true,
          onboarding_step: 2,
        }, {
          onConflict: 'wallet_address'
        });

      if (onboardingError) console.error('Onboarding update failed:', onboardingError);

      onConnect(address, walletId);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(null);
    }
  };

  const disconnect = async () => {
    try {
      if (window.solana) await window.solana.disconnect();
      if ((window as any).ethereum) await (window as any).ethereum.disconnect?.();

      if (currentAddress) {
        await supabase
          .from('user_wallets')
          .update({ is_active: false })
          .eq('wallet_address', currentAddress);
      }

      onDisconnect();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (isConnected && currentAddress) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-black/60 border border-lily-stem/30 px-4 py-2 rounded-lily">
          <div className="w-2 h-2 bg-lily-stem rounded-full animate-pulse" />
          <span className="text-sm font-mono">{formatAddress(currentAddress)}</span>
        </div>
        <button
          onClick={disconnect}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-xs font-medium tracking-wider text-white bg-lily-stem/10 hover:bg-lily-stem/20 transition-all duration-300 border border-lily-stem/50 hover:border-lily-stem px-4 py-2 rounded-lily"
      >
        CONNECT
      </button>

      {isModalOpen && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            margin: 0,
            width: '100vw',
            height: '100vh',
          }}
        >
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
            style={{ zIndex: 9998 }}
          />

          <div
            className="relative bg-black/95 backdrop-blur-md border border-gray-800/50 rounded-lily max-w-md w-full shadow-2xl"
            style={{ zIndex: 9999 }}
          >
            <div className="p-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
              >
                <X size={24} />
              </button>

              <h2 className="text-center text-sm font-bold tracking-[0.2em] mb-8 uppercase">
                CONNECT A WALLET ON SOLANA TO CONTINUE
              </h2>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                {SUPPORTED_WALLETS.map(wallet => {
                  const isInstalled = installedWallets.includes(wallet.id);
                  const isConnecting = connecting === wallet.id;

                  return (
                    <button
                      key={wallet.id}
                      onClick={() => isInstalled && connectWallet(wallet.id)}
                      disabled={!isInstalled || isConnecting}
                      className={`w-full flex items-center justify-between p-5 rounded-lily transition-all duration-300 ${
                        isInstalled
                          ? 'bg-black/40 hover:bg-black/60 border border-gray-800/50 hover:border-lily-stem/50'
                          : 'bg-black/20 border border-gray-800/30 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lily flex items-center justify-center ${
                          wallet.id === 'phantom' ? 'bg-lily-bloom' : 'bg-lily-warning'
                        }`}>
                          <Wallet size={20} />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-sm tracking-wider">{wallet.name}</div>
                          {!isInstalled && (
                            <div className="text-xs text-gray-500 mt-0.5">Not installed</div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-bold tracking-wider text-lily-stem">
                        {isConnecting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : isInstalled ? (
                          'DETECTED'
                        ) : (
                          <span className="text-gray-600">NOT DETECTED</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
