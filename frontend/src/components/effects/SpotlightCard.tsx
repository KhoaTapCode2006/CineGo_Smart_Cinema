import React, { useRef, useState, useCallback, useEffect } from 'react';

export interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  /** Spotlight radius in px (default: 240) */
  spotlightRadius?: number;
  /** Spotlight color in rgba (default: gold rgba(245, 179, 1, 0.14)) */
  spotlightColor?: string;
  /** Subtle border glow color in rgba (default: rgba(245, 179, 1, 0.35)) */
  borderGlowColor?: string;
  /** Scale multiplier on hover (default: 1.025) */
  hoverScale?: number;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightRadius = 240,
  spotlightColor = 'rgba(245, 179, 1, 0.14)',
  borderGlowColor = 'rgba(245, 179, 1, 0.35)',
  hoverScale = 1.025,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: !prefersReducedMotion && isHovered ? `scale(${hoverScale})` : 'scale(1)',
        transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 300ms ease',
      }}
      className={`relative group/spotlight rounded-card ${className}`}
    >
      {/* Underlying Child (Card content) */}
      {children}

      {/* Dynamic Radial Spotlight Highlight following cursor */}
      {!prefersReducedMotion && (
        <div
          aria-hidden="true"
          style={{
            background: `radial-gradient(circle ${spotlightRadius}px at var(--mouse-x, 0px) var(--mouse-y, 0px), ${spotlightColor}, transparent 75%)`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 300ms ease',
          }}
          className="absolute inset-0 rounded-card pointer-events-none z-10"
        />
      )}

      {/* Dynamic Border Glow on hover */}
      {!prefersReducedMotion && (
        <div
          aria-hidden="true"
          style={{
            opacity: isHovered ? 1 : 0,
            borderColor: borderGlowColor,
            transition: 'opacity 300ms ease',
          }}
          className="absolute inset-0 rounded-card border pointer-events-none z-10"
        />
      )}
    </div>
  );
};

export default SpotlightCard;
