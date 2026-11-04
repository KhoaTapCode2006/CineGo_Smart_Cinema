import React, { useEffect, useRef } from 'react';

export interface HeroFilmStripProps {
  /** Optional custom glow color (defaults to brand red rgba(229,9,20,0.18)) */
  glowColor?: string;
  /** Optional class names */
  className?: string;
}

/**
 * HeroFilmStrip
 *
 * Cinematic film-strip atmospheric decoration mounted behind the movie poster in the hero banner.
 * Uses screen blending, depth-of-field blur layer, radial mask, subtle drift animation,
 * and mouse parallax (RAF lerp, zero React re-renders).
 *
 * Configurable CSS variables:
 *  --strip-x: Horizontal center of the ribbon (default: 74%)
 *  --strip-y: Vertical center of the ribbon (default: 50%)
 *  --strip-scale: Scale multiplier (default: 1 desktop, 0.8 tablet, 0.6 mobile)
 *  --strip-opacity: Main ribbon opacity (default: 0.58)
 *  --strip-blur-opacity: Back blurred ribbon opacity (default: 0.28)
 *  --strip-glow-color: Radial ambient glow behind poster (default: rgba(229,9,20,0.18))
 *  --strip-glow-size: Size of radial glow (default: 460px)
 */
export const HeroFilmStrip: React.FC<HeroFilmStripProps> = ({
  glowColor,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Check prefers-reduced-motion and touch device
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (prefersReducedMotion || isTouchDevice) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Parent hero container to capture mouse movements
    const heroSection = container.closest('section') || container;

    let targetX = 0;
    let targetY = 0;
    let currentMainX = 0;
    let currentMainY = 0;
    let currentBackX = 0;
    let currentBackY = 0;
    let isMouseInside = false;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = heroSection.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      // Normalized coordinates from -1 to 1 relative to hero center
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      targetX = Math.max(-1, Math.min(1, normX));
      targetY = Math.max(-1, Math.min(1, normY));
      isMouseInside = true;
    };

    const handleMouseLeave = () => {
      targetX = 0;
      targetY = 0;
      isMouseInside = false;
    };

    // Smooth RAF lerp loop updating CSS variables directly (0 React state updates)
    const animate = () => {
      const lerpFactor = 0.06;
      currentMainX += (targetX * 10 - currentMainX) * lerpFactor;
      currentMainY += (targetY * 10 - currentMainY) * lerpFactor;
      currentBackX += (-targetX * 5 - currentBackX) * lerpFactor;
      currentBackY += (-targetY * 5 - currentBackY) * lerpFactor;

      container.style.setProperty('--parallax-main-x', `${currentMainX.toFixed(2)}px`);
      container.style.setProperty('--parallax-main-y', `${currentMainY.toFixed(2)}px`);
      container.style.setProperty('--parallax-back-x', `${currentBackX.toFixed(2)}px`);
      container.style.setProperty('--parallax-back-y', `${currentBackY.toFixed(2)}px`);

      // Keep running if active or animating back to center
      if (
        isMouseInside ||
        Math.abs(currentMainX) > 0.05 ||
        Math.abs(currentMainY) > 0.05
      ) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
      }
    };

    const onMove = (e: MouseEvent) => {
      handleMouseMove(e);
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(animate);
      }
    };

    heroSection.addEventListener('mousemove', onMove as EventListener);
    heroSection.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      heroSection.removeEventListener('mousemove', onMove as EventListener);
      heroSection.removeEventListener('mouseleave', handleMouseLeave);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-[6] ${className}`}
      style={
        {
          '--strip-x': '74%',
          '--strip-y': '50%',
          '--strip-scale': '1',
          '--strip-opacity': '0.58',
          '--strip-blur-opacity': '0.28',
          '--strip-glow-color': glowColor || 'rgba(229, 9, 20, 0.18)',
          '--strip-glow-size': '480px',
          '--parallax-main-x': '0px',
          '--parallax-main-y': '0px',
          '--parallax-back-x': '0px',
          '--parallax-back-y': '0px',
        } as React.CSSProperties
      }
    >
      {/* ---------------------------------------------------------------------- */}
      {/* 1. SOFT LIGHTING ACCENTS                                               */}
      {/* Deep red radial glow behind the poster + cool navy tint on the left    */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="absolute pointer-events-none rounded-full blur-3xl transition-colors duration-700 hidden sm:block"
        style={{
          left: 'var(--strip-x, 74%)',
          top: 'var(--strip-y, 50%)',
          width: 'var(--strip-glow-size, 480px)',
          height: 'var(--strip-glow-size, 480px)',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, var(--strip-glow-color, rgba(229, 9, 20, 0.18)) 0%, rgba(229, 9, 20, 0.06) 45%, transparent 70%)',
        }}
      />

      <div
        className="absolute pointer-events-none rounded-full blur-2xl hidden lg:block"
        style={{
          left: 'calc(var(--strip-x, 74%) - 240px)',
          top: 'calc(var(--strip-y, 50%) + 80px)',
          width: '380px',
          height: '320px',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(14, 165, 233, 0.10) 0%, rgba(15, 23, 42, 0.22) 50%, transparent 80%)',
        }}
      />

      {/* ---------------------------------------------------------------------- */}
      {/* 2. LAYER 2: BACK / DEPTH OF FIELD LAYER (film-strip-blur.webp)         */}
      {/* Scaled up (1.5x), mirrored (scaleX(-1)), offset upper-left             */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="absolute pointer-events-none hidden md:block"
        style={{
          left: 'calc(var(--strip-x, 74%) - 120px)',
          top: 'calc(var(--strip-y, 50%) - 60px)',
          width: 'min(1250px, 92vw)',
          aspectRatio: '1024 / 438',
          transform:
            'translate(-50%, -50%) translate3d(var(--parallax-back-x, 0px), var(--parallax-back-y, 0px), 0)',
          willChange: 'transform',
        }}
      >
        <div
          className="w-full h-full film-strip-back-drift"
          style={{
            maskImage:
              'radial-gradient(ellipse 65% 60% at 55% 50%, black 15%, rgba(0,0,0,0.7) 45%, rgba(0,0,0,0.2) 70%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 65% 60% at 55% 50%, black 15%, rgba(0,0,0,0.7) 45%, rgba(0,0,0,0.2) 70%, transparent 100%)',
          }}
        >
          <img
            src="/hero/film-strip-blur.webp"
            alt=""
            width={1024}
            height={438}
            loading="eager"
            decoding="async"
            draggable={false}
            className="w-full h-full object-contain pointer-events-none"
            style={{
              transform: 'scaleX(-1) scale(1.5)',
              transformOrigin: 'center center',
              mixBlendMode: 'screen',
              opacity: 'var(--strip-blur-opacity, 0.28)',
              filter: 'brightness(0.85) contrast(1.1) saturate(1.05)',
            }}
          />
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. LAYER 1: MAIN SHARP RIBBON LAYER (film-strip.webp)                  */}
      {/* Ribbon passes behind the vertical poster, curving right and down       */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 'var(--strip-x, 74%)',
          top: 'var(--strip-y, 50%)',
          width: 'min(1200px, 90vw)',
          aspectRatio: '1024 / 438',
          transform:
            'translate(-50%, -50%) translate3d(var(--parallax-main-x, 0px), var(--parallax-main-y, 0px), 0)',
          willChange: 'transform',
        }}
      >
        {/* Animated Drift Wrapper */}
        <div
          className="relative w-full h-full film-strip-main-drift"
          style={{
            maskImage:
              'radial-gradient(ellipse 70% 65% at 50% 50%, black 20%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.25) 70%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 65% at 50% 50%, black 20%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.25) 70%, transparent 100%)',
          }}
        >
          {/* Main Film Strip Image */}
          <img
            src="/hero/film-strip.webp"
            alt=""
            width={1024}
            height={438}
            loading="eager"
            decoding="async"
            draggable={false}
            className="w-full h-full object-contain pointer-events-none"
            style={{
              transform: 'scale(var(--strip-scale, 1))',
              transformOrigin: 'center center',
              mixBlendMode: 'screen',
              opacity: 'var(--strip-opacity, 0.58)',
              filter: 'brightness(0.9) contrast(1.15) saturate(1.05)',
            }}
          />

          {/* Optional Subtle Metallic Highlight Sweep */}
          <div
            className="absolute inset-0 pointer-events-none film-strip-sweep-highlight overflow-hidden"
            style={{
              mixBlendMode: 'screen',
            }}
          >
            <div
              className="w-full h-full film-strip-sweep-beam"
              style={{
                background:
                  'linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.12) 50%, rgba(245, 179, 1, 0.08) 55%, transparent 68%)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroFilmStrip;
