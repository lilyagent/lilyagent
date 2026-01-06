import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onLoadComplete: () => void;
}

export default function LoadingScreen({ onLoadComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const duration = 3000;
    const interval = 30;
    const increment = (interval / duration) * 100;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(progressInterval);
          setIsComplete(true);
          setTimeout(() => {
            onLoadComplete();
          }, 400);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(progressInterval);
  }, [onLoadComplete]);

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        isComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      >
        <source src="/loading-video.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-6 flex justify-center relative">
          <div className="absolute inset-0 bg-purple-500 rounded-3xl blur-3xl opacity-40 animate-pulse" />
          <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
            <img
              src="/logo.png"
              alt="Lily"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <h1 className="text-5xl font-bold text-white mb-2 tracking-wide drop-shadow-lg">
          Lily
        </h1>

        <p className="text-white/70 text-sm tracking-[0.3em] uppercase mb-8 font-light">
          AI Agent Protocol
        </p>

        <div className="w-96 h-0.5 bg-white/10 relative overflow-hidden rounded-full backdrop-blur-sm">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
