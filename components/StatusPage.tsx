import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, Database, Server, Clock, Wifi } from 'lucide-react';
import { Card } from './ui/Card';

interface StatusData {
  status: string;
  timestamp: string;
  uptime: number;
  database: {
    connected: boolean;
    path: string;
    entries: number;
    profiles: number;
  };
  environment: string;
  version: string;
}

interface StatusItemProps {
  label: string;
  value: string | number;
  status?: 'ok' | 'error' | 'warning';
  icon?: React.ReactNode;
}

const StatusItem: React.FC<StatusItemProps> = ({ label, value, status, icon }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
    <div className="flex items-center gap-3">
      {icon && <span className="text-slate-400">{icon}</span>}
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-slate-800">{value}</span>
      {status && (
        status === 'ok' ? (
          <CheckCircle size={16} className="text-green-500" />
        ) : (
          <XCircle size={16} className="text-red-500" />
        )
      )}
    </div>
  </div>
);

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

export const StatusPage: React.FC = () => {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setStatusData(data);
      setLastChecked(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to backend');
      setStatusData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const isConnected = statusData !== null && statusData.status === 'ok';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">System Status</h2>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Connection Status Banner */}
      <div className={`p-4 rounded-xl flex items-center gap-3 ${isConnected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        {isConnected ? (
          <>
            <CheckCircle size={24} className="text-green-500" />
            <div>
              <p className="font-semibold text-green-800">Backend Connected</p>
              <p className="text-sm text-green-600">All systems operational</p>
            </div>
          </>
        ) : (
          <>
            <XCircle size={24} className="text-red-500" />
            <div>
              <p className="font-semibold text-red-800">Backend Disconnected</p>
              <p className="text-sm text-red-600">{error || 'Unable to reach the server'}</p>
            </div>
          </>
        )}
      </div>

      {/* Server Status */}
      <Card title="Server">
        <StatusItem
          label="API Status"
          value={isConnected ? 'Online' : 'Offline'}
          status={isConnected ? 'ok' : 'error'}
          icon={<Server size={18} />}
        />
        <StatusItem
          label="Environment"
          value={statusData?.environment || 'Unknown'}
          icon={<Wifi size={18} />}
        />
        <StatusItem
          label="Uptime"
          value={statusData ? formatUptime(statusData.uptime) : 'N/A'}
          icon={<Clock size={18} />}
        />
        <StatusItem
          label="Version"
          value={statusData?.version || 'Unknown'}
        />
      </Card>

      {/* Database Status */}
      <Card title="Database">
        <StatusItem
          label="Connection"
          value={statusData?.database.connected ? 'Connected' : 'Disconnected'}
          status={statusData?.database.connected ? 'ok' : 'error'}
          icon={<Database size={18} />}
        />
        <StatusItem
          label="Type"
          value="SQLite"
        />
        <StatusItem
          label="Entries"
          value={statusData?.database.entries ?? 'N/A'}
        />
        <StatusItem
          label="Profiles"
          value={statusData?.database.profiles ?? 'N/A'}
        />
      </Card>

      {/* Last Checked */}
      {lastChecked && (
        <p className="text-center text-xs text-slate-400">
          Last checked: {lastChecked.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};
