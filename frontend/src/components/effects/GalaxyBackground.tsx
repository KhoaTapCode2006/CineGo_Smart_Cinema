import React, { useMemo, useEffect, useState } from 'react';

export interface GalaxyBackgroundProps {
  /** Opacity multiplier for the nebula clouds (default: 1) */
  nebulaOpacity?: number;
  /** Opacity multiplier for the stars (default: 1) */
  starOpacity?: number;
}

/**
 * Helper to generate random box-shadow stars string across viewport (vw/vh)
 */
function generateStarBoxShadows(count: number, colorVariety: boolean = false): string {
  const shadows: string[] = [];
  const colors = [
    'rgba(255, 255, 255, 0.9)',
    'rgba(255, 255, 255, 0.75)',
    'rgba(245, 179, 1, 0.85)', // Pale gold
    'rgba(186, 230, 253, 0.85)', // Pale cyan
    'rgba(233, 213, 255, 0.8)', // Pale lavender
  ];

  for (let i = 0; i < count; i++) {
    const x = (Math.random() * 100).toFixed(2);
    const y = (Math.random() * 100).toFixed(2);
    const color = colorVariety ? colors[i % colors.length] : 'rgba(255, 255, 255, 0.85)';
    shadows.push(`${x}vw ${y}vh 0 ${color}`);
  }

  return shadows.join(', ');
}

export const GalaxyBackground: React.FC<GalaxyBackgroundProps> = ({
  nebulaOpacity = 1,
  starOpacity = 1,
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

  // 1. Generate star layers ONCE with useMemo as box-shadow lists
  const smallStarsShadow = useMemo(() => generateStarBoxShadows(130, false), []);
  const mediumStarsShadow = useMemo(() => generateStarBoxShadows(55, true), []);
  const largeStarsShadow = useMemo(() => generateStarBoxShadows(18, true), []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
    >
      {/* Base deep navy-to-black canvas */}
      <div
        style={{
          background: 'linear-gradient(to bottom, #070913 0%, #0A0D1A 45%, #05070E 100%)',
        }}
        className="absolute inset-0"
      />

      {/* 2. Diagonal Blurred Milky Way Band (Static, not animated) */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-20%',
          width: '140%',
          height: '140%',
          transform: 'rotate(-28deg)',
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.10) 25%, rgba(236, 72, 153, 0.06) 45%, transparent 70%)',
          filter: 'blur(70px)',
          opacity: 0.85 * nebulaOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* 3. Nebula Cloud Layer 1 (Purple & Pink drift - Transform only) */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '5%',
          width: '750px',
          height: '750px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(147, 51, 234, 0.15) 0%, rgba(236, 72, 153, 0.08) 45%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: nebulaOpacity,
          animation: prefersReducedMotion ? 'none' : 'nebulaDrift1 48s ease-in-out infinite',
          willChange: prefersReducedMotion ? 'auto' : 'transform',
        }}
      />

      {/* 4. Nebula Cloud Layer 2 (Blue & Teal drift - Transform only) */}
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          left: '10%',
          width: '850px',
          height: '850px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(59, 130, 246, 0.14) 0%, rgba(20, 184, 166, 0.09) 45%, transparent 70%)',
          filter: 'blur(95px)',
          opacity: nebulaOpacity,
          animation: prefersReducedMotion ? 'none' : 'nebulaDrift2 55s ease-in-out infinite',
          willChange: prefersReducedMotion ? 'auto' : 'transform',
        }}
      />

      {/* 5. Readability Protection Shield: Subtly darkens hero text area (upper-left) */}
      <div
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '65vw',
          height: '80vh',
          background:
            'radial-gradient(ellipse at 25% 40%, rgba(7, 9, 19, 0.65) 0%, rgba(7, 9, 19, 0.35) 55%, transparent 80%)',
          pointerEvents: 'none',
        }}
      />

      {/* 6. Three Star Layers (Small, Medium, Large) via box-shadow */}
      {/* Layer 1: Small stars (1px) */}
      <div
        style={{
          width: '1px',
          height: '1px',
          borderRadius: '50%',
          boxShadow: smallStarsShadow,
          opacity: 0.8 * starOpacity,
          animation: prefersReducedMotion ? 'none' : 'starTwinkleSlow 7s ease-in-out infinite',
          willChange: prefersReducedMotion ? 'auto' : 'opacity',
        }}
      />

      {/* Layer 2: Medium stars (1.5px) */}
      <div
        style={{
          width: '1.5px',
          height: '1.5px',
          borderRadius: '50%',
          boxShadow: mediumStarsShadow,
          opacity: 0.85 * starOpacity,
          animation: prefersReducedMotion ? 'none' : 'starTwinkleMedium 5s ease-in-out infinite 1.5s',
          willChange: prefersReducedMotion ? 'auto' : 'opacity',
        }}
      />

      {/* Layer 3: Large stars (2.5px with subtle glow) */}
      <div
        style={{
          width: '2.5px',
          height: '2.5px',
          borderRadius: '50%',
          boxShadow: largeStarsShadow,
          opacity: 0.9 * starOpacity,
          animation: prefersReducedMotion ? 'none' : 'starTwinkleFast 4s ease-in-out infinite 2.8s',
          willChange: prefersReducedMotion ? 'auto' : 'opacity',
        }}
      />

      {/* 7. Soft Vignette around screen edges */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(4, 6, 14, 0.5) 75%, rgba(3, 4, 10, 0.88) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default GalaxyBackground;
