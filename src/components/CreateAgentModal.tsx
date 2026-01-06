import { useState } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { solanaPaymentService } from '../services/solanaPayment';
import { validateAndCreateWallet } from '../utils/walletValidation';
import { useWallet } from '../hooks/useWallet';
import { supabase } from '../lib/supabase';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentStep = 'form' | 'payment' | 'processing' | 'success' | 'error';

export default function CreateAgentModal({ isOpen, onClose }: CreateAgentModalProps) {
  const { connected, publicKey, walletProvider } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    category: 'RESEARCH',
    goal: '',
    description: '',
  });

  const [paymentStep, setPaymentStep] = useState<PaymentStep>('form');
  const [transactionSignature, setTransactionSignature] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const categories = ['RESEARCH', 'CODE', 'FINANCE', 'WRITING', 'DATA', 'OTHER'];
  const AGENT_FEE_USD = solanaPaymentService.getAgentCreationFeeUsd();

  const resetModal = () => {
    setFormData({
      name: '',
      category: 'RESEARCH',
      goal: '',
      description: '',
    });
    setPaymentStep('form');
    setTransactionSignature('');
    setErrorMessage('');
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const isFormValid = () => {
    return formData.name.trim() && formData.goal.trim() && formData.description.trim();
  };

  const handlePayment = async () => {
    if (!connected || !publicKey) {
      setErrorMessage('Please connect your wallet first');
      setPaymentStep('error');
      return;
    }

    if (!isFormValid()) {
      setErrorMessage('Please fill in all required fields');
      setPaymentStep('error');
      return;
    }

    setPaymentStep('payment');
    setIsProcessing(true);
    setErrorMessage('');

    try {
      console.log('[CreateAgent] Validating wallet...');
      const walletResult = validateAndCreateWallet(connected, publicKey, walletProvider);

      if (walletResult.error) {
        throw new Error(walletResult.error);
      }

      console.log('[CreateAgent] Creating payment transaction for', AGENT_FEE_USD, 'USD');

      const paymentResult = await solanaPaymentService.createPaymentTransaction(
        walletResult.wallet,
        AGENT_FEE_USD,
        'agent_payment'
      );

      if (!paymentResult.success) {
        setErrorMessage(paymentResult.error || 'Payment failed');
        setPaymentStep('error');
        setIsProcessing(false);
        return;
      }

      console.log('[CreateAgent] Payment successful:', paymentResult.signature);
      console.log('[CreateAgent] SOL charged:', paymentResult.solAmount);

      setTransactionSignature(paymentResult.signature!);
      setPaymentStep('processing');

      await createAgent(paymentResult.signature!, paymentResult.solAmount!, paymentResult.usdAmount!);

      setPaymentStep('success');
    } catch (error: any) {
      console.error('[CreateAgent] Payment error:', error);
      setErrorMessage(error.message || 'An unexpected error occurred');
      setPaymentStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const createAgent = async (txSignature: string, solAmount: number, usdAmount: number) => {
    try {
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .insert({
          name: formData.name,
          category: formData.category.toLowerCase(),
          description: formData.description,
          price: 0.10,
          is_active: true,
          wallet_address: publicKey,
        })
        .select()
        .single();

      if (agentError) throw agentError;

      const { error: paymentError } = await supabase
        .from('agent_payments')
        .insert({
          agent_id: agentData.id,
          wallet_address: publicKey,
          amount_sol: solAmount,
          amount_usd: usdAmount,
          transaction_signature: txSignature,
          payment_type: 'agent_creation',
          status: 'completed',
        });

      if (paymentError) {
        console.error('Failed to record payment:', paymentError);
      }

      const { error: executionError } = await supabase
        .from('agent_executions')
        .insert({
          agent_id: agentData.id,
          status: 'completed',
          cost_usdc: usdAmount,
          input_data: {
            action: 'agent_creation',
            agent_name: formData.name,
            goal: formData.goal
          },
        });

      if (executionError) {
        console.error('Failed to record execution:', executionError);
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      throw new Error('Failed to create agent in database');
    }
  };

  const renderFormStep = () => (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Create Your Agent</h2>
          <p className="text-sm text-gray-600">
            Set up an AI agent - ${AGENT_FEE_USD.toFixed(2)} deployment fee
          </p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
        >
          <X size={22} />
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agent Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Market Research Assistant"
            className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 rounded-lg"
          />
        </div>

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
            Primary Goal
          </label>
          <textarea
            value={formData.goal}
            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
            placeholder="What should this agent accomplish?"
            rows={3}
            className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description for marketplace listing"
            rows={3}
            className="w-full bg-white border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none rounded-lg"
          />
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
            `Deploy Agent · $${AGENT_FEE_USD.toFixed(2)}`
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
            <span className="text-gray-600 text-sm">Deployment Fee</span>
            <span className="text-gray-900 font-medium">${AGENT_FEE_USD.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Network Fee</span>
            <span className="text-gray-900 font-medium">~$0.01</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
            <span className="text-gray-900 font-semibold">Total</span>
            <span className="text-gray-900 font-semibold">${AGENT_FEE_USD.toFixed(2)}</span>
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
            Setting up your agent...
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center py-16 space-y-5">
          <Loader2 size={44} className="animate-spin text-primary-500" />
          <p className="text-gray-700 text-center">
            Transaction confirmed. Building agent...
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Agent Created</h2>
          <p className="text-sm text-gray-600">
            Successfully deployed
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
            Agent is live and ready to use. You can find it in your agents dashboard.
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
            onClick={() => setPaymentStep('form')}
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
    switch (paymentStep) {
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
        onClick={paymentStep === 'form' || paymentStep === 'success' || paymentStep === 'error' ? handleClose : undefined}
      />
      <div className="relative bg-white w-full max-w-2xl animate-fadeIn rounded-xl shadow-2xl">
        <div className="p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
