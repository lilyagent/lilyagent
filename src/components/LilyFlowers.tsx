import { useEffect, useState } from 'react';

interface Flower {
  id: number;
  left: string;
  animationDelay: string;
  animationDuration: string;
  size: number;
  opacity: number;
  variant: 'pink' | 'white' | 'lavender';
  rotationSpeed: string;
  swayAmount: number;
  fallCurve: number;
}

const PinkLily = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}
  >
    <defs>
      <radialGradient id="pink-petal" cx="30%" cy="30%">
        <stop offset="0%" stopColor="#FFE5F0" />
        <stop offset="40%" stopColor="#FFB3D9" />
        <stop offset="80%" stopColor="#FF8DC7" />
        <stop offset="100%" stopColor="#E96BB3" />
      </radialGradient>
      <radialGradient id="pink-center" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#FFF8DC" />
        <stop offset="100%" stopColor="#FFE44D" />
      </radialGradient>
      <linearGradient id="stamen" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#8B4513" />
        <stop offset="100%" stopColor="#654321" />
      </linearGradient>
    </defs>

    <g className="lily-petal-sway">
      <ellipse cx="60" cy="35" rx="14" ry="28" fill="url(#pink-petal)" opacity="0.95" transform="rotate(0 60 60)" />
      <path d="M 60 35 Q 58 20 60 15" stroke="#FF8DC7" strokeWidth="0.5" opacity="0.6" fill="none" />

      <ellipse cx="60" cy="35" rx="14" ry="28" fill="url(#pink-petal)" opacity="0.95" transform="rotate(60 60 60)" />
      <path d="M 60 35 Q 58 20 60 15" stroke="#FF8DC7" strokeWidth="0.5" opacity="0.6" fill="none" transform="rotate(60 60 60)" />

      <ellipse cx="60" cy="35" rx="14" ry="28" fill="url(#pink-petal)" opacity="0.95" transform="rotate(120 60 60)" />
      <path d="M 60 35 Q 58 20 60 15" stroke="#FF8DC7" strokeWidth="0.5" opacity="0.6" fill="none" transform="rotate(120 60 60)" />

      <ellipse cx="60" cy="35" rx="14" ry="28" fill="url(#pink-petal)" opacity="0.95" transform="rotate(180 60 60)" />
      <path d="M 60 35 Q 58 20 60 15" stroke="#FF8DC7" strokeWidth="0.5" opacity="0.6" fill="none" transform="rotate(180 60 60)" />

      <ellipse cx="60" cy="35" rx="14" ry="28" fill="url(#pink-petal)" opacity="0.95" transform="rotate(240 60 60)" />
      <path d="M 60 35 Q 58 20 60 15" stroke="#FF8DC7" strokeWidth="0.5" opacity="0.6" fill="none" transform="rotate(240 60 60)" />

      <ellipse cx="60" cy="35" rx="14" ry="28" fill="url(#pink-petal)" opacity="0.95" transform="rotate(300 60 60)" />
      <path d="M 60 35 Q 58 20 60 15" stroke="#FF8DC7" strokeWidth="0.5" opacity="0.6" fill="none" transform="rotate(300 60 60)" />
    </g>

    <circle cx="60" cy="60" r="6" fill="url(#pink-center)" opacity="0.9" />

    <line x1="60" y1="60" x2="58" y2="48" stroke="url(#stamen)" strokeWidth="1" opacity="0.8" />
    <line x1="60" y1="60" x2="62" y2="48" stroke="url(#stamen)" strokeWidth="1" opacity="0.8" />
    <line x1="60" y1="60" x2="56" y2="50" stroke="url(#stamen)" strokeWidth="1" opacity="0.8" />
    <line x1="60" y1="60" x2="64" y2="50" stroke="url(#stamen)" strokeWidth="1" opacity="0.8" />
    <ellipse cx="58" cy="47" rx="1.5" ry="2" fill="#654321" />
    <ellipse cx="62" cy="47" rx="1.5" ry="2" fill="#654321" />
    <ellipse cx="56" cy="49" rx="1.5" ry="2" fill="#654321" />
    <ellipse cx="64" cy="49" rx="1.5" ry="2" fill="#654321" />
  </svg>
);

const WhiteLily = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.12))' }}
  >
    <defs>
      <radialGradient id="white-petal" cx="40%" cy="30%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor="#F8F8FF" />
        <stop offset="100%" stopColor="#E8E8F0" />
      </radialGradient>
      <linearGradient id="white-stem" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#7FA882" />
        <stop offset="100%" stopColor="#5F8A62" />
      </linearGradient>
    </defs>

    <line x1="60" y1="60" x2="60" y2="130" stroke="url(#white-stem)" strokeWidth="3" opacity="0.8" />

    <g className="lily-petal-sway">
      <path d="M 60 60 Q 45 35 42 20 Q 42 15 45 12 Q 60 15 60 60 Z" fill="url(#white-petal)" opacity="0.95" />
      <path d="M 60 60 Q 45 35 42 20" stroke="#E0E0E8" strokeWidth="0.5" fill="none" opacity="0.5" />

      <path d="M 60 60 Q 75 35 78 20 Q 78 15 75 12 Q 60 15 60 60 Z" fill="url(#white-petal)" opacity="0.95" />
      <path d="M 60 60 Q 75 35 78 20" stroke="#E0E0E8" strokeWidth="0.5" fill="none" opacity="0.5" />

      <path d="M 60 60 Q 35 50 28 38 Q 26 33 28 30 Q 45 40 60 60 Z" fill="url(#white-petal)" opacity="0.95" />
      <path d="M 60 60 Q 35 50 28 38" stroke="#E0E0E8" strokeWidth="0.5" fill="none" opacity="0.5" />

      <path d="M 60 60 Q 85 50 92 38 Q 94 33 92 30 Q 75 40 60 60 Z" fill="url(#white-petal)" opacity="0.95" />
      <path d="M 60 60 Q 85 50 92 38" stroke="#E0E0E8" strokeWidth="0.5" fill="none" opacity="0.5" />

      <path d="M 60 60 Q 40 65 32 70 Q 30 68 32 65 Q 50 58 60 60 Z" fill="url(#white-petal)" opacity="0.95" />
      <path d="M 60 60 Q 80 65 88 70 Q 90 68 88 65 Q 70 58 60 60 Z" fill="url(#white-petal)" opacity="0.95" />
    </g>

    <circle cx="60" cy="60" r="5" fill="#F9D71C" opacity="0.85" />
  </svg>
);

const LavenderLily = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 4px 8px rgba(138,107,201,0.2))' }}
  >
    <defs>
      <radialGradient id="lavender-petal" cx="35%" cy="30%">
        <stop offset="0%" stopColor="#F0E6FF" />
        <stop offset="50%" stopColor="#D4BBFF" />
        <stop offset="100%" stopColor="#C5A4D9" />
      </radialGradient>
      <radialGradient id="lavender-center" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#FFF4E0" />
        <stop offset="100%" stopColor="#E8C47A" />
      </radialGradient>
    </defs>

    <g className="lily-petal-sway">
      <ellipse cx="60" cy="38" rx="13" ry="26" fill="url(#lavender-petal)" opacity="0.95" transform="rotate(0 60 60)" />
      <path d="M 60 38 Q 59 25 60 20" stroke="#B99DD6" strokeWidth="0.4" opacity="0.5" fill="none" />

      <ellipse cx="60" cy="38" rx="13" ry="26" fill="url(#lavender-petal)" opacity="0.95" transform="rotate(72 60 60)" />
      <path d="M 60 38 Q 59 25 60 20" stroke="#B99DD6" strokeWidth="0.4" opacity="0.5" fill="none" transform="rotate(72 60 60)" />

      <ellipse cx="60" cy="38" rx="13" ry="26" fill="url(#lavender-petal)" opacity="0.95" transform="rotate(144 60 60)" />
      <path d="M 60 38 Q 59 25 60 20" stroke="#B99DD6" strokeWidth="0.4" opacity="0.5" fill="none" transform="rotate(144 60 60)" />

      <ellipse cx="60" cy="38" rx="13" ry="26" fill="url(#lavender-petal)" opacity="0.95" transform="rotate(216 60 60)" />
      <path d="M 60 38 Q 59 25 60 20" stroke="#B99DD6" strokeWidth="0.4" opacity="0.5" fill="none" transform="rotate(216 60 60)" />

      <ellipse cx="60" cy="38" rx="13" ry="26" fill="url(#lavender-petal)" opacity="0.95" transform="rotate(288 60 60)" />
      <path d="M 60 38 Q 59 25 60 20" stroke="#B99DD6" strokeWidth="0.4" opacity="0.5" fill="none" transform="rotate(288 60 60)" />
    </g>

    <circle cx="60" cy="60" r="6" fill="url(#lavender-center)" opacity="0.9" />

    <line x1="60" y1="60" x2="57" y2="50" stroke="#A67C52" strokeWidth="0.8" opacity="0.7" />
    <line x1="60" y1="60" x2="63" y2="50" stroke="#A67C52" strokeWidth="0.8" opacity="0.7" />
    <circle cx="57" cy="49" r="1.2" fill="#8B4513" />
    <circle cx="63" cy="49" r="1.2" fill="#8B4513" />
  </svg>
);

export default function LilyFlowers() {
  const [flowers, setFlowers] = useState<Flower[]>([]);

  useEffect(() => {
    const flowerCount = 12;
    const generatedFlowers: Flower[] = [];
    const variants: Array<'pink' | 'white' | 'lavender'> = ['pink', 'white', 'lavender'];

    for (let i = 0; i < flowerCount; i++) {
      generatedFlowers.push({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 15}s`,
        animationDuration: `${15 + Math.random() * 10}s`,
        size: 20 + Math.random() * 25,
        opacity: 0.2 + Math.random() * 0.3,
        variant: variants[Math.floor(Math.random() * variants.length)],
        rotationSpeed: `${15 + Math.random() * 15}s`,
        swayAmount: 15 + Math.random() * 20,
        fallCurve: -15 + Math.random() * 30,
      });
    }

    setFlowers(generatedFlowers);
  }, []);

  const renderFlower = (flower: Flower) => {
    switch (flower.variant) {
      case 'pink':
        return <PinkLily size={flower.size} />;
      case 'white':
        return <WhiteLily size={flower.size} />;
      case 'lavender':
        return <LavenderLily size={flower.size} />;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
      {flowers.map((flower) => (
        <div
          key={flower.id}
          className="absolute lily-flower-fall"
          style={{
            left: flower.left,
            animationDelay: flower.animationDelay,
            animationDuration: flower.animationDuration,
            opacity: flower.opacity,
            '--sway-amount': `${flower.swayAmount}px`,
            '--fall-curve': `${flower.fallCurve}px`,
          } as React.CSSProperties}
        >
          <div
            className="lily-flower-rotate-tumble"
            style={{
              animationDuration: flower.rotationSpeed,
              animationDelay: flower.animationDelay,
            }}
          >
            <div className="lily-petal-flutter">
              {renderFlower(flower)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
