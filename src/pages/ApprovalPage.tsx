import { useState, useMemo } from 'react';
import {
  FileCheck, Clock, CheckCircle2, XCircle, User, Zap,
  Search, Filter, ChevronRight, Send, ThumbsUp, ThumbsDown,
  X, AlertTriangle, History, Layers, ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SideMenu from '@/components/panels/SideMenu';
import HUDPanel from '@/components/ui/HUDPanel';
import ApprovalProgress, { ApprovalNode, ApprovalStatus } from '@/components/charts/ApprovalProgress';
import { useApprovalStore } from '@/store/useApprovalStore';
import { useUserStore } from '@/store/useUserStore';
import {
  ComplementaryPlan, PlanStatus, ROLE_LABEL, PlanType, ROLE_LEVEL,
} from '@/types';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/utils/formatters';

/**
 * 方案类型中文映射
 */
const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  heat_pump_storage: '热泵蓄热',
  gas_booster_peak: '燃气调峰',
  battery_discharge: '储能放电',
  grid_transfer: '电网转供',
};

/**
 * 方案状态中文映射
 */
const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  pending: '待一级审批',
  approved_level1: '待二级审批',
  approved_level2: '待三级审批',
  executing: '执行中',
  completed: '已完成',
  rejected: '已驳回',
};

/**
 * 方案状态颜色映射
 */
const PLAN_STATUS_COLOR: Record<PlanStatus, string> = {
  pending: '#FFC107',
  approved_level1: '#00D4FF',
  approved_level2: '#9C27B0',
  executing: '#00E676',
  completed: '#4CAF50',
  rejected: '#FF3B5C',
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subText?: string;
}

/**
 * 顶部统计卡片组件
 */
function StatCard({ title, value, icon, color, subText }: StatCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg border p-4 overflow-hidden backdrop-blur-sm',
        'border-cyber-blue/30 bg-space-blue/60 hover:border-cyber-blue/60 transition-all duration-300',
      )}
      style={{ boxShadow: `inset 0 0 20px ${color}15, 0 0 15px ${color}10` }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
        <div className="absolute inset-0 rounded-full" style={{ backgroundColor: color, filter: 'blur(24px)' }} />
      </div>
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs text-cyber-blue/70 font-medium tracking-wide mb-1">{title}</div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold font-orbitron"
              style={{ color }}
            >
              {value}
            </span>
            {subText && <span className="text-xs text-gray-500">{subText}</span>}
          </div>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 获取方案当前需要的审批层级
 */
function getCurrentApprovalLevel(status: PlanStatus): 1 | 2 | 3 | null {
  if (status === 'pending') return 1;
  if (status === 'approved_level1') return 2;
  if (status === 'approved_level2') return 3;
  return null;
}

/**
 * 将方案的approvals转换为ApprovalProgress需要的节点
 */
function planToApprovalNodes(plan: ComplementaryPlan): ApprovalNode[] {
  const currentLevel = getCurrentApprovalLevel(plan.status);

  return plan.approvals.map(a => {
    let status: ApprovalStatus;
    if (plan.status === 'rejected') {
      status = a.action === 'reject' ? 'rejected' : a.action === 'approve' ? 'approved' : 'pending';
    } else if (a.action === 'approve') {
      status = 'approved';
    } else if (a.level === currentLevel) {
      status = 'current';
    } else {
      status = 'pending';
    }

    return {
      level: a.level,
      title: `第${a.level}级审批`,
      role: a.role,
      approver: a.approver || undefined,
      status,
      time: a.time || undefined,
      comment: a.comment || undefined,
    };
  });
}

interface PlanDetailModalProps {
  plan: ComplementaryPlan | null;
  onClose: () => void;
  onApprove: (planId: string, level: 1 | 2 | 3, comment: string) => void;
  onReject: (planId: string, level: 1 | 2 | 3, comment: string) => void;
  userCanApproveLevel: 1 | 2 | 3 | null;
  currentUserName: string;
  currentUserRole: string;
}

/**
 * 方案详情弹窗组件
 */
function PlanDetailModal({
  plan,
  onClose,
  onApprove,
  onReject,
  userCanApproveLevel,
  currentUserName,
  currentUserRole,
}: PlanDetailModalProps) {
  const [comment, setComment] = useState('');

  if (!plan) return null;

  const currentLevel = getCurrentApprovalLevel(plan.status);
  const canOperate = currentLevel !== null && userCanApproveLevel !== null && userCanApproveLevel >= currentLevel;
  const isFinalLevel = currentLevel === 3;

  const handleApprove = () => {
    if (!canOperate || currentLevel === null) return;
    onApprove(plan.id, currentLevel, comment || '同意');
    setComment('');
  };

  const handleReject = () => {
    if (!canOperate || currentLevel === null) return;
    onReject(plan.id, currentLevel, comment || '驳回');
    setComment('');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-dark/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl border border-cyber-blue/40 bg-space-dark/95 shadow-[0_0_50px_rgba(0,212,255,0.2)]"
          onClick={e => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-cyber-blue/30 bg-gradient-to-r from-space-dark via-space-blue/80 to-space-dark backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyber-blue/30 to-electric-blue/30 flex items-center justify-center border border-cyber-blue/50">
                <Layers size={20} className="text-cyber-blue" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-orbitron tracking-wide">{plan.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: `${PLAN_STATUS_COLOR[plan.status]}15`,
                      color: PLAN_STATUS_COLOR[plan.status],
                      border: `1px solid ${PLAN_STATUS_COLOR[plan.status]}40`,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: PLAN_STATUS_COLOR[plan.status] }}
                    />
                    {PLAN_STATUS_LABEL[plan.status]}
                  </span>
                  <span className="text-xs text-gray-500">{plan.createdAt}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <HUDPanel title="方案基本信息" accentColor="cyber-blue">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-cyber-blue/60 uppercase tracking-wider mb-1">方案类型</div>
                    <div className="text-sm text-white flex items-center gap-2">
                      <span className="px-2 py-1 rounded-md bg-cyber-blue/15 text-cyber-blue text-xs font-medium">
                        {PLAN_TYPE_LABEL[plan.type]}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-cyber-blue/60 uppercase tracking-wider mb-1">方案描述</div>
                    <div className="text-sm text-gray-300 leading-relaxed">{plan.description}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-cyber-blue/60 uppercase tracking-wider mb-1">触发条件</div>
                    <div className="text-sm text-gray-300 flex items-start gap-2">
                      <AlertTriangle size={14} className="text-warning-yellow shrink-0 mt-0.5" />
                      <span>{plan.triggerCondition}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-cyber-blue/60 uppercase tracking-wider mb-1">预期效果</div>
                    <div className="text-sm text-safe-green flex items-start gap-2">
                      <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                      <span>{plan.expectedEffect}</span>
                    </div>
                  </div>
                </div>
              </div>
            </HUDPanel>

            <HUDPanel title="三级审批进度" accentColor="cyber-blue">
              <ApprovalProgress nodes={planToApprovalNodes(plan)} size="md" showDetails />
            </HUDPanel>

            {canOperate && currentLevel !== null && (
              <HUDPanel
                title={`${isFinalLevel ? '终审' : `第${currentLevel}级`}审批操作`}
                accentColor="heat-orange"
                headerExtra={
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <User size={12} />
                    <span>{currentUserName} · {currentUserRole}</span>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-cyber-blue/60 uppercase tracking-wider mb-2">
                      审批意见
                    </label>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="请输入审批意见（选填，默认为'同意'或'驳回'）"
                      rows={3}
                      className="w-full rounded-lg border border-cyber-blue/30 bg-space-dark/60 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue/60 focus:bg-space-dark/80 transition resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={handleReject}
                      className="group flex items-center gap-2 px-5 py-2.5 rounded-lg border border-alert-red/50 bg-alert-red/10 text-alert-red hover:bg-alert-red/20 hover:border-alert-red transition-all"
                    >
                      <ThumbsDown size={16} className="group-hover:-translate-y-0.5 transition" />
                      <span className="text-sm font-medium">驳回方案</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      className="group flex items-center gap-2 px-5 py-2.5 rounded-lg border border-safe-green/50 bg-safe-green/10 text-safe-green hover:bg-safe-green/20 hover:border-safe-green transition-all shadow-[0_0_20px_rgba(0,230,118,0.15)]"
                    >
                      <ThumbsUp size={16} className="group-hover:-translate-y-0.5 transition" />
                      <span className="text-sm font-medium">
                        {isFinalLevel ? '终审通过，下发执行' : '通过审批'}
                      </span>
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </HUDPanel>
            )}

            {!canOperate && currentLevel !== null && (
              <div className="rounded-lg border border-warning-yellow/30 bg-warning-yellow/5 p-4 flex items-center gap-3">
                <AlertTriangle size={20} className="text-warning-yellow shrink-0" />
                <div className="text-sm">
                  <div className="text-warning-yellow font-medium">无当前层级审批权限</div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    该方案当前处于第{currentLevel}级审批阶段，您的角色权限不足，请等待对应层级审批人处理
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * 审批调度大屏主页面
 */
export default function ApprovalPage() {
  const { plans, approvePlan, rejectPlan } = useApprovalStore();
  const { currentUser } = useUserStore();
  const [selectedPlan, setSelectedPlan] = useState<ComplementaryPlan | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all');

  /**
   * 当前用户可审批的最高层级
   * operator(1)不可审批，dispatcher(2)可审批1级，director(3)可审批1-2级，bureau(4)可审批1-3级
   */
  const userApprovalLevel: 1 | 2 | 3 | null = useMemo(() => {
    if (!currentUser) return null;
    const level = ROLE_LEVEL[currentUser.role];
    if (level >= 4) return 3;
    if (level >= 3) return 2;
    if (level >= 2) return 1;
    return null;
  }, [currentUser]);

  /**
   * 统计数据
   */
  const stats = useMemo(() => {
    const pendingLevel1 = plans.filter(p => p.status === 'pending').length;
    const pendingLevel2 = plans.filter(p => p.status === 'approved_level1').length;
    const pendingLevel3 = plans.filter(p => p.status === 'approved_level2').length;
    const myPending = plans.filter(p => {
      const needLevel = getCurrentApprovalLevel(p.status);
      if (needLevel === null || userApprovalLevel === null) return false;
      return userApprovalLevel >= needLevel && needLevel === (
        userApprovalLevel === 1 ? 1 :
        userApprovalLevel === 2 ? (p.status === 'pending' ? 1 : p.status === 'approved_level1' ? 2 : 0) :
        (p.status === 'pending' ? 1 : p.status === 'approved_level1' ? 2 : p.status === 'approved_level2' ? 3 : 0)
      );
    }).length;
    const rejected = plans.filter(p => p.status === 'rejected').length;
    const executing = plans.filter(p => p.status === 'executing' || p.status === 'completed').length;

    return { pendingLevel1, pendingLevel2, pendingLevel3, myPending, rejected, executing };
  }, [plans, userApprovalLevel]);

  /**
   * 过滤后的方案列表
   */
  const filteredPlans = useMemo(() => {
    return plans
      .filter(p => statusFilter === 'all' || p.status === statusFilter)
      .filter(p =>
        !searchKeyword ||
        p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        p.description.toLowerCase().includes(searchKeyword.toLowerCase())
      )
      .sort((a, b) => {
        const order: Record<string, number> = {
          pending: 0, approved_level1: 1, approved_level2: 2,
          executing: 3, rejected: 4, completed: 5,
        };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
      });
  }, [plans, statusFilter, searchKeyword]);

  /**
   * 历史审批记录（从所有方案中提取）
   */
  const historyRecords = useMemo(() => {
    const records: Array<{
      id: string;
      planName: string;
      level: number;
      approver: string;
      role: string;
      action: 'approve' | 'reject';
      comment: string;
      time: string;
    }> = [];
    plans.forEach(p => {
      p.approvals.forEach(a => {
        if (a.action !== 'pending') {
          records.push({
            id: `${p.id}-${a.level}`,
            planName: p.name,
            level: a.level,
            approver: a.approver,
            role: a.role,
            action: a.action as 'approve' | 'reject',
            comment: a.comment,
            time: a.time,
          });
        }
      });
    });
    return records.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 20);
  }, [plans]);

  const handleApprove = (planId: string, level: 1 | 2 | 3, comment: string) => {
    if (!currentUser) return;
    approvePlan(planId, level, currentUser.name, ROLE_LABEL[currentUser.role], comment);
    setSelectedPlan(prev => prev ? plans.find(p => p.id === planId) || null : null);
  };

  const handleReject = (planId: string, level: 1 | 2 | 3, comment: string) => {
    if (!currentUser) return;
    rejectPlan(planId, level, currentUser.name, ROLE_LABEL[currentUser.role], comment);
    setSelectedPlan(prev => prev ? plans.find(p => p.id === planId) || null : null);
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-space-dark">
      <SideMenu active="approval" />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-cyber-blue/20 bg-space-dark/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyber-blue to-electric-blue flex items-center justify-center shadow-glow-blue">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white font-orbitron tracking-wide">三级审批调度中心</h1>
              <p className="text-[10px] text-cyber-blue/60">Approval Dispatch Center</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-blue/10 border border-cyber-blue/30">
              <ShieldCheck size={14} className="text-cyber-blue" />
              <span className="text-xs text-white">
                审批权限：
                <span className="text-cyber-blue font-medium ml-1">
                  {userApprovalLevel ? `可审批 ${userApprovalLevel}-${3} 级` : '仅查看'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-cyber-blue/20">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyber-blue/40 to-electric-blue/40 flex items-center justify-center border border-cyber-blue/30">
                <User size={16} className="text-cyber-blue" />
              </div>
              <div>
                <div className="text-sm text-white font-medium">{currentUser?.name || '未登录'}</div>
                <div className="text-[10px] text-cyber-blue/60">
                  {currentUser?.role ? ROLE_LABEL[currentUser.role] : '—'}
                  {currentUser?.department && <span className="ml-1">· {currentUser.department.split('·')[0]}</span>}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard
              title="待我审批"
              value={stats.myPending}
              icon={<FileCheck size={18} />}
              color="#FFC107"
              subText="项"
            />
            <StatCard
              title="一级待审"
              value={stats.pendingLevel1}
              icon={<Clock size={18} />}
              color="#00D4FF"
              subText="项"
            />
            <StatCard
              title="二级待审"
              value={stats.pendingLevel2}
              icon={<Layers size={18} />}
              color="#9C27B0"
              subText="项"
            />
            <StatCard
              title="三级待审"
              value={stats.pendingLevel3}
              icon={<ShieldCheck size={18} />}
              color="#FF6B35"
              subText="项"
            />
            <StatCard
              title="执行中"
              value={stats.executing}
              icon={<CheckCircle2 size={18} />}
              color="#00E676"
              subText="项"
            />
            <StatCard
              title="已驳回"
              value={stats.rejected}
              icon={<XCircle size={18} />}
              color="#FF3B5C"
              subText="项"
            />
          </div>

          <HUDPanel
            title="调配方案审批列表"
            accentColor="cyber-blue"
            headerExtra={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="搜索方案..."
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    className="w-48 pl-8 pr-3 py-1.5 rounded-lg border border-cyber-blue/30 bg-space-dark/60 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue/60"
                  />
                </div>
                <div className="relative">
                  <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as PlanStatus | 'all')}
                    className="w-36 pl-8 pr-7 py-1.5 rounded-lg border border-cyber-blue/30 bg-space-dark/60 text-sm text-white focus:outline-none focus:border-cyber-blue/60 appearance-none cursor-pointer"
                  >
                    <option value="all">全部状态</option>
                    <option value="pending">待一级审批</option>
                    <option value="approved_level1">待二级审批</option>
                    <option value="approved_level2">待三级审批</option>
                    <option value="executing">执行中</option>
                    <option value="completed">已完成</option>
                    <option value="rejected">已驳回</option>
                  </select>
                </div>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyber-blue/20">
                    <th className="text-left text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-4 font-medium">方案名称</th>
                    <th className="text-left text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-4 font-medium">类型</th>
                    <th className="text-left text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-4 font-medium">状态</th>
                    <th className="text-left text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-4 font-medium">当前节点</th>
                    <th className="text-left text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-4 font-medium">提交时间</th>
                    <th className="text-left text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-4 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((plan, idx) => {
                    const currentLevel = getCurrentApprovalLevel(plan.status);
                    const needMyAction = currentLevel !== null && userApprovalLevel !== null && userApprovalLevel >= currentLevel;

                    return (
                      <motion.tr
                        key={plan.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={cn(
                          'border-b border-white/5 hover:bg-cyber-blue/5 transition cursor-pointer group',
                          needMyAction && 'bg-warning-yellow/5'
                        )}
                        onClick={() => setSelectedPlan(plan)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-cyber-blue/15 flex items-center justify-center shrink-0">
                              <Layers size={14} className="text-cyber-blue" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm text-white font-medium truncate">{plan.name}</div>
                              <div className="text-[10px] text-gray-500 truncate max-w-xs">{plan.description}</div>
                            </div>
                            {needMyAction && (
                              <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-warning-yellow/20 text-warning-yellow animate-pulse">
                                待处理
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-1 rounded-md bg-cyber-blue/15 text-cyber-blue text-xs font-medium">
                            {PLAN_TYPE_LABEL[plan.type]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${PLAN_STATUS_COLOR[plan.status]}15`,
                              color: PLAN_STATUS_COLOR[plan.status],
                              border: `1px solid ${PLAN_STATUS_COLOR[plan.status]}40`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: PLAN_STATUS_COLOR[plan.status] }}
                            />
                            {PLAN_STATUS_LABEL[plan.status]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {planToApprovalNodes(plan).map(node => (
                              <div
                                key={node.level}
                                className={cn(
                                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-orbitron border transition',
                                  node.status === 'approved' && 'bg-safe-green/20 border-safe-green text-safe-green',
                                  node.status === 'current' && 'bg-cyber-blue/20 border-cyber-blue text-cyber-blue animate-pulse',
                                  node.status === 'rejected' && 'bg-alert-red/20 border-alert-red text-alert-red',
                                  node.status === 'pending' && 'bg-white/5 border-white/20 text-white/40'
                                )}
                                title={`${node.title} - ${node.status}`}
                              >
                                {node.level}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-gray-400 font-mono">{plan.createdAt}</div>
                        </td>
                        <td className="py-3 px-4">
                          <ChevronRight size={16} className="text-gray-500 group-hover:text-cyber-blue group-hover:translate-x-1 transition" />
                        </td>
                      </motion.tr>
                    );
                  })}
                  {filteredPlans.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                        暂无符合条件的方案
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </HUDPanel>

          <HUDPanel
            title="历史审批记录"
            accentColor="cyber-blue"
            headerExtra={
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <History size={12} />
                <span>最近 {historyRecords.length} 条</span>
              </div>
            }
          >
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
              {historyRecords.map((record, idx) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-start gap-3 p-3 rounded-lg border border-white/5 hover:border-cyber-blue/20 hover:bg-cyber-blue/5 transition"
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                      record.action === 'approve'
                        ? 'bg-safe-green/15 text-safe-green'
                        : 'bg-alert-red/15 text-alert-red'
                    )}
                  >
                    {record.action === 'approve' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white font-medium truncate">{record.planName}</span>
                      <span className="px-1.5 py-0.5 rounded bg-cyber-blue/15 text-cyber-blue text-[10px] font-medium">
                        第{record.level}级
                      </span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          record.action === 'approve'
                            ? 'bg-safe-green/15 text-safe-green'
                            : 'bg-alert-red/15 text-alert-red'
                        )}
                      >
                        {record.action === 'approve' ? '通过' : '驳回'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      <span className="text-cyber-blue/70">{record.approver}</span>
                      <span className="mx-1">·</span>
                      <span>{record.role}</span>
                      {record.comment && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="text-gray-500">"{record.comment}"</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono shrink-0 text-right">
                    {record.time}
                  </div>
                </motion.div>
              ))}
              {historyRecords.length === 0 && (
                <div className="py-8 text-center text-gray-500 text-sm">暂无历史审批记录</div>
              )}
            </div>
          </HUDPanel>
        </main>
      </div>

      <PlanDetailModal
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        userCanApproveLevel={userApprovalLevel}
        currentUserName={currentUser?.name || ''}
        currentUserRole={currentUser?.role ? ROLE_LABEL[currentUser.role] : ''}
      />
    </div>
  );
}
