import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { WeightEntry, UserProfile } from '../types';

interface BMIChartProps {
  entries: WeightEntry[];
  profile: UserProfile;
}

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const BMIChart: React.FC<BMIChartProps> = ({ entries, profile }) => {
  if (profile.heightInches <= 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
        <p className="font-medium">Height not set</p>
        <p className="text-xs">Please set your height in Settings to view BMI trends.</p>
      </div>
    );
  }

  // Sort entries by date ascending and calculate BMI for each
  const data = [...entries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ).map(e => {
    const localDate = parseLocalDate(e.date);
    const bmi = Number(((e.weight / Math.pow(profile.heightInches, 2)) * 703).toFixed(1));
    return {
      date: e.date,
      bmi: bmi,
      displayDate: localDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
  });

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        No BMI data available
      </div>
    );
  }

  const bmis = data.map(d => d.bmi);
  const minBmi = Math.min(...bmis);
  const maxBmi = Math.max(...bmis);
  const padding = (maxBmi - minBmi) * 0.2 || 2;

  return (
    <div className="space-y-6">
      <div className="h-[300px] w-full min-w-0 mt-4">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBmi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
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
              domain={[Math.floor(minBmi - padding), Math.ceil(maxBmi + padding)]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ color: '#64748b', marginBottom: '0.25rem' }}
              formatter={(value: number) => [value, 'BMI']}
            />
            {/* Reference lines for BMI categories if relevant */}
            <ReferenceLine y={25} label={{ value: 'Overweight', position: 'right', fill: '#94a3b8', fontSize: 10 }} stroke="#cbd5e1" strokeDasharray="3 3" />
            <ReferenceLine y={18.5} label={{ value: 'Normal', position: 'right', fill: '#94a3b8', fontSize: 10 }} stroke="#cbd5e1" strokeDasharray="3 3" />
            
            <Area 
              type="monotone" 
              dataKey="bmi" 
              stroke="#db2777" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorBmi)" 
              activeDot={{ r: 6, strokeWidth: 0, fill: '#be185d' }}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Underweight</span>
          <span className="text-sm font-semibold text-slate-600">&lt; 18.5</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Normal</span>
          <span className="text-sm font-semibold text-slate-600">18.5 – 24.9</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Overweight</span>
          <span className="text-sm font-semibold text-slate-600">25.0 – 29.9</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Obese</span>
          <span className="text-sm font-semibold text-slate-600">30.0 +</span>
        </div>
      </div>
    </div>
  );
};