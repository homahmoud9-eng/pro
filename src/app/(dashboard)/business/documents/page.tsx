"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { AuthorizationPasswordDialog } from "@/components/security/authorization-password-dialog";
import { PdfViewerModal } from "@/components/pdf/pdf-viewer-modal";
import {
  FolderLock,
  FileText,
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Eye,
  Download,
  History,
  RefreshCw,
  Plus,
  Search,
  CheckCircle,
  X,
  Loader2,
  ChevronLeft,
  Archive,
} from "lucide-react";

export default function BusinessDocumentsPage() {
  const router = useRouter();
  const { t, locale, tStatus } = useI18n();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // PDF Viewer Modal
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPdfDoc, setSelectedPdfDoc] = useState<any>(null);

  // Upload Document Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    documentTypeId: "",
    title: "",
    referenceNumber: "",
    issueDate: "",
    expiryDate: "",
    notes: "",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Replace Document Modal
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [docToReplace, setDocToReplace] = useState<any | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceExpiryDate, setReplaceExpiryDate] = useState("");
  const [replaceNotes, setReplaceNotes] = useState("");
  const [replaceError, setReplaceError] = useState<string | null>(null);

  // Version History Drawer
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyDoc, setHistoryDoc] = useState<any | null>(null);

  // Archive Confirmation Modal
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [docToArchive, setDocToArchive] = useState<any | null>(null);

  // Two-Level Security Authorization Dialog
  const [authDialog, setAuthDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onSuccess: (pwd: string) => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    onSuccess: async () => {},
  });

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/business");
      if (res.status === 401) {
        router.push("/login?redirect=/business/documents");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load business documents");
      }
      const d = await res.json();
      setData(d);
    } catch (err: any) {
      console.error("Error loading business documents:", err);
      showToast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenUpload = () => {
    setUploadForm({
      documentTypeId: "",
      title: "",
      referenceNumber: "",
      issueDate: "",
      expiryDate: "",
      notes: "",
    });
    setUploadFile(null);
    setUploadError(null);
    setUploadModalOpen(true);
  };

  const handleSelectDocType = (typeId: string) => {
    const dt = (data?.documentTypes || []).find((d: any) => d.id === typeId);
    setUploadForm((prev) => ({
      ...prev,
      documentTypeId: typeId,
      title: prev.title || (dt ? (locale === "ar" ? dt.nameAr : dt.nameEn) : ""),
    }));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!uploadFile) {
      setUploadError(
        locale === "ar"
          ? "يرجى تحديد ملف PDF للمستند القانوني."
          : "Please select an authentic PDF document file."
      );
      return;
    }

    if (!uploadFile.name.toLowerCase().endsWith(".pdf")) {
      setUploadError(
        locale === "ar"
          ? "يقبل النظام ملفات PDF الرسمية فقط."
          : "Only authentic PDF documents are supported."
      );
      return;
    }

    if (!uploadForm.documentTypeId || !uploadForm.title.trim()) {
      setUploadError(
        locale === "ar"
          ? "يرجى اختيار نوع المستند وإدخال العنوان."
          : "Please select a document type and enter a title."
      );
      return;
    }

    setAuthDialog({
      open: true,
      title: t.businessDocs.uploadModalTitle,
      description: uploadForm.title.trim(),
      onSuccess: async (authPassword: string) => {
        try {
          setUploading(true);
          const fd = new FormData();
          fd.append("file", uploadFile);
          fd.append("title", uploadForm.title.trim());
          fd.append("documentTypeId", uploadForm.documentTypeId);
          fd.append("entityType", "ORGANIZATION");
          fd.append("entityId", data.organization.id);
          if (uploadForm.referenceNumber.trim()) {
            fd.append("referenceNumber", uploadForm.referenceNumber.trim());
          }
          if (uploadForm.issueDate) {
            fd.append("issueDate", uploadForm.issueDate);
          }
          if (uploadForm.expiryDate) {
            fd.append("expiryDate", uploadForm.expiryDate);
          }
          if (uploadForm.notes.trim()) {
            fd.append("notes", uploadForm.notes.trim());
          }
          fd.append("authorizationPassword", authPassword);

          const res = await fetch("/api/documents", {
            method: "POST",
            body: fd,
          });

          const resJson = await res.json();
          if (!res.ok) {
            throw new Error(resJson.error || "Failed to upload document");
          }

          setUploadModalOpen(false);
          setUploadFile(null);
          showToast(t.businessDocs.uploadSuccess);
          await loadData();
        } catch (err: any) {
          setUploadError(err.message || "Upload failed");
        } finally {
          setUploading(false);
        }
      },
    });
  };

  const handleOpenReplace = (doc: any) => {
    setDocToReplace(doc);
    setReplaceFile(null);
    setReplaceExpiryDate(
      doc.expiryDate ? new Date(doc.expiryDate).toISOString().split("T")[0] : ""
    );
    setReplaceNotes("");
    setReplaceError(null);
    setReplaceModalOpen(true);
  };

  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docToReplace || !replaceFile) {
      setReplaceError(
        locale === "ar"
          ? "يرجى اختيار ملف PDF الجديد."
          : "Please select the replacement PDF file."
      );
      return;
    }

    setAuthDialog({
      open: true,
      title: t.businessDocs.replaceModalTitle,
      description: `${t.businessDocs.replaceModalDesc} (${docToReplace.title})`,
      onSuccess: async (authorizationPassword: string) => {
        const fd = new FormData();
        fd.append("file", replaceFile);
        if (replaceExpiryDate) {
          fd.append("expiryDate", replaceExpiryDate);
        }
        if (replaceNotes) {
          fd.append("notes", replaceNotes);
        }
        fd.append("authorizationPassword", authorizationPassword);

        const res = await fetch(`/api/documents/${docToReplace.id}/versions`, {
          method: "POST",
          body: fd,
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "Failed to replace document version");
        }

        setReplaceModalOpen(false);
        setDocToReplace(null);
        setReplaceFile(null);
        showToast(t.businessDocs.replaceSuccess);
        await loadData();
      },
    });
  };

  const handleOpenArchive = (doc: any) => {
    setDocToArchive(doc);
    setArchiveModalOpen(true);
  };

  const handleConfirmArchive = () => {
    if (!docToArchive) return;
    setAuthDialog({
      open: true,
      title: t.businessDocs.archiveConfirmTitle,
      description: docToArchive.title,
      onSuccess: async (authorizationPassword: string) => {
        const res = await fetch(`/api/documents/${docToArchive.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorizationPassword }),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Failed to archive document");
        setArchiveModalOpen(false);
        setDocToArchive(null);
        showToast(t.businessDocs.archiveSuccess);
        await loadData();
      },
    });
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="w-9 h-9 animate-spin mx-auto mb-3 text-rose-500" />
        <span className="text-sm font-semibold">{t.business.loading}</span>
      </div>
    );
  }

  const { organization, businessDocs = [], businessDocStats = { total: 0, active: 0, expiring: 0, expired: 0, archived: 0 }, documentTypes = [] } = data || {};

  const filteredDocuments = businessDocs.filter((doc: any) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.referenceNumber &&
        doc.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "ALL" || doc.documentType?.category === selectedCategory;

    const matchesStatus =
      selectedStatus === "ALL" || doc.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed top-4 end-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse transition-all animate-in fade-in duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-800 text-emerald-300"
              : "bg-rose-950/90 border-rose-800 text-rose-300"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Breadcrumb & Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-slate-400">
          <Link href="/business" className="hover:text-rose-400 transition flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>{t.business.title}</span>
          </Link>
          <span>/</span>
          <span className="text-rose-400 font-semibold">{t.businessDocs.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/business"
            className="px-3.5 py-2 bg-[#141720] hover:bg-slate-800 border border-[#1e2433] text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            <span>{locale === "ar" ? "العودة إلى المنشأة" : "Back to Business"}</span>
          </Link>
          <button
            onClick={handleOpenUpload}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-rose-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>{t.businessDocs.uploadDocument}</span>
          </button>
        </div>
      </div>

      {/* Business Header Banner */}
      <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start space-x-4 rtl:space-x-reverse">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-rose-950/50 flex-shrink-0">
            <FolderLock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {locale === "ar" ? organization?.nameAr || organization?.nameEn : organization?.nameEn}
              </h1>
              <span className="text-xs font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold">
                {organization?.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t.businessDocs.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 mt-3">
              {organization?.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{organization.address}</span>
                </span>
              )}
              {organization?.trn && (
                <span className="flex items-center gap-1.5 font-mono text-emerald-400">
                  <span>TRN: {organization.trn}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Pill Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-[#0c0e12] p-3 rounded-2xl border border-[#1e2433]">
            <div className="text-lg font-bold text-white">{businessDocStats.total}</div>
            <div className="text-[10px] text-slate-400 font-medium">{t.businessDocs.totalDocs}</div>
          </div>
          <div className="bg-[#0c0e12] p-3 rounded-2xl border border-[#1e2433]">
            <div className="text-lg font-bold text-emerald-400">{businessDocStats.active}</div>
            <div className="text-[10px] text-slate-400 font-medium">{t.businessDocs.activeDocs}</div>
          </div>
          <div className="bg-[#0c0e12] p-3 rounded-2xl border border-[#1e2433]">
            <div className="text-lg font-bold text-amber-400">{businessDocStats.expiring}</div>
            <div className="text-[10px] text-slate-400 font-medium">{t.businessDocs.expiringDocs}</div>
          </div>
          <div className="bg-[#0c0e12] p-3 rounded-2xl border border-[#1e2433]">
            <div className="text-lg font-bold text-rose-400">{businessDocStats.expired}</div>
            <div className="text-[10px] text-slate-400 font-medium">{t.businessDocs.expiredDocs}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#141720] border border-[#1e2433] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.businessDocs.searchPlaceholder}
            className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl ps-9 pe-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-rose-500"
          >
            <option value="ALL">{t.businessDocs.allStatuses}</option>
            <option value="ACTIVE">{t.businessDocs.activeDocs}</option>
            <option value="EXPIRING_SOON">{t.businessDocs.expiringDocs}</option>
            <option value="EXPIRED">{t.businessDocs.expiredDocs}</option>
          </select>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-rose-500"
          >
            <option value="ALL">{t.businessDocs.allCategories}</option>
            <option value="Business Legal">{t.businessDocs.categoryLegal}</option>
            <option value="Contracts">{t.businessDocs.categoryContracts}</option>
            <option value="Compliance">{t.businessDocs.categoryCompliance}</option>
            <option value="Tax">{t.businessDocs.categoryTax}</option>
            <option value="Other">{t.businessDocs.categoryOther}</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {businessDocs.length === 0 ? (
        <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-12 text-center text-slate-400 space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-[#0c0e12] border border-[#1e2433] text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <FolderLock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">{t.businessDocs.emptyTitle}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{t.businessDocs.emptyDesc}</p>
          </div>
          <button
            onClick={handleOpenUpload}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>{t.businessDocs.uploadFirstDocument}</span>
          </button>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-10 text-center text-slate-400 space-y-3 shadow-xl">
          <Search className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-xs font-semibold">{locale === "ar" ? "لا توجد مستندات تطابق معايير البحث والفلترة" : "No documents match search criteria"}</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("ALL");
              setSelectedStatus("ALL");
            }}
            className="px-4 py-1.5 bg-[#0c0e12] border border-[#1e2433] hover:border-slate-700 text-xs text-slate-300 rounded-xl"
          >
            {locale === "ar" ? "إعادة تعيين الفلاتر" : "Reset Filters"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc: any) => {
            const currentVer = doc.currentVersion;
            return (
              <div
                key={doc.id}
                className="p-5 bg-[#141720] border border-[#1e2433] rounded-3xl space-y-4 hover:border-rose-900/40 transition shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#0c0e12] text-rose-400 font-semibold border border-[#1e2433]">
                      {locale === "ar" ? doc.documentType?.nameAr || doc.documentType?.nameEn : doc.documentType?.nameEn}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          doc.status === "ACTIVE"
                            ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-400"
                            : doc.status === "EXPIRING_SOON"
                            ? "bg-amber-950/60 border-amber-800/60 text-amber-400"
                            : doc.status === "ARCHIVED"
                            ? "bg-purple-950/60 border-purple-800/60 text-purple-400"
                            : "bg-rose-950/60 border-rose-800/60 text-rose-400"
                        }`}
                      >
                        {tStatus(doc.status)}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 font-bold">
                        v{currentVer?.versionNumber || 1}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight line-clamp-1">
                      {doc.title}
                    </h4>
                    {doc.referenceNumber && (
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {doc.referenceNumber}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0c0e12] p-2.5 rounded-xl border border-[#1e2433]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t.businessDocs.issueDate}</span>
                      <span className="text-slate-300 font-medium font-mono">
                        {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB") : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">{t.businessDocs.expiryDate}</span>
                      <span className={`font-medium font-mono ${doc.status === "EXPIRED" ? "text-rose-400" : doc.status === "EXPIRING_SOON" ? "text-amber-400" : "text-emerald-400"}`}>
                        {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB") : (locale === "ar" ? "دائم" : "Perpetual")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>{t.businessDocs.uploadedBy}: {doc.createdBy || (locale === "ar" ? "المالك" : "Owner")}</span>
                    {currentVer?.sizeBytes && (
                      <span className="font-mono">{(currentVer.sizeBytes / 1024).toFixed(0)} KB</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1e2433] flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedPdfDoc(doc);
                      setPdfModalOpen(true);
                    }}
                    className="flex-1 py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.businessDocs.preview}</span>
                  </button>

                  <button
                    onClick={() => {
                      setHistoryDoc(doc);
                      setHistoryModalOpen(true);
                    }}
                    className="p-1.5 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] text-slate-300 rounded-xl transition"
                    title={t.businessDocs.history}
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={`/api/documents/${doc.id}/download`}
                    download
                    className="p-1.5 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] text-slate-300 rounded-xl transition"
                    title={t.businessDocs.download}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => handleOpenReplace(doc)}
                    className="p-1.5 bg-[#0c0e12] hover:bg-amber-950/40 border border-[#1e2433] hover:border-amber-800/50 text-amber-400 rounded-xl transition"
                    title={t.businessDocs.replace}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenArchive(doc)}
                    className="p-1.5 bg-[#0c0e12] hover:bg-purple-950/40 border border-[#1e2433] hover:border-purple-800/50 text-purple-400 rounded-xl transition"
                    title={t.businessDocs.archive}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-4">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center shadow-lg">
                  <FolderLock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t.businessDocs.uploadModalTitle}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{t.businessDocs.uploadModalDesc}</p>
                </div>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3.5 bg-rose-950/50 border border-rose-800/50 text-rose-300 rounded-2xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t.businessDocs.docType} <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={uploadForm.documentTypeId}
                  onChange={(e) => handleSelectDocType(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                >
                  <option value="">{t.businessDocs.selectDocType}</option>
                  {(documentTypes || []).map((dt: any) => (
                    <option key={dt.id} value={dt.id}>
                      [{dt.category}] {locale === "ar" ? dt.nameAr || dt.nameEn : dt.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t.businessDocs.docTitle} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder={t.businessDocs.docTitlePlaceholder}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t.businessDocs.referenceNumber}
                </label>
                <input
                  type="text"
                  value={uploadForm.referenceNumber}
                  onChange={(e) => setUploadForm({ ...uploadForm, referenceNumber: e.target.value })}
                  placeholder={t.businessDocs.referencePlaceholder}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.businessDocs.issueDate}
                  </label>
                  <input
                    type="date"
                    value={uploadForm.issueDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, issueDate: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.businessDocs.expiryDate}
                  </label>
                  <input
                    type="date"
                    value={uploadForm.expiryDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t.businessDocs.pdfFile} <span className="text-rose-500">*</span>
                </label>
                <div className="relative border-2 border-dashed border-[#1e2433] hover:border-rose-500/60 rounded-2xl p-4 text-center transition bg-[#0c0e12]/60">
                  <input
                    type="file"
                    required
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && !file.name.toLowerCase().endsWith(".pdf")) {
                        setUploadError(
                          locale === "ar"
                            ? "يقبل النظام ملفات PDF الرسمية فقط."
                            : "Only authentic PDF documents are supported."
                        );
                        setUploadFile(null);
                        return;
                      }
                      setUploadError(null);
                      setUploadFile(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1.5 pointer-events-none">
                    <FileText className="w-7 h-7 mx-auto text-rose-500" />
                    {uploadFile ? (
                      <div className="text-xs font-mono text-emerald-400">
                        {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-slate-300">
                          {locale === "ar" ? "اضغط لاختيار ملف PDF أو اسحبه إلى هنا" : "Click to select or drag & drop PDF file"}
                        </p>
                        <p className="text-[10px] text-slate-500">{t.businessDocs.pdfHint}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.businessDocs.notes}</label>
                <textarea
                  rows={2}
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder={t.businessDocs.notesPlaceholder}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold shadow-lg shadow-rose-950/40 flex items-center gap-1.5"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{t.businessDocs.uploadDocument}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace Modal */}
      {replaceModalOpen && docToReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-4">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-10 h-10 rounded-2xl bg-amber-950/60 border border-amber-800/40 text-amber-400 flex items-center justify-center shadow-lg">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t.businessDocs.replaceModalTitle}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{docToReplace.title}</p>
                </div>
              </div>
              <button
                onClick={() => setReplaceModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {replaceError && (
              <div className="p-3.5 bg-rose-950/50 border border-rose-800/50 text-rose-300 rounded-2xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{replaceError}</span>
              </div>
            )}

            <form onSubmit={handleReplaceSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-[#0c0e12] rounded-xl border border-[#1e2433] flex items-center justify-between">
                <span className="text-slate-400">{t.businessDocs.currentVersion}:</span>
                <span className="font-mono font-bold text-emerald-400">
                  v{docToReplace.currentVersion?.versionNumber || 1}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t.businessDocs.pdfFile} <span className="text-rose-500">*</span>
                </label>
                <div className="relative border-2 border-dashed border-[#1e2433] hover:border-amber-500/60 rounded-2xl p-4 text-center transition bg-[#0c0e12]/60">
                  <input
                    type="file"
                    required
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && !file.name.toLowerCase().endsWith(".pdf")) {
                        setReplaceError(
                          locale === "ar"
                            ? "يقبل النظام ملفات PDF الرسمية فقط."
                            : "Only authentic PDF documents are supported."
                        );
                        setReplaceFile(null);
                        return;
                      }
                      setReplaceError(null);
                      setReplaceFile(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1.5 pointer-events-none">
                    <Upload className="w-7 h-7 mx-auto text-amber-500" />
                    {replaceFile ? (
                      <div className="text-xs font-mono text-emerald-400">
                        {replaceFile.name} ({(replaceFile.size / 1024).toFixed(0)} KB)
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-slate-300">
                          {locale === "ar" ? "اضغط لاختيار ملف PDF البديل" : "Click to select replacement PDF file"}
                        </p>
                        <p className="text-[10px] text-slate-500">{t.businessDocs.pdfHint}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t.businessDocs.expiryDate}
                </label>
                <input
                  type="date"
                  value={replaceExpiryDate}
                  onChange={(e) => setReplaceExpiryDate(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.businessDocs.notes}</label>
                <textarea
                  rows={2}
                  value={replaceNotes}
                  onChange={(e) => setReplaceNotes(e.target.value)}
                  placeholder={locale === "ar" ? "سبب استبدال المستند وتحديث الإصدار..." : "Reason for replacing document..."}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => setReplaceModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold shadow-lg shadow-amber-950/40 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{t.businessDocs.replace}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && historyDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-4">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-10 h-10 rounded-2xl bg-teal-950/60 border border-teal-800/40 text-teal-400 flex items-center justify-center shadow-lg">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t.businessDocs.versionHistoryTitle}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{historyDoc.title}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pe-1">
              {(historyDoc.versions || []).map((ver: any, idx: number) => {
                const isCurrent = ver.id === historyDoc.currentVersionId;
                return (
                  <div
                    key={ver.id || idx}
                    className={`p-4 rounded-2xl border ${
                      isCurrent
                        ? "bg-slate-900/80 border-emerald-800/50 shadow-md"
                        : "bg-[#0c0e12] border-[#1e2433]"
                    } space-y-2`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">
                          v{ver.versionNumber}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                            {t.businessDocs.currentVersion}
                          </span>
                        )}
                      </div>
                      <a
                        href={`/api/documents/${historyDoc.id}/download?versionId=${ver.id}`}
                        download
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Download className="w-3.5 h-3.5 text-rose-400" />
                        <span>{t.businessDocs.download}</span>
                      </a>
                    </div>

                    <div className="text-xs text-slate-300 font-mono break-all">
                      {ver.originalFilename}
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#1e2433]">
                      <span>{t.businessDocs.uploadedBy}: {ver.uploadedBy || (locale === "ar" ? "المالك" : "Owner")}</span>
                      <span>{new Date(ver.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}</span>
                    </div>

                    {ver.notes && (
                      <p className="text-[11px] text-slate-400 italic bg-[#141720] p-2 rounded-xl border border-[#1e2433]">
                        {ver.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#1e2433] flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {archiveModalOpen && docToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#141720] border border-purple-900/40 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800/40 text-purple-400 flex items-center justify-center mx-auto">
              <Archive className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">{t.businessDocs.archiveConfirmTitle}</h3>
              <p className="text-xs text-slate-400">{t.businessDocs.archiveConfirmDesc}</p>
              <p className="text-xs font-mono font-bold text-purple-300 pt-2">
                {docToArchive.title}
              </p>
            </div>
            <div className="pt-3 border-t border-[#1e2433] flex items-center justify-center gap-3">
              <button
                onClick={() => setArchiveModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleConfirmArchive}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-purple-950/40"
              >
                {t.businessDocs.archive}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfModalOpen && selectedPdfDoc && (
        <PdfViewerModal
          isOpen={pdfModalOpen}
          documentId={selectedPdfDoc.id}
          documentTitle={selectedPdfDoc.title}
          referenceNumber={selectedPdfDoc.referenceNumber}
          versionNumber={selectedPdfDoc.currentVersion?.versionNumber || 1}
          expiryDate={selectedPdfDoc.expiryDate}
          canDownload={true}
          onClose={() => setPdfModalOpen(false)}
        />
      )}

      {/* Two-Level Security Authorization Dialog */}
      <AuthorizationPasswordDialog
        isOpen={authDialog.open}
        actionTitle={authDialog.title}
        targetDescription={authDialog.description}
        onConfirm={async (pwd) => {
          await authDialog.onSuccess(pwd);
        }}
        onCancel={() => setAuthDialog({ ...authDialog, open: false })}
      />
    </div>
  );
}
