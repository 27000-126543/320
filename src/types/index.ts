export type EnergyStationType = 'substation' | 'heat_station' | 'gas_station' | 'storage_station' | 'building';
export type StationStatus = 'normal' | 'warning' | 'critical' | 'offline';
export type UserRole = 'operator' | 'dispatcher' | 'director' | 'bureau';
export type AlertType = 'load_overrun' | 'pressure_overrun' | 'gas_leak' | 'equipment_fault' | 'grid_overload';
export type PlanType = 'heat_pump_storage' | 'gas_booster_peak' | 'battery_discharge' | 'grid_transfer';
export type PlanStatus = 'pending' | 'approved_level1' | 'approved_level2' | 'executing' | 'completed' | 'rejected';
export type RepairStatus = 'dispatched' | 'enroute' | 'arrived' | 'repairing' | 'completed';
export type EventType = 'fault' | 'warning' | 'maintenance' | 'emergency';
export type VehiclePhase = 'at_base' | 'departing' | 'transit' | 'near_scene' | 'at_scene';
export type CommandStepKey = 'confirm' | 'backup' | 'dispatch' | 'onsite' | 'resolve';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface EnergyStation {
  id: string;
  code: string;
  name: string;
  type: EnergyStationType;
  position: Vec3;
  status: StationStatus;
  realtimeOutput: number;
  maxOutput: number;
  loadRate: number;
  isBackupActive: boolean;
  connectedBuildings?: string[];
}

export interface LoadDataPoint {
  time: string;
  electricity: number;
  heat: number;
  gas: number;
  predicted?: boolean;
}

export interface EventRecord {
  id: string;
  stationId: string;
  time: string;
  type: EventType;
  level: 1 | 2 | 3;
  description: string;
  handler: string;
  status: 'pending' | 'processing' | 'resolved';
}

export interface CommandStep {
  key: CommandStepKey;
  title: string;
  completed: boolean;
  time?: string;
  handler?: string;
  note?: string;
}
export const DEFAULT_COMMAND_STEPS: CommandStep[] = [
  { key: 'confirm', title: '确认预警', completed: false },
  { key: 'backup', title: '启用备用能源', completed: false },
  { key: 'dispatch', title: '派发工单', completed: false },
  { key: 'onsite', title: '现场处置', completed: false },
  { key: 'resolve', title: '解除预警', completed: false },
];

export interface Alert {
  id: string;
  type: AlertType;
  area: string;
  stationId?: string;
  level: 1 | 2 | 3;
  triggeredAt: string;
  message: string;
  resolved: boolean;
  location?: Vec3;
  buildingIds?: string[];
  repairOrderId?: string;
  commandSteps?: CommandStep[];
  result?: string;
  resolvedAt?: string;
}

export interface ApprovalRecord {
  level: 1 | 2 | 3;
  approver: string;
  role: string;
  action: 'approve' | 'reject' | 'pending';
  comment: string;
  time: string;
}

export interface ComplementaryPlan {
  id: string;
  name: string;
  description: string;
  type: PlanType;
  triggerCondition: string;
  expectedEffect: string;
  status: PlanStatus;
  approvals: ApprovalRecord[];
  createdAt: string;
}

export interface RepairOrder {
  id: string;
  alertId: string;
  leakLocation: Vec3;
  teamId: string;
  teamName: string;
  teamLocation: Vec3;
  path: Vec3[];
  status: RepairStatus;
  eta: string;
  createdAt: string;
  vehiclePhase?: VehiclePhase;
  dispatcher?: string;
  handler?: string;
  processLog?: { time: string; status: RepairStatus; note: string }[];
  resolution?: string;
  completedAt?: string;
}

export interface ReplayState {
  incidentId: string | null;
  playing: boolean;
  isPlaying: boolean;
  currentStepIndex: number;
  totalSteps: number;
}

export type GridOverloadImpact = {
  affectedBuildings?: { id: string; name: string; code: string }[];
  peakLoad?: number;
  peakLoadTime?: string;
  backupActivated?: boolean;
  backupActivatedTime?: string;
  recoveryTime?: string;
  recoveryEffect?: string;
};

export type GasLeakImpact = {
  repairTeamArrivalTime?: string;
  repairDurationMinutes?: number;
  leakPointStatus?: 'sealed' | 'isolated' | 'monitoring';
  gasPressureRestoreTime?: string;
};

export interface IncidentImpactAnalysis {
  affectedBuildings?: { id: string; name: string; code: string }[];
  peakLoad?: number;
  peakLoadTime?: string;
  backupActivated?: boolean;
  backupStartTime?: string;
  recoveryTime?: string;
  recoveryEffect?: string;
  repairTeamArrivalTime?: string;
  repairDurationMinutes?: number;
  leakPointStatus?: 'sealed' | 'isolated' | 'monitoring';
  gasPressureRestoreTime?: string;
}

export interface IncidentRecord {
  id: string;
  type: AlertType;
  title: string;
  area: string;
  level: 1 | 2 | 3;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  alertId: string;
  location?: Vec3;
  stationId?: string;
  result: 'resolved' | 'ongoing';
  summary: string;
  process: CommandStep[];
  impactAnalysis?: IncidentImpactAnalysis;
  gridOverloadImpact?: GridOverloadImpact;
  gasLeakImpact?: GasLeakImpact;
  impact?: string;
  repairOrderId?: string;
  repairTeamId?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  avatar: string;
  lastLogin: string;
  loginLogs?: LoginLog[];
}

export interface LoginLog {
  time: string;
  success: boolean;
  device: string;
  ip: string;
}

export interface DailyReport {
  date: string;
  stations: {
    stationId: string;
    stationCode: string;
    stationName: string;
    type: EnergyStationType;
    totalOutput: number;
    avgLoadRate: number;
    maxLoadRate: number;
    runtimeHours: number;
  }[];
  emergencyEvents: {
    time: string;
    type: string;
    area: string;
    description: string;
    resolution: string;
  }[];
  summary: {
    totalElectricity: number;
    totalHeat: number;
    totalGas: number;
    avgSystemLoadRate: number;
    peakLoad: number;
    eventCount: number;
  };
}

export interface WeatherForecast {
  date: string;
  hour: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
}

export interface PipelineConnection {
  id: string;
  from: string;
  to: string;
  type: 'electric' | 'heat' | 'gas';
  flow: number;
  maxFlow: number;
  points: Vec3[];
}

export const STATION_TYPE_LABEL: Record<EnergyStationType, string> = {
  substation: '变电站',
  heat_station: '热力站',
  gas_station: '燃气调压站',
  storage_station: '储能站',
  building: '用户建筑',
};

export const STATION_COLOR: Record<EnergyStationType, string> = {
  substation: '#1E90FF',
  heat_station: '#FF6B35',
  gas_station: '#00C48C',
  storage_station: '#9C27B0',
  building: '#00D4FF',
};

export const STATUS_LABEL: Record<StationStatus, string> = {
  normal: '正常运行',
  warning: '预警',
  critical: '故障',
  offline: '离线',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  operator: '值班员',
  dispatcher: '调度员',
  director: '能源中心主任',
  bureau: '市能源局',
};

export const ROLE_LEVEL: Record<UserRole, number> = {
  operator: 1,
  dispatcher: 2,
  director: 3,
  bureau: 4,
};
