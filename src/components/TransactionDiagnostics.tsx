import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, X, ExternalLink } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { solanaPaymentService } from '../services/solanaPayment';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';

interface DiagnosticStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  details?: string;
}

export default function TransactionDiagnostics({ onClose }: { onClose: () => void }) {
  const { connected, publicKey, walletProvider, balance } = useWallet();
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<DiagnosticStep[]>([
    { name: 'Check Wallet Connection', status: 'pending' },
    { name: 'Check Balance', status: 'pending' },
    { name: 'Check RPC Connection', status: 'pending' },
    { name: 'Check Transaction Signing', status: 'pending' },
    { name: 'Test Transaction Creation', status: 'pending' },
  ]);

  const updateStep = (index: number, update: Partial<DiagnosticStep>) => {
    setSteps(prev => prev.map((step, i) => i === index ? { ...step, ...update } : step));
  };

  const runDiagnostics = async () => {
    setRunning(true);

    // Step 1: Check Wallet Connection
    updateStep(0, { status: 'running' });
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!connected || !publicKey || !walletProvider) {
      updateStep(0, {
        status: 'error',
        message: 'Wallet not connected',
        details: `Connected: ${connected}, PublicKey: ${!!publicKey}, Provider: ${!!walletProvider}`
      });
      setRunning(false);
      return;
    }

    updateStep(0, {
      status: 'success',
      message: 'Wallet connected',
      details: publicKey.slice(0, 8) + '...' + publicKey.slice(-8)
    });

    // Step 2: Check Balance
    updateStep(1, { status: 'running' });
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const walletBalance = balance || 0;
      if (walletBalance < 0.001) {
        updateStep(1, {
          status: 'error',
          message: 'Insufficient SOL for fees',
          details: `Balance: ${walletBalance.toFixed(6)} SOL (need at least 0.001 SOL)`
        });
      } else {
        updateStep(1, {
          status: 'success',
          message: `Balance: ${walletBalance.toFixed(6)} SOL`,
        });
      }
    } catch (error: any) {
      updateStep(1, {
        status: 'error',
        message: 'Failed to check balance',
        details: error.message
      });
    }

    // Step 3: Check RPC Connection
    updateStep(2, { status: 'running' });
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const connection = solanaPaymentService.getConnection();
      const version = await connection.getVersion();
      updateStep(2, {
        status: 'success',
        message: 'RPC connection working',
        details: `Solana version: ${version['solana-core']}`
      });
    } catch (error: any) {
      updateStep(2, {
        status: 'error',
        message: 'RPC connection failed',
        details: error.message
      });
      setRunning(false);
      return;
    }

    // Step 4: Check Transaction Signing
    updateStep(3, { status: 'running' });
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      if (!walletProvider.signTransaction) {
        updateStep(3, {
          status: 'error',
          message: 'Wallet does not support signing',
          details: 'signTransaction method not available'
        });
        setRunning(false);
        return;
      }

      updateStep(3, {
        status: 'success',
        message: 'Wallet signing capability confirmed',
        details: 'signTransaction method available'
      });
    } catch (error: any) {
      updateStep(3, {
        status: 'error',
        message: 'Signing check failed',
        details: error.message
      });
    }

    // Step 5: Test Transaction Creation
    updateStep(4, { status: 'running' });
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const connection = solanaPaymentService.getConnection();
      const { blockhash } = await connection.getLatestBlockhash('confirmed');

      const walletPublicKey = new PublicKey(publicKey);
      const testTransaction = new Transaction({
        feePayer: walletPublicKey,
        blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: walletPublicKey,
          toPubkey: walletPublicKey, // Send to self for testing
          lamports: 1, // Minimal amount
        })
      );

      updateStep(4, {
        status: 'success',
        message: 'Transaction creation successful',
        details: 'Can create and structure transactions properly'
      });
    } catch (error: any) {
      updateStep(4, {
        status: 'error',
        message: 'Transaction creation failed',
        details: error.message
      });
    }

    setRunning(false);
  };

  const getStatusIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 size={16} className="animate-spin text-primary-500" />;
      case 'success':
        return <CheckCircle size={16} className="text-success-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-[100] p-4">
      <div className="bg-white border border-gray-200 rounded-xl max-w-2xl w-full p-8 animate-slideUp shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Transaction Diagnostics</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-700">
            This diagnostic tool will check your wallet connection, balance, RPC connectivity, and transaction capabilities.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`p-4 border-2 rounded-lg transition-all ${
                step.status === 'running' ? 'border-primary-500 bg-primary-50' :
                step.status === 'success' ? 'border-success-500 bg-success-50' :
                step.status === 'error' ? 'border-red-500 bg-red-50' :
                'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getStatusIcon(step.status)}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{step.name}</div>
                  {step.message && (
                    <div className={`text-sm mt-1 ${
                      step.status === 'error' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {step.message}
                    </div>
                  )}
                  {step.details && (
                    <div className="text-xs text-gray-500 mt-1 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                      {step.details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={runDiagnostics}
            disabled={running}
            className="flex-1 px-6 py-3 bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            {running ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Running...
              </>
            ) : (
              'Run Diagnostics'
            )}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <div className="font-medium text-gray-900 mb-2">Debugging Tips:</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Ensure your wallet is connected via the "Connect Wallet" button</li>
              <li>Check that you have sufficient SOL for transaction fees (~0.001 SOL)</li>
              <li>Verify you're on Solana mainnet in your wallet settings</li>
              <li>Try disconnecting and reconnecting your wallet</li>
              <li>Check browser console (F12) for detailed error messages</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <span>Check network status:</span>
          <a
            href="https://status.solana.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-600 flex items-center gap-1"
          >
            status.solana.com
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
