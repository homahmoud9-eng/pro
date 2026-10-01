"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/context";
import { AuthorizationPasswordDialog } from "@/components/security/authorization-password-dialog";
import { PdfViewerModal } from "@/components/pdf/pdf-viewer-modal";
import {
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  FileCheck,
  FileClock,
  FileWarning,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Eye,
  Download,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  History,
  Briefcase,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Upload,
  Camera,
  X,
  Loader2,
  Calculator,
  Archive,
} from "lucide-react";

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { t, locale, dir, formatDate } = useI18n();

  const [employee, setEmployee] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [missingDocs, setMissingDocs] = useState<any[]>([]);
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalDocs: 0,
    activeDocs: 0,
    expiringSoonDocs: 0,
    expiredDocs: 0,
    missingDocs: 0,
    contractsCount: 0,
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "contracts" | "renewals" | "activity">("overview");

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const [addDocModalOpen, setAddDocModalOpen] = useState(false);
  const [newDocForm, setNewDocForm] = useState({
    title: "",
    documentTypeId: "",
    referenceNumber: "",
    issueDate: "",
    expiryDate: "",
    reminderDays: "90,30,7",
    notes: "",
  });
  const [newDocFile, setNewDocFile] = useState<File | null>(null);

  const [renewDocModalOpen, setRenewDocModalOpen] = useState(false);
  const [targetDoc, setTargetDoc] = useState<any>(null);
  const [renewFile, setRenewFile] = useState<File | null>(null);
  const [renewIssueDate, setRenewIssueDate] = useState("");
  const [renewExpiryDate, setRenewExpiryDate] = useState("");
  const [renewNotes, setRenewNotes] = useState("");
  const [renewReminderDays, setRenewReminderDays] = useState("90,30,7");

  const [addContractModalOpen, setAddContractModalOpen] = useState(false);
  const [newContractForm, setNewContractForm] = useState({
    contractType: "LIMITED",
    contractNumber: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    basicSalary: 0,
    allowances: 0,
    notes: "",
  });
  const [newContractFile, setNewContractFile] = useState<File | null>(null);

  // Photo Upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // PDF Preview
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);

  // End of Service Modal
  const [eosModalOpen, setEosModalOpen] = useState(false);
  const [eosData, setEosData] = useState<any>(null);
  const [eosLoading, setEosLoading] = useState(false);

  // Two-Level Security Authorization
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authTitle, setAuthTitle] = useState("");
  const [authDesc, setAuthDesc] = useState("");
  const [pendingAction, setPendingAction] = useState<((authPassword: string) => Promise<void>) | null>(null);

  const loadEmployeeData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${id}`);
      if (res.status === 401) {
        router.push("/login?redirect=/employees");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.employee) {
        throw new Error(data.error || "Employee not found");
      }
      setEmployee(data.employee);
      setDocuments(data.documents || []);
      setContracts(data.contracts || []);
      setMissingDocs(data.missingDocuments || []);
      setDocTypes(data.docTypes || []);
      setStats(data.stats || {});
      setAuditLogs(data.auditLogs || []);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Failed to load employee details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadEmployeeData();
    }
  }, [id]);

  // Handle Avatar Change
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("employeeId", employee.id);

      const res = await fetch("/api/employees/upload-photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload photo");

      // Update employee state
      setEmployee((prev: any) => ({ ...prev, photoUrl: data.url }));
      showToast(locale === "ar" ? "تم تحديث صورة الموظف بنجاح" : "Employee photo updated successfully");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Photo upload failed", "error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Open Edit Employee Modal
  const handleOpenEdit = () => {
    setEditForm({
      nameAr: employee.nameAr,
      nameEn: employee.nameEn,
      jobTitle: employee.jobTitle,
      nationality: employee.nationality || "Emirati",
      gender: employee.gender || "MALE",
      mobile: employee.mobile || "",
      email: employee.email || "",
      address: employee.address || "",
      emergencyContact: employee.emergencyContact || "",
      basicSalary: employee.basicSalary || 0,
      housingAllowance: employee.housingAllowance || 0,
      transportAllowance: employee.transportAllowance || 0,
      otherAllowances: employee.otherAllowances || 0,
      status: employee.status,
      notes: employee.notes || "",
    });
    setEditModalOpen(true);
  };

  const handleConfirmEdit = () => {
    setAuthTitle(locale === "ar" ? "تعديل بيانات الموظف (المستوى الأمني 2)" : "Authorize Employee Profile Edit");
    setAuthDesc(`${employee.nameEn} (${employee.employeeCode})`);
    setPendingAction(() => async (authPassword: string) => {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, authorizationPassword: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update employee");

      setEditModalOpen(false);
      setAuthDialogOpen(false);
      showToast(locale === "ar" ? "تم تحديث ملف الموظف بنجاح" : "Employee profile updated successfully");
      await loadEmployeeData();
    });
    setAuthDialogOpen(true);
  };

  // Add Document Submit
  const handleConfirmAddDoc = () => {
    if (!newDocFile) {
      showToast(locale === "ar" ? "يرجى إرفاق ملف المستند" : "Please attach the document file", "error");
      return;
    }
    if (!newDocForm.documentTypeId) {
      showToast(locale === "ar" ? "يرجى اختيار نوع المستند" : "Please select document type", "error");
      return;
    }

    setAuthTitle(locale === "ar" ? "رفع مستند موظف رسمي" : "Authorize Document Upload");
    setAuthDesc(`${newDocForm.title} - ${employee.nameEn}`);
    setPendingAction(() => async (authPassword: string) => {
      const formData = new FormData();
      formData.append("file", newDocFile);
      formData.append("title", newDocForm.title || "Employee Document");
      formData.append("documentTypeId", newDocForm.documentTypeId);
      if (newDocForm.referenceNumber) formData.append("referenceNumber", newDocForm.referenceNumber);
      if (newDocForm.issueDate) formData.append("issueDate", newDocForm.issueDate);
      if (newDocForm.expiryDate) formData.append("expiryDate", newDocForm.expiryDate);
      formData.append("reminderDays", newDocForm.reminderDays);
      formData.append("notes", newDocForm.notes);
      formData.append("authorizationPassword", authPassword);

      const res = await fetch(`/api/employees/${employee.id}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload document");

      setAddDocModalOpen(false);
      setAuthDialogOpen(false);
      showToast(locale === "ar" ? "تم رفع المستند وربطه بالموظف بنجاح" : "Document uploaded and linked to employee");
      await loadEmployeeData();
    });
    setAuthDialogOpen(true);
  };

  // Renew Document Submit
  const handleConfirmRenewDoc = () => {
    if (!renewFile) {
      showToast(locale === "ar" ? "يرجى إرفاق ملف التجديد الجديد" : "Please attach the renewal file", "error");
      return;
    }
    if (!renewExpiryDate) {
      showToast(locale === "ar" ? "يرجى تحديد تاريخ الانتهاء الجديد" : "Please set the new expiry date", "error");
      return;
    }

    setAuthTitle(locale === "ar" ? "تأكيد تجديد المستند الرسمي" : "Authorize Document Renewal");
    setAuthDesc(`${targetDoc.title} (${employee.nameEn})`);
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

      setRenewDocModalOpen(false);
      setAuthDialogOpen(false);
      showToast(locale === "ar" ? "تم تجديد المستند وأرشفة النسخة السابقة" : "Document renewed and previous version archived");
      await loadEmployeeData();
    });
    setAuthDialogOpen(true);
  };

  // Add Contract Submit
  const handleConfirmAddContract = () => {
    setAuthTitle(locale === "ar" ? "إضافة عقد عمل رسمي" : "Authorize Employment Contract");
    setAuthDesc(`${newContractForm.contractType} - ${employee.nameEn}`);
    setPendingAction(() => async (authPassword: string) => {
      const formData = new FormData();
      if (newContractFile) formData.append("file", newContractFile);
      formData.append("contractType", newContractForm.contractType);
      if (newContractForm.contractNumber) formData.append("contractNumber", newContractForm.contractNumber);
      formData.append("startDate", newContractForm.startDate);
      if (newContractForm.endDate) formData.append("endDate", newContractForm.endDate);
      formData.append("basicSalary", String(newContractForm.basicSalary));
      formData.append("allowances", String(newContractForm.allowances));
      formData.append("notes", newContractForm.notes);
      formData.append("authorizationPassword", authPassword);

      const res = await fetch(`/api/employees/${employee.id}/contracts`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add contract");

      setAddContractModalOpen(false);
      setAuthDialogOpen(false);
      showToast(locale === "ar" ? "تم إضافة عقد العمل بنجاح" : "Employment contract registered successfully");
      await loadEmployeeData();
    });
    setAuthDialogOpen(true);
  };

  // Archive Employee
  const handleArchiveEmployee = () => {
    setAuthTitle(locale === "ar" ? "أرشفة سجل الموظف" : "Authorize Employee Archival");
    setAuthDesc(`${employee.nameEn} (${employee.employeeCode})`);
    setPendingAction(() => async (authPassword: string) => {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorizationPassword: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to archive employee");

      setAuthDialogOpen(false);
      showToast(locale === "ar" ? "تم أرشفة الموظف بنجاح مع الحفاظ على السجلات التاريخية" : "Employee archived successfully while preserving all historical records");
      await loadEmployeeData();
    });
    setAuthDialogOpen(true);
  };

  // Calculate EOS
  const handleCalculateEos = async () => {
    setEosLoading(true);
    setEosModalOpen(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/eos`, { method: "POST" });
      const data = await res.json();
      setEosData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setEosLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="w-9 h-9 animate-spin mx-auto mb-3 text-rose-500" />
        <span className="text-xs font-semibold">{locale === "ar" ? "جاري تحميل ملف الموظف..." : "Loading employee profile..."}</span>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-12 text-center bg-[#141720] border border-rose-900/40 rounded-3xl space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-white">{locale === "ar" ? "لم يتم العثور على الموظف" : "Employee not found"}</h3>
        <Link href="/employees" className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold inline-block">
          {locale === "ar" ? "العودة إلى قائمة الموظفين" : "Back to Employees"}
        </Link>
      </div>
    );
  }

  // Renewal history extracted from document versions
  const allVersionsWithParent = documents.flatMap((d) =>
    (d.versions || []).map((v: any) => ({
      ...v,
      docTitle: d.title,
      docType: d.documentType,
      docId: d.id,
      isCurrent: d.currentVersionId === v.id,
    }))
  );

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

      {/* Top Header Card */}
      <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Avatar and Basic Details */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with Upload button */}
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-800 border-2 border-slate-700/60 flex items-center justify-center text-slate-300 overflow-hidden shadow-2xl flex-shrink-0">
                {employee.photoUrl ? (
                  <img src={employee.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  </div>
                )}
              </div>

              {/* Upload Overlay Button */}
              <label
                className="absolute -bottom-1.5 -end-1.5 p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl cursor-pointer shadow-lg shadow-rose-950/50 transition transform hover:scale-105"
                title={locale === "ar" ? "تغيير صورة الموظف" : "Change photo"}
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Names & Metadata */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {locale === "ar" ? employee.nameAr : employee.nameEn}
                </h1>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {employee.employeeCode}
                </span>
                <span
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    employee.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {employee.status === "ACTIVE"
                    ? locale === "ar" ? "نشط" : "Active"
                    : locale === "ar" ? "غير نشط" : employee.status}
                </span>
              </div>

              <p className="text-xs text-rose-400 font-semibold">
                {locale === "ar" ? employee.nameEn : employee.nameAr}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                <span className="flex items-center space-x-1.5 rtl:space-x-reverse font-semibold text-slate-200">
                  <Briefcase className="w-3.5 h-3.5 text-rose-400" />
                  <span>{employee.jobTitle}</span>
                </span>
                {employee.branch && (
                  <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>{locale === "ar" ? employee.branch.nameAr : employee.branch.nameEn} ({employee.branch.code})</span>
                  </span>
                )}
                {employee.department && (
                  <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>{locale === "ar" ? employee.department.nameAr : employee.department.nameEn}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenEdit}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{locale === "ar" ? "تعديل الموظف" : "Edit Profile"}</span>
            </button>

            <button
              onClick={() => {
                setNewDocForm({
                  title: "",
                  documentTypeId: docTypes[0]?.id || "",
                  referenceNumber: "",
                  issueDate: "",
                  expiryDate: "",
                  reminderDays: "90,30,7",
                  notes: "",
                });
                setNewDocFile(null);
                setAddDocModalOpen(true);
              }}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-lg shadow-rose-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "إضافة مستند" : "Upload Document"}</span>
            </button>

            <button
              onClick={() => {
                setNewContractForm({
                  contractType: "LIMITED",
                  contractNumber: `CTR-${employee.employeeCode}`,
                  startDate: new Date().toISOString().split("T")[0],
                  endDate: "",
                  basicSalary: Number(employee.basicSalary || 0),
                  allowances: Number(employee.housingAllowance || 0) + Number(employee.transportAllowance || 0) + Number(employee.otherAllowances || 0),
                  notes: "",
                });
                setNewContractFile(null);
                setAddContractModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{locale === "ar" ? "إضافة عقد" : "Add Contract"}</span>
            </button>

            <button
              onClick={handleCalculateEos}
              className="px-3.5 py-2 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-400" />
              <span>{locale === "ar" ? "مكافأة نهاية الخدمة" : "EOS Calc"}</span>
            </button>

            {employee.status !== "ARCHIVED" && (
              <button
                onClick={handleArchiveEmployee}
                className="px-3 py-2 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/60 text-slate-400 hover:text-rose-300 rounded-xl text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse transition"
                title={locale === "ar" ? "أرشفة الموظف" : "Archive Employee"}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "أرشفة" : "Archive"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse mt-6 pt-6 border-t border-[#1e2433] overflow-x-auto">
          {[
            { id: "overview", labelAr: "نظرة عامة", labelEn: "Overview", icon: User },
            { id: "documents", labelAr: "المستندات", labelEn: "Documents", icon: FileText, count: documents.length },
            { id: "contracts", labelAr: "العقود", labelEn: "Contracts", icon: FileCheck, count: contracts.length },
            { id: "renewals", labelAr: "التجديدات", labelEn: "Renewals", icon: RefreshCw },
            { id: "activity", labelAr: "السجل والتدقيق", labelEn: "Activity", icon: History, count: auditLogs.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse transition flex-shrink-0 ${
                  isActive
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-950/40"
                    : "bg-[#0c0e12] border border-[#1e2433] text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? tab.labelAr : tab.labelEn}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ==================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#141720] border border-[#1e2433]">
              <span className="text-xs text-slate-400 block">{locale === "ar" ? "المستندات المسجلة" : "Total Documents"}</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{stats.totalDocs}</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/30">
              <span className="text-xs text-emerald-400 block">{locale === "ar" ? "مستندات سارية" : "Active Documents"}</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{stats.activeDocs}</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/30">
              <span className="text-xs text-amber-400 block">{locale === "ar" ? "قريبة الانتهاء" : "Expiring Soon"}</span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">{stats.expiringSoonDocs}</span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/30">
              <span className="text-xs text-rose-400 block">{locale === "ar" ? "مستندات منتهية" : "Expired"}</span>
              <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">{stats.expiredDocs}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-400 block">{locale === "ar" ? "مستندات ناقصة" : "Missing Docs"}</span>
              <span className="text-xl font-bold font-mono text-slate-300 mt-1 block">{stats.missingDocs}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Personal Information Card */}
            <div className="lg:col-span-6 bg-[#141720] border border-[#1e2433] rounded-3xl p-6 space-y-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse pb-3 border-b border-[#1e2433]">
                <User className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">{locale === "ar" ? "البيانات الشخصية والهوية" : "Personal & Identity Information"}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "الاسم بالعربية" : "Arabic Name"}</span>
                  <span className="text-white font-medium">{employee.nameAr}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "الاسم بالإنجليزية" : "English Name"}</span>
                  <span className="text-white font-medium">{employee.nameEn}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "الجنسية" : "Nationality"}</span>
                  <span className="text-white font-medium">{employee.nationality || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "الجنس" : "Gender"}</span>
                  <span className="text-white font-medium">{employee.gender || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "رقم الهاتف المتحرك" : "Mobile Phone"}</span>
                  <span className="text-white font-mono">{employee.mobile || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "البريد الإلكتروني" : "Email"}</span>
                  <span className="text-white font-mono">{employee.email || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "رقم الجواز (مشفر)" : "Passport (Masked)"}</span>
                  <span className="text-white font-mono">{employee.passportNumberMasked || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "بطاقة الهوية (مشفرة)" : "Emirates ID (Masked)"}</span>
                  <span className="text-white font-mono">{employee.emiratesIdMasked || "—"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">{locale === "ar" ? "العنوان السكني في الإمارات" : "UAE Residence Address"}</span>
                  <span className="text-white">{employee.address || "—"}</span>
                </div>
              </div>
            </div>

            {/* Employment Information Card */}
            <div className="lg:col-span-6 bg-[#141720] border border-[#1e2433] rounded-3xl p-6 space-y-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse pb-3 border-b border-[#1e2433]">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">{locale === "ar" ? "بيانات الوظيفة والراتب" : "Employment & Compensation"}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "المسمى الوظيفي" : "Job Title"}</span>
                  <span className="text-white font-semibold">{employee.jobTitle}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "الفرع المخصص" : "Assigned Branch"}</span>
                  <span className="text-white">{employee.branch ? (locale === "ar" ? employee.branch.nameAr : employee.branch.nameEn) : "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "تاريخ الالتحاق" : "Joining Date"}</span>
                  <span className="text-white font-mono">{formatDate(employee.joiningDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "نوع العقد" : "Employment Type"}</span>
                  <span className="text-white font-medium">{employee.employmentType || "FULL_TIME"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "الراتب الأساسي" : "Basic Salary"}</span>
                  <span className="text-white font-mono font-bold">
                    {employee.basicSalary !== null ? `${Number(employee.basicSalary).toLocaleString()} AED` : "🔒 سري"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "بدل السكن" : "Housing Allowance"}</span>
                  <span className="text-white font-mono">
                    {employee.housingAllowance !== null ? `${Number(employee.housingAllowance).toLocaleString()} AED` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "بدل المواصلات" : "Transport Allowance"}</span>
                  <span className="text-white font-mono">
                    {employee.transportAllowance !== null ? `${Number(employee.transportAllowance).toLocaleString()} AED` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{locale === "ar" ? "إجمالي الراتب الشهري" : "Total Monthly Salary"}</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {employee.basicSalary !== null
                      ? `${(
                          Number(employee.basicSalary || 0) +
                          Number(employee.housingAllowance || 0) +
                          Number(employee.transportAllowance || 0) +
                          Number(employee.otherAllowances || 0)
                        ).toLocaleString()} AED`
                      : "🔒"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: DOCUMENTS */}
      {/* ==================================================== */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Missing Required Documents Alert Card */}
          {missingDocs.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-3xl p-5 space-y-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-amber-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{locale === "ar" ? "مستندات إلزامية مطلوبة غير مكتملة في الملف:" : "Mandatory compliance documents missing for this employee:"}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {missingDocs.map((reqDoc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#0c0e12] border border-[#1e2433] flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        {locale === "ar" ? reqDoc.nameAr : reqDoc.nameEn}
                      </span>
                      <span className="text-[10px] text-amber-400 font-mono">⚪ {locale === "ar" ? "غير موجود" : "Missing"}</span>
                    </div>
                    <button
                      onClick={() => {
                        const matchedType = docTypes.find(
                          (dt) =>
                            dt.nameEn.toLowerCase().includes(reqDoc.code.toLowerCase()) ||
                            dt.nameEn.toLowerCase().includes(reqDoc.nameEn.toLowerCase())
                        );
                        setNewDocForm({
                          title: locale === "ar" ? `${reqDoc.nameAr} - ${employee.nameAr}` : `${reqDoc.nameEn} - ${employee.nameEn}`,
                          documentTypeId: matchedType?.id || docTypes[0]?.id || "",
                          referenceNumber: "",
                          issueDate: "",
                          expiryDate: "",
                          reminderDays: "90,30,7",
                          notes: "",
                        });
                        setNewDocFile(null);
                        setAddDocModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px] transition shadow-sm"
                    >
                      + {locale === "ar" ? "رفع الآن" : "Upload"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Cards Grid */}
          {documents.length === 0 ? (
            <div className="p-12 text-center bg-[#141720] border border-[#1e2433] rounded-3xl space-y-3">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">{locale === "ar" ? "لا توجد مستندات مضافة لهذا الموظف" : "No documents uploaded for this employee"}</h3>
              <button
                onClick={() => setAddDocModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 rtl:space-x-reverse transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "إضافة مستند جديد" : "Upload New Document"}</span>
              </button>
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
                        : "border-[#1e2433]"
                    }`}
                  >
                    <div>
                      {/* Status Pill & Version */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center space-x-1.5 rtl:space-x-reverse ${
                            isExpired
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : isUrgent
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? "bg-rose-500" : isUrgent ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                          <span>
                            {isExpired
                              ? locale === "ar" ? `منتهي (${Math.abs(doc.daysRemaining || 0)} يوم)` : `Expired (${Math.abs(doc.daysRemaining || 0)}d ago)`
                              : isUrgent
                              ? locale === "ar" ? `ينتهي خلال ${doc.daysRemaining} يوم` : `Expires in ${doc.daysRemaining}d`
                              : locale === "ar" ? `ساري (${doc.daysRemaining ? `${doc.daysRemaining} يوم` : "مستمر"})` : `Active (${doc.daysRemaining ? `${doc.daysRemaining}d` : "valid"})`}
                          </span>
                        </span>

                        <span className="text-[10px] font-mono text-slate-400 bg-[#0c0e12] border border-[#1e2433] px-2 py-0.5 rounded-md">
                          v{doc.currentVersion?.versionNumber || doc.versions?.length || 1}
                        </span>
                      </div>

                      {/* Title & Type */}
                      <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {locale === "ar" ? doc.documentType?.nameAr : doc.documentType?.nameEn}
                        {doc.referenceNumber && <span className="font-mono ms-1.5">({doc.referenceNumber})</span>}
                      </p>

                      {/* Dates */}
                      <div className="mt-4 pt-3 border-t border-[#1e2433] grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">{locale === "ar" ? "تاريخ الإصدار:" : "Issue Date:"}</span>
                          <span className="font-mono text-slate-300">
                            {doc.issueDate ? formatDate(doc.issueDate) : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">{locale === "ar" ? "تاريخ الانتهاء:" : "Expiry Date:"}</span>
                          <span className={`font-mono font-semibold ${isExpired ? "text-rose-400" : isUrgent ? "text-amber-400" : "text-emerald-400"}`}>
                            {doc.expiryDate ? formatDate(doc.expiryDate) : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-[#1e2433] flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setActiveDoc(doc);
                          setPdfViewerOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-rose-400" />
                        <span>{locale === "ar" ? "معاينة" : "Preview"}</span>
                      </button>

                      <button
                        onClick={() => {
                          setTargetDoc(doc);
                          setRenewFile(null);
                          setRenewIssueDate(doc.issueDate ? new Date(doc.issueDate).toISOString().split("T")[0] : "");
                          const nextYear = new Date();
                          nextYear.setFullYear(nextYear.getFullYear() + 1);
                          setRenewExpiryDate(nextYear.toISOString().split("T")[0]);
                          setRenewNotes(`Renewal of ${doc.title}`);
                          setRenewDocModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-md shadow-amber-950/40"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{locale === "ar" ? "تجديد" : "Renew"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: CONTRACTS */}
      {/* ==================================================== */}
      {activeTab === "contracts" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>{locale === "ar" ? "عقود العمل الرسمية للموظف" : "Official Employment Contracts"}</span>
            </h3>

            <button
              onClick={() => {
                setNewContractForm({
                  contractType: "LIMITED",
                  contractNumber: `CTR-${employee.employeeCode}`,
                  startDate: new Date().toISOString().split("T")[0],
                  endDate: "",
                  basicSalary: Number(employee.basicSalary || 0),
                  allowances: Number(employee.housingAllowance || 0) + Number(employee.transportAllowance || 0),
                  notes: "",
                });
                setNewContractFile(null);
                setAddContractModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-md shadow-emerald-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "إضافة عقد جديد" : "Add Contract"}</span>
            </button>
          </div>

          {contracts.length === 0 ? (
            <div className="p-12 text-center bg-[#141720] border border-[#1e2433] rounded-3xl space-y-3">
              <FileCheck className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">{locale === "ar" ? "لا توجد عقود مسجلة لهذا الموظف" : "No contracts registered for this employee"}</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contracts.map((ctr) => (
                <div key={ctr.id} className="p-5 rounded-3xl bg-[#141720] border border-[#1e2433] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                      <span>{ctr.contractType}</span>
                      {ctr.contractNumber && <span className="font-mono text-slate-400">({ctr.contractNumber})</span>}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {ctr.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#1e2433]">
                    <div>
                      <span className="text-[10px] text-slate-500 block">{locale === "ar" ? "تاريخ البدء:" : "Start Date:"}</span>
                      <span className="font-mono text-slate-300">{formatDate(ctr.startDate)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{locale === "ar" ? "تاريخ الانتهاء:" : "End Date:"}</span>
                      <span className="font-mono text-slate-300">{ctr.endDate ? formatDate(ctr.endDate) : (locale === "ar" ? "غير محدد" : "Indefinite")}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{locale === "ar" ? "الراتب الأساسي:" : "Basic Salary:"}</span>
                      <span className="font-mono font-bold text-white">{Number(ctr.basicSalary).toLocaleString()} AED</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{locale === "ar" ? "البدلات:" : "Allowances:"}</span>
                      <span className="font-mono font-bold text-white">{Number(ctr.allowances).toLocaleString()} AED</span>
                    </div>
                  </div>

                  {ctr.notes && <p className="text-xs text-slate-400 italic pt-1">{ctr.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: RENEWALS */}
      {/* ==================================================== */}
      {activeTab === "renewals" && (
        <div className="space-y-4 bg-[#141720] border border-[#1e2433] rounded-3xl p-6">
          <div className="flex items-center space-x-2 rtl:space-x-reverse pb-3 border-b border-[#1e2433]">
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">{locale === "ar" ? "سجل التجديدات والنسخ المحفوظة" : "Renewals & Version History"}</h3>
          </div>

          {allVersionsWithParent.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              {locale === "ar" ? "لا توجد عمليات تجديد مسجلة حتى الآن" : "No renewal history recorded yet"}
            </div>
          ) : (
            <div className="divide-y divide-[#1e2433]">
              {allVersionsWithParent.map((ver: any) => (
                <div key={ver.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="font-bold text-white">{ver.docTitle}</span>
                      <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                        v{ver.versionNumber} {ver.isCurrent ? (locale === "ar" ? "(الحالية)" : "(Current)") : (locale === "ar" ? "(مؤرشفة)" : "(Archived)")}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {ver.notes || (locale === "ar" ? "نسخة رسمية محفوظة" : "Official version recorded")} • {locale === "ar" ? "بواسطة" : "by"} {ver.uploadedBy || "System"}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 rtl:space-x-reverse text-slate-400 font-mono text-[11px]">
                    <span>{formatDate(ver.createdAt)}</span>
                    <button
                      onClick={() => {
                        setActiveDoc({ id: ver.docId, title: `${ver.docTitle} (v${ver.versionNumber})`, currentVersion: ver });
                        setPdfViewerOpen(true);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                    >
                      {locale === "ar" ? "عرض النسخة" : "View"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: ACTIVITY LOG */}
      {/* ==================================================== */}
      {activeTab === "activity" && (
        <div className="space-y-4 bg-[#141720] border border-[#1e2433] rounded-3xl p-6">
          <div className="flex items-center space-x-2 rtl:space-x-reverse pb-3 border-b border-[#1e2433]">
            <History className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">{locale === "ar" ? "سجل التدقيق والنشاط للموظف" : "Audit & Activity Trail"}</h3>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              {locale === "ar" ? "لا توجد حركات مسجلة" : "No audit activity recorded"}
            </div>
          ) : (
            <div className="divide-y divide-[#1e2433]">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="font-mono text-purple-400 font-bold">#{log.sequenceNumber}</span>
                      <span className="font-semibold text-white">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">[{log.module}]</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {locale === "ar" ? "المستخدم المسؤول:" : "Actor:"} <strong className="text-slate-300">{log.actorNameSnapshot}</strong>
                      {log.entityDisplayName && <span> • {log.entityDisplayName}</span>}
                    </p>
                  </div>
                  <div className="text-end font-mono text-[11px] text-slate-500 flex-shrink-0">
                    <div>{formatDate(log.occurredAt)}</div>
                    <div className="text-[10px] text-emerald-400">HMAC-SHA256 Verified</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODALS */}
      {/* ==================================================== */}

      {/* Edit Employee Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <h3 className="text-base font-bold text-white">{locale === "ar" ? "تعديل بيانات الموظف" : "Edit Employee Details"}</h3>
              <button onClick={() => setEditModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "الاسم بالإنجليزية *" : "English Name *"}</label>
                <input
                  type="text"
                  value={editForm.nameEn || ""}
                  onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "الاسم بالعربية *" : "Arabic Name *"}</label>
                <input
                  type="text"
                  value={editForm.nameAr || ""}
                  onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "المسمى الوظيفي *" : "Job Title *"}</label>
                <input
                  type="text"
                  value={editForm.jobTitle || ""}
                  onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "الجنسية" : "Nationality"}</label>
                <input
                  type="text"
                  value={editForm.nationality || ""}
                  onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "رقم الهاتف" : "Phone"}</label>
                <input
                  type="text"
                  value={editForm.mobile || ""}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "البريد الإلكتروني" : "Email"}</label>
                <input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "الراتب الأساسي (AED)" : "Basic Salary (AED)"}</label>
                <input
                  type="number"
                  value={editForm.basicSalary || 0}
                  onChange={(e) => setEditForm({ ...editForm, basicSalary: Number(e.target.value) })}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "بدل السكن (AED)" : "Housing Allowance"}</label>
                <input
                  type="number"
                  value={editForm.housingAllowance || 0}
                  onChange={(e) => setEditForm({ ...editForm, housingAllowance: Number(e.target.value) })}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "العنوان السكني" : "Address"}</label>
                <input
                  type="text"
                  value={editForm.address || ""}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-[#1e2433]">
              <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">
                {t.common.cancel}
              </button>
              <button onClick={handleConfirmEdit} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40">
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {addDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <h3 className="text-base font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Plus className="w-5 h-5 text-rose-500" />
                <span>{locale === "ar" ? "إضافة مستند موظف رسمي" : "Add Employee Document"}</span>
              </h3>
              <button onClick={() => setAddDocModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "نوع المستند *" : "Document Type *"}</label>
                <select
                  value={newDocForm.documentTypeId}
                  onChange={(e) => {
                    const dt = docTypes.find(d => d.id === e.target.value);
                    setNewDocForm({
                      ...newDocForm,
                      documentTypeId: e.target.value,
                      title: dt ? (locale === "ar" ? `${dt.nameAr} - ${employee.nameAr}` : `${dt.nameEn} - ${employee.nameEn}`) : newDocForm.title,
                    });
                  }}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                >
                  <option value="">{locale === "ar" ? "اختر نوع المستند..." : "Select Document Type..."}</option>
                  {docTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {locale === "ar" ? dt.nameAr : dt.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "اسم أو مسمى المستند *" : "Document Title *"}</label>
                <input
                  type="text"
                  value={newDocForm.title}
                  onChange={(e) => setNewDocForm({ ...newDocForm, title: e.target.value })}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "ملف المستند (PDF, JPG, PNG, WEBP) *" : "Document File (PDF, JPG, PNG, WEBP) *"}</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setNewDocFile(e.target.files?.[0] || null)}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-600 file:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "تاريخ الإصدار" : "Issue Date"}</label>
                  <input
                    type="date"
                    value={newDocForm.issueDate}
                    onChange={(e) => setNewDocForm({ ...newDocForm, issueDate: e.target.value })}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "تاريخ الانتهاء" : "Expiry Date"}</label>
                  <input
                    type="date"
                    value={newDocForm.expiryDate}
                    onChange={(e) => setNewDocForm({ ...newDocForm, expiryDate: e.target.value })}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "تنبيهات الانتهاء المسبقة (أيام)" : "Expiry Reminder Windows"}</label>
                <select
                  value={newDocForm.reminderDays}
                  onChange={(e) => setNewDocForm({ ...newDocForm, reminderDays: e.target.value })}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                >
                  <option value="90,30,7">90 {locale === "ar" ? "يوم" : "Days"} • 30 {locale === "ar" ? "يوم" : "Days"} • 7 {locale === "ar" ? "أيام" : "Days"}</option>
                  <option value="60,15">60 {locale === "ar" ? "يوم" : "Days"} • 15 {locale === "ar" ? "يوم" : "Days"}</option>
                  <option value="30,7">30 {locale === "ar" ? "يوم" : "Days"} • 7 {locale === "ar" ? "أيام" : "Days"}</option>
                  <option value="15">15 {locale === "ar" ? "يوم" : "Days"}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2 border-t border-[#1e2433]">
              <button onClick={() => setAddDocModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">
                {t.common.cancel}
              </button>
              <button onClick={handleConfirmAddDoc} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40">
                {locale === "ar" ? "تأكيد الرفع وتوقيع أمني" : "Confirm Upload & Authorize"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Document Modal */}
      {renewDocModalOpen && targetDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <h3 className="text-base font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                <span>{locale === "ar" ? "تجديد المستند الرسمي" : "Renew Document"}</span>
              </h3>
              <button onClick={() => setRenewDocModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "ملف التجديد الجديد (PDF, JPG, PNG, WEBP) *" : "New Renewal File *"}</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setRenewFile(e.target.files?.[0] || null)}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "تاريخ الإصدار الجديد" : "New Issue Date"}</label>
                  <input
                    type="date"
                    value={renewIssueDate}
                    onChange={(e) => setRenewIssueDate(e.target.value)}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "تاريخ الانتهاء الجديد *" : "New Expiry Date *"}</label>
                  <input
                    type="date"
                    value={renewExpiryDate}
                    onChange={(e) => setRenewExpiryDate(e.target.value)}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "ملاحظات التجديد" : "Notes"}</label>
                <textarea
                  rows={2}
                  value={renewNotes}
                  onChange={(e) => setRenewNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2 border-t border-[#1e2433]">
              <button onClick={() => setRenewDocModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">
                {t.common.cancel}
              </button>
              <button onClick={handleConfirmRenewDoc} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-950/40">
                {locale === "ar" ? "تأكيد التجديد وتوقيع أمني" : "Confirm Renewal & Authorize"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contract Modal */}
      {addContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <h3 className="text-base font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <span>{locale === "ar" ? "إضافة عقد عمل رسمي" : "Add Employment Contract"}</span>
              </h3>
              <button onClick={() => setAddContractModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "نوع العقد" : "Contract Type"}</label>
                  <select
                    value={newContractForm.contractType}
                    onChange={(e) => setNewContractForm({ ...newContractForm, contractType: e.target.value })}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                  >
                    <option value="LIMITED">{locale === "ar" ? "عقد محدد المدة (مرسوم 2021)" : "Limited Term (Decree 33)"}</option>
                    <option value="UNLIMITED">{locale === "ar" ? "غير محدد المدة" : "Unlimited"}</option>
                    <option value="PART_TIME">{locale === "ar" ? "دوام جزئي" : "Part Time"}</option>
                    <option value="TEMPORARY">{locale === "ar" ? "مؤقت / موسمي" : "Temporary"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "رقم العقد / المرجع" : "Contract Ref"}</label>
                  <input
                    type="text"
                    value={newContractForm.contractNumber}
                    onChange={(e) => setNewContractForm({ ...newContractForm, contractNumber: e.target.value })}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "تاريخ بدء العقد *" : "Start Date *"}</label>
                  <input
                    type="date"
                    value={newContractForm.startDate}
                    onChange={(e) => setNewContractForm({ ...newContractForm, startDate: e.target.value })}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "تاريخ انتهاء العقد" : "End Date"}</label>
                  <input
                    type="date"
                    value={newContractForm.endDate}
                    onChange={(e) => setNewContractForm({ ...newContractForm, endDate: e.target.value })}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "الراتب الأساسي (AED)" : "Basic Salary"}</label>
                  <input
                    type="number"
                    value={newContractForm.basicSalary}
                    onChange={(e) => setNewContractForm({ ...newContractForm, basicSalary: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "إجمالي البدلات (AED)" : "Allowances"}</label>
                  <input
                    type="number"
                    value={newContractForm.allowances}
                    onChange={(e) => setNewContractForm({ ...newContractForm, allowances: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">{locale === "ar" ? "ملف العقد الموقع (PDF, صورة)" : "Contract File (PDF, Image)"}</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setNewContractFile(e.target.files?.[0] || null)}
                  className="w-full p-2.5 bg-[#0c0e12] border border-[#1e2433] rounded-xl text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2 border-t border-[#1e2433]">
              <button onClick={() => setAddContractModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">
                {t.common.cancel}
              </button>
              <button onClick={handleConfirmAddContract} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40">
                {locale === "ar" ? "حفظ العقد وتوقيع أمني" : "Save Contract & Authorize"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End of Service Modal */}
      {eosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#141720] border border-[#1e2433] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2433]">
              <h3 className="text-base font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
                <Calculator className="w-5 h-5 text-cyan-400" />
                <span>{locale === "ar" ? "حساب مستحقات مكافأة نهاية الخدمة" : "UAE End of Service Calculation"}</span>
              </h3>
              <button onClick={() => setEosModalOpen(false)} className="p-1 rounded-xl text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {eosLoading ? (
              <div className="py-12 text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-cyan-400" />
                <span className="text-xs">{locale === "ar" ? "جاري تطبيق حاسبة المرسوم بقانون اتحادي رقم 33 لسنة 2021..." : "Applying Federal Decree-Law No. 33 of 2021..."}</span>
              </div>
            ) : eosData ? (
              <div className="space-y-3.5 text-xs">
                <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-2xl text-cyan-300 text-[11px] leading-relaxed">
                  {eosData.legalReference || "وفقاً للمرسوم بقانون اتحادي رقم 33 لسنة 2021 بشأن تنظيم علاقات العمل بدولة الإمارات"}
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 bg-[#0c0e12] border border-[#1e2433] rounded-2xl">
                  <div>
                    <span className="text-slate-500 block">{locale === "ar" ? "سنوات الخدمة:" : "Service Duration:"}</span>
                    <span className="text-white font-mono font-bold">{eosData.yearsOfService} {locale === "ar" ? "سنة" : "Years"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{locale === "ar" ? "الراتب الأساسي المعتمد:" : "Basic Salary:"}</span>
                    <span className="text-white font-mono font-bold">{Number(eosData.basicSalary).toLocaleString()} AED</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{locale === "ar" ? "الأجر اليومي:" : "Daily Wage:"}</span>
                    <span className="text-white font-mono">{Number(eosData.dailyWage).toLocaleString()} AED</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{locale === "ar" ? "مكافأة نهاية الخدمة:" : "Total Gratuity (EOS):"}</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">{Number(eosData.gratuityAmount).toLocaleString()} AED</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-[#1e2433]">
              <button onClick={() => setEosModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF / Image Viewer Modal */}
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
        actionTitle={authTitle}
        targetDescription={authDesc}
        onConfirm={async (password) => {
          if (pendingAction) {
            await pendingAction(password);
          }
        }}
      />
    </div>
  );
}
