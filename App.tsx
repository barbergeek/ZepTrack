import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, LayoutDashboard, History, Activity, Settings, Download, Upload, ShieldCheck, Pill, ArrowLeft } from 'lucide-react';
import { WeightEntry, ViewState, Stats } from './types';
import { getEntries, saveEntry, deleteEntry, deleteEntries, seedInitialData, exportData, importData } from './services/storageService';
import { StatCard, Card } from './components/ui/Card';
import { EntryModal } from './components/EntryModal';
import { HistoryList } from './components/HistoryList';
import { TrendChart } from './components/TrendChart';
import { DosageChart } from './components/DosageChart';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    seedInitialData();
    refreshData();
  }, []);

  const refreshData = () => {
    setEntries(getEntries());
  };

  const handleSave = (entry: WeightEntry) => {
    saveEntry(entry);
    refreshData();
    setEditingEntry(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      deleteEntry(id);
      refreshData();
    }
  };

  const handleBulkDelete = (ids: string[]) => {
    if (confirm(`Are you sure you want to delete ${ids.length} selected entries?`)) {
      deleteEntries(ids);
      refreshData();
    }
  };

  const handleEdit = (entry: WeightEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeptrack_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importData(content)) {
        alert('Data imported successfully!');
        refreshData();
        setView('dashboard');
      } else {
        alert('Failed to import data. Please ensure the file is a valid ZepTrack backup.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (e.target) e.target.value = '';
  };

  const stats: Stats = useMemo(() => {
    if (entries.length === 0) {
      return {
        currentWeight: 0,
        startWeight: 0,
        totalLoss: 0,
        currentDosage: 0,
        lowestWeight: 0,
        highestWeight: 0
      };
    }
    const current = entries[0];
    const start = entries[entries.length - 1];
    const weights = entries.map(e => e.weight);
    return {
      currentWeight: current.weight,
      startWeight: start.weight,
      totalLoss: Number((start.weight - current.weight).toFixed(1)),
      currentDosage: current.dosage,
      lowestWeight: Math.min(...weights),
      highestWeight: Math.max(...weights)
    };
  }, [entries]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-brand-600 p-2 rounded-lg text-white">
                <Activity size={20} />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">ZepTrack</h1>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('settings')}
                className={`p-2 rounded-lg transition-colors ${view === 'settings' ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Settings size={20} />
              </button>
              <button 
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-brand-200"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Log Entry</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="Current Weight" value={stats.currentWeight} subtext="lbs" />
              <StatCard label="Total Loss" value={stats.totalLoss} subtext="lbs" />
              <StatCard label="Current Dose" value={stats.currentDosage} subtext="mg" onClick={() => setView('dosage')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card title="Weight Progress" className="h-full min-h-[400px]">
                  <TrendChart entries={entries} />
                </Card>
              </div>
              <div className="lg:col-span-1 space-y-6">
                <Card title="At a Glance">
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500">Starting Weight</span>
                        <span className="font-semibold text-slate-700">{stats.startWeight} lbs</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-slate-300 h-2 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500">Lowest Recorded</span>
                        <span className="font-semibold text-slate-700">{stats.lowestWeight} lbs</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className="bg-brand-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (stats.startWeight - stats.currentWeight) / (stats.startWeight - stats.lowestWeight) * 100 || 0)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <Card 
              title="Recent History" 
              action={
                <button onClick={() => setView('history')} className="text-brand-600 hover:text-brand-800 text-sm font-medium transition-colors">
                  View All
                </button>
              }
            >
              <HistoryList 
                entries={entries.slice(0, 5)} 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                onBulkDelete={handleBulkDelete}
              />
            </Card>
          </div>
        )}

        {view === 'dosage' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <button 
              onClick={() => setView('dashboard')}
              className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium transition-colors mb-2"
            >
              <ArrowLeft size={18} />
              <span>Back to Dashboard</span>
            </button>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Dosage History</h2>
            </div>
            <Card className="min-h-[450px]">
              <DosageChart entries={entries} />
            </Card>
            <Card title="Dosage Insights">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Current Maintenance</span>
                  <span className="text-xl font-bold text-slate-800">{stats.currentDosage} mg</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Dose Changes</span>
                  <span className="text-xl font-bold text-slate-800">
                    {new Set(entries.map(e => e.dosage)).size} Levels
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Entry Log</h2>
            </div>
            <Card className="min-h-[500px]">
              <HistoryList 
                entries={entries} 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                onBulkDelete={handleBulkDelete}
              />
            </Card>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-left-8 duration-300">
            <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
            <Card title="Data Management">
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Privacy & Security</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      ZepTrack stores all your data locally in your browser. We never transmit your health information to any server. Use the backup options below to keep your data safe.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={handleExport}
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-slate-100 hover:border-brand-200 hover:bg-brand-50 rounded-2xl text-slate-700 font-semibold transition-all group"
                  >
                    <Download className="text-slate-400 group-hover:text-brand-600" size={20} />
                    <span>Export Backup</span>
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-slate-100 hover:border-brand-200 hover:bg-brand-50 rounded-2xl text-slate-700 font-semibold transition-all group"
                  >
                    <Upload className="text-slate-400 group-hover:text-brand-600" size={20} />
                    <span>Import Backup</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImport} 
                    className="hidden" 
                    accept=".json" 
                  />
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-30 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => setView('dashboard')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'dashboard' ? 'text-brand-600' : 'text-slate-400'}`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => setView('dosage')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'dosage' ? 'text-brand-600' : 'text-slate-400'}`}
          >
            <Pill size={20} />
            <span className="text-[10px] font-medium">Dosage</span>
          </button>
          <button 
            onClick={() => setView('history')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'history' ? 'text-brand-600' : 'text-slate-400'}`}
          >
            <History size={20} />
            <span className="text-[10px] font-medium">History</span>
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${view === 'settings' ? 'text-brand-600' : 'text-slate-400'}`}
          >
            <Settings size={20} />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </div>

      <EntryModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingEntry(null); }} 
        onSave={handleSave}
        initialData={editingEntry}
      />
    </div>
  );
};

export default App;