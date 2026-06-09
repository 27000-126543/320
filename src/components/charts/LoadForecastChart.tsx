import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { LoadDataPoint } from '@/types';

interface LoadForecastChartProps {
  data: LoadDataPoint[];
  className?: string;
}

export default function LoadForecastChart({ data, className }: LoadForecastChartProps) {
  return (
    <div className={cn('w-full h-72', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="elec-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E90FF" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#1E90FF" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="heat-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.1)" />
          <XAxis
            dataKey="time"
            stroke="rgba(0, 212, 255, 0.5)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval={3}
          />
          <YAxis
            yAxisId="left"
            stroke="rgba(0, 212, 255, 0.5)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            label={{ value: 'MW', angle: -90, position: 'insideLeft', fill: 'rgba(0, 212, 255, 0.7)', fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="rgba(0, 196, 140, 0.5)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            label={{ value: '万m³/h', angle: 90, position: 'insideRight', fill: 'rgba(0, 196, 140, 0.7)', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F2847',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#fff',
            }}
            labelStyle={{ color: '#00D4FF', marginBottom: '4px' }}
            formatter={(value: number, name: string) => {
              if (name === 'gas') return [`${value.toFixed(1)} 万m³/h`, '燃气'];
              if (name === 'heat') return [`${value.toFixed(0)} MW`, '供热'];
              if (name === 'electricity') return [`${value.toFixed(0)} MW`, '电力'];
              return [value, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            formatter={(value) => {
              const map: Record<string, string> = {
                electricity: '电力负荷',
                heat: '供热负荷',
                gas: '燃气负荷',
              };
              return map[value] || value;
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="electricity"
            name="electricity"
            fill="url(#elec-bar)"
            radius={[2, 2, 0, 0]}
            barSize={14}
          />
          <Bar
            yAxisId="left"
            dataKey="heat"
            name="heat"
            fill="url(#heat-bar)"
            radius={[2, 2, 0, 0]}
            barSize={14}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="gas"
            name="gas"
            stroke="#00C48C"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
