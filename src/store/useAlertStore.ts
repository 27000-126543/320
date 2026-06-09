import { create } from 'zustand';
import { Alert, RepairOrder, RepairStatus } from '@/types';
import { generateMockAlerts, generateMockStations, generateMockRepairOrders } from '@/utils/mockData';
import { detectAnomalies } from '@/utils/energyAlgorithm';
import { generateId, formatDateTime } from '@/utils/formatters';
import { useStationStore } from './useStationStore';

interface AlertState {
  alerts: Alert[];
  repairOrders: RepairOrder[];
  showAlertPopup: boolean;
  latestAlert: Alert | null;
  repairTimers: Record<string, number>;
  startAlertDetection: (getStations: () => any, getPrev: () => any) => () => void;
  startRepairSimulation: () => () => void;
  resolveAlert: (alertId: string) => void;
  addAlert: (alert: Alert) => void;
  addRepairOrder: (order: RepairOrder) => void;
  updateRepairOrder: (id: string, patch: Partial<RepairOrder>) => void;
  triggerGasLeakDemo: () => void;
  dismissPopup: () => void;
  advanceRepairStatus: (orderId: string) => void;
}

const REPAIR_FLOW: RepairStatus[] = ['dispatched', 'enroute', 'arrived', 'repairing', 'completed'];

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: generateMockAlerts(generateMockStations()),
  repairOrders: generateMockRepairOrders(),
  showAlertPopup: false,
  latestAlert: null,
  repairTimers: {},

  startAlertDetection: (getStations, getPrev) => {
    const interval = setInterval(() => {
      const stations = getStations();
      const prevLoadRates = getPrev();
      const newAlerts = detectAnomalies(stations, prevLoadRates, new Date());
      if (newAlerts.length > 0) {
        // 问题4修复：预警出现时自动启用关联站点的备用能源
        const stationStore = useStationStore.getState();
        const backupUpdates: string[] = [];
        newAlerts.forEach((alert: Alert) => {
          if (alert.stationId) {
            const st = stationStore.getStationById(alert.stationId);
            if (st && !st.isBackupActive) {
              backupUpdates.push(alert.stationId);
            }
          }
          if (alert.buildingIds) {
            alert.buildingIds.forEach(bid => {
              const bst = stationStore.getStationById(bid);
              if (bst && !bst.isBackupActive) {
                backupUpdates.push(bid);
              }
            });
          }
        });
        backupUpdates.forEach(id => stationStore.toggleBackup(id));

        set(state => ({
          alerts: [...newAlerts, ...state.alerts].slice(0, 50),
          showAlertPopup: true,
          latestAlert: newAlerts[0],
        }));
      }
    }, 2500);
    return () => clearInterval(interval);
  },

  startRepairSimulation: () => {
    // 抢修工单状态机：每 6 秒推进一次状态
    const interval = setInterval(() => {
      const { repairOrders, advanceRepairStatus } = get();
      repairOrders.forEach(order => {
        if (order.status !== 'completed') {
          advanceRepairStatus(order.id);
        }
      });
    }, 6000);
    return () => clearInterval(interval);
  },

  advanceRepairStatus: (orderId: string) => {
    set(state => {
      const order = state.repairOrders.find(r => r.id === orderId);
      if (!order || order.status === 'completed') return {};
      const idx = REPAIR_FLOW.indexOf(order.status);
      if (idx < 0 || idx >= REPAIR_FLOW.length - 1) return {};
      const nextStatus = REPAIR_FLOW[idx + 1];
      return {
        repairOrders: state.repairOrders.map(r =>
          r.id === orderId ? { ...r, status: nextStatus, eta: nextStatus === 'enroute' ? r.eta : '-' } : r
        ),
      };
    });
  },

  resolveAlert: (alertId) => set(state => ({
    alerts: state.alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a),
  })),

  addAlert: (alert) => {
    // 问题4修复：预警加入时联动启用备用能源
    const stationStore = useStationStore.getState();
    if (alert.stationId) {
      const st = stationStore.getStationById(alert.stationId);
      if (st && !st.isBackupActive) stationStore.toggleBackup(alert.stationId);
    }
    if (alert.buildingIds) {
      alert.buildingIds.forEach(bid => {
        const bst = stationStore.getStationById(bid);
        if (bst && !bst.isBackupActive) stationStore.toggleBackup(bid);
      });
    }
    set(state => ({
      alerts: [alert, ...state.alerts],
      showAlertPopup: true,
      latestAlert: alert,
    }));
  },

  addRepairOrder: (order) => set(state => ({
    repairOrders: [order, ...state.repairOrders],
  })),

  updateRepairOrder: (id, patch) => set(state => ({
    repairOrders: state.repairOrders.map(r => r.id === id ? { ...r, ...patch } : r),
  })),

  triggerGasLeakDemo: () => {
    const location = { x: 28, y: 0, z: -8 };
    const alert: Alert = {
      id: generateId(),
      type: 'gas_leak',
      area: '开发区燃气干管',
      level: 3,
      triggeredAt: formatDateTime(),
      message: '检测到开发区燃气调压站下游管网压力突降0.12MPa，疑似发生泄漏，已启动三角定位算法并派单抢修',
      resolved: false,
      location,
    };
    const order: RepairOrder = {
      id: generateId(),
      alertId: alert.id,
      leakLocation: location,
      teamId: 'team-01',
      teamName: '燃气管网抢修一队',
      teamLocation: { x: -15, y: 0, z: -20 },
      path: [
        { x: -15, y: 0.3, z: -20 }, { x: -5, y: 0.3, z: -18 },
        { x: 5, y: 0.3, z: -15 }, { x: 15, y: 0.3, z: -12 },
        { x: 22, y: 0.3, z: -10 }, { x: 28, y: 0.3, z: -8 },
      ],
      status: 'dispatched',
      eta: '约12分钟',
      createdAt: formatDateTime(),
    };
    set(state => ({
      alerts: [alert, ...state.alerts],
      repairOrders: [order, ...state.repairOrders],
      showAlertPopup: true,
      latestAlert: alert,
    }));
  },

  dismissPopup: () => set({ showAlertPopup: false, latestAlert: null }),
}));
