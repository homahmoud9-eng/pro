"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { AuthorizationPasswordDialog } from "@/components/security/authorization-password-dialog";
import { PdfViewerModal } from "@/components/pdf/pdf-viewer-modal";
import {
  FolderLock,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Eye,
  Download,
  History,
  RefreshCw,
  Plus,
  Search,
  Filter,
  CheckCircle,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Building2,
  MapPin,
  Phone,
  Calendar,
  Layers,
  ArrowRightLeft,
  FileCheck,
} from "lucide-react";

interface DocumentVersionItem {
  id: string;
  versionNumber: number;
  originalFilename: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  scanStatus: string;
  uploadedBy: string | null;
  notes: string | null;
  createdAt: string;
}

interface BranchDocument {
  id: string;
  title: string;
  referenceNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  status: string;
  isLegal: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  documentType: {
    id: string;
    nameEn: string;
    nameAr: string;
    category: string;
  };
  currentVersion: DocumentVersionItem | null;
  versions: DocumentVersionItem[];
}

export default function BranchDocumentsPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const resolvedParams = use(params);
  const branchId = resolvedParams.branchId;

  const router = useRouter();
  const { t, locale, tStatus } = useI18n();

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [branch, setBranch] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [documents, setDocuments] = useState<BranchDocument[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);

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
  const [docToReplace, setDocToReplace] = useState<BranchDocument | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceExpiryDate, setReplaceExpiryDate] = useState("");
  const [replaceNotes, setReplaceNotes] = useState("");
  const [replaceError, setReplaceError] = useState<string | null>(null);

  // Version History Drawer
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyDoc, setHistoryDoc] = useState<BranchDocument | null>(null);

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

  const fetchBranchData = async () => {
    try {
      setLoading(true);
      setAccessDenied(false);
      const res = await fetch(`/api/business/branches/${branchId}`);
      if (res.status === 403) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load branch");
      }
      const data = await res.json();
      setBranch(data.branch);
      setMetrics(data.metrics);
      setDocuments(data.documents);
      setDocumentTypes(data.documentTypes);
    } catch (err: any) {
      console.error("Error fetching branch documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchData();
  }, [branchId]);

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
      title: t.branchDocs.uploadModalTitle,
      description: uploadForm.title.trim(),
      onSuccess: async (authPassword: string) => {
        try {
          setUploading(true);
          const fd = new FormData();
          fd.append("file", uploadFile);
          fd.append("title", uploadForm.title.trim());
          fd.append("documentTypeId", uploadForm.documentTypeId);
          fd.append("entityType", "BRANCH");
          fd.append("entityId", branchId);
          fd.append("branchId", branchId);
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
          setUploadForm({
            documentTypeId: "",
            title: "",
            referenceNumber: "",
            issueDate: "",
            expiryDate: "",
            notes: "",
          });
          await fetchBranchData();
        } catch (err: any) {
          setUploadError(err.message || "Upload failed");
        } finally {
          setUploading(false);
        }
      },
    });
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
      title: t.branchDocs.replaceModalTitle,
      description: `${t.branchDocs.replaceModalDesc} (${docToReplace.title})`,
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
        await fetchBranchData();
      },
    });
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.referenceNumber &&
        doc.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "ALL" || doc.documentType.category === selectedCategory;

    const matchesStatus =
      selectedStatus === "ALL" || doc.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="w-9 h-9 animate-spin mx-auto mb-3 text-emerald-500" />
        <span className="text-sm font-semibold">{t.business.loading}</span>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-950/50 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">
          {locale === "ar" ? "تم رفض الوصول إلى المستندات" : "Document Access Denied"}
        </h2>
        <p className="text-sm text-slate-400">
          {locale === "ar"
            ? "أنت غير مصرح لك بعرض أو إدارة مستندات هذا الفرع وفقاً لنطاق التفويض المخصص لحسابك."
            : "You are not authorized to view or manage documents for this branch per your branch scope."}
        </p>
        <Link
          href="/business"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t.branchDocs.backToBusiness}</span>
        </Link>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="py-16 text-center text-slate-500">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <span>Branch not found</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-slate-400">
          <Link href="/business" className="hover:text-emerald-400 transition flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>{t.business.title}</span>
          </Link>
          <span>/</span>
          <Link href={`/business/branches/${branch.id}`} className="hover:text-emerald-400 transition font-bold text-slate-300">
            {locale === "ar" ? branch.nameAr || branch.nameEn : branch.nameEn}
          </Link>
          <span>/</span>
          <span className="text-emerald-400 font-semibold">{t.branchDocs.branchDocuments}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/business/branches/${branch.id}`}
            className="px-3.5 py-2 bg-[#141720] hover:bg-slate-800 border border-[#1e2433] text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            <span>{locale === "ar" ? "تفاصيل الفرع" : "Branch Details"}</span>
          </Link>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>{t.branchDocs.uploadDocument}</span>
          </button>
        </div>
      </div>

      {/* Branch Header Banner */}
      <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start space-x-4 rtl:space-x-reverse">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-950/50 flex-shrink-0">
            <FolderLock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {locale === "ar" ? branch.nameAr || branch.nameEn : branch.nameEn}
              </h1>
              <span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                {branch.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t.branchDocs.branchDocumentsSubtitle}
            </p>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 mt-3">
              {branch.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{locale === "ar" ? branch.addressAr || branch.address : branch.address}</span>
                </span>
              )}
              {branch.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{branch.phone}</span>
                </span>
              )}
              {branch.managerName && (
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <span>{t.business.branchManager}: {branch.managerName}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Pill Grid */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-[#0c0e12] p-3 rounded-2xl border border-[#1e2433]">
            <div className="text-lg font-bold text-white">{metrics?.totalDocuments || documents.length}</div>
            <div className="text-[10px] text-slate-400 font-medium">{t.branchDocs.totalDocs}</div>
          </div>
          <div className="bg-[#0c0e12] p-3 rounded-2xl border border-[#1e2433]">
            <div className="text-lg font-bold text-emerald-400">{metrics?.activeDocuments || 0}</div>
            <div className="text-[10px] text-slate-400 font-medium">{t.branchDocs.activeDocs}</div>
          </div>
          <div className="bg-[#0c0e12] p-3 rounded-2xl border border-[#1e2433]">
            <div className="text-lg font-bold text-amber-400">{metrics?.expiringDocuments || 0}</div>
            <div className="text-[10px] text-slate-400 font-medium">{t.branchDocs.expiringDocs}</div>
          </div>
          <div className="bg-[#0c0e12] p-3 rounded-2xl border border-[#1e2433]">
            <div className="text-lg font-bold text-rose-400">{metrics?.expiredDocuments || 0}</div>
            <div className="text-[10px] text-slate-400 font-medium">{t.branchDocs.expiredDocs}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#141720] border border-[#1e2433] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.branchDocs.searchPlaceholder}
            className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl ps-9 pe-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500"
          >
            <option value="ALL">{t.branchDocs.allStatuses}</option>
            <option value="ACTIVE">{t.business.active}</option>
            <option value="EXPIRING_SOON">{t.branchDocs.expiringDocs}</option>
            <option value="EXPIRED">{t.branchDocs.expiredDocs}</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <FolderLock className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-sm font-semibold">{t.branchDocs.noDocsFound}</p>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.branchDocs.uploadDocument}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="p-5 bg-[#141720] border border-[#1e2433] rounded-3xl space-y-4 hover:border-slate-700 transition shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 text-emerald-400 font-semibold border border-slate-800">
                      {locale === "ar" ? doc.documentType?.nameAr || doc.documentType?.nameEn : doc.documentType?.nameEn}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        doc.status === "ACTIVE"
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                          : doc.status === "EXPIRING_SOON"
                          ? "bg-amber-950/40 text-amber-400 border-amber-800/40"
                          : "bg-rose-950/40 text-rose-400 border-rose-800/40"
                      }`}
                    >
                      {tStatus(doc.status)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      v{doc.currentVersion?.versionNumber || 1}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white truncate max-w-md pt-1">
                    {doc.title}
                  </h3>

                  <div className="text-[11px] text-slate-400 font-mono flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                    <span>Ref: {doc.referenceNumber || "N/A"}</span>
                    {doc.expiryDate && (
                      <span className={doc.status === "EXPIRED" ? "text-rose-400 font-sans" : "text-amber-400 font-sans"}>
                        {t.pdfViewer.expires} {new Date(doc.expiryDate).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-GB")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-[#1e2433] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedPdfDoc(doc);
                      setPdfModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.branchDocs.preview}</span>
                  </button>

                  <button
                    onClick={() => {
                      setHistoryDoc(doc);
                      setHistoryModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>{t.branchDocs.history} ({doc.versions?.length || 1})</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setDocToReplace(doc);
                    setReplaceFile(null);
                    setReplaceExpiryDate(
                      doc.expiryDate ? new Date(doc.expiryDate).toISOString().split("T")[0] : ""
                    );
                    setReplaceNotes("");
                    setReplaceError(null);
                    setReplaceModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.branchDocs.replace}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>{t.branchDocs.uploadModalTitle}</span>
              </h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.branchDocs.docType} *</label>
                <select
                  value={uploadForm.documentTypeId}
                  onChange={(e) => setUploadForm({ ...uploadForm, documentTypeId: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  required
                >
                  <option value="">{t.branchDocs.selectDocType}</option>
                  {documentTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {locale === "ar" ? dt.nameAr || dt.nameEn : dt.nameEn} ({dt.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.branchDocs.docTitle} *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder={t.branchDocs.docTitlePlaceholder}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.branchDocs.referenceNumber}</label>
                <input
                  type="text"
                  value={uploadForm.referenceNumber}
                  onChange={(e) => setUploadForm({ ...uploadForm, referenceNumber: e.target.value })}
                  placeholder={t.branchDocs.referencePlaceholder}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{t.branchDocs.issueDate}</label>
                  <input
                    type="date"
                    value={uploadForm.issueDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, issueDate: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{t.branchDocs.expiryDate}</label>
                  <input
                    type="date"
                    value={uploadForm.expiryDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.branchDocs.pdfFile} *</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-slate-300 file:bg-slate-800 file:text-white file:border-0 file:rounded-lg file:px-2.5 file:py-1 file:text-xs file:me-2"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">{t.branchDocs.pdfHint}</p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.branchDocs.notes}</label>
                <textarea
                  rows={2}
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder={t.branchDocs.notesPlaceholder}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{t.branchDocs.submitUpload}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace Document Version Modal */}
      {replaceModalOpen && docToReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-400" />
                <span>{t.branchDocs.replaceModalTitle}</span>
              </h3>
              <button onClick={() => setReplaceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#0c0e12] p-3 rounded-xl border border-[#1e2433] text-xs">
              <div className="font-bold text-white">{docToReplace.title}</div>
              <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                Current Version: v{docToReplace.currentVersion?.versionNumber || 1} • Ref: {docToReplace.referenceNumber || "N/A"}
              </div>
            </div>

            {replaceError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{replaceError}</span>
              </div>
            )}

            <form onSubmit={handleReplaceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.branchDocs.pdfFile} (New Version) *</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-slate-300 file:bg-slate-800 file:text-white file:border-0 file:rounded-lg file:px-2.5 file:py-1 file:text-xs file:me-2"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.branchDocs.expiryDate}</label>
                <input
                  type="date"
                  value={replaceExpiryDate}
                  onChange={(e) => setReplaceExpiryDate(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.branchDocs.notes}</label>
                <textarea
                  rows={2}
                  value={replaceNotes}
                  onChange={(e) => setReplaceNotes(e.target.value)}
                  placeholder="Notes for this replacement version..."
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => setReplaceModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-950/40"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.auth.confirmAndExecute}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Drawer Modal */}
      {historyModalOpen && historyDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>{t.branchDocs.history}: {historyDoc.title}</span>
              </h3>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {historyDoc.versions?.map((ver) => (
                <div
                  key={ver.id}
                  className="p-4 bg-[#0c0e12] border border-[#1e2433] rounded-2xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                        v{ver.versionNumber}
                      </span>
                      <span>{ver.originalFilename}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(ver.createdAt).toLocaleString(locale === "ar" ? "ar-AE" : "en-GB")}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-4">
                    <span>Size: {(ver.sizeBytes / 1024).toFixed(1)} KB</span>
                    <span className="truncate max-w-[200px]" title={ver.sha256}>
                      SHA-256: {ver.sha256.substring(0, 16)}...
                    </span>
                  </div>

                  {ver.notes && (
                    <p className="text-[11px] text-slate-300 italic bg-[#141720] p-2 rounded-lg">
                      "{ver.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#1e2433] text-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
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

      {/* Authorization Password Dialog */}
      <AuthorizationPasswordDialog
        isOpen={authDialog.open}
        actionTitle={authDialog.title}
        targetDescription={authDialog.description}
        onConfirm={async (pwd) => {
          await authDialog.onSuccess(pwd);
          setAuthDialog({ ...authDialog, open: false });
        }}
        onCancel={() => setAuthDialog({ ...authDialog, open: false })}
      />
    </div>
  );
}
