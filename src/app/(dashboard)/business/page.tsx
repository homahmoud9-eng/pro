"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";

export default function BusinessPage() {
  const { t } = useI18n();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit Org Profile Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nameEn: "",
    nameAr: "",
    phone: "",
    email: "",
    address: "",
  });

  // In-Browser PDF Preview
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);

  // Two-Level Security Authorization
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<((authPassword: string) => Promise<void>) | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/business");
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = () => {
    if (!data?.organization) return;
    setEditForm({
      nameEn: data.organization.nameEn,
      nameAr: data.organization.nameAr,
      phone: data.organization.phone || "",
      email: data.organization.email || "",
      address: data.organization.address || "",
    });
    setEditModalOpen(true);
  };

  const handleConfirmEdit = () => {
    setPendingAction(() => async (authPassword: string) => {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, authorizationPassword: authPassword }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Update failed");
      setEditModalOpen(false);
      setAuthDialogOpen(false);
      await loadData();
    });
    setAuthDialogOpen(true);
  };

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-rose-500" />
        <span>Loading company and branch information...</span>
      </div>
    );
  }

  const { organization, branches, departments, legalDocs } = data;

  return (
    <div className="space-y-8">
      {/* Top Organization Header */}
      <div className="bg-[#141720] border border-[#1e2433] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start space-x-4 rtl:space-x-reverse">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-rose-950/50 flex-shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {organization.nameEn}
              </h1>
              <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-semibold">
                {organization.code}
              </span>
            </div>
            <p className="text-xs text-rose-400 font-semibold mt-0.5">
              {organization.nameAr}
            </p>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 mt-3">
              <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{organization.address}, {organization.emirate}</span>
              </span>
              <span className="flex items-center space-x-1.5 rtl:space-x-reverse">
                <Phone className="w-3.5 h-3.5 text-rose-400" />
                <span>{organization.phone}</span>
              </span>
              <span className="flex items-center space-x-1.5 rtl:space-x-reverse font-mono text-emerald-400">
                <span>TRN: {organization.trn}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenEdit}
          className="px-4 py-2.5 bg-[#0c0e12] hover:bg-slate-800 border border-[#1e2433] text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse transition shadow-sm"
        >
          <Edit2 className="w-3.5 h-3.5 text-rose-400" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Branches Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
            <span>Restaurant Branches ({branches.length})</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches.map((b: any) => (
            <div
              key={b.id}
              className="p-5 bg-[#141720] border border-[#1e2433] rounded-3xl space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-950/40 border border-rose-800/40 text-rose-400 font-bold">
                    {b.code}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1.5">{b.nameEn}</h3>
                  <p className="text-xs text-slate-400">{b.nameAr}</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                  {b.status}
                </span>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-[#1e2433]">
                <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{b.address}</span>
                </div>
                <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{b.phone}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1e2433] grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#0c0e12] p-2 rounded-xl">
                  <div className="font-bold text-white">{b._count.employees}</div>
                  <div className="text-[10px] text-slate-500">Staff</div>
                </div>
                <div className="bg-[#0c0e12] p-2 rounded-xl">
                  <div className="font-bold text-white">{b._count.documents}</div>
                  <div className="text-[10px] text-slate-500">Docs</div>
                </div>
                <div className="bg-[#0c0e12] p-2 rounded-xl">
                  <div className="font-bold text-white">{b._count.inventoryItems}</div>
                  <div className="text-[10px] text-slate-500">Items</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Legal Documents & Permits Checklist */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2 rtl:space-x-reverse">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Official Licenses & Legal Permits ({legalDocs.length})</span>
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
                    {doc.documentType?.nameEn}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      doc.status === "ACTIVE"
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                        : "bg-rose-950/40 text-rose-400 border-rose-800/40"
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white truncate max-w-sm">
                  {doc.title}
                </h3>
                <div className="text-[11px] text-slate-400 font-mono">
                  Ref: {doc.referenceNumber || "N/A"}
                  {doc.expiryDate && (
                    <span className="ms-3 text-amber-400 font-sans">
                      Expires: {new Date(doc.expiryDate).toLocaleDateString()}
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
                <span>Preview PDF</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Organization Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <h3 className="text-sm font-bold text-white">Edit Company Profile</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company Name (English)</label>
                <input
                  type="text"
                  value={editForm.nameEn}
                  onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">الاسم القانوني (عربي)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={editForm.nameAr}
                  onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Official Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Address / Location</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEdit}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40"
              >
                Authorize & Save
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

      {/* Authorization Password Dialog */}
      <AuthorizationPasswordDialog
        isOpen={authDialogOpen}
        actionTitle="Update Company Profile"
        targetDescription={organization.nameEn}
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
