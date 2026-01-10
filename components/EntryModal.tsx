import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { WeightEntry } from '../types';
import { getLastDosage } from '../services/storageService';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: WeightEntry) => void;
  initialData?: WeightEntry | null;
}

export const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [date, setDate] = useState('');
  const [weight, setWeight] = useState('');
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit mode
        setDate(initialData.date);
        setWeight(initialData.weight.toString());
        setDosage(initialData.dosage.toString());
        setNotes(initialData.notes || '');
      } else {
        // Add mode - Defaults
        setDate(new Date().toISOString().split('T')[0]);
        setWeight('');
        setDosage(getLastDosage().toString());
        setNotes('');
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !weight || !dosage) return;

    const entry: WeightEntry = {
      id: initialData?.id || crypto.randomUUID(),
      date,
      weight: parseFloat(weight),
      dosage: parseFloat(dosage),
      notes,
      createdAt: initialData?.createdAt || Date.now(),
    };

    onSave(entry);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            {initialData ? 'Edit Entry' : 'Log Progress'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="0.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dosage (mg)</label>
              <input
                type="number"
                step="0.5"
                required
                placeholder="2.5"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How are you feeling?"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md shadow-brand-200 hover:shadow-lg transition-all active:scale-[0.98]"
          >
            {initialData ? 'Update Entry' : 'Save Record'}
          </button>
        </form>
      </div>
    </div>
  );
};