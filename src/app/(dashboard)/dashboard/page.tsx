"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import {
  DashboardDataResponse,
  DashboardMetrics,
  DEFAULT_DASHBOARD_METRICS,
} from "@/types/dashboard";
import {
  Users,
  FileWarning,
  FileCheck,
  FileClock,
  Briefcase,
  TrendingUp,
  Receipt,
  Wallet,
  UtensilsCrossed,
  ShieldAlert,
  History,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { t, locale } = useI18n();

  const [data, setData] = useState<DashboardDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/metrics");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Server responded with status ${res.status}`);
      }
      if (!json || typeof json.metrics !== "object") {
        throw new Error("Invalid payload: metrics contract missing from server response");
      }
      setData(json);
    } catch (err: any) {
      console.error("Dashboard metrics loading error:", err);
      setError(err?.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  // 1. Explicit Loading State
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-24 bg-[#141720] border border-[#1e2433] rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-[#141720] rounded-2xl border border-[#1e2433]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 h-64 bg-[#141720] rounded-3xl border border-[#1e2433]" />
          <div className="lg:col-span-7 h-64 bg-[#141720] rounded-3xl border border-[#1e2433]" />
        </div>
      </div>
    );
  }

  // 2. Explicit Error State with Retry Button
  if (error || !data) {
    return (
      <div className="p-8 bg-[#141720] border border-rose-900/40 rounded-3xl text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 text-rose-500 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white mb-1">
            {locale === "ar" ? "تعذر تحميل مؤشرات التشغيل" : "Failed to Load Dashboard Metrics"}
          </h2>
          <p className="text-xs text-rose-400 font-mono break-words">{error}</p>
        </div>
        <button
          onClick={fetchDashboardMetrics}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-2 rtl:space-x-reverse transition shadow-lg shadow-rose-950/40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{locale === "ar" ? "إعادة المحاولة" : "Retry Now"}</span>
        </button>
      </div>
    );
  }

  // 3. Guaranteed Safe Metrics Object (Never undefined)
  const metrics: DashboardMetrics = data.metrics || DEFAULT_DASHBOARD_METRICS;
  const recentAudits = Array.isArray(data.recentAudits) ? data.recentAudits : [];

  const kpis = [
    {
      title: t.dashboard.activeEmployees,
      value: `${metrics.activeEmployees}`,
      unit: t.dashboard.persons,
      sub: `${metrics.totalEmployees} ${locale === "ar" ? "إجمالي المسجلين" : "total registered"}`,
      icon: Users,
      color: "from-blue-600/20 to-cyan-600/10 text-cyan-400 border-cyan-800/30",
      href: "/employees",
    },
    {
      title: t.dashboard.expiredDocuments,
      value: `${metrics.expiredDocs}`,
      unit: t.dashboard.docs,
      sub: locale === "ar" ? "يتطلب التجديد الفوري" : "Requires immediate renewal",
      icon: FileWarning,
      color: "from-rose-600/25 to-red-600/10 text-rose-400 border-rose-800/40",
      href: "/documents?status=EXPIRED",
      badge: locale === "ar" ? "حرج" : "Critical",
    },
    {
      title: t.dashboard.expiringDocuments,
      value: `${metrics.expiringDocs}`,
      unit: t.dashboard.docs,
      sub: locale === "ar" ? "إجراء مطلوب خلال 30 يوماً" : "Action within 30 days",
      icon: FileClock,
      color: "from-amber-600/20 to-yellow-600/10 text-amber-400 border-amber-800/30",
      href: "/documents?status=EXPIRING_SOON",
    },
    {
      title: t.dashboard.openProcedures,
      value: `${metrics.openProcedures}`,
      unit: locale === "ar" ? "معاملات" : "Workflows",
      sub: `${metrics.inProgressProcedures} ${locale === "ar" ? "قيد المتابعة النشطة" : "actively in progress"}`,
      icon: Briefcase,
      color: "from-purple-600/20 to-indigo-600/10 text-purple-400 border-purple-800/30",
      href: "/procedures",
    },
    {
      title: t.dashboard.todaySales,
      value: `${Number(metrics.todaySales || 0).toLocaleString()} ${metrics.currency || t.common.currency}`,
      unit: "",
      sub: locale === "ar" ? "ربط نقاط البيع معتمد" : "POS integration ready",
      icon: TrendingUp,
      color: "from-emerald-600/20 to-teal-600/10 text-emerald-400 border-emerald-800/30",
      href: "/finance",
    },
    {
      title: t.dashboard.monthExpenses,
      value: `${Number(metrics.monthExpenses || 0).toLocaleString()} ${metrics.currency || t.common.currency}`,
      unit: "",
      sub: locale === "ar" ? "المشتريات، الإيجارات، والرسوم" : "Supplies, leases, government fees",
      icon: Receipt,
      color: "from-orange-600/20 to-amber-600/10 text-orange-400 border-orange-800/30",
      href: "/finance",
    },
    {
      title: t.dashboard.netWallet,
      value: `${Number(metrics.netWallet || 0).toLocaleString()} ${metrics.currency || t.common.currency}`,
      unit: "",
      sub: locale === "ar" ? "صافي السيولة النقدية للتشغيل" : "Estimated net operating cash",
      icon: Wallet,
      color: "from-emerald-600/20 to-green-600/10 text-emerald-400 border-emerald-800/30",
      href: "/finance",
    },
    {
      title: t.dashboard.foodCostPercent,
      value: `${Number(metrics.foodCostPercent || 0)}%`,
      unit: "",
      sub: locale === "ar" ? "المعدل المستهدف < 30%" : "Target benchmark < 30%",
      icon: UtensilsCrossed,
      color: "from-rose-600/20 to-pink-600/10 text-pink-400 border-pink-800/30",
      href: "/operations",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#141720] via-[#161a26] to-[#141720] p-6 rounded-3xl border border-[#1e2433]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5 rtl:space-x-reverse">
            <span>{t.dashboard.title}</span>
            <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-normal">
              {locale === "ar" ? "بيئة الإنتاج المباشرة" : "Live Production"}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t.dashboard.overview} • {data.organization ? (locale === "ar" ? `${data.organization.nameAr} (${data.organization.licenseNumbers ? `رخصة: ${data.organization.licenseNumbers}` : data.organization.code})` : `${data.organization.nameEn} (${data.organization.licenseNumbers ? `License: ${data.organization.licenseNumbers}` : data.organization.code})`) : (locale === "ar" ? "لوحة مؤشرات المنشأة" : "Enterprise Operations Console")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/employees"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse shadow-lg shadow-rose-950/40 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.employees.addEmployee}</span>
          </Link>
          <Link
            href="/documents"
            className="px-4 py-2 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
          >
            <FileCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>{t.documents.uploadDoc}</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              href={kpi.href}
              className={`p-5 rounded-2xl bg-gradient-to-b ${kpi.color} bg-[#141720] border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl hover:border-slate-700 flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-300">
                  {kpi.title}
                </span>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline space-x-1.5 rtl:space-x-reverse">
                  <span className="text-2xl font-bold text-white tracking-tight font-mono">
                    {kpi.value}
                  </span>
                  {kpi.unit && (
                    <span className="text-xs text-slate-400 font-medium">
                      {kpi.unit}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>{kpi.sub}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Employee Documents & Compliance Widget (Section 13) */}
      <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="p-2.5 bg-rose-600/20 text-rose-400 rounded-2xl border border-rose-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <span>{locale === "ar" ? "مستندات وإقامات الموظفين" : "Employee Documents & Compliance"}</span>
                <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                  {metrics.totalEmployees} {locale === "ar" ? "موظف مسجل" : "Employees"}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {locale === "ar" ? "متابعة تواريخ الإقامات، الجوازات، الهويات والعقود وتنبيهات التجديد المبكر" : "Tracking visas, passports, Emirates IDs, contracts, and renewal alerts"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Link
              href="/documents/expiring"
              className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
            >
              <FileClock className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "المستندات المنتهية والقريبة" : "Expiring & Expired"}</span>
            </Link>
            <Link
              href="/employees"
              className="px-3.5 py-2 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
            >
              <span>{locale === "ar" ? "إدارة الموظفين" : "Manage Employees"}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
            </Link>
          </div>
        </div>

        {/* Dynamic Counter Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Valid */}
          <Link
            href="/documents?status=ACTIVE"
            className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/30 hover:border-emerald-600 transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-emerald-400 flex items-center space-x-1.5 rtl:space-x-reverse">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{locale === "ar" ? "سارية" : "Valid"}</span>
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-white group-hover:text-emerald-400 transition">
              {metrics.employeeDocStats?.valid || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {locale === "ar" ? "مكتملة ومحدثة" : "Active & updated"}
            </div>
          </Link>

          {/* Expiring in 90 Days */}
          <Link
            href="/documents/expiring?status=EXPIRING_SOON"
            className="p-4 rounded-2xl bg-yellow-950/20 border border-yellow-800/30 hover:border-yellow-600 transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-yellow-400 flex items-center space-x-1.5 rtl:space-x-reverse">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>{locale === "ar" ? "خلال 90 يوم" : "Within 90 Days"}</span>
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-white group-hover:text-yellow-400 transition">
              {metrics.employeeDocStats?.expiring90 || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {locale === "ar" ? "تحذير مسبق للتجديد" : "Early warning window"}
            </div>
          </Link>

          {/* Expiring in 30 Days */}
          <Link
            href="/documents/expiring?status=EXPIRING_SOON"
            className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 hover:border-amber-600 transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-amber-400 flex items-center space-x-1.5 rtl:space-x-reverse">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{locale === "ar" ? "خلال 30 يوم" : "Within 30 Days"}</span>
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400 group-hover:text-amber-300 transition">
              {metrics.employeeDocStats?.expiring30 || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {locale === "ar" ? "إجراء مطلوب عاجلاً" : "Urgent action required"}
            </div>
          </Link>

          {/* Expired */}
          <Link
            href="/documents/expiring?status=EXPIRED"
            className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/40 hover:border-rose-600 transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-rose-400 flex items-center space-x-1.5 rtl:space-x-reverse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>{locale === "ar" ? "منتهية" : "Expired"}</span>
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-rose-400 group-hover:text-rose-300 transition">
              {metrics.employeeDocStats?.expired || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {locale === "ar" ? "مخالفة وتتطلب التجديد" : "Immediate renewal due"}
            </div>
          </Link>

          {/* Missing */}
          <Link
            href="/employees"
            className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 flex items-center space-x-1.5 rtl:space-x-reverse">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>{locale === "ar" ? "ناقصة" : "Missing"}</span>
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-300 group-hover:text-white transition">
              {metrics.employeeDocStats?.missing || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {locale === "ar" ? "مستندات إلزامية لم تُرفع" : "Mandatory docs missing"}
            </div>
          </Link>
        </div>
      </div>

      {/* Secondary Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Compliance & Regulatory (ADAFSA Official Compliance Panel) */}
        <div className="lg:col-span-5 bg-[#141720] border border-[#1e2433] rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {locale === "ar" ? "الامتثال والرقابة الرسمية" : "Compliance & Regulatory"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ADAFSA • Food Safety • Regulatory
                  </p>
                </div>
              </div>
              <Link
                href="/compliance"
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center space-x-1 rtl:space-x-reverse"
              >
                <span>{locale === "ar" ? "مركز الامتثال" : "Compliance Center"}</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Live Database Aggregates - Section 29 */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="bg-[#0c0e12] border border-[#1e2433] p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  {locale === "ar" ? "متطلبات سارية" : "Active Requirements"}
                </span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {metrics.complianceStats?.activeRequirements || 0}
                </span>
              </div>

              <div className="bg-[#0c0e12] border border-[#1e2433] p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  {locale === "ar" ? "مستندات منتهية" : "Expired Documents"}
                </span>
                <span className="text-sm font-bold font-mono text-rose-400">
                  {metrics.complianceStats?.expiredDocs ?? metrics.expiredDocs ?? 0}
                </span>
              </div>

              <div className="bg-[#0c0e12] border border-[#1e2433] p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  {locale === "ar" ? "إجراءات مفتوحة" : "Open Actions"}
                </span>
                <span className="text-sm font-bold font-mono text-amber-400">
                  {metrics.complianceStats?.openCorrectiveActions || 0}
                </span>
              </div>

              <div className="bg-[#0c0e12] border border-[#1e2433] p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-300">
                  {locale === "ar" ? "تفتيشات قادمة" : "Upcoming Inspections"}
                </span>
                <span className="text-sm font-bold font-mono text-cyan-400">
                  {metrics.complianceStats?.upcomingInspections || 0}
                </span>
              </div>
            </div>

            {/* Additional database-driven operational indicators */}
            <div className="space-y-2 mt-3">
              <div className="bg-[#0c0e12] border border-[#1e2433] p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {locale === "ar" ? "تغطية تدريب متداولي الغذاء (EFST)" : "EFST Food Handlers Coverage"}
                </span>
                <span className="font-mono font-semibold text-white">
                  {metrics.complianceStats?.efstCoveragePercent !== null && metrics.complianceStats?.efstCoveragePercent !== undefined
                    ? `${metrics.complianceStats.efstCoveragePercent}%`
                    : locale === "ar" ? "لا توجد بيانات بعد" : "No records yet"}
                </span>
              </div>

              <div className="bg-[#0c0e12] border border-[#1e2433] p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {locale === "ar" ? "ملاحظات التفتيش المفتوحة" : "Open Inspection Findings"}
                </span>
                <span className="font-mono font-semibold text-rose-400">
                  {metrics.complianceStats?.openFindings ?? metrics.openFindings ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#1e2433] flex items-center justify-between text-xs text-slate-400">
            <span>
              {locale === "ar" ? "الجهة الرقابية الأساسية: أدافسيا" : "Primary Authority: ADAFSA"}
            </span>
            <Link
              href="/compliance"
              className="text-xs text-rose-400 hover:underline"
            >
              {locale === "ar" ? "فتح السجل الرقابي" : "Open Regulatory Ledger"}
            </Link>
          </div>
        </div>

        {/* Live Immutable Audit Feed */}
        <div className="lg:col-span-7 bg-[#141720] border border-[#1e2433] rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
              <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {t.dashboard.recentActivity}
                </h3>
                <p className="text-xs text-slate-400">
                  {locale === "ar" ? "سجل تدقيق متسلسل ومحمي بتشفير HMAC لإثبات النزاهة" : "Cryptographically Hash-Chained Audit Trail"}
                </p>
              </div>
            </div>
            <Link
              href="/audit"
              className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center space-x-1 rtl:space-x-reverse"
            >
              <span>{t.audit.verifyChain}</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-[#1e2433] overflow-hidden">
            {recentAudits.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                {locale === "ar" ? "لا توجد عمليات تدقيق حديثة مسجلة" : "No recent audit activity"}
              </div>
            ) : (
              recentAudits.map((audit) => (
                <div key={audit.id} className="py-3.5 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="font-semibold text-white truncate">
                        {audit.actorNameSnapshot}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 uppercase">
                        {audit.action}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        #{audit.sequenceNumber}
                      </span>
                    </div>
                    <p className="text-slate-400 truncate">
                      {audit.entityDisplayName || audit.reason || audit.entityType}
                    </p>
                  </div>
                  <div className="text-end flex-shrink-0 text-[11px] text-slate-500 font-mono">
                    {new Date(audit.occurredAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
