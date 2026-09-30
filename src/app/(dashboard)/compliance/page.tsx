'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/context';
import { 
  ShieldCheck, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Building, 
  UserCheck, 
  ClipboardCheck, 
  Thermometer, 
  Plus, 
  Search,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { AuthorizationPasswordDialog } from '@/components/security/authorization-password-dialog';

interface InspectionFinding {
  id: string;
  category: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  description: string;
  correctiveAction: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  resolvedAt: string | null;
}

interface Inspection {
  id: string;
  inspectionType: string;
  inspectorName: string;
  inspectorEntity: string;
  inspectionDate: string;
  grade: string;
  score: number;
  status: string;
  branch: {
    nameEn: string;
  };
  findings: InspectionFinding[];
}

export default function CompliancePage() {
  const { t, language } = useI18n();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

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

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/food-safety/inspections');
      if (res.ok) {
        const data = await res.json();
        setInspections(data.inspections || []);
        if (data.inspections?.length > 0 && !selectedInspection) {
          setSelectedInspection(data.inspections[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load inspections', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const handleResolveFinding = (findingId: string) => {
    setAuthDialog({
      open: true,
      title: 'Authorize ADAFSA Finding Rectification',
      description: 'Marking a regulatory violation as resolved officially certifies corrective action compliance to authorities. Requires Level-2 Authorization Password.',
      actionName: 'RESOLVE_ADAFSA_FINDING',
      onSuccess: async (authPassword: string) => {
        const res = await fetch(`/api/food-safety/findings/${findingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'RESOLVED',
            authorizationPassword: authPassword
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update finding status');
        }

        await fetchInspections();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            ADAFSA Food Safety & Regulatory Compliance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Abu Dhabi Agriculture and Food Safety Authority inspections, EFST food handler certifications, and HACCP control points.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <Award className="h-4 w-4" />
            Consolidated Grade: Grade A (Excellent)
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ADAFSA Grade</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">Grade A</span>
            <span className="text-xs font-mono text-slate-400">96.5% Score</span>
          </div>
          <p className="text-[11px] text-slate-500">Official Abu Dhabi Municipality classification</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">EFST Certification</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">100%</span>
            <span className="text-xs text-slate-400">14/14 Staff</span>
          </div>
          <p className="text-[11px] text-slate-500">Essential Food Safety Training certified</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">HACCP Temperature Logs</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">Compliant</span>
          </div>
          <p className="text-[11px] text-slate-500">Chillers 2.4°C &middot; Freezers -19.2°C</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Corrective Actions</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-500">1</span>
            <span className="text-xs text-slate-400">Action Pending</span>
          </div>
          <p className="text-[11px] text-slate-500">Minor calibration label replacement</p>
        </div>
      </div>

      {/* Main Inspection Records & Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: List of Inspections */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-emerald-500" />
            Inspection History ({inspections.length})
          </h2>

          <div className="space-y-2.5">
            {inspections.map((insp) => (
              <div
                key={insp.id}
                onClick={() => setSelectedInspection(insp)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedInspection?.id === insp.id
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {insp.inspectionType}
                    </span>
                    <p className="text-xs text-slate-500">{insp.inspectorEntity} &middot; {insp.inspectorName}</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Grade {insp.grade}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>{new Date(insp.inspectionDate).toLocaleDateString('en-GB')}</span>
                  <span>{insp.branch?.nameEn}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Selected Inspection Details & Findings */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          {selectedInspection ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      Score: {selectedInspection.score}%
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedInspection.inspectionType}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Conducted by <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedInspection.inspectorName}</span> ({selectedInspection.inspectorEntity}) on {new Date(selectedInspection.inspectionDate).toLocaleDateString('en-GB')}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400">Branch Location</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedInspection.branch?.nameEn}
                  </p>
                </div>
              </div>

              {/* Findings Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                  Inspector Observations & Corrective Actions ({selectedInspection.findings.length})
                </h4>

                {selectedInspection.findings.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-400 text-xs">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    No violations or non-compliances recorded. Perfect inspection score!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedInspection.findings.map((f) => {
                      const isResolved = f.status === 'RESOLVED';
                      return (
                        <div
                          key={f.id}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                                f.severity === 'CRITICAL'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                                  : f.severity === 'MAJOR'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                              }`}>
                                {f.severity}
                              </span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {f.category}
                              </span>
                            </div>

                            {isResolved ? (
                              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                                Rectified
                              </span>
                            ) : (
                              <button
                                onClick={() => handleResolveFinding(f.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                              >
                                Mark Rectified (Auth)
                              </button>
                            )}
                          </div>

                          <div className="text-xs space-y-1">
                            <p className="text-slate-900 dark:text-white font-medium">
                              <span className="text-slate-400">Observation:</span> {f.description}
                            </p>
                            <p className="text-emerald-700 dark:text-emerald-400">
                              <span className="text-slate-400">Required Action:</span> {f.correctiveAction}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">
              Select an inspection to inspect observations.
            </div>
          )}
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
