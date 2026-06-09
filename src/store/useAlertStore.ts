import { create } from 'zustand';
import { Alert, RepairOrder } from '@/types';
import { generateMockAlerts, generateMockStations, generateMockRepairOrders } from '@/utils/mockData';
import { detectAnomalies } from '@/utils/energyAlgorithm';
import { generateId, formatDateTime } from '@/utils/formatters';

interface AlertState {
  alerts: Alert[];
  repairOrders: RepairOrder[];
  showAlertPopup: boolean;
  latestAlert: Alert | null;
  startAlertDetection: (getStations: () => any, getPrev: () => any) => () => void;
  resolveAlert: (alertId: string) => void;
  addAlert: (alert: Alert) => void;
  addRepairOrder: (order: RepairOrder) => void;
  updateRepairOrder: (id: string, patch: Partial<RepairOrder>) => void;
  triggerGasLeakDemo: () => void;
  dismissPopup: () => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: generateMockAlerts(generateMockStations()),
  repairOrders: generateMockRepairOrders(),
  showAlertPopup: false,
  latestAlert: null,

  startAlertDetection: (getStations, getPrev) => {
    const interval = setInterval(() => {
      const stations = getStations();
      const prevLoadRates = getPrev();
      const newAlerts = detectAnomalies(stations, prevLoadRates, new Date());
      if (newAlerts.length > 0) {
        set(state => {
          for (const s of stations) {
            if (s.loadRate >= 90 && s.isBackupActive === false) {
              // mark as backup activation recommended
            }
          }
          return {
            alerts: [...newAlerts, ...state.alerts].slice(0, 50),
            showAlertPopup: true,
            latestAlert: newAlerts[0],
          };
        });
      }
    }, 2500);
    return () => clearInterval(interval);
  },

  resolveAlert: (alertId) => set(state => ({
    alerts: state.alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a),
  })),

  addAlert: (alert) => set(state => ({
    alerts: [alert, ...state.alerts],
    showAlertPopup: true,
    latestAlert: alert,
  })),

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
      message: '检测到开发区燃气调压站下游管网压力突降0.12MPa，疑似发生泄漏，已启动定位算法',
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
      eta: '12分钟',
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
