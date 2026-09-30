"use client";

import React, { useState } from "react";
import { useI18n } from "@/i18n/context";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  ShieldCheck,
  Calendar,
  Layers,
} from "lucide-react";

interface PdfViewerModalProps {
  isOpen: boolean;
  documentId: string;
  documentTitle: string;
  referenceNumber?: string | null;
  versionNumber?: number;
  expiryDate?: string | null;
  canDownload?: boolean;
  onClose: () => void;
}

export function PdfViewerModal({
  isOpen,
  documentId,
  documentTitle,
  referenceNumber,
  versionNumber = 1,
  expiryDate,
  canDownload = false,
  onClose,
}: PdfViewerModalProps) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen) return null;

  const pdfUrl = `/api/documents/${documentId}/view`;
  const downloadUrl = `/api/documents/${documentId}/download`;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 20, 60));
  const handleToggleFullscreen = () => setIsFullscreen((prev) => !prev);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md ${
        isFullscreen ? "p-0" : "p-3 sm:p-6"
      }`}
    >
      <div
        className={`w-full bg-[#141720] border border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? "h-screen rounded-none"
            : "max-w-5xl h-[88vh] rounded-2xl"
        }`}
      >
        {/* Header Toolbar */}
        <div className="bg-[#0f1218] border-b border-slate-800 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
            <div className="p-2 bg-rose-600/20 text-rose-500 rounded-lg flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate max-w-md">
                {documentTitle}
              </h3>
              <div className="flex items-center space-x-2.5 rtl:space-x-reverse text-xs text-slate-400">
                <span className="flex items-center space-x-1 rtl:space-x-reverse">
                  <Layers className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t.pdfViewer.version} {versionNumber}</span>
                </span>
                {referenceNumber && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{referenceNumber}</span>
                  </>
                )}
                {expiryDate && (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1 rtl:space-x-reverse text-amber-400">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {t.pdfViewer.expires} {new Date(expiryDate).toLocaleDateString()}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Viewer Controls */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="flex items-center bg-[#0c0e12] border border-slate-800 rounded-xl px-2 py-1 space-x-1 rtl:space-x-reverse text-slate-300">
              <button
                onClick={handleZoomOut}
                title={t.pdfViewer.zoomOut}
                className="p-1.5 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-1.5">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                title={t.pdfViewer.zoomIn}
                className="p-1.5 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleToggleFullscreen}
              title={t.pdfViewer.toggleFullscreen}
              className="p-2 bg-[#0c0e12] border border-slate-800 hover:text-white text-slate-400 rounded-xl hover:bg-slate-800 transition"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {canDownload && (
              <a
                href={downloadUrl}
                download
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 rtl:space-x-reverse transition shadow-md shadow-rose-950/40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.common.download}</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Body Container */}
        <div className="flex-1 bg-[#090b0e] relative overflow-auto flex items-center justify-center p-2 sm:p-4">
          <div
            className="w-full h-full transition-transform duration-150 ease-out origin-top flex justify-center"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full rounded-lg shadow-2xl border border-slate-800 bg-white"
              title={documentTitle}
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-[#0f1218] border-t border-slate-800/80 px-5 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 rtl:space-x-reverse text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.pdfViewer.secureViewer}</span>
          </div>
          <div>ID: {documentId.slice(0, 8)}...</div>
        </div>
      </div>
    </div>
  );
}
