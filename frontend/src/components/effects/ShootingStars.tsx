import React, { useMemo, useEffect, useState } from 'react';

export interface ShootingStarsProps {
  /** Number of shooting stars (default: 6, range: 5–8) */
  count?: number;
  /** Angle in degrees (default: 32deg, 0deg = directly left to right) */
  angle?: number;
  /** Speed multiplier (default: 1) */
  speedMultiplier?: number;
}

interface MeteorItem {
  id: number;
  top: number; // percentage (typically 0% to 50%)
  left: number; // percentage (typically -5% to 65%)
  length: number; // px length of tail
  distance: number; // px distance traveled
  angle: number; // deg
  duration: number; // seconds
  delay: number; // seconds
}

export const ShootingStars: React.FC<ShootingStarsProps> = ({
  count = 6,
  angle = 32,
  speedMultiplier = 1,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  // Generate 5-8 shooting stars with staggered delays across the upper/left quadrant
  const meteors = useMemo<MeteorItem[]>(() => {
    const items: MeteorItem[] = [];
    const validCount = Math.max(5, Math.min(8, count));

    for (let i = 0; i < validCount; i++) {
      // Positioned mainly across the upper 45% and staggered horizontally
      const top = 3 + (i * 38) / validCount + (Math.random() * 6 - 3);
      const left = -5 + (i * 75) / validCount + (Math.random() * 8 - 4);
      const length = 110 + Math.random() * 50; // 110px to 160px tail
      const distance = 480 + Math.random() * 220; // 480px to 700px travel
      const starAngle = angle === 0 ? 0 : Number((angle + (Math.random() * 6 - 3)).toFixed(1)); // slight individual variation unless strictly 0deg
      const duration = (5.5 + Math.random() * 3.5) / speedMultiplier; // 5.5s to 9s per cycle
      const delay = (i * 2.2 + Math.random() * 2.5) / speedMultiplier;

      items.push({
        id: i,
        top,
        left,
        length,
        distance,
        angle: starAngle,
        duration,
        delay,
      });
    }
    return items;
  }, [count, angle, speedMultiplier]);

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      {meteors.map((meteor) => (
        <div
          key={`meteor-${meteor.id}`}
          className="meteor"
          style={
            {
              top: `${meteor.top}%`,
              left: `${meteor.left}%`,
              '--angle': `${meteor.angle}deg`,
            } as React.CSSProperties
          }
        >
          {/* Inner body translating along the wrapper's local +X axis with ::after glowing head */}
          <div
            className="meteor__body"
            style={
              {
                width: `${meteor.length}px`,
                animation: `meteorFly ${meteor.duration}s cubic-bezier(0.22, 0.61, 0.36, 1) infinite`,
                animationDelay: `${meteor.delay}s`,
                '--meteor-distance': `${meteor.distance}px`,
              } as React.CSSProperties
            }
          />
        </div>
      ))}
    </div>
  );
};

export default ShootingStars;
