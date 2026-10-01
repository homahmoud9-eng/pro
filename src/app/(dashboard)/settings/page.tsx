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
  fullName?: string;
  name?: string;
  username?: string;
  mobile?: string;
  isActive?: boolean;
  status?: string;
  branchScopeType?: string;
  role?: {
    id?: string;
    name?: string;
    roleKey?: string;
    description?: string;
  };
  roles?: Array<{
    role: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
  branches?: Array<{
    branch: {
      id: string;
      nameEn: string;
      nameAr?: string;
    };
  }>;
  branchScopes?: Array<{
    branch: {
      id: string;
      nameEn: string;
      nameAr?: string;
    };
  }>;
}

interface BranchOption {
  id: string;
  nameEn: string;
  nameAr?: string;
  code: string;
}

interface RoleOption {
  id: string;
  name: string;
  description?: string;
}

export default function SettingsPage() {
  const { language, t } = useI18n();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [availableBranches, setAvailableBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

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
    branchId: ''
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
        if (data.roles) setAvailableRoles(data.roles);
        if (data.branches && data.branches.length > 0) {
          setAvailableBranches(data.branches);
          setUserForm((prev) => ({
            ...prev,
            branchId: prev.branchId || data.branches[0].id,
          }));
        }
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
    setActionError(null);
    setAuthDialog({
      open: true,
      title: language === 'ar' ? 'تفويض إنشاء مستخدم جديد' : 'Authorize System User Creation',
      description: language === 'ar'
        ? 'إنشاء مستخدم جديد وتعيين صلاحيات RBAC يتطلب إدخال كلمة مرور التفويض (المستوى الثاني).'
        : 'Provisioning new system credentials and RBAC security access requires Level-2 Authorization Password.',
      actionName: 'CREATE_USER',
      onSuccess: async (authPassword: string) => {
        try {
          const res = await fetch('/api/settings/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: userForm.fullName,
              fullName: userForm.fullName,
              email: userForm.email,
              username: userForm.email.split('@')[0],
              roleName: userForm.roleName,
              branchScopeIds: userForm.roleName === 'BRANCH_MANAGER' && userForm.branchId ? [userForm.branchId] : [],
              initialLoginPassword: userForm.loginPassword,
              initialAuthPassword: userForm.authorizationPassword,
              authorizationPasswordConfirm: authPassword,
            }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create user');
          }

          setShowUserModal(false);
          setUserForm({
            email: '',
            fullName: '',
            mobile: '+971 50 ',
            roleName: 'BRANCH_MANAGER',
            branchScopeType: 'BRANCH_MANAGER',
            loginPassword: '',
            authorizationPassword: '',
            branchId: availableBranches[0]?.id || '',
          });
          await fetchUsers();
        } catch (err: any) {
          setActionError(err.message || 'Error occurred');
          throw err;
        }
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
            {t.settings.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t.settings.subtitle}
          </p>
        </div>

        <button
          onClick={() => {
            setActionError(null);
            setShowUserModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
        >
          <UserPlus className="h-4 w-4" />
          {t.settings.provisionNewUser}
        </button>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Security Architecture Notice */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-md flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-sm text-white">{t.settings.twoLevelEnforced}</h4>
          <p className="text-slate-300">
            {t.settings.twoLevelDesc}
          </p>
        </div>
      </div>

      {/* Users Ledger Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500" />
            {language === 'ar' ? `حسابات مستخدمي النظام ونطاقاتهم (${users.length})` : `System User Accounts & Scopes (${users.length})`}
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3"></div>
            <p>{t.settings.loading}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">{t.settings.userIdentity}</th>
                  <th className="px-6 py-3.5">{t.settings.role}</th>
                  <th className="px-6 py-3.5">{t.settings.branchScope}</th>
                  <th className="px-6 py-3.5">{t.settings.phone}</th>
                  <th className="px-6 py-3.5">{t.settings.securityLevel}</th>
                  <th className="px-6 py-3.5">{t.settings.accountStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const roleName = u.role?.name || u.roles?.[0]?.role?.name || 'Staff';
                  const roleKey = u.role?.roleKey || roleName.toUpperCase().replace(/\s+/g, '_');
                  const roleLabel = (t.enums.roles as Record<string, string>)[roleKey] || (t.enums.roles as Record<string, string>)[roleName] || roleName;
                  const userBranches = (u.branches && u.branches.length > 0) ? u.branches : (u.branchScopes || []);
                  const isAll = u.branchScopeType === 'ALL_BRANCHES' || userBranches.length === 0;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {u.fullName || u.name || u.email}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {u.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          {roleLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {isAll ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t.settings.consolidatedAll}</span>
                        ) : (
                          <span>
                            {userBranches
                              .map(b => (language === 'ar' ? (b.branch?.nameAr || b.branch?.nameEn) : b.branch?.nameEn))
                              .filter(Boolean)
                              .join(', ') || t.settings.selectedBranch}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {u.mobile || (u.username ? `@${u.username}` : '—')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <Lock className="h-3 w-3" />
                          {t.settings.dualPasswordProtected}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.isActive || u.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle className="h-4 w-4" /> {t.settings.activeStatus}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                            <XCircle className="h-4 w-4" /> {t.settings.inactiveStatus}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.settings.provisionNewUser}</h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    {t.settings.fullNameLabel}
                  </label>
                  <input
                    type="text"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    required
                    placeholder={t.settings.fullNamePlaceholder}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    {t.settings.emailLabel}
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                    placeholder={t.settings.emailPlaceholder}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    {t.employees.mobile}
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
                    {t.settings.roleLabel}
                  </label>
                  <select
                    value={userForm.roleName}
                    onChange={(e) => setUserForm({ ...userForm, roleName: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="BRANCH_MANAGER">{t.enums.roles.BRANCH_MANAGER}</option>
                    <option value="HR_MANAGER">{t.enums.roles.HR_MANAGER}</option>
                    <option value="FINANCE_MANAGER">{t.enums.roles.FINANCE_MANAGER}</option>
                    <option value="COMPLIANCE_OFFICER">{t.enums.roles.COMPLIANCE_OFFICER}</option>
                  </select>
                </div>
              </div>

              {/* Branch Selection if Branch Manager */}
              {userForm.roleName === 'BRANCH_MANAGER' && availableBranches.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    {t.settings.branchScope}
                  </label>
                  <select
                    value={userForm.branchId}
                    onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {availableBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {language === 'ar' ? (b.nameAr || b.nameEn) : b.nameEn} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Password Setup */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  {language === 'ar' ? 'تهيئة كلمتي المرور الإلزامية' : 'Mandatory Two-Level Password Initialization'}
                </span>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    {t.settings.loginPasswordLabel}
                  </label>
                  <input
                    type="password"
                    value={userForm.loginPassword}
                    onChange={(e) => setUserForm({ ...userForm, loginPassword: e.target.value })}
                    required
                    placeholder={t.settings.loginPasswordPlaceholder}
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    {t.settings.authPasswordLabel}
                  </label>
                  <input
                    type="password"
                    value={userForm.authorizationPassword}
                    onChange={(e) => setUserForm({ ...userForm, authorizationPassword: e.target.value })}
                    required
                    placeholder={t.settings.authPasswordPlaceholder}
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
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                >
                  {t.security.nextEnterAuthPassword}
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
