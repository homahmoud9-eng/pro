"use client";

import React, { useState } from "react";
import { useI18n } from "@/i18n/context";
import { Lock, ShieldAlert, Check, X, Loader2 } from "lucide-react";

export interface AuthorizationPasswordDialogProps {
  isOpen: boolean;
  actionTitle?: string;
  title?: string;
  targetDescription?: string;
  description?: string;
  actionName?: string;
  onConfirm: (authPassword: string) => Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}

export function AuthorizationPasswordDialog({
  isOpen,
  actionTitle,
  title,
  targetDescription,
  description,
  onConfirm,
  onCancel,
  onClose,
}: AuthorizationPasswordDialogProps) {
  const { t, dir } = useI18n();
  const displayTitle = actionTitle || title || t.security.confirmAuthorization;
  const displayDescription = targetDescription || description;
  const handleClose = onCancel || onClose || (() => {});
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg(t.auth.enterAuthPassword);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await onConfirm(password);
      setPassword("");
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || t.auth.invalidAuthPassword);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#141720] border border-rose-900/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with security icon */}
        <div className="bg-gradient-to-r from-rose-950/60 to-purple-950/60 p-5 border-b border-rose-900/30 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="p-2.5 bg-rose-600/20 text-rose-500 rounded-xl border border-rose-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {t.auth.authPasswordRequired}
              </h3>
              <p className="text-xs text-rose-300/80">{t.auth.twoLevelSecurityTitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
            <div className="text-xs font-medium text-slate-400">{t.security.operation}</div>
            <div className="text-sm font-semibold text-white">{displayTitle}</div>
            {displayDescription && (
              <div className="text-xs text-rose-400 font-mono mt-1">
                {t.security.target} {displayDescription}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {t.auth.authPasswordHelp}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t.auth.enterAuthPassword}
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="••••••••••••"
                className="w-full bg-[#0c0e12] border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm outline-none transition"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-3 rounded-xl">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 rtl:space-x-reverse pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-medium text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 rounded-xl shadow-lg shadow-rose-950/40 flex items-center space-x-2 rtl:space-x-reverse transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.security.verifying}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.auth.confirmAndExecute}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
