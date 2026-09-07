import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, ChevronLeft, ChevronRight, Layers, Minus, Plus, RefreshCw, Search, X
} from 'lucide-react';
import { toast } from 'sonner';
import {
  supabase, getExtendedCatalog, updateProductStock,
  type ProductExtended
} from '@/lib/supabase';
import { SafeImage } from '@/components/SafeImage';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/seller/StatusBadge';
import { SkeletonTable } from '@/components/seller/SkeletonTable';
import { EmptyState } from '@/components/seller/EmptyState';
import SellerShell from './SellerShell';

const PAGE_SIZE = 25;

function formatINR(v: number) {
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

export default function InventoryPage() {
  const { isDark } = useTheme();
  const { sellerId } = useAuth();
  const [products,     setProducts]     = useState<ProductExtended[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search,       setSearch]       = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page,         setPage]         = useState(1);
  const [updating,     setUpdating]     = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      setProducts(await getExtendedCatalog(sellerId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [sellerId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`inventory-rt-${sellerId || 'global'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); Object.values(timers.current).forEach(clearTimeout); };
  }, [load, sellerId]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    }
    if (lowStockOnly) list = list.filter(p => (p.stock ?? 0) <= (p.low_stock_threshold || 5));
    return list;
  }, [products, search, lowStockOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const adjustStock = (product: ProductExtended, delta: number) => {
    if (!product.id) return;
    const next = Math.max(0, (product.stock ?? 0) + delta);
    if (next === product.stock) return;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: next } : p));
    if (timers.current[product.id]) clearTimeout(timers.current[product.id]);
    setUpdating(prev => ({ ...prev, [product.id]: true }));
    timers.current[product.id] = setTimeout(async () => {
      try {
        await updateProductStock(product.id, next, sellerId);
        toast.success(`${product.name}: stock → ${next}`);
      } catch {
        toast.error('Stock sync failed');
        load(true);
      } finally {
        setUpdating(prev => ({ ...prev, [product.id]: false }));
      }
    }, 400);
  };

  const lowCount = products.filter(p => (p.stock ?? 0) <= (p.low_stock_threshold || 5)).length;

  const C = {
    card:   isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white',
    well:   isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-gray-50',
    text:   isDark ? 'text-white'  : 'text-gray-900',
    muted:  isDark ? 'text-neutral-500' : 'text-gray-400',
    th:     isDark ? 'text-neutral-300 bg-[#14171F]' : 'text-neutral-700 bg-neutral-100',
    row:    isDark ? 'border-[#1F2430]/60 hover:bg-[#12161F]/70' : 'border-gray-100 hover:bg-gray-50',
    divider: isDark ? 'border-[#1F2430]' : 'border-gray-100',
  };

  return (
    <SellerShell title="Inventory">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${C.muted}`}>Stock Management</div>
          <h1 className={`text-2xl font-black tracking-tight ${C.text}`}>Inventory</h1>
        </div>
        {lowCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2">
            <AlertCircle size={14} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-400">{lowCount} SKU{lowCount !== 1 ? 's' : ''} below reorder point</span>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total SKUs', value: products.length, sub: 'Active in catalog' },
          { label: 'Total Units', value: products.reduce((a, p) => a + (p.stock ?? 0), 0), sub: 'Across all products' },
          { label: 'Low Stock', value: lowCount, sub: `Below threshold`, warn: lowCount > 0 },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl border p-5 ${C.card}`}>
            <div className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>{card.label}</div>
            <div className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${card.warn ? 'text-amber-400' : C.text}`}>{card.value}</div>
            <div className={`mt-1 text-[10px] ${C.muted}`}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={`mb-4 flex flex-col gap-3 rounded-2xl border p-3 md:flex-row md:items-center ${C.card}`}>
        <div className={`flex flex-1 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${C.well}`}>
          <Search size={14} className={C.muted} />
          <input type="text" placeholder="Search by name, SKU, or category…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className={`w-full bg-transparent text-xs outline-none ${isDark ? 'text-white placeholder:text-neutral-600' : 'text-gray-900 placeholder:text-gray-400'}`}
          />
          {search && <button onClick={() => setSearch('')}><X size={13} className={C.muted} /></button>}
        </div>
        <button
          onClick={() => { setLowStockOnly(l => !l); setPage(1); }}
          className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${
            lowStockOnly ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400' : `border ${C.well} ${C.muted}`
          }`}
        >
          Low Stock Only
        </button>
        <button onClick={() => { load(); toast.success('Refreshed'); }}
          className={`rounded-full border p-2 transition ${C.well} ${C.muted} hover:text-[#CCFF00]`}>
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#CCFF00]' : ''} />
        </button>
      </div>

      {/* Table */}
      {error ? (
        <div className={`flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border p-12 text-center ${C.card}`}>
          <AlertCircle className="h-8 w-8 text-red-400" />
          <div className={`text-sm font-bold ${C.text}`}>{error}</div>
          <button onClick={() => load()} className="text-xs font-bold text-[#CCFF00] hover:underline">Retry</button>
        </div>
      ) : isLoading ? (
        <SkeletonTable rows={10} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Layers} title="No products found" body="Adjust your filters or add products via the Listings page." />
      ) : (
        <>
          {/* Desktop table */}
          <div className={`hidden overflow-hidden rounded-2xl border md:block ${C.card}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[9px] font-black uppercase tracking-widest ${C.divider} ${C.th}`}>
                  <tr>
                    {['Product', 'SKU', 'Category', 'Status', 'Price', 'Stock Adjustment', 'Current Stock'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#1F2430]/60' : 'divide-gray-100'}`}>
                  {paged.map(p => {
                    const isUpd   = !!updating[p.id];
                    const lowStock = (p.stock ?? 0) <= (p.low_stock_threshold || 5);
                    return (
                      <tr key={p.id} className={`transition ${C.row} ${lowStock ? isDark ? 'bg-amber-500/5' : 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg ${isDark ? 'bg-[#12161F]' : 'bg-gray-100'}`}>
                              <SafeImage src={p.primary_image} alt={p.name} fallbackText={p.name} className="h-full w-full object-cover" />
                            </div>
                            <div className={`font-bold line-clamp-1 ${C.text}`}>{p.name}</div>
                          </div>
                        </td>
                        <td className={`px-4 py-3 font-mono text-[10px] ${C.muted}`}>{p.sku || '—'}</td>
                        <td className={`px-4 py-3 ${C.muted}`}>{p.category}</td>
                        <td className="px-4 py-3">
                          <StatusBadge label={p.status || 'active'} variant={p.status === 'active' ? 'success' : p.status === 'draft' ? 'warning' : 'danger'} />
                        </td>
                        <td className={`px-4 py-3 font-mono tabular-nums font-bold ${C.text}`}>{formatINR(p.price)}</td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-white'}`}>
                            <button onClick={() => adjustStock(p, -1)} disabled={(p.stock ?? 0) <= 0}
                              className={`grid h-6 w-6 place-items-center rounded-full transition ${C.muted} hover:bg-neutral-200 dark:hover:bg-[#1F2430] hover:text-neutral-900 dark:hover:text-white disabled:opacity-40`}>
                              <Minus size={10} />
                            </button>
                            <button onClick={() => adjustStock(p, -10)} disabled={(p.stock ?? 0) <= 0}
                              className={`hidden rounded-full px-2 py-0.5 text-[9px] font-bold transition sm:block ${C.muted} hover:text-neutral-900 dark:hover:text-white`}>
                              –10
                            </button>
                            <button onClick={() => adjustStock(p, 10)}
                              className={`hidden rounded-full px-2 py-0.5 text-[9px] font-bold transition sm:block ${C.muted} hover:text-[#CCFF00]`}>
                              +10
                            </button>
                            <button onClick={() => adjustStock(p, 1)}
                              className={`grid h-6 w-6 place-items-center rounded-full transition ${C.muted} hover:bg-neutral-200 dark:hover:bg-[#1F2430] hover:text-[#CCFF00]`}>
                              <Plus size={10} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`font-mono text-base font-semibold tabular-nums ${
                            lowStock ? 'text-amber-400' : isUpd ? C.muted : C.text
                          }`}>
                            {isUpd ? '…' : p.stock ?? 0}
                          </div>
                          {lowStock && (
                            <div className="text-[9px] font-bold text-amber-400 mt-0.5">
                              Below {p.low_stock_threshold || 5} unit threshold
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {paged.map(p => {
              const lowStock = (p.stock ?? 0) <= (p.low_stock_threshold || 5);
              return (
                <div key={p.id} className={`rounded-2xl border p-4 ${C.card} ${lowStock ? 'border-amber-500/30' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl ${isDark ? 'bg-[#12161F]' : 'bg-gray-100'}`}>
                      <SafeImage src={p.primary_image} alt={p.name} fallbackText={p.name} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${C.text}`}>{p.name}</div>
                      <div className={`text-[10px] ${C.muted}`}>{p.category}</div>
                    </div>
                    {lowStock && <StatusBadge label="Low Stock" variant="warning" className="ml-auto" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`font-mono text-xl font-semibold tabular-nums ${lowStock ? 'text-amber-400' : C.text}`}>
                      {p.stock ?? 0} <span className={`text-xs font-normal ${C.muted}`}>units</span>
                    </div>
                    <div className={`inline-flex items-center gap-1 rounded-full border p-1 ${isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-white'}`}>
                      <button onClick={() => adjustStock(p, -1)} disabled={(p.stock ?? 0) <= 0}
                        className={`grid h-7 w-7 place-items-center rounded-full transition ${C.muted} disabled:opacity-40`}><Minus size={12} /></button>
                      <button onClick={() => adjustStock(p, 1)}
                        className={`grid h-7 w-7 place-items-center rounded-full transition text-[#CCFF00]`}><Plus size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider disabled:opacity-40 ${C.well} ${C.muted}`}>
                <ChevronLeft size={13} className="inline" /> Prev
              </button>
              <span className={`font-mono text-xs tabular-nums ${C.muted}`}>{page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider disabled:opacity-40 ${C.well} ${C.muted}`}>
                Next <ChevronRight size={13} className="inline" />
              </button>
            </div>
          )}
        </>
      )}
    </SellerShell>
  );
}
