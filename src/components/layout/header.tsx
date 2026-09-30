"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import {
  Globe,
  LogOut,
  User,
  Shield,
  MapPin,
  ChevronDown,
} from "lucide-react";

export function Header() {
  const router = useRouter();
  const { locale, setLocale, toggleLocale, t } = useI18n();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="h-16 bg-[#0f1218]/90 backdrop-blur-md border-b border-[#1e2433] sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Left/Start title */}
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs text-slate-400 bg-[#141720] border border-[#1e2433] px-3 py-1.5 rounded-xl">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-white font-medium">{t.common.location}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">{t.common.timezone}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
        {/* Language selector reflecting ACTUAL active language */}
        <div className="flex items-center bg-[#141720] border border-[#1e2433] rounded-xl p-1 text-xs font-semibold">
          <button
            onClick={() => setLocale("en")}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 rtl:space-x-reverse ${
              locale === "en"
                ? "bg-rose-600 text-white shadow-sm font-bold"
                : "text-slate-400 hover:text-white"
            }`}
            title="English (LTR)"
          >
            <span>English (LTR)</span>
          </button>
          <button
            onClick={() => setLocale("ar")}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 rtl:space-x-reverse ${
              locale === "ar"
                ? "bg-rose-600 text-white shadow-sm font-bold"
                : "text-slate-400 hover:text-white"
            }`}
            title="العربية (RTL)"
          >
            <span>العربية (RTL)</span>
          </button>
        </div>

        {/* User Account Menu */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2.5 rtl:space-x-reverse bg-[#141720] border border-[#1e2433] hover:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white transition"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                {currentUser.name?.slice(0, 1) || "U"}
              </div>
              <div className="text-start hidden sm:block">
                <div className="font-semibold text-white truncate max-w-[130px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-rose-400 font-medium">
                  {currentUser.roles?.[0] || "User"}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute end-0 mt-2 w-56 bg-[#141720] border border-[#1e2433] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in duration-100">
                <div className="px-4 py-2 border-b border-[#1e2433]">
                  <div className="text-xs font-bold text-white">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {currentUser.email}
                  </div>
                  <div className="mt-1 flex items-center space-x-1 rtl:space-x-reverse text-[10px] text-rose-400">
                    <Shield className="w-3 h-3" />
                    <span>{t.common.role}: {currentUser.roles?.join(", ")}</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-950/30 flex items-center space-x-2 rtl:space-x-reverse text-start transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t.common.logout}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
