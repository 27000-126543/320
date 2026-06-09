import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Zap, Flame, Fuel, Battery, Building2, AlertTriangle,
  CheckCircle2, Clock, Wrench, Power, Info, Activity,
} from 'lucide-react';
import { useStationStore } from '@/store/useStationStore';
import OutputChart from '@/components/charts/OutputChart';
import { cn } from '@/lib/utils';
import {
  EnergyStation, EnergyStationType, EventRecord, STATION_TYPE_LABEL, STATUS_LABEL,
} from '@/types';
import { formatNumber, getLoadRateColor, getOutputUnit, getStatusColor, formatDateTime } from '@/utils/formatters';

const STATION_ICON: Record<EnergyStationType, React.ReactNode> = {
  substation: <Zap size={20} />,
  heat_station: <Flame size={20} />,
  gas_station: <Fuel size={20} />,
  storage_station: <Battery size={20} />,
  building: <Building2 size={20} />,
};

interface StationDetailProps {
  open: boolean;
  onClose: () => void;
}

export default function StationDetail({ open, onClose }: StationDetailProps) {
  const { selectedStationId, getStationById, events, setBackupActive, loadHistory } = useStationStore();
  const station = selectedStationId ? getStationById(selectedStationId) : undefined;

  const stationEvents = events.filter(e => e.stationId === selectedStationId).slice(0, 8);

  const outputData = loadHistory.slice(-24).map(d => ({
    time: d.time,
    output: station ? (station.maxOutput * (station.loadRate / 100) + (Math.random() - 0.5) * station.maxOutput * 0.05) : 0,
    maxOutput: station?.maxOutput,
  }));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 h-full w-[480px] max-w-full bg-space-dark/95 backdrop-blur-md border-l border-cyber-blue/30 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {station ? (
              <StationContent
                station={station}
                stationEvents={stationEvents}
                outputData={outputData}
                onToggleBackup={() => station && setBackupActive(station.id, true)}
                onClose={onClose}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                <Info size={48} className="text-cyber-blue/30" />
                <p className="text-sm">未选择能源站</p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

interface StationContentProps {
  station: EnergyStation;
  stationEvents: EventRecord[];
  outputData: { time: string; output: number; maxOutput?: number }[];
  onToggleBackup: () => void;
  onClose: () => void;
}

function StationContent({ station, stationEvents, outputData, onToggleBackup, onClose }: StationContentProps) {
  const typeColor = station.type === 'substation' ? '#1E90FF'
    : station.type === 'heat_station' ? '#FF6B35'
    : station.type === 'gas_station' ? '#00C48C'
    : station.type === 'storage_station' ? '#9C27B0' : '#00D4FF';
  const unit = getOutputUnit(station.type);
  const statusColor = getStatusColor(station.status);

  return (
    <div className="flex flex-col min-h-full">
      <div
        className="sticky top-0 z-10 px-5 py-4 border-b border-cyber-blue/20 bg-space-dark/90 backdrop-blur-sm"
        style={{ boxShadow: `0 2px 20px ${typeColor}15` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center border"
              style={{ backgroundColor: `${typeColor}20`, borderColor: `${typeColor}40`, color: typeColor }}
            >
              {STATION_ICON[station.type]}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{station.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-cyber-blue/60">{station.code}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: `${typeColor}20`, color: typeColor }}>
                  {STATION_TYPE_LABEL[station.type]}
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
                  <span style={{ color: statusColor }}>{STATUS_LABEL[station.status]}</span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md border border-cyber-blue/30 flex items-center justify-center text-cyber-blue/70 hover:bg-cyber-blue/10 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5 pb-24">
        <section className="grid grid-cols-2 gap-3">
          <InfoTile label="实时出力" value={`${formatNumber(station.realtimeOutput, 1)} ${unit}`} color={typeColor} />
          <InfoTile label="额定容量" value={`${formatNumber(station.maxOutput, 0)} ${unit}`} color="#00D4FF" />
          <InfoTile label="负荷率" value={`${formatNumber(station.loadRate, 1)}%`} color={getLoadRateColor(station.loadRate)} />
          <InfoTile
            label="备用能源"
            value={station.isBackupActive ? '已启用' : '未启用'}
            color={station.isBackupActive ? '#00E676' : '#718096'}
          />
        </section>

        <section>
          <SectionTitle title="24小时出力曲线" icon={<Activity size={14} />} color={typeColor} />
          <div className="mt-3 rounded-lg border border-cyber-blue/20 bg-space-blue/40 p-3">
            <OutputChart data={outputData} color={typeColor} unit={unit} />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle title="当前参数" icon={<Info size={14} />} color="#00D4FF" />
            <button
              onClick={onToggleBackup}
              disabled={station?.isBackupActive}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition',
                station.isBackupActive
                  ? 'bg-safe-green/20 border-safe-green/50 text-safe-green cursor-default opacity-90'
                  : 'bg-alert-red/10 border-alert-red/40 text-alert-red hover:bg-alert-red/20',
                station.isBackupActive && 'shadow-[inset_0_0_15px_rgba(0,230,118,0.25)]',
              )}
            >
              <Power size={12} />
              {station.isBackupActive ? '✓ 备用能源已投入' : '启用备用能源'}
            </button>
          </div>
          <div className="rounded-lg border border-cyber-blue/20 bg-space-blue/40 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['设备编号', station.code],
                  ['类型', STATION_TYPE_LABEL[station.type]],
                  ['运行状态', STATUS_LABEL[station.status]],
                  ['坐标位置', `(${station.position.x.toFixed(1)}, ${station.position.z.toFixed(1)})`],
                  ['实时出力', `${formatNumber(station.realtimeOutput, 2)} ${unit}`],
                  ['额定出力', `${formatNumber(station.maxOutput, 2)} ${unit}`],
                  ['负荷率', `${formatNumber(station.loadRate, 2)}%`],
                  ['备用状态', station.isBackupActive ? '投入运行' : '待机'],
                  ['连接建筑', station.connectedBuildings?.length || 0 + ' 个'],
                ].map(([k, v], i) => (
                  <tr key={k} className={i % 2 ? 'bg-cyber-blue/5' : ''}>
                    <td className="px-3 py-2 text-cyber-blue/60 text-xs border-r border-cyber-blue/10 w-28">{k}</td>
                    <td className="px-3 py-2 text-white/90 text-xs font-mono">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SectionTitle title="故障 / 事件记录" icon={<Wrench size={14} />} color="#FFC107" />
          {stationEvents.length === 0 ? (
            <div className="mt-3 rounded-lg border border-cyber-blue/20 bg-space-blue/40 p-6 text-center text-gray-500 text-sm">
              暂无事件记录
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {stationEvents.map(ev => (
                <li
                  key={ev.id}
                  className="rounded-lg border border-cyber-blue/20 bg-space-blue/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <EventLevelBadge level={ev.level} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-white/90">{ev.description}</span>
                          <EventTypeTag type={ev.type} />
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                          <span className="flex items-center gap-1"><Clock size={10} />{ev.time}</span>
                          <span className="flex items-center gap-1"><Wrench size={10} />处置：{ev.handler}</span>
                        </div>
                      </div>
                    </div>
                    <EventStatusChip status={ev.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: `${color}25`,
        backgroundColor: `${color}08`,
        boxShadow: `inset 0 0 15px ${color}10`,
      }}
    >
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="mt-1 font-mono font-bold text-lg" style={{ color }}>{value}</div>
    </div>
  );
}

function SectionTitle({ title, icon, color }: { title: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color }}>{icon}</span>
      <h3 className="text-sm font-bold text-white/90 tracking-wide">{title}</h3>
      <div className="flex-1 h-px bg-gradient-to-r from-cyber-blue/30 to-transparent" />
    </div>
  );
}

function EventLevelBadge({ level }: { level: 1 | 2 | 3 }) {
  const colors = ['#00E676', '#FFC107', '#FF3B5C'];
  const labels = ['一般', '较重', '严重'];
  return (
    <span
      className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold"
      style={{ backgroundColor: `${colors[level - 1]}20`, color: colors[level - 1], border: `1px solid ${colors[level - 1]}40` }}
    >
      {labels[level - 1]}
    </span>
  );
}

function EventTypeTag({ type }: { type: EventRecord['type'] }) {
  const map: Record<EventRecord['type'], { label: string; color: string }> = {
    fault: { label: '故障', color: '#FF3B5C' },
    warning: { label: '预警', color: '#FFC107' },
    maintenance: { label: '维护', color: '#00D4FF' },
    emergency: { label: '应急', color: '#9C27B0' },
  };
  const cfg = map[type];
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function EventStatusChip({ status }: { status: EventRecord['status'] }) {
  const map: Record<EventRecord['status'], { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: '待处理', color: '#FFC107', icon: <Clock size={10} /> },
    processing: { label: '处理中', color: '#1E90FF', icon: <AlertTriangle size={10} /> },
    resolved: { label: '已解决', color: '#00E676', icon: <CheckCircle2 size={10} /> },
  };
  const cfg = map[status];
  return (
    <span
      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}40` }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
