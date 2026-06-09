import { useMemo, useState } from 'react';
import {
  Sun, Cloud, CloudRain, Snowflake, Thermometer, Droplets, Wind,
  TrendingUp, Zap, Flame, Fuel, Battery, Send, CheckCircle, XCircle, Clock,
  FileCheck, ArrowRight, Sparkles,
} from 'lucide-react';
import { useStationStore } from '@/store/useStationStore';
import { useApprovalStore } from '@/store/useApprovalStore';
import { useUserStore } from '@/store/useUserStore';
import LoadForecastChart from '@/components/charts/LoadForecastChart';
import RollingNumber from '@/components/ui/RollingNumber';
import { cn } from '@/lib/utils';
import { ComplementaryPlan, PlanStatus, WeatherForecast } from '@/types';
import { generateId, formatDateTime } from '@/utils/formatters';

const WEATHER_ICON: Record<WeatherForecast['weather'], React.ReactNode> = {
  sunny: <Sun size={28} className="text-warning-yellow" />,
  cloudy: <Cloud size={28} className="text-gray-400" />,
  rainy: <CloudRain size={28} className="text-cyber-blue" />,
  snowy: <Snowflake size={28} className="text-white/80" />,
};

const WEATHER_LABEL: Record<WeatherForecast['weather'], string> = {
  sunny: '晴',
  cloudy: '多云',
  rainy: '雨',
  snowy: '雪',
};

const PLAN_STATUS: Record<PlanStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待审批', color: '#FFC107', icon: <Clock size={12} /> },
  approved_level1: { label: '一级已批', color: '#00D4FF', icon: <CheckCircle size={12} /> },
  approved_level2: { label: '二级已批', color: '#1E90FF', icon: <CheckCircle size={12} /> },
  executing: { label: '执行中', color: '#00E676', icon: <Zap size={12} /> },
  completed: { label: '已完成', color: '#718096', icon: <CheckCircle size={12} /> },
  rejected: { label: '已驳回', color: '#FF3B5C', icon: <XCircle size={12} /> },
};

const PLAN_TYPE_LABEL: Record<ComplementaryPlan['type'], { label: string; icon: React.ReactNode; color: string }> = {
  heat_pump_storage: { label: '热泵蓄热', icon: <Flame size={14} />, color: '#FF6B35' },
  gas_booster_peak: { label: '燃气调峰', icon: <Fuel size={14} />, color: '#00C48C' },
  battery_discharge: { label: '储能放电', icon: <Battery size={14} />, color: '#9C27B0' },
  grid_transfer: { label: '电网转供', icon: <Zap size={14} />, color: '#1E90FF' },
};

export default function ForecastPanel() {
  const { weatherForecast, loadHistory } = useStationStore();
  const { plans, submitNewPlan, setActivePlan } = useApprovalStore();
  const { currentUser } = useUserStore();
  const [submitting, setSubmitting] = useState(false);

  const todayWeather = weatherForecast[0];
  const nextHours = weatherForecast.slice(0, 8);

  const forecastData = useMemo(() => {
    const recent = loadHistory.slice(-12);
    const predicted: typeof loadHistory = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const hour = (now.getHours() + i) % 24;
      const peakFactor =
        (hour >= 8 && hour <= 11) || (hour >= 18 && hour <= 21) ? 1.3 :
        hour >= 23 || hour <= 6 ? 0.6 : 1.0;
      const base = recent[recent.length - 1] || { electricity: 450, heat: 200, gas: 70 };
      predicted.push({
        time: `${String(hour).padStart(2, '0')}:00`,
        electricity: Math.round(base.electricity * peakFactor * (0.95 + (i / 24) * 0.1)),
        heat: Math.round(base.heat * peakFactor * (0.9 + (i / 24) * 0.15)),
        gas: Math.round(base.gas * peakFactor * (0.92 + (i / 24) * 0.1)),
        predicted: true,
      });
    }
    return [...recent, ...predicted].slice(-36);
  }, [loadHistory]);

  const peakForecast = useMemo(() => {
    const peak = forecastData.reduce(
      (acc, d) => ({
        electricity: Math.max(acc.electricity, d.electricity),
        heat: Math.max(acc.heat, d.heat),
        gas: Math.max(acc.gas, d.gas),
      }),
      { electricity: 0, heat: 0, gas: 0 }
    );
    return peak;
  }, [forecastData]);

  const handleSubmitAutoPlan = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    submitNewPlan({
      id: generateId(),
      name: 'AI智能多能互补调度方案',
      description: `基于未来24小时负荷预测（峰值电力${peakForecast.electricity}MW），系统自动生成多能互补方案：储能电站联合放电+燃气锅炉调峰+热泵低谷蓄热协同运行。`,
      type: peakForecast.electricity > 550 ? 'battery_discharge' : 'gas_booster_peak',
      triggerCondition: `全网负荷率≥85%或电力峰值≥${peakForecast.electricity}MW`,
      expectedEffect: `削减峰值负荷约${Math.round(peakForecast.electricity * 0.15)}MW，降低系统过载风险，节约运行成本约15%`,
      createdAt: formatDateTime(),
    });
    setSubmitting(false);
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-cyber-blue/20 border border-cyber-blue/40 flex items-center justify-center text-cyber-blue">
            <TrendingUp size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">负荷预测 & 多能互补</h2>
            <p className="text-[11px] text-cyber-blue/60">未来24小时智能预测与方案审批</p>
          </div>
        </div>
        <button
          onClick={handleSubmitAutoPlan}
          disabled={submitting}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition',
            'bg-gradient-to-r from-cyber-blue/20 to-electric-blue/20 border-cyber-blue/40 text-cyber-blue',
            'hover:from-cyber-blue/30 hover:to-electric-blue/30 hover:shadow-glow-blue',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {submitting ? <Clock size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {submitting ? '生成方案中...' : '一键发起智能审批'}
        </button>
      </div>

      <section className="rounded-xl border border-cyber-blue/25 bg-space-blue/40 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-4 pr-6 border-r border-cyber-blue/20">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-space-blue to-space-dark border border-cyber-blue/30 flex items-center justify-center shadow-hud">
              {todayWeather && WEATHER_ICON[todayWeather.weather]}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-orbitron text-white">
                  {todayWeather?.temperature}°C
                </span>
                <span className="text-sm text-gray-400">{todayWeather && WEATHER_LABEL[todayWeather.weather]}</span>
              </div>
              <div className="text-xs text-cyber-blue/60 mt-0.5">今日天气概览</div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-4 min-w-0">
            <StatItem icon={<Thermometer size={14} />} label="温度范围" value={`${todayWeather ? todayWeather.temperature - 4 : 0}°C ~ ${todayWeather ? todayWeather.temperature + 5 : 0}°C`} color="#FF6B35" />
            <StatItem icon={<Droplets size={14} />} label="平均湿度" value={`${todayWeather?.humidity || 55}%`} color="#00D4FF" />
            <StatItem icon={<Wind size={14} />} label="风速" value={`${todayWeather?.windSpeed || 3} m/s`} color="#00C48C" />
          </div>

          <div className="flex items-stretch gap-1.5 pl-4 border-l border-cyber-blue/20">
            {nextHours.map((w, i) => (
              <div
                key={i}
                className={cn(
                  'flex flex-col items-center justify-between px-2 py-2 rounded-lg w-12 transition',
                  i === 0 ? 'bg-cyber-blue/15 border border-cyber-blue/30' : 'hover:bg-cyber-blue/10'
                )}
              >
                <span className="text-[10px] text-gray-500">{String(w.hour).padStart(2, '0')}</span>
                <div className="my-1">{WEATHER_ICON[w.weather] && <span className="scale-75">{WEATHER_ICON[w.weather]}</span>}</div>
                <span className="text-[11px] font-bold text-white/80">{w.temperature}°</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-cyber-blue/25 bg-space-blue/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white/90">24小时负荷预测</h3>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-gray-500">
                <Zap size={10} className="text-electric-blue" />峰值
                <RollingNumber value={peakForecast.electricity} decimals={0} className="text-electric-blue font-bold" />
                MW
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <Flame size={10} className="text-heat-orange" />
                <RollingNumber value={peakForecast.heat} decimals={0} className="text-heat-orange font-bold" />
                MW
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <Fuel size={10} className="text-gas-green" />
                <RollingNumber value={peakForecast.gas} decimals={1} className="text-gas-green font-bold" />
                万m³
              </span>
            </div>
          </div>
        </div>
        <LoadForecastChart data={forecastData} />
      </section>

      <section className="rounded-xl border border-cyber-blue/25 bg-space-blue/40 p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileCheck size={16} className="text-cyber-blue" />
            <h3 className="text-sm font-bold text-white/90">多能互补方案</h3>
            <span className="text-[10px] text-gray-500">共 {plans.length} 个方案</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="px-2 py-1 rounded bg-warning-yellow/15 text-warning-yellow">待批 {plans.filter(p => p.status === 'pending').length}</span>
            <span className="px-2 py-1 rounded bg-safe-green/15 text-safe-green">执行中 {plans.filter(p => p.status === 'executing').length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {plans.map(plan => {
            const typeCfg = PLAN_TYPE_LABEL[plan.type];
            const statusCfg = PLAN_STATUS[plan.status];
            return (
              <div
                key={plan.id}
                onClick={() => setActivePlan(plan.id)}
                className={cn(
                  'rounded-lg border p-3 cursor-pointer transition',
                  'border-cyber-blue/20 bg-space-dark/40 hover:border-cyber-blue/40 hover:bg-cyber-blue/5'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${typeCfg.color}20`, color: typeCfg.color, border: `1px solid ${typeCfg.color}40` }}
                    >
                      {typeCfg.icon}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-white/90">{plan.name}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                        <span>{typeCfg.label}</span>
                        <span>·</span>
                        <span>{plan.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium shrink-0"
                    style={{ backgroundColor: `${statusCfg.color}15`, color: statusCfg.color, border: `1px solid ${statusCfg.color}30` }}
                  >
                    {statusCfg.icon}
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">{plan.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span className="truncate max-w-[200px]">💡 {plan.expectedEffect}</span>
                  </div>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-cyber-blue border border-cyber-blue/30 hover:bg-cyber-blue/10 transition"
                  >
                    查看详情 <ArrowRight size={10} />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {plan.approvals.map((a) => (
                    <div key={a.level} className="flex items-center">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold',
                          a.action === 'approve' ? 'bg-safe-green/20 border-safe-green text-safe-green'
                            : a.action === 'reject' ? 'bg-alert-red/20 border-alert-red text-alert-red'
                            : 'bg-space-blue border-gray-600 text-gray-500'
                        )}
                        title={`${a.role}: ${a.action === 'approve' ? '已通过' : a.action === 'reject' ? '已驳回' : '待审批'}${a.approver ? ` · ${a.approver}` : ''}`}
                      >
                        {a.level}
                      </div>
                      {a.level < 3 && (
                        <div className={cn(
                          'w-4 h-0.5 mx-0.5',
                          a.action === 'approve' ? 'bg-safe-green/60' : 'bg-gray-700'
                        )} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[10px] text-gray-500">{label}</div>
        <div className="text-xs font-bold text-white/90 truncate">{value}</div>
      </div>
    </div>
  );
}
