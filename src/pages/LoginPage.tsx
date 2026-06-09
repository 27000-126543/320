import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield, User, Radio, Building2, Crown, ScanFace,
  Clock, Monitor, Wifi, ChevronRight, Users,
  CheckCircle2, AlertTriangle, Zap,
} from 'lucide-react';
import ScanFrame from '@/components/ui/ScanFrame';
import HUDPanel from '@/components/ui/HUDPanel';
import GlowButton from '@/components/ui/GlowButton';
import { useUserStore } from '@/store/useUserStore';
import { ROLE_LABEL, UserRole } from '@/types';
import { cn } from '@/lib/utils';

/** 角色配置信息 */
interface RoleCardConfig {
  role: UserRole;
  icon: React.ReactNode;
  color: string;
  description: string;
  permissions: string[];
}

const ROLE_CONFIGS: RoleCardConfig[] = [
  {
    role: 'operator',
    icon: <User size={28} />,
    color: '#00D4FF',
    description: '基层运维值班人员',
    permissions: ['实时监控查看', '设备状态上报', '基础操作日志'],
  },
  {
    role: 'dispatcher',
    icon: <Radio size={28} />,
    color: '#1E90FF',
    description: '能源调度中心调度员',
    permissions: ['负荷调度控制', '预案审批执行', '设备远程控制'],
  },
  {
    role: 'director',
    icon: <Crown size={28} />,
    color: '#FFC107',
    description: '能源管理中心主任',
    permissions: ['全局数据概览', '二级预案审批', '报表分析决策'],
  },
  {
    role: 'bureau',
    icon: <Building2 size={28} />,
    color: '#9C27B0',
    description: '市能源局监管人员',
    permissions: ['多区域汇总', '三级审批权限', '行政监管审计'],
  },
];

/** 星空粒子背景组件 */
const StarryBackground = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 180 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 深色渐变背景 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 20% 30%, #0F2847 0%, #0A1628 50%, #050D18 100%)',
        }}
      />
      {/* 网格线 */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 212, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />
      {/* 星星粒子 */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,0.5)`,
          }}
          animate={{
            opacity: [star.opacity, star.opacity * 0.3, star.opacity],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* 装饰性光晕 */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #00D4FF 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #9C27B0 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
};

/** 角色选择卡片组件 */
interface RoleCardProps {
  config: RoleCardConfig;
  selected: boolean;
  onClick: () => void;
  index: number;
}

const RoleCard = ({ config, selected, onClick, index }: RoleCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onClick={onClick}
      className={cn(
        'relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-300',
        'bg-space-blue/40 backdrop-blur-sm overflow-hidden group',
        selected
          ? 'border-cyber-blue shadow-glow-blue scale-105'
          : 'border-cyber-blue/20 hover:border-cyber-blue/50 hover:shadow-[0_0_20px_rgba(0,212,255,0.2)]',
      )}
      style={{
        borderColor: selected ? config.color : undefined,
        boxShadow: selected
          ? `0 0 25px ${config.color}60, inset 0 0 30px ${config.color}20`
          : undefined,
      }}
    >
      {/* 选中时的流光效果 */}
      {selected && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.color}15, transparent)`,
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <div className="relative flex flex-col items-center gap-3">
        {/* 图标 */}
        <div
          className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center transition-all',
            'border',
          )}
          style={{
            backgroundColor: `${config.color}15`,
            borderColor: `${config.color}40`,
            color: config.color,
          }}
        >
          {config.icon}
        </div>

        {/* 角色名称 */}
        <h3
          className="text-sm font-bold tracking-wide"
          style={{ color: selected ? config.color : '#fff' }}
        >
          {ROLE_LABEL[config.role]}
        </h3>

        {/* 角色描述 */}
        <p className="text-[11px] text-gray-400 text-center leading-relaxed">
          {config.description}
        </p>

        {/* 权限标签 */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {config.permissions.map((perm) => (
            <span
              key={perm}
              className={cn(
                'text-[9px] px-2 py-0.5 rounded-full border transition-all',
                selected
                  ? 'bg-cyber-blue/20 border-cyber-blue/40 text-cyber-blue'
                  : 'bg-space-dark/50 border-gray-600 text-gray-500',
              )}
            >
              {perm}
            </span>
          ))}
        </div>

        {/* 选中指示器 */}
        <div
          className={cn(
            'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300',
            selected ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
          )}
          style={{ backgroundColor: config.color }}
        >
          <CheckCircle2 size={12} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
};

/** 登录日志列表项 */
interface LogItemProps {
  time: string;
  success: boolean;
  device: string;
  ip: string;
}

const LogItem = ({ time, success, device, ip }: LogItemProps) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-3 py-2 border-b border-cyber-blue/10 last:border-0"
  >
    <div
      className={cn(
        'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
        success
          ? 'bg-safe-green/15 text-safe-green border border-safe-green/30'
          : 'bg-alert-red/15 text-alert-red border border-alert-red/30',
      )}
    >
      {success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/90 font-medium">{device}</span>
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded',
            success
              ? 'bg-safe-green/20 text-safe-green'
              : 'bg-alert-red/20 text-alert-red',
          )}
        >
          {success ? '成功' : '失败'}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {time}
        </span>
        <span className="flex items-center gap-1">
          <Wifi size={10} />
          {ip}
        </span>
      </div>
    </div>
  </motion.div>
);

/** 人脸库人员项 */
interface FaceLibraryItemProps {
  name: string;
  role: UserRole;
  avatar: string;
  onClick: () => void;
}

const FaceLibraryItem = ({ name, role, avatar, onClick }: FaceLibraryItemProps) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer
               border border-cyber-blue/15 bg-space-dark/30 hover:bg-cyber-blue/10
               hover:border-cyber-blue/30 transition-all"
  >
    <img
      src={avatar}
      alt={name}
      className="w-9 h-9 rounded-md object-cover border border-cyber-blue/30"
      onError={(e) => {
        (e.target as HTMLImageElement).src =
          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%230F2847" width="100" height="100"/><text x="50" y="60" font-size="40" text-anchor="middle" fill="%2300D4FF">👤</text></svg>';
      }}
    />
    <div className="flex-1 min-w-0">
      <div className="text-xs text-white/90 font-medium truncate">{name}</div>
      <div className="text-[10px] text-cyber-blue/70">{ROLE_LABEL[role]}</div>
    </div>
    <ChevronRight size={14} className="text-gray-500" />
  </motion.div>
);

/** 主页面 - 人脸识别登录 */
export default function LoginPage() {
  const navigate = useNavigate();
  const {
    users,
    loginLogs,
    currentUser,
    isAuthenticated,
    selectedRole,
    setSelectedRole,
    scanningFace,
    faceScanProgress,
    startFaceScan,
    loginAsRole,
  } = useUserStore();

  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  /** 已登录自动跳转 */
  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate]);

  /** 根据store状态更新扫描状态 */
  useEffect(() => {
    if (scanningFace) {
      setScanStatus('scanning');
    } else if (isAuthenticated && faceScanProgress >= 100) {
      setScanStatus('success');
    }
  }, [scanningFace, isAuthenticated, faceScanProgress]);

  /** 处理角色选择 */
  const handleRoleSelect = useCallback((role: UserRole) => {
    setSelectedRole(role);
    setScanStatus('idle');
  }, [setSelectedRole]);

  /** 快捷登录 */
  const handleQuickLogin = useCallback((role: UserRole) => {
    loginAsRole(role);
  }, [loginAsRole]);

  /** 点击开始扫描 */
  const handleStartScan = useCallback(async () => {
    if (!selectedRole || scanningFace) return;
    const success = await startFaceScan();
    if (!success) {
      setScanStatus('failed');
      setTimeout(() => setScanStatus('idle'), 2000);
    }
  }, [selectedRole, scanningFace, startFaceScan]);

  /** 当前选中角色配置 */
  const selectedConfig = ROLE_CONFIGS.find(c => c.role === selectedRole);

  /** 当前选中的用户信息 */
  const matchedUser = selectedRole
    ? users.find(u => u.role === selectedRole) || users[0]
    : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans text-white">
      {/* 星空背景 */}
      <StarryBackground />

      {/* 侧边Logo和标题 */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute left-8 top-8 z-20 flex items-center gap-3"
      >
        <div className="relative">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center
                       bg-gradient-to-br from-cyber-blue to-electric-blue
                       shadow-glow-blue"
          >
            <Zap size={28} className="text-white" />
          </div>
          <div
            className="absolute -inset-1 rounded-xl border border-cyber-blue/40 animate-pulse"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold font-orbitron tracking-wider text-white">
            智慧城市综合能源平台
          </h1>
          <p className="text-xs text-cyber-blue/70 tracking-widest mt-0.5">
            SMART CITY · INTEGRATED ENERGY SYSTEM
          </p>
        </div>
      </motion.div>

      {/* 右上角系统信息 */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute right-8 top-8 z-20 flex items-center gap-6 text-xs text-gray-400"
      >
        <span className="flex items-center gap-1.5">
          <Monitor size={14} className="text-cyber-blue/60" />
          调度中心-主工位-01
        </span>
        <span className="flex items-center gap-1.5">
          <Wifi size={14} className="text-safe-green/80" />
          <span className="text-safe-green">网络正常</span>
        </span>
      </motion.div>

      {/* 主内容区域 */}
      <div className="relative z-10 w-full h-full flex items-center justify-center px-8">
        <div className="w-full max-w-7xl grid grid-cols-12 gap-6 items-start">
          {/* 左侧 - 人脸库 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="col-span-3"
          >
            <HUDPanel
              title={
                <span className="flex items-center gap-2">
                  <Users size={16} className="text-cyber-blue" />
                  <span>人脸库</span>
                  <span className="text-[10px] text-gray-500 font-normal ml-1">
                    共 {users.length} 人
                  </span>
                </span>
              }
              accentColor="cyber-blue"
              className="h-[520px]"
            >
              <div className="h-full overflow-y-auto pr-1 space-y-2">
                {users.map((user, i) => (
                  <FaceLibraryItem
                    key={user.id}
                    name={user.name}
                    role={user.role}
                    avatar={user.avatar}
                    onClick={() => handleQuickLogin(user.role)}
                  />
                ))}
              </div>
            </HUDPanel>

            {/* 快捷登录提示 */}
            <div className="mt-4 p-3 rounded-lg bg-space-blue/40 border border-cyber-blue/15">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                💡 点击上方人员卡片可<span className="text-cyber-blue font-medium">快捷登录</span>，
                或选择角色后点击「开始扫描」进行人脸识别。
              </p>
            </div>
          </motion.div>

          {/* 中间 - 扫描框和角色选择 */}
          <div className="col-span-6 flex flex-col items-center gap-6">
            {/* 扫描框区域 */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              <ScanFrame
                status={scanStatus}
                progress={faceScanProgress}
                autoProgress={false}
                size={300}
              />

              {/* 登录成功后显示用户信息 */}
              <AnimatePresence>
                {currentUser && scanStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-80"
                  >
                    <div
                      className="rounded-xl border-2 border-safe-green/50 p-4
                                 bg-safe-green/10 backdrop-blur-sm shadow-glow-green"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative">
                          <img
                            src={currentUser.avatar}
                            alt={currentUser.name}
                            className="w-12 h-12 rounded-lg object-cover border-2 border-safe-green/50"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%230F2847" width="100" height="100"/><text x="50" y="60" font-size="40" text-anchor="middle" fill="%2300E676">👤</text></svg>';
                            }}
                          />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-safe-green flex items-center justify-center">
                            <CheckCircle2 size={12} className="text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-white">
                            {currentUser.name}
                          </h4>
                          <p className="text-xs text-safe-green">
                            {ROLE_LABEL[currentUser.role]}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs border-t border-safe-green/20 pt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">所属部门</span>
                          <span className="text-white/90">{currentUser.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">上次登录</span>
                          <span className="text-white/90">{currentUser.lastLogin}</span>
                        </div>
                      </div>
                      <motion.div
                        className="mt-3 text-center text-xs text-safe-green animate-pulse"
                      >
                        ✓ 身份验证通过，正在进入系统...
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* 用户角色信息显示（选择角色后） */}
            <AnimatePresence>
              {matchedUser && !currentUser && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full max-w-lg"
                >
                  <div
                    className="rounded-xl border p-4 bg-space-blue/50 backdrop-blur-sm"
                    style={{
                      borderColor: `${selectedConfig?.color}40`,
                      boxShadow: `inset 0 0 30px ${selectedConfig?.color}15`,
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={matchedUser.avatar}
                        alt={matchedUser.name}
                        className="w-14 h-14 rounded-xl object-cover border"
                        style={{ borderColor: `${selectedConfig?.color}50` }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%230F2847" width="100" height="100"/><text x="50" y="60" font-size="40" text-anchor="middle" fill="%2300D4FF">👤</text></svg>';
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="text-base font-bold" style={{ color: selectedConfig?.color }}>
                          {matchedUser.name}
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {ROLE_LABEL[matchedUser.role]} · {matchedUser.department}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                          <Clock size={10} />
                          上次登录：{matchedUser.lastLogin}
                        </p>
                      </div>
                      <Shield size={28} style={{ color: selectedConfig?.color }} className="opacity-60" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 角色选择卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="w-full"
            >
              <div className="text-center mb-4">
                <h2 className="text-sm font-bold text-white/90 tracking-wide">
                  请选择登录角色
                </h2>
                <p className="text-[11px] text-gray-500 mt-1">
                  请先选择您的身份角色，然后进行人脸识别登录
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {ROLE_CONFIGS.map((config, index) => (
                  <RoleCard
                    key={config.role}
                    config={config}
                    selected={selectedRole === config.role}
                    onClick={() => handleRoleSelect(config.role)}
                    index={index}
                  />
                ))}
              </div>
            </motion.div>

            {/* 开始扫描按钮 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <GlowButton
                variant="primary"
                size="lg"
                icon={<ScanFace size={18} />}
                glowIntensity={3}
                loading={scanningFace}
                disabled={!selectedRole || scanningFace}
                onClick={handleStartScan}
                className="px-10 py-3 text-base tracking-wider"
              >
                {scanningFace
                  ? '正在识别中...'
                  : selectedRole
                    ? '开始人脸识别'
                    : '请先选择角色'}
              </GlowButton>
            </motion.div>
          </div>

          {/* 右侧 - 登录日志 */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="col-span-3"
          >
            <HUDPanel
              title={
                <span className="flex items-center gap-2">
                  <Clock size={16} className="text-cyber-blue" />
                  <span>登录日志</span>
                </span>
              }
              accentColor="cyber-blue"
              className="h-[520px]"
            >
              <div className="h-full flex flex-col">
                {/* 统计信息 */}
                <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
                  <div className="rounded-lg border border-safe-green/30 bg-safe-green/5 p-3">
                    <div className="text-[10px] text-gray-500 mb-1">今日成功</div>
                    <div className="text-xl font-bold font-orbitron text-safe-green">
                      {loginLogs.filter(l => l.success).length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-alert-red/30 bg-alert-red/5 p-3">
                    <div className="text-[10px] text-gray-500 mb-1">登录失败</div>
                    <div className="text-xl font-bold font-orbitron text-alert-red">
                      {loginLogs.filter(l => !l.success).length}
                    </div>
                  </div>
                </div>

                {/* 日志列表 */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  {loginLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                      <Monitor size={32} className="opacity-40" />
                      <p className="text-xs">暂无登录记录</p>
                    </div>
                  ) : (
                    loginLogs.slice(0, 12).map((log, i) => (
                      <LogItem
                        key={i}
                        time={log.time}
                        success={log.success}
                        device={log.device}
                        ip={log.ip}
                      />
                    ))
                  )}
                </div>
              </div>
            </HUDPanel>
          </motion.div>
        </div>
      </div>

      {/* 底部版权信息 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10
                   text-[10px] text-gray-600 tracking-wider text-center"
      >
        <p>© 2026 智慧城市综合能源可视化平台 · 市能源局授权使用</p>
        <p className="mt-1">系统版本 V3.2.0 · 安全等级：涉密三级</p>
      </motion.div>
    </div>
  );
}
