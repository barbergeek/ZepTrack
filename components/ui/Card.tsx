import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          {title && <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export const StatCard: React.FC<{ 
  label: string; 
  value: string | number; 
  subtext?: string; 
  onClick?: () => void;
}> = ({ label, value, subtext, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col transition-all ${onClick ? 'cursor-pointer hover:border-brand-200 hover:shadow-md active:scale-[0.98]' : ''}`}
  >
    <span className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">{label}</span>
    <div className="flex items-end gap-2">
      <span className="text-3xl font-display text-slate-800">{value}</span>
      {subtext && <span className="text-sm text-slate-400 font-medium mb-1">{subtext}</span>}
    </div>
    {onClick && (
      <div className="mt-4 text-[10px] text-brand-600 font-bold uppercase tracking-widest">
        View Details →
      </div>
    )}
  </div>
);