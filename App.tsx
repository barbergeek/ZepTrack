import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, LayoutDashboard, History, Activity, Settings, Download, Upload, Pill, ArrowLeft, Wifi, LogOut, Shield, Users } from 'lucide-react';
import { WeightEntry, ViewState, Stats, UserProfile } from './types';
import { getEntries, saveEntry, deleteEntry, deleteEntries, exportData, importData, getProfile, saveProfile } from './services/storageService';
import { StatCard, Card } from './components/ui/Card';
import { EntryModal } from './components/EntryModal';
import { HistoryList } from './components/HistoryList';
import { TrendChart } from './components/TrendChart';
import { DosageChart } from './components/DosageChart';
import { BMIChart } from './components/BMIChart';
import { StatusPage } from './components/StatusPage';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { MFAVerify } from './components/auth/MFAVerify';
import { MFASetup } from './components/auth/MFASetup';
import { AdminPanel } from './components/auth/AdminPanel';
import * as authService from './services/authService';

const App: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, mfaRequired, mfaMethod, logout, refreshUser } = useAuth();
  const [view, setView] = useState<ViewState>('dashboard');
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ heightInches: 67, targetWeight: 180 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get invite token from URL if present
  const inviteToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite') || undefined;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const initData = async () => {
      await refreshData();
      const loadedProfile = await getProfile();
      setProfile(loadedProfile);
    };
    initData();
  }, [isAuthenticated]);

  const refreshData = async () => {
    const data = await getEntries();
    setEntries(data);
  };

  const handleSave = async (entry: WeightEntry) => {
    await saveEntry(entry);
    await refreshData();
    setEditingEntry(null);
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updated: UserProfile = {
      heightInches: Number(formData.get('heightInches')),
      targetWeight: Number(formData.get('targetWeight')),
      name: formData.get('name') as string
    };
    await saveProfile(updated);
    setProfile(updated);
    alert('Profile saved!');
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await logout();
    }
  };

  const handleDisableMFA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }
    const result = await authService.disableMFA();
    if (result.success) {
      await refreshUser();
      alert('MFA has been disabled');
    } else {
      alert(result.error || 'Failed to disable MFA');
    }
  };

  const stats: Stats = useMemo(() => {
    if (entries.length === 0) {
      return { currentWeight: 0, startWeight: 0, totalLoss: 0, currentDosage: 0, lowestWeight: 0, highestWeight: 0, bmi: 0, progressPercent: 0, goalWeight: profile.targetWeight };
    }
    const current = entries[0];
    const start = entries[entries.length - 1];
    const weights = entries.map(e => e.weight);

    // BMI Calculation: (weight / height^2) * 703
    const bmi = profile.heightInches > 0
      ? Number(((current.weight / Math.pow(profile.heightInches, 2)) * 703).toFixed(1))
      : 0;

    // Progress percentage: (Start - Current) / (Start - Goal)
    const totalToLose = start.weight - profile.targetWeight;
    const lost = start.weight - current.weight;
    const progressPercent = totalToLose > 0 ? Math.min(100, Math.max(0, (lost / totalToLose) * 100)) : 0;

    return {
      currentWeight: current.weight,
      startWeight: start.weight,
      totalLoss: Number((start.weight - current.weight).toFixed(1)),
      currentDosage: current.dosage,
      lowestWeight: Math.min(...weights),
      highestWeight: Math.max(...weights),
      bmi,
      progressPercent,
      goalWeight: profile.targetWeight
    };
  }, [entries, profile]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show MFA verification if required
  if (mfaRequired) {
    return <MFAVerify onCancel={() => logout()} preferredMethod={mfaMethod || 'totp'} />;
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage inviteToken={inviteToken} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <nav className="bg-brand-900 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-brand-700 p-2 rounded-lg text-white">
                <Activity size={20} />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">ZepTrack</h1>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="hidden sm:flex items-center gap-2">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center">
                      <span className="text-sm font-bold text-brand-200">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm text-brand-200">{user.name || user.email}</span>
                </div>
              )}
              <button onClick={() => setView('settings')} className={`p-2 rounded-lg transition-colors ${view === 'settings' ? 'text-white bg-brand-700' : 'text-brand-300 hover:text-white'}`}>
                <Settings size={20} />
              </button>
              <button onClick={() => { setEditingEntry(null); setIsModalOpen(true); }} className="inline-flex items-center gap-2 bg-white hover:bg-brand-50 text-brand-800 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Weight" value={stats.currentWeight} subtext="lbs" />
              <StatCard label="Total Loss" value={stats.totalLoss} subtext="lbs" />
              <StatCard label="BMI" value={stats.bmi} onClick={() => setView('bmi')} />
              <StatCard label="Dosage" value={stats.currentDosage} subtext="mg" onClick={() => setView('dosage')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card title="Weight Progress" className="h-full">
                  <TrendChart entries={entries} />
                </Card>
              </div>
              <div className="lg:col-span-1 space-y-6">
                <Card title="Goal Progress">
                  <div className="flex flex-col items-center justify-center pt-2 pb-6">
                    <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                      <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
                        <circle className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                        <circle className="text-brand-500 transition-all duration-1000 ease-out" strokeWidth="8" strokeDasharray={264} strokeDashoffset={264 - (264 * stats.progressPercent) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-display text-slate-800">{Math.round(stats.progressPercent)}%</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Goal</span>
                      </div>
                    </div>
                    <div className="w-full space-y-3">
                      <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                        <span>Current: {stats.currentWeight}</span>
                        <span>Goal: {stats.goalWeight}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${stats.progressPercent}%` }} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-400 font-medium">{Number((stats.currentWeight - stats.goalWeight).toFixed(1))} lbs remaining to target</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <Card title="Recent History" action={<button onClick={() => setView('history')} className="text-brand-600 hover:text-brand-800 text-sm font-medium">View All</button>}>
              <HistoryList entries={entries.slice(0, 5)} onEdit={(e) => { setEditingEntry(e); setIsModalOpen(true); }} onDelete={async (id) => { if(confirm('Delete?')) { await deleteEntry(id); await refreshData(); }}} onBulkDelete={async (ids) => { if(confirm('Delete?')) { await deleteEntries(ids); await refreshData(); }}} />
            </Card>
          </div>
        )}

        {view === 'dosage' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium mb-2"><ArrowLeft size={18} /><span>Back</span></button>
            <Card title="Dosage History"><DosageChart entries={entries} /></Card>
          </div>
        )}

        {view === 'bmi' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium mb-2"><ArrowLeft size={18} /><span>Back</span></button>
            <Card title="BMI Analysis"><BMIChart entries={entries} profile={profile} /></Card>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
             <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium mb-2"><ArrowLeft size={18} /><span>Back</span></button>
             <Card title="Entry Log"><HistoryList entries={entries} onEdit={(e) => { setEditingEntry(e); setIsModalOpen(true); }} onDelete={async (id) => { if(confirm('Delete?')) { await deleteEntry(id); await refreshData(); }}} onBulkDelete={async (ids) => { if(confirm('Delete?')) { await deleteEntries(ids); await refreshData(); }}} /></Card>
          </div>
        )}

        {view === 'settings' && !showMFASetup && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-left-8 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
              <button onClick={() => setView('dashboard')} className="text-sm font-bold text-brand-600 uppercase">Done</button>
            </div>

            <Card title="Personal Profile">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Display Name</label>
                    <input name="name" defaultValue={profile.name} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Height (Inches)</label>
                    <input name="heightInches" type="number" defaultValue={profile.heightInches} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Goal Weight (lbs)</label>
                    <input name="targetWeight" type="number" defaultValue={profile.targetWeight} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md hover:bg-brand-700 transition-colors">Update Profile</button>
              </form>
            </Card>

            <Card title="Security">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Shield className="text-slate-400" />
                    <div>
                      <span className="font-bold text-sm block">Two-Factor Authentication</span>
                      <span className="text-xs text-slate-500">
                        {user?.mfaEnabled
                          ? `Enabled (${user.mfaMethod === 'totp' ? 'Authenticator App' : 'Email'})`
                          : 'Add an extra layer of security'}
                      </span>
                    </div>
                  </div>
                  {user?.mfaEnabled ? (
                    <button
                      onClick={handleDisableMFA}
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowMFASetup(true)}
                      className="text-sm font-medium text-brand-600 hover:text-brand-800"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>
            </Card>

            {user?.role === 'admin' && (
              <Card title="Administration">
                <button onClick={() => setView('admin')} className="w-full flex items-center justify-between p-4 border-2 border-slate-100 hover:border-brand-200 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <Users className="text-slate-400" />
                    <span className="font-bold text-sm">User Management</span>
                  </div>
                  <span className="text-xs text-slate-400">Invite users, manage roles</span>
                </button>
              </Card>
            )}

            <Card title="Data Backup">
              <div className="grid grid-cols-2 gap-4">
                <button onClick={async () => { const d = await exportData(); const blob = new Blob([d], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'zeptrack_backup.json'; a.click(); }} className="flex flex-col items-center p-6 border-2 border-slate-100 hover:border-brand-200 rounded-2xl gap-3 transition-all"><Download className="text-slate-400" /> <span className="font-bold text-sm">Export JSON</span></button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center p-6 border-2 border-slate-100 hover:border-brand-200 rounded-2xl gap-3 transition-all"><Upload className="text-slate-400" /> <span className="font-bold text-sm">Import JSON</span></button>
                <input type="file" accept=".json,application/json" ref={fileInputRef} onChange={async (e) => { const f = e.target.files?.[0]; if(f){ if(!f.name.endsWith('.json')){ alert('Please select a valid JSON file'); return; } if(f.size > 10*1024*1024){ alert('File too large (max 10MB)'); return; } const r = new FileReader(); r.onload= async (ev)=> { if(await importData(ev.target?.result as string)) { await refreshData(); setView('dashboard'); alert('Imported!'); } else { alert('Import failed: Invalid data format'); }}; r.readAsText(f); }}} className="hidden" />
              </div>
            </Card>

            <Card title="System">
              <div className="space-y-2">
                <button onClick={() => setView('status')} className="w-full flex items-center justify-between p-4 border-2 border-slate-100 hover:border-brand-200 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <Wifi className="text-slate-400" />
                    <span className="font-bold text-sm">System Status</span>
                  </div>
                  <span className="text-xs text-slate-400">View connectivity &amp; health</span>
                </button>
              </div>
            </Card>

            <Card title="Account">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-red-100 hover:border-red-200 hover:bg-red-50 rounded-xl text-red-600 transition-all"
              >
                <LogOut size={18} />
                <span className="font-bold text-sm">Sign Out</span>
              </button>
            </Card>
          </div>
        )}

        {view === 'settings' && showMFASetup && user && (
          <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-8 duration-300">
            <MFASetup
              user={user}
              onComplete={async () => {
                await refreshUser();
                setShowMFASetup(false);
              }}
              onCancel={() => setShowMFASetup(false)}
            />
          </div>
        )}

        {view === 'admin' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-300">
            <AdminPanel onBack={() => setView('settings')} />
          </div>
        )}

        {view === 'status' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <button onClick={() => setView('settings')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium mb-2"><ArrowLeft size={18} /><span>Back to Settings</span></button>
            <StatusPage />
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-brand-900 border-t border-brand-800 md:hidden z-30">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 ${view === 'dashboard' ? 'text-white' : 'text-brand-400'}`}><LayoutDashboard size={20}/><span className="text-[10px] font-bold">DASH</span></button>
          <button onClick={() => setView('history')} className={`flex flex-col items-center gap-1 ${view === 'history' ? 'text-white' : 'text-brand-400'}`}><History size={20}/><span className="text-[10px] font-bold">HISTORY</span></button>
          <button onClick={() => { setEditingEntry(null); setIsModalOpen(true); }} className="flex flex-col items-center justify-center -translate-y-4 bg-white text-brand-800 w-14 h-14 rounded-full shadow-lg border-4 border-brand-900"><Plus size={28}/></button>
          <button onClick={() => setView('dosage')} className={`flex flex-col items-center gap-1 ${view === 'dosage' ? 'text-white' : 'text-brand-400'}`}><Pill size={20}/><span className="text-[10px] font-bold">DOSAGE</span></button>
          <button onClick={() => setView('settings')} className={`flex flex-col items-center gap-1 ${view === 'settings' ? 'text-white' : 'text-brand-400'}`}><Settings size={20}/><span className="text-[10px] font-bold">SETUP</span></button>
        </div>
      </div>

      <EntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} initialData={editingEntry} />
    </div>
  );
};

export default App;
