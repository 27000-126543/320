import { useState, useMemo, useEffect } from 'react';
import {
  FileDown, Calendar, Zap, Flame, Fuel, Gauge, User,
  Filter, TrendingUp, AlertTriangle, Table2, LineChart,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle2,
  XCircle, Building2, Layers, Clock, BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import SideMenu from '@/components/panels/SideMenu';
import HUDPanel from '@/components/ui/HUDPanel';
import RollingNumber from '@/components/ui/RollingNumber';
import { useUserStore } from '@/store/useUserStore';
import {
  DailyReport, EnergyStationType, STATION_TYPE_LABEL, ROLE_LABEL,
} from '@/types';
import { generateDailyReport } from '@/utils/mockData';
import { exportDailyReport, getDefaultReportDate } from '@/utils/excelExport';
import { cn } from '@/lib/utils';
import { formatDate, formatNumber, getLoadRateColor } from '@/utils/formatters';

/**
 * 能源类型筛选选项
 */
const ENERGY_TYPE_OPTIONS: Array<{
  value: EnergyStationType | 'all';
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { value: 'all', label: '全部类型', icon: <Layers size={14} />, color: '#00D4FF' },
  { value: 'substation', label: '变电站', icon: <Zap size={14} />, color: '#1E90FF' },
  { value: 'heat_station', label: '热力站', icon: <Flame size={14} />, color: '#FF6B35' },
  { value: 'gas_station', label: '燃气调压站', icon: <Fuel size={14} />, color: '#00C48C' },
  { value: 'storage_station', label: '储能站', icon: <TrendingUp size={14} />, color: '#9C27B0' },
  { value: 'building', label: '用户建筑', icon: <Building2 size={14} />, color: '#00BCD4' },
];

interface SummaryCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

/**
 * 汇总卡片组件
 */
function SummaryCard({ title, value, unit, icon, color, trend }: SummaryCardProps) {
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
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-cyber-blue/70 font-medium tracking-wide">{title}</span>
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <RollingNumber
            value={value}
            decimals={value >= 100 ? 0 : 1}
            className="text-2xl font-bold font-orbitron"
            style={{ color }}
          />
          <span className="text-xs text-gray-400">{unit}</span>
        </div>
        {trend !== undefined && (
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                trend >= 0 ? 'bg-safe-green/15 text-safe-green' : 'bg-alert-red/15 text-alert-red'
              )}
            >
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
            <span className="text-[10px] text-gray-500">较昨日</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 日期模式切换类型
 */
type DateMode = 'single' | 'range';

/**
 * 能源日报导出中心主页面
 */
export default function ReportPage() {
  const { currentUser } = useUserStore();

  const [dateMode, setDateMode] = useState<DateMode>('single');
  const [selectedDate, setSelectedDate] = useState(getDefaultReportDate());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return formatDate(d);
  });
  const [endDate, setEndDate] = useState(getDefaultReportDate());
  const [energyTypeFilter, setEnergyTypeFilter] = useState<EnergyStationType | 'all'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  /**
   * 根据当前选择日期生成报表数据
   */
  const report: DailyReport = useMemo(() => {
    return generateDailyReport(selectedDate);
  }, [selectedDate]);

  /**
   * 按能源类型筛选后的站点数据
   */
  const filteredStations = useMemo(() => {
    if (energyTypeFilter === 'all') return report.stations;
    return report.stations.filter(s => s.type === energyTypeFilter);
  }, [report.stations, energyTypeFilter]);

  /**
   * 生成24小时曲线数据
   */
  const hourlyChartData = useMemo(() => {
    const data: Array<{
      time: string;
      供电: number;
      供热: number;
      供气: number;
      负荷率: number;
    }> = [];
    for (let h = 0; h < 24; h++) {
      const f = 1 + Math.sin((h - 6) / 12 * Math.PI) * 0.3;
      const peak = (h >= 8 && h <= 11) || (h >= 18 && h <= 21) ? 1.15 : 1;
      data.push({
        time: `${String(h).padStart(2, '0')}:00`,
        供电: Math.round(report.summary.totalElectricity / 24 * f * peak),
        供热: Math.round(report.summary.totalHeat / 24 * f * peak * 0.9),
        供气: Math.round(report.summary.totalGas / 24 * f * peak * 10) / 10,
        负荷率: Math.round((report.summary.avgSystemLoadRate + (f - 1) * 20) * 10) / 10,
      });
    }
    return data;
  }, [report.summary]);

  /**
   * 调整日期（单日模式下的前后一天）
   */
  const adjustDate = (delta: number) => {
    const parts = selectedDate.split('/');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatDate(d));
  };

  /**
   * 处理Excel导出
   */
  const handleExport = () => {
    setIsExporting(true);
    setExportSuccess(false);
    setTimeout(() => {
      try {
        exportDailyReport(report);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      } catch (e) {
        console.error('导出失败', e);
      } finally {
        setIsExporting(false);
      }
    }, 600);
  };

  useEffect(() => {
    return () => setExportSuccess(false);
  }, []);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-space-dark">
      <SideMenu active="report" />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-cyber-blue/20 bg-space-dark/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyber-blue to-electric-blue flex items-center justify-center shadow-glow-blue">
              <FileDown size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white font-orbitron tracking-wide">能源日报导出中心</h1>
              <p className="text-[10px] text-cyber-blue/60">Daily Energy Report Center</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={cn(
                'group flex items-center gap-2 px-5 py-2 rounded-lg transition-all',
                exportSuccess
                  ? 'bg-safe-green/20 border border-safe-green/50 text-safe-green shadow-[0_0_20px_rgba(0,230,118,0.2)]'
                  : 'bg-gradient-to-r from-cyber-blue/20 to-electric-blue/20 border border-cyber-blue/50 text-cyber-blue hover:from-cyber-blue/30 hover:to-electric-blue/30 shadow-[0_0_15px_rgba(0,212,255,0.15)]'
              )}
            >
              {exportSuccess ? (
                <>
                  <CheckCircle2 size={16} className="animate-bounce" />
                  <span className="text-sm font-medium">导出成功</span>
                </>
              ) : isExporting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-sm font-medium">正在生成Excel...</span>
                </>
              ) : (
                <>
                  <FileDown size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition" />
                  <span className="text-sm font-medium">导出 Excel</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 pl-4 border-l border-cyber-blue/20">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyber-blue/40 to-electric-blue/40 flex items-center justify-center border border-cyber-blue/30">
                <User size={16} className="text-cyber-blue" />
              </div>
              <div>
                <div className="text-sm text-white font-medium">{currentUser?.name || '未登录'}</div>
                <div className="text-[10px] text-cyber-blue/60">
                  {currentUser?.role ? ROLE_LABEL[currentUser.role] : '—'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <HUDPanel title="报表参数配置" accentColor="cyber-blue">
            <div className="flex flex-wrap items-end gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[10px] text-cyber-blue/60 uppercase tracking-wider">
                  <Calendar size={12} />
                  <span>日期模式</span>
                </div>
                <div className="flex rounded-lg border border-cyber-blue/30 overflow-hidden p-0.5 bg-space-dark/50">
                  <button
                    onClick={() => setDateMode('single')}
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-md transition',
                      dateMode === 'single'
                        ? 'bg-cyber-blue/20 text-cyber-blue shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    单日报表
                  </button>
                  <button
                    onClick={() => setDateMode('range')}
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded-md transition',
                      dateMode === 'range'
                        ? 'bg-cyber-blue/20 text-cyber-blue shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    日期段报表
                  </button>
                </div>
              </div>

              {dateMode === 'single' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-[10px] text-cyber-blue/60 uppercase tracking-wider">
                    <Calendar size={12} />
                    <span>选择日期</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustDate(-1)}
                      className="w-8 h-9 rounded-lg border border-cyber-blue/30 flex items-center justify-center text-cyber-blue/70 hover:bg-cyber-blue/10 hover:text-cyber-blue transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedDate}
                        readOnly
                        className="w-40 h-9 rounded-lg border border-cyber-blue/30 bg-space-dark/60 px-4 text-center text-sm text-white font-mono focus:outline-none focus:border-cyber-blue/60 cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => adjustDate(1)}
                      className="w-8 h-9 rounded-lg border border-cyber-blue/30 flex items-center justify-center text-cyber-blue/70 hover:bg-cyber-blue/10 hover:text-cyber-blue transition"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      onClick={() => setSelectedDate(getDefaultReportDate())}
                      className="px-3 h-9 rounded-lg border border-cyber-blue/30 text-xs text-cyber-blue/70 hover:bg-cyber-blue/10 hover:text-cyber-blue transition"
                    >
                      今天
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-[10px] text-cyber-blue/60 uppercase tracking-wider">
                    <Calendar size={12} />
                    <span>日期范围</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={startDate}
                      readOnly
                      className="w-36 h-9 rounded-lg border border-cyber-blue/30 bg-space-dark/60 px-4 text-center text-sm text-white font-mono focus:outline-none focus:border-cyber-blue/60 cursor-pointer"
                    />
                    <span className="text-cyber-blue/50 text-sm">至</span>
                    <input
                      type="text"
                      value={endDate}
                      readOnly
                      className="w-36 h-9 rounded-lg border border-cyber-blue/30 bg-space-dark/60 px-4 text-center text-sm text-white font-mono focus:outline-none focus:border-cyber-blue/60 cursor-pointer"
                    />
                    <span className="ml-2 text-xs text-gray-500">（预览仅显示结束日数据）</span>
                  </div>
                </div>
              )}

              <div className="space-y-2 ml-auto">
                <div className="flex items-center gap-1 text-[10px] text-cyber-blue/60 uppercase tracking-wider">
                  <BarChart3 size={12} />
                  <span>汇总指标</span>
                </div>
                <div className="text-xs text-gray-400">
                  共 <span className="text-cyber-blue font-medium">{filteredStations.length}</span> 个站点 ·
                  <span className="text-safe-green font-medium ml-1"> {report.summary.eventCount}</span> 起事件
                </div>
              </div>
            </div>
          </HUDPanel>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <SummaryCard
              title="总供电量"
              value={report.summary.totalElectricity}
              unit="MWh"
              icon={<Zap size={16} />}
              color="#1E90FF"
              trend={3.2}
            />
            <SummaryCard
              title="总供热量"
              value={report.summary.totalHeat}
              unit="MW·h"
              icon={<Flame size={16} />}
              color="#FF6B35"
              trend={-1.8}
            />
            <SummaryCard
              title="总供气量"
              value={report.summary.totalGas}
              unit="万m³"
              icon={<Fuel size={16} />}
              color="#00C48C"
              trend={2.5}
            />
            <SummaryCard
              title="系统平均负荷率"
              value={report.summary.avgSystemLoadRate}
              unit="%"
              icon={<Gauge size={16} />}
              color="#00D4FF"
              trend={0.6}
            />
            <SummaryCard
              title="峰值负荷率"
              value={report.summary.peakLoad}
              unit="%"
              icon={<TrendingUp size={16} />}
              color={report.summary.peakLoad >= 90 ? '#FF3B5C' : '#FFC107'}
            />
            <SummaryCard
              title="应急事件数"
              value={report.summary.eventCount}
              unit="起"
              icon={<AlertTriangle size={16} />}
              color="#FF3B5C"
            />
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-2 space-y-6">
              <HUDPanel title="能源类型筛选" accentColor="cyber-blue">
                <div className="space-y-2">
                  {ENERGY_TYPE_OPTIONS.map(opt => {
                    const count = opt.value === 'all'
                      ? report.stations.length
                      : report.stations.filter(s => s.type === opt.value).length;
                    const isActive = energyTypeFilter === opt.value;

                    return (
                      <button
                        key={opt.value}
                        onClick={() => setEnergyTypeFilter(opt.value)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition',
                          isActive
                            ? 'bg-cyber-blue/15 border border-cyber-blue/40 shadow-[inset_0_0_12px_rgba(0,212,255,0.1)]'
                            : 'border border-transparent hover:bg-white/5 text-gray-400'
                        )}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
                            isActive ? '' : 'opacity-60'
                          )}
                          style={{
                            backgroundColor: isActive ? `${opt.color}20` : 'rgba(255,255,255,0.05)',
                            color: isActive ? opt.color : 'inherit',
                          }}
                        >
                          {opt.icon}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div
                            className={cn(
                              'text-sm font-medium truncate',
                              isActive && 'text-white'
                            )}
                          >
                            {opt.label}
                          </div>
                          <div className={cn(
                            'text-[10px]',
                            isActive ? 'text-cyber-blue/60' : 'text-gray-600'
                          )}>
                            {count} 个站点
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </HUDPanel>

              <HUDPanel title="站点类型统计" accentColor="cyber-blue">
                <div className="space-y-3">
                  {['substation', 'heat_station', 'gas_station', 'storage_station', 'building'].map(type => {
                    const stations = report.stations.filter(s => s.type === type);
                    const total = stations.reduce((a, b) => a + b.totalOutput, 0);
                    const avgLoad = stations.length
                      ? Math.round(stations.reduce((a, b) => a + b.avgLoadRate, 0) / stations.length)
                      : 0;
                    const opt = ENERGY_TYPE_OPTIONS.find(o => o.value === type)!;

                    return (
                      <div key={type} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5" style={{ color: opt.color }}>
                            {opt.icon}
                            <span>{opt.label}</span>
                          </div>
                          <span className="text-gray-400">{formatNumber(total, 0)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${avgLoad}%` }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: getLoadRateColor(avgLoad),
                              boxShadow: `0 0 8px ${getLoadRateColor(avgLoad)}80`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>{stations.length} 站</span>
                          <span>平均 {avgLoad}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </HUDPanel>
            </div>

            <div className="col-span-12 lg:col-span-10 space-y-6">
              <HUDPanel
                title="各能源站运行明细"
                accentColor="cyber-blue"
                headerExtra={
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Table2 size={12} />
                    <span>共 {filteredStations.length} 条记录</span>
                  </div>
                }
              >
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-cyber-blue/20">
                        <th className="text-left text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-3 font-medium">站点</th>
                        <th className="text-left text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-3 font-medium">类型</th>
                        <th className="text-right text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-3 font-medium">总出力</th>
                        <th className="text-right text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-3 font-medium">平均负荷率</th>
                        <th className="text-right text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-3 font-medium">峰值负荷率</th>
                        <th className="text-right text-[10px] text-cyber-blue/60 uppercase tracking-wider py-3 px-3 font-medium">运行时长</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filteredStations.map((s, idx) => (
                          <motion.tr
                            key={s.stationId}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="border-b border-white/5 hover:bg-cyber-blue/5 transition"
                          >
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-md bg-cyber-blue/10 flex items-center justify-center text-[10px] font-bold text-cyber-blue font-orbitron border border-cyber-blue/20">
                                  {s.stationCode.split('-')[0]?.slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm text-white font-medium truncate">{s.stationName}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">{s.stationCode}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-white/5 text-gray-300">
                                {STATION_TYPE_LABEL[s.type]}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className="text-sm text-white font-mono font-medium">
                                {formatNumber(s.totalOutput, 0)}
                              </span>
                              <span className="text-[10px] text-gray-500 ml-1">
                                {s.type === 'gas_station' ? '万m³' : s.type === 'storage_station' ? 'MWh' : 'MWh'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${s.avgLoadRate}%`,
                                      backgroundColor: getLoadRateColor(s.avgLoadRate),
                                      boxShadow: `0 0 6px ${getLoadRateColor(s.avgLoadRate)}`,
                                    }}
                                  />
                                </div>
                                <span
                                  className="text-sm font-mono font-medium min-w-[40px]"
                                  style={{ color: getLoadRateColor(s.avgLoadRate) }}
                                >
                                  {s.avgLoadRate}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span
                                className="text-sm font-mono font-medium"
                                style={{ color: getLoadRateColor(s.maxLoadRate) }}
                              >
                                {s.maxLoadRate}%
                              </span>
                              {s.maxLoadRate >= 90 && (
                                <XCircle size={12} className="inline ml-1 text-alert-red -translate-y-0.5" />
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Clock size={12} className="text-cyber-blue/60" />
                                <span className="text-sm text-white font-mono">{s.runtimeHours} h</span>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                      {filteredStations.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                            该类型下暂无站点数据
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </HUDPanel>

              <HUDPanel
                title="应急与故障事件记录"
                accentColor="alert-red"
                headerExtra={
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <AlertTriangle size={12} className="text-alert-red" />
                    <span>共 {report.emergencyEvents.length} 起事件</span>
                  </div>
                }
              >
                <div className="space-y-3">
                  {report.emergencyEvents.map((event, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-4 p-4 rounded-lg border border-alert-red/20 bg-alert-red/5 hover:border-alert-red/40 transition"
                    >
                      <div className="w-10 h-10 rounded-lg bg-alert-red/15 border border-alert-red/30 flex items-center justify-center shrink-0">
                        <AlertTriangle size={18} className="text-alert-red" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-alert-red/20 text-alert-red text-xs font-medium">
                            {event.type}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-warning-yellow/15 text-warning-yellow text-xs">
                            {event.area}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">{event.time}</span>
                        </div>
                        <div className="text-sm text-white mt-2">{event.description}</div>
                        <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-safe-green" />
                          <span>处置结果：</span>
                          <span className="text-safe-green">{event.resolution}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {report.emergencyEvents.length === 0 && (
                    <div className="py-8 text-center text-gray-500 text-sm">
                      <CheckCircle2 size={32} className="mx-auto mb-2 text-safe-green/50" />
                      本日无应急事件记录，系统运行平稳
                    </div>
                  )}
                </div>
              </HUDPanel>

              <HUDPanel
                title="24小时能源负荷曲线预览"
                accentColor="cyber-blue"
                headerExtra={
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <LineChart size={12} />
                    <span>00:00 - 23:00 逐时数据</span>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorElec" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1E90FF" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#1E90FF" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorHeat" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00C48C" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00C48C" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
                        <XAxis
                          dataKey="time"
                          stroke="rgba(255,255,255,0.3)"
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                          tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                          interval={2}
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.3)"
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                          tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                          yAxisId="left"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(10,14,25,0.95)',
                            border: '1px solid rgba(0,212,255,0.3)',
                            borderRadius: 8,
                            backdropFilter: 'blur(10px)',
                            fontSize: 12,
                          }}
                          labelStyle={{ color: '#00D4FF', fontWeight: 600, marginBottom: 4 }}
                          itemStyle={{ padding: '2px 0' }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                          formatter={(value) => <span className="text-gray-300">{value}</span>}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="供电"
                          stroke="#1E90FF"
                          strokeWidth={2}
                          fill="url(#colorElec)"
                          activeDot={{ r: 4, strokeWidth: 2 }}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="供热"
                          stroke="#FF6B35"
                          strokeWidth={2}
                          fill="url(#colorHeat)"
                          activeDot={{ r: 4, strokeWidth: 2 }}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="供气"
                          stroke="#00C48C"
                          strokeWidth={2}
                          fill="url(#colorGas)"
                          activeDot={{ r: 4, strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReLineChart data={hourlyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
                        <XAxis
                          dataKey="time"
                          stroke="rgba(255,255,255,0.3)"
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                          tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                          interval={2}
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.3)"
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                          tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(10,14,25,0.95)',
                            border: '1px solid rgba(0,212,255,0.3)',
                            borderRadius: 8,
                            backdropFilter: 'blur(10px)',
                            fontSize: 12,
                          }}
                          labelStyle={{ color: '#00D4FF', fontWeight: 600, marginBottom: 4 }}
                          formatter={(value: number) => [`${value}%`, '系统综合负荷率']}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                          formatter={(value) => <span className="text-gray-300">{value}</span>}
                        />
                        <Line
                          type="monotone"
                          dataKey="负荷率"
                          stroke="#00D4FF"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 2, fill: '#00D4FF', stroke: '#fff' }}
                        />
                        <Line
                          type="monotone"
                          dataKey={() => 90}
                          stroke="#FF3B5C"
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          dot={false}
                          name="预警阈值(90%)"
                          legendType="line"
                        />
                        <Line
                          type="monotone"
                          dataKey={() => 75}
                          stroke="#FFC107"
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          dot={false}
                          name="关注阈值(75%)"
                          legendType="line"
                        />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </HUDPanel>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
