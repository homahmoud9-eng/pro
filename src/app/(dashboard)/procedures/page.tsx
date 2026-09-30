"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import { AuthorizationPasswordDialog } from "@/components/security/authorization-password-dialog";
import {
  Briefcase,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Plus,
  ArrowRight,
  X,
  Loader2,
  FileText,
  Building,
} from "lucide-react";

export default function ProceduresPage() {
  const { t, locale, tStatus, tPriority, formatDate } = useI18n();

  const [procedures, setProcedures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Create Procedure Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("VISA_RENEWAL");
  const [newPriority, setNewPriority] = useState("HIGH");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Two-Level Security Authorization
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<((authPassword: string) => Promise<void>) | null>(null);
  const [actionTitle, setActionTitle] = useState("");
  const [targetDescription, setTargetDescription] = useState("");

  const loadProcedures = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== "ALL") q.set("status", statusFilter);
      if (priorityFilter !== "ALL") q.set("priority", priorityFilter);

      const res = await fetch(`/api/procedures?${q.toString()}`);
      const data = await res.json();
      setProcedures(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcedures();
  }, [statusFilter, priorityFilter]);

  // Advance Step Action
  const handleAdvanceStep = (proc: any, stepNumber: number, stepTitle: string) => {
    setActionTitle(`Advance Procedure Step #${stepNumber}`);
    setTargetDescription(`${proc.reference}: ${stepTitle}`);

    setPendingAction(() => async (authPassword: string) => {
      const res = await fetch(`/api/procedures/${proc.id}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepNumber,
          notes: `Completed step: ${stepTitle}`,
          authorizationPassword: authPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to advance step");

      setAuthDialogOpen(false);
      await loadProcedures();
    });

    setAuthDialogOpen(true);
  };

  // Create Procedure Submit
  const handleConfirmCreate = () => {
    setActionTitle("Initiate Government / Operational Procedure");
    setTargetDescription(`${newTitle} (${newType})`);

    const defaultSteps = [
      { title: "Collect & Review Regulatory Documents" },
      { title: "Submit Application to Relevant UAE Authority" },
      { title: "Awaiting Government Processing & Approval" },
      { title: "Upload Official Attested PDF Certificate" },
    ];

    setPendingAction(() => async (authPassword: string) => {
      const res = await fetch("/api/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          type: newType,
          priority: newPriority,
          dueDate: newDueDate,
          description: newDesc,
          steps: defaultSteps,
          authorizationPassword: authPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create procedure");

      setCreateModalOpen(false);
      setAuthDialogOpen(false);
      await loadProcedures();
    });

    setAuthDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141720] p-6 rounded-3xl border border-[#1e2433]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5 rtl:space-x-reverse">
            <Briefcase className="w-5 h-5 text-rose-500" />
            <span>{t.procedures.title}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t.procedures.subtitle}
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse shadow-lg shadow-rose-950/40 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t.procedures.addProcedure}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#141720] p-4 rounded-2xl border border-[#1e2433] flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0c0e12] border border-[#1e2433] text-xs text-slate-300 rounded-xl px-3 py-2 outline-none"
          >
            <option value="ALL">{t.common.allStatuses}</option>
            <option value="PENDING">{t.common.pending}</option>
            <option value="IN_PROGRESS">{t.common.inProgress}</option>
            <option value="COMPLETED">{t.common.completed}</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#0c0e12] border border-[#1e2433] text-xs text-slate-300 rounded-xl px-3 py-2 outline-none"
          >
            <option value="ALL">{t.common.allPriorities}</option>
            <option value="URGENT">{t.common.urgent}</option>
            <option value="HIGH">{t.common.high}</option>
            <option value="MEDIUM">{t.common.medium}</option>
            <option value="LOW">{t.common.low}</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          {t("procedures.totalWorkflows", { count: procedures.length })}
        </div>
      </div>

      {/* Procedures List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
            <span>{t.procedures.loading}</span>
          </div>
        ) : procedures.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-[#141720] border border-[#1e2433] rounded-3xl">
            {t.common.noData}
          </div>
        ) : (
          procedures.map((proc) => {
            const completedCount = proc.steps.filter((s: any) => s.status === "COMPLETED").length;
            const progressPct =
              proc.steps.length > 0 ? Math.round((completedCount / proc.steps.length) * 100) : 0;

            return (
              <div
                key={proc.id}
                className="p-6 bg-[#141720] border border-[#1e2433] rounded-3xl space-y-5 hover:border-slate-700 transition"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2.5 rtl:space-x-reverse mb-1">
                      <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded-lg">
                        {proc.reference}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          proc.priority === "URGENT"
                            ? "bg-rose-950/40 text-rose-400 border-rose-800/40"
                            : "bg-purple-950/40 text-purple-400 border-purple-800/40"
                        }`}
                      >
                        {tPriority(proc.priority)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          proc.status === "COMPLETED"
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                            : "bg-amber-950/40 text-amber-400 border-amber-800/40"
                        }`}
                      >
                        {tStatus(proc.status)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{proc.title}</h3>
                    {proc.description && (
                      <p className="text-xs text-slate-400 mt-1">{proc.description}</p>
                    )}
                  </div>

                  <div className="text-start sm:text-end text-xs text-slate-400 font-mono">
                    {proc.dueDate && (
                      <div className="flex items-center sm:justify-end space-x-1 rtl:space-x-reverse text-amber-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Due: {new Date(proc.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Progress: {completedCount}/{proc.steps.length} Steps ({progressPct}%)
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#0c0e12] h-2 rounded-full overflow-hidden border border-[#1e2433]">
                  <div
                    className="bg-gradient-to-r from-rose-500 to-purple-500 h-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Steps Timeline */}
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Procedure Lifecycle Steps
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {proc.steps.map((step: any) => {
                      const isDone = step.status === "COMPLETED";
                      const isInProgress = step.status === "IN_PROGRESS";

                      return (
                        <div
                          key={step.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                            isDone
                              ? "bg-[#0c0e12]/60 border-emerald-900/30 text-slate-400"
                              : isInProgress
                              ? "bg-[#181c28] border-rose-500/40 text-white shadow-sm"
                              : "bg-[#0c0e12] border-[#1e2433] text-slate-500"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
                            {isDone ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                  isInProgress
                                    ? "border-rose-400 text-rose-400"
                                    : "border-slate-600 text-slate-600"
                                }`}
                              >
                                {step.stepNumber}
                              </div>
                            )}
                            <div className="truncate">
                              <span className="font-semibold block truncate">
                                {step.title}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Assigned: {step.assignedTo || "PRO"}
                              </span>
                            </div>
                          </div>

                          {!isDone && (
                            <button
                              onClick={() => handleAdvanceStep(proc, step.stepNumber, step.title)}
                              className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl text-[11px] font-semibold flex items-center space-x-1 rtl:space-x-reverse flex-shrink-0 transition"
                            >
                              <span>{t.procedures.completeStep}</span>
                              <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Start Procedure Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <h3 className="text-sm font-bold text-white">{t.procedures.modalTitle}</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.procedures.titleLabel}</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t.procedures.titlePlaceholder}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{t.procedures.typeLabel}</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="VISA_RENEWAL">{t.procedures.typeVisaRenewal}</option>
                    <option value="TRADE_LICENSE_RENEWAL">{t.procedures.typeTradeLicense}</option>
                    <option value="NEW_ONBOARDING">{t.procedures.typeOnboarding}</option>
                    <option value="FOOD_SAFETY_REVIEW">{t.procedures.typeFoodSafety}</option>
                    <option value="EXIT">{t.procedures.typeExitSettlement}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{t.procedures.priorityLabel}</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="URGENT">{t.common.urgent}</option>
                    <option value="HIGH">{t.common.high}</option>
                    <option value="MEDIUM">{t.common.medium}</option>
                    <option value="LOW">{t.common.low}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.procedures.targetDueDate}</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.procedures.descriptionLabel}</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={t.procedures.descriptionPlaceholder}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleConfirmCreate}
                disabled={!newTitle}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40 disabled:opacity-50"
              >
                {t.auth.confirmAndExecute}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-Level Security Authorization Dialog */}
      <AuthorizationPasswordDialog
        isOpen={authDialogOpen}
        actionTitle={actionTitle}
        targetDescription={targetDescription}
        onConfirm={async (pwd) => {
          if (pendingAction) {
            await pendingAction(pwd);
          }
        }}
        onCancel={() => setAuthDialogOpen(false)}
      />
    </div>
  );
}
