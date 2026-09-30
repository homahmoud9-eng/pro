'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/context';
import { 
  Package, 
  UtensilsCrossed, 
  Trash2, 
  Building, 
  ArrowRightLeft, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle,
  TrendingDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { AuthorizationPasswordDialog } from '@/components/security/authorization-password-dialog';

interface InventoryItem {
  id: string;
  itemCode: string;
  nameEn: string;
  nameAr: string;
  category: string;
  primaryUnit: string;
  currentStock: number;
  minimumStock: number;
  costPerUnit: number;
  branch: {
    id: string;
    nameEn: string;
  };
}

interface Recipe {
  id: string;
  menuItemCode: string;
  nameEn: string;
  nameAr: string;
  category: string;
  sellingPrice: number;
  portionCost: number;
  foodCostPct: number;
  items: Array<{
    id: string;
    quantity: number;
    unit: string;
    cost: number;
    inventoryItem: {
      nameEn: string;
      nameAr: string;
      primaryUnit: string;
    };
  }>;
}

interface WasteRecord {
  id: string;
  reason: string;
  quantity: number;
  totalCost: number;
  recordedAt: string;
  inventoryItem: {
    nameEn: string;
    primaryUnit: string;
  };
  branch: {
    nameEn: string;
  };
  recordedBy: {
    fullName: string;
  };
}

interface Supplier {
  id: string;
  supplierCode: string;
  nameEn: string;
  nameAr: string;
  category: string;
  contactPerson: string | null;
  phone: string;
  email: string | null;
  trn: string | null;
  paymentTerms: string;
  balance: number;
  status: string;
}

export default function OperationsPage() {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState<'inventory' | 'recipes' | 'waste' | 'suppliers'>('inventory');
  
  // Data states
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals & Auth Dialog
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    itemId: '',
    targetBranchId: '',
    quantity: 1,
    notes: 'Standard replenishment'
  });
  
  const [showNewWasteModal, setShowNewWasteModal] = useState(false);
  const [wasteData, setWasteData] = useState({
    inventoryItemId: '',
    branchId: '',
    quantity: 1,
    reason: 'EXPIRED',
    notes: ''
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
      if (activeTab === 'inventory') {
        const res = await fetch('/api/inventory');
        if (res.ok) {
          const data = await res.json();
          setInventory(data.items || []);
        }
      } else if (activeTab === 'recipes') {
        const res = await fetch('/api/recipes');
        if (res.ok) {
          const data = await res.json();
          setRecipes(data.recipes || []);
        }
      } else if (activeTab === 'waste') {
        const res = await fetch('/api/waste');
        if (res.ok) {
          const data = await res.json();
          setWasteRecords(data.wasteRecords || []);
        }
      } else if (activeTab === 'suppliers') {
        const res = await fetch('/api/suppliers');
        if (res.ok) {
          const data = await res.json();
          setSuppliers(data.suppliers || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch operations data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Initiate atomic transfer
  const handleInitiateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.itemId || !transferData.targetBranchId) {
      alert('Please fill all transfer fields');
      return;
    }

    setAuthDialog({
      open: true,
      title: 'Authorize Stock Transfer',
      description: 'Transferring stock between branches alters inventory balance and requires Level-2 Authorization Password.',
      actionName: 'STOCK_TRANSFER',
      onSuccess: async (authPassword: string) => {
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...transferData,
            authorizationPassword: authPassword
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to complete stock transfer');
        }

        setShowTransferModal(false);
        fetchData();
      }
    });
  };

  // Record Waste
  const handleRecordWaste = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthDialog({
      open: true,
      title: 'Authorize Waste Registration',
      description: 'Registering inventory write-off impacts cost-of-goods-sold and requires Level-2 Authorization Password.',
      actionName: 'RECORD_WASTE',
      onSuccess: async (authPassword: string) => {
        const res = await fetch('/api/waste', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...wasteData,
            authorizationPassword: authPassword
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to record waste');
        }

        setShowNewWasteModal(false);
        fetchData();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            {t.operations.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t.operations.subtitle}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'inventory' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Package className="h-4 w-4 text-emerald-500" />
            {t.operations.inventory}
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'recipes' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="h-4 w-4 text-amber-500" />
            {t.operations.recipes}
          </button>
          <button
            onClick={() => setActiveTab('waste')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'waste' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Trash2 className="h-4 w-4 text-rose-500" />
            {t.operations.waste}
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'suppliers' 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building className="h-4 w-4 text-blue-500" />
            {t.operations.suppliers}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Subheader Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.operations.searchPlaceholder}
              className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'inventory' && (
              <button
                onClick={() => setShowTransferModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                <ArrowRightLeft className="h-4 w-4" />
                {t.operations.interBranchTransferTitle}
              </button>
            )}
            {activeTab === 'waste' && (
              <button
                onClick={() => setShowNewWasteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                {t.operations.recordWasteTitle}
              </button>
            )}
          </div>
        </div>

        {/* Content by Tab */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3"></div>
            <p>{t.operations.loading}</p>
          </div>
        ) : (
          <>
            {/* 1. INVENTORY TAB */}
            {activeTab === 'inventory' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">{t.operations.itemCodeAndName}</th>
                      <th className="px-6 py-3.5">{t.common.category}</th>
                      <th className="px-6 py-3.5">{t.operations.branchCol}</th>
                      <th className="px-6 py-3.5">{t.operations.currentStock}</th>
                      <th className="px-6 py-3.5">{t.operations.unitCost}</th>
                      <th className="px-6 py-3.5">{t.operations.totalValue}</th>
                      <th className="px-6 py-3.5">{t.common.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {inventory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-sm">
                          {t.operations.noInventoryRecorded}
                        </td>
                      </tr>
                    ) : (
                      inventory.map((item) => {
                        const isLowStock = item.currentStock <= item.minimumStock;
                        const totalValue = item.currentStock * item.costPerUnit;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {language === 'ar' ? item.nameAr : item.nameEn}
                              </div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                {item.itemCode}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs font-medium">
                              {item.branch?.nameEn || 'Central'}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                              {item.currentStock} {item.primaryUnit}
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                              AED {item.costPerUnit.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                              AED {totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4">
                              {isLowStock ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {language === 'ar' ? `مخزون منخفض (≤ ${item.minimumStock})` : `Low Stock (≤ ${item.minimumStock})`}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  {t.operations.optimalBadge}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. RECIPES TAB (Food Cost Analysis) */}
            {activeTab === 'recipes' && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recipes.map((recipe) => {
                    const margin = recipe.sellingPrice - recipe.portionCost;
                    const marginPct = recipe.sellingPrice > 0 ? ((margin / recipe.sellingPrice) * 100).toFixed(1) : 0;
                    const isOptimalFoodCost = recipe.foodCostPct <= 30; // standard UAE F&B benchmark: <= 30-32%
                    
                    return (
                      <div key={recipe.id} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                              {recipe.menuItemCode}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                              {language === 'ar' ? recipe.nameAr : recipe.nameEn}
                            </h3>
                            <span className="text-xs text-slate-400 font-medium">{recipe.category}</span>
                          </div>
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                            isOptimalFoodCost 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' 
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}>
                            FC: {recipe.foodCostPct.toFixed(1)}%
                          </span>
                        </div>

                        {/* Financial Metrics */}
                        <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{t.operations.selling}</span>
                            <p className="text-xs font-bold text-slate-900 dark:text-white font-mono">AED {recipe.sellingPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{t.operations.cost}</span>
                            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">AED {recipe.portionCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{t.operations.margin}</span>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{marginPct}%</p>
                          </div>
                        </div>

                        {/* Ingredients Breakdown */}
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-slate-400" />
                            {language === 'ar' ? `تفاصيل المكونات (${recipe.items.length})` : `Ingredients Breakdown (${recipe.items.length})`}
                          </p>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                            {recipe.items.map((it) => (
                              <div key={it.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-700 dark:text-slate-300">
                                  {language === 'ar' ? it.inventoryItem.nameAr : it.inventoryItem.nameEn}
                                </span>
                                <span className="font-mono text-slate-500 dark:text-slate-400">
                                  {it.quantity} {it.unit} &middot; <span className="font-semibold text-slate-700 dark:text-slate-300">AED {it.cost.toFixed(2)}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. WASTE MANAGEMENT TAB */}
            {activeTab === 'waste' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">{t.operations.dateCol}</th>
                      <th className="px-6 py-3.5">{t.operations.inventoryItemCol}</th>
                      <th className="px-6 py-3.5">{t.operations.branchCol}</th>
                      <th className="px-6 py-3.5">{t.operations.reasonCol}</th>
                      <th className="px-6 py-3.5">{t.operations.quantityCol}</th>
                      <th className="px-6 py-3.5">{t.operations.totalWasteCostCol}</th>
                      <th className="px-6 py-3.5">{t.operations.recordedByCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {wasteRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-sm">
                          {language === 'ar' ? 'لا توجد سجلات هدر مسجلة.' : 'No waste records registered.'}
                        </td>
                      </tr>
                    ) : (
                      wasteRecords.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {new Date(w.recordedAt).toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-GB')}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                            {w.inventoryItem?.nameEn}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                            {w.branch?.nameEn}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                              {w.reason}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                            {w.quantity} {w.inventoryItem?.primaryUnit}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-rose-600 dark:text-rose-400">
                            AED {w.totalCost.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {w.recordedBy?.fullName}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. SUPPLIERS TAB */}
            {activeTab === 'suppliers' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">{t.operations.supplierNameCol}</th>
                      <th className="px-6 py-3.5">{t.operations.trnCol}</th>
                      <th className="px-6 py-3.5">{t.operations.categoryCol}</th>
                      <th className="px-6 py-3.5">{t.operations.contactPhoneCol}</th>
                      <th className="px-6 py-3.5">{t.operations.paymentTermsCol}</th>
                      <th className="px-6 py-3.5">{t.operations.outstandingBalanceCol}</th>
                      <th className="px-6 py-3.5">{t.operations.statusCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {suppliers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-sm">
                          {language === 'ar' ? 'لا يوجد موردون مسجلون بعد.' : 'No suppliers recorded yet.'}
                        </td>
                      </tr>
                    ) : (
                      suppliers.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {language === 'ar' ? s.nameAr : s.nameEn}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">
                              {s.supplierCode}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                            {s.trn || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              {s.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-medium text-slate-900 dark:text-white">{s.contactPerson || (language === 'ar' ? 'المكتب' : 'Office')}</div>
                            <div className="text-xs text-slate-400 font-mono">{s.phone}</div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            {s.paymentTerms}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                            AED {s.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transfer Stock Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.operations.interBranchTransferTitle}</h3>
                <p className="text-xs text-slate-500">{t.operations.interBranchTransferDesc}</p>
              </div>
            </div>

            <form onSubmit={handleInitiateTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {language === 'ar' ? 'العنصر المصدر (مع الفرع الحالي)' : 'Source Item (with Current Branch)'}
                </label>
                <select
                  value={transferData.itemId}
                  onChange={(e) => setTransferData({ ...transferData, itemId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{t.operations.selectInventoryItem}</option>
                  {inventory.map((it) => (
                    <option key={it.id} value={it.id}>
                      {language === 'ar' ? it.nameAr : it.nameEn} ({it.branch?.nameEn}) &mdash; {language === 'ar' ? 'المتاح' : 'Available'}: {it.currentStock} {it.primaryUnit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {language === 'ar' ? 'فرع الوجهة' : 'Destination Branch'}
                </label>
                <select
                  value={transferData.targetBranchId}
                  onChange={(e) => setTransferData({ ...transferData, targetBranchId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{t.operations.selectDestinationBranch}</option>
                  <option value="cmm_br_bateen">{language === 'ar' ? 'واجهة البطين البحرية (BR-01)' : 'Al Bateen Waterfront (BR-01)'}</option>
                  <option value="cmm_br_yas">{language === 'ar' ? 'ياس مول داينينغ هاب (BR-02)' : 'Yas Mall Dining Hub (BR-02)'}</option>
                  <option value="cmm_br_saadiyat">{language === 'ar' ? 'منطقة السعديات الثقافية (BR-03)' : 'Saadiyat Cultural District (BR-03)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {language === 'ar' ? 'الكمية المراد نقلها' : 'Quantity to Transfer'}
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {language === 'ar' ? 'ملاحظات النقل' : 'Transfer Notes'}
                </label>
                <input
                  type="text"
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  placeholder={t.operations.dispatchNotesPlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                >
                  {t.security.nextEnterAuthPassword}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Waste Modal */}
      {showNewWasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.operations.recordWasteTitle}</h3>
                <p className="text-xs text-slate-500">{t.operations.recordWasteDesc}</p>
              </div>
            </div>

            <form onSubmit={handleRecordWaste} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {language === 'ar' ? 'العنصر' : 'Item'}
                </label>
                <select
                  value={wasteData.inventoryItemId}
                  onChange={(e) => {
                    const sel = inventory.find(i => i.id === e.target.value);
                    setWasteData({
                      ...wasteData,
                      inventoryItemId: e.target.value,
                      branchId: sel?.branch?.id || 'cmm_br_bateen'
                    });
                  }}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">{t.operations.selectInventoryItem}</option>
                  {inventory.map((it) => (
                    <option key={it.id} value={it.id}>
                      {language === 'ar' ? it.nameAr : it.nameEn} ({it.branch?.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {language === 'ar' ? 'السبب' : 'Reason'}
                </label>
                <select
                  value={wasteData.reason}
                  onChange={(e) => setWasteData({ ...wasteData, reason: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="EXPIRED">{t.operations.reasonExpired}</option>
                  <option value="PREP_WASTE">{t.operations.reasonPrep}</option>
                  <option value="DAMAGED">{t.operations.reasonDamaged}</option>
                  <option value="CUSTOMER_RETURN">{t.operations.reasonReturn}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {t.operations.quantityCol}
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={wasteData.quantity}
                  onChange={(e) => setWasteData({ ...wasteData, quantity: parseFloat(e.target.value) || 0 })}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewWasteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm"
                >
                  {t.security.nextEnterAuthPassword}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Authorization Password Prompt */}
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
