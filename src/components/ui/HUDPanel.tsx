import { useState, ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * HUD面板组件属性类型定义
 * @property title - 面板标题
 * @property children - 面板内容
 * @property collapsible - 是否可折叠
 * @property defaultCollapsed - 默认是否折叠
 * @property className - 自定义样式类名
 * @property accentColor - 强调色（四角装饰和边框颜色）
 * @property headerExtra - 标题栏右侧额外内容
 */
interface HUDPanelProps {
  title?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  accentColor?: 'cyber-blue' | 'heat-orange' | 'gas-green' | 'alert-red';
  headerExtra?: ReactNode;
}

/**
 * 带科技感四角装饰的HUD半透明面板容器
 * 特点：
 * - 四角科技感装饰线条
 * - 半透明渐变背景
 * - 可选折叠功能
 * - 支持多种强调色
 */
export default function HUDPanel({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className,
  accentColor = 'cyber-blue',
  headerExtra,
}: HUDPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // 根据强调色获取对应的颜色类
  const accentMap = {
    'cyber-blue': {
      border: 'border-cyber-blue/30',
      corner: 'bg-cyber-blue',
      shadow: 'shadow-hud',
      title: 'text-cyber-blue',
      glow: 'shadow-[0_0_15px_rgba(0,212,255,0.3)]',
    },
    'heat-orange': {
      border: 'border-heat-orange/30',
      corner: 'bg-heat-orange',
      shadow: 'shadow-[inset_0_0_30px_rgba(255,107,53,0.1),0_0_20px_rgba(255,107,53,0.15)]',
      title: 'text-heat-orange',
      glow: 'shadow-[0_0_15px_rgba(255,107,53,0.3)]',
    },
    'gas-green': {
      border: 'border-gas-green/30',
      corner: 'bg-gas-green',
      shadow: 'shadow-[inset_0_0_30px_rgba(0,196,140,0.1),0_0_20px_rgba(0,196,140,0.15)]',
      title: 'text-gas-green',
      glow: 'shadow-[0_0_15px_rgba(0,196,140,0.3)]',
    },
    'alert-red': {
      border: 'border-alert-red/30',
      corner: 'bg-alert-red',
      shadow: 'shadow-[inset_0_0_30px_rgba(255,59,92,0.1),0_0_20px_rgba(255,59,92,0.15)]',
      title: 'text-alert-red',
      glow: 'shadow-[0_0_15px_rgba(255,59,92,0.3)]',
    },
  };

  const colors = accentMap[accentColor];

  return (
    <div
      className={cn(
        'relative rounded-md border backdrop-blur-sm',
        'bg-gradient-to-br from-space-dark/80 via-space-blue/50 to-space-dark/80',
        colors.border,
        colors.shadow,
        className,
      )}
    >
      {/* 左上角装饰 */}
      <div
        className={cn(
          'absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-sm',
          colors.corner.replace('bg-', 'border-'),
        )}
      />
      {/* 右上角装饰 */}
      <div
        className={cn(
          'absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-sm',
          colors.corner.replace('bg-', 'border-'),
        )}
      />
      {/* 左下角装饰 */}
      <div
        className={cn(
          'absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-sm',
          colors.corner.replace('bg-', 'border-'),
        )}
      />
      {/* 右下角装饰 */}
      <div
        className={cn(
          'absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-sm',
          colors.corner.replace('bg-', 'border-'),
        )}
      />

      {/* 标题栏 */}
      {title && (
        <div
          className={cn(
            'flex items-center justify-between px-4 py-2 border-b',
            colors.border,
            'bg-gradient-to-r from-transparent via-white/5 to-transparent',
          )}
        >
          <div className="flex items-center gap-2">
            {/* 标题前的小装饰点 */}
            <span className={cn('w-2 h-2 rounded-full', colors.corner, colors.glow, 'animate-pulse')} />
            <h3 className={cn('font-orbitron text-sm font-bold tracking-wider uppercase', colors.title)}>
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                  'p-1 rounded transition-all duration-300 hover:bg-white/10',
                  colors.title,
                )}
              >
                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          isCollapsed && collapsible ? 'max-h-0 py-0' : 'p-4',
        )}
      >
        {children}
      </div>
    </div>
  );
}
