import { create } from 'zustand';
import { Alert, RepairOrder, RepairStatus, IncidentRecord, DEFAULT_COMMAND_STEPS, CommandStepKey, CommandStep, ReplayState, IncidentImpactAnalysis, EnergyStation, GridOverloadImpact, GasLeakImpact } from '@/types';
import { generateMockAlerts, generateMockStations, generateMockRepairOrders } from '@/utils/mockData';
import { detectAnomalies } from '@/utils/energyAlgorithm';
import { generateId, formatDateTime } from '@/utils/formatters';
import { useStationStore } from './useStationStore';

interface AlertState {
  alerts: Alert[];
  repairOrders: RepairOrder[];
  incidentRecords: IncidentRecord[];
  highlightedIncidentId: string | null;
  focusIncidentId: string | null;
  replayState: ReplayState;
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
  advanceCommandStep: (alertId: string, stepKey: CommandStepKey, handler: string, note: string) => void;
  advanceAllRemainingSteps: (alertId: string, handler: string) => void;
  setHighlightedIncident: (id: string | null) => void;
  focusIncident: (incidentId: string | null) => void;
  setFocusIncident: (incidentId: string | null) => void;
  setReplayState: (patch: Partial<ReplayState>) => void;
  getIncidentById: (id: string) => IncidentRecord | undefined;
  generateImpactFromAlert: (alert: Alert, ro?: RepairOrder) => IncidentImpactAnalysis;
  createIncidentRecordFromAlert: (alert: Alert, ro?: RepairOrder) => IncidentRecord;
}

const REPAIR_FLOW: RepairStatus[] = ['dispatched', 'enroute', 'arrived', 'repairing', 'completed'];

const generateImpactFromAlert = (alert: Alert, repairOrder?: RepairOrder): IncidentImpactAnalysis => {
  const stationStore = useStationStore.getState();
  const endTime = alert.resolvedAt || formatDateTime();
  const analysis: IncidentImpactAnalysis = {};

  if (alert.buildingIds && alert.buildingIds.length > 0) {
    analysis.affectedBuildings = alert.buildingIds
      .map(bid => {
        const st = stationStore.getStationById(bid);
        if (st) return { id: st.id, name: st.name, code: st.code };
        return null;
      })
      .filter(Boolean) as { id: string; name: string; code: string }[];
  }

  if (alert.type === 'grid_overload' || alert.type === 'load_overrun' || alert.type === 'pressure_overrun') {
    let peakLoad = Math.round(92 + Math.random() * 7);
    if (alert.stationId) {
      const st = stationStore.getStationById(alert.stationId);
      if (st && st.loadRate > 0) {
        peakLoad = Math.max(peakLoad, Math.round(Math.min(98, st.loadRate * 100)));
      }
    }
    analysis.peakLoad = peakLoad;
    analysis.peakLoadTime = alert.triggeredAt;
    analysis.backupActivated = true;
    analysis.backupStartTime = alert.triggeredAt;
    analysis.recoveryTime = endTime;
    analysis.recoveryEffect = `系统负荷已恢复至正常范围(${Math.round(65 + Math.random() * 15)}%)`;
  }

  if (alert.type === 'gas_leak') {
    let durationMinutes = 0;
    try {
      const start = new Date(alert.triggeredAt.replace(/\//g, '-'));
      const end = new Date(endTime.replace(/\//g, '-'));
      durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    } catch (_e) {
      durationMinutes = 8;
    }
    analysis.repairTeamArrivalTime = repairOrder?.processLog?.find(l => l.status === 'arrived')?.time;
    analysis.repairDurationMinutes = Math.max(8, durationMinutes);
    analysis.leakPointStatus = 'sealed';
    analysis.gasPressureRestoreTime = endTime;
  }

  return analysis;
};

const createIncidentRecordFromAlert = (alert: Alert, repairOrder?: RepairOrder): IncidentRecord => {
  const levelLabel = alert.level === 1 ? '一般' : alert.level === 2 ? '较大' : '重大';
  const typeLabel = alert.type === 'gas_leak' ? '燃气泄漏'
    : alert.type === 'load_overrun' ? '负载超限'
    : alert.type === 'pressure_overrun' ? '压力异常'
    : alert.type === 'grid_overload' ? '电网负荷超限'
    : '设备故障';
  const endTime = alert.resolvedAt || formatDateTime();
  let durationMinutes = 0;
  try {
    const start = new Date(alert.triggeredAt.replace(/\//g, '-'));
    const end = new Date(endTime.replace(/\//g, '-'));
    durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  } catch (_e) {
    durationMinutes = 1;
  }

  const impactAnalysis = generateImpactFromAlert(alert, repairOrder);

  const isGridType = alert.type === 'grid_overload' || alert.type === 'load_overrun' || alert.type === 'pressure_overrun';
  const isGasType = alert.type === 'gas_leak';

  let gridOverloadImpact: GridOverloadImpact | undefined;
  let gasLeakImpact: GasLeakImpact | undefined;

  if (isGridType) {
    gridOverloadImpact = {
      affectedBuildings: impactAnalysis.affectedBuildings,
      peakLoad: impactAnalysis.peakLoad,
      peakLoadTime: impactAnalysis.peakLoadTime,
      backupActivated: impactAnalysis.backupActivated,
      backupActivatedTime: impactAnalysis.backupStartTime,
      recoveryTime: impactAnalysis.recoveryTime,
      recoveryEffect: impactAnalysis.recoveryEffect,
    };
  }
  if (isGasType) {
    gasLeakImpact = {
      repairTeamArrivalTime: impactAnalysis.repairTeamArrivalTime,
      repairDurationMinutes: impactAnalysis.repairDurationMinutes,
      leakPointStatus: impactAnalysis.leakPointStatus,
      gasPressureRestoreTime: impactAnalysis.gasPressureRestoreTime,
    };
  }

  return {
    id: generateId(),
    type: alert.type,
    title: `【${levelLabel}】${typeLabel}事件`,
    area: alert.area,
    level: alert.level,
    startTime: alert.triggeredAt,
    endTime,
    durationMinutes,
    alertId: alert.id,
    location: alert.location,
    stationId: alert.stationId,
    result: alert.resolved ? 'resolved' : 'ongoing',
    summary: alert.result || alert.message,
    process: alert.commandSteps || DEFAULT_COMMAND_STEPS.map(s => ({ ...s })),
    impactAnalysis,
    gridOverloadImpact,
    gasLeakImpact,
    impact: alert.result,
    repairOrderId: alert.repairOrderId || repairOrder?.id,
    repairTeamId: repairOrder?.teamId,
  };
};

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: generateMockAlerts(generateMockStations()),
  repairOrders: generateMockRepairOrders(),
  incidentRecords: [],
  highlightedIncidentId: null,
  focusIncidentId: null,
  replayState: { incidentId: null, playing: false, isPlaying: false, currentStepIndex: 0, totalSteps: 0 },
  showAlertPopup: false,
  latestAlert: null,
  repairTimers: {},

  startAlertDetection: (getStations, getPrev) => {
    const interval = setInterval(() => {
      const stations = getStations();
      const prevLoadRates = getPrev();
      const newAlerts = detectAnomalies(stations, prevLoadRates, new Date());
      if (newAlerts.length > 0) {
        const stationStore = useStationStore.getState();
        newAlerts.forEach((alert: Alert) => {
          if (alert.stationId) {
            const st = stationStore.getStationById(alert.stationId);
            if (st && !st.isBackupActive) {
              stationStore.setBackupActive(alert.stationId, true);
            }
          }
          if (alert.buildingIds) {
            alert.buildingIds.forEach(bid => {
              const bst = stationStore.getStationById(bid);
              if (bst && !bst.isBackupActive) {
                stationStore.setBackupActive(bid, true);
              }
            });
          }
        });

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
      const now = formatDateTime();
      const logEntry = { time: now, status: nextStatus, note: '' };
      const newProcessLog = [...(order.processLog || []), logEntry];

      let vehiclePhase = order.vehiclePhase;
      let note = '';
      switch (nextStatus) {
        case 'enroute':
          vehiclePhase = 'transit';
          note = '抢修队伍已出发，正在前往现场';
          break;
        case 'arrived':
          vehiclePhase = 'at_scene';
          note = '抢修队伍已抵达现场，开始作业';
          break;
        case 'repairing':
          note = '现场抢修作业进行中';
          break;
        case 'completed':
          note = '抢修完成，设备恢复正常运行';
          break;
        default:
          note = '工单状态更新';
      }
      newProcessLog[newProcessLog.length - 1].note = note;

      const updatedOrders = state.repairOrders.map(r =>
        r.id === orderId
          ? {
              ...r,
              status: nextStatus,
              eta: nextStatus === 'enroute' ? r.eta : '-',
              vehiclePhase,
              processLog: newProcessLog,
              completedAt: nextStatus === 'completed' ? now : r.completedAt,
              resolution: nextStatus === 'completed' ? note : r.resolution,
            }
          : r
      );

      let updatedAlerts = state.alerts;
      let newIncidentRecords = state.incidentRecords;

      const alert = state.alerts.find(a => a.repairOrderId === orderId || a.id === order.alertId);
      if (alert) {
        let newCommandSteps = alert.commandSteps ? alert.commandSteps.map(s => ({ ...s })) : DEFAULT_COMMAND_STEPS.map(s => ({ ...s }));

        const markStepComplete = (key: CommandStepKey, handlerName: string, stepNote: string) => {
          const step = newCommandSteps.find(s => s.key === key);
          if (step && !step.completed) {
            step.completed = true;
            step.time = now;
            step.handler = handlerName;
            step.note = stepNote;
          }
        };

        switch (nextStatus) {
          case 'dispatched':
            markStepComplete('confirm', '系统自动', '系统自动确认预警有效');
            markStepComplete('dispatch', order.dispatcher || '调度员', note);
            break;
          case 'arrived':
            markStepComplete('onsite', order.teamName, note);
            break;
          case 'completed': {
            markStepComplete('resolve', order.handler || order.teamName, note);
            const resolvedAlert = state.alerts.find(a => a.id === alert.id);
            const allDone = newCommandSteps.every(s => s.completed);
            const resultText = allDone
              ? `预警已解除，${note}。处置总耗时：${newCommandSteps.length}步流程全部完成`
              : `预警已解除，${note}`;

            updatedAlerts = state.alerts.map(a =>
              a.id === alert.id
                ? {
                    ...a,
                    resolved: true,
                    resolvedAt: now,
                    commandSteps: newCommandSteps,
                    result: resultText,
                  }
                : a
            );

            const alreadyExists = state.incidentRecords.some(ir => ir.alertId === alert.id);
            if (!alreadyExists) {
              const finalAlert = updatedAlerts.find(a => a.id === alert.id) || { ...alert, resolved: true, resolvedAt: now, commandSteps: newCommandSteps, result: resultText };
              const finalOrder = updatedOrders.find(o => o.id === orderId) || order;
              newIncidentRecords = [createIncidentRecordFromAlert(finalAlert, finalOrder), ...state.incidentRecords];
            }
            break;
          }
          default:
            break;
        }

        if (nextStatus !== 'completed') {
          updatedAlerts = state.alerts.map(a =>
            a.id === alert.id ? { ...a, commandSteps: newCommandSteps } : a
          );
        }
      }

      return {
        repairOrders: updatedOrders,
        alerts: updatedAlerts,
        incidentRecords: newIncidentRecords,
      };
    });
  },

  resolveAlert: (alertId) => set(state => ({
    alerts: state.alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a),
  })),

  addAlert: (alert) => {
    const stationStore = useStationStore.getState();
    if (alert.stationId) {
      const st = stationStore.getStationById(alert.stationId);
      if (st && !st.isBackupActive) {
        stationStore.setBackupActive(alert.stationId, true);
      }
    }
    if (alert.buildingIds) {
      alert.buildingIds.forEach(bid => {
        const bst = stationStore.getStationById(bid);
        if (bst && !bst.isBackupActive) {
          stationStore.setBackupActive(bid, true);
        }
      });
    }
    const now = formatDateTime();
    const commandSteps = alert.commandSteps ? alert.commandSteps.map(s => ({ ...s })) : DEFAULT_COMMAND_STEPS.map(s => ({ ...s }));
    const confirmStep = commandSteps.find(s => s.key === 'confirm');
    if (confirmStep) {
      confirmStep.completed = true;
      confirmStep.time = alert.triggeredAt || formatDateTime();
      confirmStep.handler = '系统自动';
      confirmStep.note = 'AI anomaly detection confirmed';
    }
    if (alert.stationId && (alert.type === 'grid_overload' || alert.type === 'load_overrun' || alert.type === 'pressure_overrun')) {
      const backupStep = commandSteps.find(s => s.key === 'backup');
      if (backupStep && !backupStep.completed) {
        backupStep.completed = true;
        backupStep.time = now;
        backupStep.handler = '系统联动';
        backupStep.note = '备用能源自动启用';
      }
    }
    const finalAlert = { ...alert, commandSteps };
    set(state => ({
      alerts: [finalAlert, ...state.alerts],
      showAlertPopup: true,
      latestAlert: finalAlert,
    }));
  },

  addRepairOrder: (order) => set(state => ({
    repairOrders: [order, ...state.repairOrders],
  })),

  updateRepairOrder: (id, patch) => set(state => ({
    repairOrders: state.repairOrders.map(r => r.id === id ? { ...r, ...patch } : r),
  })),

  triggerGasLeakDemo: () => {
    const now = formatDateTime();
    const orderId = generateId();
    const alertId = generateId();
    const location = { x: 28, y: 0, z: -8 };
    const alert: Alert = {
      id: alertId,
      type: 'gas_leak',
      area: '开发区燃气干管',
      level: 3,
      triggeredAt: now,
      message: '检测到开发区燃气调压站下游管网压力突降0.12MPa，疑似发生泄漏，已启动三角定位算法并派单抢修',
      resolved: false,
      location,
      repairOrderId: orderId,
      commandSteps: DEFAULT_COMMAND_STEPS.map(s => ({ ...s })),
    };
    const order: RepairOrder = {
      id: orderId,
      alertId: alertId,
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
      createdAt: now,
      vehiclePhase: 'departing',
      dispatcher: '调度系统',
      processLog: [{ time: now, status: 'dispatched', note: '系统自动派单' }],
    };

    const stationStore = useStationStore.getState();
    const gasStations = stationStore.stations.filter(s => s.type === 'gas_station');
    gasStations.forEach(st => {
      if (!st.isBackupActive) {
        stationStore.setBackupActive(st.id, true);
      }
    });

    const confirmStep = alert.commandSteps?.find(s => s.key === 'confirm');
    const dispatchStep = alert.commandSteps?.find(s => s.key === 'dispatch');
    const backupStep = alert.commandSteps?.find(s => s.key === 'backup');
    if (confirmStep) {
      confirmStep.completed = true;
      confirmStep.time = now;
      confirmStep.handler = '系统自动';
      confirmStep.note = '系统检测到燃气压力异常，自动确认预警';
    }
    if (backupStep) {
      backupStep.completed = true;
      backupStep.time = now;
      backupStep.handler = '系统自动';
      backupStep.note = '已自动启用关联站点备用能源';
    }
    if (dispatchStep) {
      dispatchStep.completed = true;
      dispatchStep.time = now;
      dispatchStep.handler = '调度系统';
      dispatchStep.note = '系统自动派单至燃气管网抢修一队';
    }

    set(state => ({
      alerts: [alert, ...state.alerts],
      repairOrders: [order, ...state.repairOrders],
      showAlertPopup: true,
      latestAlert: alert,
    }));
  },

  dismissPopup: () => set({ showAlertPopup: false, latestAlert: null }),

  advanceCommandStep: (alertId: string, stepKey: CommandStepKey, handler: string, note: string) => {
    set(state => {
      const alert = state.alerts.find(a => a.id === alertId);
      if (!alert) return {};
      const now = formatDateTime();
      const newCommandSteps: CommandStep[] = alert.commandSteps
        ? alert.commandSteps.map(s => ({ ...s }))
        : DEFAULT_COMMAND_STEPS.map(s => ({ ...s }));

      const step = newCommandSteps.find(s => s.key === stepKey);
      if (!step || step.completed) return {};

      step.completed = true;
      step.time = now;
      step.handler = handler;
      step.note = note;

      let resolved = alert.resolved;
      let resolvedAt = alert.resolvedAt;
      let result = alert.result;

      if (stepKey === 'resolve') {
        resolved = true;
        resolvedAt = now;
        result = `预警已解除：${note}`;
      }

      if (stepKey === 'backup') {
        const stationStore = useStationStore.getState();
        if (alert.stationId) {
          const st = stationStore.getStationById(alert.stationId);
          if (st && !st.isBackupActive) {
            stationStore.setBackupActive(alert.stationId, true);
          }
        }
        if (alert.buildingIds) {
          alert.buildingIds.forEach(bid => {
            const bst = stationStore.getStationById(bid);
            if (bst && !bst.isBackupActive) {
              stationStore.setBackupActive(bid, true);
            }
          });
        }
      }

      const updatedAlerts = state.alerts.map(a =>
        a.id === alertId
          ? { ...a, commandSteps: newCommandSteps, resolved, resolvedAt, result }
          : a
      );

      let newIncidentRecords = state.incidentRecords;
      if (stepKey === 'resolve') {
        const alreadyExists = state.incidentRecords.some(ir => ir.alertId === alertId);
        if (!alreadyExists) {
          const finalAlert = updatedAlerts.find(a => a.id === alertId)!;
          const repairOrder = state.repairOrders.find(o => o.alertId === alertId || o.id === alert.repairOrderId);
          const newRecord = createIncidentRecordFromAlert(finalAlert, repairOrder);
          newIncidentRecords = [newRecord, ...state.incidentRecords];
        }
      }

      return {
        alerts: updatedAlerts,
        incidentRecords: newIncidentRecords,
      };
    });
  },

  advanceAllRemainingSteps: (alertId: string, handler: string) => {
    set(state => {
      const alert = state.alerts.find(a => a.id === alertId);
      if (!alert) return {};
      const now = formatDateTime();
      const newCommandSteps: CommandStep[] = alert.commandSteps
        ? alert.commandSteps.map(s => ({ ...s }))
        : DEFAULT_COMMAND_STEPS.map(s => ({ ...s }));

      const stationStore = useStationStore.getState();
      let resolved = alert.resolved;
      let resolvedAt = alert.resolvedAt;
      let result = alert.result;

      newCommandSteps.forEach((step) => {
        if (step.completed) return;

        switch (step.key) {
          case 'confirm':
            step.completed = true;
            step.time = alert.triggeredAt || formatDateTime();
            step.handler = '系统自动';
            step.note = 'AI anomaly detection confirmed';
            break;
          case 'backup':
            if (alert.stationId) {
              const st = stationStore.getStationById(alert.stationId);
              if (st && !st.isBackupActive) {
                stationStore.setBackupActive(alert.stationId, true);
              }
            }
            step.completed = true;
            step.time = now;
            step.handler = '系统联动';
            step.note = '备用能源自动启用';
            break;
          case 'dispatch':
            if (alert.type === 'gas_leak') {
              break;
            }
            step.completed = true;
            step.time = now;
            step.handler = handler;
            step.note = '调度员已派单';
            break;
          case 'onsite':
            step.completed = true;
            step.time = now;
            step.handler = handler;
            step.note = '现场处置完成';
            break;
          case 'resolve':
            step.completed = true;
            step.time = now;
            step.handler = handler;
            step.note = '调度员确认解除';
            resolved = true;
            resolvedAt = now;
            result = `预警已解除：调度员确认解除`;
            break;
          default:
            step.completed = true;
            step.time = now;
            step.handler = handler;
            step.note = '流程完成';
            break;
        }
      });

      const updatedAlerts = state.alerts.map(a =>
        a.id === alertId
          ? { ...a, commandSteps: newCommandSteps, resolved, resolvedAt, result }
          : a
      );

      let newIncidentRecords = state.incidentRecords;
      const alreadyExists = state.incidentRecords.some(ir => ir.alertId === alertId);
      if (!alreadyExists) {
        const finalAlert = updatedAlerts.find(a => a.id === alertId)!;
        const repairOrder = state.repairOrders.find(o => o.alertId === alertId || o.id === alert.repairOrderId);
        const newRecord = createIncidentRecordFromAlert(finalAlert, repairOrder);
        newIncidentRecords = [newRecord, ...state.incidentRecords];
      }

      return {
        alerts: updatedAlerts,
        incidentRecords: newIncidentRecords,
      };
    });
  },

  setHighlightedIncident: (id: string | null) => set({ highlightedIncidentId: id }),

  setReplayState: (patch: Partial<ReplayState>) => set(s => {
    const mergedPatch = { ...patch };
    if ('isPlaying' in mergedPatch && !('playing' in mergedPatch)) {
      (mergedPatch as any).playing = mergedPatch.isPlaying;
    }
    if ('playing' in mergedPatch && !('isPlaying' in mergedPatch)) {
      (mergedPatch as any).isPlaying = mergedPatch.playing;
    }
    return {
      replayState: { ...s.replayState, ...mergedPatch },
    };
  }),

  focusIncident: (incidentId: string | null) => set(s => ({
    focusIncidentId: incidentId,
    replayState: {
      incidentId,
      playing: false,
      isPlaying: false,
      currentStepIndex: 0,
      totalSteps: incidentId
        ? (s.incidentRecords.find(r => r.id === incidentId)?.process.length || 5)
        : 0,
    },
  })),

  setFocusIncident: (incidentId: string | null) => {
    const getState = useAlertStore.getState;
    getState().focusIncident(incidentId);
  },

  generateImpactFromAlert: (alert: Alert, ro?: RepairOrder) => generateImpactFromAlert(alert, ro),

  createIncidentRecordFromAlert: (alert: Alert, ro?: RepairOrder) => createIncidentRecordFromAlert(alert, ro),

  getIncidentById: (id: string) => get().incidentRecords.find(ir => ir.id === id),
}));
