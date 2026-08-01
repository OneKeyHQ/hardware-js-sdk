import { useEffect, useMemo, useRef, useState } from 'react';

export function useAnimatedQrPlayer(parts: string[], interval = 800) {
  const sanitized = useMemo(() => parts.filter(item => item && item.trim().length > 0), [parts]);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPlaying, setIsPlaying] = useState(sanitized.length > 1);

  useEffect(() => {
    setIndex(0);
    setIsPlaying(sanitized.length > 1);
  }, [sanitized.length]);

  useEffect(() => {
    if (!isPlaying || sanitized.length <= 1) {
      return undefined;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = setInterval(() => {
      setIndex(prev => (prev + 1) % sanitized.length);
    }, interval);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [interval, isPlaying, sanitized.length]);

  const pause = () => setIsPlaying(false);
  const resume = () => {
    if (sanitized.length > 1) {
      setIsPlaying(true);
    }
  };
  const toggle = () => (isPlaying ? pause() : resume());
  const showPrev = () => {
    if (sanitized.length <= 1) {
      return;
    }
    setIndex(prev => (prev - 1 + sanitized.length) % sanitized.length);
  };
  const showNext = () => {
    if (sanitized.length <= 1) {
      return;
    }
    setIndex(prev => (prev + 1) % sanitized.length);
  };

  return {
    frames: sanitized,
    currentFrame: sanitized[index] || '',
    index,
    total: sanitized.length,
    isPlaying,
    pause,
    resume,
    toggle,
    showPrev,
    showNext,
  };
}
