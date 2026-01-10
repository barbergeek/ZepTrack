import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { WeightEntry } from '../types';

interface DosageChartProps {
  entries: WeightEntry[];
}

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const DosageChart: React.FC<DosageChartProps> = ({ entries }) => {
  // Sort entries by date ascending for the chart
  const data = [...entries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ).map(e => {
    const localDate = parseLocalDate(e.date);
    return {
      date: e.date,
      dosage: e.dosage,
      displayDate: localDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
  });

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        No dosage data available
      </div>
    );
  }

  // Calculate dynamic domain for Y-axis
  const dosages = data.map(d => d.dosage);
  const minDose = Math.min(...dosages);
  const maxDose = Math.max(...dosages);
  // Add some padding to the top but keep 0 as a possible base
  const domainMax = Math.ceil(maxDose + 2.5);
  const domainMin = Math.max(0, Math.floor(minDose - 2.5));

  return (
    <div className="h-[300px] w-full min-w-0 mt-4">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorDosage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="displayDate" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            dy={10}
            minTickGap={40}
          />
          <YAxis 
            domain={[domainMin, domainMax]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            unit="mg"
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ color: '#64748b', marginBottom: '0.25rem' }}
            formatter={(value: number) => [`${value} mg`, 'Dosage']}
          />
          <Area 
            type="stepAfter" 
            dataKey="dosage" 
            stroke="#4f46e5" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorDosage)" 
            activeDot={{ r: 6, strokeWidth: 0, fill: '#4338ca' }}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};