import { EnergyStationType, STATION_TYPE_LABEL } from '@/types';

export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatTime = (date: Date = new Date()): string => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const formatDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (date: Date = new Date()): string => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const getOutputUnit = (type: EnergyStationType): string => {
  switch (type) {
    case 'substation': return 'MW';
    case 'heat_station': return 'MW';
    case 'gas_station': return '万m³/h';
    case 'storage_station': return 'MWh';
    case 'building': return 'kW';
    default: return '';
  }
};

export const getStationLabel = (type: EnergyStationType): string => {
  return STATION_TYPE_LABEL[type];
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'normal': case 'resolved': case 'completed': case 'approve': return '#00E676';
    case 'warning': case 'pending': case 'processing': return '#FFC107';
    case 'critical': case 'fault': case 'emergency': case 'rejected': return '#FF3B5C';
    case 'offline': return '#718096';
    default: return '#00D4FF';
  }
};

export const getLoadRateColor = (rate: number): string => {
  if (rate >= 90) return '#FF3B5C';
  if (rate >= 75) return '#FFC107';
  if (rate >= 50) return '#00D4FF';
  return '#00E676';
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
