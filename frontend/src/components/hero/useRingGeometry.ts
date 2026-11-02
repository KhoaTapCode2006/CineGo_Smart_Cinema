import { useState, useEffect, useMemo, RefObject } from 'react';

export interface RingGeometry {
  W: number; // Card width in px
  H: number; // Card height in px (W * 1.5)
  R: number; // Ring radius in px
  angleStep: number; // 360 / count (e.g. 72deg for 5 cards)
  perspective: number; // CSS perspective in px
  stageHeight: number; // Safe height for the 3D stage in px
}

/**
 * Computes responsive card dimensions (W, H), 3D ring radius (R), and perspective
 * based on container width and card count.
 */
export function useRingGeometry(
  containerRef: RefObject<HTMLElement | null>,
  count: number = 5
): RingGeometry {
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? 700 : window.innerWidth;
    }
    return 700;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      const handleResize = () => {
        setContainerWidth(window.innerWidth >= 1024 ? 700 : window.innerWidth);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  return useMemo(() => {
    const validCount = Math.max(3, count);
    const angleStep = 360 / validCount;
    const halfAngleRad = Math.PI / validCount;

    // Responsive Card Width W
    // Desktop stage (col width ~ 650-750px): W ≈ 230px
    // Tablet stage (width ~ 500-700px): W ≈ 190px
    // Mobile stage (width < 440px): W ≈ 140px
    let W = 230;
    let perspective = 1400;
    let stageHeight = 440;

    if (containerWidth < 440) {
      // Mobile (e.g. 390px viewport, stage ~360px)
      W = Math.max(135, Math.min(150, Math.floor(containerWidth * 0.38)));
      perspective = 900;
      stageHeight = 280;
    } else if (containerWidth < 768) {
      // Phablet / small tablet
      W = 180;
      perspective = 1100;
      stageHeight = 340;
    } else if (containerWidth < 1024) {
      // Tablet (e.g. 834px viewport)
      W = 205;
      perspective = 1300;
      stageHeight = 380;
    } else {
      // Desktop (≥ 1024px)
      W = 230;
      perspective = 1400;
      stageHeight = 440;
    }

    const H = Math.round(W * 1.5);

    // Formula specified: R = (W / 2) / tan(halfAngle) * 1.3
    const tanVal = Math.tan(halfAngleRad);
    const R = Math.round(((W / 2) / tanVal) * 1.3);

    return {
      W,
      H,
      R,
      angleStep,
      perspective,
      stageHeight,
    };
  }, [containerWidth, count]);
}

export default useRingGeometry;
