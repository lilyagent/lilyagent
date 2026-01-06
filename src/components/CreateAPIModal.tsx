import { useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { solanaPaymentService } from '../services/solanaPayment';
import { validateAndCreateWallet } from '../utils/walletValidation';
import { useWallet } from '../hooks/useWallet';

interface CreateAPIModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
  onSuccess?: () => void;
}

type Step = 'form' | 'payment' | 'processing' | 'success' | 'error';

const categories = ['AI/ML', 'Data', 'Finance', 'Social', 'Utilities', 'Media', 'Analytics', 'Other'];
const pricingModels = [
  { value: 'free', label: 'Free' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'pay_per_call', label: 'Pay Per Call' },
  { value: 'subscription', label: 'Subscription' },
];

export default function CreateAPIModal({ isOpen, onClose, walletAddress, onSuccess }: CreateAPIModalProps) {
  const { connected, publicKey, walletProvider } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'AI/ML',
    provider: '',
    endpoint: '',
    documentation_url: '',
    version: 'v1',
    pricing_model: 'pay_per_call',
    price_per_call: '0.001',
    rate_limit_per_minute: '60',
  });

  const [step, setStep] = useState<Step>('form');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<string>('');

  const API_CREATION_FEE_USD = 1.50;

  if (!isOpen) return null;

  const resetModal = () => {
    setFormData({
      name: '',
      description: '',
      category: 'AI/ML',
      provider: '',
      endpoint: '',
      documentation_url: '',
      version: 'v1',
      pricing_model: 'pay_per_call',
      price_per_call: '0.001',
      rate_limit_per_minute: '60',
    });
    setStep('form');
    setErrorMessage('');
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const isFormValid = () => {
    return (
      formData.name.trim() &&
      formData.description.trim() &&
      formData.provider.trim() &&
      formData.endpoint.trim()
    );
  };

  const handlePayment = async () => {
    if (!connected || !publicKey) {
      setErrorMessage('Please connect your wallet first');
      setStep('error');
      return;
    }

    if (!isFormValid()) {
      setErrorMessage('Please fill in all required fields');
      setStep('error');
      return;
    }

    setStep('payment');
    setIsProcessing(true);
    setErrorMessage('');

    try {
      console.log('[CreateAPI] Validating wallet...');
      const walletResult = validateAndCreateWallet(connected, publicKey, walletProvider);

      if (walletResult.error) {
        throw new Error(walletResult.error);
      }

      console.log('[CreateAPI] Creating payment transaction for', API_CREATION_FEE_USD, 'USD');

      const paymentResult = await solanaPaymentService.createPaymentTransaction(
        walletResult.wallet,
        API_CREATION_FEE_USD,
        'api_creation'
      );

      if (!paymentResult.success) {
        setErrorMessage(paymentResult.error || 'Payment failed');
        setStep('error');
        setIsProcessing(false);
        return;
      }

      console.log('[CreateAPI] Payment successful:', paymentResult.signature);
      console.log('[CreateAPI] SOL charged:', paymentResult.solAmount);

      setTransactionSignature(paymentResult.signature!);
      setStep('processing');

      await createAPI(paymentResult.signature!, paymentResult.solAmount!, paymentResult.usdAmount!);

      setStep('success');
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error: any) {
      console.error('[CreateAPI] Payment error:', error);
      setErrorMessage(error.message || 'An unexpected error occurred');
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const createAPI = async (txSignature: string, solAmount: number, usdAmount: number) => {
    try {
      const { data: apiData, error: apiError } = await supabase
        .from('apis')
        .insert({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          provider: formData.provider,
          endpoint: formData.endpoint,
          base_url: formData.endpoint,
          documentation_url: formData.documentation_url || null,
          version: formData.version,
          wallet_address: publicKey,
          price: parseFloat(formData.price_per_call),
          rating: 0,
          is_active: true,
          is_verified: false,
          uptime_percentage: 100,
          avg_response_time: 0,
          total_calls: 0,
          total_revenue: 0,
          total_reviews: 0,
          creator_id: publicKey,
        })
        .select()
        .single();

      if (apiError) throw apiError;

      const { error: pricingError } = await supabase
        .from('api_pricing_models')
        .insert({
          api_id: apiData.id,
          model_type: formData.pricing_model,
          price_per_call: parseFloat(formData.price_per_call),
          free_tier_limit: formData.pricing_model === 'freemium' ? 1000 : 0,
          monthly_subscription_price: formData.pricing_model === 'subscription' ? 10 : 0,
          rate_limit_per_minute: parseInt(formData.rate_limit_per_minute),
          rate_limit_per_day: parseInt(formData.rate_limit_per_minute) * 60 * 24,
          rate_limit_per_month: parseInt(formData.rate_limit_per_minute) * 60 * 24 * 30,
          is_active: true,
        });

      if (pricingError) {
        console.error('Failed to create pricing model:', pricingError);
      }

      const { error: paymentError } = await supabase
        .from('agent_payments')
        .insert({
          wallet_address: publicKey,
          amount_sol: solAmount,
          amount_usd: usdAmount,
          transaction_signature: txSignature,
          payment_type: 'api_creation',
          status: 'completed',
        });

      if (paymentError) {
        console.error('Failed to record payment:', paymentError);
      }
    } catch (error) {
      console.error('Error creating API:', error);
      throw new Error('Failed to create API in database');
    }
  };

  const renderFormStep = () => (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Create API Listing</h2>
          <p className="text-sm text-gray-600">
            List your API on the marketplace - ${API_CREATION_FEE_USD.toFixed(2)} listing fee
          </p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
        >
          <X size={22} />
        </button>
      </div>

      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Weather API"
              className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="Your company/name"
              className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-red-600">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What does your API do?"
            rows={3}
            className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <div className="relative">
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 rounded-lg"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="v1"
              className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Endpoint <span className="text-red-600">*</span>
          </label>
          <input
            type="url"
            value={formData.endpoint}
            onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
            placeholder="https://api.example.com/v1"
            className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Documentation URL
          </label>
          <input
            type="url"
            value={formData.documentation_url}
            onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })}
            placeholder="https://docs.example.com"
            className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 rounded-lg"
          />
        </div>

        <div className="border-t border-gray-200 pt-5">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing & Limits</h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pricing Model
              </label>
              <div className="relative">
                <select
                  value={formData.pricing_model}
                  onChange={(e) => setFormData({ ...formData, pricing_model: e.target.value })}
                  className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 rounded-lg"
                >
                  {pricingModels.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price per Call (USDC)
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.price_per_call}
                onChange={(e) => setFormData({ ...formData, price_per_call: e.target.value })}
                placeholder="0.001"
                className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rate Limit (per min)
              </label>
              <input
                type="number"
                value={formData.rate_limit_per_minute}
                onChange={(e) => setFormData({ ...formData, rate_limit_per_minute: e.target.value })}
                placeholder="60"
                className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {!connected && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              Connect wallet to continue
            </p>
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={!connected || !isFormValid() || isProcessing}
          className="w-full bg-primary-500 hover:bg-primary-600 py-3 text-sm font-medium text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              Processing...
            </span>
          ) : (
            `List API · $${API_CREATION_FEE_USD.toFixed(2)}`
          )}
        </button>
      </div>
    </>
  );

  const renderPaymentStep = () => (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Confirm Payment</h2>
          <p className="text-sm text-gray-600">
            Approve transaction in your wallet
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="bg-gray-50 border border-gray-200 p-5 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Listing Fee</span>
            <span className="text-gray-900 font-medium">${API_CREATION_FEE_USD.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Network Fee</span>
            <span className="text-gray-900 font-medium">~$0.01</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
            <span className="text-gray-900 font-semibold">Total</span>
            <span className="text-gray-900 font-semibold">${API_CREATION_FEE_USD.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 size={24} className="animate-spin text-primary-500" />
          <p className="text-gray-700">Awaiting wallet approval...</p>
        </div>
      </div>
    </>
  );

  const renderProcessingStep = () => (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Processing</h2>
          <p className="text-sm text-gray-600">
            Creating your API listing...
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center py-16 space-y-5">
          <Loader2 size={44} className="animate-spin text-primary-500" />
          <p className="text-gray-700 text-center">
            Transaction confirmed. Listing API...
          </p>
          {transactionSignature && (
            <a
              href={solanaPaymentService.getExplorerUrl(transactionSignature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
            >
              View Transaction
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </>
  );

  const renderSuccessStep = () => (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">API Listed</h2>
          <p className="text-sm text-gray-600">
            Successfully created
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-success-500/20 rounded-full blur-xl"></div>
            <CheckCircle size={56} className="text-success-500 relative" />
          </div>
          <p className="text-gray-900 text-xl font-semibold">{formData.name}</p>
          <p className="text-gray-600 text-center max-w-md text-sm leading-relaxed">
            Your API is now live on the marketplace. Users can start accessing it right away.
          </p>
          {transactionSignature && (
            <a
              href={solanaPaymentService.getExplorerUrl(transactionSignature)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1.5 mt-2 transition-colors"
            >
              View Transaction
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        <button
          onClick={handleClose}
          className="w-full border border-gray-300 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-all rounded-lg"
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Transaction Failed</h2>
          <p className="text-sm text-gray-600">
            Unable to complete
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-red-900 font-medium text-sm">Payment Error</p>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep('form')}
            className="flex-1 bg-primary-500 hover:bg-primary-600 py-3 text-sm font-medium text-white transition-all rounded-lg"
          >
            Try Again
          </button>
          <button
            onClick={handleClose}
            className="flex-1 border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );

  const renderStep = () => {
    switch (step) {
      case 'form':
        return renderFormStep();
      case 'payment':
        return renderPaymentStep();
      case 'processing':
        return renderProcessingStep();
      case 'success':
        return renderSuccessStep();
      case 'error':
        return renderErrorStep();
      default:
        return renderFormStep();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step === 'form' || step === 'success' || step === 'error' ? handleClose : undefined}
      />
      <div className="relative bg-white w-full max-w-3xl animate-fadeIn rounded-xl shadow-2xl">
        <div className="p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
