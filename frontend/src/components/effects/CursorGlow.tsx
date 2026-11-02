import React, { useEffect, useRef, useState } from 'react';

export interface CursorGlowProps {
  /** Opacity for the primary brand red radial glow (default: 0.08) */
  redOpacity?: number;
  /** Opacity for the cinema indigo/blue radial glow (default: 0.07) */
  indigoOpacity?: number;
  /** Radius/size of the glow blobs in pixels (default: 520) */
  size?: number;
  /** Smoothing easing factor: 0.01 (very sluggish) to 0.2 (instant) (default: 0.08) */
  easing?: number;
}

export const CursorGlow: React.FC<CursorGlowProps> = ({
  redOpacity = 0.08,
  indigoOpacity = 0.07,
  size = 520,
  easing = 0.08,
}) => {
  const redBlobRef = useRef<HTMLDivElement>(null);
  const indigoBlobRef = useRef<HTMLDivElement>(null);

  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check prefers-reduced-motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 2. Check if touch/mobile device (pointer: coarse)
    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    if (reducedMotion || isTouch) {
      setIsEnabled(false);
      return;
    }

    setIsEnabled(true);
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;

    // Separate positions for red and indigo to allow trailing chromatic delay
    let redX = targetX;
    let redY = targetY;
    let indigoX = targetX;
    let indigoY = targetY;

    let animationFrameId: number | null = null;
    let isVisible = !document.hidden;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible && !animationFrameId) {
        animationFrameId = requestAnimationFrame(renderLoop);
      }
    };

    const renderLoop = () => {
      if (!isVisible) {
        animationFrameId = null;
        return;
      }

      // Smooth lerp calculations
      redX += (targetX - redX) * easing;
      redY += (targetY - redY) * easing;

      // Indigo follows with slightly gentler easing for subtle chromatic trail
      indigoX += (targetX - indigoX) * (easing * 0.7);
      indigoY += (targetY - indigoY) * (easing * 0.7);

      const halfSize = size / 2;

      // Mutate DOM transforms directly - ZERO React state updates per frame!
      if (redBlobRef.current) {
        redBlobRef.current.style.transform = `translate3d(${redX - halfSize}px, ${redY - halfSize}px, 0)`;
      }
      if (indigoBlobRef.current) {
        indigoBlobRef.current.style.transform = `translate3d(${indigoX - halfSize}px, ${indigoY - halfSize}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isEnabled, easing, size]);

  if (!isEnabled) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      {/* Red Ambient Radial Blob */}
      <div
        ref={redBlobRef}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: `radial-gradient(circle, rgba(229, 9, 20, ${redOpacity}) 0%, rgba(229, 9, 20, ${redOpacity * 0.4}) 45%, transparent 70%)`,
          position: 'absolute',
          top: 0,
          left: 0,
          borderRadius: '50%',
          filter: 'blur(60px)',
          willChange: 'transform',
        }}
      />

      {/* Indigo / Cinema Blue Ambient Radial Blob */}
      <div
        ref={indigoBlobRef}
        style={{
          width: `${size * 1.1}px`,
          height: `${size * 1.1}px`,
          background: `radial-gradient(circle, rgba(79, 70, 229, ${indigoOpacity}) 0%, rgba(59, 130, 246, ${indigoOpacity * 0.3}) 45%, transparent 70%)`,
          position: 'absolute',
          top: 0,
          left: 0,
          borderRadius: '50%',
          filter: 'blur(75px)',
          willChange: 'transform',
        }}
      />
    </div>
  );
};

export default CursorGlow;
