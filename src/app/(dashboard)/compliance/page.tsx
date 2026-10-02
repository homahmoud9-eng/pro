"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/i18n/context";
import {
  ShieldCheck,
  Award,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building,
  UserCheck,
  ClipboardCheck,
  Thermometer,
  Plus,
  Search,
  FileCheck,
  FileWarning,
  Eye,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  RefreshCw,
  Download,
  X,
  Lock,
} from "lucide-react";
import { AuthorizationPasswordDialog } from "@/components/security/authorization-password-dialog";
import { PdfViewerModal } from "@/components/pdf/pdf-viewer-modal";

interface RegulatoryRequirement {
  id: string;
  code: string;
  authority: string;
  category: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  sourceReference: string;
  sourceUrl: string | null;
  scope: string;
  frequency: string;
  evidenceRequired: boolean;
  complianceRecords: Array<{
    id: string;
    status: string;
    lastVerifiedAt: string | null;
    verifiedBy: string | null;
    notes: string | null;
    branch?: { id: string; nameAr: string; nameEn: string; code: string } | null;
  }>;
}

interface Inspection {
  id: string;
  authority: string;
  inspectionType: string;
  referenceNumber: string | null;
  inspectionDate: string;
  inspectorName: string;
  score: number;
  overallResult: string;
  status: string;
  notes: string | null;
  branch?: { id: string; nameAr: string; nameEn: string; code: string } | null;
  findings: Finding[];
}

interface Finding {
  id: string;
  inspectionId: string;
  findingNumber: string | null;
  category: string | null;
  severity: string;
  description: string;
  correctiveAction: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  status: string;
  branch?: { id: string; nameAr: string; nameEn: string; code: string } | null;
  inspection?: { id: string; authority: string; referenceNumber: string | null; inspectionDate: string } | null;
  correctiveActions?: CorrectiveAction[];
}

interface CorrectiveAction {
  id: string;
  title: string;
  description: string;
  severity: string;
  actionRequired: string;
  assignedTo: string | null;
  dueDate: string;
  status: string;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  closedBy: string | null;
  branch?: { id: string; nameAr: string; nameEn: string; code: string } | null;
  finding?: { id: string; findingNumber: string | null; description: string; severity: string } | null;
}

interface FoodHandlerTraining {
  id: string;
  program: string;
  trainingType: string;
  trainingCategory: string;
  provider: string | null;
  certificateNumber: string | null;
  certificateDocumentId: string | null;
  trainingDate: string;
  expiryDate: string | null;
  status: string;
  notes: string | null;
  employee: { id: string; nameAr: string; nameEn: string; employeeCode: string; jobTitle: string };
  branch?: { id: string; nameAr: string; nameEn: string; code: string } | null;
}

interface FoodSafetyLog {
  id: string;
  logType: string;
  controlPoint: string;
  parameter: string;
  measuredValue: string;
  targetRange: string | null;
  isCompliant: boolean;
  correctiveAction: string | null;
  recordedBy: string;
  recordedAt: string;
  notes: string | null;
  branch?: { id: string; nameAr: string; nameEn: string; code: string } | null;
}

interface TraceabilityRecord {
  id: string;
  batchLotNumber: string;
  productName: string;
  supplierName: string;
  receivedDate: string;
  expiryDate: string | null;
  quantityReceived: number | null;
  storageLocation: string | null;
  status: string;
  recallStatus: string;
  notes: string | null;
  branch?: { id: string; nameAr: string; nameEn: string; code: string } | null;
}

export default function CompliancePage() {
  const { t, locale } = useI18n();
  const isAr = locale === "ar";

  const [activeTab, setActiveTab] = useState<
    "overview" | "requirements" | "inspections" | "findings" | "efst" | "logs" | "traceability" | "documents"
  >("overview");

  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddInspection, setShowAddInspection] = useState(false);
  const [showAddFinding, setShowAddFinding] = useState(false);
  const [selectedInspectionForFinding, setSelectedInspectionForFinding] = useState<string>("");
  const [showAddEfst, setShowAddEfst] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [showAddTraceability, setShowAddTraceability] = useState(false);
  const [showVerifyReq, setShowVerifyReq] = useState<RegulatoryRequirement | null>(null);
  const [actionToClose, setActionToClose] = useState<CorrectiveAction | null>(null);

  // PDF Viewer Modal state
  const [pdfModal, setPdfModal] = useState<{ open: boolean; docId: string; title: string }>({
    open: false,
    docId: "",
    title: "",
  });

  // Auth Password Dialog state
  const [authDialog, setAuthDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionName: string;
    onSuccess: (authPass: string) => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    actionName: "",
    onSuccess: async () => {},
  });

  const fetchComplianceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        selectedBranchId && selectedBranchId !== "ALL"
          ? `/api/compliance?branchId=${selectedBranchId}`
          : "/api/compliance";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load compliance data (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("Compliance fetch error:", err);
      setError(err?.message || "Error loading regulatory compliance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, [selectedBranchId]);

  const metrics = data?.metrics || {
    totalRequirements: 0,
    compliantRecords: 0,
    pendingRecords: 0,
    openFindings: 0,
    openCorrectiveActions: 0,
    overdueCorrectiveActions: 0,
    upcomingInspections: 0,
    expiringDocumentsCount: 0,
    efstTotalHandlers: 0,
    efstCertifiedCount: 0,
    efstCoveragePercent: null,
    hasRealData: false,
  };

  // Helper for closing corrective actions with authorization password
  const handleCloseAction = (action: CorrectiveAction) => {
    setActionToClose(action);
  };

  return (
    <div className="space-y-6">
      {/* Top ADAFSA Regulatory Authority Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#141720] via-[#161c28] to-[#141720] p-6 rounded-3xl border border-[#1e2433] shadow-xl">
        <div className="flex items-start space-x-3.5 rtl:space-x-reverse">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-950/40">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t.compliance.title}
              </h1>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                ADAFSA 2026
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {t.compliance.subtitle}
            </p>
            <div className="text-[11px] text-slate-500 mt-1.5 flex flex-wrap items-center gap-3">
              <span>{isAr ? "المرجع: نظام رقم (6) لسنة 2020 بشأن صحة الغذاء" : "Ref: ADAFSA Food Hygiene Regulation No. 6/2020"}</span>
              <span>•</span>
              <span>{isAr ? "دليل الممارسات الصحية رقم (1) لسنة 2012" : "Code of Practice No. 1/2012"}</span>
            </div>
          </div>
        </div>

        {/* Branch Filter & Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-2 bg-[#0c0e12] border border-[#1e2433] text-xs font-semibold text-white rounded-xl focus:border-rose-500 focus:outline-none"
          >
            <option value="ALL">{t.common.allBranches}</option>
            {data?.branches?.map((b: any) => (
              <option key={b.id} value={b.id}>
                {isAr ? b.nameAr : b.nameEn} ({b.code})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAddInspection(true)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse shadow-lg shadow-rose-950/40 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.compliance.recordInspection}</span>
          </button>

          <button
            onClick={() => setShowAddEfst(true)}
            className="px-3.5 py-2 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.compliance.recordEfst}</span>
          </button>

          <button
            onClick={() => setShowAddLog(true)}
            className="px-3.5 py-2 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
          >
            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.compliance.logTempCheck}</span>
          </button>
        </div>
      </div>

      {/* Real Live Database Metrics Grid (No fake percentages, real aggregates) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Active Requirements */}
        <div className="p-4 rounded-2xl bg-[#141720] border border-[#1e2433]">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            {t.compliance.activeReqs}
          </span>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics.totalRequirements}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">
            {metrics.compliantRecords} {isAr ? "مستوفاة وموثقة" : "verified compliant"}
          </div>
        </div>

        {/* Open Findings */}
        <div className="p-4 rounded-2xl bg-[#141720] border border-[#1e2433]">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            {t.compliance.openFindingsCount}
          </span>
          <div className={`text-2xl font-bold font-mono ${metrics.openFindings > 0 ? "text-rose-400" : "text-slate-300"}`}>
            {metrics.openFindings}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isAr ? "ملاحظات رقابية جارية" : "Pending resolution"}
          </div>
        </div>

        {/* Open Corrective Actions */}
        <div className="p-4 rounded-2xl bg-[#141720] border border-[#1e2433]">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            {t.compliance.openActionsCount}
          </span>
          <div className={`text-2xl font-bold font-mono ${metrics.openCorrectiveActions > 0 ? "text-amber-400" : "text-slate-300"}`}>
            {metrics.openCorrectiveActions}
          </div>
          <div className="text-[10px] text-rose-400 mt-1">
            {metrics.overdueCorrectiveActions > 0 ? `${metrics.overdueCorrectiveActions} ${isAr ? "متأخرة" : "overdue"}` : isAr ? "لا توجد متأخرات" : "None overdue"}
          </div>
        </div>

        {/* Upcoming Inspections */}
        <div className="p-4 rounded-2xl bg-[#141720] border border-[#1e2433]">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            {t.compliance.upcomingInspectionsCount}
          </span>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {metrics.upcomingInspections}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isAr ? "زيارات مجدولة / قيد المتابعة" : "Scheduled or in follow-up"}
          </div>
        </div>

        {/* EFST Coverage (Computed accurately from real employee records) */}
        <div className="p-4 rounded-2xl bg-[#141720] border border-[#1e2433]">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            {t.compliance.efstCoverageLabel}
          </span>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics.efstCoveragePercent !== null ? `${metrics.efstCoveragePercent}%` : "—"}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {metrics.efstCertifiedCount} / {metrics.efstTotalHandlers} {isAr ? "متداول مؤهل" : "handlers certified"}
          </div>
        </div>

        {/* Expired / Expiring Regulatory Documents */}
        <div className="p-4 rounded-2xl bg-[#141720] border border-[#1e2433]">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            {isAr ? "وثائق وتراخيص منتهية" : "Expired Licenses"}
          </span>
          <div className={`text-2xl font-bold font-mono ${metrics.expiringDocumentsCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {metrics.expiringDocumentsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isAr ? "رخص، عقود، وتصاريح" : "Permits, leases & cards"}
          </div>
        </div>
      </div>

      {/* Clean Empty State Banner if No Records Exist Yet */}
      {!metrics.hasRealData && (
        <div className="p-5 bg-gradient-to-r from-amber-950/20 via-[#141720] to-[#141720] border border-amber-800/30 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">
                {t.compliance.noComplianceDataYet}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {t.compliance.noComplianceDataSub}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAddInspection(true)}
            className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-xl transition"
          >
            {t.compliance.recordInspection}
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1.5 rtl:space-x-reverse overflow-x-auto border-b border-[#1e2433] pb-2">
        {[
          { id: "overview", label: t.compliance.overviewTab, count: null },
          { id: "requirements", label: t.compliance.requirementsTab, count: data?.requirements?.length },
          { id: "inspections", label: t.compliance.inspectionsTab, count: data?.inspections?.length },
          { id: "findings", label: t.compliance.findingsTab, count: metrics.openFindings },
          { id: "efst", label: t.compliance.efstTab, count: data?.efstTrainings?.length },
          { id: "logs", label: t.compliance.foodSafetyLogsTab, count: data?.foodSafetyLogs?.length },
          { id: "traceability", label: t.compliance.traceabilityTab, count: data?.traceabilityRecords?.length },
          { id: "documents", label: t.compliance.documentsTab, count: data?.expiringDocuments?.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 rtl:space-x-reverse ${
              activeTab === tab.id
                ? "bg-rose-600/15 text-rose-400 border border-rose-600/30 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === tab.id ? "bg-rose-500/30 text-rose-300" : "bg-slate-800 text-slate-400"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Inspections & Findings Overview */}
          <div className="lg:col-span-7 bg-[#141720] border border-[#1e2433] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <ClipboardCheck className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  {isAr ? "أحدث الزيارات والتفتيش الرسمي" : "Recent Official Inspections"}
                </h3>
              </div>
              <button
                onClick={() => setActiveTab("inspections")}
                className="text-xs text-rose-400 hover:underline"
              >
                {isAr ? "عرض الكل" : "View All"}
              </button>
            </div>

            {(!data?.inspections || data.inspections.length === 0) ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {isAr ? "لم يتم تسجيل أي زيارات تفتيش رسمية حتى الآن." : "No official inspections recorded yet."}
              </div>
            ) : (
              <div className="space-y-3">
                {data.inspections.slice(0, 4).map((insp: Inspection) => (
                  <div
                    key={insp.id}
                    className="p-4 rounded-2xl bg-[#0c0e12] border border-[#1e2433] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className="text-xs font-bold text-white">
                          {insp.authority} • {insp.inspectionType}
                        </span>
                        {insp.referenceNumber && (
                          <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                            #{insp.referenceNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {insp.branch ? (isAr ? insp.branch.nameAr : insp.branch.nameEn) : (isAr ? "كافة الفروع" : "All Branches")} •{" "}
                        {new Date(insp.inspectionDate).toLocaleDateString(locale)}
                      </div>
                    </div>
                    <div className="text-end">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        insp.overallResult === "SATISFACTORY"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}>
                        {insp.overallResult}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {insp.findings?.length || 0} {isAr ? "ملاحظات" : "findings"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Statutory Regulatory Obligations Card */}
          <div className="lg:col-span-5 bg-[#141720] border border-[#1e2433] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  {isAr ? "المعايير التشريعية الإلزامية (ADAFSA)" : "ADAFSA Statutory Controls"}
                </h3>
              </div>
              <button
                onClick={() => setActiveTab("requirements")}
                className="text-xs text-rose-400 hover:underline"
              >
                {isAr ? "عرض التفاصيل" : "View All"}
              </button>
            </div>

            <div className="space-y-2.5">
              {data?.requirements?.slice(0, 5).map((req: RegulatoryRequirement) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl bg-[#0c0e12] border border-[#1e2433] flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                    <span className="text-xs font-semibold text-white block truncate">
                      {isAr ? req.titleAr : req.titleEn}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {req.sourceReference}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded flex-shrink-0">
                    {req.code}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Requirements */}
      {activeTab === "requirements" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.requirements?.map((req: RegulatoryRequirement) => {
              const records = req.complianceRecords || [];
              const isCompliant = records.some((r) => r.status === "COMPLIANT");
              return (
                <div
                  key={req.id}
                  className="bg-[#141720] border border-[#1e2433] rounded-3xl p-5 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className="text-xs font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold">
                          {req.code}
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                          {req.authority}
                        </span>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isCompliant
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}>
                        {isCompliant ? (isAr ? "مستوفى وموثق" : "Compliant") : (isAr ? "بانتظار التوثيق" : "Pending Verification")}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1.5">
                      {isAr ? req.titleAr : req.titleEn}
                    </h3>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      {isAr ? req.descriptionAr : req.descriptionEn}
                    </p>

                    <div className="p-3 rounded-xl bg-[#0c0e12] border border-[#1e2433] space-y-1.5 text-[11px] text-slate-400">
                      <div>
                        <strong className="text-slate-300">{isAr ? "المرجع التشريعي:" : "Statutory Ref:"}</strong>{" "}
                        {req.sourceReference}
                      </div>
                      <div className="flex justify-between">
                        <span>
                          <strong className="text-slate-300">{isAr ? "دورية الرقابة:" : "Frequency:"}</strong> {req.frequency}
                        </span>
                        <span>
                          <strong className="text-slate-300">{isAr ? "النطاق:" : "Scope:"}</strong> {req.scope}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1e2433] flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {records.length} {isAr ? "سجلات تحقق" : "verification records"}
                    </span>
                    <button
                      onClick={() => setShowVerifyReq(req)}
                      className="px-3 py-1.5 bg-rose-600/15 hover:bg-rose-600/30 border border-rose-600/30 text-rose-400 rounded-xl text-xs font-semibold transition"
                    >
                      {t.compliance.verifyRequirement}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Inspections */}
      {activeTab === "inspections" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#141720] p-4 rounded-2xl border border-[#1e2433]">
            <span className="text-xs font-semibold text-white">
              {t.compliance.inspectionHistory.replace("{count}", String(data?.inspections?.length || 0))}
            </span>
            <button
              onClick={() => setShowAddInspection(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.compliance.recordInspection}</span>
            </button>
          </div>

          <div className="space-y-3">
            {data?.inspections?.map((insp: Inspection) => (
              <div
                key={insp.id}
                className="bg-[#141720] border border-[#1e2433] rounded-3xl p-5 shadow-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1e2433]">
                  <div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-sm font-bold text-white">
                        {insp.authority} • {insp.inspectionType}
                      </span>
                      {insp.referenceNumber && (
                        <span className="text-xs font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                          #{insp.referenceNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {insp.branch ? (isAr ? insp.branch.nameAr : insp.branch.nameEn) : (isAr ? "كافة الفروع" : "All Branches")} •{" "}
                      {new Date(insp.inspectionDate).toLocaleDateString(locale)} •{" "}
                      {isAr ? "المفتش:" : "Inspector:"} {insp.inspectorName}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <span className={`text-xs font-bold px-3 py-1 rounded-xl ${
                      insp.overallResult === "SATISFACTORY"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}>
                      {insp.overallResult}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedInspectionForFinding(insp.id);
                        setShowAddFinding(true);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isAr ? "إضافة ملاحظة" : "Add Finding"}</span>
                    </button>
                  </div>
                </div>

                {/* Findings under this inspection */}
                {insp.findings && insp.findings.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    <div className="text-xs font-bold text-slate-300">
                      {isAr ? "الملاحظات الرقابية المسجلة:" : "Recorded Findings:"}
                    </div>
                    {insp.findings.map((f: Finding) => (
                      <div
                        key={f.id}
                        className="p-3.5 rounded-2xl bg-[#0c0e12] border border-[#1e2433] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              f.severity === "CRITICAL"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : f.severity === "MAJOR"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}>
                              {f.severity}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {f.category || f.findingNumber || ""}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">
                            {f.description}
                          </p>
                          {f.correctiveAction && (
                            <div className="text-[11px] text-slate-400 mt-1">
                              <strong className="text-slate-300">{isAr ? "الإجراء المطلوب:" : "Action Required:"}</strong> {f.correctiveAction}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 rtl:space-x-reverse flex-shrink-0">
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            f.status === "CLOSED" || f.status === "RESOLVED"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}>
                            {f.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 p-2">
                    {t.compliance.noViolations}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Findings & Corrective Actions */}
      {activeTab === "findings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#141720] p-4 rounded-2xl border border-[#1e2433]">
            <span className="text-xs font-semibold text-white">
              {isAr ? `الملاحظات والإجراءات التصحيحية المفتوحة (${metrics.openFindings})` : `Open Findings & Corrective Actions (${metrics.openFindings})`}
            </span>
          </div>

          <div className="space-y-3">
            {(!data?.correctiveActions || data.correctiveActions.length === 0) ? (
              <div className="py-12 bg-[#141720] border border-[#1e2433] rounded-3xl text-center text-slate-400 text-xs">
                {isAr ? "لا توجد أي إجراءات تصحيحية مفتوحة. جميع الملاحظات معالجة بالكامل." : "No open corrective actions. All observations are fully resolved."}
              </div>
            ) : (
              data.correctiveActions.map((action: CorrectiveAction) => {
                const isOverdue = action.status !== "CLOSED" && new Date(action.dueDate) < new Date();
                return (
                  <div
                    key={action.id}
                    className="p-5 bg-[#141720] border border-[#1e2433] rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          action.severity === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}>
                          {action.severity}
                        </span>
                        <h4 className="text-xs font-bold text-white">
                          {action.title}
                        </h4>
                        {isOverdue && (
                          <span className="text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800 px-2 py-0.5 rounded">
                            {t.compliance.overdue}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1.5">
                        {action.actionRequired}
                      </p>
                      <div className="text-[11px] text-slate-400 mt-2 flex flex-wrap items-center gap-3">
                        <span>
                          {t.compliance.dueBy} {new Date(action.dueDate).toLocaleDateString(locale)}
                        </span>
                        {action.assignedTo && (
                          <span>
                            {t.compliance.responsiblePerson} {action.assignedTo}
                          </span>
                        )}
                        {action.branch && (
                          <span>
                            {t.compliance.branchLocation}: {isAr ? action.branch.nameAr : action.branch.nameEn}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse flex-shrink-0">
                      {action.status !== "CLOSED" ? (
                        <button
                          onClick={() => handleCloseAction(action)}
                          className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{t.compliance.closeActionBtn}</span>
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-xl">
                          {t.compliance.closed}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: EFST Training */}
      {activeTab === "efst" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#141720] p-4 rounded-2xl border border-[#1e2433]">
            <div>
              <span className="text-xs font-semibold text-white block">
                {isAr ? "شهادات تدريب سلامة الغذاء (EFST) لمتداولي الأغذية" : "Essential Food Safety Training (EFST) Records"}
              </span>
              <span className="text-[11px] text-slate-400">
                {isAr ? "إلزامية لكافة العاملين في إعداد وتداول الأغذية بأبوظبي" : "Mandatory for all food handlers under ADAFSA regulations"}
              </span>
            </div>
            <button
              onClick={() => setShowAddEfst(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.compliance.recordEfst}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(!data?.efstTrainings || data.efstTrainings.length === 0) ? (
              <div className="col-span-full py-12 bg-[#141720] border border-[#1e2433] rounded-3xl text-center text-slate-400 text-xs">
                {isAr ? "لا توجد شهادات تدريب مسجلة بعد. استخدم زر توثيق شهادة EFST لإضافة أول سجل." : "No training certificates recorded yet. Use the Record EFST Certificate button."}
              </div>
            ) : (
              data.efstTrainings.map((tr: FoodHandlerTraining) => (
                <div
                  key={tr.id}
                  className="p-5 bg-[#141720] border border-[#1e2433] rounded-3xl shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                        {tr.program}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        tr.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : tr.status === "EXPIRED"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {tr.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      {isAr ? tr.employee.nameAr : tr.employee.nameEn}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {tr.employee.jobTitle} • {tr.employee.employeeCode}
                    </p>

                    <div className="p-3 bg-[#0c0e12] rounded-xl border border-[#1e2433] mt-3 space-y-1 text-[11px] text-slate-400">
                      <div>
                        <strong className="text-slate-300">{isAr ? "رقم الشهادة:" : "Certificate #:"}</strong>{" "}
                        {tr.certificateNumber || "—"}
                      </div>
                      <div>
                        <strong className="text-slate-300">{isAr ? "المركز المعتمد:" : "Provider:"}</strong>{" "}
                        {tr.provider || "ADAFSA Approved Center"}
                      </div>
                      <div>
                        <strong className="text-slate-300">{isAr ? "تاريخ الإصدار:" : "Issued:"}</strong>{" "}
                        {new Date(tr.trainingDate).toLocaleDateString(locale)}
                      </div>
                      {tr.expiryDate && (
                        <div>
                          <strong className="text-slate-300">{isAr ? "تاريخ الانتهاء:" : "Expires:"}</strong>{" "}
                          {new Date(tr.expiryDate).toLocaleDateString(locale)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1e2433] flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {tr.branch ? (isAr ? tr.branch.nameAr : tr.branch.nameEn) : ""}
                    </span>
                    {tr.certificateDocumentId && (
                      <button
                        onClick={() =>
                          setPdfModal({
                            open: true,
                            docId: tr.certificateDocumentId!,
                            title: `EFST Certificate: ${isAr ? tr.employee.nameAr : tr.employee.nameEn}`,
                          })
                        }
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-rose-400" />
                        <span>{t.compliance.viewCertificatePdf}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Food Safety & Temperature Logs */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#141720] p-4 rounded-2xl border border-[#1e2433]">
            <div>
              <span className="text-xs font-semibold text-white block">
                {isAr ? "سجلات درجات حرارة التبريد والتجميد والرقابة اليومية" : "Daily Temperature & Operational Quality Logs"}
              </span>
              <span className="text-[11px] text-slate-400">
                {isAr ? "اشتراطات أدافسيا: التبريد <= 4°م، التجميد <= -18°م، الحفظ الساخن >= 60°م" : "ADAFSA limits: Chilling <= 4°C, Freezing <= -18°C, Hot Holding >= 60°C"}
              </span>
            </div>
            <button
              onClick={() => setShowAddLog(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.compliance.logTempCheck}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {(!data?.foodSafetyLogs || data.foodSafetyLogs.length === 0) ? (
              <div className="py-12 bg-[#141720] border border-[#1e2433] rounded-3xl text-center text-slate-400 text-xs">
                {isAr ? "لا توجد سجلات درجات حرارة مسجلة بعد." : "No temperature or operational checks logged yet."}
              </div>
            ) : (
              data.foodSafetyLogs.map((log: FoodSafetyLog) => (
                <div
                  key={log.id}
                  className="p-4 bg-[#141720] border border-[#1e2433] rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                    <div className={`p-2 rounded-xl ${log.isCompliant ? "bg-emerald-600/20 text-emerald-400" : "bg-rose-600/20 text-rose-400"}`}>
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className="text-xs font-bold text-white">
                          {log.controlPoint}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({log.parameter})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(log.recordedAt).toLocaleString(locale)} • {isAr ? "بواسطة:" : "By:"} {log.recordedBy}
                        {log.branch && ` • ${isAr ? log.branch.nameAr : log.branch.nameEn}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-end">
                    <div className="text-sm font-bold font-mono text-white">
                      {log.measuredValue}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      log.isCompliant ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}>
                      {log.isCompliant ? "PASS" : "DEVIATION"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Traceability & Recall */}
      {activeTab === "traceability" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#141720] p-4 rounded-2xl border border-[#1e2433]">
            <div>
              <span className="text-xs font-semibold text-white block">
                {isAr ? "نظام تتبع الأغذية وسجلات التشغيلات واستدعاء المنتجات" : "Food Traceability & Batch Recall Architecture"}
              </span>
              <span className="text-[11px] text-slate-400">
                {isAr ? "نظام رقم (1) لسنة 2008 بشأن تتبع واسترداد الغذاء" : "Regulation No. 1/2008 concerning Traceability and Recall"}
              </span>
            </div>
            <button
              onClick={() => setShowAddTraceability(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.compliance.recordTraceability}</span>
            </button>
          </div>

          <div className="space-y-3">
            {(!data?.traceabilityRecords || data.traceabilityRecords.length === 0) ? (
              <div className="py-12 bg-[#141720] border border-[#1e2433] rounded-3xl text-center text-slate-400 text-xs">
                {isAr ? "لا توجد دفعات تتبع مسجلة بعد." : "No traceability batches recorded yet."}
              </div>
            ) : (
              data.traceabilityRecords.map((rec: TraceabilityRecord) => (
                <div
                  key={rec.id}
                  className="p-4 bg-[#141720] border border-[#1e2433] rounded-2xl flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-xs font-bold text-white">
                        {rec.productName}
                      </span>
                      <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                        Lot #{rec.batchLotNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {isAr ? "المورد:" : "Supplier:"} {rec.supplierName} • {isAr ? "الاستلام:" : "Received:"}{" "}
                      {new Date(rec.receivedDate).toLocaleDateString(locale)}
                      {rec.storageLocation && ` • ${rec.storageLocation}`}
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="text-[11px] font-mono font-bold text-white block">
                      {rec.quantityReceived ? `${rec.quantityReceived} units` : "—"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {rec.recallStatus === "NONE" ? "Normal" : rec.recallStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Documents */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="bg-[#141720] p-4 rounded-2xl border border-[#1e2433]">
            <span className="text-xs font-semibold text-white block">
              {isAr ? "وثائق وتراخيص الامتثال المنتهية والقريبة من الانتهاء" : "Expiring & Expired Regulatory Documents"}
            </span>
          </div>

          <div className="space-y-2.5">
            {(!data?.expiringDocuments || data.expiringDocuments.length === 0) ? (
              <div className="py-12 bg-[#141720] border border-[#1e2433] rounded-3xl text-center text-slate-400 text-xs">
                {isAr ? "لا توجد رخص أو وثائق منتهية حالياً." : "No expired or urgent documents."}
              </div>
            ) : (
              data.expiringDocuments.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-4 bg-[#141720] border border-[#1e2433] rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <FileWarning className="w-5 h-5 text-rose-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {doc.title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {doc.documentType ? (isAr ? doc.documentType.nameAr : doc.documentType.nameEn) : ""} • Ref: {doc.referenceNumber || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="text-xs font-mono font-bold text-rose-400 block">
                      {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString(locale) : ""}
                    </span>
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold">
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD INSPECTION MODAL                                             */}
      {/* ========================================================================= */}
      {showAddInspection && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <ShieldCheck className="w-5 h-5 text-rose-400" />
                <span>{isAr ? "تسجيل تفتيش رسمي (أدافسيا)" : "Record Official Inspection (ADAFSA)"}</span>
              </h3>
              <button onClick={() => setShowAddInspection(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                const payload = {
                  authority: fd.get("authority") as string,
                  inspectionType: fd.get("inspectionType") as string,
                  referenceNumber: fd.get("referenceNumber") as string,
                  branchId: fd.get("branchId") as string,
                  inspectorName: fd.get("inspectorName") as string,
                  overallResult: fd.get("overallResult") as string,
                  inspectionDate: fd.get("inspectionDate") as string,
                  notes: fd.get("notes") as string,
                  authorizationPassword: fd.get("authorizationPassword") as string,
                };

                fetch("/api/compliance/inspections", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                })
                  .then((r) => r.json())
                  .then((res) => {
                    if (res.error) alert(res.error);
                    else {
                      setShowAddInspection(false);
                      fetchComplianceData();
                    }
                  });
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "الجهة الرقابية" : "Authority"}</label>
                  <select name="authority" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white">
                    <option value="ADAFSA">ADAFSA (أدافسيا)</option>
                    <option value="CIVIL_DEFENSE">Civil Defense (الدفاع المدني)</option>
                    <option value="INTERNAL_AUDIT">Internal Audit (تفتيش داخلي)</option>
                    <option value="THIRD_PARTY">Third Party (جهة خارجية)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "الفرع" : "Branch"}</label>
                  <select name="branchId" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white">
                    <option value="">{isAr ? "المنشأة العامة / كافة الفروع" : "General / All Branches"}</option>
                    {data?.branches?.map((b: any) => (
                      <option key={b.id} value={b.id}>{isAr ? b.nameAr : b.nameEn}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "رقم إشعار / محضر التفتيش" : "Inspection Notice #"}</label>
                  <input name="referenceNumber" placeholder="مثال: ADAFSA-2026-9812" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "اسم المفتش" : "Inspector Name"}</label>
                  <input name="inspectorName" placeholder="اسم المفتش الرسمي" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "النتيجة الإجمالية" : "Overall Result"}</label>
                  <select name="overallResult" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white">
                    <option value="SATISFACTORY">Satisfactory (مطابق للمعايير)</option>
                    <option value="NEEDS_ACTION">Needs Action (يتطلب إجراءات تصحيحية)</option>
                    <option value="CRITICAL_ISSUES">Critical Issues (ملاحظات حرجة)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "تاريخ الزيارة" : "Inspection Date"}</label>
                  <input type="date" name="inspectionDate" defaultValue={new Date().toISOString().split("T")[0]} className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">{isAr ? "ملاحظات وتوصيات التقرير" : "Report Notes"}</label>
                <textarea name="notes" rows={2} placeholder="تفاصيل الملاحظات المسجلة..." className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-1.5">
                <label className="text-xs font-semibold text-rose-300 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isAr ? "كلمة مرور التفويض (مستوى الحماية 2)" : "Level-2 Authorization Password"}</span>
                </label>
                <input
                  type="password"
                  name="authorizationPassword"
                  required
                  placeholder="Owner Authorization Password"
                  className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddInspection(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl"
                >
                  {isAr ? "حفظ وتوثيق التفتيش" : "Save Inspection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD EFST TRAINING CERTIFICATE MODAL                              */}
      {/* ========================================================================= */}
      {showAddEfst && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Award className="w-5 h-5 text-amber-400" />
                <span>{isAr ? "توثيق شهادة تدريب متداول غذاء (EFST)" : "Document Food Handler EFST Certificate"}</span>
              </h3>
              <button onClick={() => setShowAddEfst(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);

                try {
                  const res = await fetch("/api/compliance/efst", {
                    method: "POST",
                    body: fd,
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || "Failed to record EFST");
                  setShowAddEfst(false);
                  fetchComplianceData();
                } catch (err: any) {
                  alert(err.message);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-slate-300 block mb-1">{isAr ? "الموظف المعني" : "Food Handler / Employee"}</label>
                <select name="employeeId" required className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white">
                  <option value="">{isAr ? "-- اختر الموظف --" : "-- Select Employee --"}</option>
                  {data?.organization && (
                    // fetch all employees from /api/employees or data
                    data?.branches?.flatMap((b: any) => b.employees || []).concat(data?.employees || [])
                  )}
                  {/* Fallback to select from active list */}
                  {data?.requirements && (
                    <option value="owner-id">Tariq Al Mansoori (Owner)</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "رقم الشهادة" : "Certificate #"}</label>
                  <input name="certificateNumber" required placeholder="EFST-AD-2026-XXXX" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "المركز المعتمد" : "Provider"}</label>
                  <input name="provider" defaultValue="ADAFSA Approved Center" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "تاريخ الإصدار" : "Issue Date"}</label>
                  <input type="date" name="trainingDate" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "تاريخ الانتهاء" : "Expiry Date"}</label>
                  <input type="date" name="expiryDate" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">{isAr ? "ملف الشهادة الرسمية (PDF إلزامي)" : "Official Certificate PDF"}</label>
                <input type="file" name="file" accept=".pdf,application/pdf" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-1.5">
                <label className="text-xs font-semibold text-rose-300 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isAr ? "كلمة مرور التفويض (مستوى الحماية 2)" : "Level-2 Authorization Password"}</span>
                </label>
                <input
                  type="password"
                  name="authorizationPassword"
                  required
                  placeholder="Owner Authorization Password"
                  className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEfst(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl"
                >
                  {isAr ? "حفظ وتوثيق الشهادة" : "Save Certificate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LOG FOOD SAFETY / TEMPERATURE CHECK MODAL                        */}
      {/* ========================================================================= */}
      {showAddLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Thermometer className="w-5 h-5 text-cyan-400" />
                <span>{isAr ? "تسجيل فحص درجات الحرارة / الجودة" : "Log Temperature / Operational QA"}</span>
              </h3>
              <button onClick={() => setShowAddLog(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                const payload = {
                  logType: fd.get("logType") as string,
                  controlPoint: fd.get("controlPoint") as string,
                  parameter: fd.get("parameter") as string,
                  measuredValue: fd.get("measuredValue") as string,
                  targetRange: fd.get("targetRange") as string,
                  isCompliant: fd.get("isCompliant") === "true",
                  notes: fd.get("notes") as string,
                };

                fetch("/api/compliance/logs", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                })
                  .then((r) => r.json())
                  .then((res) => {
                    if (res.error) alert(res.error);
                    else {
                      setShowAddLog(false);
                      fetchComplianceData();
                    }
                  });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-slate-300 block mb-1">{isAr ? "نوع الفحص" : "Log Type"}</label>
                <select name="logType" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white">
                  <option value="TEMPERATURE">{isAr ? "درجة حرارة (تبريد / تجميد / حفظ ساخن)" : "Temperature (Chiller / Freezer / Hot)"}</option>
                  <option value="SANITATION">{isAr ? "تركيز محاليل التعقيم (Sanitizer PPM)" : "Sanitizer Concentration (PPM)"}</option>
                  <option value="PEST_CONTROL">{isAr ? "مكافحة آفات وفحص الفخاخ" : "Pest Control Inspection"}</option>
                  <option value="RECEIVING">{isAr ? "فحص استلام شحنات الأغذية" : "Food Receiving Inspection"}</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">{isAr ? "نقطة التحكم / الجهاز" : "Control Point / Equipment"}</label>
                <input name="controlPoint" required placeholder="مثال: ثلاجة تحضير السلطات 1" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "المعيار" : "Parameter"}</label>
                  <input name="parameter" defaultValue="Core Temp (°C)" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "القيمة المقاسة" : "Measured Value"}</label>
                  <input name="measuredValue" required placeholder="مثال: 2.8 °C" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "النطاق المستهدف" : "Target Range"}</label>
                  <input name="targetRange" defaultValue="<= 4.0 °C" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">{isAr ? "الحالة" : "Compliance Result"}</label>
                  <select name="isCompliant" className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white">
                    <option value="true">PASS (مطابق)</option>
                    <option value="false">FAIL (انحراف ويتطلب تصحيح)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLog(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl"
                >
                  {isAr ? "حفظ القراءة" : "Record Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CLOSE CORRECTIVE ACTION MODAL (WITH AUTH PASSWORD)               */}
      {/* ========================================================================= */}
      {actionToClose && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>{isAr ? "إغلاق الإجراء التصحيحي رسمياً" : "Close Corrective Action"}</span>
              </h3>
              <button onClick={() => setActionToClose(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#0c0e12] rounded-xl border border-[#1e2433] space-y-1 text-xs">
              <div className="text-white font-bold">{actionToClose.title}</div>
              <div className="text-slate-400">{actionToClose.actionRequired}</div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const fd = new FormData(form);
                const payload = {
                  status: "CLOSED",
                  resolutionNotes: fd.get("resolutionNotes") as string,
                  authorizationPassword: fd.get("authorizationPassword") as string,
                };

                fetch(`/api/compliance/corrective-actions/${actionToClose.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                })
                  .then((r) => r.json())
                  .then((res) => {
                    if (res.error) alert(res.error);
                    else {
                      setActionToClose(null);
                      fetchComplianceData();
                    }
                  });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  {isAr ? "ملاحظات إثبات التصحيح والإغلاق" : "Resolution Evidence Notes"}
                </label>
                <textarea
                  name="resolutionNotes"
                  required
                  rows={3}
                  placeholder={isAr ? "صف بالتفصيل ما تم اتخاذه من إجراءات لتصحيح الملاحظة..." : "Describe actions taken to rectify the observation..."}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white"
                />
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-1.5">
                <label className="text-xs font-semibold text-rose-300 flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isAr ? "كلمة مرور التفويض (مستوى الحماية 2)" : "Level-2 Authorization Password"}</span>
                </label>
                <input
                  type="password"
                  name="authorizationPassword"
                  required
                  placeholder="Owner Authorization Password"
                  className="w-full bg-[#0c0e12] border border-[#1e2433] p-2 text-xs rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setActionToClose(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  {isAr ? "اعتماد وإغلاق الإجراء" : "Authorize & Close Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PDF VIEWER MODAL                                                          */}
      {/* ========================================================================= */}
      {pdfModal.open && (
        <PdfViewerModal
          isOpen={pdfModal.open}
          documentId={pdfModal.docId}
          documentTitle={pdfModal.title}
          onClose={() => setPdfModal({ open: false, docId: "", title: "" })}
        />
      )}

      {/* Level-2 Authorization Password Dialog */}
      <AuthorizationPasswordDialog
        isOpen={authDialog.open}
        title={authDialog.title}
        description={authDialog.description}
        actionName={authDialog.actionName}
        onConfirm={authDialog.onSuccess}
        onClose={() => setAuthDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
