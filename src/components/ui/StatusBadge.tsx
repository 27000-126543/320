import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PauseCircle,
  Loader2,
  Circle,
} from 'lucide-react';

/**
 * 运行状态类型定义
 * - running: 运行中（绿色脉冲）
 * - stopped: 已停止（红色）
 * - warning: 警告（黄色脉冲）
 * - idle: 待机（蓝色）
 * - error: 故障（红色闪烁）
 * - maintenance: 维护中（橙色）
 */
export type StatusType = 'running' | 'stopped' | 'warning' | 'idle' | 'error' | 'maintenance';

/**
 * 状态标签组件属性类型定义
 * @property status - 运行状态
 * @property label - 自定义显示文字（不传则使用默认状态名）
 * @property showIcon - 是否显示图标
 * @property pulse - 是否启用脉冲动画
 * @property size - 尺寸大小
 * @property className - 自定义样式类名
 */
interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 运行状态标签组件
 * 特点：
 * - 根据状态自动显示对应颜色和图标
 * - 运行/警告/故障状态带脉冲动画
 * - 支持自定义文字和尺寸
 */
export default function StatusBadge({
  status,
  label,
  showIcon = true,
  pulse = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  // 状态配置映射
  const statusConfig: Record<StatusType, {
    label: string;
    icon: ReactNode;
    bg: string;
    border: string;
    text: string;
    dot: string;
    glow: string;
    animation: string;
  }> = {
    running: {
      label: '运行中',
      icon: <CheckCircle2 size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
      bg: 'bg-safe-green/15',
      border: 'border-safe-green/40',
      text: 'text-safe-green',
      dot: 'bg-safe-green',
      glow: 'shadow-[0_0_8px_rgba(0,230,118,0.6)]',
      animation: pulse ? 'animate-pulse' : '',
    },
    stopped: {
      label: '已停止',
      icon: <XCircle size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
      bg: 'bg-alert-red/15',
      border: 'border-alert-red/40',
      text: 'text-alert-red',
      dot: 'bg-alert-red',
      glow: '',
      animation: '',
    },
    warning: {
      label: '警告',
      icon: <AlertTriangle size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
      bg: 'bg-warning-yellow/15',
      border: 'border-warning-yellow/40',
      text: 'text-warning-yellow',
      dot: 'bg-warning-yellow',
      glow: 'shadow-[0_0_8px_rgba(255,193,7,0.6)]',
      animation: pulse ? 'animate-pulse' : '',
    },
    idle: {
      label: '待机',
      icon: <PauseCircle size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
      bg: 'bg-cyber-blue/15',
      border: 'border-cyber-blue/40',
      text: 'text-cyber-blue',
      dot: 'bg-cyber-blue',
      glow: '',
      animation: '',
    },
    error: {
      label: '故障',
      icon: <XCircle size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
      bg: 'bg-alert-red/20',
      border: 'border-alert-red/60',
      text: 'text-alert-red',
      dot: 'bg-alert-red',
      glow: 'shadow-[0_0_12px_rgba(255,59,92,0.8)]',
      animation: pulse ? 'animate-[blink_0.5s_step-end_infinite]' : '',
    },
    maintenance: {
      label: '维护中',
      icon: <Loader2 size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />,
      bg: 'bg-heat-orange/15',
      border: 'border-heat-orange/40',
      text: 'text-heat-orange',
      dot: 'bg-heat-orange',
      glow: 'shadow-[0_0_8px_rgba(255,107,53,0.6)]',
      animation: pulse ? 'animate-spin' : '',
    },
  };

  // 尺寸样式映射
  const sizeMap = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };

  const config = statusConfig[status];
  const displayLabel = label || config.label;

  return (
    <div
      className={cn(
        // 基础样式
        'inline-flex items-center rounded-full border backdrop-blur-sm',
        'font-medium tracking-wide',
        // 变体样式
        config.bg,
        config.border,
        config.text,
        sizeMap[size],
        className,
      )}
    >
      {/* 状态指示圆点 */}
      <span className="relative flex h-2 w-2">
        {/* 脉冲光环外层 */}
        {pulse && (status === 'running' || status === 'warning' || status === 'error') && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              config.dot,
              'animate-ping',
            )}
          />
        )}
        {/* 实心圆点 */}
        <span
          className={cn(
            'relative inline-flex rounded-full h-2 w-2',
            config.dot,
            config.glow,
          )}
        />
      </span>

      {/* 图标 */}
      {showIcon && (
        <span className={status === 'maintenance' && pulse ? 'animate-spin' : ''}>
          {config.icon}
        </span>
      )}

      {/* 文字标签 */}
      <span className={cn(status === 'error' && pulse ? 'animate-blink' : '')}>
        {displayLabel}
      </span>
    </div>
  );
}

/**
 * 圆形状态指示灯（简化版，用于表格、列表等紧凑场景）
 */
export function StatusDot({
  status,
  size = 'md',
  pulse = true,
  className,
}: {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}) {
  const dotColorMap: Record<StatusType, string> = {
    running: 'bg-safe-green',
    stopped: 'bg-alert-red',
    warning: 'bg-warning-yellow',
    idle: 'bg-cyber-blue',
    error: 'bg-alert-red',
    maintenance: 'bg-heat-orange',
  };

  const sizeMap = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  const glowMap: Record<StatusType, string> = {
    running: 'shadow-[0_0_6px_rgba(0,230,118,0.8)]',
    stopped: '',
    warning: 'shadow-[0_0_6px_rgba(255,193,7,0.8)]',
    idle: '',
    error: 'shadow-[0_0_8px_rgba(255,59,92,0.8)]',
    maintenance: 'shadow-[0_0_6px_rgba(255,107,53,0.8)]',
  };

  const needPulse = pulse && ['running', 'warning', 'error', 'maintenance'].includes(status);

  return (
    <span className="relative flex shrink-0">
      {needPulse && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            dotColorMap[status],
            'animate-ping',
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          dotColorMap[status],
          glowMap[status],
          sizeMap[size],
          className,
        )}
      />
    </span>
  );
}
