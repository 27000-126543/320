import { create } from 'zustand';
import {
  EnergyStation,
  LoadDataPoint,
  EventRecord,
  PipelineConnection,
  WeatherForecast,
} from '@/types';
import {
  generateMockStations,
  generateLoadData,
  generateMockEvents,
  generateMockPipelines,
  generateWeatherForecast,
} from '@/utils/mockData';
import { calculateSystemMetrics } from '@/utils/energyAlgorithm';

interface StationState {
  stations: EnergyStation[];
  loadHistory: LoadDataPoint[];
  events: EventRecord[];
  pipelines: PipelineConnection[];
  weatherForecast: WeatherForecast[];
  selectedStationId: string | null;
  prevLoadRates: Record<string, number>;
  systemMetrics: {
    totalElectricity: number;
    totalHeat: number;
    totalGas: number;
    systemLoadRate: number;
    substationLoadRate: number;
  };
  startSimulation: () => () => void;
  setSelectedStationId: (id: string | null) => void;
  toggleBackup: (stationId: string) => void;
  setStationStatus: (stationId: string, status: EnergyStation['status']) => void;
  getStationById: (id: string) => EnergyStation | undefined;
}

export const useStationStore = create<StationState>((set, get) => {
  const initialStations = generateMockStations();
  const pipelines = generateMockPipelines(initialStations);

  return {
    stations: initialStations,
    loadHistory: generateLoadData(48, false),
    events: generateMockEvents(initialStations),
    pipelines,
    weatherForecast: generateWeatherForecast(),
    selectedStationId: null,
    prevLoadRates: Object.fromEntries(initialStations.map(s => [s.id, s.loadRate])),
    systemMetrics: calculateSystemMetrics(initialStations),

    setSelectedStationId: (id) => set({ selectedStationId: id }),

    toggleBackup: (stationId) => set(state => ({
      stations: state.stations.map(s => s.id === stationId ? { ...s, isBackupActive: !s.isBackupActive } : s),
    })),

    setStationStatus: (stationId, status) => set(state => ({
      stations: state.stations.map(s => s.id === stationId ? { ...s, status } : s),
    })),

    getStationById: (id) => get().stations.find(s => s.id === id),

    startSimulation: () => {
      const interval = setInterval(() => {
        set(state => {
          const now = Date.now();
          const hour = new Date().getHours();
          const peakFactor =
            (hour >= 8 && hour <= 11) || (hour >= 18 && hour <= 21) ? 1.25 :
            hour >= 23 || hour <= 6 ? 0.65 : 1.0;
          const newPrev: Record<string, number> = {};
          const stations = state.stations.map(s => {
            const jitter = (Math.random() - 0.5) * 6;
            let newRate = s.loadRate + jitter;
            newRate = Math.max(15, Math.min(99, newRate));
            newRate = newRate * (0.85 + peakFactor * 0.2);
            newRate = Math.max(20, Math.min(98, newRate));
            newPrev[s.id] = s.loadRate;
            const newOutput = s.maxOutput * (newRate / 100);
            let status = s.status;
            if (newRate >= 95) status = 'critical';
            else if (newRate >= 90) status = 'warning';
            else if (newRate < 15) status = 'offline';
            else status = 'normal';
            return { ...s, loadRate: newRate, realtimeOutput: newOutput, status };
          });
          const lastLoad = state.loadHistory[state.loadHistory.length - 1];
          const newLoadPoint: LoadDataPoint = {
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            electricity: Math.round((lastLoad?.electricity || 450) + (Math.random() - 0.5) * 20),
            heat: Math.round((lastLoad?.heat || 200) + (Math.random() - 0.5) * 10),
            gas: Math.round((lastLoad?.gas || 70) + (Math.random() - 0.5) * 4),
          };
          const pipelines = state.pipelines.map(p => ({
            ...p,
            flow: Math.max(1, p.flow + (Math.random() - 0.5) * p.maxFlow * 0.08),
          }));
          return {
            stations,
            prevLoadRates: newPrev,
            systemMetrics: calculateSystemMetrics(stations),
            pipelines,
            loadHistory: [...state.loadHistory.slice(-47), newLoadPoint],
          };
        });
      }, 2500);
      return () => clearInterval(interval);
    },
  };
});
