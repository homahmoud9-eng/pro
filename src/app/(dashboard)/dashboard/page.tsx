"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/context";
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
  Package,
  ShieldAlert,
  History,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  Building2,
  Calendar,
} from "lucide-react";

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/metrics")
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard metrics error:", err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-800/50 rounded-2xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-[#141720] rounded-2xl border border-slate-800/80" />
          ))}
        </div>
      </div>
    );
  }

  const { metrics, recentAudits } = data;

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
      value: `${metrics.todaySales.toLocaleString()} ${t.common.currency}`,
      unit: "",
      sub: locale === "ar" ? "ربط نقاط البيع معتمد" : "POS integration ready",
      icon: TrendingUp,
      color: "from-emerald-600/20 to-teal-600/10 text-emerald-400 border-emerald-800/30",
      href: "/finance",
    },
    {
      title: t.dashboard.monthExpenses,
      value: `${metrics.monthExpenses.toLocaleString()} ${t.common.currency}`,
      unit: "",
      sub: locale === "ar" ? "المشتريات، الإيجارات، والرسوم" : "Supplies, leases, government fees",
      icon: Receipt,
      color: "from-orange-600/20 to-amber-600/10 text-orange-400 border-orange-800/30",
      href: "/finance",
    },
    {
      title: t.dashboard.netWallet,
      value: `${metrics.netWallet.toLocaleString()} ${t.common.currency}`,
      unit: "",
      sub: locale === "ar" ? "صافي السيولة النقدية للتشغيل" : "Estimated net operating cash",
      icon: Wallet,
      color: "from-emerald-600/20 to-green-600/10 text-emerald-400 border-emerald-800/30",
      href: "/finance",
    },
    {
      title: t.dashboard.foodCostPercent,
      value: `${metrics.foodCostPercent}%`,
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
            {t.dashboard.overview} • {locale === "ar" ? "مجموعة مطاعم طاشا (رخصة أبوظبي CN-1984210)" : "Tasha Restaurant Group (Abu Dhabi DED CN-1984210)"}
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

      {/* Secondary Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Compliance & Food Safety Status Panel */}
        <div className="lg:col-span-5 bg-[#141720] border border-[#1e2433] rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {locale === "ar" ? "رقابة أدافسيا والامتثال الرسمي" : "ADAFSA & Official Compliance"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {locale === "ar" ? "السلامة الغذائية والوضع القانوني في أبوظبي" : "Abu Dhabi Food Safety & Legal Status"}
                  </p>
                </div>
              </div>
              <Link
                href="/compliance"
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center space-x-1 rtl:space-x-reverse"
              >
                <span>{locale === "ar" ? "مركز الامتثال" : "View Center"}</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              <div className="bg-[#0c0e12] border border-[#1e2433] p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-white">
                    {locale === "ar" ? "الرخصة التجارية للشركة" : "Commercial Trade License"}
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  {locale === "ar" ? "سارية (2027)" : "Active (2027)"}
                </span>
              </div>

              <div className="bg-[#0c0e12] border border-[#1e2433] p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-white">
                    {locale === "ar" ? "عقد الإيجار وتوثيق" : "Tawtheeq Tenancy Contract"}
                  </span>
                </div>
                <span className="text-xs font-mono text-amber-400">
                  {locale === "ar" ? "ينتهي خلال 22 يوماً" : "Expires in 22 Days"}
                </span>
              </div>

              <div className="bg-[#0c0e12] border border-[#1e2433] p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-semibold text-white">
                    {locale === "ar" ? "شهادة الدفاع المدني والسلامة" : "Civil Defense Certificate"}
                  </span>
                </div>
                <span className="text-xs font-mono text-rose-400">
                  {locale === "ar" ? "منتهية منذ 5 أيام" : "Expired 5 Days Ago"}
                </span>
              </div>

              <div className="bg-[#0c0e12] border border-[#1e2433] p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold text-white">
                    {locale === "ar" ? "شهادات تدريب متداولي الغذاء EFST" : "Food Handlers EFST Certified"}
                  </span>
                </div>
                <span className="text-xs font-mono text-blue-400">
                  {locale === "ar" ? "100% نسبة الالتزام" : "100% Compliant"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1e2433] flex items-center justify-between text-xs text-slate-400">
            <span>
              {locale === "ar" ? "الملاحظات المفتوحة:" : "Open Findings:"}{" "}
              <strong className="text-rose-400">{metrics.openFindings}</strong>
            </span>
            <span>
              {locale === "ar" ? "قيمة المخزون:" : "Inventory Value:"}{" "}
              <strong className="text-white font-mono">{metrics.inventoryValue.toLocaleString()} {t.common.currency}</strong>
            </span>
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
            {recentAudits.map((audit: any) => (
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
                <div className="text-end flex-shrink-0 text-[11px] text-slate-500">
                  {new Date(audit.occurredAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
