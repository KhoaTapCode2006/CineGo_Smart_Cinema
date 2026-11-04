import { useCallback, useEffect, useRef, useState } from 'react';
import { Movie } from '../types/movie';

const OPEN_DELAY_MS = 350;
const SWITCH_DELAY_MS = 120;
const CLOSE_DELAY_MS = 180;

const NAVBAR_HEIGHT_PX = 64;
const VIEWPORT_MARGIN_PX = 12;

export interface MoviePreview {
  movie: Movie;
  anchor: HTMLElement;
}

interface Size {
  width: number;
  height: number;
}

/**
 * Center the popup over its card, keeping it on screen and below the sticky navbar.
 */
export function computePopupPosition(
  anchorRect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  popup: Size,
  viewport: Size
): { left: number; top: number } {
  const centeredLeft = anchorRect.left + anchorRect.width / 2 - popup.width / 2;
  const centeredTop = anchorRect.top + anchorRect.height / 2 - popup.height / 2;

  const maxLeft = viewport.width - popup.width - VIEWPORT_MARGIN_PX;
  const maxTop = viewport.height - popup.height - VIEWPORT_MARGIN_PX;

  return {
    left: Math.max(VIEWPORT_MARGIN_PX, Math.min(centeredLeft, maxLeft)),
    top: Math.max(NAVBAR_HEIGHT_PX + VIEWPORT_MARGIN_PX, Math.min(centeredTop, maxTop)),
  };
}

/**
 * Hover-intent state for the Discover grid's single shared movie popup.
 */
export function useMoviePreview() {
  const [preview, setPreview] = useState<MoviePreview | null>(null);
  const previewRef = useRef<MoviePreview | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((next: MoviePreview | null) => {
    previewRef.current = next;
    setPreview(next);
  }, []);

  const keepOpen = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const open = useCallback(
    (movie: Movie, anchor: HTMLElement) => {
      keepOpen();
      timerRef.current = setTimeout(
        () => update({ movie, anchor }),
        previewRef.current ? SWITCH_DELAY_MS : OPEN_DELAY_MS
      );
    },
    [keepOpen, update]
  );

  const close = useCallback(() => {
    keepOpen();
    if (!previewRef.current) return;
    timerRef.current = setTimeout(() => update(null), CLOSE_DELAY_MS);
  }, [keepOpen, update]);

  const dismiss = useCallback(() => {
    keepOpen();
    update(null);
  }, [keepOpen, update]);

  useEffect(() => keepOpen, [keepOpen]);

  return { preview, open, close, keepOpen, dismiss };
}

export default useMoviePreview;
