import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Calendar, Pill, CheckSquare, Square, X } from 'lucide-react';
import { WeightEntry } from '../types';

interface HistoryListProps {
  entries: WeightEntry[];
  onEdit: (entry: WeightEntry) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ entries, onEdit, onDelete, onBulkDelete }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isAllSelected = entries.length > 0 && selectedIds.size === entries.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map(e => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDeleteAction = () => {
    if (selectedIds.size === 0) return;
    onBulkDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>No entries found. Start by logging your first weigh-in.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-8 duration-300">
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-700/50">
            <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
              <button 
                onClick={() => setSelectedIds(new Set())}
                className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
              >
                <X size={16} />
              </button>
              <span className="text-sm font-semibold whitespace-nowrap">
                {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
              </span>
            </div>
            <button 
              onClick={handleBulkDeleteAction}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-bold transition-colors"
            >
              <Trash2 size={16} />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
          <div className="col-span-1 flex items-center">
            <button 
              onClick={toggleSelectAll}
              className="p-1 text-slate-400 hover:text-brand-600 transition-colors"
            >
              {isAllSelected ? <CheckSquare size={18} className="text-brand-600" /> : <Square size={18} />}
            </button>
          </div>
          <div className="col-span-3">Date</div>
          <div className="col-span-3">Weight</div>
          <div className="col-span-3">Dosage</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          {entries.map((entry) => {
            const isSelected = selectedIds.has(entry.id);
            return (
              <div 
                key={entry.id} 
                className={`group transition-all p-4 md:px-6 md:py-4 ${isSelected ? 'bg-brand-50/50' : 'hover:bg-slate-50/80'}`}
              >
                {/* Desktop View */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <button 
                      onClick={() => toggleSelect(entry.id)}
                      className={`p-1 transition-colors ${isSelected ? 'text-brand-600' : 'text-slate-300 group-hover:text-slate-400'}`}
                    >
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </div>
                  <div className="col-span-3 text-sm font-medium text-slate-800">
                    {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="col-span-3 text-sm font-bold text-slate-700">
                    {entry.weight} <span className="text-slate-400 font-normal text-xs">lbs</span>
                  </div>
                  <div className="col-span-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
                      {entry.dosage} mg
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(entry)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(entry.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="md:hidden flex items-center gap-4">
                  <button 
                    onClick={() => toggleSelect(entry.id)}
                    className={`p-1 flex-shrink-0 transition-colors ${isSelected ? 'text-brand-600' : 'text-slate-300'}`}
                  >
                    {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
                  </button>
                  <div className="flex-grow flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-800 font-medium">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{new Date(entry.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-slate-900">{entry.weight}<span className="text-sm text-slate-500 font-normal ml-1">lbs</span></span>
                          <span className="flex items-center gap-1 text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded-md">
                            <Pill size={10} />
                            {entry.dosage} mg
                          </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(entry)} className="p-2 text-slate-400 active:text-brand-600 transition-colors"><Edit2 size={18} /></button>
                      <button onClick={() => onDelete(entry.id)} className="p-2 text-slate-400 active:text-red-600 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};