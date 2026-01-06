import { useState, useEffect } from 'react';
import { Wallet, Zap, DollarSign, CheckCircle, ArrowRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OnboardingFlowProps {
  walletAddress?: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingFlow({ walletAddress, onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (walletAddress) {
      checkOnboardingStatus();
    }
  }, [walletAddress]);

  const checkOnboardingStatus = async () => {
    if (!walletAddress) return;

    try {
      const { data } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('wallet_address', walletAddress)
        .maybeSingle();

      if (data?.completed_at) {
        setIsVisible(false);
        onComplete();
      } else if (data?.onboarding_step) {
        setCurrentStep(data.onboarding_step);
      }
    } catch (err) {
      console.error('Failed to check onboarding status:', err);
    }
  };

  const updateOnboardingProgress = async (step: number, completed: boolean = false) => {
    if (!walletAddress) return;

    try {
      const updates: any = { onboarding_step: step };

      if (step === 2) updates.has_viewed_tutorial = true;
      if (completed) updates.completed_at = new Date().toISOString();

      await supabase
        .from('user_onboarding')
        .upsert({
          wallet_address: walletAddress,
          ...updates,
        }, {
          onConflict: 'wallet_address'
        });
    } catch (err) {
      console.error('Failed to update onboarding:', err);
    }
  };

  const handleNext = async () => {
    if (currentStep < 4) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await updateOnboardingProgress(nextStep);
    } else {
      await updateOnboardingProgress(4, true);
      setIsVisible(false);
      onComplete();
    }
  };

  const handleSkip = async () => {
    await updateOnboardingProgress(4, true);
    setIsVisible(false);
    onSkip();
  };

  if (!isVisible) return null;

  const steps = [
    {
      title: 'Welcome to LABORY.FUN',
      icon: Zap,
      description: 'Build, deploy, and monetize AI agents on Solana with instant USDC micropayments',
      details: [
        'Access 402+ pre-built AI agents',
        'Pay only for what you use - no subscriptions',
        'Execute agents instantly with crypto payments',
        'Create and monetize your own AI agents'
      ]
    },
    {
      title: 'Connect Your Wallet',
      icon: Wallet,
      description: 'Your Solana wallet is your gateway to AI agents',
      details: [
        'We support Phantom, Solflare, and Backpack wallets',
        'Your wallet holds USDC for agent payments',
        'All transactions happen on Solana blockchain',
        'No email or password required'
      ]
    },
    {
      title: 'How Payments Work',
      icon: DollarSign,
      description: 'Instant micropayments powered by x402 protocol',
      details: [
        'Each agent execution requires a small USDC payment',
        'You\'ll see the exact cost before execution',
        'Payments are instant - no waiting for confirmations',
        'All transactions are verified on-chain for security'
      ]
    },
    {
      title: 'You\'re All Set!',
      icon: CheckCircle,
      description: 'Start exploring AI agents and executing your first request',
      details: [
        'Browse the marketplace to find agents',
        'Each agent shows its cost upfront',
        'Click "Execute" and approve the payment',
        'Get results in seconds'
      ]
    }
  ];

  const currentStepData = steps[currentStep - 1];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-[150] p-4">
      <div className="bg-gray-950/95 backdrop-blur-xl border border-gray-800/60 rounded-lg max-w-2xl w-full p-8 animate-slideUp shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? 'w-12 bg-white'
                    : step < currentStep
                    ? 'w-8 bg-green-500'
                    : 'w-8 bg-gray-800'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-3">{currentStepData.title}</h2>
          <p className="text-gray-400 text-lg">{currentStepData.description}</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <ul className="space-y-4">
            {currentStepData.details.map((detail, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">{detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Step {currentStep} of 4
          </div>
          <div className="flex gap-3">
            {currentStep < 4 && (
              <button
                onClick={handleSkip}
                className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Skip Tutorial
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-white text-black hover:bg-gray-100 rounded-lg transition-all font-medium flex items-center gap-2"
            >
              {currentStep === 4 ? 'Get Started' : 'Next'}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
