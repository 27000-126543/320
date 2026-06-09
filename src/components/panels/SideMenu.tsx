import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileCheck, FileDown, Settings, LogOut,
  ChevronLeft, ChevronRight, Zap, Bell, BarChart3, Users,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useApprovalStore } from '@/store/useApprovalStore';
import { cn } from '@/lib/utils';
import { ROLE_LABEL } from '@/types';

export type MenuKey = 'dashboard' | 'approval' | 'report' | 'settings' | 'logout';

interface MenuItem {
  key: MenuKey;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
  path: string;
  divider?: boolean;
  danger?: boolean;
}

interface SideMenuProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  active?: MenuKey;
  onActiveChange?: (key: MenuKey) => void;
}

export default function SideMenu({
  collapsed: externalCollapsed,
  onCollapsedChange,
  active,
  onActiveChange,
}: SideMenuProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = externalCollapsed ?? internalCollapsed;
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useUserStore();
  const { alerts } = useAlertStore();
  const { plans } = useApprovalStore();

  const unresolvedCount = alerts.filter(a => !a.resolved).length;
  const pendingApproval = plans.filter(p => p.status === 'pending').length;

  const currentActive = active ?? deriveActiveFromPath(location.pathname);

  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      path: '/',
    },
    {
      key: 'approval',
      label: '审批中心',
      icon: <FileCheck size={20} />,
      badge: pendingApproval,
      badgeColor: '#FFC107',
      path: '/approval',
    },
    {
      key: 'report',
      label: '报表导出',
      icon: <FileDown size={20} />,
      path: '/report',
    },
    {
      key: 'settings',
      label: '设置',
      icon: <Settings size={20} />,
      path: '/settings',
      divider: true,
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogOut size={20} />,
      path: '',
      danger: true,
    },
  ];

  const handleClick = (item: MenuItem) => {
    if (item.key === 'logout') {
      logout();
      navigate('/login');
      return;
    }
    onActiveChange?.(item.key);
    if (item.path && location.pathname !== item.path) {
      navigate(item.path);
    }
  };

  return (
    <aside
      className={cn(
        'relative h-full flex flex-col bg-space-dark/95 backdrop-blur-md border-r border-cyber-blue/20 transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-60'
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-cyber-blue/15 shrink-0">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyber-blue to-electric-blue flex items-center justify-center shadow-glow-blue shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white font-orbitron tracking-wide truncate">能源调度</div>
              <div className="text-[9px] text-cyber-blue/50 truncate">Energy Grid</div>
            </div>
          </motion.div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyber-blue to-electric-blue flex items-center justify-center shadow-glow-blue shrink-0">
              <Zap size={18} className="text-white" />
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-7 h-7 rounded-md border border-cyber-blue/25 flex items-center justify-center text-cyber-blue/60 hover:bg-cyber-blue/10 hover:text-cyber-blue transition shrink-0',
            collapsed && 'absolute -right-3.5 top-6 bg-space-dark border-cyber-blue/40 shadow-hud z-10'
          )}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="space-y-1 px-2.5">
          {menuItems.map((item, idx) => (
            <div key={item.key}>
              {item.divider && !collapsed && (
                <li className="my-3 mx-1">
                  <div className="h-px bg-gradient-to-r from-cyber-blue/20 via-cyber-blue/10 to-transparent" />
                </li>
              )}
              {item.divider && collapsed && (
                <li className="my-3 mx-3">
                  <div className="h-px bg-cyber-blue/20" />
                </li>
              )}
              <li>
                <button
                  onClick={() => handleClick(item)}
                  className={cn(
                    'group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                    currentActive === item.key
                      ? item.danger
                        ? 'bg-alert-red/15 text-alert-red shadow-[inset_0_0_15px_rgba(255,59,92,0.15)]'
                        : 'bg-cyber-blue/15 text-cyber-blue shadow-[inset_0_0_15px_rgba(0,212,255,0.15)]'
                      : item.danger
                        ? 'text-alert-red/70 hover:bg-alert-red/10 hover:text-alert-red'
                        : 'text-gray-400 hover:bg-cyber-blue/8 hover:text-white/90'
                  )}
                >
                  {currentActive === item.key && (
                    <motion.span
                      layoutId="active-indicator"
                      className={cn(
                        'absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full',
                        item.danger ? 'bg-alert-red' : 'bg-cyber-blue'
                      )}
                      style={{ boxShadow: item.danger ? '0 0 10px #FF3B5C' : '0 0 10px #00D4FF' }}
                    />
                  )}

                  <span className={cn(
                    'shrink-0 relative',
                    currentActive === item.key && 'animate-pulse-slow'
                  )}>
                    {item.icon}
                    {item.badge && item.badge > 0 && collapsed && (
                      <span
                        className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1 text-white"
                        style={{ backgroundColor: item.badgeColor || '#FF3B5C' }}
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </span>

                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="flex-1 text-left text-sm font-medium flex items-center justify-between gap-2 min-w-0"
                      >
                        <span className="truncate">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span
                            className="shrink-0 min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center px-1.5 text-white"
                            style={{ backgroundColor: item.badgeColor || '#FF3B5C' }}
                          >
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {collapsed && (
                    <Tooltip label={item.label}>
                      <span className="sr-only">{item.label}</span>
                    </Tooltip>
                  )}
                </button>
              </li>
            </div>
          ))}
        </ul>

        {!collapsed && unresolvedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-2.5 mt-4 p-3 rounded-lg border border-alert-red/30 bg-alert-red/8"
          >
            <div className="flex items-center gap-2 mb-2">
              <Bell size={14} className="text-alert-red shrink-0 animate-blink" />
              <span className="text-xs font-bold text-alert-red">实时告警</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-alert-red text-white font-bold">
                {unresolvedCount}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              检测到 {unresolvedCount} 条未处理预警，请及时前往预警中心处置
            </p>
          </motion.div>
        )}
      </nav>

      {currentUser && (
        <div
          className={cn(
            'border-t border-cyber-blue/15 p-3 shrink-0',
            'bg-gradient-to-t from-cyber-blue/5 to-transparent'
          )}
        >
          <div className={cn(
            'flex items-center gap-2.5 p-2 rounded-lg hover:bg-cyber-blue/8 transition cursor-pointer',
            collapsed && 'justify-center px-1'
          )}>
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyber-blue/40 to-electric-blue/40 flex items-center justify-center border border-cyber-blue/30 overflow-hidden">
                <Users size={16} className="text-cyber-blue" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-safe-green border-2 border-space-dark" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{currentUser.name}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-cyber-blue/60">
                  <BarChart3 size={10} />
                  <span className="truncate">{ROLE_LABEL[currentUser.role]}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative inline-block">
      {children}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md bg-space-blue border border-cyber-blue/40 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-hud">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-space-blue" />
      </div>
    </div>
  );
}

function deriveActiveFromPath(path: string): MenuKey {
  if (path.startsWith('/approval')) return 'approval';
  if (path.startsWith('/report')) return 'report';
  if (path.startsWith('/settings')) return 'settings';
  return 'dashboard';
}
