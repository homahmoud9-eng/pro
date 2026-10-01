"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/context";
import { AuthorizationPasswordDialog } from "@/components/security/authorization-password-dialog";
import { PdfViewerModal } from "@/components/pdf/pdf-viewer-modal";
import {
  FileClock,
  FileWarning,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Building,
  User,
  Calendar,
  Layers,
  ArrowLeft,
  ArrowRight,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";

export default function ExpiringDocumentsPage() {
  const { t, locale, dir, formatDate } = useI18n();

  const [documents, setDocuments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, EXPIRING_SOON, EXPIRED
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedDocType, setSelectedDocType] = useState("ALL");
  const [search, setSearch] = useState("");

  // Viewer Modal
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);

  // Renew Modal
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [targetDoc, setTargetDoc] = useState<any>(null);
  const [renewFile, setRenewFile] = useState<File | null>(null);
  const [renewIssueDate, setRenewIssueDate] = useState("");
  const [renewExpiryDate, setRenewExpiryDate] = useState("");
  const [renewNotes, setRenewNotes] = useState("");
  const [renewReminderDays, setRenewReminderDays] = useState("90,30,7");

  // Two-Level Security Authorization
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<((authPassword: string) => Promise<void>) | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadExpiringDocs = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== "ALL") q.set("status", statusFilter);
      if (selectedBranch !== "ALL") q.set("branchId", selectedBranch);
      if (selectedDocType !== "ALL") q.set("documentTypeId", selectedDocType);
      if (search.trim()) q.set("search", search.trim());

      const res = await fetch(`/api/documents/expiring?${q.toString()}`);
      const data = await res.json();
      setDocuments(data.documents || []);
      setBranches(data.branches || []);
      setDocumentTypes(data.documentTypes || []);
    } catch (err: any) {
      console.error("Failed to load expiring documents:", err);
      showToast(locale === "ar" ? "فشل تحميل المستندات" : "Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpiringDocs();
  }, [statusFilter, selectedBranch, selectedDocType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadExpiringDocs();
  };

  const handleOpenRenew = (doc: any) => {
    setTargetDoc(doc);
    setRenewFile(null);
    setRenewIssueDate(doc.issueDate ? new Date(doc.issueDate).toISOString().split("T")[0] : "");
    // Default next expiry + 1 year
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setRenewExpiryDate(nextYear.toISOString().split("T")[0]);
    setRenewNotes(locale === "ar" ? `تجديد رسمي للمستند: ${doc.title}` : `Official renewal of: ${doc.title}`);
    setRenewReminderDays("90,30,7");
    setRenewModalOpen(true);
  };

  const handleConfirmRenewSubmit = () => {
    if (!renewFile) {
      showToast(locale === "ar" ? "يرجى إرفاق ملف التجديد الجديد" : "Please attach the renewal file", "error");
      return;
    }
    if (!renewExpiryDate) {
      showToast(locale === "ar" ? "يرجى تحديد تاريخ الانتهاء الجديد" : "Please set the new expiry date", "error");
      return;
    }

    setPendingAction(() => async (authPassword: string) => {
      const formData = new FormData();
      formData.append("file", renewFile);
      if (renewIssueDate) formData.append("issueDate", renewIssueDate);
      formData.append("expiryDate", renewExpiryDate);
      formData.append("notes", renewNotes);
      formData.append("reminderDays", renewReminderDays);
      formData.append("authorizationPassword", authPassword);

      const res = await fetch(`/api/documents/${targetDoc.id}/versions`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to renew document");

      setRenewModalOpen(false);
      setAuthDialogOpen(false);
      showToast(locale === "ar" ? "تم تجديد المستند وحفظ النسخة السابقة بنجاح" : "Document renewed and previous version archived successfully");
      await loadExpiringDocs();
    });
    setAuthDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-4 end-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-800 text-emerald-300"
              : "bg-rose-950/90 border-rose-800 text-rose-300"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141720] border border-[#1e2433] p-6 rounded-3xl">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <Link
            href="/documents"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            {dir === "rtl" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5 rtl:space-x-reverse">
              <FileClock className="w-6 h-6 text-amber-500" />
              <span>{locale === "ar" ? "المستندات المنتهية والقريبة من الانتهاء" : "Expiring & Expired Documents"}</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/40 text-amber-300">
                {documents.length}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {locale === "ar"
                ? "متابعة فورية للمستندات المطلوب تجديدها وفق اللوائح التنظيمية في دولة الإمارات"
                : "Continuous tracking of documents requiring renewal under UAE regulatory guidelines"}
            </p>
          </div>
        </div>

        <button
          onClick={loadExpiringDocs}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 rtl:space-x-reverse transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{locale === "ar" ? "تحديث القائمة" : "Refresh"}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#141720] border border-[#1e2433] p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center bg-[#0c0e12] p-1 rounded-xl border border-[#1e2433] w-full md:w-auto">
          {[
            { id: "ALL", labelAr: "الكل", labelEn: "All" },
            { id: "EXPIRING_SOON", labelAr: "قريب الانتهاء (90 يوم)", labelEn: "Expiring Soon" },
            { id: "EXPIRED", labelAr: "منتهي الصلاحية", labelEn: "Expired" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-1 md:flex-initial ${
                statusFilter === tab.id
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {locale === "ar" ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Dropdowns and Search */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">{locale === "ar" ? "جميع الفروع" : "All Branches"}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} - {locale === "ar" ? b.nameAr : b.nameEn}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value)}
            className="px-3 py-2 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">{locale === "ar" ? "جميع أنواع المستندات" : "All Document Types"}</option>
            {documentTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {locale === "ar" ? dt.nameAr : dt.nameEn}
              </option>
            ))}
          </select>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute start-3 top-3 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === "ar" ? "بحث بالموظف، المستند، الرقم..." : "Search employee, doc, ref..."}
              className="w-full ps-9 pe-3 py-2 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </form>
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="py-24 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
          <span className="text-xs font-semibold">{locale === "ar" ? "جاري تحميل المستندات..." : "Loading documents..."}</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center bg-[#141720] border border-[#1e2433] rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-800/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">
            {locale === "ar" ? "لا توجد مستندات تحتاج إلى إجراء حاليًا" : "No documents require action right now"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {locale === "ar" ? "جميع المستندات سارية ومطابقة للمتطلبات التنظيمية" : "All compliance documents are active and up to date"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const isExpired = doc.status === "EXPIRED" || (doc.daysRemaining !== null && doc.daysRemaining < 0);
            const isUrgent = doc.daysRemaining !== null && doc.daysRemaining >= 0 && doc.daysRemaining <= 30;

            return (
              <div
                key={doc.id}
                className={`p-5 rounded-3xl bg-[#141720] border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl flex flex-col justify-between ${
                  isExpired
                    ? "border-rose-900/50 bg-gradient-to-b from-rose-950/20 to-transparent"
                    : isUrgent
                    ? "border-amber-900/50 bg-gradient-to-b from-amber-950/20 to-transparent"
                    : "border-yellow-900/40 bg-gradient-to-b from-yellow-950/10 to-transparent"
                }`}
              >
                <div>
                  {/* Top Pill / Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse ${
                        isExpired
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : isUrgent
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? "bg-rose-500" : isUrgent ? "bg-amber-500 animate-pulse" : "bg-yellow-500"}`} />
                      <span>
                        {isExpired
                          ? locale === "ar"
                            ? `منتهي منذ ${Math.abs(doc.daysRemaining || 0)} يوم`
                            : `Expired ${Math.abs(doc.daysRemaining || 0)}d ago`
                          : locale === "ar"
                          ? `ينتهي خلال ${doc.daysRemaining} يوم`
                          : `Expires in ${doc.daysRemaining} days`}
                      </span>
                    </span>

                    {doc.branch && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                        {doc.branch.code}
                      </span>
                    )}
                  </div>

                  {/* Document Title */}
                  <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {locale === "ar" ? doc.documentType?.nameAr : doc.documentType?.nameEn}
                    {doc.referenceNumber && <span className="font-mono ms-1.5">({doc.referenceNumber})</span>}
                  </p>

                  {/* Related Employee Card if applicable */}
                  {doc.employee && (
                    <Link
                      href={`/employees/${doc.employee.id}`}
                      className="mt-3.5 p-2.5 rounded-2xl bg-[#0c0e12] border border-[#1e2433] hover:border-slate-700 flex items-center space-x-2.5 rtl:space-x-reverse transition group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs flex-shrink-0 overflow-hidden">
                        {doc.employee.photoUrl ? (
                          <img src={doc.employee.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate group-hover:text-rose-400 transition">
                          {locale === "ar" ? doc.employee.nameAr : doc.employee.nameEn}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {doc.employee.employeeCode} • {doc.employee.jobTitle}
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Dates Row */}
                  <div className="mt-4 pt-3 border-t border-[#1e2433] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">{locale === "ar" ? "تاريخ الإصدار:" : "Issue Date:"}</span>
                      <span className="font-mono text-slate-300">
                        {doc.issueDate ? formatDate(doc.issueDate) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{locale === "ar" ? "تاريخ الانتهاء:" : "Expiry Date:"}</span>
                      <span className={`font-mono font-semibold ${isExpired ? "text-rose-400" : "text-amber-400"}`}>
                        {doc.expiryDate ? formatDate(doc.expiryDate) : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-[#1e2433] flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setActiveDoc(doc);
                      setPdfViewerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-rose-400" />
                    <span>{locale === "ar" ? "عرض المستند" : "View"}</span>
                  </button>

                  <button
                    onClick={() => handleOpenRenew(doc)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-md shadow-amber-950/40"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{locale === "ar" ? "تجديد المستند" : "Renew"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Renew Document Modal */}
      {renewModalOpen && targetDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                  <RefreshCw className="w-5 h-5 text-amber-500" />
                  <span>{locale === "ar" ? "تجديد المستند الرسمي" : "Renew Official Document"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{targetDoc.title}</p>
              </div>
              <button
                onClick={() => setRenewModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* File Attachment */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {locale === "ar" ? "ملف التجديد الجديد (PDF, JPG, PNG, WEBP) *" : "New Renewal File (PDF, JPG, PNG, WEBP) *"}
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setRenewFile(e.target.files?.[0] || null)}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-slate-300 focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-slate-950"
                />
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {locale === "ar" ? "تاريخ الإصدار الجديد" : "New Issue Date"}
                  </label>
                  <input
                    type="date"
                    value={renewIssueDate}
                    onChange={(e) => setRenewIssueDate(e.target.value)}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {locale === "ar" ? "تاريخ الانتهاء الجديد *" : "New Expiry Date *"}
                  </label>
                  <input
                    type="date"
                    value={renewExpiryDate}
                    onChange={(e) => setRenewExpiryDate(e.target.value)}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Reminders Rule */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {locale === "ar" ? "تنبيهات ما قبل الانتهاء (أيام)" : "Early Renewal Alert Windows (Days)"}
                </label>
                <select
                  value={renewReminderDays}
                  onChange={(e) => setRenewReminderDays(e.target.value)}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none"
                >
                  <option value="90,30,7">90 {locale === "ar" ? "يوم" : "Days"} • 30 {locale === "ar" ? "يوم" : "Days"} • 7 {locale === "ar" ? "أيام" : "Days"}</option>
                  <option value="60,15">60 {locale === "ar" ? "يوم" : "Days"} • 15 {locale === "ar" ? "يوم" : "Days"}</option>
                  <option value="30,7">30 {locale === "ar" ? "يوم" : "Days"} • 7 {locale === "ar" ? "أيام" : "Days"}</option>
                  <option value="15">15 {locale === "ar" ? "يوم" : "Days"}</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {locale === "ar" ? "ملاحظات التجديد" : "Renewal Notes"}
                </label>
                <textarea
                  rows={2}
                  value={renewNotes}
                  onChange={(e) => setRenewNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-300 text-[11px] leading-relaxed">
                {locale === "ar"
                  ? "سيتم حفظ النسخة الحالية في الأرشيف غير القابل للتعديل وإنشاء نسخة جديدة محدثة مع تسجيل العملية في سجل التدقيق."
                  : "The current version will be safely archived in immutable history and the new updated version will become active."}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2">
              <button
                type="button"
                onClick={() => setRenewModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmRenewSubmit}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold transition shadow-lg shadow-amber-950/40"
              >
                {locale === "ar" ? "تأكيد التجديد وتوقيع أمني" : "Confirm Renewal & Authorize"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Browser PDF/Image Preview */}
      <PdfViewerModal
        isOpen={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        documentId={activeDoc?.id || ""}
        documentTitle={activeDoc?.title || ""}
        versionNumber={activeDoc?.currentVersion?.versionNumber || 1}
        expiryDate={activeDoc?.expiryDate ? formatDate(activeDoc.expiryDate) : undefined}
      />

      {/* Two-Level Authorization Dialog */}
      <AuthorizationPasswordDialog
        isOpen={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
        actionTitle={locale === "ar" ? "تأكيد تجديد المستند الرسمي" : "Authorize Document Renewal"}
        targetDescription={targetDoc ? `${targetDoc.title} (Level 2 Auth)` : ""}
        onConfirm={async (password) => {
          if (pendingAction) {
            await pendingAction(password);
          }
        }}
      />
    </div>
  );
}
