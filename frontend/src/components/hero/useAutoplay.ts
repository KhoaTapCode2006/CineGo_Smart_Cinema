import { useState, useEffect, useRef } from 'react';

interface UseAutoplayOptions {
  duration?: number; // default 4500ms
  isPaused: boolean;
  onNext: () => void;
  resetTrigger?: number; // Whenever activeIndex or rotation changes
}

export function useAutoplay({
  duration = 4500,
  isPaused,
  onNext,
  resetTrigger,
}: UseAutoplayOptions) {
  const [progress, setProgress] = useState(0);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  // Reset progress bar whenever the card changes
  useEffect(() => {
    setProgress(0);
  }, [resetTrigger]);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const intervalMs = 50; // smooth 20fps tick for progress bar
    const increment = (intervalMs / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          onNextRef.current();
          return 0;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPaused, duration]);

  return { progress };
}

export default useAutoplay;
