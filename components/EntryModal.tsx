import React, { useState, useEffect } from 'react';
import { X, MapPin, AlertCircle, MoveHorizontal } from 'lucide-react';
import { WeightEntry, InjectionSite, InjectionSide } from '../types';
import { getLastDosage, generateId } from '../services/storageService';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: WeightEntry) => void;
  initialData?: WeightEntry | null;
}

const COMMON_SIDE_EFFECTS = ['Nausea', 'Fatigue', 'Headache', 'Indigestion', 'Insomnia'];
const INJECTION_SITES: InjectionSite[] = ['Stomach', 'Thigh', 'Arm', 'None'];
const INJECTION_SIDES: InjectionSide[] = ['Left', 'Right'];

export const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [date, setDate] = useState('');
  const [weight, setWeight] = useState('');
  const [dosage, setDosage] = useState('');
  const [injectionSite, setInjectionSite] = useState<InjectionSite>('None');
  const [injectionSide, setInjectionSide] = useState<InjectionSide>('None');
  const [sideEffects, setSideEffects] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date);
        setWeight(initialData.weight.toString());
        setDosage(initialData.dosage.toString());
        setInjectionSite(initialData.injectionSite || 'None');
        setInjectionSide(initialData.injectionSide || 'None');
        setSideEffects(initialData.sideEffects || []);
        setNotes(initialData.notes || '');
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setWeight('');
        setDosage(getLastDosage().toString());
        setInjectionSite('None');
        setInjectionSide('None');
        setSideEffects([]);
        setNotes('');
      }
    }
  }, [isOpen, initialData]);

  const toggleSideEffect = (effect: string) => {
    setSideEffects(prev => 
      prev.includes(effect) ? prev.filter(e => e !== effect) : [...prev, effect]
    );
  };

  const handleSiteChange = (site: InjectionSite) => {
    setInjectionSite(site);
    if (site === 'None') {
      setInjectionSide('None');
    } else if (injectionSide === 'None') {
      setInjectionSide('Left');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !weight || !dosage) return;

    const entry: WeightEntry = {
      id: initialData?.id || generateId(),
      date,
      weight: parseFloat(weight),
      dosage: parseFloat(dosage),
      injectionSite,
      injectionSide,
      sideEffects,
      notes,
      createdAt: initialData?.createdAt || Date.now(),
    };

    onSave(entry);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 flex-shrink-0 bg-white">
          <h2 className="text-lg font-bold text-slate-900">
            {initialData ? 'Edit Entry' : 'Log Progress'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-all">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto bg-white">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wide">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all text-base shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wide">Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="0.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all text-base font-bold shadow-sm"
              />
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wide">Dosage (mg)</label>
             <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[2.5, 5, 7.5, 10, 12.5, 15].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDosage(d.toString())}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      dosage === d.toString() 
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-100' 
                        : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                    }`}
                  >
                    {d}
                  </button>
                ))}
             </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-3 tracking-wide">
                <MapPin size={14} className="text-slate-400" />
                Injection Site
              </label>
              <div className="grid grid-cols-4 gap-2">
                {INJECTION_SITES.map(site => (
                  <button
                    key={site}
                    type="button"
                    onClick={() => handleSiteChange(site)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      injectionSite === site
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                        : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {site}
                  </button>
                ))}
              </div>
            </div>

            {injectionSite !== 'None' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-3 tracking-wide">
                  <MoveHorizontal size={14} className="text-slate-400" />
                  Side
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {INJECTION_SIDES.map(side => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setInjectionSide(side)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        injectionSide === side
                          ? 'bg-slate-700 text-white border-slate-700 shadow-md'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {side}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-3 tracking-wide">
              <AlertCircle size={14} className="text-slate-400" />
              Side Effects
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SIDE_EFFECTS.map(effect => (
                <button
                  key={effect}
                  type="button"
                  onClick={() => toggleSideEffect(effect)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    sideEffects.includes(effect)
                      ? 'bg-brand-50 text-brand-700 border-brand-200 ring-2 ring-brand-500/5'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {effect}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wide">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Appetite suppression, energy levels, etc."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all resize-none text-base shadow-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl shadow-xl shadow-brand-100 transition-all active:scale-[0.98] mt-2 uppercase tracking-widest text-sm"
          >
            {initialData ? 'Update Entry' : 'Save Entry'}
          </button>
        </form>
      </div>
    </div>
  );
};