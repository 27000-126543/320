import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  User,
} from 'lucide-react';

/**
 * 审批节点状态类型
 * - pending: 待审批
 * - approved: 已通过
 * - rejected: 已驳回
 * - current: 当前审批中
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'current';

/**
 * 单个审批节点类型定义
 */
export interface ApprovalNode {
  level: number;
  title: string;
  role: string;
  approver?: string;
  status: ApprovalStatus;
  time?: string;
  comment?: string;
}

/**
 * 三级审批横向发光进度条组件属性类型定义
 * @property nodes - 审批节点数组（支持1-N级）
 * @property size - 节点大小
 * @property showDetails - 是否显示节点详情（审批人、时间、意见）
 * @property showConnector - 是否显示连接线
 * @property pulseAnimation - 是否启用节点脉冲动画
 * @property className - 自定义样式类名
 */
interface ApprovalProgressProps {
  nodes: ApprovalNode[];
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  showConnector?: boolean;
  pulseAnimation?: boolean;
  className?: string;
}

/**
 * 三级审批横向发光进度条
 * 特点：
 * - 节点脉冲光环（当前节点/已通过节点）
 * - 不同状态对应不同颜色
 * - 连接线发光效果（已完成段）
 * - 显示审批人、角色、时间、意见
 * - 支持任意级数（默认3级）
 */
export default function ApprovalProgress({
  nodes,
  size = 'md',
  showDetails = true,
  showConnector = true,
  pulseAnimation = true,
  className,
}: ApprovalProgressProps) {
  // 状态配置映射
  const statusConfig: Record<ApprovalStatus, {
    bg: string;
    border: string;
    text: string;
    glow: string;
    connector: string;
    label: string;
    labelBg: string;
    icon: ReactNode;
  }> = {
    pending: {
      bg: 'bg-white/5',
      border: 'border-white/20',
      text: 'text-white/40',
      glow: '',
      connector: 'bg-white/10',
      label: '待审批',
      labelBg: 'bg-white/10 text-white/50 border-white/20',
      icon: <Clock size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />,
    },
    current: {
      bg: 'bg-cyber-blue/20',
      border: 'border-cyber-blue',
      text: 'text-cyber-blue',
      glow: 'shadow-[0_0_20px_rgba(0,212,255,0.7),0_0_40px_rgba(0,212,255,0.3),inset_0_0_20px_rgba(0,212,255,0.2)]',
      connector: 'bg-gradient-to-r from-safe-green/80 via-cyber-blue/50 to-white/10',
      label: '审批中',
      labelBg: 'bg-cyber-blue/20 text-cyber-blue border-cyber-blue/50',
      icon: <Clock size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} className={pulseAnimation ? 'animate-pulse' : ''} />,
    },
    approved: {
      bg: 'bg-safe-green/20',
      border: 'border-safe-green',
      text: 'text-safe-green',
      glow: 'shadow-[0_0_15px_rgba(0,230,118,0.6),0_0_30px_rgba(0,230,118,0.25),inset_0_0_15px_rgba(0,230,118,0.15)]',
      connector: 'bg-gradient-to-r from-safe-green to-safe-green/80',
      label: '已通过',
      labelBg: 'bg-safe-green/20 text-safe-green border-safe-green/50',
      icon: <CheckCircle2 size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />,
    },
    rejected: {
      bg: 'bg-alert-red/20',
      border: 'border-alert-red',
      text: 'text-alert-red',
      glow: 'shadow-[0_0_15px_rgba(255,59,92,0.6),0_0_30px_rgba(255,59,92,0.25),inset_0_0_15px_rgba(255,59,92,0.15)]',
      connector: 'bg-gradient-to-r from-alert-red to-alert-red/50',
      label: '已驳回',
      labelBg: 'bg-alert-red/20 text-alert-red border-alert-red/50',
      icon: <XCircle size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />,
    },
  };

  // 尺寸映射
  const sizeConfig = {
    sm: {
      node: 'w-8 h-8',
      nodeInner: 'w-5 h-5',
      title: 'text-xs',
      role: 'text-[10px]',
      detail: 'text-[10px]',
      connector: 'h-1',
    },
    md: {
      node: 'w-12 h-12',
      nodeInner: 'w-7 h-7',
      title: 'text-sm',
      role: 'text-xs',
      detail: 'text-xs',
      connector: 'h-1.5',
    },
    lg: {
      node: 'w-16 h-16',
      nodeInner: 'w-10 h-10',
      title: 'text-base',
      role: 'text-sm',
      detail: 'text-sm',
      connector: 'h-2',
    },
  };

  const sizes = sizeConfig[size];

  return (
    <div className={cn('w-full', className)}>
      {/* 进度条主体 */}
      <div className="relative flex items-start justify-between gap-2">
        {nodes.map((node, index) => {
          const config = statusConfig[node.status];
          const isLast = index === nodes.length - 1;
          // 判断前一个节点是否已完成（用于决定连接线颜色）
          const prevApproved = index > 0 &&
            (nodes[index - 1].status === 'approved' || nodes[index - 1].status === 'current');

          return (
            <div
              key={node.level}
              className="flex-1 flex flex-col items-center relative"
              style={{ minWidth: 0 }}
            >
              {/* 连接线（节点之间，放在节点容器之前以保证层级正确）*/}
              {showConnector && !isLast && (
                <div className="absolute top-0 left-1/2 w-full z-0">
                  <div className="relative" style={{ height: sizes.node.split(' ')[0] }}>
                    <div className="absolute top-1/2 left-0 w-full -translate-y-1/2">
                      <div className="relative h-full flex items-center">
                        {/* 连接线背景 */}
                        <div
                          className={cn(
                            'absolute inset-x-0 rounded-full overflow-hidden',
                            sizes.connector,
                            'bg-white/5',
                          )}
                        >
                          {/* 连接线发光填充 */}
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              prevApproved && node.status === 'pending'
                                ? config.connector
                                : node.status === 'approved' || node.status === 'current' || node.status === 'rejected'
                                ? statusConfig[nodes[index].status === 'current' ? 'current' : 'approved'].connector
                                : '',
                            )}
                            style={{
                              width:
                                node.status === 'approved' || node.status === 'current' || node.status === 'rejected'
                                  ? '100%'
                                  : prevApproved
                                  ? '50%'
                                  : '0%',
                            }}
                          />
                          {/* 连接线发光扫光效果 */}
                          {prevApproved && node.status !== 'pending' && (
                            <div
                              className={cn(
                                'absolute inset-0 rounded-full opacity-50',
                                statusConfig.approved.connector,
                                pulseAnimation ? 'animate-[scan_2s_linear_infinite]' : '',
                              )}
                              style={{
                                background:
                                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 2s linear infinite',
                              }}
                            />
                          )}
                        </div>
                        {/* 连接线箭头（可选，显示方向）*/}
                        {(node.status === 'approved' || node.status === 'current') && (
                          <div
                            className={cn(
                              'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2',
                              'w-4 h-4 rounded-full flex items-center justify-center',
                              'bg-space-dark z-10',
                              config.text,
                            )}
                          >
                            <ArrowRight size={10} className="animate-pulse" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 节点圆形 */}
              <div className="relative z-10">
                {/* 脉冲光环（当前节点和已通过节点）*/}
                {pulseAnimation && (node.status === 'current' || node.status === 'approved') && (
                  <>
                    <span
                      className={cn(
                        'absolute inset-0 rounded-full animate-ping opacity-30',
                        config.bg.replace('/20', '/60'),
                      )}
                      style={{ animationDuration: '2s' }}
                    />
                    <span
                      className={cn(
                        'absolute -inset-2 rounded-full animate-ping opacity-15',
                        config.bg.replace('/20', '/40'),
                      )}
                      style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}
                    />
                  </>
                )}

                {/* 节点主体 */}
                <div
                  className={cn(
                    'relative rounded-full border-2 flex items-center justify-center',
                    'backdrop-blur-sm transition-all duration-300',
                    sizes.node,
                    config.bg,
                    config.border,
                    config.text,
                    config.glow,
                  )}
                >
                  {/* 内圈装饰 */}
                  <div
                    className={cn(
                      'absolute inset-1 rounded-full border',
                      node.status === 'pending' ? 'border-white/10' : `${config.border.replace('border-', 'border-')}/30`,
                    )}
                  />
                  {/* 中心图标 */}
                  <div className="relative z-10">{config.icon}</div>
                  {/* 节点序号（小号时显示在左上）*/}
                  <div
                    className={cn(
                      'absolute -top-1 -left-1 rounded-full',
                      'w-5 h-5 flex items-center justify-center',
                      'font-orbitron font-bold',
                      'border-2 border-space-dark',
                      config.bg,
                      config.border,
                      config.text,
                      size === 'sm' ? 'text-[9px]' : 'text-[10px]',
                    )}
                  >
                    {node.level}
                  </div>
                </div>
              </div>

              {/* 节点标题和状态标签 */}
              <div className="mt-3 text-center w-full px-1">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span
                    className={cn(
                      'font-orbitron font-bold tracking-wider',
                      sizes.title,
                      node.status === 'pending' ? 'text-white/50' : config.text,
                    )}
                  >
                    {node.title}
                  </span>
                </div>

                {/* 状态标签 */}
                <span
                  className={cn(
                    'inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium mb-1.5',
                    config.labelBg,
                  )}
                >
                  {config.label}
                </span>

                {/* 节点详情 */}
                {showDetails && (
                  <div
                    className={cn(
                      'space-y-0.5 text-left max-w-[160px] mx-auto',
                      sizes.detail,
                      'text-white/60',
                    )}
                  >
                    {/* 角色 */}
                    <div className="flex items-center gap-1 truncate">
                      <User size={10} className="shrink-0 opacity-60" />
                      <span className="truncate opacity-80">{node.role}</span>
                    </div>
                    {/* 审批人 */}
                    {node.approver && (
                      <div
                        className={cn(
                          'font-medium truncate',
                          node.status === 'pending' ? 'text-white/30' : config.text,
                        )}
                      >
                        {node.approver}
                      </div>
                    )}
                    {/* 审批时间 */}
                    {node.time && (
                      <div className="truncate font-orbitron text-white/40">
                        {node.time}
                      </div>
                    )}
                    {/* 审批意见 */}
                    {node.comment && (
                      <div
                        className={cn(
                          'mt-1 p-1.5 rounded border text-[10px] leading-relaxed',
                          node.status === 'rejected'
                            ? 'bg-alert-red/10 border-alert-red/30 text-alert-red/80'
                            : 'bg-cyber-blue/10 border-cyber-blue/30 text-white/70',
                        )}
                      >
                        "{node.comment}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 便捷方法：根据审批状态字符串数组快速生成标准3级审批节点
 */
export function createStandardApprovalNodes(
  statuses: ApprovalStatus[],
  overrides?: Partial<ApprovalNode>[],
): ApprovalNode[] {
  const defaultNodes: ApprovalNode[] = [
    {
      level: 1,
      title: '一级审批',
      role: '调度员',
      status: statuses[0] || 'pending',
    },
    {
      level: 2,
      title: '二级审批',
      role: '能源中心主任',
      status: statuses[1] || 'pending',
    },
    {
      level: 3,
      title: '三级审批',
      role: '市能源局',
      status: statuses[2] || 'pending',
    },
  ];

  if (!overrides) return defaultNodes;

  return defaultNodes.map((node, index) => ({
    ...node,
    ...(overrides[index] || {}),
  }));
}
