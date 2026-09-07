import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Edit3,
  ExternalLink, Filter, Layers, Loader2, Package, Plus, RefreshCw,
  Search, Trash2, Upload, X, CheckSquare, Square, Eye, EyeOff,
  ArrowRight, ArrowLeft, ArrowUpDown, Check, AlertCircle, Minus
} from 'lucide-react';
import { toast } from 'sonner';
import {
  supabase,
  getExtendedCatalog, insertProductToCatalog, updateProductInCatalog,
  deleteProductFromCatalog, updateProductStock, getBuyerProductUrl,
  getPriceTiers, upsertPriceTiers, getVariants,
  VALID_CATEGORIES, BUYER_STOREFRONT_URL,
  type ProductExtended, type ProductPriceTier, type ProductVariant, type ValidCategory
} from '@/lib/supabase';
import { SafeImage } from '@/components/SafeImage';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBadge, orderStatusVariant } from '@/components/seller/StatusBadge';
import { SkeletonTable } from '@/components/seller/SkeletonTable';
import { EmptyState } from '@/components/seller/EmptyState';
import { ConfirmModal } from '@/components/seller/ConfirmModal';
import { BulkActionBar } from '@/components/seller/BulkActionBar';
import { TieredPricingTable } from '@/components/seller/TieredPricingTable';
import SellerShell from './SellerShell';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const SPRING = { type: 'spring', stiffness: 300, damping: 25 } as const;
const FADE   = { duration: 0.2, ease: 'easeOut' } as const;

type ProductStatus = 'active' | 'draft' | 'suppressed';
type DrawerTab = 'basic' | 'images' | 'pricing' | 'inventory' | 'shipping' | 'variants' | 'compliance';

const DRAWER_TABS: { id: DrawerTab; label: string }[] = [
  { id: 'basic',      label: 'Basic Info'  },
  { id: 'images',     label: 'Images'      },
  { id: 'pricing',    label: 'Pricing'     },
  { id: 'inventory',  label: 'Inventory'   },
  { id: 'shipping',   label: 'Shipping'    },
  { id: 'variants',   label: 'Variants'    },
  { id: 'compliance', label: 'Compliance'  },
];

function generateSKU() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'FL-';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function formatINR(v: number) {
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
interface FormData {
  name: string; brand: string; category: ValidCategory;
  sku: string; status: ProductStatus; moq: string;
  price: string; original_price: string; stock: string; low_stock_threshold: string;
  description: string; primary_image: string; hover_images: string;
  weight: string; dims: string; handlingDays: string;
  certifications: string;
}

const EMPTY_FORM: FormData = {
  name: '', brand: 'Flash Verified', category: 'Electronics', sku: '',
  status: 'active', moq: '1', price: '', original_price: '', stock: '10',
  low_stock_threshold: '5', description: '', primary_image: '', hover_images: '',
  weight: '', dims: '', handlingDays: '2', certifications: '',
};

// ─── Inline Input ─────────────────────────────────────────────────────────────
function FormInput({
  label, value, onChange, type = 'text', placeholder = '', required = false, error = ''
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; error?: string;
}) {
  const { isDark } = useTheme();
  return (
    <div>
      <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
        {label}{required && <span className="text-[#CCFF00] ml-0.5">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition ${
          isDark
            ? `border-[#1F2430] bg-[#12161F] text-white placeholder:text-neutral-600 focus:border-[#CCFF00] ${error ? 'border-red-500' : ''}`
            : `border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-[#CCFF00] ${error ? 'border-red-400' : ''}`
        }`}
      />
      {error && <span className="mt-1 block text-[10px] text-red-400">{error}</span>}
    </div>
  );
}

// ─── Status badge map ─────────────────────────────────────────────────────────
function productStatusVariant(s: string) {
  if (s === 'active')    return 'success' as const;
  if (s === 'draft')     return 'warning' as const;
  if (s === 'suppressed') return 'danger' as const;
  return 'default' as const;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LISTINGS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function ListingsPage() {
  const { isDark } = useTheme();

  // ── Data ──
  const [products,   setProducts]   = useState<ProductExtended[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Filters ──
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [catFilter,  setCatFilter]  = useState('All');
  const [sortBy,     setSortBy]     = useState<'name' | 'price' | 'stock' | 'created_at'>('created_at');
  const [sortAsc,    setSortAsc]    = useState(false);

  // ── Pagination ──
  const [page, setPage] = useState(1);

  // ── Bulk selection ──
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Drawer ──
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [drawerTab,     setDrawerTab]     = useState<DrawerTab>('basic');
  const [editProduct,   setEditProduct]   = useState<ProductExtended | null>(null);
  const [formData,      setFormData]      = useState<FormData>({ ...EMPTY_FORM, sku: generateSKU() });
  const [formErrors,    setFormErrors]    = useState<Partial<FormData>>({});
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [priceTiers,    setPriceTiers]    = useState<Array<{ min_qty: number; unit_price: number }>>([]);
  const [variants,      setVariants]      = useState<Array<{ variant_name: string; sku: string; stock: number; price_override: number | null }>>([]);

  // ── Delete confirm ──
  const [deleteTarget, setDeleteTarget] = useState<ProductExtended | null>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);

  // ── Bulk price modal ──
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [bulkPrice,     setBulkPrice]     = useState('');

  // ── CSV Upload ──
  const [csvOpen,     setCsvOpen]     = useState(false);
  const [csvLoading,  setCsvLoading]  = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Debounced Stock Stepper ──
  const stockTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [stockUpdating, setStockUpdating] = useState<Record<string, boolean>>({});

  const adjustStock = (product: ProductExtended, delta: number) => {
    if (!product.id) return;
    const next = Math.max(0, (product.stock ?? 0) + delta);
    if (next === product.stock) return;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: next } : p));
    if (stockTimers.current[product.id]) clearTimeout(stockTimers.current[product.id]);
    setStockUpdating(prev => ({ ...prev, [product.id]: true }));
    stockTimers.current[product.id] = setTimeout(async () => {
      try {
        await updateProductStock(product.id, next);
        toast.success(`${product.name}: stock → ${next}`);
      } catch {
        toast.error('Stock sync failed');
        loadProducts(true);
      } finally {
        setStockUpdating(prev => ({ ...prev, [product.id]: false }));
      }
    }, 400);
  };

  // ── Load ──
  const loadProducts = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await getExtendedCatalog();
      setProducts(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load catalog';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    const ch = supabase
      .channel('listings-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadProducts(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadProducts]);

  // ── Filtered + sorted + paginated ──
  const filtered = useMemo(() => {
    let list = [...products];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter(p => (p.status || 'active') === statusFilter);
    if (catFilter !== 'All') list = list.filter(p => (p.category || '').toLowerCase() === catFilter.toLowerCase());
    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'name')       diff = a.name.localeCompare(b.name);
      else if (sortBy === 'price') diff = a.price - b.price;
      else if (sortBy === 'stock') diff = (a.stock ?? 0) - (b.stock ?? 0);
      else diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortAsc ? diff : -diff;
    });
    return list;
  }, [products, search, statusFilter, catFilter, sortBy, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Select all on page ──
  const allPageSelected = paged.length > 0 && paged.every(p => selected.has(p.id));
  const togglePageSelect = () => {
    if (allPageSelected) {
      setSelected(prev => { const n = new Set(prev); paged.forEach(p => n.delete(p.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); paged.forEach(p => n.add(p.id)); return n; });
    }
  };
  const toggleOne = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ── Open drawer ──
  const openAdd = () => {
    setEditProduct(null);
    setFormData({ ...EMPTY_FORM, sku: generateSKU() });
    setPriceTiers([]);
    setVariants([]);
    setFormErrors({});
    setDrawerTab('basic');
    setDrawerOpen(true);
  };

  const openEdit = async (p: ProductExtended) => {
    setEditProduct(p);
    const secondaryImgs = p.hover_images ? p.hover_images.filter(h => h !== p.primary_image).join('\n') : '';
    setFormData({
      name: p.name, brand: p.brand || 'Flash Verified',
      category: (VALID_CATEGORIES.includes(p.category as ValidCategory) ? p.category : 'Electronics') as ValidCategory,
      sku: p.sku || generateSKU(), status: (p.status || 'active') as ProductStatus,
      moq: String(p.moq || 1), price: String(p.price), original_price: String(p.original_price || p.price),
      stock: String(p.stock ?? 10), low_stock_threshold: String(p.low_stock_threshold || 5),
      description: p.description || '', primary_image: p.primary_image || '',
      hover_images: secondaryImgs,
      weight: String(p.shipping?.weight || ''), dims: p.shipping?.dims || '',
      handlingDays: String(p.shipping?.handlingDays || 2),
      certifications: p.certifications ? JSON.stringify(p.certifications) : '',
    });
    setFormErrors({});
    setDrawerTab('basic');
    setDrawerOpen(true);
    // Load tiers + variants async
    if (p.tiered_pricing && p.tiered_pricing.length > 0) {
      setPriceTiers(p.tiered_pricing.map(t => ({ min_qty: t.minQty || 1, unit_price: t.price || p.price })));
    } else {
      const t = await getPriceTiers(p.id);
      setPriceTiers(t.map(({ min_qty, unit_price }) => ({ min_qty, unit_price })));
    }
    const v = await getVariants(p.id);
    setVariants(v.map(({ variant_name, sku, stock, price_override }) => ({
      variant_name: variant_name || '', sku: sku || '', stock, price_override
    })));
  };

  // ── Validate ──
  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!formData.name.trim()) errs.name = 'Title required';
    if (!formData.price || parseFloat(formData.price) <= 0) errs.price = 'Valid price required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save ──
  const handleSave = async () => {
    if (!validate()) { setDrawerTab('basic'); return; }
    setIsSubmitting(true);
    try {
      const price  = parseFloat(formData.price);
      const orig   = formData.original_price ? parseFloat(formData.original_price) : price;
      const stock  = parseInt(formData.stock) || 0;
      const img    = formData.primary_image.trim() || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
      const extraImgs = formData.hover_images
        ? formData.hover_images.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
        : [];
      const hoverImgs = Array.from(new Set([img, ...extraImgs]));

      const tieredPricingData = priceTiers.length
        ? priceTiers.map(t => ({ minQty: t.min_qty, price: t.unit_price }))
        : null;

      const payload = {
        name: formData.name.trim(), brand: formData.brand.trim() || 'Flash Verified',
        category: formData.category, price, original_price: orig, stock,
        description: formData.description.trim() || 'Flash verified wholesale product.',
        primary_image: img,
        hover_images: hoverImgs,
        sku: formData.sku.trim() || generateSKU(),
        status: formData.status || 'active',
        moq: Math.max(1, parseInt(formData.moq) || 1),
        low_stock_threshold: Math.max(0, parseInt(formData.low_stock_threshold) || 5),
        tiered_pricing: tieredPricingData,
        shipping: {
          weight: parseFloat(formData.weight) || null,
          dims: formData.dims || null,
          class: null,
          handlingDays: parseInt(formData.handlingDays) || 2,
          regions: null,
        },
      };

      if (editProduct?.id) {
        const updated: ProductExtended = { ...editProduct, ...payload };
        setProducts(prev => prev.map(p => p.id === editProduct.id ? updated : p));
        setDrawerOpen(false);
        await updateProductInCatalog(editProduct.id, updated as Parameters<typeof updateProductInCatalog>[1]);
        await upsertPriceTiers(editProduct.id, priceTiers);
        toast.success(`"${updated.name}" updated`);
      } else {
        setDrawerOpen(false);
        const inserted = await insertProductToCatalog(payload);
        if (inserted?.id) {
          await upsertPriceTiers(inserted.id, priceTiers);
          setProducts(prev => [inserted as ProductExtended, ...prev]);
          toast.success(`"${formData.name.trim()}" published`);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    try {
      await deleteProductFromCatalog(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" removed`);
    } catch {
      toast.error('Delete failed');
      loadProducts(true);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Bulk actions ──
  const bulkActivate = async (status: ProductStatus) => {
    const ids = Array.from(selected);
    setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, status } : p));
    setSelected(new Set());
    await Promise.allSettled(ids.map(id => supabase.from('products').update({ status }).eq('id', id)));
    toast.success(`${ids.length} products updated to ${status}`);
  };

  const bulkPriceUpdate = async () => {
    const price = parseFloat(bulkPrice);
    if (isNaN(price) || price <= 0) { toast.error('Enter a valid price'); return; }
    const ids = Array.from(selected);
    setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, price } : p));
    setSelected(new Set());
    setBulkPriceOpen(false);
    await Promise.allSettled(ids.map(id => supabase.from('products').update({ price }).eq('id', id)));
    toast.success(`Price updated for ${ids.length} products`);
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    setProducts(prev => prev.filter(p => !ids.includes(p.id)));
    setSelected(new Set());
    await Promise.allSettled(ids.map(id => deleteProductFromCatalog(id)));
    toast.success(`Deleted ${ids.length} products`);
  };

  const exportCSV = () => {
    const rows = products
      .filter(p => selected.size === 0 || selected.has(p.id))
      .map(p => [
        p.id, p.name, p.brand || '', p.category, p.sku || '', p.status || 'active',
        p.price, p.original_price || p.price, p.stock, p.description || ''
      ]);
    const csv = [
      ['ID', 'Name', 'Brand', 'Category', 'SKU', 'Status', 'Price', 'MRP', 'Stock', 'Description'],
      ...rows
    ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'flash-catalog.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('CSV exported');
  };

  // ── CSS helpers ──
  const C = {
    card:   isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white',
    well:   isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-gray-50',
    input:  isDark ? 'border-[#1F2430] bg-[#12161F] text-white placeholder:text-neutral-600 focus:border-[#CCFF00]' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-[#CCFF00]',
    label:  isDark ? 'text-neutral-400' : 'text-gray-500',
    th:     isDark ? 'text-neutral-500 bg-[#12161F]' : 'text-gray-400 bg-gray-50',
    row:    isDark ? 'border-[#1F2430]/60 hover:bg-[#12161F]/70' : 'border-gray-100 hover:bg-gray-50',
    text:   isDark ? 'text-white'  : 'text-gray-900',
    muted:  isDark ? 'text-neutral-500' : 'text-gray-400',
    divider: isDark ? 'border-[#1F2430]' : 'border-gray-100',
  };

  const discountPreview = useMemo(() => {
    const p = parseFloat(formData.price), o = parseFloat(formData.original_price);
    if (!isNaN(p) && !isNaN(o) && o > p && o > 0) return `-${Math.round(((o - p) / o) * 100)}%`;
    return null;
  }, [formData.price, formData.original_price]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SellerShell title="Listings">
      {/* ── Page header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${C.muted}`}>
            Catalog Management
          </div>
          <h1 className={`text-2xl font-black tracking-tight ${C.text}`}>Listings</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCsvOpen(true)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${C.well} ${C.muted} hover:border-[#CCFF00]/40 hover:text-[#CCFF00]`}
          >
            <Upload size={13} /> Bulk Upload
          </button>
          <button
            onClick={exportCSV}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${C.well} ${C.muted} hover:border-[#CCFF00]/40 hover:text-[#CCFF00]`}
          >
            <Download size={13} /> Export CSV
          </button>
          <motion.button
            whileHover={{ y: -1, boxShadow: '0 0 20px rgba(204,255,0,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-xs font-black uppercase tracking-widest text-[#CCFF00] shadow-[0_0_16px_rgba(204,255,0,0.2)] transition active:scale-95"
          >
            <Plus size={13} /> New Listing
          </motion.button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={`mb-4 flex flex-col gap-3 rounded-2xl border p-3 md:flex-row md:items-center ${C.card}`}>
        {/* Search */}
        <div className={`flex flex-1 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${C.well}`}>
          <Search size={14} className={C.muted} />
          <input
            type="text" placeholder="Search by name, brand, or SKU…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className={`w-full bg-transparent text-xs outline-none ${isDark ? 'text-white placeholder:text-neutral-600' : 'text-gray-900 placeholder:text-gray-400'}`}
          />
          {search && <button onClick={() => setSearch('')}><X size={13} className={C.muted} /></button>}
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'active', 'draft', 'suppressed'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
                statusFilter === s
                  ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.25)]'
                  : `border ${C.well} ${C.muted} hover:border-[#CCFF00]/30`
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => { loadProducts(); toast.success('Refreshed'); }}
          className={`rounded-full border p-2 transition ${C.well} ${C.muted} hover:text-[#CCFF00]`}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#CCFF00]' : ''} />
        </button>
      </div>

      {/* ── Category filtering rail without ugly scrollbar ── */}
      <div className="w-full flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none no-scrollbar touch-pan-x select-none mb-4">
        {['All', ...VALID_CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => { setCatFilter(cat); setPage(1); }}
            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition ${
              catFilter === cat
                ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.25)]'
                : `border ${C.well} ${C.muted} hover:text-white`
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Stats bar ── */}
      {!isLoading && (
        <div className={`mb-3 flex items-center justify-between text-[10px] ${C.muted}`}>
          <span className="font-semibold">
            {filtered.length} product{filtered.length !== 1 ? 's' : ''} · Page {page}/{totalPages}
          </span>
          <button
            onClick={() => { setSortAsc(a => !a); }}
            className={`inline-flex items-center gap-1 font-bold hover:text-[#CCFF00]`}
          >
            <ArrowUpDown size={11} />
            Sort: {sortBy} {sortAsc ? '↑' : '↓'}
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {error ? (
        <div className={`flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-12 text-center ${C.card}`}>
          <AlertCircle className="h-8 w-8 text-red-400" />
          <div className={`text-sm font-bold ${C.text}`}>Failed to load catalog</div>
          <div className={`text-xs ${C.muted}`}>{error}</div>
          <button onClick={() => loadProducts()} className="mt-2 text-xs font-bold text-[#CCFF00] hover:underline">
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No listings found"
          body={search || statusFilter !== 'all' ? 'No products match your filters.' : 'Publish your first product to start selling on the Flash B2B storefront.'}
          actionLabel="+ Add First Listing"
          onAction={openAdd}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className={`hidden overflow-hidden rounded-2xl border md:block ${C.card}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className={`border-b text-[9px] font-black uppercase tracking-widest ${C.divider} ${C.th}`}>
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <button onClick={togglePageSelect}>
                        {allPageSelected ? <CheckSquare size={14} className="text-[#CCFF00]" /> : <Square size={14} className={C.muted} />}
                      </button>
                    </th>
                    {['Product', 'SKU', 'Status', 'Stock', 'Price', 'Actions'].map(h => (
                      <th key={h} className={`px-4 py-3 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#1F2430]/60' : 'divide-gray-100'}`}>
                  {paged.map(p => {
                    const isChecked = selected.has(p.id);
                    const lowStock  = (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.low_stock_threshold || 5);
                    return (
                      <tr key={p.id} className={`transition text-xs ${C.row} ${isChecked ? isDark ? 'bg-[#CCFF00]/5' : 'bg-[#CCFF00]/5' : ''}`}>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleOne(p.id)}>
                            {isChecked ? <CheckSquare size={14} className="text-[#CCFF00]" /> : <Square size={14} className={C.muted} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg ${isDark ? 'bg-[#12161F]' : 'bg-gray-100'}`}>
                              <SafeImage src={p.primary_image} alt={p.name} fallbackText={p.name} className="h-full w-full object-cover" />
                            </div>
                            <div>
                              <div className={`font-bold line-clamp-1 ${C.text}`}>{p.name}</div>
                              <div className={`text-[9px] font-mono ${C.muted}`}>{p.brand || 'Flash'}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 py-3 font-mono text-[10px] ${C.muted}`}>{p.sku || '—'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge label={p.status || 'active'} variant={productStatusVariant(p.status || 'active')} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => adjustStock(p, -1)}
                              disabled={stockUpdating[p.id]}
                              className={`h-6 w-6 rounded-md border grid place-items-center text-xs transition ${C.well} ${C.muted} hover:border-[#CCFF00] hover:text-[#CCFF00] disabled:opacity-50`}
                              title="Decrease stock"
                            >
                              <Minus size={10} />
                            </button>
                            <span className={`w-8 text-center font-mono tabular-nums font-bold ${C.text}`}>
                              {p.stock ?? 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustStock(p, 1)}
                              disabled={stockUpdating[p.id]}
                              className={`h-6 w-6 rounded-md border grid place-items-center text-xs transition ${C.well} ${C.muted} hover:border-[#CCFF00] hover:text-[#CCFF00] disabled:opacity-50`}
                              title="Increase stock"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                          {lowStock && (
                            <div className="text-[9px] font-bold text-amber-400 mt-1">Low stock</div>
                          )}
                        </td>
                        <td className={`px-4 py-3 font-mono tabular-nums ${C.text}`}>{formatINR(p.price)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a href={getBuyerProductUrl(p.id)} target="_blank" rel="noopener noreferrer"
                              className={`rounded-lg border p-1.5 transition ${C.well} ${C.muted} hover:text-[#CCFF00]`} title="Preview">
                              <ExternalLink size={12} />
                            </a>
                            <button onClick={() => openEdit(p)} className={`rounded-lg border p-1.5 transition ${C.well} ${C.muted} hover:text-white`} title="Edit">
                              <Edit3 size={12} />
                            </button>
                            <button onClick={() => setDeleteTarget(p)} className={`rounded-lg border p-1.5 transition ${C.well} ${C.muted} hover:border-red-500/50 hover:text-red-400`} title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
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
            {paged.map(p => (
              <div key={p.id} className={`rounded-2xl border p-4 ${C.card}`}>
                <div className="flex items-start gap-3">
                  <div className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl ${isDark ? 'bg-[#12161F]' : 'bg-gray-100'}`}>
                    <SafeImage src={p.primary_image} alt={p.name} fallbackText={p.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm truncate ${C.text}`}>{p.name}</div>
                    <div className={`text-[10px] font-mono mt-0.5 ${C.muted}`}>{p.sku || 'No SKU'}</div>
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <StatusBadge label={p.status || 'active'} variant={productStatusVariant(p.status || 'active')} />
                      <span className={`font-mono text-xs tabular-nums font-bold ${C.text}`}>{formatINR(p.price)}</span>
                      <div className="flex items-center gap-1.5 rounded-lg border border-[#1F2430] bg-[#12161F] px-2 py-0.5">
                        <button type="button" onClick={() => adjustStock(p, -1)} disabled={stockUpdating[p.id]} className="text-neutral-400 hover:text-[#CCFF00]">
                          <Minus size={10} />
                        </button>
                        <span className={`font-mono text-xs font-bold ${C.text}`}>{p.stock ?? 0}</span>
                        <button type="button" onClick={() => adjustStock(p, 1)} disabled={stockUpdating[p.id]} className="text-neutral-400 hover:text-[#CCFF00]">
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(p)} className={`rounded-lg border p-2 transition ${C.well} ${C.muted}`}>
                      <Edit3 size={12} />
                    </button>
                    <button onClick={() => setDeleteTarget(p)} className={`rounded-lg border p-2 transition ${C.well} ${C.muted} hover:text-red-400`}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition disabled:opacity-40 ${C.well} ${C.muted}`}>
                <ChevronLeft size={13} className="inline -mt-0.5" /> Prev
              </button>
              <span className={`font-mono text-xs tabular-nums ${C.muted}`}>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition disabled:opacity-40 ${C.well} ${C.muted}`}>
                Next <ChevronRight size={13} className="inline -mt-0.5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════
          PRODUCT DRAWER (multi-tab)
         ═══════════════════════════════════════ */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setDrawerOpen(false); }}>
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={SPRING}
              className={`flex h-full w-full max-w-lg flex-col border-l shadow-2xl ${isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white'}`}
            >
              {/* Drawer header */}
              <div className={`flex items-center justify-between border-b px-5 py-4 ${C.divider}`}>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
                    {editProduct ? 'Edit Listing' : 'New Listing'}
                  </div>
                  <h2 className={`text-base font-black tracking-tight ${C.text}`}>
                    {editProduct?.name || 'Untitled Product'}
                  </h2>
                </div>
                <button onClick={() => setDrawerOpen(false)} className={`rounded-full border p-1.5 transition ${C.well} ${C.muted}`}>
                  <X size={14} />
                </button>
              </div>

              {/* Tab nav */}
              <div className={`flex overflow-x-auto scrollbar-none border-b ${C.divider} px-4 pt-3 gap-0.5`}>
                {DRAWER_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDrawerTab(tab.id)}
                    className={`flex-shrink-0 rounded-t-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                      drawerTab === tab.id
                        ? 'border-b-2 border-[#CCFF00] text-[#CCFF00]'
                        : `${C.muted} hover:text-white`
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Drawer body */}
              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
                <AnimatePresence mode="wait">
                  {/* Basic Info */}
                  {drawerTab === 'basic' && (
                    <motion.div key="basic" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={FADE} className="space-y-4">
                      <FormInput label="Product Title" value={formData.name} onChange={v => setFormData(d => ({ ...d, name: v }))} required error={formErrors.name} placeholder="e.g. Industrial Grade USB-C Adapter" />
                      <FormInput label="Brand / Manufacturer" value={formData.brand} onChange={v => setFormData(d => ({ ...d, brand: v }))} placeholder="Flash Verified" />
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>Category</label>
                        <select value={formData.category} onChange={e => setFormData(d => ({ ...d, category: e.target.value as ValidCategory }))}
                          className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition ${isDark ? 'border-[#1F2430] bg-[#12161F] text-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`}>
                          {VALID_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>Status</label>
                        <div className="flex gap-2">
                          {(['active', 'draft', 'suppressed'] as const).map(s => (
                            <button key={s} type="button" onClick={() => setFormData(d => ({ ...d, status: s }))}
                              className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
                                formData.status === s
                                  ? 'bg-[#CCFF00] text-black'
                                  : `border ${C.well} ${C.muted}`
                              }`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>SKU</label>
                          <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${C.well}`}>
                            <span className={`flex-1 font-mono text-xs ${C.text}`}>{formData.sku}</span>
                            <button type="button" onClick={() => setFormData(d => ({ ...d, sku: generateSKU() }))} className={`${C.muted} hover:text-[#CCFF00] transition`} title="Regen">
                              <RefreshCw size={11} />
                            </button>
                          </div>
                        </div>
                        <div className="w-24">
                          <FormInput label="MOQ" value={formData.moq} onChange={v => setFormData(d => ({ ...d, moq: v }))} type="number" placeholder="1" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Images */}
                  {drawerTab === 'images' && (
                    <motion.div key="images" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={FADE} className="space-y-4">
                      <FormInput label="Primary Image URL" value={formData.primary_image} onChange={v => setFormData(d => ({ ...d, primary_image: v }))} placeholder="https://images.unsplash.com/…" />
                      {formData.primary_image ? (
                        <div className={`overflow-hidden rounded-2xl border ${C.well}`} style={{ aspectRatio: '16/9' }}>
                          <SafeImage src={formData.primary_image} alt="Preview" className="h-full w-full object-contain" />
                        </div>
                      ) : (
                        <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed py-10 gap-2 ${C.card}`}>
                          <Package size={24} className={C.muted} />
                          <span className={`text-xs ${C.muted}`}>Paste a primary image URL above to preview</span>
                        </div>
                      )}

                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>
                          Secondary &amp; Hover Images (one URL per line)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2..."
                          value={formData.hover_images}
                          onChange={e => setFormData(d => ({ ...d, hover_images: e.target.value }))}
                          className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none resize-none transition font-mono ${
                            isDark
                              ? 'border-[#1F2430] bg-[#12161F] text-white focus:border-[#CCFF00] placeholder:text-neutral-600'
                              : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-[#CCFF00] placeholder:text-gray-400'
                          }`}
                        />
                        <span className={`mt-1 block text-[10px] ${C.muted}`}>
                          These URLs populate `hover_images` array for interactive hover previews on the buyer storefront.
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* Pricing */}
                  {drawerTab === 'pricing' && (
                    <motion.div key="pricing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={FADE} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormInput label="Wholesale Price (₹)" value={formData.price} onChange={v => setFormData(d => ({ ...d, price: v }))} type="number" placeholder="1499" required error={formErrors.price} />
                        <FormInput label="Original / MRP (₹)" value={formData.original_price} onChange={v => setFormData(d => ({ ...d, original_price: v }))} type="number" placeholder="1999" />
                      </div>
                      {discountPreview && (
                        <div className="flex items-center gap-2 rounded-xl bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-4 py-2.5">
                          <Check size={13} className="text-[#CCFF00]" />
                          <span className="text-xs font-black text-[#CCFF00]">Discount: {discountPreview} off MRP</span>
                        </div>
                      )}
                      <div>
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-3 ${C.label}`}>Bulk / Tiered Pricing</div>
                        <TieredPricingTable tiers={priceTiers} onChange={setPriceTiers} />
                      </div>
                    </motion.div>
                  )}

                  {/* Inventory */}
                  {drawerTab === 'inventory' && (
                    <motion.div key="inventory" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={FADE} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormInput label="Current Stock" value={formData.stock} onChange={v => setFormData(d => ({ ...d, stock: v }))} type="number" placeholder="50" />
                        <FormInput label="Low Stock Alert (units)" value={formData.low_stock_threshold} onChange={v => setFormData(d => ({ ...d, low_stock_threshold: v }))} type="number" placeholder="5" />
                      </div>
                      <div className={`rounded-xl border p-4 ${C.well}`}>
                        <div className={`text-[10px] font-bold ${C.muted}`}>
                          An alert will trigger when stock falls below <span className="text-amber-400">{formData.low_stock_threshold || 5} units</span>.
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Shipping */}
                  {drawerTab === 'shipping' && (
                    <motion.div key="shipping" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={FADE} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormInput label="Weight (kg)" value={formData.weight} onChange={v => setFormData(d => ({ ...d, weight: v }))} type="number" placeholder="0.5" />
                        <FormInput label="Handling Days" value={formData.handlingDays} onChange={v => setFormData(d => ({ ...d, handlingDays: v }))} type="number" placeholder="2" />
                      </div>
                      <FormInput label="Dimensions (L×W×H cm)" value={formData.dims} onChange={v => setFormData(d => ({ ...d, dims: v }))} placeholder="30×20×10" />
                    </motion.div>
                  )}

                  {/* Variants */}
                  {drawerTab === 'variants' && (
                    <motion.div key="variants" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={FADE} className="space-y-3">
                      <div className={`text-xs ${C.muted}`}>Define product variants (size, color, etc.) with independent stock and optional price overrides.</div>
                      {variants.map((v, i) => (
                        <div key={i} className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 rounded-xl border p-3 ${C.well}`}>
                          <input placeholder="Color: Black / Size: L" value={v.variant_name}
                            onChange={e => setVariants(prev => prev.map((r, j) => j === i ? { ...r, variant_name: e.target.value } : r))}
                            className={`rounded-lg border px-3 py-1.5 text-xs outline-none ${isDark ? 'border-[#1F2430] bg-[#0D1117] text-white' : 'border-gray-200 bg-white text-gray-900'} focus:border-[#CCFF00]`} />
                          <input type="number" placeholder="Stock" value={v.stock}
                            onChange={e => setVariants(prev => prev.map((r, j) => j === i ? { ...r, stock: parseInt(e.target.value) || 0 } : r))}
                            className={`w-16 rounded-lg border px-2 py-1.5 text-xs font-mono outline-none ${isDark ? 'border-[#1F2430] bg-[#0D1117] text-white' : 'border-gray-200 bg-white text-gray-900'} focus:border-[#CCFF00]`} />
                          <input type="number" placeholder="₹ override" value={v.price_override ?? ''}
                            onChange={e => setVariants(prev => prev.map((r, j) => j === i ? { ...r, price_override: e.target.value ? parseFloat(e.target.value) : null } : r))}
                            className={`w-20 rounded-lg border px-2 py-1.5 text-xs font-mono outline-none ${isDark ? 'border-[#1F2430] bg-[#0D1117] text-white' : 'border-gray-200 bg-white text-gray-900'} focus:border-[#CCFF00]`} />
                          <button type="button" onClick={() => setVariants(prev => prev.filter((_, j) => j !== i))}
                            className={`rounded-lg border p-1.5 ${C.well} ${C.muted} hover:text-red-400 transition`}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => setVariants(prev => [...prev, { variant_name: '', sku: generateSKU(), stock: 0, price_override: null }])}
                        className={`inline-flex items-center gap-2 rounded-xl border border-dashed px-4 py-2.5 text-xs font-bold transition ${C.card} ${C.muted} hover:border-[#CCFF00]/40 hover:text-[#CCFF00]`}>
                        <Plus size={12} /> Add Variant
                      </button>
                    </motion.div>
                  )}

                  {/* Compliance */}
                  {drawerTab === 'compliance' && (
                    <motion.div key="compliance" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={FADE} className="space-y-4">
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>
                          Certifications (JSON)
                        </label>
                        <textarea rows={4}
                          placeholder='{"BIS": "R-41012345", "RoHS": "EU-2015/863", "ISI": "CM/L-1234"}'
                          value={formData.certifications}
                          onChange={e => setFormData(d => ({ ...d, certifications: e.target.value }))}
                          className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono outline-none resize-none transition ${isDark ? 'border-[#1F2430] bg-[#12161F] text-white focus:border-[#CCFF00]' : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-[#CCFF00]'}`}
                        />
                        <div className={`mt-1.5 text-[10px] ${C.muted}`}>Enter certification names and reference numbers in JSON format.</div>
                      </div>
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>
                          Product Description (B2B)
                        </label>
                        <textarea rows={5}
                          placeholder="Technical specifications, compliance info, warranty terms, packaging details…"
                          value={formData.description}
                          onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                          className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none resize-none transition ${isDark ? 'border-[#1F2430] bg-[#12161F] text-white focus:border-[#CCFF00]' : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-[#CCFF00]'}`}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Drawer footer */}
              <div className={`flex items-center justify-between border-t px-5 py-4 ${C.divider}`}>
                <button onClick={() => setDrawerOpen(false)} className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${C.well} ${C.muted} hover:text-white`}>
                  Cancel
                </button>
                <motion.button
                  whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                  onClick={handleSave} disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-xs font-black uppercase tracking-widest text-[#CCFF00] shadow-[0_0_16px_rgba(204,255,0,0.2)] disabled:opacity-50 transition active:scale-95"
                >
                  {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                  {editProduct ? 'Update Listing' : 'Publish to Catalog'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          BULK ACTION BAR
         ═══════════════════════════════════════ */}
      <BulkActionBar
        selectedCount={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: 'Activate',   onClick: () => bulkActivate('active'),     icon: <Eye size={11} /> },
          { label: 'Deactivate', onClick: () => bulkActivate('suppressed'), icon: <EyeOff size={11} /> },
          { label: 'Price',      onClick: () => setBulkPriceOpen(true),     icon: <Filter size={11} /> },
          { label: 'Export CSV', onClick: exportCSV,                        icon: <Download size={11} /> },
          { label: 'Delete',     onClick: bulkDelete,  danger: true,        icon: <Trash2 size={11} /> },
        ]}
      />

      {/* ═══════════════════════════════════════
          BULK PRICE MODAL
         ═══════════════════════════════════════ */}
      <AnimatePresence>
        {bulkPriceOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setBulkPriceOpen(false); }}>
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }} transition={SPRING}
              className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl ${isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white'}`}>
              <h3 className={`text-base font-black ${C.text}`}>Bulk Price Update</h3>
              <p className={`mt-1 text-xs ${C.muted}`}>Set a new price for {selected.size} selected products.</p>
              <input type="number" placeholder="New price (₹)" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)}
                className={`mt-4 w-full rounded-xl border px-4 py-3 text-sm font-mono outline-none transition ${isDark ? 'border-[#1F2430] bg-[#12161F] text-white focus:border-[#CCFF00]' : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-[#CCFF00]'}`} />
              <div className="mt-4 flex gap-2.5">
                <button onClick={() => setBulkPriceOpen(false)} className={`flex-1 rounded-full border py-2.5 text-xs font-bold uppercase tracking-wider transition ${C.well} ${C.muted}`}>Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={bulkPriceUpdate}
                  className="flex-1 rounded-full bg-black py-2.5 text-xs font-black uppercase tracking-widest text-[#CCFF00] shadow-[0_0_16px_rgba(204,255,0,0.2)] transition">
                  Apply
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          DELETE CONFIRM
         ═══════════════════════════════════════ */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product?"
        body={`"${deleteTarget?.name}" will be permanently removed from your catalog and the buyer storefront.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ═══════════════════════════════════════
          CSV UPLOAD DRAWER
         ═══════════════════════════════════════ */}
      <AnimatePresence>
        {csvOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) setCsvOpen(false); }}>
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }} transition={SPRING}
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-5">
                <h3 className={`text-base font-black ${C.text}`}>Bulk CSV Upload</h3>
                <button onClick={() => setCsvOpen(false)} className={C.muted}><X size={14} /></button>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed py-10 gap-3 transition hover:border-[#CCFF00]/40 ${C.card}`}
              >
                <Upload size={24} className={C.muted} />
                <div className={`text-sm font-bold ${C.text}`}>Drop CSV file here</div>
                <div className={`text-xs ${C.muted}`}>or click to browse</div>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCsvLoading(true); setCsvProgress(0);
                    // Simulate progress + parse
                    let progress = 0;
                    const iv = setInterval(() => {
                      progress += 12;
                      setCsvProgress(Math.min(progress, 90));
                      if (progress >= 90) clearInterval(iv);
                    }, 150);
                    await new Promise(r => setTimeout(r, 1200));
                    clearInterval(iv); setCsvProgress(100);
                    setTimeout(() => {
                      setCsvLoading(false); setCsvOpen(false); setCsvProgress(0);
                      toast.success('CSV imported — products queued for review');
                      loadProducts(true);
                    }, 400);
                  }}
                />
              </div>
              {csvLoading && (
                <div className="mt-4">
                  <div className={`flex justify-between text-[10px] font-bold mb-1.5 ${C.muted}`}>
                    <span>Importing…</span><span>{csvProgress}%</span>
                  </div>
                  <div className={`h-1.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-[#12161F]' : 'bg-gray-100'}`}>
                    <motion.div animate={{ width: `${csvProgress}%` }} transition={{ ease: 'easeOut' }}
                      className="h-full rounded-full bg-[#CCFF00]" />
                  </div>
                </div>
              )}
              <div className={`mt-4 rounded-xl border p-3 text-[10px] leading-relaxed ${C.well} ${C.muted}`}>
                <strong className={C.text}>Required columns:</strong> name, price, category, stock<br/>
                <strong className={C.text}>Optional:</strong> brand, sku, description, original_price, primary_image
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SellerShell>
  );
}
