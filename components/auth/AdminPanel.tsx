import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield, ShieldCheck, ArrowLeft } from 'lucide-react';
import { User, InviteUser } from '../../types';
import * as authService from '../../services/authService';

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [users, setUsers] = useState<InviteUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await authService.getUsers();
    setUsers(data as InviteUser[]);
    setIsLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!inviteEmail || !inviteEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    const result = await authService.createInvite(inviteEmail, inviteRole);
    if (result.success) {
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('user');
      setShowInviteForm(false);
    } else {
      setError(result.error || 'Failed to send invitation');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      return;
    }

    const result = await authService.deleteUser(userId);
    if (result.success) {
      setSuccess(`User ${email} has been deleted`);
      loadUsers();
    } else {
      setError(result.error || 'Failed to delete user');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'user' | 'admin') => {
    const result = await authService.updateUserRole(userId, newRole);
    if (result.success) {
      setSuccess('User role updated');
      loadUsers();
    } else {
      setError(result.error || 'Failed to update role');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium">
          <ArrowLeft size={18} />
          <span>Back to Settings</span>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-100 p-2 rounded-lg">
            <Users className="text-brand-600" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <UserPlus size={18} />
          Invite User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          {success}
        </div>
      )}

      {showInviteForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-slate-900">Send Invitation</h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'user' | 'admin')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors"
              >
                Send Invitation
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No users found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">MFA</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Last Login</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                          <span className="text-sm font-bold text-slate-500">
                            {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{user.name || 'No name'}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value as 'user' | 'admin')}
                      className="text-xs font-medium px-2 py-1 rounded border border-slate-200"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {user.mfaEnabled ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                        <ShieldCheck size={12} />
                        Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        <Shield size={12} />
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete user"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
