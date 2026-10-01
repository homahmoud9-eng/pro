"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { AuthorizationPasswordDialog } from "@/components/security/authorization-password-dialog";
import { PdfViewerModal } from "@/components/pdf/pdf-viewer-modal";
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit2,
  FileText,
  Calculator,
  Building,
  Loader2,
  Layers,
  X,
  CreditCard,
  Phone,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  User,
  Upload,
  Trash2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

export default function EmployeesPage() {
  const router = useRouter();
  const { t, locale, dir } = useI18n();

  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: default is responsive "cards" grid
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Add Employee Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [newEmp, setNewEmp] = useState({
    nameEn: "",
    nameAr: "",
    jobTitle: "",
    branchId: "",
    departmentId: "",
    basicSalary: 3500,
    housingAllowance: 1000,
    transportAllowance: 500,
    otherAllowances: 200,
    gender: "MALE",
    nationality: "Emirati",
    mobile: "+971 50 ",
    email: "",
    passportNumber: "N1234567",
    emiratesId: "784-1990-1234567-1",
  });

  // Edit Employee Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Employee Detail Drawer
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [empDetails, setEmpDetails] = useState<any>(null);

  // End of Service Modal
  const [eosModalOpen, setEosModalOpen] = useState(false);
  const [eosResult, setEosResult] = useState<any>(null);
  const [eosLoading, setEosLoading] = useState(false);

  // PDF Viewer
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);

  // Two-Level Security Authorization Dialog
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<((authPassword: string) => Promise<void>) | null>(null);
  const [actionTitle, setActionTitle] = useState("");
  const [targetDescription, setTargetDescription] = useState("");

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        branchId: selectedBranch,
        departmentId: selectedDepartment,
        status: selectedStatus,
        search,
      });
      const res = await fetch(`/api/employees?${q.toString()}`);
      const data = await res.json();
      setEmployees(data.data || []);
      setBranches(data.branches || []);
      setDepartments(data.departments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [selectedBranch, selectedDepartment, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEmployees();
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert(locale === "ar" ? "يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP" : "Please select a JPG, PNG, or WEBP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(locale === "ar" ? "حجم الصورة يجب ألا يتجاوز 5 ميجابايت" : "Image size must not exceed 5MB");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Trigger Add Employee
  const handleOpenAdd = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setNewEmp({
      nameEn: "",
      nameAr: "",
      jobTitle: "",
      branchId: branches[0]?.id || "",
      departmentId: departments[0]?.id || "",
      basicSalary: 3500,
      housingAllowance: 1000,
      transportAllowance: 500,
      otherAllowances: 200,
      gender: "MALE",
      nationality: "Emirati",
      mobile: "+971 50 ",
      email: "",
      passportNumber: "N1234567",
      emiratesId: "784-1990-1234567-1",
    });
    setAddModalOpen(true);
  };

  const handleConfirmAddSubmit = () => {
    setActionTitle(locale === "ar" ? "إنشاء سجل موظف جديد" : "Create New Employee");
    setTargetDescription(`${newEmp.nameEn} (${newEmp.nameAr}) - ${newEmp.jobTitle}`);
    setPendingAction(() => async (authPassword: string) => {
      let photoUrl = "";
      if (photoFile) {
        setPhotoUploading(true);
        const fd = new FormData();
        fd.append("photo", photoFile);
        const uploadRes = await fetch("/api/employees/upload-photo", {
          method: "POST",
          body: fd,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setPhotoUploading(false);
          throw new Error(uploadData.error || "Failed to upload employee photo");
        }
        photoUrl = uploadData.url;
        setPhotoUploading(false);
      }

      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEmp, photoUrl, authorizationPassword: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create employee");
      setAddModalOpen(false);
      setAuthDialogOpen(false);
      // Requirement 2: Open Employee Profile / Details Page immediately after creation
      router.push(`/employees/${data.employee.id}`);
    });
    setAuthDialogOpen(true);
  };

  // Trigger Edit Employee
  const handleOpenEdit = (emp: any) => {
    setSelectedEmp(emp);
    setEditFormData({
      jobTitle: emp.jobTitle,
      basicSalary: emp.basicSalary || 0,
      housingAllowance: emp.housingAllowance || 0,
      status: emp.status,
      branchId: emp.branchId || "",
      departmentId: emp.departmentId || "",
    });
    setEditModalOpen(true);
  };

  const handleConfirmEditSubmit = () => {
    setActionTitle(locale === "ar" ? "تعديل بيانات الموظف (مستوى أمني 2)" : "Update Employee Record (Level 2 Auth)");
    setTargetDescription(`${selectedEmp.nameEn} (${selectedEmp.employeeCode})`);
    setPendingAction(() => async (authPassword: string) => {
      const res = await fetch(`/api/employees/${selectedEmp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editFormData, authorizationPassword: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update employee");
      setEditModalOpen(false);
      setAuthDialogOpen(false);
      await loadEmployees();
      if (selectedEmp && detailDrawerOpen) {
        handleOpenDetail(selectedEmp);
      }
    });
    setAuthDialogOpen(true);
  };

  // Open Details Drawer
  const handleOpenDetail = async (emp: any) => {
    setSelectedEmp(emp);
    setDetailDrawerOpen(true);
    try {
      const res = await fetch(`/api/employees/${emp.id}`);
      const data = await res.json();
      setEmpDetails(data);
    } catch (err) {
      console.error(err);
    }
  };

  // End of Service calculation
  const handleCalculateEos = async () => {
    if (!selectedEmp) return;
    setEosLoading(true);
    setEosModalOpen(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmp.id}/eos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastWorkingDateStr: new Date().toISOString(),
          leavePayoutDays: 14,
          deductions: 0,
        }),
      });
      const data = await res.json();
      setEosResult(data.calculation);
    } catch (err) {
      console.error(err);
    } finally {
      setEosLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return t.employees.statusActive;
      case "ON_LEAVE":
        return t.employees.statusOnLeave;
      case "SUSPENDED":
        return t.employees.statusSuspended;
      case "TERMINATED":
        return t.employees.statusTerminated;
      default:
        return status;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-950/80 text-emerald-400 border-emerald-500/40";
      case "ON_LEAVE":
        return "bg-amber-950/80 text-amber-400 border-amber-500/40";
      case "SUSPENDED":
        return "bg-red-950/80 text-red-400 border-red-500/40";
      case "TERMINATED":
        return "bg-slate-900/80 text-slate-400 border-slate-700/50";
      default:
        return "bg-slate-900/80 text-slate-400 border-slate-700/50";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141720] p-6 rounded-3xl border border-[#1e2433]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5 rtl:space-x-reverse">
            <Users className="w-5 h-5 text-rose-500" />
            <span>{t.employees.title}</span>
            <span className="ms-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-800/40">
              {employees.length} {t.employees.totalCount}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t.employees.subtitle}
          </p>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {/* Card / Table View Toggle */}
          <div className="flex items-center bg-[#0c0e12] border border-[#1e2433] rounded-xl p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "cards"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title={t.employees.cardsView}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "table"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title={t.employees.tableView}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse shadow-lg shadow-rose-950/40 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.employees.addEmployee}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#141720] p-4 rounded-2xl border border-[#1e2433] flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.employees.searchPlaceholder}
            className="w-full bg-[#0c0e12] border border-[#1e2433] focus:border-rose-500 rounded-xl ps-9 pe-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
          />
          <Search className="w-4 h-4 text-slate-500 absolute start-3 top-2.5 pointer-events-none" />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-[#0c0e12] border border-[#1e2433] text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-rose-500 transition"
          >
            <option value="ALL">{t.employees.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {locale === "ar" ? b.nameAr : b.nameEn}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          {departments.length > 0 && (
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-[#0c0e12] border border-[#1e2433] text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-rose-500 transition"
            >
              <option value="ALL">{t.employees.allDepartments}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {locale === "ar" ? d.nameAr : d.nameEn}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#0c0e12] border border-[#1e2433] text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-rose-500 transition"
          >
            <option value="ALL">{t.employees.allStatuses}</option>
            <option value="ACTIVE">{t.employees.statusActive}</option>
            <option value="ON_LEAVE">{t.employees.statusOnLeave}</option>
            <option value="SUSPENDED">{t.employees.statusSuspended}</option>
            <option value="TERMINATED">{t.employees.statusTerminated}</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-16 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-500" />
          <p className="text-sm">{t.common.loading}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && employees.length === 0 && (
        <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-16 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h3 className="text-base font-bold text-white mb-1">{t.common.noData}</h3>
          <p className="text-xs text-slate-500">{t.employees.noEmployeesFound}</p>
        </div>
      )}

      {/* PRIMARY VIEW: RESPONSIVE EMPLOYEE CARD GRID */}
      {!loading && employees.length > 0 && viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {employees.map((emp) => {
            const basic = emp.basicSalary !== null ? Number(emp.basicSalary) : null;
            const total =
              basic !== null
                ? basic +
                  Number(emp.housingAllowance || 0) +
                  Number(emp.transportAllowance || 0) +
                  Number(emp.otherAllowances || 0)
                : null;

            return (
              <div
                key={emp.id}
                className="bg-[#141720] border border-[#1e2433] hover:border-rose-900/40 rounded-3xl p-5 shadow-xl flex flex-col justify-between enterprise-card group transition-all"
              >
                <div>
                  {/* REAL PROFILE PHOTO CONTAINER */}
                  <Link href={`/employees/${emp.id}`} className="block relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-[#0c0e12] border border-[#1e2433] group-hover:border-rose-500/40 shadow-md">
                    {/* Floating Status Pill */}
                    <div className="absolute top-3 end-3 z-10">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-md border flex items-center space-x-1.5 rtl:space-x-reverse ${getStatusStyle(
                          emp.status
                        )}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        <span>{getStatusLabel(emp.status)}</span>
                      </span>
                    </div>

                    {/* Floating Employee Code Badge */}
                    <div className="absolute bottom-3 start-3 z-10">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#0c0e12]/90 text-rose-400 border border-rose-500/30 backdrop-blur-md">
                        {emp.employeeCode}
                      </span>
                    </div>

                    {/* Real Stored Image or Fallback Avatar */}
                    {emp.photoUrl ? (
                      <img
                        src={emp.photoUrl}
                        alt={emp.nameEn}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#161a24] to-[#0c0e12] text-rose-400">
                        <Users className="w-12 h-12 mb-1 text-slate-600" />
                        <span className="text-[10px] text-slate-500 font-medium">
                          {t.employees.noPhoto}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Employee Names */}
                  <div className="space-y-0.5 mb-3">
                    <Link href={`/employees/${emp.id}`}>
                      <h2 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors truncate">
                        {emp.nameEn}
                      </h2>
                    </Link>
                    {emp.nameAr && (
                      <div className="text-xs text-slate-400 font-medium truncate">
                        {emp.nameAr}
                      </div>
                    )}
                  </div>

                  {/* Position & Department */}
                  <div className="mb-4">
                    <div className="text-xs text-rose-300/90 font-semibold truncate">
                      {emp.jobTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {locale === "ar"
                        ? emp.department?.nameAr || emp.department?.nameEn
                        : emp.department?.nameEn || "General Staff"}
                    </div>
                  </div>

                  {/* Key Metadata Rows */}
                  <div className="space-y-2 py-3 border-y border-[#1e2433] text-xs">
                    {/* Branch */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse text-slate-300">
                      <Building className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">
                        <strong className="text-slate-400 font-normal">
                          {t.employees.branch}:{" "}
                        </strong>
                        {locale === "ar"
                          ? emp.branch?.nameAr || emp.branch?.nameEn
                          : emp.branch?.nameEn || "Global"}
                      </span>
                    </div>

                    {/* Salary */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse text-slate-300">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">
                        <strong className="text-slate-400 font-normal">
                          {t.employees.salary}:{" "}
                        </strong>
                        {total !== null ? (
                          <span className="text-white font-semibold font-mono">
                            {total.toLocaleString()} {t.common.currency}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">
                            {t.employees.confidential}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Mobile */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="font-mono text-slate-300">
                        {emp.mobile || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Document Compliance Status & Nearest Expiry */}
                  <div className="pt-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1 font-medium">
                        <FileText className="w-3 h-3 text-rose-400" />
                        <span>{locale === "ar" ? "المستندات" : "Documents"}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {emp.docMetrics?.total || 0} {locale === "ar" ? "مستند" : "docs"}
                      </span>
                    </div>

                    {/* Status pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {emp.docMetrics?.expired > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800/40">
                          🔴 {emp.docMetrics.expired} {locale === "ar" ? "منتهي" : "expired"}
                        </span>
                      )}
                      {emp.docMetrics?.expiring > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/40">
                          🟡 {emp.docMetrics.expiring} {locale === "ar" ? "قريب الانتهاء" : "expiring"}
                        </span>
                      )}
                      {emp.docMetrics?.active > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                          🟢 {emp.docMetrics.active} {locale === "ar" ? "ساري" : "valid"}
                        </span>
                      )}
                      {(!emp.docMetrics || emp.docMetrics.total === 0) && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900 text-slate-500 border border-slate-800">
                          ⚪ {locale === "ar" ? "لا توجد مستندات" : "No documents"}
                        </span>
                      )}
                    </div>

                    {/* Nearest Expiry Badge */}
                    {emp.docMetrics?.nearestExpiry && (
                      <div className="text-[10px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0c0e12] border border-[#1e2433]">
                        <Calendar className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span className="text-slate-400 truncate">
                          {locale === "ar"
                            ? emp.docMetrics.nearestExpiry.documentType?.nameAr || emp.docMetrics.nearestExpiry.title
                            : emp.docMetrics.nearestExpiry.documentType?.nameEn || emp.docMetrics.nearestExpiry.title}:
                        </span>
                        <span className={`font-mono font-bold flex-shrink-0 ${
                          emp.docMetrics.nearestExpiry.daysRemaining < 0
                            ? "text-rose-400"
                            : emp.docMetrics.nearestExpiry.daysRemaining <= 30
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}>
                          {emp.docMetrics.nearestExpiry.daysRemaining < 0
                            ? (locale === "ar" ? `منتهي (${Math.abs(emp.docMetrics.nearestExpiry.daysRemaining)}ي)` : `Expired (${Math.abs(emp.docMetrics.nearestExpiry.daysRemaining)}d)`)
                            : (locale === "ar" ? `${emp.docMetrics.nearestExpiry.daysRemaining} يوم` : `${emp.docMetrics.nearestExpiry.daysRemaining}d`)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions Footer */}
                <div className="pt-4 flex items-center space-x-2 rtl:space-x-reverse">
                  <Link
                    href={`/employees/${emp.id}`}
                    className="flex-1 py-2 px-2.5 bg-rose-600/15 hover:bg-rose-600/25 border border-rose-600/30 hover:border-rose-500 text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 rtl:space-x-reverse transition"
                    title={locale === "ar" ? "الملف الكامل" : "Full Profile"}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
                    <span>{locale === "ar" ? "الملف" : "Profile"}</span>
                  </Link>

                  <button
                    onClick={() => handleOpenDetail(emp)}
                    className="py-2 px-2.5 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 rtl:space-x-reverse transition"
                    title={t.employees.view}
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(emp)}
                    className="py-2 px-2.5 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 rtl:space-x-reverse transition"
                    title={t.employees.edit}
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SECONDARY VIEW: TABLE VIEW (when toggled) */}
      {!loading && employees.length > 0 && viewMode === "table" && (
        <div className="bg-[#141720] border border-[#1e2433] rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs text-slate-300">
              <thead className="bg-[#0f1218] border-b border-[#1e2433] text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 text-start font-semibold">{t.employees.code}</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{t.employees.photo}</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{t.employees.name}</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{t.employees.jobTitle}</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{t.employees.branch}</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{t.employees.status}</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{locale === "ar" ? "المستندات" : "Documents"}</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{locale === "ar" ? "أقرب انتهاء" : "Nearest Expiry"}</th>
                  <th className="px-5 py-3.5 text-end font-semibold">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2433]">
                {employees.map((emp) => {
                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3.5 font-mono text-rose-400 font-semibold">
                        <Link href={`/employees/${emp.id}`} className="hover:underline">
                          {emp.employeeCode}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/employees/${emp.id}`} className="block w-10 h-10 rounded-xl overflow-hidden bg-[#0c0e12] border border-[#1e2433] hover:border-rose-500/50">
                          {emp.photoUrl ? (
                            <img
                              src={emp.photoUrl}
                              alt={emp.nameEn}
                              className="w-full h-full object-cover object-center"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-rose-400 font-bold text-xs">
                              {emp.nameEn?.slice(0, 1)}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/employees/${emp.id}`} className="hover:text-rose-400 transition-colors">
                          <div className="font-semibold text-white">{emp.nameEn}</div>
                          {emp.nameAr && <div className="text-[11px] text-slate-400">{emp.nameAr}</div>}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-slate-200">{emp.jobTitle}</div>
                        <div className="text-[10px] text-slate-500">
                          {locale === "ar"
                            ? emp.department?.nameAr || emp.department?.nameEn
                            : emp.department?.nameEn}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">
                        {locale === "ar"
                          ? emp.branch?.nameAr || emp.branch?.nameEn
                          : emp.branch?.nameEn || "Global"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getStatusStyle(
                            emp.status
                          )}`}
                        >
                          {getStatusLabel(emp.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {emp.docMetrics?.expired > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800/40">
                              🔴 {emp.docMetrics.expired}
                            </span>
                          )}
                          {emp.docMetrics?.expiring > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/40">
                              🟡 {emp.docMetrics.expiring}
                            </span>
                          )}
                          {emp.docMetrics?.active > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                              🟢 {emp.docMetrics.active}
                            </span>
                          )}
                          {(!emp.docMetrics || emp.docMetrics.total === 0) && (
                            <span className="text-[10px] text-slate-500">
                              ⚪ 0
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {emp.docMetrics?.nearestExpiry ? (
                          <div className="text-[11px] font-mono">
                            <span className={emp.docMetrics.nearestExpiry.daysRemaining < 0 ? "text-rose-400 font-bold" : emp.docMetrics.nearestExpiry.daysRemaining <= 30 ? "text-amber-400 font-bold" : "text-emerald-400"}>
                              {emp.docMetrics.nearestExpiry.daysRemaining < 0
                                ? (locale === "ar" ? `منتهي (${Math.abs(emp.docMetrics.nearestExpiry.daysRemaining)}ي)` : `Expired (${Math.abs(emp.docMetrics.nearestExpiry.daysRemaining)}d)`)
                                : (locale === "ar" ? `${emp.docMetrics.nearestExpiry.daysRemaining} يوم` : `${emp.docMetrics.nearestExpiry.daysRemaining}d`)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-end">
                        <div className="flex items-center justify-end space-x-1.5 rtl:space-x-reverse">
                          <Link
                            href={`/employees/${emp.id}`}
                            className="p-1.5 hover:text-rose-400 text-slate-400 bg-[#0c0e12] border border-[#1e2433] rounded-lg hover:bg-slate-800 transition"
                            title={locale === "ar" ? "الملف الكامل" : "Full Profile"}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleOpenDetail(emp)}
                            className="p-1.5 hover:text-white text-slate-400 bg-[#0c0e12] border border-[#1e2433] rounded-lg hover:bg-slate-800 transition"
                            title={t.employees.view}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 hover:text-rose-400 text-slate-400 bg-[#0c0e12] border border-[#1e2433] rounded-lg hover:bg-slate-800 transition"
                            title={t.employees.edit}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl overflow-hidden my-8">
            <div className="bg-[#0f1218] border-b border-[#1e2433] p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                <Users className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-white">{t.employees.addEmployee}</h3>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Employee Avatar Upload Section */}
              <div className="p-4 bg-[#0c0e12] border border-[#1e2433] rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-[#161a24] border-2 border-rose-500/40 flex items-center justify-center flex-shrink-0 shadow-lg">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-9 h-9 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-start">
                  <div className="text-xs font-semibold text-white mb-1">
                    {locale === "ar" ? "صورة الموظف / Avatar" : "Employee Photo / Avatar"}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2.5">
                    {locale === "ar" ? "JPG أو PNG أو WEBP (الحد الأقصى 5 ميجابايت)" : "JPG, PNG, or WEBP (Max 5MB)"}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="cursor-pointer px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{photoPreview ? (locale === "ar" ? "تغيير الصورة" : "Change Photo") : (locale === "ar" ? "رفع صورة الموظف" : "Upload Photo")}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />
                    </label>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>{locale === "ar" ? "حذف الصورة" : "Remove"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {locale === "ar" ? "الاسم بالإنجليزية *" : "Full Name (English) *"}
                  </label>
                  <input
                    type="text"
                    value={newEmp.nameEn}
                    onChange={(e) => setNewEmp({ ...newEmp, nameEn: e.target.value })}
                    placeholder={locale === "ar" ? "مثال: جون دو" : "e.g. John Doe"}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {locale === "ar" ? "الاسم بالعربية *" : "Full Name (Arabic) *"}
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={newEmp.nameAr}
                    onChange={(e) => setNewEmp({ ...newEmp, nameAr: e.target.value })}
                    placeholder={locale === "ar" ? "مثال: أحمد المحمود" : "e.g. Ahmed Al Mahmoud"}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.employees.jobTitle} *
                  </label>
                  <input
                    type="text"
                    value={newEmp.jobTitle}
                    onChange={(e) => setNewEmp({ ...newEmp, jobTitle: e.target.value })}
                    placeholder={locale === "ar" ? "مثال: طاهي، باريستا، نادل" : "e.g. Commis Chef, Barista, Waiter"}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.employees.branch} *
                  </label>
                  <select
                    value={newEmp.branchId}
                    onChange={(e) => setNewEmp({ ...newEmp, branchId: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {locale === "ar" ? b.nameAr : b.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.employees.basicSalary} (AED) *
                  </label>
                  <input
                    type="number"
                    value={newEmp.basicSalary}
                    onChange={(e) => setNewEmp({ ...newEmp, basicSalary: Number(e.target.value) })}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.employees.allowances} (AED)
                  </label>
                  <input
                    type="number"
                    value={newEmp.housingAllowance}
                    onChange={(e) => setNewEmp({ ...newEmp, housingAllowance: Number(e.target.value) })}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.employees.mobile}
                  </label>
                  <input
                    type="text"
                    value={newEmp.mobile}
                    onChange={(e) => setNewEmp({ ...newEmp, mobile: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {t.employees.nationality}
                  </label>
                  <input
                    type="text"
                    value={newEmp.nationality}
                    onChange={(e) => setNewEmp({ ...newEmp, nationality: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#0f1218] border-t border-[#1e2433] p-4 flex items-center justify-end space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setAddModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleConfirmAddSubmit}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40"
              >
                {t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal with Level-2 Authorization Password */}
      {editModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-[#0f1218] border-b border-[#1e2433] p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{t.employees.edit}</h3>
                <p className="text-xs text-rose-400 font-mono">
                  {selectedEmp.nameEn} ({selectedEmp.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t.employees.jobTitle}
                </label>
                <input
                  type="text"
                  value={editFormData.jobTitle}
                  onChange={(e) => setEditFormData({ ...editFormData, jobTitle: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t.employees.basicSalary} (AED)
                </label>
                <input
                  type="number"
                  value={editFormData.basicSalary}
                  onChange={(e) => setEditFormData({ ...editFormData, basicSalary: Number(e.target.value) })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t.employees.branch}
                </label>
                <select
                  value={editFormData.branchId}
                  onChange={(e) => setEditFormData({ ...editFormData, branchId: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {locale === "ar" ? b.nameAr : b.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {t.employees.status}
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                >
                  <option value="ACTIVE">{t.employees.statusActive}</option>
                  <option value="ON_LEAVE">{t.employees.statusOnLeave}</option>
                  <option value="SUSPENDED">{t.employees.statusSuspended}</option>
                  <option value="TERMINATED">{t.employees.statusTerminated}</option>
                </select>
              </div>
            </div>

            <div className="bg-[#0f1218] border-t border-[#1e2433] p-4 flex items-center justify-end space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleConfirmEditSubmit}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40"
              >
                {locale === "ar" ? "تفويض وحفظ التعديلات" : "Authorize & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Drawer with Real Profile Photo */}
      {detailDrawerOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#141720] border-s border-[#1e2433] h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header with Large Photo */}
            <div className="p-6 bg-[#0f1218] border-b border-[#1e2433] flex items-center justify-between">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                {/* Large Profile Photo */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-rose-500/50 bg-[#0c0e12] flex-shrink-0 shadow-lg">
                  {selectedEmp.photoUrl ? (
                    <img
                      src={selectedEmp.photoUrl}
                      alt={selectedEmp.nameEn}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-rose-600 to-purple-600 text-white font-bold text-lg">
                      {selectedEmp.nameEn?.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedEmp.nameEn}</h3>
                  {selectedEmp.nameAr && (
                    <div className="text-xs text-slate-400 font-medium">{selectedEmp.nameAr}</div>
                  )}
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-rose-400 font-mono mt-1">
                    <span>{selectedEmp.employeeCode}</span>
                    <span>•</span>
                    <span>{selectedEmp.jobTitle}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailDrawerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto text-xs text-slate-300">
              {/* Quick Actions */}
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleCalculateEos}
                  className="flex-1 py-2.5 px-3 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] text-rose-400 rounded-xl font-semibold flex items-center justify-center space-x-2 rtl:space-x-reverse transition"
                >
                  <Calculator className="w-4 h-4" />
                  <span>{t.employees.calculateEos}</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedEmp)}
                  className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 rtl:space-x-reverse transition shadow-md shadow-rose-950/40"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>{t.employees.edit}</span>
                </button>
              </div>

              {/* Identity & Legal Identifiers */}
              <div className="p-4 bg-[#0c0e12] border border-[#1e2433] rounded-2xl space-y-2.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {t.employees.personalInfo}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">{t.employees.passport}:</span>
                    <span className="font-mono text-white">{selectedEmp.passportNumberMasked || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t.employees.emiratesId}:</span>
                    <span className="font-mono text-white">{selectedEmp.emiratesIdMasked || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t.employees.visa}:</span>
                    <span className="font-mono text-white">{selectedEmp.visaNumberMasked || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t.employees.joiningDate}:</span>
                    <span className="text-white font-mono">
                      {new Date(selectedEmp.joiningDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compliance Documents with In-Browser PDF Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse">
                    <FileText className="w-4 h-4 text-rose-400" />
                    <span>
                      {t.employees.documents} ({empDetails?.documents?.length || 0})
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {empDetails?.documents?.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-[#0c0e12] border border-[#1e2433] hover:border-rose-900/40 rounded-2xl flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate max-w-xs">{doc.title}</div>
                        <div className="text-[10px] text-slate-500">
                          {locale === "ar" ? doc.documentType?.nameAr : doc.documentType?.nameEn} • v{doc.currentVersion?.versionNumber || 1}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveDoc(doc);
                          setPdfViewerOpen(true);
                        }}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t.documents.viewDoc}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit Trail for this Employee */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>{t.audit.title}</span>
                </div>
                <div className="space-y-2 divide-y divide-[#1e2433]">
                  {empDetails?.auditLogs?.map((log: any) => (
                    <div key={log.id} className="pt-2 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-semibold text-white">{log.actorNameSnapshot}</span>
                        <span className="font-mono text-slate-500">
                          {new Date(log.occurredAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-400">{log.action}: {log.reason || "Record update"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End of Service Modal */}
      {eosModalOpen && eosResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#141720] border border-amber-900/40 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">{t.employees.calculateEos}</h3>
              </div>
              <button onClick={() => setEosModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#0c0e12] rounded-xl space-y-1">
                <div className="text-slate-400">
                  {t.employees.name}: <strong className="text-white">{eosResult.name}</strong>
                </div>
                <div className="text-slate-400">
                  {locale === "ar" ? "مدة الخدمة الكلية:" : "Total Service:"}{" "}
                  <strong className="text-amber-400 font-mono">
                    {eosResult.service.years} {locale === "ar" ? "سنوات" : "Years"},{" "}
                    {eosResult.service.months} {locale === "ar" ? "أشهر" : "Months"}
                  </strong>
                </div>
                <div className="text-slate-400">
                  {t.employees.basicSalary}:{" "}
                  <strong className="text-white font-mono">{eosResult.basicSalary} {t.common.currency}</strong>
                </div>
              </div>

              <div className="divide-y divide-[#1e2433] border-t border-[#1e2433] pt-2">
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-400">
                    {locale === "ar" ? "مكافأة نهاية الخدمة:" : "Gratuity Benefit:"}
                  </span>
                  <span className="font-mono font-bold text-white">{eosResult.gratuityAmount} {t.common.currency}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-400">
                    {locale === "ar" ? "بدل الإجازات المستحقة (14 يوم):" : "Unused Leave Payout (14 days):"}
                  </span>
                  <span className="font-mono font-bold text-white">{eosResult.leavePayout} {t.common.currency}</span>
                </div>
                <div className="py-2 flex justify-between text-sm font-bold text-amber-400">
                  <span>{locale === "ar" ? "صافي المستحقات النهائية:" : "Net Settlement Due:"}</span>
                  <span className="font-mono">{eosResult.netSettlement} {t.common.currency}</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 leading-tight">
                {locale === "ar"
                  ? "تم الاحتساب وفقاً للمرسوم بقانون اتحادي رقم 33 لسنة 2021 بشأن تنظيم علاقات العمل (المادة 51)."
                  : "Calculated strictly in accordance with UAE Federal Decree-Law No. 33 of 2021 Article 51."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-Browser PDF Previewer */}
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
