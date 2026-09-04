import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Edit3,
  ExternalLink,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  Minus,
  Moon,
  Package,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  Truck,
  Wallet,
  X,
  Zap,
  CheckCircle2,
  Filter,
  SlidersHorizontal,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import {
  supabase,
  getLiveCatalog,
  getLiveOrders,
  getDashboardMetrics,
  pingSupabase,
  insertProductToCatalog,
  updateProductInCatalog,
  updateProductStock,
  deleteProductFromCatalog,
  getBuyerProductUrl,
  VALID_CATEGORIES,
  BUYER_STOREFRONT_URL,
  type SupabaseProduct,
  type SupabaseOrder,
  type ValidCategory
} from '@/lib/supabase';
import { SafeImage } from '@/components/SafeImage';
import { useTheme } from '@/contexts/ThemeContext';

// ─── Animation presets ───────────────────────────────────────────────────────
const SPRING_TABS   = { type: 'spring', stiffness: 380, damping: 30 } as const;
const SPRING_MODAL  = { type: 'spring', stiffness: 300, damping: 25 } as const;
const FADE_SLIDE    = { duration: 0.2, ease: 'easeOut' } as const;

const TAB_CONTENT_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

// ─── Pagination constants ─────────────────────────────────────────────────────
const GRID_PAGE_SIZE  = 12;
const TABLE_PAGE_SIZE = 20;
const ORDER_PAGE_SIZE = 20;

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'catalog',  label: 'Live Catalog',       short: 'Catalog',    icon: Package,       route: '/seller/dashboard' },
  { id: 'orders',   label: 'Fulfillment Queue',   short: 'Orders',     icon: ClipboardList, route: '/seller/orders'    },
  { id: 'rfq',      label: 'Buyer RFQs',          short: 'RFQs',       icon: Quote,         route: '/seller/rfq'       },
  { id: 'payouts',  label: 'Payout Ledger',       short: 'Payouts',    icon: Wallet,        route: '/seller/payouts'   },
  { id: 'health',   label: 'Account Health',      short: 'Health',     icon: BarChart3,     route: '/seller/health'    },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateSKU() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let sku = 'FL-';
  for (let i = 0; i < 8; i++) sku += chars[Math.floor(Math.random() * chars.length)];
  return sku;
}

function formatINR(value: number) {
  return '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function bucketOrdersByDay(orders: SupabaseOrder[]) {
  const map: Record<string, number> = {};
  orders.forEach(o => {
    const day = o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A';
    map[day] = (map[day] || 0) + (Number(o.total_amount) || 0);
  });
  return Object.entries(map)
    .slice(-14)
    .map(([date, revenue]) => ({ date, revenue }));
}

function stockByCategory(products: SupabaseProduct[]) {
  const map: Record<string, number> = {};
  products.forEach(p => {
    const cat = p.category || 'Other';
    map[cat] = (map[cat] || 0) + (p.stock || 0);
  });
  return Object.entries(map).map(([category, stock]) => ({ category, stock }));
}

function orderStatusDistribution(orders: SupabaseOrder[]) {
  const map: Record<string, number> = {};
  orders.forEach(o => {
    const s = (o.delivery_status || 'pending').toLowerCase();
    map[s] = (map[s] || 0) + 1;
  });
  const colors: Record<string, string> = {
    pending:    '#F59E0B',
    processing: '#3B82F6',
    dispatched: '#8B5CF6',
    delivered:  '#52E82E',
  };
  return Object.entries(map).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: colors[name] || '#6B7280',
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Themed surface card */
function Card({ children, className = '', hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  const { isDark } = useTheme();
  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        isDark
          ? `border-neutral-800/80 bg-[#0D1117] ${hover ? 'hover:border-[#CCFF00]/30 hover:shadow-[0_4px_24px_rgba(0,0,0,0.6)]' : ''}`
          : `border-gray-200 bg-white ${hover ? 'hover:border-[#CCFF00]/50 hover:shadow-lg' : ''}`
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Primary CTA button with neon glow */
function AccentButton({
  children, onClick, type = 'button', disabled = false, className = '', size = 'md'
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const pad = size === 'sm' ? 'px-4 py-2' : size === 'lg' ? 'px-8 py-4' : 'px-5 py-3';
  const txt = size === 'sm' ? 'text-[10px]' : 'text-xs';
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1, boxShadow: '0 0 28px rgba(204,255,0,0.45)' }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={SPRING_MODAL}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#CCFF00] font-black uppercase tracking-wider text-black shadow-[0_0_20px_rgba(204,255,0,0.25)] transition-opacity ${pad} ${txt} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** Ghost button */
function GhostButton({
  children, onClick, type = 'button', disabled = false, className = '', danger = false
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  danger?: boolean;
}) {
  const { isDark } = useTheme();
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -0.5 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={SPRING_MODAL}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
        isDark
          ? danger
            ? 'border-red-800 bg-[#12161F] text-red-400 hover:border-red-500 hover:text-red-300'
            : 'border-neutral-800 bg-[#12161F] text-neutral-400 hover:border-neutral-600 hover:text-white'
          : danger
            ? 'border-red-200 bg-red-50 text-red-600 hover:border-red-300'
            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-900'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </motion.button>
  );
}

/** Status chip */
function StatusChip({ label, variant = 'default' }: { label: string; variant?: 'success' | 'warning' | 'danger' | 'default' | 'accent' }) {
  const variants = {
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger:  'bg-red-500/10 text-red-400 border-red-500/20',
    accent:  'bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/20',
    default: 'bg-neutral-800/50 text-neutral-400 border-neutral-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${variants[variant]}`}>
      {label}
    </span>
  );
}

/** Breadcrumb */
function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  const { isDark } = useTheme();
  return (
    <nav className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-5">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className={isDark ? 'text-neutral-700' : 'text-gray-300'}>/</span>}
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} className={`transition ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-700'}`}>
              {item.label}
            </Link>
          ) : (
            <span className={isDark ? 'text-neutral-300' : 'text-gray-600'}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/** Pagination controls */
function Pagination({
  page, totalPages, onPrev, onNext
}: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  const { isDark } = useTheme();
  if (totalPages <= 1) return null;
  const base = `rounded-full border px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition disabled:opacity-40 ${
    isDark
      ? 'border-neutral-800 bg-[#12161F] text-neutral-400 hover:border-neutral-700 hover:text-white'
      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-800'
  }`;
  return (
    <div className="flex items-center justify-center gap-3 pt-6">
      <button onClick={onPrev} disabled={page <= 1} className={base}>
        <ChevronLeft size={14} className="inline -mt-0.5" /> Prev
      </button>
      <span className={`text-xs font-mono font-semibold tabular-nums ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
        {page} / {totalPages}
      </span>
      <button onClick={onNext} disabled={page >= totalPages} className={base}>
        Next <ChevronRight size={14} className="inline -mt-0.5" />
      </button>
    </div>
  );
}

/** Inline step progress dots */
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          animate={{ scale: i === current - 1 ? 1 : 0.75, opacity: i < current ? 1 : 0.3 }}
          transition={SPRING_TABS}
          className={`h-2 rounded-full ${i === current - 1 ? 'w-6 bg-[#CCFF00]' : 'w-2 bg-neutral-600'}`}
        />
      ))}
    </div>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-neutral-800 bg-[#0D1117] px-3 py-2.5 text-xs shadow-xl">
      <div className="font-bold text-neutral-400 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="font-mono font-semibold" style={{ color: p.color }}>
          {p.name === 'revenue' ? formatINR(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN SELLER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function SellerDashboard({ initialTab }: { initialTab?: TabId } = {}) {
  const [location, navigate] = useLocation();
  const { theme, isDark, toggleTheme } = useTheme();

  // ── Tab routing ──
  const getTabFromPath = (path: string): TabId => {
    if (initialTab) return initialTab;
    if (path.includes('/seller/orders'))  return 'orders';
    if (path.includes('/seller/rfq'))     return 'rfq';
    if (path.includes('/seller/payouts')) return 'payouts';
    if (path.includes('/seller/health'))  return 'health';
    return 'catalog';
  };

  const [activeTab, setActiveTab] = useState<TabId>(() => getTabFromPath(location || ''));

  useEffect(() => {
    const tab = initialTab || getTabFromPath(location || '');
    setActiveTab(tab);
  }, [location, initialTab]);

  // ── Data state ──
  const [products, setProducts] = useState<SupabaseProduct[]>([]);
  const [orders,   setOrders]   = useState<SupabaseOrder[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Metrics ──
  const [metrics, setMetrics] = useState({
    grossRevenue: 0, pendingOrders: 0, totalOrders: 0, skuCount: 0, healthIndex: 98
  });

  // ── Filters & view ──
  const [searchQuery,       setSearchQuery]       = useState('');
  const [selectedCategory,  setSelectedCategory]  = useState('All');
  const [inStockOnly,       setInStockOnly]        = useState(false);
  const [viewMode,          setViewMode]           = useState<'grid' | 'table'>('grid');

  // ── Pagination ──
  const [catalogPage, setCatalogPage] = useState(1);
  const [orderPage,   setOrderPage]   = useState(1);

  // ── Modal / Drawer state ──
  const [isDrawerOpen,    setIsDrawerOpen]    = useState(false);
  const [drawerStep,      setDrawerStep]      = useState(1);
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [editingProduct,  setEditingProduct]  = useState<SupabaseProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<SupabaseProduct | null>(null);
  const [isDeleting,      setIsDeleting]      = useState(false);
  const [dispatchModal,   setDispatchModal]   = useState(false);
  const [selectedOrder,   setSelectedOrder]   = useState<any>(null);
  const [carrier,         setCarrier]         = useState('Delhivery Express');
  const [trackingId,      setTrackingId]      = useState('');

  // ── AI Copilot ──
  const [isAiOpen,  setIsAiOpen]  = useState(false);
  const [aiInput,   setAiInput]   = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChat,    setAiChat]    = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([{
    role: 'assistant',
    text: 'Flash Merchant Copilot ready. Ask me to analyze inventory, draft product descriptions, review pricing strategy, or check SLA performance.'
  }]);

  // ── Form state ──
  const EMPTY_FORM = {
    name: '', brand: 'Flash Verified', category: 'Electronics' as ValidCategory,
    sku: generateSKU(), price: '', original_price: '', stock: '10',
    description: '', primary_image: ''
  };
  const [formData,   setFormData]   = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Stock debounce ──
  const stockTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [stockUpdating, setStockUpdating] = useState<Record<string, boolean>>({});

  // ── Data load ──
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [prods, ords, kpis] = await Promise.all([
        getLiveCatalog(), getLiveOrders(), getDashboardMetrics()
      ]);
      setProducts(prods || []);
      setOrders(ords   || []);
      const liveRev = kpis.grossRevenue > 0
        ? kpis.grossRevenue
        : (ords || []).reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
      const livePending = (ords || []).filter(o => (o.delivery_status || '').toLowerCase() === 'pending').length;
      setMetrics({
        grossRevenue:  liveRev,
        pendingOrders: livePending,
        totalOrders:   ords?.length || 0,
        skuCount:      prods?.length || 0,
        healthIndex:   Math.min(100, Math.max(90, 100 - livePending * 2)),
      });
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('seller-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadData(true))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      Object.values(stockTimers.current).forEach(clearTimeout);
    };
  }, [loadData]);

  // ── Tab switch ──
  const switchTab = (id: TabId) => {
    setActiveTab(id);
    const tab = TABS.find(t => t.id === id);
    if (tab) navigate(tab.route);
    setCatalogPage(1);
    setOrderPage(1);
  };

  // ── Drawer open ──
  const openAddDrawer = () => {
    setEditingProduct(null);
    setFormData({ ...EMPTY_FORM, sku: generateSKU() });
    setFormErrors({});
    setDrawerStep(1);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (p: SupabaseProduct) => {
    setEditingProduct(p);
    let catMatched: ValidCategory = 'Electronics';
    const cleanCat = (p.category || '').toLowerCase().replace(/[-_]/g, ' ');
    for (const v of VALID_CATEGORIES) {
      if (cleanCat.includes(v.toLowerCase()) || v.toLowerCase().includes(cleanCat)) {
        catMatched = v; break;
      }
    }
    setFormData({
      name: p.name, brand: p.brand || 'Flash Verified', category: catMatched,
      sku: generateSKU(), price: String(p.price),
      original_price: String(p.original_price || p.price),
      stock: String(p.stock), description: p.description || '', primary_image: p.primary_image || ''
    });
    setFormErrors({});
    setDrawerStep(1);
    setIsDrawerOpen(true);
  };

  // ── Discount preview ──
  const previewDiscount = useMemo(() => {
    const p = parseFloat(formData.price), orig = parseFloat(formData.original_price);
    if (!isNaN(p) && !isNaN(orig) && orig > p && orig > 0)
      return `-${Math.round(((orig - p) / orig) * 100)}%`;
    return null;
  }, [formData.price, formData.original_price]);

  // ── Step validation ──
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!formData.name.trim()) errs.name = 'Product title is required';
    }
    if (step === 2) {
      if (!formData.price || parseFloat(formData.price) <= 0) errs.price = 'Valid price required';
      if (parseInt(formData.stock) < 0) errs.stock = 'Stock must be ≥ 0';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNextStep = () => { if (validateStep(drawerStep)) setDrawerStep(s => s + 1); };
  const goPrevStep = () => setDrawerStep(s => s - 1);

  // ── Form submit ──
  const handleSaveProduct = async () => {
    if (!validateStep(3)) return;
    setIsSubmitting(true);
    try {
      const priceVal  = parseFloat(formData.price);
      const origVal   = formData.original_price ? parseFloat(formData.original_price) : priceVal;
      const stockVal  = parseInt(formData.stock) || 10;
      const img = formData.primary_image.trim() ||
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';

      if (editingProduct?.id) {
        const updated: SupabaseProduct = {
          ...editingProduct, name: formData.name.trim(), brand: formData.brand.trim() || 'Flash',
          category: formData.category, price: priceVal, original_price: origVal,
          stock: stockVal, description: formData.description.trim() || 'Flash verified product.',
          primary_image: img, hover_images: [img]
        };
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
        setIsDrawerOpen(false);
        await updateProductInCatalog(editingProduct.id, updated);
        toast.success(`"${updated.name}" updated in live catalog`);
      } else {
        const payload = {
          name: formData.name.trim(), brand: formData.brand.trim() || 'Flash Verified',
          category: formData.category, price: priceVal, original_price: origVal,
          stock: stockVal, description: formData.description.trim() || 'Flash verified wholesale product.',
          primary_image: img, hover_images: [img], colors: [{ name: 'Obsidian', hex: '#0F1115' }]
        };
        const tempId = `temp-${Date.now()}`;
        const optimistic: SupabaseProduct = { ...payload, id: tempId, created_at: new Date().toISOString() };
        setProducts(prev => [optimistic, ...prev]);
        setIsDrawerOpen(false);
        const inserted = await insertProductToCatalog(payload);
        if (inserted?.id) setProducts(prev => prev.map(p => p.id === tempId ? inserted : p));
        toast.success(`"${formData.name.trim()}" published to catalog`);
      }
      loadData(true);
    } catch (err: any) {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}`);
      loadData(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Stock stepper ──
  const handleStockStep = (product: SupabaseProduct, delta: number) => {
    if (!product.id) return;
    const next = Math.max(0, (product.stock ?? 0) + delta);
    if (next === product.stock) return;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: next } : p));
    if (stockTimers.current[product.id]) clearTimeout(stockTimers.current[product.id]);
    setStockUpdating(prev => ({ ...prev, [product.id!]: true }));
    stockTimers.current[product.id] = setTimeout(async () => {
      try {
        await updateProductStock(product.id!, next);
        toast.success(`${product.name}: stock → ${next}`);
      } catch {
        toast.error('Stock sync failed');
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: product.stock } : p));
      } finally {
        setStockUpdating(prev => ({ ...prev, [product.id!]: false }));
      }
    }, 400);
  };

  // ── Delete ──
  const handleDeleteProduct = async () => {
    if (!productToDelete?.id) return;
    setIsDeleting(true);
    const { id, name } = productToDelete;
    setProducts(prev => prev.filter(p => p.id !== id));
    setProductToDelete(null);
    try {
      await deleteProductFromCatalog(id);
      toast.success(`Removed "${name}" from catalog`);
    } catch {
      toast.error('Delete failed');
      loadData(true);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Filtered & paginated products ──
  const filteredProducts = useMemo(() => products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
    const matchCat = selectedCategory === 'All' ||
      (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase().replace(/ & /g, '-')) ||
      selectedCategory.toLowerCase().includes((p.category || '').toLowerCase());
    const matchStock = !inStockOnly || (p.stock ?? 0) > 0;
    return matchSearch && matchCat && matchStock;
  }), [products, searchQuery, selectedCategory, inStockOnly]);

  const gridPages  = Math.max(1, Math.ceil(filteredProducts.length / GRID_PAGE_SIZE));
  const tablePages = Math.max(1, Math.ceil(filteredProducts.length / TABLE_PAGE_SIZE));
  const orderPages = Math.max(1, Math.ceil(orders.length / ORDER_PAGE_SIZE));

  const paginatedGrid  = filteredProducts.slice((catalogPage - 1) * GRID_PAGE_SIZE,  catalogPage * GRID_PAGE_SIZE);
  const paginatedTable = filteredProducts.slice((catalogPage - 1) * TABLE_PAGE_SIZE, catalogPage * TABLE_PAGE_SIZE);
  const paginatedOrders = orders.slice((orderPage - 1) * ORDER_PAGE_SIZE, orderPage * ORDER_PAGE_SIZE);

  // ── Analytics data ──
  const revenueData     = useMemo(() => bucketOrdersByDay(orders), [orders]);
  const stockCatData    = useMemo(() => stockByCategory(products),        [products]);
  const orderPieData    = useMemo(() => orderStatusDistribution(orders),  [orders]);

  // ── AI Copilot ──
  const handleAiSend = (prompt?: string) => {
    const query = (prompt || aiInput).trim();
    if (!query) return;
    setAiChat(prev => [...prev, { role: 'user', text: query }]);
    setAiInput('');
    setAiLoading(true);
    setTimeout(() => {
      const q = query.toLowerCase();
      let reply = '';
      if (q.includes('stock') || q.includes('inventory')) {
        const low = products.filter(p => (p.stock ?? 0) < 10);
        reply = `Inventory Report:\n• Active SKUs: ${products.length}\n• Low-stock alerts (< 10 units): ${low.length}${low.length ? ' — ' + low.slice(0,3).map(p => p.name).join(', ') : ''}\n• Recommendation: Set reorder point at 15 units for predictable replenishment.`;
      } else if (q.includes('pricing') || q.includes('margin') || q.includes('discount')) {
        reply = `Pricing Strategy:\n• SKU count: ${products.length}\n• Average selling price: ${products.length ? formatINR(products.reduce((a,p) => a + p.price, 0) / products.length) : '—'}\n• Tip: Bundle discount tiers at 10+ and 50+ units lift B2B repeat rate by ~34%.`;
      } else if (q.includes('description') || q.includes('draft') || q.includes('seo')) {
        reply = `B2B Product Copy Template:\n"Engineered for high-throughput enterprise environments. RoHS/BIS certified. Industrial-grade thermal resilience. Supplied with full warranty documentation and tiered wholesale pricing. MOQ: 10 units."`;
      } else {
        reply = `Flash Merchant Copilot:\n• Catalog: ${products.length} active SKUs\n• Revenue: ${formatINR(metrics.grossRevenue)}\n• Pending shipments: ${metrics.pendingOrders}\n• Merchant Health: ${metrics.healthIndex}/100`;
      }
      setAiChat(prev => [...prev, { role: 'assistant', text: reply }]);
      setAiLoading(false);
    }, 600);
  };

  const handleLogout = () => {
    try { localStorage.removeItem('flash-role'); } catch {}
    toast.success('Signed out of Seller Central');
    navigate('/auth/login');
  };

  // ── Theme-aware class helpers ──
  const C = {
    base:       isDark ? 'bg-[#000000] text-[#F9FAFB]' : 'bg-[#F8F9FA] text-[#111827]',
    header:     isDark ? 'border-neutral-800/80 bg-[#000000]/90' : 'border-gray-200 bg-white/90',
    heroCard:   isDark ? 'border-neutral-800/80 bg-[#0D1117]' : 'border-gray-200 bg-white',
    well:       isDark ? 'bg-[#12161F] border-neutral-800' : 'bg-gray-50 border-gray-200',
    input:      isDark ? 'border-neutral-800 bg-[#12161F] text-white placeholder:text-neutral-600 focus:border-[#CCFF00]' : 'border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-[#CCFF00]',
    select:     isDark ? 'border-neutral-800 bg-[#12161F] text-white' : 'border-gray-200 bg-gray-50 text-gray-900',
    label:      isDark ? 'text-neutral-400' : 'text-gray-500',
    muted:      isDark ? 'text-neutral-400' : 'text-gray-500',
    subtle:     isDark ? 'text-neutral-600' : 'text-gray-400',
    divider:    isDark ? 'border-neutral-800' : 'border-gray-100',
    tabActive:  'bg-[#CCFF00] text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]',
    tabInactive: isDark ? 'border border-neutral-800 bg-[#0D1117] text-neutral-500 hover:text-white' : 'border border-gray-200 bg-white text-gray-500 hover:text-gray-900',
    tableRow:   isDark ? 'hover:bg-[#12161F]/60' : 'hover:bg-gray-50',
    pill:       isDark ? 'border-neutral-800 bg-[#12161F]' : 'border-gray-200 bg-gray-50',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={FADE_SLIDE}
      className={`min-h-screen antialiased selection:bg-[#CCFF00] selection:text-black ${C.base}`}
    >
      {/* ═══════════════════════════════════════
          TOP NAVIGATION BAR
         ═══════════════════════════════════════ */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${C.header}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/seller/dashboard" className="flex items-center gap-2.5">
              <motion.span
                whileHover={{ scale: 1.05 }}
                className="grid h-9 w-9 place-items-center rounded-xl bg-[#CCFF00] text-black shadow-[0_0_16px_rgba(204,255,0,0.3)]"
              >
                <Zap size={20} fill="currentColor" />
              </motion.span>
              <div className="hidden sm:flex flex-col leading-none">
                <span className={`text-base font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  flash<span className="text-[#CCFF00]">.merchant</span>
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${C.subtle}`}>
                  Seller Central
                </span>
              </div>
            </Link>

            {/* Operational status badge — no raw debug info */}
            <div className={`hidden md:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${C.pill}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#52E82E] shadow-[0_0_6px_#52E82E] animate-pulse" />
              <span className={isDark ? 'text-neutral-400' : 'text-gray-500'}>Operational</span>
            </div>
          </div>

          {/* Right nav */}
          <div className="flex items-center gap-2">
            {/* View Storefront */}
            <a
              href={BUYER_STOREFRONT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[10px] font-black uppercase tracking-wider transition hover:-translate-y-0.5 ${
                isDark
                  ? 'border-neutral-700 bg-[#12161F] text-neutral-300 hover:border-[#CCFF00] hover:text-[#CCFF00]'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#CCFF00] hover:text-black'
              }`}
            >
              Storefront <ExternalLink size={11} />
            </a>

            {/* Refresh */}
            <motion.button
              whileTap={{ rotate: 360 }}
              transition={{ duration: 0.4 }}
              onClick={() => { loadData(); toast.success('Catalog refreshed'); }}
              disabled={isRefreshing}
              className={`rounded-full border p-2 transition ${C.pill} ${C.muted} hover:text-[#CCFF00] disabled:opacity-50`}
              title="Refresh"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-[#CCFF00]' : ''} />
            </motion.button>

            {/* Theme toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className={`rounded-full border p-2 transition ${C.pill} ${C.muted} hover:text-[#CCFF00]`}
              title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0,   scale: 1   }}
                  exit={{   opacity: 0, rotate: 30,   scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                  className="block"
                >
                  {isDark ? <Sun size={15} /> : <Moon size={15} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            {/* Bell */}
            <button className={`rounded-full border p-2 transition ${C.pill} ${C.muted} hover:text-white relative`}>
              <Bell size={15} />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#CCFF00]" />
            </button>

            {/* Avatar + name */}
            <div className={`flex items-center gap-2 border-l pl-3 ${C.divider}`}>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#CCFF00] text-[10px] font-black text-black select-none">
                NS
              </div>
              <div className="hidden lg:block">
                <div className={`text-xs font-black leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Northstar Co.</div>
                <StatusChip label="Verified Tier 1" variant="accent" />
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleLogout}
                className={`ml-1 rounded-full p-1.5 transition ${C.muted} hover:text-red-400`}
                title="Sign out"
              >
                <LogOut size={14} />
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          MAIN CONTENT
         ═══════════════════════════════════════ */}
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">

        {/* ── HERO BANNER ── */}
        <div className={`relative mb-7 overflow-hidden rounded-3xl border p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 ${C.heroCard}`}>
          {/* Glow orbs */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#CCFF00]/8 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#CCFF00]/4 blur-3xl" />

          {/* Left */}
          <div className="relative z-10 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip label="⚡ Flash Merchant Hub" variant="accent" />
              <StatusChip label="Enterprise Cloud Sync" variant="success" />
            </div>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Seller &amp; Merchant Dashboard
            </h1>
            <p className={`max-w-lg text-sm font-medium ${C.muted}`}>
              Manage live storefront listings, sync real-time inventory, and track wholesale fulfillment.
            </p>
          </div>

          {/* Right */}
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <AccentButton onClick={openAddDrawer} size="lg">
              <Plus size={15} /> Add Product
            </AccentButton>
            <GhostButton onClick={handleLogout}>
              <LogOut size={13} /> Sign Out
            </GhostButton>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'Active SKUs',
              value: metrics.skuCount.toString().padStart(2, '0'),
              sub: 'Live catalog count',
              subVariant: 'success' as const,
              icon: Package,
            },
            {
              label: 'Gross Revenue',
              value: formatINR(metrics.grossRevenue),
              sub: 'All-time order volume',
              subVariant: 'success' as const,
              icon: TrendingUp,
              isMono: true,
            },
            {
              label: 'Pending Shipments',
              value: metrics.pendingOrders.toString().padStart(2, '0'),
              sub: 'Awaiting dispatch',
              subVariant: 'warning' as const,
              icon: Truck,
            },
            {
              label: 'Merchant Health',
              value: `${metrics.healthIndex}`,
              valueSuffix: '/100',
              sub: 'Good standing · 99.4% SLA',
              subVariant: 'success' as const,
              icon: Shield,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                whileHover={{ y: -3 }}
                transition={SPRING_MODAL}
                className={`relative overflow-hidden rounded-2xl border p-5 transition ${C.heroCard}`}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${C.label}`}>{card.label}</span>
                  <Icon size={15} className="text-[#CCFF00]" />
                </div>
                <div className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {card.value}
                  {card.valueSuffix && <span className={`text-sm font-normal ${C.subtle}`}>{card.valueSuffix}</span>}
                </div>
                <div className={`mt-1.5 text-[10px] font-semibold ${
                  card.subVariant === 'success' ? 'text-[#52E82E]' :
                  card.subVariant === 'warning' ? 'text-amber-400' : C.muted
                }`}>{card.sub}</div>
              </motion.div>
            );
          })}
        </div>

        {/* ── TAB NAVIGATION ── */}
        <LayoutGroup>
          <div className={`mb-6 flex items-center justify-between gap-4 border-b pb-4 ${C.divider}`}>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {TABS.map(tab => {
                const Icon  = tab.icon;
                const isAct = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition whitespace-nowrap ${
                      isAct ? C.tabActive : C.tabInactive
                    }`}
                    whileHover={!isAct ? { y: -0.5 } : undefined}
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING_TABS}
                  >
                    {isAct && (
                      <motion.span
                        layoutId="activeTabBg"
                        className="absolute inset-0 rounded-full bg-[#CCFF00] -z-10"
                        transition={SPRING_TABS}
                      />
                    )}
                    <Icon size={12} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.short}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Inline add shortcut */}
            <button
              onClick={openAddDrawer}
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[10px] font-black text-[#CCFF00] transition hover:border-[#CCFF00] ${C.pill}`}
            >
              <Plus size={12} /> New Listing
            </button>
          </div>
        </LayoutGroup>

        {/* ── TAB CONTENT ── */}
        <AnimatePresence mode="wait">
          {/* ════ CATALOG TAB ════ */}
          {activeTab === 'catalog' && (
            <motion.div key="catalog" variants={TAB_CONTENT_VARIANTS} initial="initial" animate="animate" exit="exit" transition={FADE_SLIDE}>
              <Breadcrumb items={[{ label: 'Dashboard', href: '/seller/dashboard' }, { label: 'Live Catalog & Inventory' }]} />

              {/* Filter bar */}
              <div className={`mb-5 flex flex-col gap-3 rounded-2xl border p-3 md:flex-row md:items-center ${C.heroCard}`}>
                <div className={`flex flex-1 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${C.well}`}>
                  <Search size={14} className={C.subtle} />
                  <input
                    type="text"
                    placeholder="Search by title, brand, or category…"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCatalogPage(1); }}
                    className={`w-full bg-transparent text-xs outline-none ${isDark ? 'text-white placeholder:text-neutral-600' : 'text-gray-900 placeholder:text-gray-400'}`}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className={C.subtle + ' hover:text-red-400'}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                  {['All', ...VALID_CATEGORIES].map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setCatalogPage(1); }}
                      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
                        selectedCategory === cat ? C.tabActive : C.tabInactive
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className={`hidden sm:flex items-center gap-1 border-l pl-3 ${C.divider}`}>
                  {(['grid','table'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={`rounded-lg p-2 transition ${viewMode === m ? 'bg-[#CCFF00] text-black' : C.muted + ' hover:text-white'}`}
                      title={m === 'grid' ? 'Grid View' : 'Table View'}
                    >
                      {m === 'grid' ? <Layers size={14} /> : <ClipboardList size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results count */}
              {!isLoading && filteredProducts.length > 0 && (
                <div className={`mb-3 text-[10px] font-semibold ${C.subtle}`}>
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} · Page {catalogPage} of {viewMode === 'grid' ? gridPages : tablePages}
                </div>
              )}

              {/* Content */}
              {isLoading ? (
                <div className={`flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border p-12 text-center ${C.heroCard}`}>
                  <Loader2 className="h-7 w-7 animate-spin text-[#CCFF00]" />
                  <div className={`text-sm font-semibold ${C.muted}`}>Loading catalog…</div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-12 text-center ${C.heroCard}`}
                >
                  <div className={`grid h-14 w-14 place-items-center rounded-2xl border ${C.well}`}>
                    <Package className="h-7 w-7 text-[#CCFF00]" />
                  </div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>No products found</h3>
                  <p className={`max-w-sm text-xs ${C.muted}`}>
                    {searchQuery || selectedCategory !== 'All'
                      ? 'No products match your filters. Try resetting the search or category.'
                      : 'Your catalog is empty. Add your first product to go live on the storefront.'}
                  </p>
                  <AccentButton onClick={openAddDrawer}>
                    <Plus size={13} /> Add First Product
                  </AccentButton>
                </motion.div>
              ) : viewMode === 'grid' ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {paginatedGrid.map(product => {
                      const hasDiscount = (product.original_price || 0) > product.price;
                      const isUpdating  = !!stockUpdating[product.id || ''];
                      const lowStock    = (product.stock ?? 0) > 0 && (product.stock ?? 0) < 10;
                      return (
                        <motion.div
                          key={product.id || product.name}
                          layout
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ y: -4 }}
                          transition={SPRING_MODAL}
                          className={`group flex flex-col rounded-2xl border overflow-hidden transition ${C.heroCard}`}
                        >
                          {/* Image */}
                          <div className={`relative aspect-video w-full overflow-hidden ${isDark ? 'bg-[#12161F]' : 'bg-gray-100'}`}>
                            <SafeImage src={product.primary_image} alt={product.name} fallbackText={product.name}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                            {hasDiscount && (
                              <span className="absolute left-2.5 top-2.5 rounded-full bg-[#CCFF00] px-2 py-0.5 text-[9px] font-black uppercase text-black">
                                {product.discount || 'SALE'}
                              </span>
                            )}
                            {lowStock && (
                              <span className="absolute left-2.5 bottom-2.5 rounded-full bg-amber-500/90 px-2 py-0.5 text-[9px] font-black uppercase text-black backdrop-blur-sm">
                                Low Stock
                              </span>
                            )}
                            <span className="absolute right-2.5 top-2.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                              {product.category}
                            </span>
                            <a href={getBuyerProductUrl(product.id)} target="_blank" rel="noopener noreferrer"
                              className="absolute bottom-2.5 right-2.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 p-1.5 text-white hover:border-[#CCFF00] hover:text-[#CCFF00] transition" title="Preview on storefront">
                              <ExternalLink size={12} />
                            </a>
                          </div>

                          {/* Content */}
                          <div className="flex flex-1 flex-col p-4">
                            <div className={`text-[9px] font-black uppercase tracking-widest ${C.subtle}`}>{product.brand || 'Flash Verified'}</div>
                            <h3 className={`mt-1 text-sm font-bold line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{product.name}</h3>
                            <p className={`mt-0.5 text-[11px] line-clamp-2 ${C.muted}`}>{product.description || 'No description.'}</p>

                            <div className={`mt-3 flex items-center justify-between border-t pt-3 ${C.divider}`}>
                              <div>
                                <div className={`font-mono text-base font-semibold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {formatINR(product.price)}
                                </div>
                                {hasDiscount && (
                                  <div className={`font-mono text-[10px] line-through tabular-nums ${C.subtle}`}>
                                    {formatINR(product.original_price || 0)}
                                  </div>
                                )}
                              </div>

                              {/* Stock stepper */}
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={`text-[9px] font-black uppercase tracking-wider ${C.subtle}`}>Stock</span>
                                <div className={`flex items-center rounded-full border p-0.5 ${C.pill}`}>
                                  <button onClick={() => handleStockStep(product, -1)} disabled={(product.stock ?? 0) <= 0}
                                    className={`grid h-5 w-5 place-items-center rounded-full transition ${C.muted} hover:bg-neutral-800 hover:text-white disabled:opacity-40`}>
                                    <Minus size={9} />
                                  </button>
                                  <span className={`min-w-[2rem] text-center font-mono text-[11px] font-semibold tabular-nums ${isUpdating ? C.subtle : 'text-[#CCFF00]'}`}>
                                    {isUpdating ? '…' : product.stock}
                                  </span>
                                  <button onClick={() => handleStockStep(product, 1)}
                                    className={`grid h-5 w-5 place-items-center rounded-full transition ${C.muted} hover:bg-neutral-800 hover:text-white`}>
                                    <Plus size={9} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className={`mt-3 flex items-center justify-end gap-1.5 border-t pt-3 ${C.divider}`}>
                              <button onClick={() => openEditDrawer(product)}
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${C.pill} ${C.muted} hover:text-white`}>
                                <Edit3 size={11} /> Edit
                              </button>
                              <button onClick={() => setProductToDelete(product)}
                                className={`rounded-full border p-1.5 transition ${C.pill} ${C.muted} hover:border-red-500/50 hover:text-red-400`} title="Delete">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  <Pagination page={catalogPage} totalPages={gridPages} onPrev={() => setCatalogPage(p => p - 1)} onNext={() => setCatalogPage(p => p + 1)} />
                </>
              ) : (
                /* TABLE VIEW */
                <>
                  <div className={`overflow-hidden rounded-2xl border ${C.heroCard}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className={`border-b text-[9px] font-black uppercase tracking-widest ${C.divider} ${isDark ? 'bg-[#12161F] text-neutral-500' : 'bg-gray-50 text-gray-400'}`}>
                          <tr>
                            {['Product', 'Category', 'Price', 'Discount', 'Stock', 'Preview', 'Actions'].map(h => (
                              <th key={h} className={`px-4 py-3 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-neutral-800/50' : 'divide-gray-100'}`}>
                          {paginatedTable.map(p => {
                            const isUpd = !!stockUpdating[p.id || ''];
                            return (
                              <tr key={p.id || p.name} className={`transition ${C.tableRow}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg ${isDark ? 'bg-[#12161F]' : 'bg-gray-100'}`}>
                                      <SafeImage src={p.primary_image} alt={p.name} fallbackText={p.name} className="h-full w-full object-cover" />
                                    </div>
                                    <div>
                                      <div className={`font-bold line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.name}</div>
                                      <div className={`text-[9px] font-mono ${C.subtle}`}>{p.brand || 'Flash'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className={`px-4 py-3 text-[10px] font-bold uppercase ${C.muted}`}>{p.category}</td>
                                <td className={`px-4 py-3 font-mono font-semibold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatINR(p.price)}</td>
                                <td className="px-4 py-3 font-bold text-[#CCFF00]">{p.discount || '–'}</td>
                                <td className="px-4 py-3">
                                  <div className={`inline-flex items-center rounded-full border p-0.5 ${C.pill}`}>
                                    <button onClick={() => handleStockStep(p, -1)} disabled={(p.stock ?? 0) <= 0}
                                      className={`grid h-5 w-5 place-items-center rounded-full transition ${C.muted} hover:bg-neutral-800 hover:text-white disabled:opacity-40`}>
                                      <Minus size={9} />
                                    </button>
                                    <span className={`min-w-[2rem] text-center font-mono text-[11px] font-semibold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {isUpd ? '…' : p.stock}
                                    </span>
                                    <button onClick={() => handleStockStep(p, 1)}
                                      className={`grid h-5 w-5 place-items-center rounded-full transition ${C.muted} hover:bg-neutral-800 hover:text-white`}>
                                      <Plus size={9} />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <a href={getBuyerProductUrl(p.id)} target="_blank" rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold transition ${C.muted} hover:text-[#CCFF00]`}>
                                    Preview <ExternalLink size={10} />
                                  </a>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button onClick={() => openEditDrawer(p)} className={`rounded-lg border p-1.5 transition ${C.pill} ${C.muted} hover:text-white`} title="Edit">
                                      <Edit3 size={12} />
                                    </button>
                                    <button onClick={() => setProductToDelete(p)} className={`rounded-lg border p-1.5 transition ${C.pill} ${C.muted} hover:border-red-500/50 hover:text-red-400`} title="Delete">
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
                  <Pagination page={catalogPage} totalPages={tablePages} onPrev={() => setCatalogPage(p => p - 1)} onNext={() => setCatalogPage(p => p + 1)} />
                </>
              )}
            </motion.div>
          )}

          {/* ════ ORDERS TAB ════ */}
          {activeTab === 'orders' && (
            <motion.div key="orders" variants={TAB_CONTENT_VARIANTS} initial="initial" animate="animate" exit="exit" transition={FADE_SLIDE}>
              <Breadcrumb items={[{ label: 'Dashboard', href: '/seller/dashboard' }, { label: 'Fulfillment Queue' }]} />

              {/* Order funnel chart */}
              <div className="mb-5 grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-4 ${C.label}`}>Revenue Trend (Last 14 Days)</div>
                  {revenueData.length === 0 ? (
                    <div className={`flex h-36 items-center justify-center text-xs ${C.muted}`}>No order data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#CCFF00" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#CCFF00" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1F2430' : '#F1F3F5'} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: isDark ? '#6B7280' : '#9CA3AF' }} />
                        <YAxis tick={{ fontSize: 9, fill: isDark ? '#6B7280' : '#9CA3AF' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="revenue" stroke="#CCFF00" strokeWidth={2} fill="url(#rev-grad)" name="revenue" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card className="p-5">
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-4 ${C.label}`}>Order Status Distribution</div>
                  {orderPieData.length === 0 ? (
                    <div className={`flex h-36 items-center justify-center text-xs ${C.muted}`}>No orders yet</div>
                  ) : (
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width={120} height={120}>
                        <PieChart>
                          <Pie data={orderPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                            {orderPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1.5">
                        {orderPieData.map(d => (
                          <div key={d.name} className="flex items-center gap-2 text-[10px]">
                            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                            <span className={C.muted}>{d.name}</span>
                            <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              <Card className="p-6">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 mb-5 ${C.divider}`}>
                  <div>
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Live Fulfillment Queue</h2>
                    <p className={`mt-0.5 text-xs ${C.muted}`}>Track dispatch statuses and assign courier AWB numbers.</p>
                  </div>
                  <StatusChip label={`${metrics.pendingOrders} Pending`} variant="warning" />
                </div>

                {orders.length === 0 ? (
                  <div className={`py-10 text-center ${C.muted}`}>
                    <Truck className="mx-auto h-7 w-7 mb-2 opacity-40" />
                    <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Queue is clear</div>
                    <div className={`mt-1 text-xs ${C.muted}`}>Orders from the buyer storefront will appear here in real-time.</div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {paginatedOrders.map(ord => (
                      <div key={ord.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 transition ${isDark ? 'border-neutral-800 bg-[#12161F] hover:border-neutral-700' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-[11px] font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{ord.id}</span>
                            <span className={C.subtle}>·</span>
                            <span className={`text-xs font-semibold ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>{ord.customer_name || 'B2B Buyer'}</span>
                          </div>
                          <div className={`text-[10px] ${C.subtle}`}>{ord.customer_email || 'Verified account'}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono text-sm font-semibold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {formatINR(Number(ord.total_amount || 0))}
                          </span>
                          <StatusChip
                            label={ord.delivery_status || 'Pending'}
                            variant={ord.delivery_status === 'delivered' ? 'success' : 'warning'}
                          />
                          <AccentButton size="sm" onClick={() => { setSelectedOrder(ord); setDispatchModal(true); }}>
                            Dispatch
                          </AccentButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Pagination page={orderPage} totalPages={orderPages} onPrev={() => setOrderPage(p => p - 1)} onNext={() => setOrderPage(p => p + 1)} />
              </Card>
            </motion.div>
          )}

          {/* ════ RFQ TAB ════ */}
          {activeTab === 'rfq' && (
            <motion.div key="rfq" variants={TAB_CONTENT_VARIANTS} initial="initial" animate="animate" exit="exit" transition={FADE_SLIDE}>
              <Breadcrumb items={[{ label: 'Dashboard', href: '/seller/dashboard' }, { label: 'Buyer RFQs' }]} />
              <Card className="p-8 text-center">
                <Quote className="mx-auto h-10 w-10 text-[#CCFF00] opacity-60 mb-4" />
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>No Active RFQ Inquiries</h2>
                <p className={`mt-2 max-w-md mx-auto text-sm ${C.muted}`}>
                  Custom wholesale quote requests from enterprise buyers will appear here in real-time once your catalog reaches 10+ active SKUs.
                </p>
                <div className={`mt-6 grid gap-3 sm:grid-cols-3 text-left`}>
                  {['Volume Pricing Inquiry', 'Custom Specification Request', 'Long-Term Supply Contract'].map(item => (
                    <div key={item} className={`rounded-xl border p-4 ${isDark ? 'border-neutral-800 bg-[#12161F]' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="h-6 w-6 rounded-lg bg-[#CCFF00]/10 flex items-center justify-center mb-2">
                        <Quote size={12} className="text-[#CCFF00]" />
                      </div>
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item}</div>
                      <div className={`text-[10px] mt-0.5 ${C.muted}`}>Awaiting enterprise buyer inquiries</div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* ════ PAYOUTS TAB ════ */}
          {activeTab === 'payouts' && (
            <motion.div key="payouts" variants={TAB_CONTENT_VARIANTS} initial="initial" animate="animate" exit="exit" transition={FADE_SLIDE}>
              <Breadcrumb items={[{ label: 'Dashboard', href: '/seller/dashboard' }, { label: 'Payout Ledger' }]} />

              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                {[
                  { label: 'Ready for Disbursement', value: formatINR(metrics.grossRevenue * 0.92), sub: 'Net after platform fee', action: 'Request Payout', variant: 'accent' as const },
                  { label: 'Escrow Hold', value: formatINR(metrics.grossRevenue * 0.08), sub: '7-day post-delivery inspection window', action: null },
                  { label: 'Commission Tier', value: '8.0%', sub: 'Flash Platform Standard — Verified', action: null },
                ].map(card => (
                  <Card key={card.label} className="p-6">
                    <div className={`text-[10px] font-black uppercase tracking-widest ${C.label}`}>{card.label}</div>
                    <div className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${card.variant === 'accent' ? 'text-[#CCFF00]' : isDark ? 'text-white' : 'text-gray-900'}`}>
                      {card.value}
                    </div>
                    <div className={`mt-1 text-[10px] ${C.muted}`}>{card.sub}</div>
                    {card.action && (
                      <AccentButton className="mt-4 w-full" onClick={() => toast.success('Disbursement requested to primary current account')}>
                        {card.action}
                      </AccentButton>
                    )}
                  </Card>
                ))}
              </div>

              {/* Revenue chart on payouts */}
              <Card className="p-6">
                <div className={`text-[10px] font-black uppercase tracking-widest mb-4 ${C.label}`}>Revenue Trend</div>
                {revenueData.length === 0 ? (
                  <div className={`flex h-48 items-center justify-center text-xs ${C.muted}`}>No order history yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pay-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#CCFF00" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#CCFF00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1F2430' : '#F1F3F5'} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: isDark ? '#6B7280' : '#9CA3AF' }} />
                      <YAxis tick={{ fontSize: 9, fill: isDark ? '#6B7280' : '#9CA3AF' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#CCFF00" strokeWidth={2} fill="url(#pay-grad)" name="revenue" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </motion.div>
          )}

          {/* ════ HEALTH TAB ════ */}
          {activeTab === 'health' && (
            <motion.div key="health" variants={TAB_CONTENT_VARIANTS} initial="initial" animate="animate" exit="exit" transition={FADE_SLIDE}>
              <Breadcrumb items={[{ label: 'Dashboard', href: '/seller/dashboard' }, { label: 'Account Health' }]} />

              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                {[
                  { label: 'Late Dispatch Rate', value: '0.4%', target: '< 1.0%', good: true },
                  { label: 'Order Cancellation', value: '0.1%', target: '< 0.5%', good: true },
                  { label: 'Avg. Response Time', value: '42 min', target: '< 2 hrs', good: true },
                ].map(stat => (
                  <Card key={stat.label} className="p-5">
                    <div className={`text-[10px] font-black uppercase tracking-widest ${C.label}`}>{stat.label}</div>
                    <div className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${stat.good ? 'text-[#52E82E]' : 'text-amber-400'}`}>
                      {stat.value}
                    </div>
                    <div className={`mt-1 text-[10px] ${C.subtle}`}>Target: {stat.target}</div>
                    <div className={`mt-2 h-1.5 w-full rounded-full ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                      <div className="h-full rounded-full bg-[#52E82E]" style={{ width: stat.good ? '92%' : '55%' }} />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Stock distribution chart */}
              <Card className="p-6">
                <div className={`text-[10px] font-black uppercase tracking-widest mb-4 ${C.label}`}>Stock Distribution by Category</div>
                {stockCatData.length === 0 ? (
                  <div className={`flex h-48 items-center justify-center text-xs ${C.muted}`}>No products in catalog</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stockCatData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1F2430' : '#F1F3F5'} />
                      <XAxis dataKey="category" tick={{ fontSize: 9, fill: isDark ? '#6B7280' : '#9CA3AF' }} />
                      <YAxis tick={{ fontSize: 9, fill: isDark ? '#6B7280' : '#9CA3AF' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="stock" name="stock" radius={[4, 4, 0, 0]}>
                        {stockCatData.map((entry, i) => (
                          <Cell key={i} fill={entry.stock < 10 ? '#F59E0B' : '#CCFF00'} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className={`mt-3 flex items-center gap-4 text-[10px] ${C.muted}`}>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#CCFF00]" /> Healthy stock</div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-400" /> Low stock (&lt; 10 units)</div>
                </div>
              </Card>

              <Card className="p-6 mt-4">
                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${C.label}`}>Merchant Health Score</div>
                <div className={`font-mono text-4xl font-black tabular-nums text-[#52E82E] mt-2`}>{metrics.healthIndex}<span className={`text-lg font-normal ${C.muted}`}>/100</span></div>
                <div className={`mt-3 h-2 w-full rounded-full ${isDark ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics.healthIndex}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full bg-[#52E82E]"
                  />
                </div>
                <p className={`mt-3 text-xs ${C.muted}`}>Good standing — all SLA targets met. Enterprise Tier 1 certification active.</p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ═══════════════════════════════════════
          FLOATING AI WIDGET
         ═══════════════════════════════════════ */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(204,255,0,0.3)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsAiOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-black/90 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.6)] hover:border-[#CCFF00] hover:text-[#CCFF00] transition"
        >
          <Sparkles size={13} className="text-[#CCFF00]" /> Ask AI
        </motion.button>
      </div>

      {/* ═══════════════════════════════════════
          AI COPILOT DRAWER
         ═══════════════════════════════════════ */}
      <AnimatePresence>
        {isAiOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md"
            onClick={e => { if (e.target === e.currentTarget) setIsAiOpen(false); }}>
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={SPRING_MODAL}
              className={`flex h-full w-full max-w-md flex-col border-l shadow-2xl ${isDark ? 'border-neutral-800 bg-[#0D1117]' : 'border-gray-200 bg-white'}`}
            >
              <div className={`flex items-center justify-between border-b p-5 ${C.divider}`}>
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#CCFF00] text-black">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Merchant Copilot</h3>
                    <div className={`text-[10px] ${C.subtle}`}>Flash AI · Catalog-aware</div>
                  </div>
                </div>
                <button onClick={() => setIsAiOpen(false)} className={`rounded-full border p-1.5 transition ${C.pill} ${C.muted} hover:text-white`}>
                  <X size={14} />
                </button>
              </div>

              <div className="px-4 pt-4 flex flex-wrap gap-2">
                {['Inventory analysis', 'Pricing strategy', 'Draft B2B copy', 'SLA review'].map(chip => (
                  <button key={chip} onClick={() => handleAiSend(chip)}
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${C.pill} ${C.muted} hover:border-[#CCFF00] hover:text-[#CCFF00]`}>
                    {chip}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 mt-3 text-xs">
                {aiChat.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={FADE_SLIDE}
                    className={`rounded-2xl p-3.5 leading-relaxed ${
                      msg.role === 'user'
                        ? 'ml-auto max-w-[85%] bg-[#CCFF00] text-black font-semibold'
                        : `max-w-full border whitespace-pre-wrap font-medium ${isDark ? 'border-neutral-800 bg-[#12161F] text-neutral-200' : 'border-gray-100 bg-gray-50 text-gray-700'}`
                    }`}>
                    {msg.text}
                  </motion.div>
                ))}
                {aiLoading && (
                  <div className={`flex items-center gap-2 italic ${C.subtle}`}>
                    <Loader2 size={13} className="animate-spin text-[#CCFF00]" /> Analyzing…
                  </div>
                )}
              </div>

              <div className={`border-t p-4 ${C.divider}`}>
                <form onSubmit={e => { e.preventDefault(); handleAiSend(); }}
                  className={`flex items-center gap-2 rounded-2xl border p-1.5 ${C.well}`}>
                  <input type="text" placeholder="Ask about your catalog…" value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    className={`flex-1 bg-transparent px-2 text-xs outline-none ${isDark ? 'text-white placeholder:text-neutral-600' : 'text-gray-900 placeholder:text-gray-400'}`} />
                  <button type="submit" disabled={aiLoading || !aiInput.trim()}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-[#CCFF00] text-black transition hover:scale-105 disabled:opacity-40">
                    <Send size={13} />
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          PRODUCT DRAWER (MULTI-STEP)
         ═══════════════════════════════════════ */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md"
            onClick={e => { if (e.target === e.currentTarget) setIsDrawerOpen(false); }}>
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={SPRING_MODAL}
              className={`flex h-full w-full max-w-lg flex-col border-l shadow-2xl ${isDark ? 'border-neutral-800 bg-[#0D1117]' : 'border-gray-200 bg-white'}`}
            >
              {/* Drawer header */}
              <div className={`flex items-center justify-between border-b p-5 ${C.divider}`}>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
                    {editingProduct ? 'Edit Listing' : 'New Listing'} · Step {drawerStep} of 3
                  </div>
                  <h2 className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {drawerStep === 1 ? 'Basic Information' : drawerStep === 2 ? 'Pricing & Inventory' : 'Media & Description'}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <StepDots total={3} current={drawerStep} />
                  <button onClick={() => setIsDrawerOpen(false)} className={`rounded-full border p-1.5 transition ${C.pill} ${C.muted} hover:text-white`}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Drawer content */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
                <AnimatePresence mode="wait">
                  {/* Step 1: Basic Info */}
                  {drawerStep === 1 && (
                    <motion.div key="s1" variants={TAB_CONTENT_VARIANTS} initial="initial" animate="animate" exit="exit" transition={FADE_SLIDE} className="space-y-4">
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>
                          Product Title <span className="text-[#CCFF00]">*</span>
                        </label>
                        <input type="text" placeholder="e.g. Industrial Grade USB-C PD Adapter"
                          value={formData.name}
                          onChange={e => { setFormData(d => ({ ...d, name: e.target.value })); setFormErrors(er => ({ ...er, name: '' })); }}
                          className={`w-full rounded-xl border px-4 py-3 text-xs outline-none transition ${C.input} ${formErrors.name ? 'border-red-500' : ''}`} />
                        {formErrors.name && <span className="text-[10px] text-red-400 mt-1 block">{formErrors.name}</span>}
                      </div>

                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>Brand / Manufacturer</label>
                        <input type="text" placeholder="e.g. Flash Verified"
                          value={formData.brand}
                          onChange={e => setFormData(d => ({ ...d, brand: e.target.value }))}
                          className={`w-full rounded-xl border px-4 py-3 text-xs outline-none transition ${C.input}`} />
                      </div>

                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>
                          Category <span className="text-[#CCFF00]">*</span>
                        </label>
                        <select value={formData.category}
                          onChange={e => setFormData(d => ({ ...d, category: e.target.value as ValidCategory }))}
                          className={`w-full rounded-xl border px-4 py-3 text-xs outline-none transition ${C.select}`}>
                          {VALID_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>Auto-generated SKU</label>
                        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${isDark ? 'border-neutral-800 bg-[#12161F]' : 'border-gray-200 bg-gray-50'}`}>
                          <span className={`flex-1 font-mono text-xs ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>{formData.sku}</span>
                          <button type="button" onClick={() => setFormData(d => ({ ...d, sku: generateSKU() }))}
                            className={`text-[10px] font-bold transition hover:text-[#CCFF00] ${C.muted}`} title="Regenerate SKU">
                            <RefreshCw size={12} />
                          </button>
                          <button type="button" onClick={() => { navigator.clipboard.writeText(formData.sku); toast.success('SKU copied'); }}
                            className={`text-[10px] font-bold transition hover:text-[#CCFF00] ${C.muted}`} title="Copy SKU">
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Pricing */}
                  {drawerStep === 2 && (
                    <motion.div key="s2" variants={TAB_CONTENT_VARIANTS} initial="initial" animate="animate" exit="exit" transition={FADE_SLIDE} className="space-y-4">
                      <div className="grid gap-4 grid-cols-2">
                        <div>
                          <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>
                            Wholesale Price (₹) <span className="text-[#CCFF00]">*</span>
                          </label>
                          <input type="number" placeholder="1499"
                            value={formData.price}
                            onChange={e => { setFormData(d => ({ ...d, price: e.target.value })); setFormErrors(er => ({ ...er, price: '' })); }}
                            className={`w-full rounded-xl border px-4 py-3 text-xs font-mono outline-none transition ${C.input} ${formErrors.price ? 'border-red-500' : ''}`} />
                          {formErrors.price && <span className="text-[10px] text-red-400 mt-1 block">{formErrors.price}</span>}
                        </div>
                        <div>
                          <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>Original / MRP (₹)</label>
                          <input type="number" placeholder="1999"
                            value={formData.original_price}
                            onChange={e => setFormData(d => ({ ...d, original_price: e.target.value }))}
                            className={`w-full rounded-xl border px-4 py-3 text-xs font-mono outline-none transition ${C.input}`} />
                        </div>
                      </div>

                      {/* Live discount preview */}
                      {previewDiscount && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 rounded-xl bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-4 py-2.5">
                          <CheckCircle2 size={14} className="text-[#CCFF00]" />
                          <span className="text-xs font-black text-[#CCFF00]">Discount: {previewDiscount} off MRP</span>
                        </motion.div>
                      )}

                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>
                          Initial Stock Units <span className="text-[#CCFF00]">*</span>
                        </label>
                        <input type="number" placeholder="50"
                          value={formData.stock}
                          onChange={e => { setFormData(d => ({ ...d, stock: e.target.value })); setFormErrors(er => ({ ...er, stock: '' })); }}
                          className={`w-full rounded-xl border px-4 py-3 text-xs font-mono outline-none transition ${C.input} ${formErrors.stock ? 'border-red-500' : ''}`} />
                        {formErrors.stock && <span className="text-[10px] text-red-400 mt-1 block">{formErrors.stock}</span>}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Media & Description */}
                  {drawerStep === 3 && (
                    <motion.div key="s3" variants={TAB_CONTENT_VARIANTS} initial="initial" animate="animate" exit="exit" transition={FADE_SLIDE} className="space-y-4">
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>Primary Product Image URL</label>
                        <input type="url" placeholder="https://images.unsplash.com/…"
                          value={formData.primary_image}
                          onChange={e => setFormData(d => ({ ...d, primary_image: e.target.value }))}
                          className={`w-full rounded-xl border px-4 py-3 text-xs outline-none transition ${C.input}`} />

                        {/* Live image preview */}
                        {formData.primary_image ? (
                          <div className={`mt-2.5 overflow-hidden rounded-xl border ${C.well}`} style={{ aspectRatio: '16/9' }}>
                            <SafeImage src={formData.primary_image} alt="Preview" className="h-full w-full object-contain" />
                          </div>
                        ) : (
                          <div className={`mt-2.5 flex flex-col items-center justify-center rounded-xl border border-dashed gap-2 py-8 ${isDark ? 'border-neutral-800 bg-[#12161F]' : 'border-gray-200 bg-gray-50'}`}>
                            <Upload size={20} className={C.subtle} />
                            <span className={`text-[10px] ${C.subtle}`}>Paste an image URL above to preview</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>B2B Product Description</label>
                        <textarea rows={4} placeholder="Detailed technical specifications, certifications, compliance info, and packaging details…"
                          value={formData.description}
                          onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                          className={`w-full rounded-xl border px-4 py-3 text-xs outline-none transition resize-none ${C.input}`} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Drawer footer */}
              <div className={`flex items-center justify-between border-t p-5 ${C.divider}`}>
                <GhostButton onClick={drawerStep > 1 ? goPrevStep : () => setIsDrawerOpen(false)}>
                  {drawerStep > 1 ? <><ArrowLeft size={13} /> Back</> : 'Cancel'}
                </GhostButton>
                {drawerStep < 3 ? (
                  <AccentButton onClick={goNextStep}>
                    Next <ArrowRight size={13} />
                  </AccentButton>
                ) : (
                  <AccentButton onClick={handleSaveProduct} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                    {editingProduct ? 'Update Listing' : 'Publish to Catalog'}
                  </AccentButton>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          DELETE CONFIRMATION MODAL
         ═══════════════════════════════════════ */}
      <AnimatePresence>
        {productToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              transition={SPRING_MODAL}
              className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl ${isDark ? 'border-neutral-800 bg-[#0D1117]' : 'border-gray-200 bg-white'}`}
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Remove Product?</h3>
              <p className={`mt-2 text-xs leading-relaxed ${C.muted}`}>
                This will permanently delete <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>"{productToDelete.name}"</span> from your live catalog and storefront.
              </p>
              <div className="mt-5 flex gap-2.5">
                <GhostButton onClick={() => setProductToDelete(null)} className="flex-1">Cancel</GhostButton>
                <motion.button
                  whileTap={{ scale: 0.97 }} onClick={handleDeleteProduct} disabled={isDeleting}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-red-600 py-2.5 text-xs font-black uppercase text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isDeleting && <Loader2 size={12} className="animate-spin" />}
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════
          DISPATCH MODAL
         ═══════════════════════════════════════ */}
      <AnimatePresence>
        {dispatchModal && selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={e => { if (e.target === e.currentTarget) setDispatchModal(false); }}>
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              transition={SPRING_MODAL}
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${isDark ? 'border-neutral-800 bg-[#0D1117]' : 'border-gray-200 bg-white'}`}
            >
              <div className={`flex items-center justify-between border-b pb-4 mb-4 ${C.divider}`}>
                <div>
                  <StatusChip label="Logistics" variant="accent" />
                  <h3 className={`mt-1 text-base font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Dispatch Order</h3>
                  <div className={`font-mono text-[11px] ${C.subtle}`}>{selectedOrder.id}</div>
                </div>
                <button onClick={() => setDispatchModal(false)} className={`rounded-full border p-1.5 ${C.pill} ${C.muted}`}>
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>Logistics Carrier</label>
                  <select value={carrier} onChange={e => setCarrier(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-3 text-xs outline-none ${C.select}`}>
                    {['Delhivery Express', 'Blue Dart Corporate', 'DHL Worldwide', 'Shadowfax Ultra-Fast B2B'].map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`}>AWB / Waybill Number</label>
                  <input type="text" placeholder="e.g. DEL-8849201948" value={trackingId}
                    onChange={e => setTrackingId(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-3 text-xs outline-none transition ${C.input}`} />
                </div>
                <div className="flex gap-2.5 pt-1">
                  <GhostButton onClick={() => setDispatchModal(false)} className="flex-1">Cancel</GhostButton>
                  <AccentButton className="flex-1" onClick={() => {
                    toast.success(`Order ${selectedOrder.id} booked with ${carrier}`);
                    setDispatchModal(false);
                  }}>
                    <Truck size={12} /> Confirm Dispatch
                  </AccentButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
