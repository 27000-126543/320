import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ShieldAlert, Wrench, ChevronDown, ChevronUp,
  CheckCircle, Clock, MapPin, Zap, Flame, Fuel, AlertCircle,
  AlertOctagon, Sparkles, Send, Siren, Radio,
} from 'lucide-react';
import { useAlertStore } from '@/store/useAlertStore';
import { useStationStore } from '@/store/useStationStore';
import { cn } from '@/lib/utils';
import { Alert, AlertType } from '@/types';

type FilterType = 'all' | 'unresolved' | 'resolved';

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
};

export default function AlertCenter() {
  const { alerts, resolveAlert, triggerGasLeakDemo } = useAlertStore();
  const { getStationById } = useStationStore();
  const [filter, setFilter] = useState<FilterType>('unresolved');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

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
    };
  }, [alerts]);

  const handleTriggerDemo = async () => {
    setTriggering(true);
    await new Promise(r => setTimeout(r, 600));
    triggerGasLeakDemo();
    setTriggering(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
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
        <StatCard label="已解决" value={stats.resolved} icon={<CheckCircle size={14} />} color="#00E676" />
      </div>

      <div className="flex items-center gap-2 shrink-0">
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
        <div className="flex-1" />
      </div>

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
              />
            ))}
          </AnimatePresence>
        )}
      </div>
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
}

function AlertItem({ alert, expanded, onToggle, onResolve, stationName }: AlertItemProps) {
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
              <div className="px-3 pb-3 pt-0 border-t border-cyber-blue/10 ml-0.5">
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

                <div className="mt-3 rounded-md bg-alert-red/8 border border-alert-red/20 p-3">
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
