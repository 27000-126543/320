import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * 数值颜色类型
 */
type NumberColor = 'cyber-blue' | 'heat-orange' | 'gas-green' | 'alert-red' | 'safe-green' | 'warning-yellow' | 'white';

/**
 * 数字滚动动画组件属性类型定义
 * @property value - 显示的数值
 * @property unit - 数值单位（如 kW、MW、%）
 * @property color - 数值颜色
 * @property prefix - 前缀符号（如 ¥、$、≈）
 * @property decimals - 小数位数
 * @property duration - 动画持续时间（毫秒）
 * @property size - 文字大小
 * @property fontWeight - 字重
 * @property showSeparator - 是否显示千位分隔符
 * @property className - 自定义样式类名
 */
interface DataNumberProps {
  value: number;
  unit?: string;
  color?: NumberColor;
  prefix?: string;
  decimals?: number;
  duration?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fontWeight?: 'normal' | 'medium' | 'bold' | 'extrabold';
  showSeparator?: boolean;
  className?: string;
}

/**
 * 带滚动数字动画的科技感数值显示组件
 * 特点：
 * - 数字从旧值平滑滚动到新值
 * - 支持单位、前缀、千位分隔符
 * - 多种预设颜色和尺寸
 * - 发光数字效果
 */
export default function DataNumber({
  value,
  unit,
  color = 'cyber-blue',
  prefix,
  decimals = 0,
  duration = 1000,
  size = 'lg',
  fontWeight = 'bold',
  showSeparator = true,
  className,
}: DataNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const startTime = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);

  // 颜色映射
  const colorMap: Record<NumberColor, { text: string; glow: string }> = {
    'cyber-blue': {
      text: 'text-cyber-blue',
      glow: 'drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]',
    },
    'heat-orange': {
      text: 'text-heat-orange',
      glow: 'drop-shadow-[0_0_8px_rgba(255,107,53,0.6)]',
    },
    'gas-green': {
      text: 'text-gas-green',
      glow: 'drop-shadow-[0_0_8px_rgba(0,196,140,0.6)]',
    },
    'alert-red': {
      text: 'text-alert-red',
      glow: 'drop-shadow-[0_0_8px_rgba(255,59,92,0.6)]',
    },
    'safe-green': {
      text: 'text-safe-green',
      glow: 'drop-shadow-[0_0_8px_rgba(0,230,118,0.6)]',
    },
    'warning-yellow': {
      text: 'text-warning-yellow',
      glow: 'drop-shadow-[0_0_8px_rgba(255,193,7,0.6)]',
    },
    white: {
      text: 'text-white',
      glow: 'drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]',
    },
  };

  // 尺寸映射
  const sizeMap = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
    xl: 'text-4xl',
    '2xl': 'text-6xl',
  };

  // 单位尺寸映射（比数字小一号）
  const unitSizeMap = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-lg',
    '2xl': 'text-2xl',
  };

  // 字重映射
  const fontWeightMap = {
    normal: 'font-normal',
    medium: 'font-medium',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
  };

  // 数字变化时触发动画
  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const change = endValue - startValue;

    if (change === 0) return;

    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // 缓动函数：easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + change * easeProgress;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [value, duration]);

  // 格式化数字
  const formatNumber = (num: number): string => {
    const fixed = num.toFixed(decimals);
    if (showSeparator) {
      const parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    }
    return fixed;
  };

  // 将数字拆分为字符数组，用于逐位动画效果
  const numberString = formatNumber(displayValue);
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        'inline-flex items-baseline gap-1',
        'font-orbitron tabular-nums',
        className,
      )}
    >
      {/* 前缀符号 */}
      {prefix && (
        <span
          className={cn(
            colors.text,
            sizeMap[size],
            fontWeightMap[fontWeight],
            colors.glow,
            'opacity-80',
          )}
        >
          {prefix}
        </span>
      )}

      {/* 数字部分 */}
      <span
        className={cn(
          colors.text,
          sizeMap[size],
          fontWeightMap[fontWeight],
          colors.glow,
          'tracking-tight',
        )}
      >
        {/* 逐位渲染数字，支持小数点和千位分隔符 */}
        {numberString.split('').map((char, index) => {
          const isDigit = /\d/.test(char);
          return (
            <span
              key={index}
              className={cn(
                'inline-block transition-transform duration-100',
                isDigit && 'will-change-transform',
              )}
            >
              {char}
            </span>
          );
        })}
      </span>

      {/* 单位 */}
      {unit && (
        <span
          className={cn(
            colors.text,
            unitSizeMap[size],
            fontWeightMap.medium,
            colors.glow,
            'ml-1 opacity-70 tracking-wider',
          )}
        >
          {unit}
        </span>
      )}
    </div>
  );
}
