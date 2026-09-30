"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import {
  Lock,
  User,
  ShieldCheck,
  Globe,
  Flame,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Users,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, toggleLocale } = useI18n();

  const [usernameOrEmail, setUsernameOrEmail] = useState("owner");
  const [password, setPassword] = useState("OwnerLogin@2026!");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const demoAccounts = [
    {
      role: t.auth.roleOwner,
      user: "owner",
      pass: "OwnerLogin@2026!",
      auth: "OwnerAuth@2026!",
      desc: t.auth.descOwner,
      badge: t.auth.badgeFullAccess,
      color: "border-rose-500/40 text-rose-400 bg-rose-950/20",
    },
    {
      role: t.auth.roleHrManager,
      user: "hrmanager",
      pass: "HrManager@2026!",
      auth: "HrAuth@2026!",
      desc: t.auth.descHrManager,
      badge: t.auth.badgeHrScope,
      color: "border-purple-500/40 text-purple-400 bg-purple-950/20",
    },
    {
      role: t.auth.roleBranchManager,
      user: "bmbateen",
      pass: "BranchMgr@2026!",
      auth: "BranchAuth@2026!",
      desc: t.auth.descBranchManager,
      badge: t.auth.badgeBranchScoped,
      color: "border-blue-500/40 text-blue-400 bg-blue-950/20",
    },
    {
      role: t.auth.roleFinanceManager,
      user: "finance",
      pass: "FinanceMgr@2026!",
      auth: "FinanceAuth@2026!",
      desc: t.auth.descFinanceManager,
      badge: t.auth.badgeFinanceScope,
      color: "border-amber-500/40 text-amber-400 bg-amber-950/20",
    },
    {
      role: t.auth.roleComplianceOfficer,
      user: "compliance",
      pass: "Compliance@2026!",
      auth: "ComplianceAuth@2026!",
      desc: t.auth.descComplianceOfficer,
      badge: t.auth.badgeComplianceScope,
      color: "border-emerald-500/40 text-emerald-400 bg-emerald-950/20",
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in");
      setLoading(false);
    }
  };

  const handleSelectDemo = (user: string, pass: string) => {
    setUsernameOrEmail(user);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#0c0e12] flex flex-col justify-center items-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language switcher at top right */}
      <div className="absolute top-6 right-6 rtl:right-auto rtl:left-6 z-10">
        <button
          onClick={toggleLocale}
          className="flex items-center space-x-2 rtl:space-x-reverse px-3.5 py-1.5 bg-[#141720] hover:bg-slate-800 border border-[#1e2433] text-slate-300 rounded-xl text-xs font-semibold shadow-lg transition"
        >
          <Globe className="w-4 h-4 text-rose-400" />
          <span>{locale === "en" ? "العربية (RTL)" : "English (LTR)"}</span>
        </button>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        {/* Left/Main Form Box */}
        <div className="lg:col-span-6 bg-[#141720]/90 backdrop-blur-md border border-[#1e2433] rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-950/60 font-bold">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {t.common.appName}
              </h1>
              <p className="text-xs text-rose-400 font-medium">
                {t.auth.subtitle}
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {t.auth.usernameOrEmail}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center ps-3.5 rtl:ps-0 rtl:pe-3.5 pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  placeholder={t.auth.usernamePlaceholder}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl ps-10 rtl:ps-4 rtl:pe-10 pe-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {t.auth.password}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 flex items-center ps-3.5 rtl:ps-0 rtl:pe-3.5 pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-[#0c0e12] border border-[#1e2433] focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl ps-10 rtl:ps-4 rtl:pe-10 pe-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-3 rounded-xl">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-rose-950/50 flex items-center justify-center space-x-2 rtl:space-x-reverse transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.auth.verifyingCredentials}</span>
                </>
              ) : (
                <>
                  <span>{t.auth.signIn}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#1e2433] flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center space-x-1.5 rtl:space-x-reverse text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.auth.twoLevelSecurityBadge}</span>
            </span>
            <span>{t.auth.uaeGovTaxCompliant}</span>
          </div>
        </div>

        {/* Right Demo Profiles Box */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Users className="w-4 h-4 text-rose-400" />
            <span>{t.auth.quickSwitchSeed}</span>
          </div>

          <div className="space-y-2.5">
            {demoAccounts.map((acc) => (
              <div
                key={acc.user}
                onClick={() => handleSelectDemo(acc.user, acc.pass)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] ${
                  usernameOrEmail === acc.user
                    ? "bg-[#181c26] border-rose-500 shadow-md shadow-rose-950/30"
                    : "bg-[#141720]/70 border-[#1e2433] hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-xs text-white">
                    {acc.role}
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${acc.color}`}
                  >
                    {acc.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight mb-2">
                  {acc.desc}
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1.5 border-t border-slate-800/60">
                  <span>{t.auth.userLabel}: <strong className="text-slate-300">{acc.user}</strong></span>
                  <span>{t.auth.loginLabel}: <strong className="text-slate-300">{acc.pass}</strong></span>
                  <span className="text-rose-400/90">{t.auth.authLabel}: <strong>{acc.auth}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
