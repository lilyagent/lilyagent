import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Github } from 'lucide-react';
import ContractAddress from '../components/ContractAddress';

export default function Home() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const handleScroll = () => {
      const scrolled = window.scrollY;

      if (scrolled > 50 && !isFadingOut) {
        setIsFadingOut(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 400);
      }

      setScrollPosition(Math.min(100, (scrolled / 50) * 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navigate, isFadingOut]);

  return (
    <div className={`relative min-h-screen bg-black text-white overflow-x-hidden transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover opacity-30"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      <div className="fixed inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      <div className="fixed top-0 left-0 w-full h-1 bg-gray-900 z-50">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-300"
          style={{ width: `${scrollPosition}%` }}
        />
      </div>

      <div className="fixed top-8 left-8 z-40">
        <img src="/logo.png" alt="Lily" className="h-10 w-10 rounded-2xl opacity-80" />
      </div>

      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
        <div className="text-center">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Contract Address
          </div>
          <ContractAddress />
        </div>
      </div>

      <div className="fixed top-8 right-8 z-40 flex items-center gap-4">
        <a
          href="https://github.com/lilyagent/lilyagent"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/50 hover:text-white transition-colors duration-200"
        >
          <Github className="w-5 h-5" />
        </a>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg text-sm font-medium transition-all duration-200"
        >
          LAUNCH
        </button>
      </div>

      <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
        <div
          className={`text-center transition-all duration-1000 transform ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="mb-12 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl blur-3xl opacity-20 animate-pulse" />
              <img src="/logo.png" alt="Lily" className="relative h-24 w-24 rounded-3xl" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-wide mb-8 leading-tight">
            Lily Infrastructure
          </h1>

          <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed tracking-wide font-light">
            Create and deploy AI agents on Solana. Users pay per-use with USDC.
            <br />
            No subscriptions, no upfront costs.
          </p>
        </div>

        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
          <div className="text-xs text-gray-500 uppercase tracking-[0.3em] font-light">
            Scroll to Explore
          </div>
          <ChevronDown className="w-6 h-6 text-gray-600 animate-bounce" />
        </div>
      </section>

      <section className="relative h-screen"></section>
    </div>
  );
}
