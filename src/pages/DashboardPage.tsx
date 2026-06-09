import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, X, Siren, AlertTriangle,
  Clock, MapPin, Send, Eye,
} from 'lucide-react';
import CityScene from '@/components/3d/CityScene';
import SideMenu from '@/components/panels/SideMenu';
import TopOverview from '@/components/panels/TopOverview';
import StationDetail from '@/components/panels/StationDetail';
import ForecastPanel from '@/components/panels/ForecastPanel';
import AlertCenter from '@/components/panels/AlertCenter';
import HUDPanel from '@/components/ui/HUDPanel';
import { useUserStore } from '@/store/useUserStore';
import { useStationStore } from '@/store/useStationStore';
import { useAlertStore } from '@/store/useAlertStore';
import { Alert, AlertType, ROLE_LABEL } from '@/types';
import { cn } from '@/lib/utils';

/** 预警类型映射配置 */
const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; color: string }> = {
  load_overrun: { label: '负荷超限', color: '#1E90FF' },
  pressure_overrun: { label: '压力异常', color: '#FF6B35' },
  gas_leak: { label: '燃气泄漏', color: '#00C48C' },
  equipment_fault: { label: '设备故障', color: '#9C27B0' },
};

/** 预警等级配置 */
const LEVEL_CONFIG: Record<1 | 2 | 3, { label: string; color: string }> = {
  1: { label: '一般', color: '#00E676' },
  2: { label: '较重', color: '#FFC107' },
  3: { label: '严重', color: '#FF3B5C' },
};

/** 右侧面板标签配置 */
type RightPanelKey = 'station' | 'forecast' | 'alert';

interface RightPanelTab {
  key: RightPanelKey;
  label: string;
  accentColor: 'cyber-blue' | 'heat-orange' | 'alert-red';
  icon: React.ReactNode;
}

/**
 * Dashboard 主页面
 * - 3D场景占满全屏
 * - 左侧可折叠菜单
 * - 顶部概览面板
 * - 右侧三个可切换的面板（能源站详情 / 负荷预测 / 预警中心）
 * - 底部预警浮窗（滚动显示最新预警）
 * - 预警弹窗提醒（新预警出现时弹出）
 * - 路由守卫：未登录跳转 /login
 */
export default function DashboardPage() {
  const navigate = useNavigate();

  // ===== Store 状态 =====
  const { isAuthenticated, currentUser } = useUserStore();
  const startSimulation = useStationStore((s) => s.startSimulation);
  const startAlertDetection = useAlertStore((s) => s.startAlertDetection);
  const getStations = useStationStore.getState;
  const getPrev = () => useStationStore.getState().prevLoadRates;
  const {
    alerts,
    showAlertPopup,
    latestAlert,
    dismissPopup,
    resolveAlert,
  } = useAlertStore();

  // ===== 本地 UI 状态 =====
  const [sideMenuCollapsed, setSideMenuCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeRightPanel, setActiveRightPanel] = useState<RightPanelKey>('alert');
  const [stationDetailOpen, setStationDetailOpen] = useState(false);

  // ===== 路由守卫：未登录跳转 =====
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // ===== 启动模拟循环：能源站数据 + 预警检测 =====
  useEffect(() => {
    if (!isAuthenticated) return;

    // 启动能源站模拟循环
    const stopSimulation = startSimulation();
    // 启动预警检测循环
    const stopAlert = startAlertDetection(getStations, getPrev);

    // 组件卸载时清理定时器
    return () => {
      stopSimulation();
      stopAlert();
    };
  }, [isAuthenticated, startSimulation, startAlertDetection, getStations, getPrev]);

  // ===== 处理预警处置按钮 =====
  const handleResolveAlert = useCallback((alertId: string) => {
    resolveAlert(alertId);
  }, [resolveAlert]);

  // ===== 右侧面板标签配置 =====
  const rightPanelTabs: RightPanelTab[] = [
    {
      key: 'station',
      label: '能源站',
      accentColor: 'cyber-blue',
      icon: <Eye size={16} />,
    },
    {
      key: 'forecast',
      label: '预测',
      accentColor: 'heat-orange',
      icon: <Clock size={16} />,
    },
    {
      key: 'alert',
      label: '预警',
      accentColor: 'alert-red',
      icon: <Siren size={16} />,
    },
  ];

  // ===== 未解决的预警（用于底部浮窗） =====
  const unresolvedAlerts = alerts.filter(a => !a.resolved).slice(0, 5);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-space-dark text-white">
      {/* ===== 背景：3D城市场景（占满全屏） ===== */}
      <div className="absolute inset-0 z-0">
        <CityScene />
      </div>

      {/* ===== 顶部渐变遮罩，增强面板可读性 ===== */}
      <div className="absolute top-0 left-0 right-0 h-32 z-5 pointer-events-none
                      bg-gradient-to-b from-space-dark/90 via-space-dark/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-24 z-5 pointer-events-none
                      bg-gradient-to-t from-space-dark/80 via-space-dark/40 to-transparent" />

      {/* ===== 左侧：SideMenu 可折叠菜单 ===== */}
      <motion.div
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="absolute left-0 top-0 bottom-0 z-20 flex items-stretch"
      >
        <SideMenu
          collapsed={sideMenuCollapsed}
          onCollapsedChange={setSideMenuCollapsed}
          active="dashboard"
        />
      </motion.div>

      {/* ===== 顶部：TopOverview 概览面板 ===== */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="absolute top-0 z-20 transition-all duration-300"
        style={{
          left: sideMenuCollapsed ? '80px' : '260px',
          right: rightPanelOpen ? '440px' : '60px',
        }}
      >
        <TopOverview />
      </motion.div>

      {/* ===== 右侧：可收起的三标签面板 ===== */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="absolute right-0 top-0 bottom-0 z-20 flex items-stretch"
      >
        {/* 面板主体 */}
        <AnimatePresence mode="wait">
          {rightPanelOpen && (
            <motion.div
              key="panel-open"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 420, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full overflow-hidden"
            >
              <div className="w-[420px] h-full flex flex-col
                              bg-space-dark/85 backdrop-blur-md
                              border-l border-cyber-blue/25
                              shadow-[-10px_0_40px_rgba(0,0,0,0.5)]">
                {/* 标签栏 */}
                <div className="flex items-stretch border-b border-cyber-blue/20 shrink-0">
                  {rightPanelTabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveRightPanel(tab.key)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 px-3 py-3.5',
                        'text-xs font-medium transition-all relative',
                        activeRightPanel === tab.key
                          ? 'text-white bg-cyber-blue/10'
                          : 'text-gray-500 hover:text-white/80 hover:bg-white/5',
                      )}
                    >
                      <span
                        className={cn(
                          activeRightPanel === tab.key
                            ? tab.accentColor === 'cyber-blue' ? 'text-cyber-blue'
                              : tab.accentColor === 'heat-orange' ? 'text-heat-orange'
                                : 'text-alert-red'
                            : '',
                        )}
                      >
                        {tab.icon}
                      </span>
                      {tab.label}
                      {/* 激活下划线 */}
                      {activeRightPanel === tab.key && (
                        <motion.div
                          layoutId="right-panel-tab-indicator"
                          className={cn(
                            'absolute bottom-0 left-2 right-2 h-0.5 rounded-full',
                            tab.accentColor === 'cyber-blue' ? 'bg-cyber-blue'
                              : tab.accentColor === 'heat-orange' ? 'bg-heat-orange'
                                : 'bg-alert-red',
                          )}
                        />
                      )}
                    </button>
                  ))}

                  {/* 收起按钮 */}
                  <button
                    onClick={() => setRightPanelOpen(false)}
                    className="flex items-center justify-center w-10 shrink-0
                               text-gray-500 hover:text-white hover:bg-white/5
                               border-l border-cyber-blue/20 transition"
                    title="收起面板"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* 面板内容区 */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {activeRightPanel === 'station' && (
                      <motion.div
                        key="station-panel"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.25 }}
                        className="w-full h-full"
                      >
                        {/* 能源站详情：点击3D场景中的能源站触发 */}
                        {!stationDetailOpen ? (
                          <div className="h-full flex flex-col items-center justify-center
                                          text-gray-500 gap-3 p-6">
                            <div
                              className="w-20 h-20 rounded-2xl flex items-center justify-center
                                         bg-cyber-blue/10 border border-cyber-blue/30"
                            >
                              <Eye size={36} className="text-cyber-blue/60" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-white/70">点击3D场景中的能源站</p>
                              <p className="text-xs text-gray-500 mt-1">
                                查看详细运行数据、历史趋势、事件日志
                              </p>
                            </div>
                            <button
                              onClick={() => setStationDetailOpen(true)}
                              className="mt-2 px-4 py-2 rounded-lg text-xs
                                         border border-cyber-blue/40 text-cyber-blue
                                         bg-cyber-blue/10 hover:bg-cyber-blue/20 transition"
                            >
                              展开示例详情
                            </button>
                          </div>
                        ) : (
                          <StationDetail
                            open={stationDetailOpen}
                            onClose={() => setStationDetailOpen(false)}
                          />
                        )}
                      </motion.div>
                    )}

                    {activeRightPanel === 'forecast' && (
                      <motion.div
                        key="forecast-panel"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.25 }}
                        className="w-full h-full overflow-y-auto"
                      >
                        <ForecastPanel />
                      </motion.div>
                    )}

                    {activeRightPanel === 'alert' && (
                      <motion.div
                        key="alert-panel"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.25 }}
                        className="w-full h-full"
                      >
                        <AlertCenter />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 收起状态的展开按钮 */}
        <AnimatePresence>
          {!rightPanelOpen && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRightPanelOpen(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10
                         w-8 h-24 rounded-l-xl
                         flex items-center justify-center
                         bg-space-dark/80 backdrop-blur-sm
                         border border-r-0 border-cyber-blue/30
                         text-cyber-blue hover:text-white
                         hover:bg-cyber-blue/20 transition
                         shadow-[-4px_0_15px_rgba(0,0,0,0.4)]"
              title="展开面板"
            >
              <ChevronLeft size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ===== 底部：预警浮窗 ===== */}
      <AnimatePresence>
        {unresolvedAlerts.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="absolute bottom-4 z-20 transition-all duration-300"
            style={{
              left: sideMenuCollapsed ? '96px' : '276px',
              right: rightPanelOpen ? '440px' : '76px',
            }}
          >
            <HUDPanel
              accentColor="alert-red"
              className="!py-2 !px-4"
              headerExtra={
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-alert-red animate-pulse" />
                  实时预警推送
                </span>
              }
              title={
                <span className="flex items-center gap-2 text-sm">
                  <Siren size={16} className="text-alert-red" />
                  <span>预警速报</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full
                                   bg-alert-red/20 text-alert-red border border-alert-red/40">
                    {unresolvedAlerts.length} 条未处理
                  </span>
                </span>
              }
            >
              {/* 水平滚动的预警卡片 */}
              <div className="flex items-center gap-3 overflow-x-auto pb-1
                              scrollbar-thin scrollbar-thumb-cyber-blue/30">
                {unresolvedAlerts.map((alert: Alert) => {
                  const levelCfg = LEVEL_CONFIG[alert.level];
                  const typeCfg = ALERT_TYPE_CONFIG[alert.type];
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        'flex-shrink-0 flex items-center gap-3 max-w-md',
                        'rounded-lg border p-3 bg-space-blue/60 backdrop-blur-sm',
                        alert.level === 3
                          ? 'border-alert-red/50 shadow-[0_0_20px_rgba(255,59,92,0.25)]'
                          : 'border-cyber-blue/20',
                      )}
                    >
                      {/* 等级色条 */}
                      <div
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ backgroundColor: levelCfg.color }}
                      />
                      {/* 类型图标 */}
                      <div
                        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${typeCfg.color}20`,
                          color: typeCfg.color,
                          border: `1px solid ${typeCfg.color}40`,
                        }}
                      >
                        <AlertTriangle size={16} />
                      </div>
                      {/* 预警内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                            style={{
                              backgroundColor: `${levelCfg.color}20`,
                              color: levelCfg.color,
                            }}
                          >
                            {levelCfg.label}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {typeCfg.label}
                          </span>
                          {alert.level === 3 && (
                            <span className="flex items-center gap-0.5 text-[9px] text-alert-red">
                              <span className="w-1 h-1 rounded-full bg-alert-red animate-blink" />
                              紧急
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/90 truncate">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[9px] text-gray-500">
                          <span className="flex items-center gap-0.5">
                            <Clock size={9} />{alert.triggeredAt}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MapPin size={9} />{alert.area}
                          </span>
                        </div>
                      </div>
                      {/* 快速处置按钮 */}
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md
                                   text-[10px] font-medium
                                   border border-safe-green/40 bg-safe-green/15 text-safe-green
                                   hover:bg-safe-green/25 transition"
                      >
                        <Send size={10} />
                        处置
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </HUDPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 预警弹窗提醒（新预警时弹出） ===== */}
      <AnimatePresence>
        {showAlertPopup && latestAlert && !latestAlert.resolved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20
                       bg-black/50 backdrop-blur-sm"
            onClick={dismissPopup}
          >
            <motion.div
              initial={{ scale: 0.85, y: -40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: -20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'relative w-[460px] max-w-[92vw] overflow-hidden rounded-2xl',
                'bg-space-dark/95 backdrop-blur-xl border-2 shadow-2xl',
                latestAlert.level === 3
                  ? 'border-alert-red/60 shadow-[0_0_60px_rgba(255,59,92,0.4)]'
                  : latestAlert.level === 2
                    ? 'border-warning-yellow/60 shadow-[0_0_60px_rgba(255,193,7,0.35)]'
                    : 'border-safe-green/60 shadow-[0_0_60px_rgba(0,230,118,0.3)]',
              )}
            >
              {/* 顶部警报色条 */}
              <div
                className="h-1.5 w-full"
                style={{
                  backgroundColor: LEVEL_CONFIG[latestAlert.level].color,
                }}
              />
              {/* 警报闪烁角标 */}
              {latestAlert.level === 3 && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-10 animate-pulse"
                  style={{
                    background: `radial-gradient(circle at 20% 20%, ${LEVEL_CONFIG[3].color}, transparent 60%)`,
                  }}
                />
              )}

              <div className="p-6">
                {/* 头部 */}
                <div className="flex items-start gap-4 mb-4">
                  <motion.div
                    animate={latestAlert.level === 3 ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center shrink-0',
                      'border-2',
                    )}
                    style={{
                      backgroundColor: `${LEVEL_CONFIG[latestAlert.level].color}15`,
                      borderColor: `${LEVEL_CONFIG[latestAlert.level].color}50`,
                      color: LEVEL_CONFIG[latestAlert.level].color,
                    }}
                  >
                    <Siren size={28} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                        style={{
                          backgroundColor: `${LEVEL_CONFIG[latestAlert.level].color}20`,
                          color: LEVEL_CONFIG[latestAlert.level].color,
                          border: `1px solid ${LEVEL_CONFIG[latestAlert.level].color}40`,
                        }}
                      >
                        {LEVEL_CONFIG[latestAlert.level].label}预警
                      </span>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${ALERT_TYPE_CONFIG[latestAlert.type].color}15`,
                          color: ALERT_TYPE_CONFIG[latestAlert.type].color,
                          border: `1px solid ${ALERT_TYPE_CONFIG[latestAlert.type].color}30`,
                        }}
                      >
                        {ALERT_TYPE_CONFIG[latestAlert.type].label}
                      </span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Clock size={10} />
                        {latestAlert.triggeredAt}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      新的系统预警
                    </h3>
                  </div>
                  <button
                    onClick={dismissPopup}
                    className="w-8 h-8 rounded-lg flex items-center justify-center
                               text-gray-500 hover:text-white hover:bg-white/10 transition shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* 预警详情 */}
                <div
                  className="rounded-xl border p-4 mb-5"
                  style={{
                    backgroundColor: `${LEVEL_CONFIG[latestAlert.level].color}08`,
                    borderColor: `${LEVEL_CONFIG[latestAlert.level].color}25`,
                  }}
                >
                  <p className="text-sm text-white/90 leading-relaxed">
                    {latestAlert.message}
                  </p>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <MapPin size={12} className="text-cyber-blue/70" />
                      <span>{latestAlert.area}</span>
                    </div>
                    {currentUser && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span>通知对象：</span>
                        <span className="text-cyber-blue/80">
                          {ROLE_LABEL[currentUser.role]} · {currentUser.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 底部操作 */}
                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={dismissPopup}
                    className="px-5 py-2.5 rounded-lg text-xs font-medium
                               border border-gray-600 text-gray-400
                               hover:bg-white/5 hover:text-white transition"
                  >
                    稍后处理
                  </button>
                  <button
                    onClick={() => {
                      handleResolveAlert(latestAlert.id);
                      dismissPopup();
                      setActiveRightPanel('alert');
                      setRightPanelOpen(true);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium transition',
                      'border shadow-lg',
                      latestAlert.level === 3
                        ? 'bg-alert-red text-white border-alert-red/70 shadow-[0_0_25px_rgba(255,59,92,0.45)] hover:bg-alert-red/90'
                        : latestAlert.level === 2
                          ? 'bg-warning-yellow/90 text-space-dark border-warning-yellow/70 shadow-[0_0_25px_rgba(255,193,7,0.4)] hover:bg-warning-yellow'
                          : 'bg-safe-green text-white border-safe-green/70 shadow-[0_0_25px_rgba(0,230,118,0.4)] hover:bg-safe-green/90',
                    )}
                  >
                    <Send size={13} />
                    立即处置
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
