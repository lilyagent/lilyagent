import { useState, useEffect, useCallback } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { walletManager, WalletState } from '../services/walletManager';

const getHeliusEndpoint = () => {
  const apiKey = import.meta.env.VITE_HELIUS_API_KEY;
  return apiKey ? `https://mainnet.helius-rpc.com/?api-key=${apiKey}` : 'https://api.mainnet-beta.solana.com';
};

export function useWallet() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('solana');

  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    balance: null,
    connecting: false,
    error: null
  });

  const updateBalance = useCallback(async () => {
    if (isConnected && address) {
      try {
        const connection = new Connection(getHeliusEndpoint(), 'confirmed');
        const publicKey = new PublicKey(address);
        const balance = await connection.getBalance(publicKey);
        const balanceInSol = balance / LAMPORTS_PER_SOL;
        setState(prev => ({ ...prev, balance: balanceInSol, error: null }));
      } catch (error: any) {
        console.error('Failed to update balance:', error);
        setState(prev => ({ ...prev, error: error.message }));
      }
    }
  }, [isConnected, address]);

  const connect = useCallback(async (onlyIfTrusted: boolean = false) => {
    console.log('Connect called, but using Reown AppKit modal instead');
    return isConnected;
  }, [isConnected]);

  const disconnect = useCallback(async () => {
    console.log('Disconnect called, use Reown AppKit disconnect');
  }, []);

  const refreshBalance = useCallback(async () => {
    await updateBalance();
  }, [updateBalance]);

  useEffect(() => {
    if (isConnected && address) {
      setState(prev => ({
        ...prev,
        connected: true,
        publicKey: address,
        error: null
      }));
      updateBalance();
    } else {
      setState({
        connected: false,
        publicKey: null,
        balance: null,
        connecting: false,
        error: null
      });
    }
  }, [isConnected, address, updateBalance]);

  return {
    ...state,
    connect,
    disconnect,
    refreshBalance,
    manager: walletManager,
    walletProvider
  };
}
