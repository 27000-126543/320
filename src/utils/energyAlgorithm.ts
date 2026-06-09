import { EnergyStation, LoadDataPoint, ComplementaryPlan, Alert } from '@/types';
import { generateId, formatDateTime } from './formatters';

export const predictLoad = (
  historicalData: LoadDataPoint[],
  weatherTemp: number,
  currentHour: number
): LoadDataPoint[] => {
  const predictions: LoadDataPoint[] = [];
  const tempFactor = 1 + Math.abs(weatherTemp - 20) * 0.015;
  for (let h = 0; h < 24; h++) {
    const hour = (currentHour + h) % 24;
    const peakFactor =
      (hour >= 8 && hour <= 11) || (hour >= 18 && hour <= 21) ? 1.28 :
      hour >= 23 || hour <= 6 ? 0.62 : 1.0;
    const hist = historicalData[(24 + h) % historicalData.length] || historicalData[0];
    predictions.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      electricity: Math.round(hist.electricity * peakFactor * tempFactor * (1 + (Math.random() - 0.5) * 0.05)),
      heat: Math.round(hist.heat * peakFactor * tempFactor * (1 + (Math.random() - 0.5) * 0.06)),
      gas: Math.round(hist.gas * peakFactor * (1 + (Math.random() - 0.5) * 0.04)),
      predicted: true,
    });
  }
  return predictions;
};

export const generateComplementaryPlans = (
  stations: EnergyStation[],
  systemLoadRate: number,
  currentHour: number,
  electricityPrice: number
): ComplementaryPlan[] => {
  const plans: ComplementaryPlan[] = [];
  const isValley = currentHour >= 23 || currentHour < 7;
  const avgElecLoad = stations.filter(s => s.type === 'substation').reduce((a, b) => a + b.loadRate, 0) /
    Math.max(1, stations.filter(s => s.type === 'substation').length);

  if (isValley) {
    const heatStations = stations.filter(s => s.type === 'heat_station');
    const avgHeatLoad = heatStations.reduce((a, b) => a + b.loadRate, 0) / Math.max(1, heatStations.length);
    if (avgHeatLoad < 70) {
      plans.push({
        id: generateId(),
        name: '夜间热泵低谷蓄热方案',
        description: `当前电价低谷时段（${currentHour}:00），启动热泵机组蓄热，预计降低运行成本约${Math.round(25 - electricityPrice * 1.2)}%`,
        type: 'heat_pump_storage',
        triggerCondition: `电价低谷时段 且 热网储能容量<${Math.round(70)}%`,
        expectedEffect: '转移高峰电力负荷约45MW，节约购电成本约12万元/天',
        status: 'pending',
        createdAt: formatDateTime(),
        approvals: [
          { level: 1, approver: '', role: '调度员', action: 'pending', comment: '', time: '' },
          { level: 2, approver: '', role: '能源中心主任', action: 'pending', comment: '', time: '' },
          { level: 3, approver: '', role: '市能源局', action: 'pending', comment: '', time: '' },
        ],
      });
    }
  }

  if (avgElecLoad > 85 || systemLoadRate > 85) {
    plans.push({
      id: generateId(),
      name: '燃气锅炉高峰调峰方案',
      description: `当前系统负荷率${systemLoadRate.toFixed(1)}%，超过85%预警阈值，启动燃气锅炉补热`,
      type: 'gas_booster_peak',
      triggerCondition: '全网综合负荷率>85% 且 持续30分钟以上',
      expectedEffect: '削减电网尖峰负荷约60MW，降低变电站过载风险',
      status: 'pending',
      createdAt: formatDateTime(),
      approvals: [
        { level: 1, approver: '', role: '调度员', action: 'pending', comment: '', time: '' },
        { level: 2, approver: '', role: '能源中心主任', action: 'pending', comment: '', time: '' },
        { level: 3, approver: '', role: '市能源局', action: 'pending', comment: '', time: '' },
      ],
    });
  }

  const storage = stations.find(s => s.type === 'storage_station' && s.loadRate > 30);
  if (storage && avgElecLoad > 78) {
    plans.push({
      id: generateId(),
      name: '储能电站联合放电方案',
      description: `当前电网负荷持续走高，启用${storage.name}参与调峰，当前SOC=${(100 - storage.loadRate).toFixed(0)}%`,
      type: 'battery_discharge',
      triggerCondition: '电网负荷>78% 或 收到需求侧响应指令',
      expectedEffect: '释放储能容量约200MWh，支撑电网频率稳定',
      status: 'pending',
      createdAt: formatDateTime(),
      approvals: [
        { level: 1, approver: '', role: '调度员', action: 'pending', comment: '', time: '' },
        { level: 2, approver: '', role: '能源中心主任', action: 'pending', comment: '', time: '' },
        { level: 3, approver: '', role: '市能源局', action: 'pending', comment: '', time: '' },
      ],
    });
  }

  return plans;
};

export const detectAnomalies = (
  stations: EnergyStation[],
  prevLoadRates: Record<string, number>,
  now: Date
): Alert[] => {
  const alerts: Alert[] = [];
  for (const s of stations) {
    if (s.type === 'substation' || s.type === 'building') {
      if (s.loadRate >= 90) {
        const prev = prevLoadRates[s.id] || s.loadRate;
        const isNew = prev < 88;
        if (isNew) {
          alerts.push({
            id: generateId(),
            type: 'load_overrun',
            area: s.name,
            stationId: s.id,
            level: s.loadRate >= 95 ? 3 : 2,
            triggeredAt: formatDateTime(now),
            message: `${s.name} 负荷率达到 ${s.loadRate.toFixed(1)}%，超过90%安全阈值`,
            resolved: false,
            location: s.position,
            buildingIds: [s.id],
          });
        }
      }
    }
  }
  return alerts;
};

export const calculateSystemMetrics = (stations: EnergyStation[]) => {
  const substations = stations.filter(s => s.type === 'substation');
  const heatStations = stations.filter(s => s.type === 'heat_station');
  const gasStations = stations.filter(s => s.type === 'gas_station');
  return {
    totalElectricity: substations.reduce((a, b) => a + b.realtimeOutput, 0),
    totalHeat: heatStations.reduce((a, b) => a + b.realtimeOutput, 0),
    totalGas: gasStations.reduce((a, b) => a + b.realtimeOutput, 0),
    systemLoadRate: stations.length ? stations.reduce((a, b) => a + b.loadRate, 0) / stations.length : 0,
    substationLoadRate: substations.length
      ? substations.reduce((a, b) => a + b.loadRate, 0) / substations.length : 0,
  };
};

export const getElectricityPrice = (hour: number): number => {
  if (hour >= 23 || hour < 7) return 0.35;
  if (hour >= 10 && hour < 12) return 1.25;
  if (hour >= 18 && hour < 21) return 1.35;
  if (hour >= 7 && hour < 10) return 0.85;
  if (hour >= 12 && hour < 18) return 0.95;
  return 0.78;
};
