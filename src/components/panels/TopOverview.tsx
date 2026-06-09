import { useEffect, useMemo, useState } from 'react';
import { Zap, Flame, Fuel, Gauge, Clock, User, Bell, Menu } from 'lucide-react';
import { useStationStore } from '@/store/useStationStore';
import { useUserStore } from '@/store/useUserStore';
import { useAlertStore } from '@/store/useAlertStore';
import MiniTrendChart from '@/components/charts/MiniTrendChart';
import RollingNumber from '@/components/ui/RollingNumber';
import { cn } from '@/lib/utils';
import { ROLE_LABEL } from '@/types';
import { formatNumber, formatTime, formatDateTime } from '@/utils/formatters';

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
  trend: number[];
  trendUp?: boolean;
}

function MetricCard({ title, value, unit, icon, color, trend, trendUp }: MetricCardProps) {
  return (
    <div
      className={cn(
        'relative flex-1 min-w-0 rounded-lg border p-4 overflow-hidden',
        'border-cyber-blue/30 bg-space-blue/60 backdrop-blur-sm',
        'hover:border-cyber-blue/60 transition-all duration-300'
      )}
      style={{
        boxShadow: `inset 0 0 20px ${color}15, 0 0 15px ${color}10`,
      }}
    >
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
        <div className="absolute inset-0 rounded-full" style={{ backgroundColor: color, filter: 'blur(20px)' }} />
      </div>
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-cyber-blue/70 font-medium tracking-wide">{title}</span>
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            <div style={{ color }}>{icon}</div>
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <RollingNumber
            value={value}
            decimals={1}
            className={cn('text-2xl font-bold font-orbitron')}
            style={{ color }}
          />
          <span className="text-xs text-gray-400">{unit}</span>
          {trendUp !== undefined && (
            <span className={cn(
              'text-[10px] px-1 py-0.5 rounded',
              trendUp ? 'bg-safe-green/20 text-safe-green' : 'bg-alert-red/20 text-alert-red'
            )}>
              {trendUp ? '↑' : '↓'}
            </span>
          )}
        </div>
        <MiniTrendChart data={trend} color={color} />
      </div>
    </div>
  );
}

interface TopOverviewProps {
  onMenuToggle?: () => void;
  onAlertClick?: () => void;
}

export default function TopOverview({ onMenuToggle, onAlertClick }: TopOverviewProps) {
  const { systemMetrics, loadHistory } = useStationStore();
  const { currentUser } = useUserStore();
  const { alerts } = useAlertStore();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const electricityTrend = useMemo(() => loadHistory.slice(-20).map(d => d.electricity), [loadHistory]);
  const heatTrend = useMemo(() => loadHistory.slice(-20).map(d => d.heat), [loadHistory]);
  const gasTrend = useMemo(() => loadHistory.slice(-20).map(d => d.gas), [loadHistory]);
  const loadRateTrend = useMemo(() => {
    const rates = loadHistory.slice(-20).map(d => (d.electricity + d.heat) / 10);
    return rates.length ? rates : [50, 55, 60];
  }, [loadHistory]);

  const unresolvedCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="w-full bg-space-dark/90 backdrop-blur-md border-b border-cyber-blue/20">
      <div className="flex items-center h-16 px-4 gap-4">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="w-9 h-9 rounded-md border border-cyber-blue/30 flex items-center justify-center text-cyber-blue hover:bg-cyber-blue/10 transition"
          >
            <Menu size={18} />
          </button>
        )}

        <div className="flex items-center gap-3 mr-4">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyber-blue to-electric-blue flex items-center justify-center shadow-glow-blue">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white font-orbitron tracking-wide">综合能源调度平台</h1>
            <p className="text-[10px] text-cyber-blue/60">Smart City Energy Grid</p>
          </div>
        </div>

        <div className="flex-1 flex items-stretch gap-3 min-w-0">
          <MetricCard
            title="总发电量"
            value={systemMetrics.totalElectricity}
            unit="MWh"
            icon={<Zap size={14} />}
            color="#1E90FF"
            trend={electricityTrend}
            trendUp
          />
          <MetricCard
            title="供热量"
            value={systemMetrics.totalHeat}
            unit="GJ"
            icon={<Flame size={14} />}
            color="#FF6B35"
            trend={heatTrend}
            trendUp
          />
          <MetricCard
            title="供气量"
            value={systemMetrics.totalGas}
            unit="万m³"
            icon={<Fuel size={14} />}
            color="#00C48C"
            trend={gasTrend}
          />
          <MetricCard
            title="系统负荷率"
            value={systemMetrics.systemLoadRate}
            unit="%"
            icon={<Gauge size={14} />}
            color={systemMetrics.systemLoadRate >= 90 ? '#FF3B5C' : systemMetrics.systemLoadRate >= 75 ? '#FFC107' : '#00D4FF'}
            trend={loadRateTrend}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-cyber-blue font-mono text-sm font-bold font-orbitron">
              <Clock size={14} />
              {formatTime(now)}
            </div>
            <div className="text-[10px] text-gray-500">{formatDateTime(now).slice(0, 10)}</div>
          </div>

          <button
            onClick={onAlertClick}
            className="relative w-9 h-9 rounded-md border border-warning-yellow/30 flex items-center justify-center text-warning-yellow hover:bg-warning-yellow/10 transition"
          >
            <Bell size={18} />
            {unresolvedCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-alert-red text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                {unresolvedCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 pl-3 border-l border-cyber-blue/20">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyber-blue/40 to-electric-blue/40 flex items-center justify-center border border-cyber-blue/30">
              <User size={16} className="text-cyber-blue" />
            </div>
            <div className="hidden lg:block">
              <div className="text-sm text-white font-medium">{currentUser?.name || '未登录'}</div>
              <div className="text-[10px] text-cyber-blue/60">
                {currentUser?.role ? ROLE_LABEL[currentUser.role] : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
