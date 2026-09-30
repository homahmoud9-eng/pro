"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/i18n/context";
import { AuthorizationPasswordDialog } from "@/components/security/authorization-password-dialog";
import { PdfViewerModal } from "@/components/pdf/pdf-viewer-modal";
import {
  FileText,
  Search,
  Upload,
  Layers,
  History,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Building,
  ShieldCheck,
  X,
  FilePlus,
  RefreshCw,
  Loader2,
} from "lucide-react";

export default function DocumentsPage() {
  const { t } = useI18n();

  const [documents, setDocuments] = useState<any[]>([]);
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("");
  const [search, setSearch] = useState("");

  // Upload New Document Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTypeId, setNewTypeId] = useState("");
  const [newEntityType, setNewEntityType] = useState("ORGANIZATION");
  const [newRef, setNewRef] = useState("");
  const [newIssueDate, setNewIssueDate] = useState("");
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Replace Version Modal
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [targetDoc, setTargetDoc] = useState<any>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceNotes, setReplaceNotes] = useState("");
  const [replaceExpiry, setReplaceExpiry] = useState("");

  // Version History Drawer
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyDoc, setHistoryDoc] = useState<any>(null);

  // In-Browser PDF Preview
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<any>(null);

  // Two-Level Security Authorization
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<((authPassword: string) => Promise<void>) | null>(null);
  const [actionTitle, setActionTitle] = useState("");
  const [targetDescription, setTargetDescription] = useState("");

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== "ALL") q.set("status", statusFilter);
      if (entityFilter) q.set("entityType", entityFilter);
      if (search) q.set("search", search);

      const res = await fetch(`/api/documents?${q.toString()}`);
      const data = await res.json();
      setDocuments(data.data || []);
      setDocTypes(data.documentTypes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [statusFilter, entityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments();
  };

  // Open Upload Modal
  const handleOpenUpload = () => {
    setNewTitle("");
    setNewTypeId(docTypes[0]?.id || "");
    setNewEntityType("ORGANIZATION");
    setNewRef("");
    setNewIssueDate("");
    setNewExpiryDate("");
    setSelectedFile(null);
    setUploadModalOpen(true);
  };

  const handleConfirmUpload = () => {
    if (!selectedFile) {
      alert("Please select a PDF file.");
      return;
    }

    setActionTitle("Upload Legal Compliance Document");
    setTargetDescription(`${newTitle} (${selectedFile.name})`);

    setPendingAction(() => async (authPassword: string) => {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("title", newTitle);
      fd.append("documentTypeId", newTypeId);
      fd.append("entityType", newEntityType);
      fd.append("referenceNumber", newRef);
      if (newIssueDate) fd.append("issueDate", newIssueDate);
      if (newExpiryDate) fd.append("expiryDate", newExpiryDate);
      fd.append("authorizationPassword", authPassword);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadModalOpen(false);
      setAuthDialogOpen(false);
      await loadDocuments();
    });

    setAuthDialogOpen(true);
  };

  // Open Replace Version Modal
  const handleOpenReplace = (doc: any) => {
    setTargetDoc(doc);
    setReplaceFile(null);
    setReplaceNotes(`Renewal / Version replacement for ${doc.title}`);
    setReplaceExpiry(doc.expiryDate ? doc.expiryDate.split("T")[0] : "");
    setReplaceModalOpen(true);
  };

  const handleConfirmReplace = () => {
    if (!replaceFile || !targetDoc) {
      alert("Please select a new PDF version file.");
      return;
    }

    setActionTitle(`Replace Document Version (v${(targetDoc.currentVersion?.versionNumber || 1) + 1})`);
    setTargetDescription(`${targetDoc.title} - Preserving historical versions`);

    setPendingAction(() => async (authPassword: string) => {
      const fd = new FormData();
      fd.append("file", replaceFile);
      fd.append("notes", replaceNotes);
      if (replaceExpiry) fd.append("expiryDate", replaceExpiry);
      fd.append("authorizationPassword", authPassword);

      const res = await fetch(`/api/documents/${targetDoc.id}/versions`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Replacement failed");

      setReplaceModalOpen(false);
      setAuthDialogOpen(false);
      await loadDocuments();
    });

    setAuthDialogOpen(true);
  };

  // Open History Drawer
  const handleOpenHistory = async (doc: any) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`);
      const data = await res.json();
      setHistoryDoc(data);
      setHistoryDrawerOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141720] p-6 rounded-3xl border border-[#1e2433]">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5 rtl:space-x-reverse">
            <FileText className="w-5 h-5 text-rose-500" />
            <span>{t.documents.title}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t.documents.subtitle}
          </p>
        </div>

        <button
          onClick={handleOpenUpload}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 rtl:space-x-reverse shadow-lg shadow-rose-950/40 transition"
        >
          <Upload className="w-4 h-4" />
          <span>{t.documents.uploadDoc}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#141720] p-4 rounded-2xl border border-[#1e2433] flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.common.search}
            className="w-full bg-[#0c0e12] border border-[#1e2433] focus:border-rose-500 rounded-xl ps-9 rtl:ps-4 rtl:pe-9 pe-4 py-2 text-xs text-white placeholder-slate-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-500 absolute start-3 top-2.5 pointer-events-none" />
        </form>

        <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0c0e12] border border-[#1e2433] text-xs text-slate-300 rounded-xl px-3 py-2 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active (Valid)</option>
            <option value="EXPIRING_SOON">Expiring Soon (30 Days)</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-[#0c0e12] border border-[#1e2433] text-xs text-slate-300 rounded-xl px-3 py-2 outline-none"
          >
            <option value="">All Categories</option>
            <option value="ORGANIZATION">Organization Legal</option>
            <option value="BRANCH">Branch Permits</option>
            <option value="EMPLOYEE">Employee Identity</option>
          </select>
        </div>
      </div>

      {/* Documents Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
            <span>Loading compliance archive...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 bg-[#141720] border border-[#1e2433] rounded-3xl">
            {t.common.noData}
          </div>
        ) : (
          documents.map((doc) => {
            const isExpired = doc.status === "EXPIRED";
            const isExpiring = doc.status === "EXPIRING_SOON";

            return (
              <div
                key={doc.id}
                className={`p-5 bg-[#141720] border rounded-3xl transition-all duration-150 flex flex-col justify-between ${
                  isExpired
                    ? "border-rose-900/60 shadow-lg shadow-rose-950/20"
                    : isExpiring
                    ? "border-amber-900/60 shadow-lg shadow-amber-950/20"
                    : "border-[#1e2433] hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-rose-400">
                      {doc.documentType?.nameEn}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        isExpired
                          ? "bg-rose-950/40 text-rose-400 border-rose-800/40"
                          : isExpiring
                          ? "bg-amber-950/40 text-amber-400 border-amber-800/40"
                          : "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-2 mb-1.5">
                    {doc.title}
                  </h3>

                  <div className="text-[11px] text-slate-400 space-y-1 mb-4">
                    {doc.referenceNumber && (
                      <div className="font-mono text-slate-300">
                        Ref: {doc.referenceNumber}
                      </div>
                    )}
                    {doc.expiryDate && (
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-amber-400/90">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-slate-500">
                      <Layers className="w-3.5 h-3.5 text-rose-400" />
                      <span>Version: {doc.currentVersion?.versionNumber || 1}</span>
                      <span>•</span>
                      <span>{doc.currentVersion?.originalFilename || "document.pdf"}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-[#1e2433] flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setActiveDoc(doc);
                      setPdfViewerOpen(true);
                    }}
                    className="flex-1 py-1.5 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 rtl:space-x-reverse transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View PDF</span>
                  </button>

                  <button
                    onClick={() => handleOpenReplace(doc)}
                    className="p-2 hover:text-white text-slate-400 bg-[#0c0e12] border border-[#1e2433] rounded-xl hover:bg-slate-800 transition"
                    title="Replace with New Version (Audited)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenHistory(doc)}
                    className="p-2 hover:text-white text-slate-400 bg-[#0c0e12] border border-[#1e2433] rounded-xl hover:bg-slate-800 transition"
                    title="Inspect Version History & Checksums"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <FilePlus className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-white">Upload Compliance PDF</h3>
              </div>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Document Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Commercial Tenancy Contract 2026"
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Document Type *</label>
                  <select
                    value={newTypeId}
                    onChange={(e) => setNewTypeId(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                  >
                    {docTypes.map((dt) => (
                      <option key={dt.id} value={dt.id}>
                        {dt.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    placeholder="e.g. CN-1984210"
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={newIssueDate}
                    onChange={(e) => setNewIssueDate(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select PDF File *</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-600/20 file:text-rose-400 hover:file:bg-rose-600/30"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Enforces %PDF- magic bytes validation and SHA-256 integrity calculation.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={!newTitle || !selectedFile}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40 disabled:opacity-50"
              >
                Authorize & Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace Document Version Modal */}
      {replaceModalOpen && targetDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#141720] border border-[#1e2433] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2433] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Upload New Document Version</h3>
                <p className="text-xs text-rose-400 font-mono">Current: Version {targetDoc.currentVersion?.versionNumber || 1}</p>
              </div>
              <button onClick={() => setReplaceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#0c0e12] rounded-xl text-slate-400">
                Document: <strong className="text-white">{targetDoc.title}</strong>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Expiry Date</label>
                <input
                  type="date"
                  value={replaceExpiry}
                  onChange={(e) => setReplaceExpiry(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Version Notes / Reason</label>
                <input
                  type="text"
                  value={replaceNotes}
                  onChange={(e) => setReplaceNotes(e.target.value)}
                  placeholder="e.g. Annual commercial license renewal"
                  className="w-full bg-[#0c0e12] border border-[#1e2433] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">New PDF Attachment *</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                  className="w-full text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-600/20 file:text-rose-400 hover:file:bg-rose-600/30"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Previous version will remain accessible in historical audit records.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1e2433] flex items-center justify-end space-x-3 rtl:space-x-reverse">
              <button
                onClick={() => setReplaceModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReplace}
                disabled={!replaceFile}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40 disabled:opacity-50"
              >
                Authorize New Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Drawer */}
      {historyDrawerOpen && historyDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#141720] border-s border-[#1e2433] h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-6 bg-[#0f1218] border-b border-[#1e2433] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Document Version History</h3>
                <p className="text-xs text-rose-400 font-mono truncate max-w-md">
                  {historyDoc.document.title}
                </p>
              </div>
              <button
                onClick={() => setHistoryDrawerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-y-auto text-xs text-slate-300">
              <div className="space-y-3">
                {historyDoc.document.versions?.map((ver: any) => (
                  <div
                    key={ver.id}
                    className="p-4 bg-[#0c0e12] border border-[#1e2433] rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                        <Layers className="w-4 h-4 text-rose-400" />
                        <span>Version {ver.versionNumber}</span>
                        {historyDoc.document.currentVersionId === ver.id && (
                          <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-mono">
                            Current
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {new Date(ver.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      <div>File: <span className="font-mono text-white">{ver.originalFilename}</span></div>
                      <div>Uploaded By: <span className="text-slate-200">{ver.uploadedBy || "System"}</span></div>
                      {ver.notes && <div>Notes: <span className="text-slate-300">{ver.notes}</span></div>}
                    </div>

                    <div className="p-2 bg-slate-900/60 rounded-xl font-mono text-[10px] text-slate-500 break-all">
                      SHA-256: {ver.sha256}
                    </div>
                  </div>
                ))}
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
