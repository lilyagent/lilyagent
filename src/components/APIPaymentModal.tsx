import { useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, ExternalLink, DollarSign } from 'lucide-react';
import { solanaPaymentService } from '../services/solanaPayment';
import { validateAndCreateWallet } from '../utils/walletValidation';
import { useWallet } from '../hooks/useWallet';
import { supabase } from '../lib/supabase';

interface APIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiId: string;
  apiName: string;
  paymentType: 'subscription' | 'pay_per_call' | 'prepaid_credits';
  amount: number; // USD amount
  description: string;
  onPaymentComplete: (signature: string) => void;
}

type PaymentStep = 'review' | 'processing' | 'success' | 'error';

export default function APIPaymentModal({
  isOpen,
  onClose,
  apiId,
  apiName,
  paymentType,
  amount,
  description,
  onPaymentComplete
}: APIPaymentModalProps) {
  const { connected, publicKey, walletProvider } = useWallet();
  const [step, setStep] = useState<PaymentStep>('review');
  const [transactionSignature, setTransactionSignature] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [solAmount, setSolAmount] = useState<number>(0);
  const [conversionRate, setConversionRate] = useState<number>(0);

  if (!isOpen) return null;

  const handlePayment = async () => {
    if (!connected || !publicKey) {
      setErrorMessage('Please connect your wallet first');
      setStep('error');
      return;
    }

    setStep('processing');
    setErrorMessage('');

    try {
      console.log('[APIPayment] Validating wallet...');
      const walletResult = validateAndCreateWallet(connected, publicKey, walletProvider);

      if (walletResult.error) {
        throw new Error(walletResult.error);
      }

      console.log('[APIPayment] Creating payment for', amount, 'USD');

      const paymentResult = await solanaPaymentService.createPaymentTransaction(
        walletResult.wallet,
        amount,
        'other'
      );

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      console.log('[APIPayment] Payment successful:', paymentResult.signature);
      console.log('[APIPayment] SOL charged:', paymentResult.solAmount);

      setTransactionSignature(paymentResult.signature!);
      setSolAmount(paymentResult.solAmount!);
      setConversionRate(paymentResult.conversionRate!);

      // Record the payment in database
      await recordPayment(
        paymentResult.signature!,
        paymentResult.solAmount!,
        paymentResult.usdAmount!
      );

      setStep('success');

      // Notify parent
      setTimeout(() => {
        onPaymentComplete(paymentResult.signature!);
      }, 1500);
    } catch (error: any) {
      console.error('[APIPayment] Payment error:', error);
      setErrorMessage(error.message || 'An unexpected error occurred');
      setStep('error');
    }
  };

  const recordPayment = async (signature: string, solAmount: number, usdAmount: number) => {
    try {
      const paymentRecord: any = {
        api_id: apiId,
        user_wallet_address: publicKey,
        transaction_signature: signature,
        amount_sol: solAmount,
        amount_usd: usdAmount,
        payment_type: paymentType,
        status: 'completed',
      };

      // Store in appropriate table based on payment type
      if (paymentType === 'subscription') {
        await supabase.from('api_subscriptions').insert({
          api_id: apiId,
          user_wallet_address: publicKey,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          last_payment_tx: signature,
        });
      }

      // Log the API call/payment
      await supabase.from('api_calls').insert({
        api_id: apiId,
        endpoint_path: '/payment',
        method: 'POST',
        status_code: 200,
        response_time_ms: 0,
        cost_usdc: usdAmount,
      });

      console.log('[APIPayment] Payment recorded in database');
    } catch (error) {
      console.error('[APIPayment] Error recording payment:', error);
    }
  };

  const handleClose = () => {
    if (step !== 'processing') {
      setStep('review');
      setTransactionSignature('');
      setErrorMessage('');
      onClose();
    }
  };

  const renderReviewStep = () => (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Confirm Payment</h2>
          <p className="text-sm text-gray-600">Review your purchase details</p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
        >
          <X size={22} />
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <DollarSign size={24} className="text-primary-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600">Purchasing access to</div>
              <div className="font-semibold text-gray-900">{apiName}</div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">{description}</span>
              <span className="font-medium text-gray-900">${amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Network Fee</span>
              <span className="font-medium text-gray-900">~$0.01</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
              <span className="text-gray-900 font-semibold">Total (USD)</span>
              <span className="text-gray-900 font-semibold text-xl">${amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <div className="text-blue-600 flex-shrink-0 mt-0.5">
            <AlertCircle size={18} />
          </div>
          <div className="text-sm text-blue-800">
            <strong>Note:</strong> Payment will be processed in SOL at current market rate. You'll see the exact SOL amount in your wallet confirmation.
          </div>
        </div>

        {!connected && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">Connect your wallet to continue with payment</p>
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={!connected}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          Proceed to Payment
        </button>
      </div>
    </>
  );

  const renderProcessingStep = () => (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Processing Payment</h2>
          <p className="text-sm text-gray-600">Please confirm in your wallet</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 space-y-5">
          <Loader2 size={48} className="animate-spin text-primary-500" />
          <div className="text-center">
            <p className="text-gray-900 font-medium mb-2">Awaiting wallet confirmation...</p>
            <p className="text-sm text-gray-600">
              Please check your wallet to approve the transaction
            </p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Amount (USD)</span>
            <span className="text-gray-900 font-medium">${amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </>
  );

  const renderSuccessStep = () => (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Payment Successful</h2>
          <p className="text-sm text-gray-600">Your purchase is complete</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-success-500/20 rounded-full blur-xl"></div>
            <CheckCircle size={64} className="text-success-500 relative" />
          </div>
          <div className="text-center">
            <p className="text-gray-900 text-xl font-semibold mb-2">Payment Completed!</p>
            <p className="text-gray-600 text-sm">
              You can now access {apiName}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Amount Paid</span>
            <span className="text-gray-900 font-medium">${amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">SOL Charged</span>
            <span className="text-gray-900 font-medium">{solAmount.toFixed(6)} SOL</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Exchange Rate</span>
            <span className="text-gray-900 font-medium">${conversionRate.toFixed(2)}/SOL</span>
          </div>
        </div>

        {transactionSignature && (
          <a
            href={solanaPaymentService.getExplorerUrl(transactionSignature)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
          >
            View on Solana Explorer
            <ExternalLink size={16} />
          </a>
        )}

        <button
          onClick={handleClose}
          className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    </>
  );

  const renderErrorStep = () => (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Payment Failed</h2>
          <p className="text-sm text-gray-600">Unable to complete transaction</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-red-900 font-medium text-sm">Transaction Error</p>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setStep('review');
              setErrorMessage('');
            }}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleClose}
            className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );

  const renderStep = () => {
    switch (step) {
      case 'review':
        return renderReviewStep();
      case 'processing':
        return renderProcessingStep();
      case 'success':
        return renderSuccessStep();
      case 'error':
        return renderErrorStep();
      default:
        return renderReviewStep();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step === 'review' || step === 'success' || step === 'error' ? handleClose : undefined}
      />
      <div className="relative bg-white w-full max-w-xl rounded-xl shadow-2xl">
        <div className="p-8">{renderStep()}</div>
      </div>
    </div>
  );
}
