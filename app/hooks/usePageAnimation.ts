import { useEffect, useRef, useState } from 'react';

interface UseWaveAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  staggerDelay?: number;
  duration?: number;
  distance?: 'sm' | 'md' | 'lg';
  /** Start as visible (no opacity-0 on first paint). Use for above-the-fold
   *  content so LCP elements render immediately instead of waiting for the
   *  IntersectionObserver + transition delay. */
  startVisible?: boolean;
}

const HIDDEN_TRANSLATE = {
  sm: 'translate-y-3',
  md: 'translate-y-6',
  lg: 'translate-y-10'
} as const;

export const useWaveAnimation = (options: UseWaveAnimationOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '-40px',
    staggerDelay = 80,
    duration = 450,
    distance = 'sm',
    startVisible = false
  } = options;

  const [isVisible, setIsVisible] = useState(startVisible);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    if (containerRef.current) {
      const checkVisibility = () => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;

        if (isInView) {
          setTimeout(() => setIsVisible(true), 100);
        } else {
          observer.observe(containerRef.current);
        }
      };

      setTimeout(checkVisibility, 50);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const getItemStyle = (index: number) => ({
    transitionDelay: `${index * staggerDelay}ms`,
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: 'cubic-bezier(0.2, 0.6, 0.3, 1)'
  });

  const getItemClassName = (baseClasses: string = '') =>
    `${baseClasses} transition-[opacity,translate,filter] ${
      isVisible
        ? 'opacity-100 translate-y-0 blur-none'
        : `opacity-0 ${HIDDEN_TRANSLATE[distance]} blur-[2px]`
    }`;

  return {
    isVisible,
    containerRef,
    getItemStyle,
    getItemClassName
  };
};
