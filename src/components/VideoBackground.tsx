import { useEffect, useRef, useState } from 'react';

export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        setVideoError(true);
      });
    }
  }, []);

  return (
    <>
      <div className="fixed inset-0 bg-black z-0" />
      <div className="fixed inset-0 z-0 overflow-hidden">
        {!videoError ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoError(true)}
            className="absolute top-1/2 left-1/2 w-[177.77777778vh] h-[56.25vw] min-h-screen min-w-full -translate-x-1/2 -translate-y-1/2 object-cover pointer-events-none"
          >
            <source src="https://i.imgur.com/ISxtbm0.mp4" type="video/mp4" />
          </video>
        ) : (
          <div className="absolute inset-0">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'linear-gradient(45deg, #000000, #1a1a2e, #0f3460, #16213e, #000000)',
                backgroundSize: '400% 400%',
                animation: 'gradientShift 15s ease infinite'
              }}
            />
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.1),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(16,185,129,0.05),transparent_50%)]" />
            </div>
            <style>{`
              @keyframes gradientShift {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
              }
            `}</style>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 opacity-40" />
        <div className="absolute inset-0 bg-black/50" />
      </div>
    </>
  );
}
