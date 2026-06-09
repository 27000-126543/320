import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, ScanFace, User } from 'lucide-react';

/**
 * 扫描状态类型
 * - idle: 待机，未开始扫描
 * - scanning: 扫描中，显示动画
 * - success: 扫描成功
 * - failed: 扫描失败
 */
type ScanStatus = 'idle' | 'scanning' | 'success' | 'failed';

/**
 * 六边形扫描框组件属性类型定义
 * @property status - 扫描状态
 * @property progress - 扫描进度 0-100（status为scanning时自动增长，也可外部控制）
 * @property autoProgress - 是否自动增长进度
 * @property size - 扫描框尺寸（像素，宽高相同）
 * @property showLabel - 是否显示状态文字
 * @property showProgressBar - 是否显示底部进度条
 * @property cornerLength - 四角装饰线长度
 * @property className - 自定义样式类名
 * @property onComplete - 扫描完成回调
 */
interface ScanFrameProps {
  status?: ScanStatus;
  progress?: number;
  autoProgress?: boolean;
  size?: number;
  showLabel?: boolean;
  showProgressBar?: boolean;
  cornerLength?: number;
  className?: string;
  onComplete?: (success: boolean) => void;
}

/**
 * 人脸识别用的六边形扫描框组件
 * 特点：
 * - 六边形外框设计，四角装饰线条
 * - 扫描线上下移动动画
 * - 进度条显示扫描进度
 * - 四种状态：待机/扫描中/成功/失败
 * - 支持自动进度或外部控制
 */
export default function ScanFrame({
  status = 'idle',
  progress: externalProgress,
  autoProgress = true,
  size = 280,
  showLabel = true,
  showProgressBar = true,
  cornerLength = 28,
  className,
  onComplete,
}: ScanFrameProps) {
  const [internalProgress, setInternalProgress] = useState(0);

  // 自动增长进度（仅在scanning状态且autoProgress为true时）
  useEffect(() => {
    if (status !== 'scanning' || !autoProgress) return;

    setInternalProgress(0);
    const interval = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + Math.random() * 3 + 1;
        if (next >= 100) {
          onComplete?.(true);
          return 100;
        }
        return next;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [status, autoProgress, onComplete]);

  // 状态重置
  useEffect(() => {
    if (status === 'idle') {
      setInternalProgress(0);
    }
  }, [status]);

  // 使用外部进度或内部进度
  const currentProgress = externalProgress ?? internalProgress;

  // 状态配置
  const statusConfig = {
    idle: {
      border: 'border-cyber-blue/50',
      glow: 'shadow-[0_0_20px_rgba(0,212,255,0.3),inset_0_0_30px_rgba(0,212,255,0.05)]',
      corner: 'border-cyber-blue',
      text: 'text-cyber-blue',
      progressBg: 'bg-cyber-blue/20',
      progressFill: 'bg-cyber-blue',
      label: '请将面部对准框内',
      icon: <ScanFace className="animate-pulse" />,
    },
    scanning: {
      border: 'border-cyber-blue/70',
      glow: 'shadow-[0_0_30px_rgba(0,212,255,0.5),inset_0_0_40px_rgba(0,212,255,0.1)]',
      corner: 'border-cyber-blue',
      text: 'text-cyber-blue',
      progressBg: 'bg-cyber-blue/20',
      progressFill: 'bg-gradient-to-r from-cyber-blue to-electric-blue',
      label: '正在识别中...',
      icon: <ScanFace className="animate-spin" />,
    },
    success: {
      border: 'border-safe-green/70',
      glow: 'shadow-[0_0_30px_rgba(0,230,118,0.5),inset_0_0_40px_rgba(0,230,118,0.1)]',
      corner: 'border-safe-green',
      text: 'text-safe-green',
      progressBg: 'bg-safe-green/20',
      progressFill: 'bg-gradient-to-r from-safe-green to-gas-green',
      label: '识别成功',
      icon: <ShieldCheck />,
    },
    failed: {
      border: 'border-alert-red/70',
      glow: 'shadow-[0_0_30px_rgba(255,59,92,0.5),inset_0_0_40px_rgba(255,59,92,0.1)]',
      corner: 'border-alert-red',
      text: 'text-alert-red',
      progressBg: 'bg-alert-red/20',
      progressFill: 'bg-gradient-to-r from-alert-red to-rose-500',
      label: '识别失败，请重试',
      icon: <User />,
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn('relative flex flex-col items-center gap-4', className)}
      style={{ width: size }}
    >
      {/* 六边形扫描框主体 */}
      <div
        className={cn(
          'relative rounded-2xl border-2 backdrop-blur-sm',
          'bg-gradient-to-br from-space-dark/60 via-space-blue/30 to-space-dark/60',
          config.border,
          config.glow,
          'overflow-hidden',
        )}
        style={{ width: size, height: size * 1.1 }}
      >
        {/* 六边形裁剪效果（通过clip-path模拟）*/}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          }}
        >
          {/* 内部网格背景 */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />

          {/* 扫描线动画 */}
          {status === 'scanning' && (
            <>
              {/* 主扫描线 */}
              <div
                className={cn(
                  'absolute left-0 right-0 h-1',
                  'bg-gradient-to-r from-transparent via-cyber-blue to-transparent',
                  'shadow-[0_0_20px_rgba(0,212,255,0.8)]',
                  'animate-[scan_2s_linear_infinite]',
                )}
              />
              {/* 扫描光带 */}
              <div
                className={cn(
                  'absolute left-0 right-0 h-20',
                  'bg-gradient-to-b from-transparent via-cyber-blue/20 to-transparent',
                  'animate-[scan_2s_linear_infinite]',
                )}
              />
            </>
          )}

          {/* 成功时的绿色脉冲圈 */}
          {status === 'success' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full border-2 border-safe-green animate-ping opacity-30"
                  style={{ width: size * 0.5, height: size * 0.5, transform: 'translate(-50%, -50%)' }}
                />
                <div
                  className="absolute inset-0 rounded-full border-2 border-safe-green animate-ping opacity-20"
                  style={{
                    width: size * 0.6,
                    height: size * 0.6,
                    transform: 'translate(-50%, -50%)',
                    animationDelay: '0.3s',
                  }}
                />
              </div>
            </div>
          )}

          {/* 中央图标 */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              config.text,
              status === 'scanning' ? 'opacity-40' : 'opacity-70',
            )}
          >
            <div className="transform scale-[4] opacity-20">
              {config.icon}
            </div>
          </div>
        </div>

        {/* 左上角装饰 */}
        <div
          className={cn('absolute top-4 left-4 z-10', config.corner)}
          style={{
            width: cornerLength,
            height: cornerLength,
            borderTopWidth: 3,
            borderLeftWidth: 3,
            borderTopLeftRadius: 6,
          }}
        />
        {/* 右上角装饰 */}
        <div
          className={cn('absolute top-4 right-4 z-10', config.corner)}
          style={{
            width: cornerLength,
            height: cornerLength,
            borderTopWidth: 3,
            borderRightWidth: 3,
            borderTopRightRadius: 6,
          }}
        />
        {/* 左下角装饰 */}
        <div
          className={cn('absolute bottom-4 left-4 z-10', config.corner)}
          style={{
            width: cornerLength,
            height: cornerLength,
            borderBottomWidth: 3,
            borderLeftWidth: 3,
            borderBottomLeftRadius: 6,
          }}
        />
        {/* 右下角装饰 */}
        <div
          className={cn('absolute bottom-4 right-4 z-10', config.corner)}
          style={{
            width: cornerLength,
            height: cornerLength,
            borderBottomWidth: 3,
            borderRightWidth: 3,
            borderBottomRightRadius: 6,
          }}
        />

        {/* 人脸位置参考线（椭圆） */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div
              className={cn(
                'rounded-full border border-dashed opacity-40',
                config.corner.replace('border-', 'border-'),
              )}
              style={{
                width: size * 0.55,
                height: size * 0.7,
              }}
            />
          </div>
        )}
      </div>

      {/* 状态文字标签 */}
      {showLabel && (
        <div className="flex items-center gap-2">
          <span className={cn('animate-pulse', config.text)}>
            {status === 'success' ? <ShieldCheck size={18} /> : <ScanFace size={18} />}
          </span>
          <span
            className={cn(
              'font-orbitron text-sm tracking-wider uppercase',
              config.text,
            )}
          >
            {config.label}
          </span>
        </div>
      )}

      {/* 进度条 */}
      {showProgressBar && (status === 'scanning' || status === 'success' || status === 'failed') && (
        <div className="w-full flex flex-col gap-1">
          <div
            className={cn(
              'relative h-2 rounded-full overflow-hidden',
              config.progressBg,
              'border border-white/10',
            )}
          >
            {/* 进度条填充 */}
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300 ease-out',
                config.progressFill,
                status === 'scanning' && 'shadow-[0_0_10px_currentColor]',
              )}
              style={{
                width: `${Math.min(currentProgress, 100)}%`,
              }}
            />
            {/* 进度条条纹 */}
            {status === 'scanning' && (
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)',
                  animation: 'stripe-move 1s linear infinite',
                }}
              />
            )}
          </div>
          {/* 进度百分比文字 */}
          <div className={cn('text-xs text-right font-orbitron tabular-nums', config.text)}>
            {Math.round(currentProgress)}%
          </div>
        </div>
      )}
    </div>
  );
}
