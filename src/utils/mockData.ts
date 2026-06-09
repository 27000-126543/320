import {
  EnergyStation,
  LoadDataPoint,
  EventRecord,
  Alert,
  ComplementaryPlan,
  RepairOrder,
  User,
  WeatherForecast,
  PipelineConnection,
  Vec3,
  DailyReport,
  IncidentRecord,
  DEFAULT_COMMAND_STEPS,
} from '@/types';
import { generateId, formatDateTime, formatDate } from './formatters';

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

export const generateMockStations = (): EnergyStation[] => {
  const stations: EnergyStation[] = [];
  const substationPositions: Vec3[] = [
    { x: -20, y: 0, z: -15 },
    { x: 25, y: 0, z: -10 },
  ];
  substationPositions.forEach((pos, i) => {
    stations.push({
      id: `sub-${i + 1}`,
      code: `SUB-${String(i + 1).padStart(3, '0')}`,
      name: `${i === 0 ? '城东' : '城西'}220kV变电站`,
      type: 'substation',
      position: pos,
      status: 'normal',
      realtimeOutput: rand(150, 240),
      maxOutput: 300,
      loadRate: rand(50, 88),
      isBackupActive: false,
    });
  });

  const heatPositions: Vec3[] = [
    { x: -10, y: 0, z: 20 },
    { x: 15, y: 0, z: 18 },
  ];
  heatPositions.forEach((pos, i) => {
    stations.push({
      id: `heat-${i + 1}`,
      code: `HEAT-${String(i + 1).padStart(3, '0')}`,
      name: `${['北区', '南区'][i]}集中供热站`,
      type: 'heat_station',
      position: pos,
      status: 'normal',
      realtimeOutput: rand(80, 140),
      maxOutput: 180,
      loadRate: rand(45, 85),
      isBackupActive: false,
    });
  });

  const gasPositions: Vec3[] = [
    { x: 0, y: 0, z: -25 },
    { x: 30, y: 0, z: 5 },
  ];
  gasPositions.forEach((pos, i) => {
    stations.push({
      id: `gas-${i + 1}`,
      code: `GAS-${String(i + 1).padStart(3, '0')}`,
      name: `${['滨江', '开发区'][i]}燃气调压站`,
      type: 'gas_station',
      position: pos,
      status: 'normal',
      realtimeOutput: rand(5, 12),
      maxOutput: 15,
      loadRate: rand(40, 82),
      isBackupActive: false,
    });
  });

  const storagePositions: Vec3[] = [
    { x: -30, y: 0, z: 0 },
    { x: 20, y: 0, z: -20 },
  ];
  storagePositions.forEach((pos, i) => {
    stations.push({
      id: `sto-${i + 1}`,
      code: `ESS-${String(i + 1).padStart(3, '0')}`,
      name: `${['电化学', '压缩空气'][i]}储能电站`,
      type: 'storage_station',
      position: pos,
      status: 'normal',
      realtimeOutput: rand(30, 90),
      maxOutput: 120,
      loadRate: rand(25, 75),
      isBackupActive: false,
    });
  });

  const buildingConfig = [
    { name: '政务中心大楼', pos: { x: -5, y: 0, z: -5 } },
    { name: '滨江商业综合体', pos: { x: 8, y: 0, z: 0 } },
    { name: '科技园区A区', pos: { x: -15, y: 0, z: 10 } },
    { name: '市民住宅北区', pos: { x: -25, y: 0, z: 15 } },
    { name: '金融中心大厦', pos: { x: 5, y: 0, z: 10 } },
    { name: '文化艺术中心', pos: { x: 18, y: 0, z: -5 } },
    { name: '交通枢纽综合体', pos: { x: 35, y: 0, z: 15 } },
    { name: '医院综合楼', pos: { x: -5, y: 0, z: 25 } },
  ];
  buildingConfig.forEach((cfg, i) => {
    stations.push({
      id: `bld-${i + 1}`,
      code: `BLD-${String(i + 1).padStart(3, '0')}`,
      name: cfg.name,
      type: 'building',
      position: cfg.pos,
      status: 'normal',
      realtimeOutput: rand(2, 15),
      maxOutput: 20,
      loadRate: rand(30, 92),
      isBackupActive: false,
    });
  });

  return stations;
};

export const generateLoadData = (hours: number = 48, includePredicted: boolean = true): LoadDataPoint[] => {
  const data: LoadDataPoint[] = [];
  const now = new Date();
  for (let i = hours - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600 * 1000);
    const hour = time.getHours();
    const peakFactor =
      (hour >= 8 && hour <= 11) || (hour >= 18 && hour <= 21) ? 1.3 :
      hour >= 23 || hour <= 6 ? 0.6 : 1.0;
    data.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      electricity: Math.round((350 + Math.sin(hour / 4) * 80 + rand(-30, 30)) * peakFactor),
      heat: Math.round((180 + Math.cos(hour / 3) * 50 + rand(-20, 20)) * peakFactor),
      gas: Math.round((60 + Math.sin(hour / 5) * 20 + rand(-10, 10)) * peakFactor),
      predicted: includePredicted && i < 24,
    });
  }
  return data;
};

export const generateMockEvents = (stations: EnergyStation[]): EventRecord[] => {
  const events: EventRecord[] = [];
  const typeOpts: EventRecord['type'][] = ['fault', 'warning', 'maintenance', 'emergency'];
  stations.slice(0, 4).forEach((station, i) => {
    events.push({
      id: generateId(),
      stationId: station.id,
      time: formatDateTime(new Date(Date.now() - randInt(1, 12) * 3600 * 1000)),
      type: typeOpts[i % 4],
      level: (randInt(1, 3) as 1 | 2 | 3),
      description: [
        '1#主变压器油温偏高，已启动备用冷却系统',
        '三号锅炉燃烧器报警，已切换备用',
        'A相压力变送器校验',
        'B区临时负荷突增，调度削峰响应中',
      ][i],
      handler: ['张明', '李伟', '王强', '赵军'][i],
      status: (['pending', 'processing', 'resolved', 'resolved'] as const)[i],
    });
  });
  return events;
};

export const generateMockAlerts = (stations: EnergyStation[]): Alert[] => {
  const buildings = stations.filter(s => s.type === 'building');
  return [
    {
      id: generateId(),
      type: 'load_overrun',
      area: '高新区A片区',
      stationId: buildings[1]?.id,
      buildingIds: [buildings[1]?.id, buildings[4]?.id].filter(Boolean) as string[],
      level: 2,
      triggeredAt: formatDateTime(new Date(Date.now() - 15 * 60 * 1000)),
      message: '高新区A片区电网负荷达91.2%，接近满载阈值，建议启动燃气调峰',
      resolved: false,
      location: buildings[1]?.position,
    },
  ];
};

export const generateMockPlans = (): ComplementaryPlan[] => {
  return [
    {
      id: generateId(),
      name: '夜间热泵低谷蓄热方案',
      description: '利用夜间电价低谷时段（23:00-07:00）启动热泵机组蓄热，预计降低运行成本18%',
      type: 'heat_pump_storage',
      triggerCondition: '当前时段进入电价低谷区且热网储能容量<60%',
      expectedEffect: '转移高峰电力负荷45MW，节约购电成本约12万元/天',
      status: 'approved_level2',
      createdAt: formatDateTime(new Date(Date.now() - 2 * 3600 * 1000)),
      approvals: [
        { level: 1, approver: '刘调度', role: '调度员', action: 'approve', comment: '方案可行，同意', time: formatDateTime(new Date(Date.now() - 100 * 60 * 1000)) },
        { level: 2, approver: '陈主任', role: '能源中心主任', action: 'approve', comment: '同意执行，注意监控储能温度', time: formatDateTime(new Date(Date.now() - 40 * 60 * 1000)) },
        { level: 3, approver: '', role: '市能源局', action: 'pending', comment: '', time: '' },
      ],
    },
    {
      id: generateId(),
      name: '晚高峰燃气锅炉调峰方案',
      description: '18:00-21:00晚高峰时段启动2#燃气锅炉补燃，缓解电网负荷压力',
      type: 'gas_booster_peak',
      triggerCondition: '全网综合负荷率>85%且持续30分钟以上',
      expectedEffect: '削减电网尖峰负荷60MW，降低变电站过载风险',
      status: 'pending',
      createdAt: formatDateTime(new Date(Date.now() - 30 * 60 * 1000)),
      approvals: [
        { level: 1, approver: '', role: '调度员', action: 'pending', comment: '', time: '' },
        { level: 2, approver: '', role: '能源中心主任', action: 'pending', comment: '', time: '' },
        { level: 3, approver: '', role: '市能源局', action: 'pending', comment: '', time: '' },
      ],
    },
    {
      id: generateId(),
      name: '储能站联合放电方案',
      description: '启用两座储能电站联合放电，响应全省需求侧响应号召',
      type: 'battery_discharge',
      triggerCondition: '收到省级需求响应指令或全网紧急状态',
      expectedEffect: '释放储能容量200MWh，支撑电网频率稳定',
      status: 'executing',
      createdAt: formatDateTime(new Date(Date.now() - 5 * 3600 * 1000)),
      approvals: [
        { level: 1, approver: '刘调度', role: '调度员', action: 'approve', comment: '同意执行', time: formatDateTime(new Date(Date.now() - 290 * 60 * 1000)) },
        { level: 2, approver: '陈主任', role: '能源中心主任', action: 'approve', comment: '按上级指令执行', time: formatDateTime(new Date(Date.now() - 280 * 60 * 1000)) },
        { level: 3, approver: '周局长', role: '市能源局', action: 'approve', comment: '已报备省厅，请密切监控', time: formatDateTime(new Date(Date.now() - 270 * 60 * 1000)) },
      ],
    },
  ];
};

export const generateMockRepairOrders = (): RepairOrder[] => {
  return [
    {
      id: generateId(),
      alertId: 'alert-gas-leak-001',
      leakLocation: { x: 12, y: 0, z: 14 },
      teamId: 'team-02',
      teamName: '燃气管网抢修二队',
      teamLocation: { x: -20, y: 0, z: 25 },
      path: [
        { x: -20, y: 0.2, z: 25 },
        { x: -10, y: 0.2, z: 25 },
        { x: -5, y: 0.2, z: 20 },
        { x: 5, y: 0.2, z: 18 },
        { x: 12, y: 0.2, z: 14 },
      ],
      status: 'enroute',
      eta: '8分钟',
      createdAt: formatDateTime(new Date(Date.now() - 12 * 60 * 1000)),
    },
  ];
};

export const generateMockUsers = (): User[] => {
  return [
    {
      id: 'u-001',
      name: '王晓东',
      role: 'operator',
      department: '能源监控中心·运维一班',
      avatar: '',
      lastLogin: formatDateTime(new Date(Date.now() - 24 * 3600 * 1000)),
      loginLogs: [],
    },
    {
      id: 'u-002',
      name: '刘建国',
      role: 'dispatcher',
      department: '能源调度中心·调度组',
      avatar: '',
      lastLogin: formatDateTime(new Date(Date.now() - 2 * 3600 * 1000)),
    },
    {
      id: 'u-003',
      name: '陈明远',
      role: 'director',
      department: '城市能源管理中心',
      avatar: '',
      lastLogin: formatDateTime(new Date(Date.now() - 5 * 3600 * 1000)),
    },
    {
      id: 'u-004',
      name: '周海涛',
      role: 'bureau',
      department: '市发展和改革委员会·能源局',
      avatar: '',
      lastLogin: formatDateTime(new Date(Date.now() - 20 * 3600 * 1000)),
    },
  ];
};

export const generateWeatherForecast = (): WeatherForecast[] => {
  const list: WeatherForecast[] = [];
  const now = new Date();
  const baseTemp = 18;
  for (let i = 0; i < 24; i++) {
    const hour = (now.getHours() + i) % 24;
    list.push({
      date: formatDate(now),
      hour,
      temperature: Math.round(baseTemp + Math.sin((hour - 6) / 24 * Math.PI * 2) * 8 + rand(-1, 1)),
      humidity: Math.round(55 + Math.cos(hour / 8) * 20 + rand(-3, 3)),
      windSpeed: Math.round(rand(2, 8) * 10) / 10,
      weather: i < 8 ? 'cloudy' : i < 16 ? 'sunny' : 'rainy',
    });
  }
  return list;
};

export const generateMockPipelines = (stations: EnergyStation[]): PipelineConnection[] => {
  const byId = Object.fromEntries(stations.map(s => [s.id, s]));
  const createPoints = (a: Vec3, b: Vec3, segments: number = 4): Vec3[] => {
    const pts: Vec3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      pts.push({
        x: a.x + (b.x - a.x) * t + (i > 0 && i < segments ? rand(-1, 1) : 0),
        y: 0.15,
        z: a.z + (b.z - a.z) * t + (i > 0 && i < segments ? rand(-1, 1) : 0),
      });
    }
    return pts;
  };
  return [
    { id: 'p-e-1', from: 'sub-1', to: 'bld-1', type: 'electric', flow: rand(15, 30), maxFlow: 50, points: createPoints(byId['sub-1'].position, byId['bld-1'].position) },
    { id: 'p-e-2', from: 'sub-1', to: 'bld-3', type: 'electric', flow: rand(15, 25), maxFlow: 40, points: createPoints(byId['sub-1'].position, byId['bld-3'].position) },
    { id: 'p-e-3', from: 'sub-2', to: 'bld-2', type: 'electric', flow: rand(20, 35), maxFlow: 50, points: createPoints(byId['sub-2'].position, byId['bld-2'].position) },
    { id: 'p-e-4', from: 'sub-2', to: 'bld-5', type: 'electric', flow: rand(18, 28), maxFlow: 45, points: createPoints(byId['sub-2'].position, byId['bld-5'].position) },
    { id: 'p-e-5', from: 'sto-1', to: 'sub-1', type: 'electric', flow: rand(20, 60), maxFlow: 100, points: createPoints(byId['sto-1'].position, byId['sub-1'].position) },
    { id: 'p-h-1', from: 'heat-1', to: 'bld-3', type: 'heat', flow: rand(10, 20), maxFlow: 30, points: createPoints(byId['heat-1'].position, byId['bld-3'].position) },
    { id: 'p-h-2', from: 'heat-1', to: 'bld-4', type: 'heat', flow: rand(12, 22), maxFlow: 35, points: createPoints(byId['heat-1'].position, byId['bld-4'].position) },
    { id: 'p-h-3', from: 'heat-2', to: 'bld-2', type: 'heat', flow: rand(10, 18), maxFlow: 30, points: createPoints(byId['heat-2'].position, byId['bld-2'].position) },
    { id: 'p-h-4', from: 'heat-2', to: 'bld-8', type: 'heat', flow: rand(15, 25), maxFlow: 35, points: createPoints(byId['heat-2'].position, byId['bld-8'].position) },
    { id: 'p-g-1', from: 'gas-1', to: 'heat-1', type: 'gas', flow: rand(3, 6), maxFlow: 10, points: createPoints(byId['gas-1'].position, byId['heat-1'].position) },
    { id: 'p-g-2', from: 'gas-1', to: 'bld-1', type: 'gas', flow: rand(1, 3), maxFlow: 5, points: createPoints(byId['gas-1'].position, byId['bld-1'].position) },
    { id: 'p-g-3', from: 'gas-2', to: 'heat-2', type: 'gas', flow: rand(3, 7), maxFlow: 10, points: createPoints(byId['gas-2'].position, byId['heat-2'].position) },
    { id: 'p-g-4', from: 'gas-2', to: 'bld-6', type: 'gas', flow: rand(1, 2.5), maxFlow: 4, points: createPoints(byId['gas-2'].position, byId['bld-6'].position) },
  ];
};

export const generateDailyReport = (date: string): DailyReport => {
  const stations = generateMockStations();
  return {
    date,
    stations: stations.map(s => ({
      stationId: s.id,
      stationCode: s.code,
      stationName: s.name,
      type: s.type,
      totalOutput: Math.round(s.maxOutput * rand(0.5, 0.85) * 24),
      avgLoadRate: Math.round(rand(45, 78)),
      maxLoadRate: Math.round(rand(75, 95)),
      runtimeHours: Math.round(rand(20, 24) * 10) / 10,
    })),
    emergencyEvents: [
      { time: '03:25', type: '负荷预警', area: '高新区', description: '变电站负荷突增至92%', resolution: '启动储能站放电，15分钟恢复正常' },
      { time: '11:40', type: '燃气泄漏', area: '滨江路', description: '中压管线压力异常下降', resolution: '抢修队12分钟抵达处置，未造成伤亡' },
      { time: '19:08', type: '设备故障', area: '北区供热站', description: '循环水泵轴承过热报警', resolution: '切换备用泵，更换轴承后恢复' },
    ],
    summary: {
      totalElectricity: 12480,
      totalHeat: 5620,
      totalGas: 318,
      avgSystemLoadRate: 68.5,
      peakLoad: 92.1,
      eventCount: 3,
    },
  };
};

export const generateMockIncidentRecords = (): IncidentRecord[] => {
  const generateProcess = (allCompleted: boolean) => {
    return DEFAULT_COMMAND_STEPS.map((step, idx) => ({
      ...step,
      completed: allCompleted ? true : idx < 3,
      time: allCompleted || idx < 3 ? formatDateTime(new Date(Date.now() - (5 - idx) * randInt(5, 20) * 60 * 1000)) : undefined,
      handler: (allCompleted || idx < 3) ? ['王晓东', '刘建国', '陈明远', '周海涛', '王晓东'][idx] : undefined,
      note: (allCompleted || idx < 3) ? [
        '已通过系统二次校验，确认预警真实有效',
        '已启动燃气备用储罐，压力恢复正常范围',
        '抢修工单已派发，抢修一队预计12分钟抵达',
        '现场处置完成，泄漏点已成功封堵修复',
        '所有指标恢复正常，预警正式解除',
      ][idx] : undefined,
    }));
  };

  return [
    {
      id: generateId(),
      type: 'gas_leak',
      title: '严重·燃气泄漏事件',
      area: '滨江路中段',
      level: 3,
      startTime: formatDateTime(new Date(Date.now() - 180 * 60 * 1000)),
      endTime: formatDateTime(new Date(Date.now() - 145 * 60 * 1000)),
      durationMinutes: 35,
      alertId: 'incident-hist-001',
      location: { x: -8, y: 0, z: -12 },
      stationId: 'gas-1',
      result: 'resolved',
      summary: '滨江路中压燃气管线因第三方施工损坏导致泄漏，经多部门协同处置，35分钟内完成抢修并恢复供气，未造成人员伤亡。',
      process: generateProcess(true),
      impactAnalysis: {
        affectedBuildings: [
          { id: 'bld-1', name: '滨江小区A区', code: 'BJ-A' },
          { id: 'bld-2', name: '滨江小区B区', code: 'BJ-B' },
          { id: 'bld-3', name: '花园小区', code: 'HY-1' },
        ],
        repairTeamArrivalTime: formatDateTime(new Date(Date.now() - 170 * 60 * 1000)),
        repairDurationMinutes: 35,
        leakPointStatus: 'sealed',
        gasPressureRestoreTime: formatDateTime(new Date(Date.now() - 145 * 60 * 1000)),
      },
      repairOrderId: 'repair-hist-001',
      repairTeamId: 'team-01',
    },
    {
      id: generateId(),
      type: 'load_overrun',
      title: '较重·负荷超限事件',
      area: '高新区核心区',
      level: 2,
      startTime: formatDateTime(new Date(Date.now() - 420 * 60 * 1000)),
      endTime: formatDateTime(new Date(Date.now() - 395 * 60 * 1000)),
      durationMinutes: 25,
      alertId: 'incident-hist-002',
      location: { x: 8, y: 0, z: 0 },
      stationId: 'sub-2',
      result: 'resolved',
      summary: '晚高峰时段高新区负荷突增，启动储能电站联合放电及需求侧响应，25分钟内将负荷控制在安全范围。',
      process: generateProcess(true),
      impactAnalysis: {
        peakLoad: 95,
        peakLoadTime: formatDateTime(new Date(Date.now() - 410 * 60 * 1000)),
        backupActivated: true,
        backupStartTime: formatDateTime(new Date(Date.now() - 418 * 60 * 1000)),
        recoveryTime: formatDateTime(new Date(Date.now() - 395 * 60 * 1000)),
        recoveryEffect: '系统负荷已恢复至正常范围(72%)',
      },
    },
    {
      id: generateId(),
      type: 'equipment_fault',
      title: '一般·设备故障事件',
      area: '北区供热站',
      level: 1,
      startTime: formatDateTime(new Date(Date.now() - 720 * 60 * 1000)),
      endTime: formatDateTime(new Date(Date.now() - 690 * 60 * 1000)),
      durationMinutes: 30,
      alertId: 'incident-hist-003',
      location: { x: -10, y: 0, z: 20 },
      stationId: 'heat-1',
      result: 'resolved',
      summary: '1#循环水泵轴承过热触发保护停机，自动切换备用泵，维修人员现场检修更换轴承后恢复。',
      process: generateProcess(true),
      impactAnalysis: {
        backupActivated: true,
        backupStartTime: formatDateTime(new Date(Date.now() - 718 * 60 * 1000)),
        recoveryTime: formatDateTime(new Date(Date.now() - 715 * 60 * 1000)),
        recoveryEffect: '供热压力恢复正常',
      },
    },
  ];
};
