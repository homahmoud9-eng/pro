'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/context';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Package, 
  Users, 
  CheckCircle2, 
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface ExpiryItem {
  id: string;
  title: string;
  type: string;
  category: string;
  expiryDate: string;
  daysRemaining: number;
  entityName: string;
  link: string;
}

export default function NotificationsPage() {
  const { language, t } = useI18n();
  const [notifications, setNotifications] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate notification list from dynamic document expiry tracking
    async function loadAlerts() {
      setLoading(true);
      try {
        const [docRes, invRes] = await Promise.all([
          fetch('/api/documents'),
          fetch('/api/inventory')
        ]);

        const alerts: ExpiryItem[] = [];

        if (docRes.ok) {
          const docData = await docRes.json();
          const now = new Date();
          (docData.documents || []).forEach((doc: any) => {
            if (doc.expiryDate) {
              const exp = new Date(doc.expiryDate);
              const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays <= 90) {
                alerts.push({
                  id: doc.id,
                  title: doc.documentType?.nameEn || 'Legal Document',
                  type: 'DOCUMENT_EXPIRY',
                  category: diffDays <= 30 ? 'CRITICAL' : diffDays <= 60 ? 'WARNING' : 'INFO',
                  expiryDate: doc.expiryDate,
                  daysRemaining: diffDays,
                  entityName: doc.branch?.nameEn || 'Corporate',
                  link: '/documents'
                });
              }
            }
          });
        }

        if (invRes.ok) {
          const invData = await invRes.json();
          (invData.items || []).forEach((item: any) => {
            if (item.currentStock <= item.minimumStock) {
              alerts.push({
                id: item.id,
                title: `Low Stock: ${item.nameEn}`,
                type: 'INVENTORY_ALERT',
                category: 'WARNING',
                expiryDate: new Date().toISOString(),
                daysRemaining: 0,
                entityName: `${item.branch?.nameEn} (${item.currentStock} ${item.primaryUnit} left)`,
                link: '/operations'
              });
            }
          });
        }

        setNotifications(alerts);
      } catch (err) {
        console.error('Failed to load notifications', err);
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          {t.notifications.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t.notifications.subtitle}
        </p>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {language === 'ar' ? `التنبيهات النشطة واستحقاقات التجديد (${notifications.length})` : `Active Alerts & Expiry Triggers (${notifications.length})`}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3"></div>
            <p>{t.notifications.scanning}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">{t.notifications.allCompliant}</p>
            <p className="text-xs">{t.notifications.allCompliantDesc}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((alert) => (
              <div
                key={alert.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    alert.category === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}>
                    {alert.type === 'DOCUMENT_EXPIRY' ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        alert.category === 'CRITICAL'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200'
                      }`}>
                        {alert.category === 'CRITICAL' ? t.notifications.critical : t.notifications.warning}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {alert.title}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-500">
                      {t.notifications.scope} <span className="font-semibold text-slate-700 dark:text-slate-300">{alert.entityName}</span>
                    </p>

                    {alert.type === 'DOCUMENT_EXPIRY' && (
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pt-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{t.notifications.expires} {new Date(alert.expiryDate).toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-GB')}</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          ({alert.daysRemaining <= 0 ? t.notifications.expiredAlert : (language === 'ar' ? `متبقي ${alert.daysRemaining} يوماً` : `${alert.daysRemaining} days remaining`)})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  href={alert.link}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors self-end md:self-center shrink-0"
                >
                  {t.notifications.inspectRecord}
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
