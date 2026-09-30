'use client';

import React, { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { 
  FileSpreadsheet, 
  Download, 
  Building, 
  Users, 
  ShieldCheck, 
  DollarSign, 
  Package, 
  Calendar,
  Lock,
  FileCheck
} from 'lucide-react';
import { AuthorizationPasswordDialog } from '@/components/security/authorization-password-dialog';

export default function ReportsPage() {
  const { t } = useI18n();
  const [exporting, setExporting] = useState<string | null>(null);

  const [authDialog, setAuthDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionName: string;
    onSuccess: (authPass: string) => Promise<void>;
  }>({
    open: false,
    title: '',
    description: '',
    actionName: '',
    onSuccess: async () => {}
  });

  const handleExportData = (reportType: string, reportTitle: string) => {
    setAuthDialog({
      open: true,
      title: `Authorize Data Export: ${reportTitle}`,
      description: 'Exporting confidential business records requires Level-2 Authorization Password and generates an immutable audit record.',
      actionName: `EXPORT_${reportType}`,
      onSuccess: async (authPassword: string) => {
        setExporting(reportType);
        try {
          // Fetch real data to construct download
          let endpoint = '/api/employees';
          if (reportType === 'FINANCE') endpoint = '/api/finance/expenses';
          if (reportType === 'INVENTORY') endpoint = '/api/inventory';
          if (reportType === 'COMPLIANCE') endpoint = '/api/food-safety/inspections';

          const res = await fetch(endpoint);
          const data = await res.json();
          
          // Generate CSV blob
          const jsonStr = JSON.stringify(data, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `TASHA_${reportType}_EXPORT_${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (err) {
          console.error('Export failed', err);
          alert('Export failed');
        } finally {
          setExporting(null);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          {t('nav.reports')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Regulatory summaries, financial compliance records, and audited corporate data exports.
        </p>
      </div>

      {/* Reports Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Report 1: HR & Payroll Compliance */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              MOHRE / SIF FORMAT
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              HR & Wages Protection System (WPS) Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Active workforce headcount, monthly salary breakdowns, basic allowances, and bank routing numbers for Central Bank of the UAE WPS filing.
            </p>
          </div>

          <button
            onClick={() => handleExportData('HR_WPS', 'HR & WPS Payroll Ledger')}
            disabled={exporting === 'HR_WPS'}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting === 'HR_WPS' ? 'Exporting...' : 'Export Audited Ledger (Auth Required)'}
          </button>
        </div>

        {/* Report 2: Financial & VAT 201 Return */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              FTA FORM 201
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Federal Tax Authority (FTA) 5% VAT Report
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Taxable supplies breakdown across Abu Dhabi branches, input VAT credits on commercial invoices, and net tax liability.
            </p>
          </div>

          <button
            onClick={() => handleExportData('FINANCE', 'FTA 5% VAT Report')}
            disabled={exporting === 'FINANCE'}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting === 'FINANCE' ? 'Exporting...' : 'Export Audited Report (Auth Required)'}
          </button>
        </div>

        {/* Report 3: ADAFSA Food Safety Dossier */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              ADAFSA ARCHIVE
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              ADAFSA Food Safety & Inspection History
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Inspection certificates, corrective action resolution logs, and EFST training validity reports across all restaurant kitchens.
            </p>
          </div>

          <button
            onClick={() => handleExportData('COMPLIANCE', 'ADAFSA Inspection Dossier')}
            disabled={exporting === 'COMPLIANCE'}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting === 'COMPLIANCE' ? 'Exporting...' : 'Export Audited Dossier (Auth Required)'}
          </button>
        </div>

        {/* Report 4: Inventory & Food Cost Valuation */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Package className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              ERP VALUATION
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Inventory Asset Valuation & Food Cost Report
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Real-time stock valuation in AED, theoretical vs actual recipe consumption variances, and monthly spoilage register.
            </p>
          </div>

          <button
            onClick={() => handleExportData('INVENTORY', 'Inventory & Food Cost Report')}
            disabled={exporting === 'INVENTORY'}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting === 'INVENTORY' ? 'Exporting...' : 'Export Audited Report (Auth Required)'}
          </button>
        </div>
      </div>

      {/* Global Auth Dialog */}
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
