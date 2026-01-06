import { useEffect, useRef, useState } from 'react';

interface CursorFollowerProps {
  enabled?: boolean;
  size?: number;
  color?: string;
  opacity?: number;
  delay?: number;
  showTrail?: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface Trail {
  x: number;
  y: number;
  id: number;
  opacity: number;
}

export default function CursorFollower({
  enabled = true,
  size = 24,
  color = '#9333ea',
  opacity = 0.3,
  delay = 0.15,
  showTrail = true,
}: CursorFollowerProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState<Position>({ x: -100, y: -100 });
  const [cursorPosition, setCursorPosition] = useState<Position>({ x: -100, y: -100 });
  const [trails, setTrails] = useState<Trail[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const animationFrameRef = useRef<number>();
  const trailCounterRef = useRef(0);
  const movementTimeoutRef = useRef<NodeJS.Timeout>();

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldAnimate = enabled && !prefersReducedMotion;

  useEffect(() => {
    if (!shouldAnimate) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setIsMoving(true);

      // Clear existing timeout
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
      }

      // Set movement to false after 100ms of no movement
      movementTimeoutRef.current = setTimeout(() => {
        setIsMoving(false);
      }, 100);

      // Create trail particles
      if (showTrail && Math.random() > 0.7) {
        const newTrail: Trail = {
          x: e.clientX,
          y: e.clientY,
          id: trailCounterRef.current++,
          opacity: 1,
        };
        setTrails((prev) => [...prev.slice(-8), newTrail]);
      }
    };

    const handleMouseLeave = () => {
      setMousePosition({ x: -100, y: -100 });
      setIsMoving(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
      }
    };
  }, [shouldAnimate, showTrail]);

  // Smooth cursor following animation
  useEffect(() => {
    if (!shouldAnimate) return;

    const animateCursor = () => {
      setCursorPosition((prev) => {
        const dx = mousePosition.x - prev.x;
        const dy = mousePosition.y - prev.y;

        return {
          x: prev.x + dx * delay,
          y: prev.y + dy * delay,
        };
      });

      animationFrameRef.current = requestAnimationFrame(animateCursor);
    };

    animationFrameRef.current = requestAnimationFrame(animateCursor);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mousePosition, delay, shouldAnimate]);

  // Fade out trail particles
  useEffect(() => {
    if (!showTrail || trails.length === 0) return;

    const interval = setInterval(() => {
      setTrails((prev) =>
        prev
          .map((trail) => ({ ...trail, opacity: trail.opacity - 0.05 }))
          .filter((trail) => trail.opacity > 0)
      );
    }, 30);

    return () => clearInterval(interval);
  }, [trails.length, showTrail]);

  if (!shouldAnimate) return null;

  return (
    <>
      {/* Main cursor follower */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed z-[9999]"
        style={{
          left: `${cursorPosition.x}px`,
          top: `${cursorPosition.y}px`,
          transform: 'translate(-50%, -50%)',
          transition: 'width 0.2s ease, height 0.2s ease',
        }}
      >
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            width: `${size * (isMoving ? 1.8 : 1.2)}px`,
            height: `${size * (isMoving ? 1.8 : 1.2)}px`,
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            opacity: opacity * 0.8,
            transform: 'translate(-50%, -50%)',
            transition: 'width 0.3s ease, height 0.3s ease, opacity 0.3s ease',
          }}
        />

        {/* Core orb */}
        <div
          className="absolute rounded-full"
          style={{
            width: `${size * (isMoving ? 0.9 : 0.7)}px`,
            height: `${size * (isMoving ? 0.9 : 0.7)}px`,
            background: `radial-gradient(circle, ${color} 0%, ${color}90 100%)`,
            opacity: opacity * 1.2,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 ${size * 1.5}px ${color}60, 0 0 ${size * 0.8}px ${color}80`,
            transition: 'width 0.2s ease, height 0.2s ease',
          }}
        />
      </div>

      {/* Trail particles */}
      {showTrail &&
        trails.map((trail) => (
          <div
            key={trail.id}
            className="pointer-events-none fixed z-[9998] rounded-full"
            style={{
              left: `${trail.x}px`,
              top: `${trail.y}px`,
              width: `${size * 0.4}px`,
              height: `${size * 0.4}px`,
              background: `radial-gradient(circle, ${color} 0%, transparent 100%)`,
              opacity: trail.opacity * opacity * 0.6,
              transform: 'translate(-50%, -50%)',
              transition: 'opacity 0.3s ease',
              boxShadow: `0 0 ${size * 0.5}px ${color}50`,
            }}
          />
        ))}
    </>
  );
}
