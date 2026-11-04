import { useEffect, useRef, useState } from 'react';

export interface UseAutoplayOptions {
  /** Duration in milliseconds for each slide (default: 6000ms) */
  duration?: number;
  /** Whether autoplay is currently paused */
  isPaused: boolean;
  /** Callback fired to advance to the next slide */
  onNext: () => void;
  /** Value that changes whenever the active slide changes manually or automatically */
  resetTrigger?: number | string;
}

export function useAutoplay({
  duration = 6000,
  isPaused,
  onNext,
  resetTrigger,
}: UseAutoplayOptions) {
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  // Unique cycle key that increments on new slide or after resuming from pause
  const [cycleKey, setCycleKey] = useState(0);

  // Whenever the active slide changes, reset the cycle
  useEffect(() => {
    setCycleKey((k) => k + 1);
  }, [resetTrigger]);

  // Handle timer
  useEffect(() => {
    if (isPaused) {
      return;
    }

    // When resuming from pause, restart the progress bar
    setCycleKey((k) => k + 1);

    const timer = setTimeout(() => {
      onNextRef.current();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [isPaused, duration, resetTrigger]);

  return { cycleKey };
}

export default useAutoplay;
