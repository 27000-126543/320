import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ShieldAlert, Wrench, ChevronDown, ChevronUp,
  CheckCircle, Clock, MapPin, Zap, Flame, Fuel, AlertCircle,
  AlertOctagon, Sparkles, Send, Siren, Radio,
  Truck, Timer, User, FileText, ClipboardList, PlayCircle,
  History, Layers, Flag, Activity, Play, Pause, RotateCcw,
  Crosshair, Building2, Gauge, ShieldCheck, Wind,
} from 'lucide-react';
import { useAlertStore } from '@/store/useAlertStore';
import { useStationStore } from '@/store/useStationStore';
import { cn } from '@/lib/utils';
import {
  Alert, AlertType, RepairOrder, RepairStatus, CommandStep,
  IncidentRecord, DEFAULT_COMMAND_STEPS, CommandStepKey,
  GridOverloadImpact, GasLeakImpact,
} from '@/types';

type FilterType = 'all' | 'unresolved' | 'resolved';
type MainTabType = 'alerts' | 'review';

const LEVEL_CONFIG: Record<1 | 2 | 3, { label: string; color: string; bar: string }> = {
  1: { label: '一般', color: '#00E676', bar: 'from-safe-green/80 to-safe-green' },
  2: { label: '较重', color: '#FFC107', bar: 'from-warning-yellow/80 to-warning-yellow' },
  3: { label: '严重', color: '#FF3B5C', bar: 'from-alert-red/80 to-alert-red' },
};

const TYPE_CONFIG: Record<AlertType, { label: string; icon: React.ReactNode; color: string }> = {
  load_overrun: { label: '负荷超限', icon: <Zap size={14} />, color: '#1E90FF' },
  pressure_overrun: { label: '压力异常', icon: <Flame size={14} />, color: '#FF6B35' },
  gas_leak: { label: '燃气泄漏', icon: <Fuel size={14} />, color: '#00C48C' },
  equipment_fault: { label: '设备故障', icon: <Wrench size={14} />, color: '#9C27B0' },
  grid_overload: { label: '电网负荷超限', icon: <Activity size={14} />, color: '#F59E0B' },
};

const REPAIR_STATUS_CONFIG: Record<RepairStatus, { label: string; color: string; bg: string }> = {
  dispatched: { label: '已派单', color: '#FFC107', bg: 'bg-warning-yellow/20 border-warning-yellow/40' },
  enroute: { label: '赶往现场', color: '#1E90FF', bg: 'bg-blue-500/20 border-blue-500/40' },
  arrived: { label: '已到达', color: '#FF6B35', bg: 'bg-orange-500/20 border-orange-500/40' },
  repairing: { label: '处置中', color: '#EC4899', bg: 'bg-pink-500/20 border-pink-500/40' },
  completed: { label: '已完成', color: '#00E676', bg: 'bg-safe-green/20 border-safe-green/40' },
};

const VEHICLE_PHASE_LABEL: Record<string, string> = {
  at_base: '车辆在基地待命',
  departing: '车辆驶离基地',
  transit: '行驶途中',
  near_scene: '接近现场',
  at_scene: '已抵达现场',
};

const STEP_ICON_MAP: Record<CommandStepKey, React.ReactNode> = {
  confirm: <Flag size={14} />,
  backup: <Layers size={14} />,
  dispatch: <Send size={14} />,
  onsite: <Wrench size={14} />,
  resolve: <CheckCircle size={14} />,
};

const LEAK_POINT_STATUS_LABEL: Record<GasLeakImpact['leakPointStatus'], string> = {
  isolated: '已隔离',
  sealed: '已封堵',
  monitoring: '监测中',
};

export default function AlertCenter() {
  const {
    alerts, resolveAlert, triggerGasLeakDemo, repairOrders,
    incidentRecords, advanceCommandStep, setHighlightedIncident,
    highlightedIncidentId, focusIncident,
  } = useAlertStore();
  const { getStationById, setSelectedStationId } = useStationStore();
  const [filter, setFilter] = useState<FilterType>('unresolved');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [mainTab, setMainTab] = useState<MainTabType>('alerts');

  const filteredAlerts = useMemo(() => {
    if (filter === 'unresolved') return alerts.filter(a => !a.resolved);
    if (filter === 'resolved') return alerts.filter(a => a.resolved);
    return alerts;
  }, [alerts, filter]);

  const stats = useMemo(() => {
    const unresolved = alerts.filter(a => !a.resolved);
    return {
      total: alerts.length,
      unresolved: unresolved.length,
      resolved: alerts.filter(a => a.resolved).length,
      critical: unresolved.filter(a => a.level === 3).length,
      incidents: incidentRecords.length,
    };
  }, [alerts, incidentRecords]);

  const sortedIncidents = useMemo(() => {
    return [...incidentRecords].sort((a, b) =>
      new Date(b.startTime.replace(/-/g, '/')).getTime() - new Date(a.startTime.replace(/-/g, '/')).getTime()
    );
  }, [incidentRecords]);

  const handleTriggerDemo = async () => {
    setTriggering(true);
    await new Promise(r => setTimeout(r, 600));
    triggerGasLeakDemo();
    setTriggering(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleIncidentClick = (record: IncidentRecord) => {
    focusIncident(record.id);
    setHighlightedIncident(record.id);
    setSelectedStationId(record.stationId || null);
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-md bg-alert-red/20 border border-alert-red/40 flex items-center justify-center text-alert-red">
              <Siren size={16} />
            </div>
            {stats.critical > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-alert-red text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {stats.critical}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">预警中心</h2>
            <p className="text-[11px] text-cyber-blue/60">实时监测 · 智能处置 · 全流程追溯</p>
          </div>
        </div>
        <button
          onClick={handleTriggerDemo}
          disabled={triggering}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition',
            'bg-gradient-to-r from-alert-red/20 to-alert-red/10 border-alert-red/40 text-alert-red',
            'hover:from-alert-red/30 hover:to-alert-red/20 hover:shadow-glow-red',
            'disabled:opacity-60 disabled:cursor-not-allowed'
          )}
        >
          {triggering ? (
            <Radio size={14} className="animate-pulse" />
          ) : (
            <Sparkles size={14} />
          )}
          {triggering ? '触发中...' : '一键模拟燃气泄漏'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 shrink-0">
        <StatCard label="全部预警" value={stats.total} icon={<AlertCircle size={14} />} color="#00D4FF" />
        <StatCard label="未解决" value={stats.unresolved} icon={<Clock size={14} />} color="#FFC107" pulse={stats.unresolved > 0} />
        <StatCard label="严重告警" value={stats.critical} icon={<AlertOctagon size={14} />} color="#FF3B5C" pulse={stats.critical > 0} />
        <StatCard label="已归档" value={stats.incidents} icon={<History size={14} />} color="#00E676" />
      </div>

      <div className="flex items-center gap-2 shrink-0 border-b border-cyber-blue/10 pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMainTab('alerts')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-xs font-medium border-b-2 transition',
              mainTab === 'alerts'
                ? 'border-cyber-blue text-cyber-blue bg-cyber-blue/10'
                : 'border-transparent text-gray-400 hover:text-white/80'
            )}
          >
            <AlertTriangle size={13} />
            预警列表
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] ml-1',
              mainTab === 'alerts' ? 'bg-cyber-blue/30 text-white' : 'bg-space-blue text-gray-500'
            )}>
              {stats.total}
            </span>
          </button>
          <button
            onClick={() => setMainTab('review')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-xs font-medium border-b-2 transition',
              mainTab === 'review'
                ? 'border-cyber-blue text-cyber-blue bg-cyber-blue/10'
                : 'border-transparent text-gray-400 hover:text-white/80'
            )}
          >
            <ClipboardList size={13} />
            调度复盘
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] ml-1',
              mainTab === 'review' ? 'bg-cyber-blue/30 text-white' : 'bg-space-blue text-gray-500'
            )}>
              {stats.incidents}
            </span>
          </button>
        </div>
        <div className="flex-1" />
        {mainTab === 'alerts' && (
          <div className="flex items-center gap-2">
            {([
              { key: 'unresolved', label: '未解决', count: stats.unresolved },
              { key: 'resolved', label: '已解决', count: stats.resolved },
              { key: 'all', label: '全部', count: stats.total },
            ] as { key: FilterType; label: string; count: number }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition',
                  filter === tab.key
                    ? 'bg-cyber-blue/20 border-cyber-blue/50 text-cyber-blue'
                    : 'border-cyber-blue/20 text-gray-400 hover:border-cyber-blue/30 hover:text-white/80'
                )}
              >
                {tab.label}
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[10px]',
                  filter === tab.key ? 'bg-cyber-blue/30 text-white' : 'bg-space-blue text-gray-500'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {mainTab === 'alerts' ? (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
          >
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
              {filteredAlerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
                  <ShieldAlert size={48} className="text-safe-green/40" />
                  <div className="text-sm">暂无{filter === 'unresolved' ? '未解决' : filter === 'resolved' ? '已解决' : ''}预警</div>
                  <div className="text-[11px] text-gray-600">系统运行状态良好</div>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredAlerts.map(alert => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      expanded={expandedId === alert.id}
                      onToggle={() => toggleExpand(alert.id)}
                      onResolve={() => resolveAlert(alert.id)}
                      stationName={alert.stationId ? getStationById(alert.stationId)?.name : undefined}
                      repairOrder={alert.repairOrderId ? repairOrders.find(r => r.id === alert.repairOrderId) : undefined}
                      onAdvanceStep={(stepKey, handler, note) => advanceCommandStep(alert.id, stepKey, handler, note)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0 overflow-hidden"
          >
            <IncidentTimeline
              records={sortedIncidents}
              highlightedId={highlightedIncidentId}
              onClick={handleIncidentClick}
              getStationById={getStationById}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon, color, pulse }: { label: string; value: number; icon: React.ReactNode; color: string; pulse?: boolean }) {
  return (
    <div
      className="rounded-lg border p-3 relative overflow-hidden"
      style={{
        borderColor: `${color}30`,
        backgroundColor: `${color}08`,
        boxShadow: `inset 0 0 20px ${color}12`,
      }}
    >
      {pulse && (
        <div className="absolute inset-0 rounded-lg animate-pulse-slow" style={{ backgroundColor: `${color}08` }} />
      )}
      <div className="relative flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="relative">
        <span className="text-2xl font-bold font-mono font-orbitron" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

interface AlertItemProps {
  alert: Alert;
  expanded: boolean;
  onToggle: () => void;
  onResolve: () => void;
  stationName?: string;
  repairOrder?: RepairOrder;
  onAdvanceStep: (stepKey: CommandStepKey, handler: string, note: string) => void;
}

function AlertItem({ alert, expanded, onToggle, onResolve, stationName, repairOrder, onAdvanceStep }: AlertItemProps) {
  const levelCfg = LEVEL_CONFIG[alert.level];
  const typeCfg = TYPE_CONFIG[alert.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="relative rounded-lg border border-cyber-blue/20 overflow-hidden bg-space-blue/30"
    >
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b',
        levelCfg.bar,
        alert.resolved && 'opacity-30'
      )} />

      <div className="pl-3.5">
        <div
          className="flex items-start gap-3 p-3 pr-2 cursor-pointer select-none"
          onClick={onToggle}
        >
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
              style={{
                backgroundColor: `${typeCfg.color}20`,
                color: typeCfg.color,
                border: `1px solid ${typeCfg.color}40`,
                opacity: alert.resolved ? 0.5 : 1,
              }}
            >
              {typeCfg.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                  style={{ backgroundColor: `${levelCfg.color}20`, color: levelCfg.color, border: `1px solid ${levelCfg.color}40` }}
                >
                  {levelCfg.label}
                </span>
                <span className="text-xs text-cyber-blue/80">{typeCfg.label}</span>
                {alert.resolved && (
                  <span className="flex items-center gap-1 text-[10px] text-safe-green">
                    <CheckCircle size={10} />已解决
                  </span>
                )}
                {!alert.resolved && alert.level === 3 && (
                  <span className="flex items-center gap-1 text-[10px] text-alert-red">
                    <AlertTriangle size={10} className="animate-blink" />紧急
                  </span>
                )}
                {repairOrder && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400">
                    <Truck size={10} />抢修中
                  </span>
                )}
              </div>
              <p className={cn(
                'text-sm leading-relaxed',
                alert.resolved ? 'text-gray-500 line-through decoration-gray-600' : 'text-white/90'
              )}>
                {alert.message}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock size={10} />{alert.triggeredAt}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={10} />{alert.area}
                  {stationName && <span className="text-cyber-blue/60"> · {stationName}</span>}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!alert.resolved && (
              <button
                onClick={(e) => { e.stopPropagation(); onResolve(); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-safe-green/40 bg-safe-green/15 text-safe-green hover:bg-safe-green/25 transition"
              >
                <Send size={10} />
                处置
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="w-7 h-7 rounded-md flex items-center justify-center text-cyber-blue/60 hover:bg-cyber-blue/10 transition"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-0 border-t border-cyber-blue/10 ml-0.5 space-y-3">
                <div className="pt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md bg-space-dark/60 border border-cyber-blue/10 p-2.5">
                    <div className="text-[10px] text-gray-500 mb-1">预警类型</div>
                    <div className="flex items-center gap-1.5" style={{ color: typeCfg.color }}>
                      {typeCfg.icon}
                      <span className="text-white/85">{typeCfg.label}</span>
                    </div>
                  </div>
                  <div className="rounded-md bg-space-dark/60 border border-cyber-blue/10 p-2.5">
                    <div className="text-[10px] text-gray-500 mb-1">告警级别</div>
                    <div className="flex items-center gap-1.5" style={{ color: levelCfg.color }}>
                      <AlertTriangle size={12} />
                      <span className="font-bold">Level {alert.level} · {levelCfg.label}</span>
                    </div>
                  </div>
                  <div className="rounded-md bg-space-dark/60 border border-cyber-blue/10 p-2.5">
                    <div className="text-[10px] text-gray-500 mb-1">位置信息</div>
                    <div className="flex items-center gap-1.5 text-white/85">
                      <MapPin size={12} className="text-cyber-blue" />
                      <span className="truncate">{alert.area}</span>
                    </div>
                    {alert.location && (
                      <div className="text-[10px] text-gray-500 mt-1 font-mono">
                        ({alert.location.x.toFixed(1)}, {alert.location.z.toFixed(1)})
                      </div>
                    )}
                  </div>
                  <div className="rounded-md bg-space-dark/60 border border-cyber-blue/10 p-2.5">
                    <div className="text-[10px] text-gray-500 mb-1">影响范围</div>
                    <div className="flex items-center gap-1.5 text-white/85">
                      <AlertCircle size={12} className="text-warning-yellow" />
                      <span>{alert.buildingIds?.length || 0} 个关联点位</span>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {repairOrder && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <RepairOrderCard order={repairOrder} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {alert.commandSteps && alert.commandSteps.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.25, delay: 0.05 }}
                    >
                      <CommandStepsCard
                        steps={alert.commandSteps}
                        alertResolved={alert.resolved}
                        onAdvance={onAdvanceStep}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="rounded-md bg-alert-red/8 border border-alert-red/20 p-3">
                  <div className="text-[11px] text-alert-red font-bold mb-1.5 flex items-center gap-1.5">
                    <Wrench size={12} />推荐处置方案
                  </div>
                  <ul className="text-[11px] text-gray-400 space-y-1">
                    <li>· 确认告警信息准确性，排除误报</li>
                    <li>· 立即通知相关责任人和应急处理队伍</li>
                    <li>· 评估对周边系统和用户的影响范围</li>
                    <li>· 根据预案采取隔离、切换备用等措施</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface RepairOrderCardProps {
  order: RepairOrder;
}

function RepairOrderCard({ order }: RepairOrderCardProps) {
  const statusCfg = REPAIR_STATUS_CONFIG[order.status];
  const sortedLogs = [...(order.processLog || [])].sort((a, b) =>
    new Date(a.time.replace(/-/g, '/')).getTime() - new Date(b.time.replace(/-/g, '/')).getTime()
  );

  return (
    <div className="relative rounded-lg border bg-gradient-to-br from-cyber-blue/5 to-transparent overflow-hidden"
      style={{ borderColor: `${statusCfg.color}30` }}
    >
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: statusCfg.color }} />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r" style={{ borderColor: statusCfg.color }} />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l" style={{ borderColor: statusCfg.color }} />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: statusCfg.color }} />

      <div className="p-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}>
              <Truck size={13} />
            </div>
            <div>
              <div className="text-xs font-bold text-white/90">{order.teamName}</div>
              <div className="text-[10px] text-gray-500">工单编号：{order.id.slice(0, 12)}...</div>
            </div>
          </div>
          <span className={cn(
            'px-2 py-1 rounded text-[10px] font-bold border',
            statusCfg.bg
          )} style={{ color: statusCfg.color }}>
            {statusCfg.label}
          </span>
        </div>

        {sortedLogs.length > 0 && (
          <div className="mb-3 pl-1">
            <div className="text-[10px] text-gray-500 mb-2 flex items-center gap-1">
              <Activity size={10} />状态时间线
            </div>
            <div className="relative pl-4 space-y-2">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-gray-600 via-gray-700 to-transparent" />
              {sortedLogs.map((log, idx) => {
                const logCfg = REPAIR_STATUS_CONFIG[log.status];
                return (
                  <div key={idx} className="relative">
                    <div
                      className="absolute -left-4 top-1 w-2 h-2 rounded-full ring-2 ring-space-dark"
                      style={{ backgroundColor: logCfg.color, boxShadow: `0 0 6px ${logCfg.color}80` }}
                    />
                    <div className="text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500 font-mono">{log.time.slice(-8)}</span>
                        <span style={{ color: logCfg.color }} className="font-medium">
                          {logCfg.label}
                        </span>
                      </div>
                      <div className="text-gray-500 mt-0.5">{log.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded bg-space-dark/50 p-2">
            <div className="text-gray-500 text-[10px] mb-0.5">车辆位置阶段</div>
            <div className="text-white/85 flex items-center gap-1">
              <MapPin size={10} className="text-cyber-blue" />
              {order.vehiclePhase ? VEHICLE_PHASE_LABEL[order.vehiclePhase] || '位置更新中' : '位置更新中'}
            </div>
          </div>
          {order.status === 'enroute' && (
            <div className="rounded bg-space-dark/50 p-2">
              <div className="text-gray-500 text-[10px] mb-0.5">预计到达</div>
              <div className="text-white/85 flex items-center gap-1">
                <Timer size={10} className="text-warning-yellow" />
                {order.eta}
              </div>
            </div>
          )}
          <div className="rounded bg-space-dark/50 p-2">
            <div className="text-gray-500 text-[10px] mb-0.5">处理人</div>
            <div className="text-white/85 flex items-center gap-1">
              <User size={10} className="text-safe-green" />
              {order.handler || order.dispatcher || '待指派'}
            </div>
          </div>
        </div>

        {order.status === 'completed' && order.resolution && (
          <div className="mt-2.5 rounded bg-safe-green/10 border border-safe-green/20 p-2">
            <div className="text-[10px] text-safe-green font-bold mb-1 flex items-center gap-1">
              <CheckCircle size={10} />处置结果
            </div>
            <div className="text-[11px] text-white/80 leading-relaxed">{order.resolution}</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CommandStepsCardProps {
  steps: CommandStep[];
  alertResolved: boolean;
  onAdvance: (stepKey: CommandStepKey, handler: string, note: string) => void;
}

function CommandStepsCard({ steps, alertResolved, onAdvance }: CommandStepsCardProps) {
  const allCompleted = steps.every(s => s.completed);
  const currentIndex = steps.findIndex(s => !s.completed);

  const handleAdvance = (stepKey: CommandStepKey) => {
    if (stepKey === 'resolve') {
      onAdvance(stepKey, '调度员', '现场确认处置完毕，解除预警并归档');
    } else {
      onAdvance(stepKey, '调度员', '现场确认处置完毕');
    }
  };

  return (
    <div className="relative rounded-lg border bg-gradient-to-br from-purple-500/5 to-transparent overflow-hidden"
      style={{ borderColor: '#8B5CF630' }}
    >
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-purple-500/40" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-purple-500/40" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-purple-500/40" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-purple-500/40" />

      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-purple-500/20 text-purple-400">
            <ClipboardList size={13} />
          </div>
          <div>
            <div className="text-xs font-bold text-white/90">应急指挥流程</div>
            <div className="text-[10px] text-gray-500">
              {steps.filter(s => s.completed).length} / {steps.length} 节点已完成
            </div>
          </div>
        </div>

        <div className="relative flex items-start justify-between gap-1 mb-2">
          {steps.map((step, idx) => {
            const isCurrent = idx === currentIndex && !allCompleted;
            const icon = STEP_ICON_MAP[step.key];
            const isResolve = step.key === 'resolve';
            const canAdvance = isCurrent && !alertResolved;

            return (
              <div key={step.key} className="flex-1 flex flex-col items-center relative min-w-0">
                {idx > 0 && (
                  <div className="absolute top-4 -left-1/2 right-1/2 h-px -translate-y-1/2"
                    style={{
                      background: steps[idx - 1].completed
                        ? 'linear-gradient(90deg, #00E676, #00E67680)'
                        : 'linear-gradient(90deg, #374151, #1F2937)',
                      width: '100%',
                    }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0',
                    step.completed
                      ? 'bg-safe-green/20 border-safe-green text-safe-green'
                      : isCurrent
                        ? 'bg-cyber-blue/20 border-cyber-blue text-cyber-blue'
                        : 'bg-space-dark border-gray-600 text-gray-500'
                  )}>
                    {step.completed ? (
                      <CheckCircle size={14} />
                    ) : (
                      <>{icon}</>
                    )}
                    {isCurrent && (
                      <div className="absolute inset-0 rounded-full border-2 border-cyber-blue animate-ping opacity-30" />
                    )}
                  </div>
                  <div className={cn(
                    'mt-1.5 text-[10px] text-center leading-tight px-0.5',
                    step.completed ? 'text-safe-green' : isCurrent ? 'text-cyber-blue font-bold' : 'text-gray-500'
                  )}>
                    {step.title}
                  </div>
                  {step.completed && step.time && (
                    <div className="mt-0.5 text-[9px] text-gray-500 text-center leading-tight">
                      {step.time.slice(-8)}
                    </div>
                  )}
                  {step.completed && step.handler && (
                    <div className="text-[9px] text-gray-500 text-center leading-tight flex items-center gap-0.5 justify-center">
                      <User size={8} />{step.handler}
                    </div>
                  )}
                  {canAdvance && (
                    <button
                      onClick={() => handleAdvance(step.key)}
                      className={cn(
                        'mt-1.5 px-2 py-0.5 rounded text-[9px] font-bold border transition shrink-0',
                        isResolve
                          ? 'bg-safe-green/20 border-safe-green/50 text-safe-green hover:bg-safe-green/30'
                          : 'bg-cyber-blue/20 border-cyber-blue/50 text-cyber-blue hover:bg-cyber-blue/30'
                      )}
                    >
                      {isResolve ? (
                        <span className="flex items-center gap-0.5">
                          <PlayCircle size={9} />解除预警并归档
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <PlayCircle size={9} />推进到当前
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {allCompleted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5 rounded bg-safe-green/15 border border-safe-green/30 p-2.5 text-center"
              style={{ boxShadow: 'inset 0 0 20px #00E67615' }}
            >
              <div className="text-[11px] text-safe-green font-bold flex items-center justify-center gap-1.5">
                <CheckCircle size={13} />
                本次应急处置已完整归档，可在调度复盘查看
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GridImpactPanel({ impact }: { impact: GridOverloadImpact }) {
  return (
    <div className="space-y-2.5">
      <div>
        <div className="text-[10px] text-gray-500 mb-1.5 flex items-center gap-1">
          <Building2 size={10} />受影响建筑
        </div>
        <div className="flex flex-wrap gap-1.5">
          {impact.affectedBuildings.map((b) => (
            <span
              key={b.id}
              className="px-2 py-0.5 rounded text-[10px] border"
              style={{
                backgroundColor: 'rgba(30,144,255,0.1)',
                borderColor: 'rgba(30,144,255,0.3)',
                color: '#60a5fa',
              }}
            >
              {b.name}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-space-dark/60 border border-blue-500/10 p-2">
          <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1">
            <Gauge size={9} />峰值负荷
          </div>
          <div className="text-sm font-bold font-mono" style={{ color: '#1E90FF' }}>
            {impact.peakLoad}%
          </div>
        </div>
        <div className="rounded bg-space-dark/60 border border-blue-500/10 p-2">
          <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1">
            <Clock size={9} />峰值时间
          </div>
          <div className="text-[11px] font-mono text-white/85">
            {impact.peakLoadTime?.slice(-8)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-space-dark/60 border border-blue-500/10 p-2">
          <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1">
            <Zap size={9} />备用能源
          </div>
          <div className="text-[11px] flex items-center gap-1.5">
            {impact.backupActivated ? (
              <>
                <ShieldCheck size={11} className="text-safe-green" />
                <span className="text-safe-green font-medium">已启用</span>
              </>
            ) : (
              <>
                <AlertCircle size={11} className="text-warning-yellow" />
                <span className="text-warning-yellow">未启用</span>
              </>
            )}
          </div>
          {impact.backupActivated && impact.backupActivatedTime && (
            <div className="text-[9px] text-gray-500 mt-0.5 font-mono">
              {impact.backupActivatedTime.slice(-8)}
            </div>
          )}
        </div>
        <div className="rounded bg-space-dark/60 border border-blue-500/10 p-2">
          <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1">
            <Activity size={9} />恢复时间
          </div>
          <div className="text-[11px] font-mono text-white/85">
            {impact.recoveryTime?.slice(-8) || '-'}
          </div>
        </div>
      </div>

      {impact.recoveryEffect && (
        <div className="rounded bg-space-dark/60 border border-safe-green/20 p-2">
          <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1">
            <CheckCircle size={9} />最终效果
          </div>
          <div className="text-[11px] text-safe-green/90">
            {impact.recoveryEffect}
          </div>
        </div>
      )}
    </div>
  );
}

function GasLeakImpactPanel({ impact }: { impact: GasLeakImpact }) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-space-dark/60 border border-green-500/10 p-2">
          <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1">
            <Truck size={9} />抢修队到达
          </div>
          <div className="text-[11px] font-mono text-white/85">
            {impact.repairTeamArrivalTime?.slice(-8) || '-'}
          </div>
        </div>
        <div className="rounded bg-space-dark/60 border border-green-500/10 p-2">
          <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1">
            <Timer size={9} />处置时长
          </div>
          <div className="text-sm font-bold font-mono" style={{ color: '#00C48C' }}>
            {impact.repairDurationMinutes || '-'} 分钟
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded bg-space-dark/60 border border-green-500/10 p-2">
          <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1">
            <ShieldCheck size={9} />泄漏点状态
          </div>
          <div className="text-[11px] flex items-center gap-1.5">
            <CheckCircle size={11} className="text-safe-green" />
            <span className="text-safe-green font-medium">
              {LEAK_POINT_STATUS_LABEL[impact.leakPointStatus]}
            </span>
          </div>
        </div>
        <div className="rounded bg-space-dark/60 border border-green-500/10 p-2">
          <div className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1">
            <Wind size={9} />压力恢复
          </div>
          <div className="text-[11px] font-mono text-white/85">
            {impact.gasPressureRestoreTime?.slice(-8) || '-'}
          </div>
        </div>
      </div>
    </div>
  );
}

interface IncidentTimelineProps {
  records: IncidentRecord[];
  highlightedId: string | null;
  onClick: (record: IncidentRecord) => void;
  getStationById: (id: string) => { name: string } | undefined;
}

function IncidentTimeline({ records, highlightedId, onClick, getStationById }: IncidentTimelineProps) {
  if (records.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
        <FileText size={48} className="text-cyber-blue/30" />
        <div className="text-sm">暂无复盘事件</div>
        <div className="text-[11px] text-gray-600">完成应急处置后将自动归档至此</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-1 space-y-3">
      {records.map(record => (
        <IncidentRecordCard
          key={record.id}
          record={record}
          highlighted={highlightedId === record.id}
          onClick={() => onClick(record)}
          stationName={record.stationId ? getStationById(record.stationId)?.name : undefined}
        />
      ))}
    </div>
  );
}

interface IncidentRecordCardProps {
  record: IncidentRecord;
  highlighted: boolean;
  onClick: () => void;
  stationName?: string;
}

function IncidentRecordCard({ record, highlighted, onClick, stationName }: IncidentRecordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const levelCfg = LEVEL_CONFIG[record.level];
  const typeCfg = TYPE_CONFIG[record.type];

  const { replayState, setReplayState, setFocusIncident, focusIncidentId } = useAlertStore();
  const isFocused = focusIncidentId === record.id;
  const [localPlaying, setLocalPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = record.process;
  const currentStepIdx = isFocused ? replayState.currentStepIndex : -1;
  const allCompleted = steps.every(s => s.completed);

  const advanceStep = useCallback(() => {
    if (replayState.incidentId !== record.id) return;
    if (!allCompleted) return;
    const nextIdx = Math.min(currentStepIdx + 1, steps.length - 1);
    setReplayState({ currentStepIndex: nextIdx });
    if (nextIdx >= steps.length - 1) {
      setLocalPlaying(false);
      setReplayState({ isPlaying: false });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [allCompleted, currentStepIdx, steps.length, setReplayState, replayState.incidentId, record.id]);

  useEffect(() => {
    if (localPlaying && replayState.incidentId !== record.id) {
      setLocalPlaying(false);
      setReplayState({ isPlaying: false });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (localPlaying && allCompleted) {
      timerRef.current = setTimeout(() => {
        advanceStep();
      }, 1500);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [localPlaying, currentStepIdx, advanceStep, allCompleted, replayState.incidentId, record.id, setReplayState]);

  const resetReplay = useCallback(() => {
    if (replayState.incidentId !== record.id) return;
    setLocalPlaying(false);
    setReplayState({ incidentId: record.id, currentStepIndex: -1, isPlaying: false });
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [setReplayState, replayState.incidentId, record.id]);

  useEffect(() => {
    resetReplay();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [record.id]);

  const handleClick = () => {
    onClick();
    setExpanded(prev => !prev);
  };

  const toggleFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFocused) {
      setFocusIncident(null);
      resetReplay();
    } else {
      setFocusIncident(record.id);
      resetReplay();
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFocused) {
      setFocusIncident(record.id);
      setReplayState({ incidentId: record.id, currentStepIndex: 0, isPlaying: true });
      setLocalPlaying(true);
    } else {
      if (replayState.incidentId !== record.id) return;
      if (localPlaying) {
        setLocalPlaying(false);
        setReplayState({ isPlaying: false });
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else {
        if (currentStepIdx >= steps.length - 1) {
          setReplayState({ currentStepIndex: 0 });
        }
        setLocalPlaying(true);
        setReplayState({ isPlaying: true });
      }
    }
  };

  const isGridType = record.type === 'load_overrun' || record.type === 'pressure_overrun' || record.type === 'grid_overload';
  const isGasLeak = record.type === 'gas_leak';

  return (
    <motion.div
      layout
      className={cn(
        'relative rounded-lg border overflow-hidden bg-space-blue/30 cursor-pointer transition-all',
        highlighted
          ? 'border-cyber-blue/60 shadow-[0_0_20px_rgba(0,212,255,0.15)]'
          : 'border-cyber-blue/20 hover:border-cyber-blue/40'
      )}
    >
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b',
        levelCfg.bar
      )} />

      <div className="pl-3.5">
        <div
          className="flex items-start gap-3 p-3 pr-2"
          onClick={handleClick}
        >
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
              style={{
                backgroundColor: `${typeCfg.color}20`,
                color: typeCfg.color,
                border: `1px solid ${typeCfg.color}40`,
              }}
            >
              {typeCfg.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                  style={{ backgroundColor: `${levelCfg.color}20`, color: levelCfg.color, border: `1px solid ${levelCfg.color}40` }}
                >
                  {levelCfg.label}
                </span>
                {record.result === 'resolved' ? (
                  <span className="flex items-center gap-1 text-[10px] text-safe-green">
                    <CheckCircle size={10} />已归档
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-warning-yellow">
                    <Clock size={10} className="animate-pulse" />处置中
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-white/90 font-medium">
                {record.title}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {record.startTime.slice(-8)} → {record.endTime ? record.endTime.slice(-8) : '处置中'}
                </span>
                {record.durationMinutes && (
                  <span className="flex items-center gap-1">
                    <Timer size={10} />
                    {record.durationMinutes} 分钟
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {record.area}
                  {stationName && <span className="text-cyber-blue/60"> · {stationName}</span>}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleFocus}
              className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center transition',
                isFocused
                  ? 'bg-alert-red/30 text-alert-red border border-alert-red/40'
                  : 'text-cyber-blue/60 hover:bg-cyber-blue/10 hover:text-cyber-blue'
              )}
              title={isFocused ? '取消3D聚焦' : '3D场景聚焦'}
            >
              <Crosshair size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              className="w-7 h-7 rounded-md flex items-center justify-center text-cyber-blue/60 hover:bg-cyber-blue/10 transition shrink-0"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-0 border-t border-cyber-blue/10 ml-0.5 space-y-3">
                {allCompleted && (
                  <div className="pt-3 relative rounded-lg border overflow-hidden"
                    style={{
                      borderColor: '#00D4FF30',
                      background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, transparent 100%)',
                    }}
                  >
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2" style={{ borderColor: '#00D4FF' }} />
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2" style={{ borderColor: '#00D4FF' }} />
                    <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2" style={{ borderColor: '#00D4FF' }} />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2" style={{ borderColor: '#00D4FF' }} />

                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                            style={{ backgroundColor: 'rgba(0,212,255,0.15)', color: '#00D4FF' }}>
                            <PlayCircle size={13} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white/90">回放控制</div>
                            <div className="text-[10px] text-gray-500">
                              流程节点 {Math.max(0, currentStepIdx + 1)} / {steps.length}
                              {isFocused && ' · 3D联动中'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={resetReplay}
                            className="w-8 h-8 rounded-md flex items-center justify-center border transition"
                            style={{
                              borderColor: 'rgba(156,163,175,0.4)',
                              backgroundColor: 'rgba(156,163,175,0.08)',
                              color: '#9ca3af',
                            }}
                            title="重置"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            onClick={togglePlay}
                            className="w-10 h-8 rounded-md flex items-center justify-center border transition"
                            style={{
                              borderColor: localPlaying
                                ? 'rgba(255,59,92,0.5)'
                                : 'rgba(0,230,118,0.5)',
                              backgroundColor: localPlaying
                                ? 'rgba(255,59,92,0.15)'
                                : 'rgba(0,230,118,0.15)',
                              color: localPlaying ? '#FF3B5C' : '#00E676',
                              boxShadow: localPlaying
                                ? '0 0 12px rgba(255,59,92,0.3), inset 0 0 10px rgba(255,59,92,0.1)'
                                : '0 0 12px rgba(0,230,118,0.3), inset 0 0 10px rgba(0,230,118,0.1)',
                            }}
                            title={localPlaying ? '暂停' : '播放'}
                          >
                            {localPlaying ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="relative flex items-start justify-between gap-1 px-1">
                        {steps.map((step, idx) => {
                          const isActive = idx <= currentStepIdx;
                          const isCurrentNode = idx === currentStepIdx;
                          const icon = STEP_ICON_MAP[step.key];

                          return (
                            <div key={step.key} className="flex-1 flex flex-col items-center relative min-w-0">
                              {idx > 0 && (
                                <div
                                  className="absolute top-4 -left-1/2 right-1/2 h-0.5 -translate-y-1/2 transition-all duration-500"
                                  style={{
                                    background: isActive
                                      ? 'linear-gradient(90deg, #00E676, #00D4FF)'
                                      : 'linear-gradient(90deg, #374151, #1F2937)',
                                    width: '100%',
                                    boxShadow: isActive ? '0 0 8px rgba(0,230,118,0.5)' : 'none',
                                  }}
                                />
                              )}
                              <div className="relative z-10 flex flex-col items-center">
                                <div
                                  className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0',
                                    isCurrentNode
                                      ? 'bg-cyber-blue/30 border-cyber-blue text-cyber-blue scale-110'
                                      : isActive
                                        ? 'bg-safe-green/20 border-safe-green text-safe-green'
                                        : 'bg-space-dark border-gray-600 text-gray-500'
                                  )}
                                  style={isCurrentNode ? {
                                    boxShadow: '0 0 16px rgba(0,212,255,0.7), inset 0 0 8px rgba(0,212,255,0.2)',
                                  } : isActive ? {
                                    boxShadow: '0 0 8px rgba(0,230,118,0.4)',
                                  } : {}}
                                >
                                  {isActive && !isCurrentNode ? (
                                    <CheckCircle size={14} />
                                  ) : (
                                    <>{icon}</>
                                  )}
                                  {isCurrentNode && (
                                    <div className="absolute inset-0 rounded-full border-2 border-cyber-blue animate-ping opacity-40" />
                                  )}
                                </div>
                                <div className={cn(
                                  'mt-1.5 text-[10px] text-center leading-tight px-0.5 transition-colors',
                                  isCurrentNode
                                    ? 'text-cyber-blue font-bold'
                                    : isActive ? 'text-safe-green' : 'text-gray-500'
                                )}>
                                  {step.title}
                                </div>
                                {isActive && step.time && (
                                  <div className="mt-0.5 text-[9px] text-gray-500 text-center leading-tight font-mono">
                                    {step.time.slice(-8)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 rounded-md bg-cyber-blue/5 border border-cyber-blue/15 p-3">
                  <div className="text-[11px] text-cyber-blue font-bold mb-2 flex items-center gap-1.5">
                    <FileText size={12} />本次事件复盘详情
                  </div>

                  <div className="text-[11px] text-white/85 leading-relaxed mb-3 bg-space-dark/50 rounded p-2">
                    <span className="text-gray-500 mr-1.5">📋 事件摘要：</span>
                    {record.summary}
                  </div>

                  <div className="mb-3">
                    <div className="text-[10px] text-gray-500 mb-1.5 flex items-center gap-1">
                      <ClipboardList size={10} />完整处置流程
                    </div>
                    <div className="relative pl-4 space-y-2">
                      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-safe-green via-cyber-blue/50 to-transparent" />
                      {record.process.map((step, idx) => {
                        const icon = STEP_ICON_MAP[step.key];
                        const isCurrentReplay = isFocused && idx === currentStepIdx;
                        return (
                          <div key={step.key} className="relative">
                            <div
                              className={cn(
                                'absolute -left-4 top-0.5 w-2 h-2 rounded-full ring-2 ring-space-dark transition-all',
                                step.completed ? 'bg-safe-green' : 'bg-gray-600',
                                isCurrentReplay && 'scale-150'
                              )}
                              style={{
                                ...(step.completed ? { boxShadow: '0 0 6px #00E67680' } : {}),
                                ...(isCurrentReplay ? { boxShadow: '0 0 12px #00D4FF' } : {}),
                              }}
                            />
                            <div className={cn(
                              'text-[10px] rounded px-2 py-1.5 transition-all',
                              isCurrentReplay && 'bg-cyber-blue/15 border border-cyber-blue/30 -mx-2'
                            )}>
                              <div className="flex items-center gap-1.5">
                                <span className={step.completed ? 'text-safe-green' : 'text-gray-500'}>
                                  {icon}
                                </span>
                                <span className={cn(
                                  'font-medium',
                                  step.completed ? 'text-safe-green' : 'text-gray-500',
                                  isCurrentReplay && 'text-cyber-blue font-bold'
                                )}>
                                  {step.title}
                                </span>
                                {step.completed && step.time && (
                                  <span className="text-gray-500 font-mono ml-auto">{step.time.slice(-8)}</span>
                                )}
                                {isCurrentReplay && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyber-blue/30 text-cyber-blue ml-1 animate-pulse">
                                    播放中
                                  </span>
                                )}
                              </div>
                              {step.completed && step.handler && (
                                <div className="text-gray-500 mt-0.5 flex items-center gap-1">
                                  <User size={8} />{step.handler}
                                  {step.note && <span className="mx-1">·</span>}
                                  {step.note}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {(isGridType && record.gridOverloadImpact) && (
                    <div className="mb-3 rounded-md bg-gradient-to-br from-blue-500/8 to-transparent border border-blue-500/20 p-3">
                      <div className="text-[11px] font-bold mb-2.5 flex items-center gap-1.5"
                        style={{ color: '#1E90FF' }}>
                        <Activity size={12} />事件影响分析 · 电网负荷类
                      </div>
                      <GridImpactPanel impact={record.gridOverloadImpact} />
                    </div>
                  )}

                  {isGasLeak && record.gasLeakImpact && (
                    <div className="mb-3 rounded-md bg-gradient-to-br from-green-500/8 to-transparent border border-green-500/20 p-3">
                      <div className="text-[11px] font-bold mb-2.5 flex items-center gap-1.5"
                        style={{ color: '#00C48C' }}>
                        <Wind size={12} />事件影响分析 · 燃气泄漏类
                      </div>
                      <GasLeakImpactPanel impact={record.gasLeakImpact} />
                    </div>
                  )}

                  {record.impact && (
                    <div className="text-[11px] text-white/80 bg-warning-yellow/10 border border-warning-yellow/20 rounded p-2 mb-2">
                      <span className="text-warning-yellow mr-1.5 font-medium">⚠ 影响说明：</span>
                      {record.impact}
                    </div>
                  )}

                  <div className="text-[11px] text-white/80 bg-safe-green/10 border border-safe-green/20 rounded p-2">
                    <span className="text-safe-green mr-1.5 font-medium">✅ 最终结果：</span>
                    {record.result === 'resolved' ? '已成功处置并完成归档，各项指标恢复正常。' : '正在紧急处置中...'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

