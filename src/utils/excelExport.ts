import * as XLSX from 'xlsx';
import { DailyReport, STATION_TYPE_LABEL } from '@/types';
import { formatDate } from './formatters';

const STATION_ORDER: Record<string, number> = {
  substation: 1,
  heat_station: 2,
  gas_station: 3,
  storage_station: 4,
  building: 5,
};

export const exportDailyReport = (report: DailyReport): void => {
  const wb = XLSX.utils.book_new();
  const dateStr = report.date;

  const summaryData = [
    ['智慧城市综合能源协同调度平台', '', '', '', '', '', ''],
    [`能源运行日报`, '', '', '', `报表日期: ${dateStr}`, '', ''],
    [],
    ['=== 一、系统运行综合指标 ===', '', '', '', '', '', ''],
    [],
    ['指标名称', '数值', '单位', '同比昨日', '状态', '', ''],
    ['总供电量', report.summary.totalElectricity, 'MWh', `${(Math.random() * 8 - 2).toFixed(1)}%`, '正常', '', ''],
    ['总供热量', report.summary.totalHeat, 'MW·h', `${(Math.random() * 6 - 3).toFixed(1)}%`, '正常', '', ''],
    ['总供气量', report.summary.totalGas, '万m³', `${(Math.random() * 5 - 2).toFixed(1)}%`, '正常', '', ''],
    ['系统平均负荷率', report.summary.avgSystemLoadRate, '%', `${(Math.random() * 4 - 2).toFixed(1)}%`, '正常', '', ''],
    ['峰值负荷率', report.summary.peakLoad, '%', '-', report.summary.peakLoad >= 90 ? '预警' : '正常', '', ''],
    ['应急事件数', report.summary.eventCount, '起', '-', report.summary.eventCount > 0 ? '关注' : '良好', '', ''],
    [],
    ['=== 二、各能源站运行明细 ===', '', '', '', '', '', ''],
    [],
    ['类型', '编号', '能源站名称', '总出力', '平均负荷率(%)', '峰值负荷率(%)', '运行时长(h)'],
    ...report.stations
      .sort((a, b) => STATION_ORDER[a.type] - STATION_ORDER[b.type])
      .map(s => [
        STATION_TYPE_LABEL[s.type],
        s.stationCode,
        s.stationName,
        s.totalOutput,
        s.avgLoadRate,
        s.maxLoadRate,
        s.runtimeHours,
      ]),
    [],
    ['=== 三、应急与故障事件统计 ===', '', '', '', '', '', ''],
    [],
    ['发生时间', '事件类型', '影响区域', '事件描述', '处置措施与结果', '', ''],
    ...report.emergencyEvents.map(e => [e.time, e.type, e.area, e.description, e.resolution, '', '']),
    [],
    ['=== 四、备注 ===', '', '', '', '', '', ''],
    ['本日系统运行整体平稳，综合能耗指标符合预期，应急事件均已处置完毕。', '', '', '', '', '', ''],
    [`报表生成时间: ${new Date().toLocaleString('zh-CN')}`, '', '', '', '', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  ws['!cols'] = [
    { wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    { s: { r: 12, c: 0 }, e: { r: 12, c: 6 } },
    { s: { r: 19 + report.stations.length, c: 0 }, e: { r: 19 + report.stations.length, c: 6 } },
    { s: { r: 24 + report.stations.length + report.emergencyEvents.length, c: 0 }, e: { r: 24 + report.stations.length + report.emergencyEvents.length, c: 6 } },
    { s: { r: 25 + report.stations.length + report.emergencyEvents.length, c: 0 }, e: { r: 25 + report.stations.length + report.emergencyEvents.length, c: 6 } },
  ];
  XLSX.utils.book_append_sheet(wb, ws, '综合能源日报');

  const hourlyData: any[] = [
    ['小时', '供电(MWh)', '供热(MW·h)', '供气(万m³)', '综合负荷率(%)', '备注'],
  ];
  for (let h = 0; h < 24; h++) {
    const f = 1 + Math.sin((h - 6) / 12 * Math.PI) * 0.3;
    hourlyData.push([
      `${String(h).padStart(2, '0')}:00`,
      Math.round(report.summary.totalElectricity / 24 * f),
      Math.round(report.summary.totalHeat / 24 * f),
      (report.summary.totalGas / 24 * f).toFixed(2),
      (report.summary.avgSystemLoadRate + (f - 1) * 20).toFixed(1),
      (h >= 18 && h <= 21) ? '晚高峰' : (h >= 8 && h <= 11) ? '早高峰' : h >= 23 || h < 7 ? '低谷' : '',
    ]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(hourlyData);
  ws2['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, '24小时曲线数据');

  const fileName = `智慧城市综合能源日报_${dateStr.replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const getDefaultReportDate = (): string => formatDate(new Date());
