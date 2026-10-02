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
  Crown
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
}

export default function SettingsPage() {
  const { language, t } = useI18n();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  // New user modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    fullName: '',
    mobile: '+971 50 ',
    loginPassword: '',
    authorizationPassword: '',
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
    setActionError(null);
    setAuthDialog({
      open: true,
      title: language === 'ar' ? 'تفويض إنشاء حساب مالك جديد' : 'Authorize Owner Account Provisioning',
      description: language === 'ar'
        ? 'إنشاء حساب مالك جديد بصلاحيات كاملة يتطلب إدخال كلمة مرور التفويض (المستوى الثاني).'
        : 'Provisioning an Owner account with full system access requires Level-2 Authorization Password.',
      actionName: 'CREATE_OWNER_USER',
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
              roleName: 'Owner',
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
            loginPassword: '',
            authorizationPassword: '',
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
            {language === 'ar' 
              ? 'إدارة حسابات المالك وأمان النظام المزدوج (Owner-Only Architecture)'
              : 'Owner-Only Architecture & Level-2 Security Authorization Governance'}
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
          {language === 'ar' ? 'إضافة حساب مالك إضافي' : 'Provision Owner Account'}
        </button>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Owner-Only Architecture Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-md flex items-start gap-4 border border-slate-800">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
            <Crown className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-sm text-white">
              {language === 'ar' ? 'نموذج الصلاحيات: دور المالك فقط (Owner-Only)' : 'Role Architecture: Owner-Only'}
            </h4>
            <p className="text-slate-300 leading-relaxed">
              {language === 'ar'
                ? 'النظام يعمل بنموذج المالك الحصري (Owner = All Permissions). يتمتع المالك بكافة الصلاحيات التشغيلية، الإدارية، الرقابية والمالية بدون تعقيدات أدوار وهمية.'
                : 'The system operates on an exclusive Owner role model. The Owner possesses global permissions across all branches, documents, finance, and operations.'}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-md flex items-start gap-4 border border-slate-800">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-sm text-white">{t.settings.twoLevelEnforced}</h4>
            <p className="text-slate-300 leading-relaxed">
              {t.settings.twoLevelDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Users Ledger Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500" />
            {language === 'ar' ? `حسابات المالك المعتمدة في النظام (${users.length})` : `Authorized Owner Accounts (${users.length})`}
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
                  <th className="px-6 py-3.5">{t.settings.securityLevel}</th>
                  <th className="px-6 py-3.5">{t.settings.accountStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-500" />
                          <span>{u.fullName || u.name || u.email}</span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          {u.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {language === 'ar' ? 'المالك' : 'Owner'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {language === 'ar' ? 'كامل الفروع والمنشأة (وصول شامل)' : 'All Branches & Entities (Global Access)'}
                        </span>
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
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span>{language === 'ar' ? 'تهيئة حساب مالك جديد' : 'Provision New Owner Account'}</span>
            </h3>
            
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {t.settings.roleLabel}
                </label>
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                    <Crown className="w-4 h-4" />
                    <span>{language === 'ar' ? 'المالك (Owner) - وصول وصلاحيات كاملة لكافة أقسام النظام' : 'Owner - Full Global Authority Across All Modules'}</span>
                  </div>
                </div>
              </div>

              {/* Password Setup */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  {language === 'ar' ? 'تهيئة كلمتي المرور الإلزامية (الأمان المزدوج)' : 'Mandatory Two-Level Password Initialization'}
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
