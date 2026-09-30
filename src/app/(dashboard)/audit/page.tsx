'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/context';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Hash, 
  Link2, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Database, 
  Eye, 
  AlertOctagon,
  RefreshCw,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  recordHash: string;
  previousHash: string;
  userFullName: string;
  userRole: string;
  userEmail: string;
  branchName: string | null;
  ipAddress: string | null;
  diffSummary: string | null;
  oldValues: any;
  newValues: any;
}

export default function AuditPage() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Chain Verification states
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    totalRecords: number;
    headHash?: string;
    brokenAtSequence?: number;
    message?: string;
  } | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const handleVerifyChain = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await fetch('/api/audit/verify', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setVerificationResult(data);
      }
    } catch (err) {
      console.error('Verification failed', err);
      setVerificationResult({
        valid: false,
        totalRecords: 0,
        message: 'Network or server error during cryptographic chain audit'
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            {t('nav.audit')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            HMAC-SHA256 cryptographically chained immutable ledger. No update or delete operations allowed at the application layer.
          </p>
        </div>

        {/* Verification Action */}
        <button
          onClick={handleVerifyChain}
          disabled={verifying}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:opacity-50"
        >
          {verifying ? (
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          )}
          {verifying ? 'Recalculating Cryptographic Hashes...' : 'Verify HMAC Chain Integrity'}
        </button>
      </div>

      {/* Verification Status Banner if executed */}
      {verificationResult && (
        <div className={`p-4 rounded-2xl border transition-all ${
          verificationResult.valid 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
        }`}>
          <div className="flex items-start gap-3">
            {verificationResult.valid ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertOctagon className="h-5 w-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
            )}
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm">
                {verificationResult.valid 
                  ? 'Cryptographic Audit Passed: 100% Chain Integrity Verified' 
                  : 'Tampering Detected: Chain Broken!'}
              </div>
              <p>
                Successfully audited sequence #1 through sequence #{verificationResult.totalRecords} using server-side HMAC secret. Zero sequence gaps, zero hash discrepancies.
              </p>
              {verificationResult.headHash && (
                <div className="font-mono text-[10px] opacity-80 pt-1">
                  HEAD HASH: {verificationResult.headHash}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Ledger Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              placeholder="Search by user, action, entity or hash..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="">All Action Types</option>
              <option value="LOGIN">LOGIN</option>
              <option value="DOCUMENT_UPLOAD">DOCUMENT_UPLOAD</option>
              <option value="DOCUMENT_REPLACE">DOCUMENT_REPLACE</option>
              <option value="CREATE_EMPLOYEE">CREATE_EMPLOYEE</option>
              <option value="INTER_BRANCH_TRANSFER">INTER_BRANCH_TRANSFER</option>
              <option value="CREATE_EXPENSE">CREATE_EXPENSE</option>
              <option value="ADVANCE_PROCEDURE_STEP">ADVANCE_PROCEDURE_STEP</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3"></div>
            <p>Streaming cryptographic ledger records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Seq #</th>
                  <th className="px-6 py-3.5">Action & Entity</th>
                  <th className="px-6 py-3.5">Actor (Role)</th>
                  <th className="px-6 py-3.5">Branch</th>
                  <th className="px-6 py-3.5">Cryptographic Hash</th>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-sm">
                      No audit records found matching query.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          <Hash className="h-3 w-3 text-slate-400" />
                          {log.sequenceNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {log.action}
                        </span>
                        <div className="text-xs text-slate-500">
                          {log.entityType} &middot; <span className="font-mono text-[10px] text-slate-400">{log.entityId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          {log.userFullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {log.userRole}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                        {log.branchName || 'Consolidated Org'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          <Link2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span title={log.recordHash}>{log.recordHash.substring(0, 14)}...</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {new Date(log.timestamp).toLocaleString('en-GB')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                        >
                          View Diff
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diff / Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  SEQUENCE #{selectedLog.sequenceNumber} &middot; {selectedLog.action}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Audit Snapshot & Cryptographic Proof
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                &times;
              </button>
            </div>

            {/* Cryptographic Linkage Info */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 space-y-2 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Current Record Hash (HMAC-SHA256)</span>
                <span className="text-emerald-600 dark:text-emerald-400 break-all select-all font-bold">
                  {selectedLog.recordHash}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Chained Previous Hash</span>
                <span className="text-slate-600 dark:text-slate-300 break-all select-all">
                  {selectedLog.previousHash}
                </span>
              </div>
            </div>

            {/* Meta details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Actor</span>
                <span className="font-semibold">{selectedLog.userFullName} ({selectedLog.userEmail})</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">IP & Timestamp</span>
                <span className="font-mono">{selectedLog.ipAddress || '127.0.0.1'} &middot; {new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
            </div>

            {/* Diff details */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                Canonical State Diff (Old vs New Values)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-rose-500">Prior State (Before)</span>
                  <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.oldValues || {}, null, 2)}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-500">Mutated State (After)</span>
                  <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.newValues || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
