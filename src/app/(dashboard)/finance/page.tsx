'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/context';
import { 
  DollarSign, 
  Wallet, 
  Receipt, 
  CreditCard, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft,
  CheckCircle,
  Clock,
  Building,
  ShieldCheck,
  TrendingUp,
  Percent
} from 'lucide-react';
import { AuthorizationPasswordDialog } from '@/components/security/authorization-password-dialog';

interface WalletAccount {
  id: string;
  name: string;
  type: string;
  accountNumber: string | null;
  balance: number;
  currency: string;
  branch: {
    nameEn: string;
  } | null;
}

interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  description: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  expenseDate: string;
  vendorName: string | null;
  trn: string | null;
  branch: {
    nameEn: string;
  };
  approvedBy: {
    fullName: string;
  } | null;
}

interface Payment {
  id: string;
  paymentNumber: string;
  type: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  paidAt: string;
  wallet: {
    name: string;
  };
  supplier: {
    nameEn: string;
  } | null;
}

interface VatReport {
  taxYear: number;
  quarter: string;
  outputVat: number;
  inputVat: number;
  netVatDue: number;
  status: string;
}

export default function FinancePage() {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'payments' | 'tax'>('overview');

  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vatReport, setVatReport] = useState<VatReport | null>(null);
  const [branches, setBranches] = useState<{ id: string; nameEn: string; nameAr: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; legalName: string; tradingName?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Auth Dialog
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'MUNICIPALITY_FEES',
    description: '',
    amount: 0,
    vatAmount: 0,
    branchId: '',
    vendorName: '',
    trn: '',
    paymentMethod: 'CORPORATE_CARD'
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    walletId: '',
    type: 'SUPPLIER_INVOICE',
    amount: 0,
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    supplierId: '',
    description: 'Invoice settlement'
  });

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

  const fetchData = async () => {
    setLoading(true);
    try {
      // Always load branches and suppliers for forms and lookups
      const [bRes, sRes] = await Promise.all([
        fetch('/api/business'),
        fetch('/api/suppliers')
      ]);
      if (bRes.ok) {
        const bData = await bRes.json();
        const branchList = bData.branches || [];
        setBranches(branchList);
        if (branchList.length > 0 && !expenseForm.branchId) {
          setExpenseForm(prev => ({ ...prev, branchId: branchList[0].id }));
        }
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        const suppList = sData.data || sData.suppliers || [];
        setSuppliers(suppList);
      }

      if (activeTab === 'overview') {
        const [wRes, eRes, pRes] = await Promise.all([
          fetch('/api/finance/wallet'),
          fetch('/api/finance/expenses'),
          fetch('/api/finance/payments')
        ]);
        if (wRes.ok) {
          const data = await wRes.json();
          const wList = data.wallets || [];
          setWallets(wList);
          if (wList.length > 0 && !paymentForm.walletId) {
            setPaymentForm(prev => ({ ...prev, walletId: wList[0].id }));
          }
        }
        if (eRes.ok) {
          const data = await eRes.json();
          setExpenses(data.expenses || data.data || []);
        }
        if (pRes.ok) {
          const data = await pRes.json();
          setPayments(data.payments || data.data || []);
        }
      } else if (activeTab === 'expenses') {
        const res = await fetch('/api/finance/expenses');
        if (res.ok) {
          const data = await res.json();
          setExpenses(data.expenses || data.data || []);
        }
      } else if (activeTab === 'payments') {
        const res = await fetch('/api/finance/payments');
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments || data.data || []);
        }
      } else if (activeTab === 'tax') {
        const res = await fetch('/api/finance/tax');
        if (res.ok) {
          const data = await res.json();
          setVatReport(data.vatReport || null);
        }
      }
    } catch (err) {
      console.error('Failed to load finance data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Handle Expense Creation
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthDialog({
      open: true,
      title: 'Authorize Expense Booking',
      description: 'Disbursing operational funds commits corporate liability and requires Level-2 Authorization Password.',
      actionName: 'CREATE_EXPENSE',
      onSuccess: async (authPassword: string) => {
        const res = await fetch('/api/finance/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...expenseForm,
            totalAmount: expenseForm.amount + expenseForm.vatAmount,
            authorizationPassword: authPassword
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to record expense');
        }

        setShowExpenseModal(false);
        fetchData();
      }
    });
  };

  // Handle Payment Creation
  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthDialog({
      open: true,
      title: 'Authorize Financial Disbursement',
      description: 'Disbursing corporate liquidity to vendors requires Level-2 Authorization Password.',
      actionName: 'CREATE_PAYMENT',
      onSuccess: async (authPassword: string) => {
        const res = await fetch('/api/finance/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...paymentForm,
            authorizationPassword: authPassword
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to process payment');
        }

        setShowPaymentModal(false);
        fetchData();
      }
    });
  };

  const totalLiquidity = wallets.reduce((acc, w) => acc + w.balance, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            {t('nav.finance')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Corporate liquidity, branch expense claims, vendor settlements, and UAE Federal Tax Authority (FTA) 5% VAT returns.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'overview' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Wallet className="h-4 w-4 text-emerald-500" />
            {t.finance.walletOverview}
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'expenses' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Receipt className="h-4 w-4 text-blue-500" />
            {t('finance.expenses')}
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'payments' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CreditCard className="h-4 w-4 text-purple-500" />
            {t('finance.payments')}
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'tax' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Percent className="h-4 w-4 text-amber-500" />
            {t.finance.vatRecords}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Action Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            {language === 'ar' ? 'عمليات مالية معتمدة بمستوى الحماية الثنائي' : 'Two-Level Authorized Financial Operations'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.finance.addExpense}
            </button>
            <button
              onClick={() => {
                if (wallets.length > 0) setPaymentForm(p => ({ ...p, walletId: wallets[0].id }));
                setShowPaymentModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.finance.addPayment}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3"></div>
            <p>{t.finance.loading}</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* 1. TREASURY / WALLETS OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Liquidity summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg space-y-2">
                    <div className="flex items-center justify-between opacity-80 text-xs font-semibold uppercase tracking-wider">
                      <span>{t.finance.totalConsolidatedLiquidity}</span>
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div className="text-3xl font-extrabold font-mono">
                      AED {totalLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] opacity-80">{t.finance.liquiditySubtext}</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <span>{t.finance.monthExpensesBooked}</span>
                      <Receipt className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                      AED {expenses.reduce((a, b) => a + b.totalAmount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-slate-400">{expenses.length} {t.finance.auditedExpenseVouchers}</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <span>{t.finance.vendorSettlementsPaid}</span>
                      <CreditCard className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                      AED {payments.reduce((a, b) => a + b.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-slate-400">{payments.length} {t.finance.disbursedPaymentsCount}</p>
                  </div>
                </div>

                {/* Wallets Cards */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-500" />
                    {t.finance.authorizedAccountsVaults}
                  </h3>
                  {wallets.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                      {language === 'ar' ? 'لا توجد حسابات أو خزائن مسجلة حاليًا' : 'No registered accounts or vaults currently'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {wallets.map((w) => (
                        <div key={w.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {w.type}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{w.name}</h4>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">{w.branch?.nameEn || (language === 'ar' ? 'عام / المقر' : 'Corporate')}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{t.finance.availableBalance}</span>
                            <p className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {w.currency} {w.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            {w.accountNumber && (
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">IBAN: {w.accountNumber}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. EXPENSES TAB */}
            {activeTab === 'expenses' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">{t.finance.voucherNumber}</th>
                      <th className="px-6 py-3.5">{t.finance.categoryAndDesc}</th>
                      <th className="px-6 py-3.5">{t.finance.branch}</th>
                      <th className="px-6 py-3.5">{t.finance.vendorTrn}</th>
                      <th className="px-6 py-3.5">{t.finance.netAmount}</th>
                      <th className="px-6 py-3.5">{t.finance.vat}</th>
                      <th className="px-6 py-3.5">{t.finance.totalAed}</th>
                      <th className="px-6 py-3.5">{t.common.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                          {language === 'ar' ? 'لا توجد مصروفات مسجلة حاليًا' : 'No recorded expenses currently'}
                        </td>
                      </tr>
                    ) : (
                      expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold">
                            {e.expenseNumber}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{e.description}</div>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{e.category}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {e.branch?.nameEn}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white">{e.vendorName || 'N/A'}</div>
                            {e.trn && <div className="text-[10px] font-mono text-slate-400">TRN: {e.trn}</div>}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                            AED {e.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-amber-600 dark:text-amber-400">
                            AED {e.vatAmount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                            AED {e.totalAmount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. PAYMENTS TAB */}
            {activeTab === 'payments' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">{t.finance.paymentNumber}</th>
                      <th className="px-6 py-3.5">{t.finance.disbursementSource}</th>
                      <th className="px-6 py-3.5">{t.finance.recipientSupplier}</th>
                      <th className="px-6 py-3.5">{t.finance.methodAndRef}</th>
                      <th className="px-6 py-3.5">{t.finance.amountDisbursed}</th>
                      <th className="px-6 py-3.5">{t.finance.timestamp}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                          {language === 'ar' ? 'لا توجد مدفوعات مسجلة حاليًا' : 'No recorded payments currently'}
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                            {p.paymentNumber}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-xs">
                            {p.wallet?.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-900 dark:text-white text-xs">
                              {p.supplier?.nameEn || (language === 'ar' ? 'تسوية مباشرة' : 'Direct Settlement')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{p.paymentMethod}</div>
                            {p.referenceNumber && (
                              <div className="text-[10px] font-mono text-slate-400">{p.referenceNumber}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                            AED {p.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">
                            {new Date(p.paidAt).toLocaleString(language === 'ar' ? 'ar-AE' : 'en-GB')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. UAE 5% VAT RETURN TAB */}
            {activeTab === 'tax' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-900 dark:text-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <Percent className="h-5 w-5 text-amber-500" />
                        {language === 'ar' ? 'إقرار ضريبة القيمة المضافة لهيئة الضرائب الاتحادية' : 'UAE Federal Tax Authority (FTA) VAT Return'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {language === 'ar' ? 'احتساب ضريبة القيمة المضافة بنسبة 5% بموجب المرسوم بقانون اتحادي رقم 8 لسنة 2017' : 'Statutory 5% Value Added Tax calculation under UAE Federal Decree-Law No. 8 of 2017'}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-amber-500 text-white font-bold text-xs rounded-full">
                      Q1 {vatReport?.taxYear || 2026}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-amber-500/20">
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-xs text-slate-400 uppercase font-semibold">{t.finance.outputVat5}</span>
                      <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                        AED {(vatReport?.outputVat ?? 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-xs text-slate-400 uppercase font-semibold">{t.finance.inputVat5}</span>
                      <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                        AED {(vatReport?.inputVat ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-90">{t.finance.netPayableFta}</span>
                      <div className="text-2xl font-mono font-extrabold">
                        AED {(vatReport?.netVatDue ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-xs font-bold rounded-lg">
                      {t.common.status}: {vatReport?.status || 'ACCRUED'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.finance.bookBranchExpenseModal}</h3>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {language === 'ar' ? 'الفرع' : 'Branch'}
                </label>
                <select
                  value={expenseForm.branchId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, branchId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {branches.length === 0 ? (
                    <option value="">{language === 'ar' ? 'لا توجد فروع مسجلة' : 'No registered branches'}</option>
                  ) : (
                    branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {language === 'ar' ? b.nameAr || b.nameEn : b.nameEn}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {t.finance.category}
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="MUNICIPALITY_FEES">{t.finance.catMunicipality}</option>
                  <option value="UTILITIES">{t.finance.catUtilities}</option>
                  <option value="KITCHEN_MAINTENANCE">{t.finance.catMaintenance}</option>
                  <option value="PACKAGING">{t.finance.catPackaging}</option>
                  <option value="CLEANING_SUPPLIES">{t.finance.catSanitization}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {t.common.description}
                </label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required
                  placeholder={t.finance.expenseDescPlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    {t.finance.netAmount} (AED)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseForm.amount || ''}
                    onChange={(e) => {
                      const net = parseFloat(e.target.value) || 0;
                      setExpenseForm({ ...expenseForm, amount: net, vatAmount: net * 0.05 });
                    }}
                    required
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    {t.finance.vat} (AED)
                  </label>
                  <input
                    type="number"
                    value={expenseForm.vatAmount}
                    readOnly
                    className="w-full px-3.5 py-2 text-sm bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!expenseForm.branchId}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-sm"
                >
                  {t.security.nextEnterAuthPassword}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.finance.disburseVendorPaymentModal}</h3>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {t.finance.disbursementSource}
                </label>
                <select
                  value={paymentForm.walletId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, walletId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {wallets.length === 0 ? (
                    <option value="">{language === 'ar' ? 'لا توجد حسابات متاحة' : 'No available accounts'}</option>
                  ) : (
                    wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} &mdash; {t.finance.availableBalance}: AED {w.balance.toLocaleString('en-US')}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {language === 'ar' ? 'المورد المستفيد' : 'Beneficiary Supplier'}
                </label>
                <select
                  value={paymentForm.supplierId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, supplierId: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="">{language === 'ar' ? 'تسوية مباشرة (بدون مورد)' : 'Direct Settlement (No Supplier)'}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.legalName} {s.tradingName ? `(${s.tradingName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {t.finance.amount} (AED)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {t.finance.methodAndRef}
                </label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  placeholder={t.finance.paymentRefPlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!paymentForm.walletId}
                  className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl shadow-sm"
                >
                  {t.security.nextEnterAuthPassword}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
