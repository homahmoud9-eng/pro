'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/context';
import { 
  Settings as SettingsIcon, 
  Users, 
  Shield, 
  KeyRound, 
  Building, 
  Plus, 
  CheckCircle, 
  XCircle,
  UserPlus,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { AuthorizationPasswordDialog } from '@/components/security/authorization-password-dialog';

interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  mobile: string;
  isActive: boolean;
  branchScopeType: string;
  role: {
    name: string;
    description: string;
  };
  branches: Array<{
    branch: {
      id: string;
      nameEn: string;
    };
  }>;
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // New user modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    fullName: '',
    mobile: '+971 50 ',
    roleName: 'BRANCH_MANAGER',
    branchScopeType: 'BRANCH_MANAGER',
    loginPassword: '',
    authorizationPassword: '',
    branchId: 'cmm_br_bateen'
  });

  const [authDialog, setAuthDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionName: string;
    onSuccess: (authPass: string) => Promise<void>;
  }>({
    open: false,
    title: '',
    description: '',
    actionName: '',
    onSuccess: async () => {}
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthDialog({
      open: true,
      title: 'Authorize System User Creation',
      description: 'Provisioning new system credentials and RBAC security access requires Level-2 Authorization Password.',
      actionName: 'CREATE_USER',
      onSuccess: async (authPassword: string) => {
        const res = await fetch('/api/settings/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...userForm,
            authorizationPasswordConfirm: authPassword
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create user');
        }

        setShowUserModal(false);
        fetchUsers();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            {t('nav.settings')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            System governance, Two-Level security credentials, Role-Based Access Control, and branch scope definitions.
          </p>
        </div>

        <button
          onClick={() => setShowUserModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
        >
          <UserPlus className="h-4 w-4" />
          Provision New User
        </button>
      </div>

      {/* Security Architecture Notice */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-md flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-sm text-white">Two-Level Security Credentials Model Enforced</h4>
          <p className="text-slate-300">
            Every administrative identity maintains two distinct cryptographically salted credentials:
            <span className="font-semibold text-emerald-400"> (1) Login Password</span> for session ingress, and
            <span className="font-semibold text-emerald-400"> (2) Level-2 Authorization Password</span> required for all database mutations and sensitive operations.
          </p>
        </div>
      </div>

      {/* Users Ledger Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500" />
            System User Accounts & Scopes ({users.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3"></div>
            <p>Loading user directories...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">User Identity</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Branch Scope</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Security Level</th>
                  <th className="px-6 py-3.5">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {u.fullName}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        {u.role.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {u.branchScopeType === 'ALL_BRANCHES' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Consolidated (All Branches)</span>
                      ) : (
                        <span>{u.branches.map(b => b.branch.nameEn).join(', ') || 'Selected Branch'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {u.mobile}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <Lock className="h-3 w-3" />
                        Dual Password Protected
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle className="h-4 w-4" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                          <XCircle className="h-4 w-4" /> Deactivated
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Provision New System User</h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    required
                    placeholder="e.g. Tariq Al Nuaimi"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                    placeholder="tariq@tasha.ae"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    UAE Mobile Number
                  </label>
                  <input
                    type="text"
                    value={userForm.mobile}
                    onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={userForm.roleName}
                    onChange={(e) => setUserForm({ ...userForm, roleName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="BRANCH_MANAGER">Branch Manager</option>
                    <option value="HR_MANAGER">HR Manager</option>
                    <option value="FINANCE_MANAGER">Finance Manager</option>
                    <option value="COMPLIANCE_OFFICER">Compliance Officer</option>
                  </select>
                </div>
              </div>

              {/* Password Setup */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Mandatory Two-Level Password Initialization
                </span>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    (1) Login Password
                  </label>
                  <input
                    type="password"
                    value={userForm.loginPassword}
                    onChange={(e) => setUserForm({ ...userForm, loginPassword: e.target.value })}
                    required
                    placeholder="Min 8 chars with uppercase & symbol"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    (2) Level-2 Authorization Password
                  </label>
                  <input
                    type="password"
                    value={userForm.authorizationPassword}
                    onChange={(e) => setUserForm({ ...userForm, authorizationPassword: e.target.value })}
                    required
                    placeholder="Separate password for critical mutations"
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                >
                  Next: Enter Auth Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Auth Dialog */}
      <AuthorizationPasswordDialog
        isOpen={authDialog.open}
        onClose={() => setAuthDialog({ ...authDialog, open: false })}
        title={authDialog.title}
        description={authDialog.description}
        actionName={authDialog.actionName}
        onConfirm={authDialog.onSuccess}
      />
    </div>
  );
}
