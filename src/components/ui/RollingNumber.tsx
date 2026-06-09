import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface RollingNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  style?: CSSProperties;
}

export default function RollingNumber({
  value,
  duration = 800,
  decimals = 2,
  className,
  style,
}: RollingNumberProps) {
  const [display, setDisplay] = useState(0);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    startValueRef.current = display;
    startTimeRef.current = performance.now();
    cancelAnimationFrame(frameRef.current);

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValueRef.current + (value - startValueRef.current) * eased;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return (
    <span className={cn('font-mono tabular-nums', className)} style={style}>
      {display.toLocaleString('zh-CN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}
