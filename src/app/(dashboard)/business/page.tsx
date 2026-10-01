"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { AuthorizationPasswordDialog } from "@/components/security/authorization-password-dialog";
import { PdfViewerModal } from "@/components/pdf/pdf-viewer-modal";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  Edit2,
  Eye,
  Calendar,
  Layers,
  CheckCircle,
  X,
  Loader2,
  ChevronRight,
  FolderLock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Archive,
  RefreshCw,
  Clock,
  UserCheck,
  Check,
} from "lucide-react";

export default function BusinessPage() {
  const router = useRouter();
  const { t, locale, tStatus } = useI18n();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter State for Branches
  const [branchSearch, setBranchSearch] = useState("");
  const [branchStatusFilter, setBranchStatusFilter] = useState("ACTIVE"); // Default Active
  const [branchTypeFilter, setBranchTypeFilter] = useState("ALL");

  // Edit Org Profile Modal
  const [editOrgModalOpen, setEditOrgModalOpen] = useState(false);
  const [editOrgForm, setEditOrgForm] = useState({
    nameEn: "",
    nameAr: "",
    phone: "",
    email: "",
    address: "",
  });

  // Add Branch Modal
  const [addBranchModalOpen, setAddBranchModalOpen] = useState(false);
  const [addBranchForm, setAddBranchForm] = useState({
    code: "",
    nameEn: "",
    nameAr: "",
    type: "RESTAURANT",
    status: "ACTIVE",
    address: "",
    addressAr: "",
    phone: "",
    email: "",
    managerName: "",
    openingDate: "",
    closingDate: "",
    openingHours: "",
    notes: "",
  });
  const [addBranchErrors, setAddBranchErrors] = useState<Record<string, string>>({});

  // Edit Branch Modal
  const [editBranchModalOpen, setEditBranchModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [editBranchForm, setEditBranchForm] = useState({
    code: "",
    nameEn: "",
    nameAr: "",
    type: "RESTAURANT",
    status: "ACTIVE",
    address: "",
    addressAr: "",
    phone: "",
    email: "",
    managerName: "",
    openingDate: "",
    closingDate: "",
    openingHours: "",
    notes: "",
  });
  const [editBranchErrors, setEditBranchErrors] = useState<Record<string, string>>({});

  // Archive / Reactivate Confirmation Modal
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [branchToArchive, setBranchToArchive] = useState<any>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  // Active Dropdown Menu on Branch Card
  const [openMenuBranchId, setOpenMenuBranchId] = useState<string | null>(null);

  // In-Browser PDF Preview
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);

  // Two-Level Security Authorization
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogTitle, setAuthDialogTitle] = useState("");
  const [authDialogDesc, setAuthDialogDesc] = useState("");
  const [pendingAction, setPendingAction] = useState<((authPassword: string) => Promise<void>) | null>(null);

  // Feedback Notification Banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/business");
      if (res.status === 401) {
        router.push("/login?redirect=/business");
        return;
      }
      const d = await res.json();
      if (!res.ok || !d || !d.organization) {
        throw new Error(d?.error || "Failed to load business data");
      }
      setData(d);
    } catch (err: any) {
      console.error("Failed to load business data:", err);
      setError(err?.message || "Failed to load business data");
      showToast(err?.message || "Failed to load business data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close card menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuBranchId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Helper to format localized branch type
  const formatBranchType = (type: string) => {
    switch (type) {
      case "RESTAURANT":
        return t.business.typeRestaurant;
      case "WATERFRONT":
        return t.business.typeWaterfront;
      case "PRODUCTION_KITCHEN":
        return t.business.typeProductionKitchen;
      case "CENTRAL_KITCHEN":
        return t.business.typeCentralKitchen;
      case "CATERING_KITCHEN":
        return t.business.typeCateringKitchen;
      case "WAREHOUSE":
        return t.business.typeWarehouse;
      case "OFFICE":
        return t.business.typeOffice;
      default:
        return t.business.typeOther;
    }
  };

  // Helper to format localized status
  const formatBranchStatus = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return t.business.active;
      case "INACTIVE":
        return t.business.inactive;
      case "ARCHIVED":
        return t.business.archived;
      case "UNDER_RENOVATION":
        return t.business.underRenovation;
      default:
        return status;
    }
  };

  // ----------------------------------------------------
  // Edit Org Profile
  // ----------------------------------------------------
  const handleOpenEditOrg = () => {
    if (!data?.organization) return;
    setEditOrgForm({
      nameEn: data.organization.nameEn,
      nameAr: data.organization.nameAr,
      phone: data.organization.phone || "",
      email: data.organization.email || "",
      address: data.organization.address || "",
    });
    setEditOrgModalOpen(true);
  };

  const handleConfirmEditOrg = () => {
    setAuthDialogTitle(t.business.editCompanyProfile);
    setAuthDialogDesc(locale === "ar" ? data.organization.nameAr : data.organization.nameEn);
    setPendingAction(() => async (authPassword: string) => {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editOrgForm, authorizationPassword: authPassword }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || t.common.error);
      setEditOrgModalOpen(false);
      setAuthDialogOpen(false);
      showToast(t.business.updateSuccess);
      await loadData();
    });
    setAuthDialogOpen(true);
  };

  // ----------------------------------------------------
  // Add Branch
  // ----------------------------------------------------
  const handleOpenAddBranch = () => {
    // Generate next branch code suggest e.g. BR-04
    const existingCodes = (data?.branches || []).map((b: any) => b.code);
    let nextNum = 1;
    while (existingCodes.includes(`BR-${String(nextNum).padStart(2, "0")}`)) {
      nextNum++;
    }
    const suggestedCode = `BR-${String(nextNum).padStart(2, "0")}`;

    setAddBranchForm({
      code: suggestedCode,
      nameEn: "",
      nameAr: "",
      type: "RESTAURANT",
      status: "ACTIVE",
      address: "",
      addressAr: "",
      phone: "+971 2 ",
      email: "",
      managerName: "",
      openingDate: new Date().toISOString().split("T")[0],
      closingDate: "",
      openingHours: "08:00 AM - 12:00 AM",
      notes: "",
    });
    setAddBranchErrors({});
    setAddBranchModalOpen(true);
  };

  const validateAddBranch = () => {
    const errors: Record<string, string> = {};
    if (!addBranchForm.nameEn.trim() || addBranchForm.nameEn.trim().length < 2) {
      errors.nameEn = locale === "ar" ? "اسم الفرع بالإنجليزية مطلوب (حرفان على الأقل)" : "English branch name is required (min 2 characters)";
    }
    if (!addBranchForm.nameAr.trim() || addBranchForm.nameAr.trim().length < 2) {
      errors.nameAr = locale === "ar" ? "اسم الفرع بالعربية مطلوب (حرفان على الأقل)" : "Arabic branch name is required (min 2 characters)";
    }
    if (!addBranchForm.code.trim() || addBranchForm.code.trim().length < 2) {
      errors.code = locale === "ar" ? "رمز الفرع مطلوب" : "Branch code is required";
    }
    if (addBranchForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addBranchForm.email.trim())) {
      errors.email = locale === "ar" ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format";
    }
    setAddBranchErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddBranch()) return;

    setAuthDialogTitle(t.business.createBranchTitle);
    setAuthDialogDesc(`${addBranchForm.nameEn.trim()} (${addBranchForm.code.trim().toUpperCase()})`);
    setPendingAction(() => async (authPassword: string) => {
      const res = await fetch("/api/business/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addBranchForm,
          code: addBranchForm.code.trim().toUpperCase(),
          authorizationPassword: authPassword,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to create branch");
      setAddBranchModalOpen(false);
      setAuthDialogOpen(false);
      showToast(t.business.createBranchSuccess);
      await loadData();
    });
    setAuthDialogOpen(true);
  };

  // ----------------------------------------------------
  // Edit Branch
  // ----------------------------------------------------
  const handleOpenEditBranch = (b: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedBranch(b);
    setEditBranchForm({
      code: b.code || "",
      nameEn: b.nameEn || "",
      nameAr: b.nameAr || "",
      type: b.type || "RESTAURANT",
      status: b.status || "ACTIVE",
      address: b.address || "",
      addressAr: b.addressAr || "",
      phone: b.phone || "",
      email: b.email || "",
      managerName: b.managerName || "",
      openingDate: b.openingDate ? new Date(b.openingDate).toISOString().split("T")[0] : "",
      closingDate: b.closingDate ? new Date(b.closingDate).toISOString().split("T")[0] : "",
      openingHours: b.openingHours || "",
      notes: b.notes || "",
    });
    setEditBranchErrors({});
    setOpenMenuBranchId(null);
    setEditBranchModalOpen(true);
  };

  const validateEditBranch = () => {
    const errors: Record<string, string> = {};
    if (!editBranchForm.nameEn.trim() || editBranchForm.nameEn.trim().length < 2) {
      errors.nameEn = locale === "ar" ? "اسم الفرع بالإنجليزية مطلوب" : "English branch name is required";
    }
    if (!editBranchForm.nameAr.trim() || editBranchForm.nameAr.trim().length < 2) {
      errors.nameAr = locale === "ar" ? "اسم الفرع بالعربية مطلوب" : "Arabic branch name is required";
    }
    if (!editBranchForm.code.trim()) {
      errors.code = locale === "ar" ? "رمز الفرع مطلوب" : "Branch code is required";
    }
    if (editBranchForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editBranchForm.email.trim())) {
      errors.email = locale === "ar" ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format";
    }
    setEditBranchErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitEditBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEditBranch() || !selectedBranch) return;

    setAuthDialogTitle(t.business.editBranchTitle);
    setAuthDialogDesc(`${editBranchForm.nameEn.trim()} (${editBranchForm.code.trim().toUpperCase()})`);
    setPendingAction(() => async (authPassword: string) => {
      const res = await fetch(`/api/business/branches/${selectedBranch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editBranchForm,
          code: editBranchForm.code.trim().toUpperCase(),
          authorizationPassword: authPassword,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update branch");
      setEditBranchModalOpen(false);
      setAuthDialogOpen(false);
      showToast(t.business.updateBranchSuccess);
      await loadData();
    });
    setAuthDialogOpen(true);
  };

  // ----------------------------------------------------
  // Archive / Reactivate Branch
  // ----------------------------------------------------
  const handleOpenArchiveBranch = (b: any, reactivate = false, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBranchToArchive(b);
    setIsReactivating(reactivate);
    setOpenMenuBranchId(null);
    setArchiveModalOpen(true);
  };

  const handleConfirmArchiveBranch = () => {
    if (!branchToArchive) return;
    const targetStatus = isReactivating ? "ACTIVE" : "ARCHIVED";

    setAuthDialogTitle(isReactivating ? t.business.reactivateBranchTitle : t.business.archiveBranchTitle);
    setAuthDialogDesc(`${branchToArchive.nameEn} (${branchToArchive.code})`);
    setPendingAction(() => async (authPassword: string) => {
      const res = await fetch(`/api/business/branches/${branchToArchive.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          authorizationPassword: authPassword,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to change branch status");
      setArchiveModalOpen(false);
      setAuthDialogOpen(false);
      showToast(isReactivating ? t.business.reactivateBranchSuccess : t.business.archiveBranchSuccess);
      await loadData();
    });
    setAuthDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="w-9 h-9 animate-spin mx-auto mb-3 text-rose-500" />
        <span className="text-sm font-semibold">{t.business.loading}</span>
      </div>
    );
  }

  if (error || !data || !data.organization) {
    return (
      <div className="p-8 bg-[#141720] border border-rose-900/40 rounded-3xl text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 text-rose-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white mb-1">
            {locale === "ar" ? "تعذر تحميل بيانات المنشأة" : "Failed to Load Business Data"}
          </h2>
          <p className="text-xs text-rose-400 font-mono break-words">
            {error || (locale === "ar" ? "البيانات غير متوفرة أو الجلسة غير مصرح بها" : "Business data not found or unauthorized session")}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => router.push("/login?redirect=/business")}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-2 rtl:space-x-reverse transition"
          >
            <span>{locale === "ar" ? "تسجيل الدخول" : "Login"}</span>
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-2 rtl:space-x-reverse transition shadow-lg shadow-rose-950/40"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{locale === "ar" ? "إعادة المحاولة" : "Retry"}</span>
          </button>
        </div>
      </div>
    );
  }

  const { organization, branches = [], departments = [], legalDocs = [], currentUser } = data;

  // Filter Branches by Search, Status, and Type
  const filteredBranches = branches.filter((b: any) => {
    // Status filter
    if (branchStatusFilter === "ACTIVE" && b.status !== "ACTIVE") return false;
    if (branchStatusFilter === "INACTIVE" && b.status !== "INACTIVE") return false;
    if (branchStatusFilter === "ARCHIVED" && b.status !== "ARCHIVED") return false;

    // Type filter
    if (branchTypeFilter !== "ALL" && b.type !== branchTypeFilter) return false;

    // Search query across name, code, address, manager
    if (branchSearch.trim()) {
      const q = branchSearch.toLowerCase();
      const matchNameEn = b.nameEn?.toLowerCase().includes(q);
      const matchNameAr = b.nameAr?.toLowerCase().includes(q);
      const matchCode = b.code?.toLowerCase().includes(q);
      const matchAddress = b.address?.toLowerCase().includes(q) || b.addressAr?.toLowerCase().includes(q);
      const matchManager = b.managerName?.toLowerCase().includes(q);
      if (!matchNameEn && !matchNameAr && !matchCode && !matchAddress && !matchManager) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-8">
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

      {/* Top Organization Header */}
      <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start space-x-4 rtl:space-x-reverse">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-rose-950/50 flex-shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {locale === "ar" ? organization?.nameAr || organization?.nameEn || "" : organization?.nameEn || organization?.nameAr || ""}
              </h1>
              <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-semibold">
                {organization?.code || ""}
              </span>
            </div>
            <p className="text-xs text-rose-400 font-semibold mt-0.5">
              {locale === "ar" ? organization?.nameEn || "" : organization?.nameAr || ""}
            </p>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 mt-3">
              <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{organization?.address || ""}, {organization?.emirate || ""}</span>
              </span>
              <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
                <Phone className="w-3.5 h-3.5 text-rose-400" />
                <span>{organization?.phone || ""}</span>
              </span>
              <span className="flex items-center space-x-1.5 rtl:space-x-reverse font-mono text-emerald-400">
                <span>TRN: {organization?.trn || ""}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenEditOrg}
          className="px-4 py-2.5 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse transition shadow-sm"
        >
          <Edit2 className="w-3.5 h-3.5 text-rose-400" />
          <span>{t.business.editProfile}</span>
        </button>
      </div>

      {/* ================================================== */}
      {/* Restaurant Branches Section */}
      {/* ================================================== */}
      <div className="space-y-4">
        {/* Header with Title and Add Branch Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
              <Building2 className="w-5 h-5 text-rose-500" />
              <span>{t.business.restaurantBranches} ({filteredBranches.length})</span>
            </h2>
            {branches.some((b: any) => b.status === "ARCHIVED") && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-950/40 border border-purple-800/40 text-purple-300">
                {branches.filter((b: any) => b.status === "ARCHIVED").length} {t.business.archived}
              </span>
            )}
          </div>

          {/* ADD BRANCH BUTTON (Permission-Enforced) */}
          {(currentUser?.canCreateBranch ?? true) && (
            <button
              id="add-branch-button"
              onClick={handleOpenAddBranch}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 rtl:space-x-reverse transition shadow-lg shadow-rose-950/40 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{t.business.addBranch}</span>
            </button>
          )}
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-[#141720] border border-[#1e2433] rounded-2xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              placeholder={t.business.searchBranches}
              className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl ps-9 pe-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
            />
          </div>

          {/* Filter Status & Type */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Tabs */}
            <div className="flex items-center bg-[#0c0e12] border border-[#1e2433] rounded-xl p-0.5 text-xs">
              {[
                { id: "ACTIVE", label: t.business.active },
                { id: "ALL", label: t.business.allStatuses },
                { id: "INACTIVE", label: t.business.inactive },
                { id: "ARCHIVED", label: t.business.archived },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setBranchStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    branchStatusFilter === st.id
                      ? "bg-rose-600/30 text-rose-300 font-bold border border-rose-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Type Dropdown */}
            <select
              value={branchTypeFilter}
              onChange={(e) => setBranchTypeFilter(e.target.value)}
              className="bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-rose-500"
            >
              <option value="ALL">{t.business.allTypes}</option>
              <option value="RESTAURANT">{t.business.typeRestaurant}</option>
              <option value="WATERFRONT">{t.business.typeWaterfront}</option>
              <option value="PRODUCTION_KITCHEN">{t.business.typeProductionKitchen}</option>
              <option value="CENTRAL_KITCHEN">{t.business.typeCentralKitchen}</option>
              <option value="CATERING_KITCHEN">{t.business.typeCateringKitchen}</option>
              <option value="WAREHOUSE">{t.business.typeWarehouse}</option>
              <option value="OFFICE">{t.business.typeOffice}</option>
              <option value="OTHER">{t.business.typeOther}</option>
            </select>
          </div>
        </div>

        {/* Branch Cards Grid */}
        {filteredBranches.length === 0 ? (
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-12 text-center text-slate-400 space-y-3">
            <Building2 className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-sm font-semibold">{t.business.noBranchesFound}</p>
            {(currentUser?.canCreateBranch ?? true) && (
              <button
                onClick={handleOpenAddBranch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition"
              >
                <Plus className="w-4 h-4" />
                <span>{t.business.addBranch}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBranches.map((b: any) => {
              const isArchived = b.status === "ARCHIVED";
              return (
                <div
                  key={b.id}
                  onClick={() => router.push(`/business/branches/${b.id}`)}
                  className={`group p-5 bg-[#141720] border rounded-3xl space-y-4 transition-all duration-200 cursor-pointer relative shadow-lg ${
                    isArchived
                      ? "border-purple-900/40 bg-[#12131c] opacity-85 hover:opacity-100 hover:border-purple-600/50"
                      : "border-[#1e2433] hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/20"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-950/40 border border-rose-800/40 text-rose-400 font-bold">
                          {b.code}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                          {formatBranchType(b.type)}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors pt-1">
                        {locale === "ar" ? b.nameAr || b.nameEn : b.nameEn}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {locale === "ar" ? b.nameEn : b.nameAr}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          b.status === "ACTIVE"
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                            : b.status === "ARCHIVED"
                            ? "bg-purple-950/50 text-purple-300 border-purple-800/50"
                            : "bg-slate-900 text-slate-400 border-slate-800"
                        }`}
                      >
                        {formatBranchStatus(b.status)}
                      </span>

                      {/* Three-Dot Actions Menu Button */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuBranchId(openMenuBranchId === b.id ? null : b.id)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuBranchId === b.id && (
                          <div className="absolute end-0 mt-1 w-44 bg-[#0c0e12] border border-[#1e2433] rounded-2xl shadow-2xl py-1.5 z-30 text-xs text-slate-300">
                            <button
                              onClick={() => {
                                setOpenMenuBranchId(null);
                                router.push(`/business/branches/${b.id}`);
                              }}
                              className="w-full text-start px-3.5 py-2 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{t.business.viewBranch}</span>
                            </button>

                            <button
                              onClick={() => {
                                setOpenMenuBranchId(null);
                                router.push(`/business/branches/${b.id}/documents`);
                              }}
                              className="w-full text-start px-3.5 py-2 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                            >
                              <FolderLock className="w-3.5 h-3.5 text-blue-400" />
                              <span>{t.business.branchDocuments}</span>
                            </button>

                            {(currentUser?.canEditBranch ?? true) && (
                              <button
                                onClick={(e) => handleOpenEditBranch(b, e)}
                                className="w-full text-start px-3.5 py-2 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                                <span>{t.business.editBranch}</span>
                              </button>
                            )}

                            {(currentUser?.canArchiveBranch ?? true) && (
                              <>
                                <div className="border-t border-[#1e2433] my-1" />
                                {isArchived ? (
                                  <button
                                    onClick={(e) => handleOpenArchiveBranch(b, true, e)}
                                    className="w-full text-start px-3.5 py-2 hover:bg-slate-800 text-emerald-400 flex items-center gap-2"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>{t.business.reactivateBranch}</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => handleOpenArchiveBranch(b, false, e)}
                                    className="w-full text-start px-3.5 py-2 hover:bg-slate-800 text-rose-400 flex items-center gap-2"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                    <span>{t.business.archiveBranch}</span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Details / Address & Phone */}
                  <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-[#1e2433]">
                    {b.address && (
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{locale === "ar" ? b.addressAr || b.address : b.address}</span>
                      </div>
                    )}
                    {b.phone && (
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                        <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>{b.phone}</span>
                      </div>
                    )}
                    {b.managerName && (
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-slate-300">
                        <UserCheck className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                        <span className="truncate">{t.business.branchManager}: {b.managerName}</span>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Database Statistics */}
                  <div className="pt-2 border-t border-[#1e2433] grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#0c0e12] p-2 rounded-xl">
                      <div className="font-bold text-white">{b._count?.employees || 0}</div>
                      <div className="text-[10px] text-slate-500">{t.business.staffCount}</div>
                    </div>
                    <div className="bg-[#0c0e12] p-2 rounded-xl">
                      <div className="font-bold text-emerald-400">{b.docStats?.total || b._count?.documents || 0}</div>
                      <div className="text-[10px] text-slate-500">{t.business.docsCount}</div>
                    </div>
                    <div className="bg-[#0c0e12] p-2 rounded-xl">
                      <div className="font-bold text-white">{b._count?.inventoryItems || 0}</div>
                      <div className="text-[10px] text-slate-500">{t.business.itemsCount}</div>
                    </div>
                  </div>

                  {/* Status Alerts if Expiring or Expired */}
                  {(b.docStats?.expiring > 0 || b.docStats?.expired > 0) && (
                    <div className="flex items-center gap-2 pt-1">
                      {b.docStats?.expired > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-950/50 text-rose-400 border border-rose-800/40 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {b.docStats.expired} {t.branchDocs.expiredDocs}
                        </span>
                      )}
                      {b.docStats?.expiring > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-800/40 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {b.docStats.expiring} {t.branchDocs.expiringDocs}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Bar at Bottom of Card */}
                  <div
                    className="pt-2 border-t border-[#1e2433] flex items-center justify-between text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={`/business/branches/${b.id}/documents`}
                      className="px-2.5 py-1 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/40 rounded-lg font-semibold flex items-center gap-1.5 transition text-[11px]"
                    >
                      <FolderLock className="w-3 h-3 text-blue-400" />
                      <span>{t.business.branchDocuments}</span>
                    </Link>

                    <div className="flex items-center gap-1">
                      {(currentUser?.canEditBranch ?? true) && (
                        <button
                          onClick={(e) => handleOpenEditBranch(b, e)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center gap-1 transition text-[11px]"
                          title={t.business.editBranch}
                        >
                          <Edit2 className="w-3 h-3 text-amber-400" />
                          <span>{t.business.editBranch}</span>
                        </button>
                      )}

                      <Link
                        href={`/business/branches/${b.id}`}
                        className="p-1 text-slate-400 hover:text-emerald-400 transition"
                        title={t.business.viewBranch}
                      >
                        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Official Legal Documents & Permits Checklist */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>{t.business.licensesAndPermits} ({legalDocs.length})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {legalDocs.map((doc: any) => (
            <div
              key={doc.id}
              className="p-5 bg-[#141720] border border-[#1e2433] rounded-3xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 text-rose-400 font-semibold border border-slate-800">
                    {locale === "ar" ? doc.documentType?.nameAr || doc.documentType?.nameEn : doc.documentType?.nameEn}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      doc.status === "ACTIVE"
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                        : "bg-rose-950/40 text-rose-400 border-rose-800/40"
                    }`}
                  >
                    {tStatus(doc.status)}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white truncate max-w-sm">
                  {doc.title}
                </h3>
                <div className="text-[11px] text-slate-400 font-mono">
                  Ref: {doc.referenceNumber || "N/A"}
                  {doc.expiryDate && (
                    <span className="ms-3 text-amber-400 font-sans">
                      {t.pdfViewer.expires} {new Date(doc.expiryDate).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-GB")}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveDoc(doc);
                  setPdfViewerOpen(true);
                }}
                className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition flex-shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t.business.previewPdf}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================== */}
      {/* ADD BRANCH MODAL                                   */}
      {/* ================================================== */}
      {addBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{t.business.createBranchTitle}</h3>
                  <p className="text-[11px] text-slate-400">{t.business.createBranchDesc}</p>
                </div>
              </div>
              <button onClick={() => setAddBranchModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddBranch} className="space-y-4 text-xs">
              {/* Section 1: Basic Information */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3 h-3" />
                  <span>{t.business.basicInformation}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchCode} *
                    </label>
                    <input
                      type="text"
                      value={addBranchForm.code}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. BR-04"
                      className={`w-full bg-[#0c0e12] border rounded-xl px-3 py-2 text-white font-mono outline-none uppercase ${
                        addBranchErrors.code ? "border-rose-500" : "border-[#1e2433] focus:border-rose-500"
                      }`}
                      required
                    />
                    {addBranchErrors.code && (
                      <p className="text-[10px] text-rose-400 mt-1">{addBranchErrors.code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchType} *
                    </label>
                    <select
                      value={addBranchForm.type}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, type: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                    >
                      <option value="RESTAURANT">{t.business.typeRestaurant}</option>
                      <option value="WATERFRONT">{t.business.typeWaterfront}</option>
                      <option value="PRODUCTION_KITCHEN">{t.business.typeProductionKitchen}</option>
                      <option value="CENTRAL_KITCHEN">{t.business.typeCentralKitchen}</option>
                      <option value="CATERING_KITCHEN">{t.business.typeCateringKitchen}</option>
                      <option value="WAREHOUSE">{t.business.typeWarehouse}</option>
                      <option value="OFFICE">{t.business.typeOffice}</option>
                      <option value="OTHER">{t.business.typeOther}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchStatus} *
                    </label>
                    <select
                      value={addBranchForm.status}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, status: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                    >
                      <option value="ACTIVE">{t.business.active}</option>
                      <option value="INACTIVE">{t.business.inactive}</option>
                      <option value="UNDER_RENOVATION">{t.business.underRenovation}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchNameEn} *
                    </label>
                    <input
                      type="text"
                      value={addBranchForm.nameEn}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, nameEn: e.target.value })}
                      placeholder="e.g. Al Maryah Island Flagship"
                      className={`w-full bg-[#0c0e12] border rounded-xl px-3 py-2 text-white outline-none ${
                        addBranchErrors.nameEn ? "border-rose-500" : "border-[#1e2433] focus:border-rose-500"
                      }`}
                      required
                    />
                    {addBranchErrors.nameEn && (
                      <p className="text-[10px] text-rose-400 mt-1">{addBranchErrors.nameEn}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchNameAr} *
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={addBranchForm.nameAr}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, nameAr: e.target.value })}
                      placeholder="مثال: فرع جزيرة المارية الرئيسي"
                      className={`w-full bg-[#0c0e12] border rounded-xl px-3 py-2 text-white outline-none ${
                        addBranchErrors.nameAr ? "border-rose-500" : "border-[#1e2433] focus:border-rose-500"
                      }`}
                      required
                    />
                    {addBranchErrors.nameAr && (
                      <p className="text-[10px] text-rose-400 mt-1">{addBranchErrors.nameAr}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Information & Location */}
              <div className="space-y-3 pt-2 border-t border-[#1e2433]">
                <h4 className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  <span>{t.business.contactInformation}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchAddress} (English)
                    </label>
                    <input
                      type="text"
                      value={addBranchForm.address}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, address: e.target.value })}
                      placeholder="e.g. The Galleria Mall, Level 1, Al Maryah Island"
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchAddressAr}
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={addBranchForm.addressAr}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, addressAr: e.target.value })}
                      placeholder="مثال: الغاليريا مول، الطابق الأول، جزيرة المارية"
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchPhone}
                    </label>
                    <input
                      type="text"
                      value={addBranchForm.phone}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, phone: e.target.value })}
                      placeholder="+971 2 642 9004"
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchEmail}
                    </label>
                    <input
                      type="email"
                      value={addBranchForm.email}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, email: e.target.value })}
                      placeholder="maryah@tasha.ae"
                      className={`w-full bg-[#0c0e12] border rounded-xl px-3 py-2 text-white outline-none ${
                        addBranchErrors.email ? "border-rose-500" : "border-[#1e2433] focus:border-rose-500"
                      }`}
                    />
                    {addBranchErrors.email && (
                      <p className="text-[10px] text-rose-400 mt-1">{addBranchErrors.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Management & Operating Schedule */}
              <div className="space-y-3 pt-2 border-t border-[#1e2433]">
                <h4 className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>{t.business.managementAndSchedule}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchManager}
                    </label>
                    <input
                      type="text"
                      value={addBranchForm.managerName}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, managerName: e.target.value })}
                      placeholder="e.g. Tariq Al Qasimi"
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.openingDate}
                    </label>
                    <input
                      type="date"
                      value={addBranchForm.openingDate}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, openingDate: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.operatingHours}
                    </label>
                    <input
                      type="text"
                      value={addBranchForm.openingHours}
                      onChange={(e) => setAddBranchForm({ ...addBranchForm, openingHours: e.target.value })}
                      placeholder="09:00 AM - 01:00 AM"
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.business.notes}
                  </label>
                  <textarea
                    rows={2}
                    value={addBranchForm.notes}
                    onChange={(e) => setAddBranchForm({ ...addBranchForm, notes: e.target.value })}
                    placeholder="e.g. Licensed by Abu Dhabi DED & ADAFSA compliant."
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => setAddBranchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/40 flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.business.addBranch}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* EDIT BRANCH MODAL                                  */}
      {/* ================================================== */}
      {editBranchModalOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{t.business.editBranchTitle}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedBranch.code} • {selectedBranch.nameEn}</p>
                </div>
              </div>
              <button onClick={() => setEditBranchModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditBranch} className="space-y-4 text-xs">
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3 h-3" />
                  <span>{t.business.basicInformation}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchCode} *
                    </label>
                    <input
                      type="text"
                      value={editBranchForm.code}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, code: e.target.value.toUpperCase() })}
                      className={`w-full bg-[#0c0e12] border rounded-xl px-3 py-2 text-white font-mono outline-none uppercase ${
                        editBranchErrors.code ? "border-rose-500" : "border-[#1e2433] focus:border-amber-500"
                      }`}
                      required
                    />
                    {editBranchErrors.code && (
                      <p className="text-[10px] text-rose-400 mt-1">{editBranchErrors.code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchType} *
                    </label>
                    <select
                      value={editBranchForm.type}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, type: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                    >
                      <option value="RESTAURANT">{t.business.typeRestaurant}</option>
                      <option value="WATERFRONT">{t.business.typeWaterfront}</option>
                      <option value="PRODUCTION_KITCHEN">{t.business.typeProductionKitchen}</option>
                      <option value="CENTRAL_KITCHEN">{t.business.typeCentralKitchen}</option>
                      <option value="CATERING_KITCHEN">{t.business.typeCateringKitchen}</option>
                      <option value="WAREHOUSE">{t.business.typeWarehouse}</option>
                      <option value="OFFICE">{t.business.typeOffice}</option>
                      <option value="OTHER">{t.business.typeOther}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchStatus} *
                    </label>
                    <select
                      value={editBranchForm.status}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, status: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                    >
                      <option value="ACTIVE">{t.business.active}</option>
                      <option value="INACTIVE">{t.business.inactive}</option>
                      <option value="ARCHIVED">{t.business.archived}</option>
                      <option value="UNDER_RENOVATION">{t.business.underRenovation}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchNameEn} *
                    </label>
                    <input
                      type="text"
                      value={editBranchForm.nameEn}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, nameEn: e.target.value })}
                      className={`w-full bg-[#0c0e12] border rounded-xl px-3 py-2 text-white outline-none ${
                        editBranchErrors.nameEn ? "border-rose-500" : "border-[#1e2433] focus:border-amber-500"
                      }`}
                      required
                    />
                    {editBranchErrors.nameEn && (
                      <p className="text-[10px] text-rose-400 mt-1">{editBranchErrors.nameEn}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchNameAr} *
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={editBranchForm.nameAr}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, nameAr: e.target.value })}
                      className={`w-full bg-[#0c0e12] border rounded-xl px-3 py-2 text-white outline-none ${
                        editBranchErrors.nameAr ? "border-rose-500" : "border-[#1e2433] focus:border-amber-500"
                      }`}
                      required
                    />
                    {editBranchErrors.nameAr && (
                      <p className="text-[10px] text-rose-400 mt-1">{editBranchErrors.nameAr}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Location and Contact */}
              <div className="space-y-3 pt-2 border-t border-[#1e2433]">
                <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  <span>{t.business.contactInformation}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchAddress} (English)
                    </label>
                    <input
                      type="text"
                      value={editBranchForm.address}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, address: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchAddressAr}
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={editBranchForm.addressAr}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, addressAr: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchPhone}
                    </label>
                    <input
                      type="text"
                      value={editBranchForm.phone}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, phone: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchEmail}
                    </label>
                    <input
                      type="email"
                      value={editBranchForm.email}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, email: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Management */}
              <div className="space-y-3 pt-2 border-t border-[#1e2433]">
                <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>{t.business.managementAndSchedule}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.branchManager}
                    </label>
                    <input
                      type="text"
                      value={editBranchForm.managerName}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, managerName: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.openingDate}
                    </label>
                    <input
                      type="date"
                      value={editBranchForm.openingDate}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, openingDate: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      {t.business.operatingHours}
                    </label>
                    <input
                      type="text"
                      value={editBranchForm.openingHours}
                      onChange={(e) => setEditBranchForm({ ...editBranchForm, openingHours: e.target.value })}
                      className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.business.notes}
                  </label>
                  <textarea
                    rows={2}
                    value={editBranchForm.notes}
                    onChange={(e) => setEditBranchForm({ ...editBranchForm, notes: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
                <button
                  type="button"
                  onClick={() => setEditBranchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center gap-1.5 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{t.auth.confirmAndExecute}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* ARCHIVE / REACTIVATE CONFIRMATION MODAL            */}
      {/* ================================================== */}
      {archiveModalOpen && branchToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isReactivating
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  }`}
                >
                  {isReactivating ? <RefreshCw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </div>
                <h3 className="text-sm font-bold text-white">
                  {isReactivating ? t.business.reactivateBranchTitle : t.business.archiveBranchTitle}
                </h3>
              </div>
              <button onClick={() => setArchiveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#0c0e12] rounded-2xl border border-[#1e2433] space-y-1">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="font-mono text-rose-400">{branchToArchive.code}</span>
                  <span>{locale === "ar" ? branchToArchive.nameAr : branchToArchive.nameEn}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {t.business.staffCount}: {branchToArchive._count?.employees || 0} • {t.business.docsCount}: {branchToArchive.docStats?.total || branchToArchive._count?.documents || 0}
                </div>
              </div>

              <p className="text-slate-300 leading-relaxed">
                {isReactivating ? t.business.reactivateBranchDesc : t.business.archiveBranchDesc}
              </p>

              <div className="p-3 bg-emerald-950/30 border border-emerald-800/30 rounded-xl text-emerald-300 text-[11px] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                <span>{t.business.historicalIntegrityNotice}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmArchiveBranch}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-1.5 ${
                  isReactivating
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40"
                    : "bg-purple-600 hover:bg-purple-500 shadow-purple-950/40"
                }`}
              >
                {isReactivating ? <RefreshCw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                <span>{t.auth.confirmAndExecute}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {editOrgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <h3 className="text-sm font-bold text-white">{t.business.editCompanyProfile}</h3>
              <button onClick={() => setEditOrgModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.business.companyNameEn}</label>
                <input
                  type="text"
                  value={editOrgForm.nameEn}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, nameEn: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.business.companyNameAr}</label>
                <input
                  type="text"
                  dir="rtl"
                  value={editOrgForm.nameAr}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, nameAr: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.business.officialPhone}</label>
                <input
                  type="text"
                  value={editOrgForm.phone}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, phone: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t.business.addressLocation}</label>
                <input
                  type="text"
                  value={editOrgForm.address}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, address: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setEditOrgModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleConfirmEditOrg}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40"
              >
                {t.auth.confirmAndExecute}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfViewerOpen && activeDoc && (
        <PdfViewerModal
          isOpen={pdfViewerOpen}
          documentId={activeDoc.id}
          documentTitle={activeDoc.title}
          referenceNumber={activeDoc.referenceNumber}
          versionNumber={activeDoc.currentVersion?.versionNumber || 1}
          expiryDate={activeDoc.expiryDate}
          canDownload={true}
          onClose={() => setPdfViewerOpen(false)}
        />
      )}

      {/* Level-2 Authorization Password Dialog */}
      <AuthorizationPasswordDialog
        isOpen={authDialogOpen}
        actionTitle={authDialogTitle}
        targetDescription={authDialogDesc}
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
