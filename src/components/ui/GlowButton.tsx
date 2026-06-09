import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 发光按钮变体类型
 * - primary: 主色（蓝色），用于主要操作
 * - danger: 危险（红色），用于删除、警告等操作
 * - success: 成功（绿色），用于确认、完成等操作
 * - warning: 警告（橙色），用于提醒、注意等操作
 */
type GlowButtonVariant = 'primary' | 'danger' | 'success' | 'warning';

/**
 * 发光按钮尺寸类型
 */
type GlowButtonSize = 'sm' | 'md' | 'lg';

/**
 * 发光按钮组件属性类型定义
 * @property variant - 按钮变体类型
 * @property size - 按钮尺寸
 * @property children - 按钮内容
 * @property icon - 前置图标
 * @property iconRight - 后置图标
 * @property loading - 是否加载中
 * @property glowIntensity - 发光强度 1-3
 * @property className - 自定义样式类名
 */
interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlowButtonVariant;
  size?: GlowButtonSize;
  children: ReactNode;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  glowIntensity?: 1 | 2 | 3;
  className?: string;
}

/**
 * 带发光效果的科技风按钮
 * 特点：
 * - 四种颜色变体：主色/危险/成功/警告
 * - 渐变背景 + 发光阴影
 * - 悬停时增强发光效果
 * - 点击时缩放反馈
 * - 支持加载状态
 */
export default function GlowButton({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  iconRight,
  loading = false,
  glowIntensity = 2,
  className,
  disabled,
  ...props
}: GlowButtonProps) {
  // 变体样式映射
  const variantMap: Record<GlowButtonVariant, {
    bg: string;
    border: string;
    text: string;
    glow: string;
    hoverGlow: string;
    active: string;
  }> = {
    primary: {
      bg: 'bg-gradient-to-r from-cyber-blue/80 to-electric-blue/80',
      border: 'border-cyber-blue/60',
      text: 'text-white',
      glow: glowIntensity === 1
        ? 'shadow-[0_0_10px_rgba(0,212,255,0.3)]'
        : glowIntensity === 2
        ? 'shadow-glow-blue'
        : 'shadow-[0_0_30px_rgba(0,212,255,0.7),0_0_60px_rgba(0,212,255,0.4)]',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(0,212,255,0.8),0_0_60px_rgba(0,212,255,0.5)]',
      active: 'active:from-cyber-blue active:to-electric-blue',
    },
    danger: {
      bg: 'bg-gradient-to-r from-alert-red/80 to-rose-600/80',
      border: 'border-alert-red/60',
      text: 'text-white',
      glow: glowIntensity === 1
        ? 'shadow-[0_0_10px_rgba(255,59,92,0.3)]'
        : glowIntensity === 2
        ? 'shadow-glow-red'
        : 'shadow-[0_0_30px_rgba(255,59,92,0.7),0_0_60px_rgba(255,59,92,0.4)]',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(255,59,92,0.8),0_0_60px_rgba(255,59,92,0.5)]',
      active: 'active:from-alert-red active:to-rose-600',
    },
    success: {
      bg: 'bg-gradient-to-r from-safe-green/80 to-gas-green/80',
      border: 'border-safe-green/60',
      text: 'text-white',
      glow: glowIntensity === 1
        ? 'shadow-[0_0_10px_rgba(0,230,118,0.3)]'
        : glowIntensity === 2
        ? 'shadow-glow-green'
        : 'shadow-[0_0_30px_rgba(0,230,118,0.7),0_0_60px_rgba(0,230,118,0.4)]',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(0,230,118,0.8),0_0_60px_rgba(0,230,118,0.5)]',
      active: 'active:from-safe-green active:to-gas-green',
    },
    warning: {
      bg: 'bg-gradient-to-r from-warning-yellow/80 to-heat-orange/80',
      border: 'border-warning-yellow/60',
      text: 'text-space-dark',
      glow: glowIntensity === 1
        ? 'shadow-[0_0_10px_rgba(255,193,7,0.3)]'
        : glowIntensity === 2
        ? 'shadow-glow-orange'
        : 'shadow-[0_0_30px_rgba(255,193,7,0.7),0_0_60px_rgba(255,107,53,0.4)]',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(255,193,7,0.8),0_0_60px_rgba(255,107,53,0.5)]',
      active: 'active:from-warning-yellow active:to-heat-orange',
    },
  };

  // 尺寸样式映射
  const sizeMap: Record<GlowButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5',
  };

  const styles = variantMap[variant];

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        // 基础样式
        'relative inline-flex items-center justify-center font-medium',
        'rounded-lg border backdrop-blur-sm',
        'transition-all duration-300 ease-out',
        'font-orbitron tracking-wider uppercase',
        // 悬停和激活效果
        'hover:scale-[1.02] hover:-translate-y-0.5',
        'active:scale-[0.98] active:translate-y-0',
        // 禁用和加载状态
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0',
        // 变体和尺寸样式
        styles.bg,
        styles.border,
        styles.text,
        styles.glow,
        styles.hoverGlow,
        styles.active,
        sizeMap[size],
        className,
      )}
    >
      {/* 按钮内部发光层 */}
      <span
        className={cn(
          'absolute inset-0 rounded-lg opacity-50',
          'bg-gradient-to-b from-white/20 via-transparent to-transparent',
          'pointer-events-none',
        )}
      />

      {/* 加载动画 */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center rounded-lg overflow-hidden">
          <span
            className={cn(
              'absolute inset-0 animate-[scan_1s_linear_infinite]',
              'bg-gradient-to-b from-transparent via-white/30 to-transparent',
            )}
          />
        </span>
      )}

      {/* 前置图标 */}
      {icon && <span className={cn('relative z-10', loading && 'opacity-0')}>{icon}</span>}

      {/* 按钮文字 */}
      <span className={cn('relative z-10', loading && 'opacity-50')}>{children}</span>

      {/* 后置图标 */}
      {iconRight && <span className={cn('relative z-10', loading && 'opacity-0')}>{iconRight}</span>}
    </button>
  );
}
