import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface OutputDataPoint {
  time: string;
  output: number;
  maxOutput?: number;
}

interface OutputChartProps {
  data: OutputDataPoint[];
  className?: string;
  color?: string;
  unit?: string;
}

export default function OutputChart({
  data,
  className,
  color = '#00D4FF',
  unit = 'MW',
}: OutputChartProps) {
  return (
    <div className={cn('w-full h-56', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="output-stroke-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.1)" />
          <XAxis
            dataKey="time"
            stroke="rgba(0, 212, 255, 0.5)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="rgba(0, 212, 255, 0.5)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
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
            formatter={(value: number) => [`${value.toFixed(1)} ${unit}`]}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Line
            type="monotone"
            dataKey="output"
            name="实际出力"
            stroke="url(#output-stroke-grad)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          {data[0]?.maxOutput !== undefined && (
            <Line
              type="monotone"
              dataKey="maxOutput"
              name="额定出力"
              stroke="#FFC107"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
