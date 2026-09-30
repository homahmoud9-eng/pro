"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/context";
import {
  LayoutDashboard,
  Building2,
  Users,
  UtensilsCrossed,
  Wallet,
  ShieldCheck,
  FileBarChart,
  Bell,
  History,
  Settings,
  Flame,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { t, locale } = useI18n();

  const navItems = [
    { label: t.common.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { label: t.common.business, href: "/business", icon: Building2 },
    { label: t.common.employees, href: "/employees", icon: Users },
    { label: t.common.operations, href: "/operations", icon: UtensilsCrossed },
    { label: t.common.finance, href: "/finance", icon: Wallet },
    { label: t.common.compliance, href: "/compliance", icon: ShieldCheck },
    { label: t.common.reports, href: "/reports", icon: FileBarChart },
    { label: t.common.notifications, href: "/notifications", icon: Bell },
    { label: t.common.audit, href: "/audit", icon: History },
    { label: t.common.settings, href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0f1218] border-e border-[#1e2433] flex flex-col h-screen fixed top-0 bottom-0 start-0 z-40 transition-all duration-200">
      {/* Brand Logo */}
      <div className="p-5 border-b border-[#1e2433] flex items-center space-x-3 rtl:space-x-reverse">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-900/40 text-white font-bold">
          <Flame className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-white tracking-wide">
            {locale === "ar" ? "مجموعة طاشا" : "TASHA GROUP"}
          </div>
          <div className="text-[10px] text-rose-400 font-medium uppercase tracking-wider">
            {locale === "ar" ? "تشغيل المطاعم المتقدمة - الإمارات" : "UAE Enterprise Operations"}
          </div>
        </div>
      </div>

      {/* Nav Menu Items */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? "bg-rose-600/15 text-rose-400 border border-rose-600/30 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? "text-rose-400" : "text-slate-400"
                }`}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <div className="ms-auto w-1.5 h-1.5 rounded-full bg-rose-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom compliance badge */}
      <div className="p-4 border-t border-[#1e2433]">
        <div className="bg-[#141720] border border-[#1e2433] p-3 rounded-xl flex items-center space-x-2.5 rtl:space-x-reverse">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="text-white font-medium block">
              {locale === "ar" ? "معايير أدافسيا ووزارة الموارد البشرية" : "ADAFSA & MOHRE"}
            </span>
            <span className="text-slate-500">
              {locale === "ar" ? "معتمد في إمارة أبوظبي 2026" : "Abu Dhabi 2026 Compliant"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
