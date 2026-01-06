import { PublicKey } from '@solana/web3.js';
import { SolanaWallet } from '../services/walletManager';

export interface WalletValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    hasProvider: boolean;
    hasPublicKey: boolean;
    hasSignMethod: boolean;
    isConnected: boolean;
    publicKey?: string;
  };
}

export class WalletValidator {
  static validateWalletState(
    connected: boolean,
    publicKey: string | null,
    walletProvider: any
  ): WalletValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const hasProvider = !!walletProvider;
    const hasPublicKey = !!publicKey;
    const hasSignMethod = !!(walletProvider?.signTransaction);
    const isConnected = connected && hasProvider && hasPublicKey;

    if (!connected) {
      errors.push('Wallet is not connected');
    }

    if (!hasProvider) {
      errors.push('Wallet provider not found');
      warnings.push('Make sure you have a Solana wallet extension installed');
    }

    if (!hasPublicKey) {
      errors.push('Wallet public key not available');
      warnings.push('Try disconnecting and reconnecting your wallet');
    }

    if (hasProvider && !hasSignMethod) {
      errors.push('Wallet does not support transaction signing');
      warnings.push('Your wallet may not be compatible');
    }

    // Validate public key format if present
    if (hasPublicKey && publicKey) {
      try {
        new PublicKey(publicKey);
      } catch (e) {
        errors.push('Invalid public key format');
      }
    }

    return {
      isValid: errors.length === 0 && isConnected,
      errors,
      warnings,
      details: {
        hasProvider,
        hasPublicKey,
        hasSignMethod,
        isConnected,
        publicKey: publicKey || undefined
      }
    };
  }

  static validateWalletObject(wallet: SolanaWallet): WalletValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!wallet) {
      errors.push('Wallet object is null or undefined');
      return {
        isValid: false,
        errors,
        warnings,
        details: {
          hasProvider: false,
          hasPublicKey: false,
          hasSignMethod: false,
          isConnected: false
        }
      };
    }

    const hasPublicKey = !!wallet.publicKey;
    const hasSignMethod = typeof wallet.signTransaction === 'function';
    const isConnected = wallet.isConnected === true;

    if (!hasPublicKey) {
      errors.push('Wallet public key missing');
    }

    if (!hasSignMethod) {
      errors.push('Wallet signTransaction method missing');
    }

    if (!isConnected) {
      errors.push('Wallet isConnected flag is false');
      warnings.push('Wallet may be disconnected');
    }

    if (isConnected && !hasPublicKey) {
      warnings.push('Wallet shows connected but no public key available');
    }

    return {
      isValid: errors.length === 0 && isConnected && hasPublicKey && hasSignMethod,
      errors,
      warnings,
      details: {
        hasProvider: true,
        hasPublicKey,
        hasSignMethod,
        isConnected,
        publicKey: hasPublicKey ? wallet.publicKey.toBase58() : undefined
      }
    };
  }

  static createWalletAdapter(
    publicKey: string,
    walletProvider: any
  ): { wallet: SolanaWallet; validation: WalletValidationResult } | { error: string } {
    // Validate inputs
    if (!publicKey) {
      return { error: 'Public key is required' };
    }

    if (!walletProvider) {
      return { error: 'Wallet provider is required' };
    }

    if (!walletProvider.signTransaction) {
      return { error: 'Wallet provider does not support transaction signing' };
    }

    try {
      const walletPublicKey = new PublicKey(publicKey);

      const wallet: SolanaWallet = {
        publicKey: walletPublicKey,
        isConnected: true,
        signTransaction: async (transaction) => {
          if (!walletProvider.signTransaction) {
            throw new Error('Wallet does not support transaction signing');
          }
          return await walletProvider.signTransaction(transaction);
        },
        signAllTransactions: walletProvider.signAllTransactions
          ? async (transactions) => await walletProvider.signAllTransactions!(transactions)
          : undefined,
        connect: async () => ({ publicKey: walletPublicKey }),
        disconnect: async () => {},
      };

      const validation = this.validateWalletObject(wallet);

      return { wallet, validation };
    } catch (error: any) {
      return { error: `Failed to create wallet adapter: ${error.message}` };
    }
  }

  static getErrorMessage(validation: WalletValidationResult): string {
    if (validation.isValid) {
      return '';
    }

    if (validation.errors.length > 0) {
      return validation.errors[0];
    }

    return 'Wallet validation failed';
  }

  static getDetailedErrorMessage(validation: WalletValidationResult): string {
    const parts: string[] = [];

    if (validation.errors.length > 0) {
      parts.push('Errors:');
      validation.errors.forEach(error => parts.push(`  - ${error}`));
    }

    if (validation.warnings.length > 0) {
      parts.push('Warnings:');
      validation.warnings.forEach(warning => parts.push(`  - ${warning}`));
    }

    if (parts.length === 0) {
      return 'Wallet is valid';
    }

    return parts.join('\n');
  }

  static async testWalletConnectivity(wallet: SolanaWallet): Promise<{
    success: boolean;
    canSign: boolean;
    error?: string;
  }> {
    try {
      if (!wallet || !wallet.publicKey) {
        return {
          success: false,
          canSign: false,
          error: 'Wallet or public key missing'
        };
      }

      const canSign = typeof wallet.signTransaction === 'function';

      return {
        success: true,
        canSign,
        error: canSign ? undefined : 'Wallet cannot sign transactions'
      };
    } catch (error: any) {
      return {
        success: false,
        canSign: false,
        error: error.message
      };
    }
  }
}

export const walletValidator = new WalletValidator();

// Helper function for common validation pattern
export function validateAndCreateWallet(
  connected: boolean,
  publicKey: string | null,
  walletProvider: any
): { wallet: SolanaWallet; error?: undefined } | { wallet?: undefined; error: string } {
  // First validate state
  const stateValidation = WalletValidator.validateWalletState(connected, publicKey, walletProvider);

  if (!stateValidation.isValid) {
    return {
      error: WalletValidator.getErrorMessage(stateValidation)
    };
  }

  // Create wallet adapter
  const result = WalletValidator.createWalletAdapter(publicKey!, walletProvider);

  if ('error' in result) {
    return { error: result.error };
  }

  if (!result.validation.isValid) {
    return {
      error: WalletValidator.getErrorMessage(result.validation)
    };
  }

  return { wallet: result.wallet };
}
