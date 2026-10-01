"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { AuthorizationPasswordDialog } from "@/components/security/authorization-password-dialog";
import { PdfViewerModal } from "@/components/pdf/pdf-viewer-modal";
import {
  Building2,
  MapPin,
  Phone,
  Calendar,
  Clock,
  UserCheck,
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
  Layers,
  FileCheck,
  Edit2,
  ArrowRightLeft,
  Hash,
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

interface BranchData {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  type?: string;
  address: string | null;
  addressAr?: string | null;
  phone: string | null;
  email?: string | null;
  managerName: string | null;
  status: string;
  openingDate: string | null;
  closingDate?: string | null;
  openingHours: string | null;
  notes?: string | null;
  organization: {
    id: string;
    nameEn: string;
    nameAr: string;
    trn: string | null;
    licenseNumbers: string | null;
  };
  _count: {
    employees: number;
    documents: number;
    inventoryItems: number;
    procedures: number;
  };
}

interface BranchMetrics {
  totalDocuments: number;
  activeDocuments: number;
  expiringDocuments: number;
  expiredDocuments: number;
  activeEmployees: number;
  pendingProcedures: number;
}

export default function BranchDetailPage({
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
  const [branch, setBranch] = useState<BranchData | null>(null);
  const [metrics, setMetrics] = useState<BranchMetrics | null>(null);
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

  // Edit Branch Modal
  const [editBranchModalOpen, setEditBranchModalOpen] = useState(false);
  const [editBranchForm, setEditBranchForm] = useState({
    code: "",
    nameEn: "",
    nameAr: "",
    type: "RESTAURANT",
    phone: "",
    email: "",
    address: "",
    addressAr: "",
    managerName: "",
    status: "ACTIVE",
    openingDate: "",
    closingDate: "",
    openingHours: "",
    notes: "",
  });

  // Global Level-2 Authorization Password Dialog
  const [authDialog, setAuthDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionName: string;
    onSuccess: (pwd: string) => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    actionName: "",
    onSuccess: async () => {},
  });

  // Fetch Branch Details and Documents
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

      if (data.branch) {
        setEditBranchForm({
          code: data.branch.code || "",
          nameEn: data.branch.nameEn || "",
          nameAr: data.branch.nameAr || "",
          type: data.branch.type || "RESTAURANT",
          phone: data.branch.phone || "",
          email: data.branch.email || "",
          address: data.branch.address || "",
          addressAr: data.branch.addressAr || "",
          managerName: data.branch.managerName || "",
          status: data.branch.status || "ACTIVE",
          openingDate: data.branch.openingDate ? new Date(data.branch.openingDate).toISOString().split("T")[0] : "",
          closingDate: data.branch.closingDate ? new Date(data.branch.closingDate).toISOString().split("T")[0] : "",
          openingHours: data.branch.openingHours || "",
          notes: data.branch.notes || "",
        });
      }
    } catch (err: any) {
      console.error("Error fetching branch details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchData();
  }, [branchId]);

  // Handle Document Upload with Level-2 Authorization Password
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
      description: `${uploadForm.title.trim()} (${branch?.code})`,
      actionName: "UPLOAD_DOCUMENT",
      onSuccess: async (authorizationPassword: string) => {
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
          fd.append("authorizationPassword", authorizationPassword);

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

  // Trigger Document Replace with Authorization Password
  const triggerReplaceDocument = (doc: BranchDocument) => {
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

    // Require Level-2 Authorization Password
    setAuthDialog({
      open: true,
      title: t.branchDocs.replaceModalTitle,
      description: `${t.branchDocs.replaceModalDesc} (${docToReplace.title})`,
      actionName: "REPLACE_DOCUMENT_VERSION",
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

  // Handle Edit Branch with Level-2 Authorization Password
  const handleEditBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;

    setAuthDialog({
      open: true,
      title: t.branchDocs.editBranchTitle,
      description: `${t.branchDocs.editBranchDesc} (${branch.nameEn})`,
      actionName: "UPDATE_BRANCH_PROFILE",
      onSuccess: async (authorizationPassword: string) => {
        const res = await fetch(`/api/business/branches/${branch.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editBranchForm,
            authorizationPassword,
          }),
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "Failed to update branch");
        }

        setEditBranchModalOpen(false);
        await fetchBranchData();
      },
    });
  };

  // Preview Document inside web application
  const handlePreviewDoc = (doc: BranchDocument) => {
    setSelectedPdfDoc({
      id: doc.id,
      title: doc.title,
      currentVersionNumber: doc.currentVersion?.versionNumber || 1,
      expiryDate: doc.expiryDate,
    });
    setPdfModalOpen(true);
  };

  // Filter Documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery.trim() ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.referenceNumber &&
        doc.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "ALL" ||
      doc.documentType?.category === selectedCategory;

    const matchesStatus =
      selectedStatus === "ALL" || doc.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate days remaining helper
  const getExpiryDetails = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return { text: t.branchDocs.noExpiry, isExpired: false, isExpiring: false };
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `${t.branchDocs.expiredAgo} ${Math.abs(diffDays)} ${t.branchDocs.daysAgo}`,
        isExpired: true,
        isExpiring: false,
      };
    } else if (diffDays <= 30) {
      return {
        text: `${t.branchDocs.expiresIn} ${diffDays} ${t.branchDocs.daysRemaining}`,
        isExpired: false,
        isExpiring: true,
      };
    } else {
      return {
        text: `${t.branchDocs.expiresIn} ${diffDays} ${t.branchDocs.daysRemaining}`,
        isExpired: false,
        isExpiring: false,
      };
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
        <p className="text-sm font-medium">{t.common.loading}</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-[#141720] border border-rose-800/40 rounded-3xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center mx-auto text-rose-400">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">
          {locale === "ar" ? "تم رفض الوصول إلى هذا الفرع" : "Access Denied: Branch Scoped"}
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {locale === "ar"
            ? "حسابك مخصص لفرع محدد فقط وفق سياسات صلاحيات النظام (RBAC). ليس لديك ترخيص للوصول إلى هذا الفرع."
            : "Your account is restricted by Branch Scope authorization policy. You are not authorized to view or manage documents for this branch."}
        </p>
        <div className="pt-2">
          <Link
            href="/business"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 transition"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            {t.branchDocs.backToBusiness}
          </Link>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="p-12 text-center text-slate-400">
        <p className="text-sm">{t.common.noResults}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link
            href="/business"
            className="hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{t.branchDocs.backToBusiness}</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200 font-semibold">{branch.nameEn}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141720] border border-[#1e2433] rounded-3xl p-6 shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-rose-950/40 border border-rose-800/40 text-rose-400 font-bold">
                {branch.code}
              </span>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                  branch.status === "ACTIVE"
                    ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                    : branch.status === "ARCHIVED"
                    ? "bg-purple-950/50 text-purple-300 border-purple-800/50"
                    : "bg-slate-900 text-slate-400 border-slate-800"
                }`}
              >
                {branch.status === "ACTIVE"
                  ? t.branchDocs.activeStatus
                  : branch.status === "ARCHIVED"
                  ? (locale === "ar" ? "مؤرشف" : "Archived")
                  : t.branchDocs.inactiveStatus}
              </span>
              {branch.type && (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                  {branch.type}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>{locale === "ar" ? branch.nameAr || branch.nameEn : branch.nameEn}</span>
              {branch.nameAr && (
                <span className="text-base text-slate-400 font-normal">
                  ({locale === "ar" ? branch.nameEn : branch.nameAr})
                </span>
              )}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{locale === "ar" ? branch.addressAr || branch.address || "N/A" : branch.address || "N/A"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span dir="ltr">{branch.phone || "N/A"}</span>
              </div>
              {branch.email && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">{branch.email}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {t.branchDocs.manager}:{" "}
                  <strong className="text-slate-200">
                    {branch.managerName || t.branchDocs.unassigned}
                  </strong>
                </span>
              </div>
              {branch.openingHours && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{branch.openingHours}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/business/branches/${branch.id}/documents`}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/40 flex items-center gap-1.5 transition"
            >
              <FolderLock className="w-3.5 h-3.5 text-blue-400" />
              <span>{locale === "ar" ? "مستندات الفرع" : "Branch Documents"}</span>
            </Link>

            <button
              onClick={() => setEditBranchModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 border border-slate-700 transition shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{t.branchDocs.editBranch}</span>
            </button>

            <button
              onClick={() => {
                setUploadError(null);
                setUploadModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t.branchDocs.uploadDocument}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Summary KPI Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 bg-[#141720] border border-[#1e2433] rounded-2xl">
            <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1.5">
              <FolderLock className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.branchDocs.totalDocs}</span>
            </div>
            <div className="text-xl font-bold text-white">{metrics.totalDocuments}</div>
          </div>

          <div className="p-4 bg-[#141720] border border-[#1e2433] rounded-2xl">
            <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.branchDocs.activeDocs}</span>
            </div>
            <div className="text-xl font-bold text-emerald-400">{metrics.activeDocuments}</div>
          </div>

          <div className="p-4 bg-[#141720] border border-[#1e2433] rounded-2xl">
            <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.branchDocs.expiringDocs}</span>
            </div>
            <div className="text-xl font-bold text-amber-400">{metrics.expiringDocuments}</div>
          </div>

          <div className="p-4 bg-[#141720] border border-[#1e2433] rounded-2xl">
            <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.branchDocs.expiredDocs}</span>
            </div>
            <div className="text-xl font-bold text-rose-400">{metrics.expiredDocuments}</div>
          </div>

          <div className="p-4 bg-[#141720] border border-[#1e2433] rounded-2xl">
            <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>{t.branchDocs.activeEmployees}</span>
            </div>
            <div className="text-xl font-bold text-white">{metrics.activeEmployees}</div>
          </div>

          <div className="p-4 bg-[#141720] border border-[#1e2433] rounded-2xl">
            <div className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>{t.branchDocs.pendingProcedures}</span>
            </div>
            <div className="text-xl font-bold text-white">{metrics.pendingProcedures}</div>
          </div>
        </div>
      )}

      {/* 3. Branch Document Center */}
      <div className="space-y-4 bg-[#141720] border border-[#1e2433] rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e2433]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>{t.branchDocs.branchDocuments}</span>
              <span className="text-xs text-slate-400 font-mono font-normal">
                ({filteredDocuments.length})
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t.branchDocs.branchDocumentsSubtitle}
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.branchDocs.searchPlaceholder}
                className="w-full ps-9 pe-4 py-2 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">{t.branchDocs.allCategories}</option>
              <option value="Legal / Licenses">{t.branchDocs.categoryLegal}</option>
              <option value="Contracts">{t.branchDocs.categoryContracts}</option>
              <option value="Compliance">{t.branchDocs.categoryCompliance}</option>
              <option value="Other">{t.branchDocs.categoryOther}</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">{t.branchDocs.allStatuses}</option>
              <option value="ACTIVE">{t.branchDocs.activeDocs}</option>
              <option value="EXPIRING_SOON">{t.branchDocs.expiringDocs}</option>
              <option value="EXPIRED">{t.branchDocs.expiredDocs}</option>
            </select>
          </div>
        </div>

        {/* Document Cards List */}
        {filteredDocuments.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-xs">{t.branchDocs.noDocsFound}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocuments.map((doc) => {
              const expiryInfo = getExpiryDetails(doc.expiryDate);
              return (
                <div
                  key={doc.id}
                  className="p-5 bg-[#0c0e12] border border-[#1e2433] rounded-2xl space-y-3.5 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 text-rose-400 font-semibold border border-slate-800">
                          {locale === "ar"
                            ? doc.documentType?.nameAr || doc.documentType?.nameEn
                            : doc.documentType?.nameEn}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            doc.status === "ACTIVE"
                              ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                              : doc.status === "EXPIRING_SOON"
                              ? "bg-amber-950/40 text-amber-400 border-amber-800/40"
                              : "bg-rose-950/40 text-rose-400 border-rose-800/40"
                          }`}
                        >
                          {(doc.status === "EXPIRING_SOON" || doc.status === "EXPIRED") && (
                            <AlertTriangle className="w-2.5 h-2.5" />
                          )}
                          {tStatus(doc.status)}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          v{doc.currentVersion?.versionNumber || 1}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white truncate max-w-sm">
                        {doc.title}
                      </h3>

                      <div className="text-[11px] text-slate-400 font-mono flex flex-wrap items-center gap-3">
                        <span>Ref: {doc.referenceNumber || "N/A"}</span>
                        <span
                          className={`font-sans font-medium ${
                            expiryInfo.isExpired
                              ? "text-rose-400"
                              : expiryInfo.isExpiring
                              ? "text-amber-400"
                              : "text-slate-400"
                          }`}
                        >
                          {expiryInfo.text}
                        </span>
                      </div>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                      <FileText className="w-4 h-4 text-emerald-400" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1e2433] flex items-center justify-between text-xs text-slate-400">
                    <span className="truncate max-w-[200px]">
                      {t.branchDocs.uploadedBy}: <strong className="text-slate-300">{doc.createdBy || "System"}</strong>
                    </span>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePreviewDoc(doc)}
                        title={t.branchDocs.preview}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/50 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/40 flex items-center gap-1 transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{t.branchDocs.preview}</span>
                      </button>

                      <button
                        onClick={() => {
                          setHistoryDoc(doc);
                          setHistoryModalOpen(true);
                        }}
                        title={t.branchDocs.history}
                        className="p-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => triggerReplaceDocument(doc)}
                        title={t.branchDocs.replace}
                        className="p-1.5 rounded-lg text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-950/50 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={`/api/documents/${doc.id}/download`}
                        title={t.branchDocs.download}
                        className="p-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t.branchDocs.uploadModalTitle}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {branch.nameEn} ({branch.code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-400 text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  {t.branchDocs.docType} *
                </label>
                <select
                  required
                  value={uploadForm.documentTypeId}
                  onChange={(e) => setUploadForm({ ...uploadForm, documentTypeId: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">{t.branchDocs.selectDocType}</option>
                  {documentTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      [{dt.category}] {locale === "ar" ? dt.nameAr || dt.nameEn : dt.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  {t.branchDocs.docTitle} *
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder={t.branchDocs.docTitlePlaceholder}
                  className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {t.branchDocs.referenceNumber}
                  </label>
                  <input
                    type="text"
                    value={uploadForm.referenceNumber}
                    onChange={(e) => setUploadForm({ ...uploadForm, referenceNumber: e.target.value })}
                    placeholder={t.branchDocs.referencePlaceholder}
                    className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {t.branchDocs.expiryDate}
                  </label>
                  <input
                    type="date"
                    value={uploadForm.expiryDate}
                    onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  {t.branchDocs.pdfFile} *
                </label>
                <input
                  type="file"
                  required
                  accept="application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-950/60 file:text-emerald-400 hover:file:bg-emerald-900/60 cursor-pointer"
                />
                <p className="text-[10px] text-slate-500 mt-1">{t.branchDocs.pdfHint}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  {t.branchDocs.notes}
                </label>
                <textarea
                  rows={2}
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder={t.branchDocs.notesPlaceholder}
                  className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2433]">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.branchDocs.uploading}</span>
                    </>
                  ) : (
                    <span>{t.branchDocs.submitUpload}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace Document Modal */}
      {replaceModalOpen && docToReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-950/50 text-blue-400 border border-blue-800/40 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t.branchDocs.replaceModalTitle}
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-xs font-mono">
                    {docToReplace.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReplaceModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {replaceError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-400 text-xs">
                {replaceError}
              </div>
            )}

            <form onSubmit={handleReplaceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  {t.branchDocs.pdfFile} *
                </label>
                <input
                  type="file"
                  required
                  accept="application/pdf"
                  onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-950/60 file:text-blue-400 hover:file:bg-blue-900/60 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  {t.branchDocs.newExpiry}
                </label>
                <input
                  type="date"
                  value={replaceExpiryDate}
                  onChange={(e) => setReplaceExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  {t.branchDocs.versionNotes}
                </label>
                <textarea
                  rows={2}
                  value={replaceNotes}
                  onChange={(e) => setReplaceNotes(e.target.value)}
                  placeholder={t.branchDocs.versionNotesPlaceholder}
                  className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {locale === "ar"
                    ? "يتطلب استبدال هذا المستند إدخال كلمة مرور التفويض (Level-2) لضمان الأمان والتدقيق المشفر."
                    : "Replacing this document requires Level-2 Authorization Password to ensure cryptographic audit compliance."}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2433]">
                <button
                  type="button"
                  onClick={() => setReplaceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.branchDocs.submitReplace}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Drawer / Modal */}
      {historyModalOpen && historyDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-950/50 text-purple-400 border border-purple-800/40 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t.branchDocs.historyModalTitle}
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-sm font-mono">
                    {historyDoc.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {t.branchDocs.historyModalDesc}
            </p>

            <div className="space-y-3">
              {historyDoc.versions.map((v) => (
                <div
                  key={v.id}
                  className="p-4 bg-[#0c0e12] border border-[#1e2433] rounded-2xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
                        v{v.versionNumber}
                      </span>
                      {v.id === historyDoc.currentVersion?.id && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950/40 text-blue-400 border border-blue-800/40">
                          {t.branchDocs.currentVersion}
                        </span>
                      )}
                      <span className="text-xs text-slate-300 font-mono">
                        {v.originalFilename}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono">
                      {(v.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                    <div>
                      {t.branchDocs.uploadedBy}: <strong className="text-slate-300">{v.uploadedBy || "System"}</strong>
                    </div>
                    <div>
                      {t.branchDocs.uploadedAt}: {new Date(v.createdAt).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-GB")}
                    </div>
                  </div>

                  {v.notes && (
                    <div className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2 rounded-xl">
                      "{v.notes}"
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#1e2433] flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="truncate max-w-xs">
                      SHA: {v.sha256}
                    </span>
                    <span className="text-emerald-400 font-sans flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {t.branchDocs.cleanScan}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#1e2433]">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {editBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t.branchDocs.editBranchTitle}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{branch.code}</p>
                </div>
              </div>
              <button
                onClick={() => setEditBranchModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditBranchSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    English Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editBranchForm.nameEn}
                    onChange={(e) => setEditBranchForm({ ...editBranchForm, nameEn: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Arabic Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editBranchForm.nameAr}
                    onChange={(e) => setEditBranchForm({ ...editBranchForm, nameAr: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  {t.branchDocs.address}
                </label>
                <input
                  type="text"
                  value={editBranchForm.address}
                  onChange={(e) => setEditBranchForm({ ...editBranchForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {t.branchDocs.phone}
                  </label>
                  <input
                    type="text"
                    value={editBranchForm.phone}
                    onChange={(e) => setEditBranchForm({ ...editBranchForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {t.branchDocs.manager}
                  </label>
                  <input
                    type="text"
                    value={editBranchForm.managerName}
                    onChange={(e) => setEditBranchForm({ ...editBranchForm, managerName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {t.branchDocs.status}
                  </label>
                  <select
                    value={editBranchForm.status}
                    onChange={(e) => setEditBranchForm({ ...editBranchForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVE">{t.branchDocs.activeStatus}</option>
                    <option value="INACTIVE">{t.branchDocs.inactiveStatus}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {t.branchDocs.operatingHours}
                  </label>
                  <input
                    type="text"
                    value={editBranchForm.openingHours}
                    onChange={(e) => setEditBranchForm({ ...editBranchForm, openingHours: e.target.value })}
                    placeholder="08:00 AM - 12:00 AM"
                    className="w-full px-3.5 py-2 text-xs bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2433]">
                <button
                  type="button"
                  onClick={() => setEditBranchModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition"
                >
                  {t.security.nextEnterAuthPassword}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global In-Browser PDF Streaming Viewer Modal */}
      {pdfModalOpen && selectedPdfDoc && (
        <PdfViewerModal
          isOpen={pdfModalOpen}
          onClose={() => setPdfModalOpen(false)}
          documentId={selectedPdfDoc.id}
          documentTitle={selectedPdfDoc.title}
          versionNumber={selectedPdfDoc.currentVersionNumber}
          expiryDate={selectedPdfDoc.expiryDate}
        />
      )}

      {/* Global Level-2 Authorization Password Dialog */}
      <AuthorizationPasswordDialog
        isOpen={authDialog.open}
        onClose={() => setAuthDialog({ ...authDialog, open: false })}
        title={authDialog.title}
        description={authDialog.description}
        actionName={authDialog.actionName}
        onConfirm={authDialog.onSuccess}
      />
    </div>
  );
}
