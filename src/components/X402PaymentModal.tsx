import { useState, useEffect } from 'react';
import { DollarSign, Zap, Clock, Shield, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { X402Protocol } from '../services/x402Protocol';
import { X402CreditManager } from '../services/x402CreditManager';
import { validateAndCreateWallet } from '../utils/walletValidation';
import { useWallet } from '../hooks/useWallet';

interface X402PaymentModalProps {
  serviceId: string;
  serviceType: 'agent' | 'api' | 'web_service';
  serviceName: string;
  amount: number;
  onPaymentComplete: (sessionToken: string) => void;
  onCancel: () => void;
}

type PaymentMode = 'session' | 'credits' | 'direct';
type PaymentStep = 'choose' | 'session_setup' | 'credit_topup' | 'processing' | 'complete';

export default function X402PaymentModal({
  serviceId,
  serviceType,
  serviceName,
  amount,
  onPaymentComplete,
  onCancel
}: X402PaymentModalProps) {
  const { publicKey, connected, walletProvider } = useWallet();
  const [step, setStep] = useState<PaymentStep>('choose');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('session');
  const [sessionAmount, setSessionAmount] = useState<number>(amount * 10);
  const [sessionDuration, setSessionDuration] = useState<number>(24);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [customTopupAmount, setCustomTopupAmount] = useState<number>(0);

  useEffect(() => {
    if (connected && publicKey) {
      loadCreditBalance();
    }
  }, [connected, publicKey, serviceId]);

  const loadCreditBalance = async () => {
    if (!publicKey) return;
    const balance = await X402CreditManager.getCreditBalance(
      publicKey,
      serviceId,
      serviceType
    );
    setCreditBalance(balance);
  };

  const handleSessionPayment = async () => {
    if (!connected || !publicKey || !walletProvider) {
      setError('Wallet not connected. Please connect your wallet first.');
      return;
    }

    setLoading(true);
    setError('');
    setStep('processing');

    try {
      console.log('[X402] Starting session payment for', sessionAmount, 'USD');

      // Validate wallet and create adapter
      const walletResult = validateAndCreateWallet(connected, publicKey, walletProvider);

      if (walletResult.error) {
        throw new Error(walletResult.error);
      }

      const wallet = walletResult.wallet;

      // Create session with actual blockchain payment
      const result = await X402Protocol.createPaymentSession(
        wallet,
        publicKey,
        sessionAmount,
        `${serviceType}/${serviceId}/*`,
        sessionDuration,
        false,
        true // Execute payment (was false in demo mode)
      );

      if (!result.success || !result.sessionToken) {
        throw new Error(result.error || 'Failed to create payment session');
      }

      console.log('[X402] Session created with signature:', result.transactionSignature);

      setSessionToken(result.sessionToken);
      setStep('complete');

      setTimeout(() => {
        onPaymentComplete(result.sessionToken!);
      }, 2000);
    } catch (err: any) {
      console.error('[X402] Payment error:', err);
      setError(err.message);
      setStep('choose');
    } finally {
      setLoading(false);
    }
  };

  const handleCreditPayment = async () => {
    if (!connected || !publicKey || !walletProvider) {
      setError('Wallet not connected. Please connect your wallet first.');
      return;
    }

    setLoading(true);
    setError('');
    setStep('processing');

    try {
      console.log('[Credits] Spending credits for', amount, 'USD');

      const result = await X402CreditManager.spendCredits(
        publicKey,
        serviceId,
        serviceType,
        amount
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to spend credits');
      }

      console.log('[Credits] Credits spent, new balance:', result.newBalance);

      const walletResult = validateAndCreateWallet(connected, publicKey, walletProvider);
      if (walletResult.error) {
        throw new Error(walletResult.error);
      }

      const wallet = walletResult.wallet;

      const sessionResult = await X402Protocol.createPaymentSession(
        wallet,
        publicKey,
        amount,
        `${serviceType}/${serviceId}/*`,
        1,
        false,
        false
      );

      if (!sessionResult.success || !sessionResult.sessionToken) {
        throw new Error('Failed to create session');
      }

      setSessionToken(sessionResult.sessionToken);
      setCreditBalance(result.newBalance!);
      setStep('complete');

      setTimeout(() => {
        onPaymentComplete(sessionResult.sessionToken!);
      }, 2000);
    } catch (err: any) {
      console.error('[Credits] Payment error:', err);
      setError(err.message);
      setStep('choose');
    } finally {
      setLoading(false);
    }
  };

  const handleCreditTopUp = async (topUpAmount: number) => {
    if (!connected || !publicKey || !walletProvider) {
      setError('Wallet not connected. Please connect your wallet first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('[Credits] Topping up', topUpAmount, 'USD');

      const walletResult = validateAndCreateWallet(connected, publicKey, walletProvider);
      if (walletResult.error) {
        throw new Error(walletResult.error);
      }

      const wallet = walletResult.wallet;

      const result = await X402CreditManager.topUpCredits(
        wallet,
        serviceId,
        serviceType,
        topUpAmount
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to top up credits');
      }

      console.log('[Credits] Top-up successful, new balance:', result.newBalance);

      setCreditBalance(result.newBalance!);
      setError('');

      if (result.newBalance! >= amount) {
        await handleCreditPayment();
      } else {
        setStep('choose');
      }
    } catch (err: any) {
      console.error('[Credits] Top-up error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const renderChooseMode = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Choose Payment Method</h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-gray-600 mb-1">Service</div>
            <div className="font-medium text-gray-900">{serviceName}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Amount</div>
            <div className="text-xl font-bold text-gray-900 flex items-center gap-1">
              <DollarSign size={16} />
              {amount.toFixed(4)}
            </div>
            <div className="text-xs text-gray-500">USDC</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        <button
          onClick={() => {
            setPaymentMode('session');
            setStep('session_setup');
          }}
          className="w-full p-4 border-2 border-gray-200 hover:border-primary-500 rounded-lg transition-all text-left group"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center group-hover:bg-primary-100 transition-colors">
              <Zap size={20} className="text-primary-500" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 mb-1">Payment Session</div>
              <div className="text-sm text-gray-600">
                Preauthorize multiple payments for seamless recurring access
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            if (creditBalance >= amount) {
              handleCreditPayment();
            } else {
              setPaymentMode('credits');
              const shortfall = amount - creditBalance;
              setCustomTopupAmount(Math.ceil(shortfall));
              setStep('credit_topup');
            }
          }}
          className="w-full p-4 border-2 border-gray-200 hover:border-primary-500 rounded-lg transition-all text-left group"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center group-hover:bg-success-100 transition-colors">
              <DollarSign size={20} className="text-success-500" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                Credits
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                  Balance: ${creditBalance.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {creditBalance >= amount
                  ? 'Pay instantly with your credit balance'
                  : 'Top up credits for instant payments'}
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            All payments are secured by Solana blockchain. Your wallet will prompt you to approve
            any transactions.
          </p>
        </div>
      </div>
    </>
  );

  const renderSessionSetup = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Setup Payment Session</h2>
        <button
          onClick={() => setStep('choose')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="space-y-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session Amount (USDC)
          </label>
          <input
            type="number"
            value={sessionAmount}
            onChange={(e) => setSessionAmount(Number(e.target.value))}
            min={amount}
            step={amount}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Preauthorize ${sessionAmount.toFixed(2)} for approximately{' '}
            {Math.floor(sessionAmount / amount)} uses
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session Duration
          </label>
          <select
            value={sessionDuration}
            onChange={(e) => setSessionDuration(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>24 hours</option>
            <option value={168}>7 days</option>
            <option value={720}>30 days</option>
          </select>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-gray-600" />
            <span className="font-medium text-gray-900">Session Details</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Authorized Amount:</span>
              <span className="font-medium text-gray-900">${sessionAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Per Request:</span>
              <span className="font-medium text-gray-900">${amount.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Uses:</span>
              <span className="font-medium text-gray-900">
                ~{Math.floor(sessionAmount / amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Valid For:</span>
              <span className="font-medium text-gray-900">
                {sessionDuration < 24
                  ? `${sessionDuration} hours`
                  : `${Math.floor(sessionDuration / 24)} days`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSessionPayment}
        disabled={loading}
        className="w-full px-6 py-3 bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Creating Session...
          </>
        ) : (
          <>
            Authorize ${sessionAmount.toFixed(2)}
            <Zap size={18} />
          </>
        )}
      </button>
    </>
  );

  const renderCreditTopup = () => {
    const shortfall = amount - creditBalance;
    const suggestedAmounts = [
      Math.ceil(shortfall),
      Math.ceil(shortfall * 2),
      Math.ceil(shortfall * 5),
      Math.ceil(shortfall * 10)
    ];

    const customAmount = customTopupAmount || suggestedAmounts[0];

    return (
      <>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Top Up Credits</h2>
          <button
            onClick={() => setStep('choose')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 font-medium mb-1">Insufficient Credits</p>
              <p className="text-sm text-yellow-700">
                You need ${shortfall.toFixed(2)} more to complete this transaction
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Current Balance:</span>
              <span className="font-semibold text-gray-900">${creditBalance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Required Amount:</span>
              <span className="font-semibold text-gray-900">${amount.toFixed(4)}</span>
            </div>
            <div className="border-t border-gray-300 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Shortfall:</span>
              <span className="font-bold text-red-600">${shortfall.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quick Top-Up Amounts
            </label>
            <div className="grid grid-cols-2 gap-3">
              {suggestedAmounts.map((suggestedAmount) => (
                <button
                  key={suggestedAmount}
                  onClick={() => setCustomTopupAmount(suggestedAmount)}
                  className={`p-4 border-2 rounded-lg transition-all text-center ${
                    customAmount === suggestedAmount
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ${suggestedAmount.toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ~{Math.floor(suggestedAmount / amount)} uses
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Amount (USDC)
            </label>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomTopupAmount(Math.max(shortfall, Number(e.target.value)))}
              min={shortfall}
              step={0.01}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              New balance after top-up: ${(creditBalance + customAmount).toFixed(2)}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={() => handleCreditTopUp(customAmount)}
          disabled={loading}
          className="w-full px-6 py-3 bg-success-500 text-white hover:bg-success-600 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processing Top-Up...
            </>
          ) : (
            <>
              <DollarSign size={18} />
              Top Up ${customAmount.toFixed(2)}
            </>
          )}
        </button>
      </>
    );
  };

  const renderProcessing = () => (
    <div className="text-center py-8">
      <Loader2 size={48} className="animate-spin mx-auto mb-4 text-primary-500" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h3>
      <p className="text-gray-600">Setting up your x402 payment session...</p>
    </div>
  );

  const renderComplete = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-success-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={32} className="text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Authorized!</h3>
      <p className="text-gray-600 mb-4">Your x402 session is now active</p>
      {sessionToken && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Session Token</div>
          <div className="text-xs font-mono text-gray-700 break-all">
            {sessionToken.slice(0, 32)}...
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-[100] p-4">
      <div className="bg-white border border-gray-200 rounded-xl max-w-lg w-full p-8 animate-slideUp shadow-2xl">
        {step === 'choose' && renderChooseMode()}
        {step === 'session_setup' && renderSessionSetup()}
        {step === 'credit_topup' && renderCreditTopup()}
        {step === 'processing' && renderProcessing()}
        {step === 'complete' && renderComplete()}
      </div>
    </div>
  );
}
