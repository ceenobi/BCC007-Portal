import { useEffect, useRef, useState } from 'react';

interface UseWaveAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  staggerDelay?: number;
  duration?: number;
}

export const useWaveAnimation = (options: UseWaveAnimationOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '-40px',
    staggerDelay = 80,
    duration = 450
  } = options;

  const [isVisible, setIsVisible] = useState(false);
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
    transitionTimingFunction: 'cubic-bezier(0.2, 0.6, 0.3, 1)',
    willChange: 'opacity'
  });

  const getItemClassName = (baseClasses: string = '') =>
    `${baseClasses} transition-opacity ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`;

  return {
    isVisible,
    containerRef,
    getItemStyle,
    getItemClassName
  };
};
