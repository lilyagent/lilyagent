import { useState } from 'react';
import { DollarSign, ArrowRight, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { solanaPaymentService } from '../services/solanaPayment';
import { validateAndCreateWallet } from '../utils/walletValidation';
import { useWallet } from '../hooks/useWallet';

interface PaymentFlowProps {
  agentName: string;
  costUsdc: number;
  onPaymentComplete: (signature: string) => void;
  onCancel: () => void;
  recipientAddress?: string;
}

type PaymentStep = 'review' | 'creating' | 'signing' | 'verifying' | 'complete' | 'error';

export default function PaymentFlow({ agentName, costUsdc, onPaymentComplete, onCancel, recipientAddress }: PaymentFlowProps) {
  const { connected, publicKey, walletProvider } = useWallet();
  const [step, setStep] = useState<PaymentStep>('review');
  const [transactionSignature, setTransactionSignature] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmationCount, setConfirmationCount] = useState(0);

  const initiatePayment = async () => {
    setStep('creating');
    setErrorMessage('');

    try {
      // Validate wallet and create adapter
      const walletResult = validateAndCreateWallet(connected, publicKey, walletProvider);

      if (walletResult.error) {
        throw new Error(walletResult.error);
      }

      const wallet = walletResult.wallet;

      setStep('signing');

      console.log('Creating payment transaction...');
      console.log('Wallet address:', publicKey);
      console.log('USD Amount:', costUsdc);

      // Service now handles USD to SOL conversion automatically
      const paymentResult = await solanaPaymentService.createPaymentTransaction(
        wallet,
        costUsdc // Pass USD amount directly
      );

      console.log('Payment result:', paymentResult);
      console.log('SOL amount charged:', paymentResult.solAmount);
      console.log('Conversion rate:', paymentResult.conversionRate);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      if (!paymentResult.signature) {
        throw new Error('No transaction signature returned');
      }

      setTransactionSignature(paymentResult.signature);
      setStep('verifying');

      // Wait for confirmations
      for (let i = 1; i <= 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setConfirmationCount(i);
      }

      setStep('complete');

      // Give user time to see success message before closing
      setTimeout(() => {
        onPaymentComplete(paymentResult.signature!);
      }, 1500);

    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMessage(err.message || 'Payment failed. Please try again.');
      setStep('error');
    }
  };

  const retryPayment = () => {
    setStep('review');
    setTransactionSignature('');
    setErrorMessage('');
    setConfirmationCount(0);
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'review', label: 'Review' },
      { id: 'creating', label: 'Create' },
      { id: 'signing', label: 'Sign' },
      { id: 'verifying', label: 'Verify' },
      { id: 'complete', label: 'Complete' },
    ];

    const currentIndex = steps.findIndex(s => s.id === step);

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, index) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  index < currentIndex
                    ? 'bg-success-500 text-white'
                    : index === currentIndex
                    ? 'bg-primary-500 text-white animate-pulse'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index < currentIndex ? <CheckCircle size={16} /> : index + 1}
              </div>
              <div className="text-xs mt-2 text-gray-600">{s.label}</div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-[2px] flex-1 transition-all ${
                  index < currentIndex ? 'bg-success-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-[100] p-4">
      <div className="bg-white border border-gray-200 rounded-xl max-w-lg w-full p-8 animate-slideUp shadow-2xl">
        {step !== 'error' && renderStepIndicator()}

        {step === 'review' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Payment</h2>

            {!connected && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  Wallet not connected. Please connect your wallet to continue with payment.
                </p>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Agent</div>
                  <div className="font-medium text-gray-900">{agentName}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Cost</div>
                  <div className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                    <DollarSign size={20} />
                    {costUsdc.toFixed(4)}
                  </div>
                  <div className="text-xs text-gray-500">USDC</div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Network Fee</span>
                  <span className="text-gray-900">~$0.0001</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">${(costUsdc + 0.0001).toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700 leading-relaxed">
                You'll be prompted to approve this transaction in your wallet. The payment will be sent
                instantly via Solana mainnet.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={initiatePayment}
                disabled={!connected}
                className="flex-1 px-6 py-3 bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                Pay Now
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}

        {step === 'creating' && (
          <div className="text-center py-8">
            <Loader2 size={48} className="animate-spin mx-auto mb-4 text-primary-500" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Creating Transaction</h3>
            <p className="text-gray-600">Preparing payment on Solana...</p>
          </div>
        )}

        {step === 'signing' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <DollarSign size={32} className="text-primary-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Approve in Wallet</h3>
            <p className="text-gray-600">Please approve the transaction in your wallet</p>
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Check your wallet extension for a signature request
              </p>
            </div>
          </div>
        )}

        {step === 'verifying' && (
          <div className="text-center py-8">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
              <div className="absolute inset-0 border-4 border-t-primary-500 rounded-full animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment</h3>
            <p className="text-gray-600 mb-4">Confirming transaction on Solana blockchain</p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Confirmations</span>
                <span className="font-mono font-bold text-gray-900">{confirmationCount}/3</span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-success-500 transition-all duration-500"
                  style={{ width: `${(confirmationCount / 3) * 100}%` }}
                />
              </div>
            </div>

            {transactionSignature && (
              <div className="text-xs text-gray-500 font-mono break-all">
                {transactionSignature.slice(0, 16)}...
              </div>
            )}
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-success-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
            <p className="text-gray-600 mb-6">Your agent is now executing</p>

            {transactionSignature && (
              <a
                href={solanaPaymentService.getExplorerUrl(transactionSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 transition-colors font-medium"
              >
                View on Explorer
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h3>
            <p className="text-gray-600 mb-6">{errorMessage}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={retryPayment}
                className="flex-1 px-6 py-3 bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
