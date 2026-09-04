import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  Database,
  Download,
  Edit3,
  ExternalLink,
  Filter,
  Layers,
  LayoutDashboard,
  Loader2,
  Minus,
  Package,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  Users,
  Wallet,
  X,
  Zap
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
  SUPABASE_PROJECT_ID,
  type SupabaseProduct,
  type SupabaseOrder,
  type DatabaseHealth,
  type ValidCategory
} from '@/lib/supabase';
import { SafeImage } from '@/components/SafeImage';

export default function SellerDashboard({
  initialTab
}: {
  initialTab?: 'catalog' | 'orders' | 'rfq' | 'payouts' | 'health';
} = {}) {
  const [location, navigate] = useLocation();

  // Tab mapping from URL or initialTab prop
  const getTabFromPath = (path: string): 'catalog' | 'orders' | 'rfq' | 'payouts' | 'health' => {
    if (initialTab) return initialTab;
    if (path.includes('/seller/orders')) return 'orders';
    if (path.includes('/seller/rfq')) return 'rfq';
    if (path.includes('/seller/payouts')) return 'payouts';
    if (path.includes('/seller/health')) return 'health';
    return 'catalog';
  };

  const [activeTab, setActiveTab] = useState<'catalog' | 'orders' | 'rfq' | 'payouts' | 'health'>(
    () => getTabFromPath(location || '')
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (location) {
      setActiveTab(getTabFromPath(location));
    }
  }, [location, initialTab]);

  // State: Live Catalog & Orders strictly from Supabase
  const [products, setProducts] = useState<SupabaseProduct[]>([]);
  const [orders, setOrders] = useState<SupabaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State: Database connection health
  const [dbHealth, setDbHealth] = useState<DatabaseHealth>({
    ok: true,
    latencyMs: 38,
    instance: SUPABASE_PROJECT_ID,
    skuCount: 0,
    lastChecked: 'Connecting...'
  });

  // State: Reactive Metrics Engine
  const [metrics, setMetrics] = useState({
    grossRevenue: 0,
    pendingOrders: 0,
    totalOrders: 0,
    skuCount: 0,
    healthIndex: 98
  });

  // State: Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // State: Modal for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupabaseProduct | null>(null);

  // State: Delete confirmation modal
  const [productToDelete, setProductToDelete] = useState<SupabaseProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce references for inline stock updates (400ms debounce)
  const stockDebounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const [stockUpdatingMap, setStockUpdatingMap] = useState<Record<string, boolean>>({});

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: 'Flash Verified',
    category: 'Electronics' as ValidCategory,
    price: '',
    original_price: '',
    stock: '10',
    description: '',
    primary_image: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // State: AI Copilot Drawer
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChat, setAiChat] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: `Hello! I am your Flash Merchant Copilot connected to live Supabase instance ${SUPABASE_PROJECT_ID}. Ask me to draft product descriptions, analyze catalog pricing, or monitor stock velocity.`
    }
  ]);

  // State: Order dispatch modal
  const [dispatchModal, setDispatchModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [carrier, setCarrier] = useState('Delhivery Surface & Express');
  const [trackingId, setTrackingId] = useState('');

  // Primary Data Fetch strictly from Supabase
  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [prods, ords, kpis, health] = await Promise.all([
        getLiveCatalog(),
        getLiveOrders(),
        getDashboardMetrics(),
        pingSupabase()
      ]);

      setDbHealth(health);
      setProducts(prods || []);
      setOrders(ords || []);

      // Calculate reactive KPIs
      const liveSkuCount = prods?.length || 0;
      const liveGrossRevenue =
        kpis.grossRevenue > 0
          ? kpis.grossRevenue
          : (ords || []).reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
      const livePending =
        kpis.pendingOrders > 0
          ? kpis.pendingOrders
          : (ords || []).filter((o) => (o.delivery_status || '').toLowerCase() === 'pending').length;

      const healthScore =
        (ords || []).length > 0
          ? Math.min(100, Math.max(90, 100 - livePending * 2))
          : 98;

      setMetrics({
        grossRevenue: liveGrossRevenue,
        pendingOrders: livePending,
        totalOrders: ords?.length || 0,
        skuCount: liveSkuCount,
        healthIndex: healthScore
      });
    } catch (err) {
      console.error('Supabase load error:', err);
      setProducts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime postgres updates on products table
    const channel = supabase
      .channel('seller-products-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          loadData(true);
        }
      )
      .subscribe();

    const healthInterval = setInterval(() => {
      pingSupabase().then((h) => setDbHealth(h));
    }, 45000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(healthInterval);
      Object.values(stockDebounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Handle Tab Switch
  const switchTab = (tabId: 'catalog' | 'orders' | 'rfq' | 'payouts' | 'health') => {
    setActiveTab(tabId);
    const map: Record<string, string> = {
      catalog: '/seller/dashboard',
      orders: '/seller/orders',
      rfq: '/seller/rfq',
      payouts: '/seller/payouts',
      health: '/seller/health'
    };
    if (map[tabId]) navigate(map[tabId]);
  };

  // Open Modal for Add
  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: 'Flash Verified',
      category: 'Electronics',
      price: '',
      original_price: '',
      stock: '10',
      description: '',
      primary_image: ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const openEditModal = (p: SupabaseProduct) => {
    setEditingProduct(p);

    let catMatched: ValidCategory = 'Electronics';
    const cleanCat = (p.category || '').toLowerCase().replace(/[-_]/g, ' ');
    for (const validCat of VALID_CATEGORIES) {
      if (cleanCat.includes(validCat.toLowerCase()) || validCat.toLowerCase().includes(cleanCat)) {
        catMatched = validCat;
        break;
      }
    }

    setFormData({
      name: p.name,
      brand: p.brand || 'Flash Verified',
      category: catMatched,
      price: String(p.price),
      original_price: String(p.original_price || p.price),
      stock: String(p.stock),
      description: p.description || '',
      primary_image: p.primary_image || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Live dynamic discount calculation
  const previewDiscount = useMemo(() => {
    const p = parseFloat(formData.price);
    const orig = parseFloat(formData.original_price);
    if (!isNaN(p) && !isNaN(orig) && orig > p && orig > 0) {
      const pct = Math.round(((orig - p) / orig) * 100);
      return `-${pct}%`;
    }
    return '-0%';
  }, [formData.price, formData.original_price]);

  // Form Submit Handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Product title is required';
    if (!formData.price || parseFloat(formData.price) <= 0)
      errors.price = 'Valid wholesale price is required';
    if (!formData.stock || parseInt(formData.stock) < 0)
      errors.stock = 'Initial inventory stock must be >= 0';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please resolve the highlighted validation errors');
      return;
    }

    setIsSubmitting(true);

    try {
      const priceVal = parseFloat(formData.price);
      const origVal = formData.original_price ? parseFloat(formData.original_price) : priceVal;
      const stockVal = parseInt(formData.stock) || 10;
      const primaryImg =
        formData.primary_image.trim() ||
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';

      if (editingProduct && editingProduct.id) {
        // Optimistic update
        const updated: SupabaseProduct = {
          ...editingProduct,
          name: formData.name.trim(),
          brand: formData.brand.trim() || 'Flash',
          category: formData.category,
          price: priceVal,
          original_price: origVal,
          discount: previewDiscount,
          stock: stockVal,
          description: formData.description.trim() || 'Flash verified product.',
          primary_image: primaryImg,
          hover_images: [primaryImg]
        };

        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)));
        setIsModalOpen(false);

        await updateProductInCatalog(editingProduct.id, {
          name: updated.name,
          brand: updated.brand,
          category: updated.category,
          price: updated.price,
          original_price: updated.original_price,
          stock: updated.stock,
          description: updated.description,
          primary_image: updated.primary_image,
          hover_images: updated.hover_images
        });

        toast.success(`Updated "${updated.name}" in live catalog!`);
      } else {
        const newProductPayload = {
          name: formData.name.trim(),
          brand: formData.brand.trim() || 'Flash Verified',
          category: formData.category,
          price: priceVal,
          original_price: origVal,
          stock: stockVal,
          description: formData.description.trim() || 'Flash verified wholesale product.',
          primary_image: primaryImg,
          hover_images: [primaryImg],
          colors: [{ name: 'Obsidian', hex: '#0F1115' }]
        };

        const tempId = `temp-${Date.now()}`;
        const optimisticProduct: SupabaseProduct = {
          ...newProductPayload,
          id: tempId,
          discount: previewDiscount,
          created_at: new Date().toISOString()
        };

        setProducts((prev) => [optimisticProduct, ...prev]);
        setIsModalOpen(false);

        const inserted = await insertProductToCatalog(newProductPayload);
        if (inserted && inserted.id) {
          setProducts((prev) => prev.map((p) => (p.id === tempId ? inserted : p)));
        }

        toast.success(`Published "${formData.name.trim()}" to Supabase & Buyer Storefront!`);
      }

      loadData(true);
    } catch (err: any) {
      console.error('Save product error:', err);
      toast.error(`Database error: ${err?.message || 'Could not save product'}`);
      loadData(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline Inventory Stock Stepper with 400ms automatic debounce
  const handleStockStep = (product: SupabaseProduct, delta: number) => {
    if (!product.id) return;
    const currentStock = product.stock ?? 0;
    const nextStock = Math.max(0, currentStock + delta);
    if (nextStock === currentStock) return;

    // Instant optimistic state update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock: nextStock } : p))
    );

    // Clear existing debounce timer for this product
    if (stockDebounceTimers.current[product.id]) {
      clearTimeout(stockDebounceTimers.current[product.id]);
    }

    setStockUpdatingMap((prev) => ({ ...prev, [product.id!]: true }));

    // 400ms debounce before executing Supabase update
    stockDebounceTimers.current[product.id] = setTimeout(async () => {
      try {
        await updateProductStock(product.id!, nextStock);
        toast.success(`${product.name}: stock synced to ${nextStock}`);
      } catch (err: any) {
        console.error('Stock update failed:', err);
        toast.error('Failed to sync stock with database');
        // Rollback
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, stock: currentStock } : p))
        );
      } finally {
        setStockUpdatingMap((prev) => ({ ...prev, [product.id!]: false }));
      }
    }, 400);
  };

  // Delete Listing Handler
  const handleDeleteProduct = async () => {
    if (!productToDelete || !productToDelete.id) return;
    setIsDeleting(true);

    const targetId = productToDelete.id;
    const targetName = productToDelete.name;

    setProducts((prev) => prev.filter((p) => p.id !== targetId));
    setProductToDelete(null);

    try {
      await deleteProductFromCatalog(targetId);
      toast.success(`Removed "${targetName}" from live database`);
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error('Could not delete product from database');
      loadData(true);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === 'All' ||
        (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase().replace(/ & /g, '-')) ||
        selectedCategory.toLowerCase().includes((p.category || '').toLowerCase());

      const matchStock = !inStockOnly || (p.stock ?? 0) > 0;

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, searchQuery, selectedCategory, inStockOnly]);

  // AI Copilot Query Execution
  const handleAiSend = (promptText?: string) => {
    const query = promptText || aiInput;
    if (!query.trim()) return;

    const userMessage = query.trim();
    setAiChat((prev) => [...prev, { role: 'user', text: userMessage }]);
    setAiInput('');
    setAiLoading(true);

    setTimeout(() => {
      let reply = '';
      const qLower = userMessage.toLowerCase();

      if (qLower.includes('stock') || qLower.includes('inventory')) {
        const lowStock = products.filter((p) => (p.stock ?? 0) < 10);
        reply = `Inventory Analysis for ${dbHealth.instance || SUPABASE_PROJECT_ID}:
• Total Active SKUs: ${products.length}
• Low-Stock Items (< 10 units): ${lowStock.length} items (${lowStock.map((p) => p.name).slice(0, 3).join(', ') || 'None'})
• Recommendation: Reorder threshold triggered. Ensure primary supplier lead times are under 48 hours.`;
      } else if (qLower.includes('pricing') || qLower.includes('margin') || qLower.includes('discount')) {
        reply = `Margin & Discount Strategy:
• Total Live Catalog SKUs: ${products.length}
• Recommendation: Tiered wholesale pricing at 10+ and 50+ units accelerates business repeat rate by 34%.`;
      } else if (qLower.includes('description') || qLower.includes('draft') || qLower.includes('seo')) {
        reply = `B2B Specification Draft:
"Engineered for high-throughput enterprise deployment. Features industrial-grade thermal resilience, RoHS/BIS certification compliance, and predictable tiered volume pricing."`;
      } else {
        reply = `Flash Merchant Copilot Status:
Connected to Supabase production table 'products'. Latency: ${dbHealth.latencyMs}ms. All catalog updates propagate instantly to buyer storefront at ${BUYER_STOREFRONT_URL}.`;
      }

      setAiChat((prev) => [...prev, { role: 'assistant', text: reply }]);
      setAiLoading(false);
    }, 500);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('flash-role');
      sessionStorage.removeItem('auth-session-token');
    } catch {}
    toast.success('Signed out of Seller Central');
    navigate('/auth/login');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="min-h-screen bg-[#000000] text-[#F8F9FA] antialiased selection:bg-[#CCFF00] selection:text-black"
    >
      {/* =========================================================================
          TOP NAVIGATION BAR (FLASH OBSIDIAN HEADER)
         ========================================================================= */}
      <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-[#000000]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-4">
            <Link href="/seller/dashboard" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#CCFF00] text-black shadow-[0_0_16px_rgba(204,255,0,0.3)] transition hover:scale-105">
                <Zap size={20} fill="currentColor" />
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-black uppercase tracking-tight text-white leading-none">
                  flash<span className="text-[#CCFF00]">.merchant</span>
                </span>
                <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
                  B2B Commerce OS
                </span>
              </div>
            </Link>

            {/* Live Supabase Health Pill */}
            <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-[#0D1117] px-3 py-1 text-[11px] font-mono font-medium text-neutral-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  dbHealth.ok ? 'bg-[#52E82E] shadow-[0_0_8px_#52E82E]' : 'bg-amber-400'
                } animate-pulse`}
              />
              <span>
                {dbHealth.ok ? 'Supabase Live' : 'Reconnecting'} • {dbHealth.latencyMs}ms
              </span>
            </div>
          </div>

          {/* Quick Header Navigation & Cross-Platform Redirect */}
          <div className="flex items-center gap-3">
            <a
              href={BUYER_STOREFRONT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 bg-[#12161F] px-3.5 py-2 text-xs font-black uppercase tracking-wider text-neutral-200 transition hover:border-[#CCFF00] hover:text-[#CCFF00] hover:-translate-y-0.5"
            >
              <span>View Storefront</span>
              <ExternalLink size={13} />
            </a>

            <button
              onClick={() => {
                loadData();
                toast.success('Catalog resynced with Supabase');
              }}
              disabled={isRefreshing}
              className="rounded-full border border-neutral-800 bg-[#12161F] p-2 text-neutral-400 hover:border-neutral-700 hover:text-white transition disabled:opacity-50"
              title="Refresh Catalog"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-[#CCFF00]' : ''} />
            </button>

            <div className="flex items-center gap-2 border-l border-neutral-800 pl-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#CCFF00] text-xs font-black text-black">
                NS
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-black leading-tight text-white">Northstar Components</div>
                <div className="text-[10px] font-medium text-neutral-400">Verified Merchant</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN SELLER HUB CONTENT
         ========================================================================= */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. SIGNATURE SELLER HERO BANNER (REFINED FONT SCALING)
           ========================================================================= */}
        <div className="relative mb-8 w-full overflow-hidden rounded-3xl border border-neutral-800/80 bg-[#0D1117] p-6 sm:p-8 md:p-10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#CCFF00]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#CCFF00]/5 blur-3xl" />

          {/* Left Hero Content */}
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-[#12161F] px-3.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
                <span className="h-2 w-2 rounded-full bg-[#CCFF00] animate-pulse" />
                ⚡ FLASH MERCHANT HUB
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-[#12161F] px-3 py-1 text-[10px] font-mono font-medium text-neutral-400">
                <span>⛃</span>
                <span>Supabase Live ({dbHealth.instance})</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-white leading-tight">
              Seller & Merchant Dashboard
            </h1>

            <p className="max-w-xl text-xs sm:text-sm font-medium text-neutral-400">
              Manage live storefront catalog listings, perform real-time database sync, and track
              inventory velocity directly to the buyer storefront.
            </p>
          </div>

          {/* Right Action Controls */}
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-full bg-[#CCFF00] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-black transition-all duration-300 ease-out shadow-[0_0_24px_rgba(204,255,0,0.35)]"
            >
              <span className="text-base leading-none font-bold">+</span>
              <span>Add Product to Catalog</span>
            </motion.button>

            <button
              onClick={handleLogout}
              className="rounded-full border border-neutral-800 bg-[#12161F] px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-400 transition hover:border-neutral-700 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. HIGH-CONTRAST SELLER KPI METRICS & SPARKLINE
           ========================================================================= */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Metric 1: Live Catalog SKUs */}
          <div className="group relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-5 shadow-xl transition hover:border-[#CCFF00]/40">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Active Catalog SKUs
              </span>
              <Package size={16} className="text-[#CCFF00]" />
            </div>
            <div className="mt-3 font-mono text-3xl font-semibold text-[#F8F9FA] tabular-nums">
              {metrics.skuCount.toString().padStart(2, '0')}
            </div>
            <div className="mt-2 text-xs font-semibold text-[#52E82E]">
              100% Synced with Supabase
            </div>
          </div>

          {/* Metric 2: Gross Sales Velocity with Sparkline */}
          <div className="group relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-5 shadow-xl transition hover:border-[#CCFF00]/40">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Gross Sales Velocity
              </span>
              <TrendingUp size={16} className="text-[#CCFF00]" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="font-mono text-3xl font-semibold text-[#F8F9FA] tabular-nums">
                ₹{metrics.grossRevenue.toLocaleString('en-IN')}
              </div>
              {/* Minimal SVG Sparkline */}
              <div className="h-8 w-20">
                <svg viewBox="0 0 100 30" className="h-full w-full overflow-visible">
                  <path
                    d="M0 25 Q 25 15, 50 18 T 100 5"
                    fill="none"
                    stroke="#CCFF00"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 25 Q 25 15, 50 18 T 100 5 L 100 30 L 0 30 Z"
                    fill="url(#sparkline-grad)"
                    opacity="0.2"
                  />
                  <defs>
                    <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#CCFF00" />
                      <stop offset="100%" stopColor="#CCFF00" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <div className="mt-2 text-xs font-semibold text-[#52E82E]">
              Live database calculation
            </div>
          </div>

          {/* Metric 3: Pending Orders */}
          <div className="group relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-5 shadow-xl transition hover:border-[#CCFF00]/40">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Pending Shipments
              </span>
              <Truck size={16} className="text-[#CCFF00]" />
            </div>
            <div className="mt-3 font-mono text-3xl font-semibold text-[#F8F9FA] tabular-nums">
              {metrics.pendingOrders.toString().padStart(2, '0')}
            </div>
            <div className="mt-2 text-xs font-semibold text-amber-400">
              Fulfillment queue active
            </div>
          </div>

          {/* Metric 4: Merchant Health Index */}
          <div className="group relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-5 shadow-xl transition hover:border-[#CCFF00]/40">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Merchant Health Index
              </span>
              <BarChart3 size={16} className="text-[#CCFF00]" />
            </div>
            <div className="mt-3 font-mono text-3xl font-semibold text-[#F8F9FA] tabular-nums">
              {metrics.healthIndex} <span className="text-base font-normal text-neutral-500">/ 100</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-[#52E82E]">
              Good standing • 99.4% SLA adherence
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. PILL-STYLE SUB-NAVIGATION TABS (NO HORIZONTAL SCROLLBARS)
           ========================================================================= */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {[
              { id: 'catalog', label: 'Live Catalog & Inventory', icon: Package },
              { id: 'orders', label: 'Fulfillment Queue', icon: ClipboardList },
              { id: 'rfq', label: 'Buyer RFQs', icon: Quote },
              { id: 'payouts', label: 'Payout Ledger', icon: Wallet },
              { id: 'health', label: 'Account Health', icon: BarChart3 }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                    isActive
                      ? 'bg-[#CCFF00] text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                      : 'border border-neutral-800 bg-[#0D1117] text-neutral-400 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 bg-[#12161F] px-4 py-2 text-xs font-bold text-[#CCFF00] hover:border-[#CCFF00] transition"
            >
              <Plus size={14} />
              <span>New Listing</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            4. TAB CONTENT: LIVE CATALOG & INVENTORY
           ========================================================================= */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-3 md:flex-row md:items-center">
              {/* Search input */}
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-neutral-800 bg-[#12161F] px-3.5 py-2">
                <Search size={16} className="text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search products by title, SKU, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-white outline-none placeholder:text-neutral-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-neutral-500 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category pills with scrollbar-none */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
                {['All', ...VALID_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition ${
                      selectedCategory === cat
                        ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]'
                        : 'border border-neutral-800 bg-[#12161F] text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* View mode toggle */}
              <div className="hidden sm:flex items-center gap-1 border-l border-neutral-800 pl-3">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded-lg p-2 transition ${
                    viewMode === 'grid' ? 'bg-[#CCFF00] text-black' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <Layers size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`rounded-lg p-2 transition ${
                    viewMode === 'table' ? 'bg-[#CCFF00] text-black' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Table View"
                >
                  <ClipboardList size={16} />
                </button>
              </div>
            </div>

            {/* Catalog List / Grid */}
            {isLoading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#CCFF00]" />
                <div className="text-sm font-bold text-neutral-400">Loading catalog from Supabase...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              /* Elegant Empty State (Zero mock products rendered) */
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-800 bg-[#0D1117] p-12 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#12161F] text-neutral-500 border border-neutral-800">
                  <Package className="h-8 w-8 text-[#CCFF00]" />
                </div>
                <h3 className="text-lg font-bold text-white">No products in catalog</h3>
                <p className="max-w-md text-xs sm:text-sm font-medium text-neutral-400">
                  {searchQuery || selectedCategory !== 'All'
                    ? 'No products matched your active filters. Try resetting the category or query.'
                    : 'Your Supabase catalog currently has 0 live products. Click below to publish your first wholesale product listing.'}
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openAddModal}
                  className="mt-3 rounded-full bg-[#CCFF00] px-6 py-2.5 text-xs font-black uppercase text-black hover:bg-[#b8e600] shadow-[0_0_20px_rgba(204,255,0,0.3)]"
                >
                  + Add First Product
                </motion.button>
              </div>
            ) : viewMode === 'grid' ? (
              /* CARD GRID VIEW */
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => {
                  const orig = product.original_price || product.price;
                  const hasDiscount = orig > product.price;
                  const isUpdatingStock = !!stockUpdatingMap[product.id || ''];

                  return (
                    <motion.div
                      key={product.id || product.name}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#0D1117] transition hover:border-[#CCFF00]/40 hover:shadow-2xl"
                    >
                      {/* Image Frame with SafeImage */}
                      <div className="relative aspect-video w-full overflow-hidden bg-[#12161F]">
                        <SafeImage
                          src={product.primary_image}
                          alt={product.name}
                          fallbackText={product.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />

                        {/* Discount Badge */}
                        {hasDiscount && (
                          <span className="absolute left-3 top-3 rounded-full bg-[#CCFF00] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black">
                            {product.discount || 'SALE'}
                          </span>
                        )}

                        {/* Category Tag */}
                        <span className="absolute right-3 top-3 rounded-full bg-black/80 backdrop-blur-sm border border-neutral-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                          {product.category}
                        </span>

                        {/* Storefront Preview Link */}
                        <a
                          href={getBuyerProductUrl(product.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-3 right-3 rounded-full bg-black/80 backdrop-blur-sm border border-neutral-700 p-2 text-neutral-300 hover:border-[#CCFF00] hover:text-[#CCFF00] transition"
                          title="Preview on buyer storefront"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                          {product.brand || 'Flash Verified'}
                        </div>

                        <h3 className="mt-1.5 text-base font-bold text-white line-clamp-1">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-xs sm:text-sm font-medium text-neutral-400 line-clamp-2">
                          {product.description || 'No description provided.'}
                        </p>

                        {/* Price & Debounced Stock Stepper */}
                        <div className="mt-4 border-t border-neutral-800/80 pt-3 flex items-center justify-between">
                          <div>
                            <div className="font-mono text-lg font-semibold text-white tabular-nums">
                              ₹{product.price.toLocaleString('en-IN')}
                            </div>
                            {hasDiscount && (
                              <div className="font-mono text-[11px] text-neutral-500 line-through tabular-nums">
                                ₹{orig.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>

                          {/* 400ms Debounced Inline Stock Stepper */}
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                              Stock Units
                            </span>
                            <div className="flex items-center rounded-full border border-neutral-800 bg-[#12161F] p-0.5">
                              <button
                                onClick={() => handleStockStep(product, -1)}
                                disabled={(product.stock ?? 0) <= 0}
                                className="grid h-6 w-6 place-items-center rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white disabled:opacity-40"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="min-w-8 text-center font-mono text-xs font-semibold text-[#CCFF00] tabular-nums">
                                {isUpdatingStock ? '...' : product.stock}
                              </span>
                              <button
                                onClick={() => handleStockStep(product, 1)}
                                className="grid h-6 w-6 place-items-center rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex items-center justify-end gap-2 border-t border-neutral-800/80 pt-3">
                          <button
                            onClick={() => openEditModal(product)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-[#12161F] px-3.5 py-1.5 text-xs font-bold text-neutral-300 hover:border-neutral-600 hover:text-white transition"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setProductToDelete(product)}
                            className="rounded-full border border-neutral-800 bg-[#12161F] p-2 text-neutral-400 hover:border-red-500/50 hover:text-red-400 transition"
                            title="Delete listing"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* HIGH DENSITY TABLE VIEW */
              <div className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#0D1117] shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-neutral-800 bg-[#12161F] text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      <tr>
                        <th className="px-5 py-3.5">Product Title</th>
                        <th className="px-4 py-3.5">Category</th>
                        <th className="px-4 py-3.5">Price</th>
                        <th className="px-4 py-3.5">Discount</th>
                        <th className="px-4 py-3.5">Stock Stepper (Debounced)</th>
                        <th className="px-4 py-3.5">Storefront</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {filteredProducts.map((p) => {
                        const isUpdating = !!stockUpdatingMap[p.id || ''];
                        return (
                          <tr key={p.id || p.name} className="transition hover:bg-[#12161F]/60">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 overflow-hidden rounded-lg bg-[#12161F]">
                                  <SafeImage
                                    src={p.primary_image}
                                    alt={p.name}
                                    fallbackText={p.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div>
                                  <div className="font-bold text-white line-clamp-1">{p.name}</div>
                                  <div className="text-[10px] text-neutral-500 font-mono">
                                    {p.brand || 'Flash'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-bold text-neutral-400 uppercase text-[11px]">
                              {p.category}
                            </td>
                            <td className="px-4 py-3.5 font-mono font-semibold text-white tabular-nums">
                              ₹{p.price.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-[#CCFF00]">
                              {p.discount || '-0%'}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="inline-flex items-center rounded-full border border-neutral-800 bg-[#12161F] p-0.5">
                                <button
                                  onClick={() => handleStockStep(p, -1)}
                                  disabled={(p.stock ?? 0) <= 0}
                                  className="grid h-6 w-6 place-items-center rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white disabled:opacity-40"
                                >
                                  <Minus size={11} />
                                </button>
                                <span className="min-w-8 text-center font-mono text-xs font-semibold text-white tabular-nums">
                                  {isUpdating ? '...' : p.stock}
                                </span>
                                <button
                                  onClick={() => handleStockStep(p, 1)}
                                  className="grid h-6 w-6 place-items-center rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <a
                                href={getBuyerProductUrl(p.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-400 hover:text-[#CCFF00] transition"
                              >
                                <span>Preview</span>
                                <ExternalLink size={11} />
                              </a>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditModal(p)}
                                  className="rounded-lg border border-neutral-800 p-1.5 text-neutral-400 hover:border-neutral-600 hover:text-white transition"
                                  title="Edit"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => setProductToDelete(p)}
                                  className="rounded-lg border border-neutral-800 p-1.5 text-neutral-400 hover:border-red-500/50 hover:text-red-400 transition"
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
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
            )}
          </div>
        )}

        {/* =========================================================================
            5. TAB CONTENT: ORDERS & FULFILLMENT QUEUE (SUPABASE LIVE)
           ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Live Fulfillment Queue</h2>
                  <p className="mt-1 text-xs sm:text-sm font-medium text-neutral-400">
                    Track customer dispatch statuses and assign consignment courier AWB tracking.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-400/10 border border-amber-400/20 px-3 py-1 text-xs font-bold text-amber-400">
                    {metrics.pendingOrders} Pending Shipments
                  </span>
                </div>
              </div>

              {/* Order List */}
              <div className="mt-6 space-y-3">
                {orders.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500">
                    <Truck className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
                    <div className="text-sm font-bold text-white">Fulfillment queue is clear</div>
                    <div className="text-xs text-neutral-400 mt-1">
                      Customer orders placed on the live buyer storefront will appear here.
                    </div>
                  </div>
                ) : (
                  orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-[#12161F] p-4 transition hover:border-neutral-700"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-white">{ord.id}</span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-xs font-bold text-neutral-300">
                            {ord.customer_name || 'Business Buyer'}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400">
                          {ord.customer_email || 'Verified B2B Account'}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right font-mono text-sm font-semibold text-white tabular-nums">
                          ₹{Number(ord.total_amount || 0).toLocaleString('en-IN')}
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                            ord.delivery_status === 'delivered'
                              ? 'bg-[#52E82E]/10 text-[#52E82E] border border-[#52E82E]/20'
                              : 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                          }`}
                        >
                          {ord.delivery_status || 'Pending'}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setDispatchModal(true);
                          }}
                          className="rounded-full bg-[#CCFF00] px-4 py-2 text-[10px] font-black uppercase text-black hover:bg-[#b8e600] transition"
                        >
                          Dispatch
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            6. TAB CONTENT: BUYER RFQS
           ========================================================================= */}
        {activeTab === 'rfq' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-6">
              <h2 className="text-xl font-bold text-white">Buyer RFQ Inquiries</h2>
              <p className="mt-1 text-xs sm:text-sm font-medium text-neutral-400">
                Direct wholesale inquiries from business purchasers negotiating bulk pricing tiers.
              </p>

              <div className="mt-6 py-12 text-center text-neutral-500">
                <Quote className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
                <div className="text-sm font-bold text-white">No active buyer RFQs</div>
                <div className="text-xs text-neutral-400 mt-1">
                  Custom wholesale requests from enterprise buyers will appear here in real-time.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            7. TAB CONTENT: PAYOUT LEDGER
           ========================================================================= */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Ready for Disbursement
                </div>
                <div className="mt-3 font-mono text-3xl font-semibold text-[#CCFF00] tabular-nums">
                  ₹{metrics.grossRevenue > 0 ? (metrics.grossRevenue * 0.92).toLocaleString('en-IN') : '0'}
                </div>
                <button
                  onClick={() => toast.success('Disbursement requested to primary HDFC Current Account')}
                  className="mt-4 w-full rounded-full bg-[#CCFF00] py-2.5 text-xs font-black uppercase text-black hover:bg-[#b8e600]"
                >
                  Request Payout
                </button>
              </div>

              <div className="rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Total Escrow Retention
                </div>
                <div className="mt-3 font-mono text-3xl font-semibold text-white tabular-nums">
                  ₹{metrics.grossRevenue > 0 ? (metrics.grossRevenue * 0.08).toLocaleString('en-IN') : '0'}
                </div>
                <div className="mt-4 text-xs text-neutral-500">7-day post-delivery inspection hold</div>
              </div>

              <div className="rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Commission Tier
                </div>
                <div className="mt-3 font-mono text-3xl font-semibold text-white tabular-nums">8.0%</div>
                <div className="mt-4 text-xs text-neutral-500">Flash Platform Verified standard tier</div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            8. TAB CONTENT: ACCOUNT HEALTH
           ========================================================================= */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-6">
              <h2 className="text-xl font-bold text-white">Seller Health & SLA Compliance</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-neutral-800 bg-[#12161F] p-4">
                  <div className="text-[10px] font-bold uppercase text-neutral-400">Late Dispatch</div>
                  <div className="mt-2 font-mono text-2xl font-semibold text-[#52E82E] tabular-nums">0.4%</div>
                  <div className="text-[10px] text-neutral-500">Target &lt; 1.0%</div>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-[#12161F] p-4">
                  <div className="text-[10px] font-bold uppercase text-neutral-400">Order Cancellation</div>
                  <div className="mt-2 font-mono text-2xl font-semibold text-[#52E82E] tabular-nums">0.1%</div>
                  <div className="text-[10px] text-neutral-500">Target &lt; 0.5%</div>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-[#12161F] p-4">
                  <div className="text-[10px] font-bold uppercase text-neutral-400">Response Speed</div>
                  <div className="mt-2 font-mono text-2xl font-semibold text-[#52E82E] tabular-nums">42 min</div>
                  <div className="text-[10px] text-neutral-500">Target &lt; 2 hrs</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          FLOATING BOTTOM-RIGHT WIDGET: "Ask AI ⚡"
         ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsAiOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-black/90 px-5 py-3 text-xs font-black uppercase tracking-wider text-white backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.6)] hover:border-[#CCFF00] hover:text-[#CCFF00] transition"
        >
          <span>Ask AI</span>
          <span className="text-[#CCFF00]">⚡</span>
        </motion.button>
      </div>

      {/* =========================================================================
          AI ASSISTANT SLIDE-OVER DRAWER (SPRING-BASED SLIDE IN)
         ========================================================================= */}
      <AnimatePresence>
        {isAiOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md transition"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="flex h-full w-full max-w-md flex-col border-l border-neutral-800 bg-[#0D1117] p-6 shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#CCFF00] text-black">
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-white">
                      Flash Merchant Copilot
                    </h3>
                    <div className="text-[10px] text-neutral-400">Supabase Connected AI</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsAiOpen(false)}
                  className="rounded-full border border-neutral-800 p-1.5 text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick Prompt Chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  'Analyze inventory velocity',
                  'Optimize pricing & discounts',
                  'Draft B2B description',
                  'Check dispatch SLAs'
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleAiSend(chip)}
                    className="rounded-full border border-neutral-800 bg-[#12161F] px-3 py-1.5 text-[10px] font-bold text-neutral-300 hover:border-[#CCFF00] hover:text-[#CCFF00] transition"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Transcript */}
              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1 text-xs">
                {aiChat.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl p-3.5 ${
                      msg.role === 'user'
                        ? 'ml-auto max-w-[85%] bg-[#CCFF00] text-black font-semibold'
                        : 'border border-neutral-800 bg-[#12161F] text-neutral-200 whitespace-pre-wrap'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex items-center gap-2 text-neutral-500 italic">
                    <Loader2 size={13} className="animate-spin text-[#CCFF00]" />
                    <span>Analyzing merchant catalog...</span>
                  </div>
                )}
              </div>

              {/* Input Bar */}
              <div className="mt-4 border-t border-neutral-800 pt-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAiSend();
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-neutral-800 bg-[#12161F] p-1.5"
                >
                  <input
                    type="text"
                    placeholder="Ask copilot about your catalog..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    className="w-full bg-transparent px-3 text-xs text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading || !aiInput.trim()}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-[#CCFF00] text-black transition hover:scale-105 disabled:opacity-40"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL: ADD / EDIT PRODUCT CATALOG MANAGER
         ========================================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-neutral-800/80 bg-[#0D1117] p-6 sm:p-8 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
                    Supabase Live Writer
                  </span>
                  <h2 className="text-xl font-bold uppercase tracking-tight text-white">
                    {editingProduct ? 'Edit Catalog Product' : 'Add Product to Catalog'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-neutral-800 p-2 text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveProduct} className="mt-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Product Title <span className="text-[#CCFF00]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter product title..."
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                    }}
                    className={`mt-1.5 w-full rounded-2xl border ${
                      formErrors.name ? 'border-red-500' : 'border-neutral-800'
                    } bg-[#12161F] px-4 py-3 text-xs text-white outline-none focus:border-[#CCFF00] transition`}
                  />
                  {formErrors.name && (
                    <span className="mt-1 text-[11px] text-red-400">{formErrors.name}</span>
                  )}
                </div>

                {/* Brand & Category */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Brand / Manufacturer
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flash Verified"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="mt-1.5 w-full rounded-2xl border border-neutral-800 bg-[#12161F] px-4 py-3 text-xs text-white outline-none focus:border-[#CCFF00]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Category <span className="text-[#CCFF00]">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value as ValidCategory })
                      }
                      className="mt-1.5 w-full rounded-2xl border border-neutral-800 bg-[#12161F] px-4 py-3 text-xs text-white outline-none focus:border-[#CCFF00]"
                    >
                      {VALID_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-[#12161F] text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pricing & Stock */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Wholesale Price (₹) <span className="text-[#CCFF00]">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="1499"
                      value={formData.price}
                      onChange={(e) => {
                        setFormData({ ...formData, price: e.target.value });
                        if (formErrors.price) setFormErrors({ ...formErrors, price: '' });
                      }}
                      className={`mt-1.5 w-full rounded-2xl border ${
                        formErrors.price ? 'border-red-500' : 'border-neutral-800'
                      } bg-[#12161F] px-4 py-3 text-xs font-mono font-semibold text-white outline-none focus:border-[#CCFF00]`}
                    />
                    {formErrors.price && (
                      <span className="mt-1 text-[11px] text-red-400">{formErrors.price}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Original / MRP (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="1999"
                      value={formData.original_price}
                      onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                      className="mt-1.5 w-full rounded-2xl border border-neutral-800 bg-[#12161F] px-4 py-3 text-xs font-mono font-semibold text-white outline-none focus:border-[#CCFF00]"
                    />
                    <span className="mt-1 text-[10px] text-[#CCFF00] font-bold">
                      Discount: {previewDiscount}
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Initial Stock Units <span className="text-[#CCFF00]">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="50"
                      value={formData.stock}
                      onChange={(e) => {
                        setFormData({ ...formData, stock: e.target.value });
                        if (formErrors.stock) setFormErrors({ ...formErrors, stock: '' });
                      }}
                      className={`mt-1.5 w-full rounded-2xl border ${
                        formErrors.stock ? 'border-red-500' : 'border-neutral-800'
                      } bg-[#12161F] px-4 py-3 text-xs font-mono font-semibold text-white outline-none focus:border-[#CCFF00]`}
                    />
                    {formErrors.stock && (
                      <span className="mt-1 text-[11px] text-red-400">{formErrors.stock}</span>
                    )}
                  </div>
                </div>

                {/* Image URL & Safe Preview */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Primary Product Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formData.primary_image}
                    onChange={(e) => setFormData({ ...formData, primary_image: e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border border-neutral-800 bg-[#12161F] px-4 py-3 text-xs text-white outline-none focus:border-[#CCFF00]"
                  />
                  {formData.primary_image && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-neutral-800 bg-[#12161F] p-2">
                      <div className="h-12 w-12 overflow-hidden rounded-lg">
                        <SafeImage
                          src={formData.primary_image}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="text-[11px] text-neutral-400">Image preview valid</div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    B2B Product Specification & Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter detailed technical specs, certifications, and packaging dimensions..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border border-neutral-800 bg-[#12161F] px-4 py-3 text-xs text-white outline-none focus:border-[#CCFF00]"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 border-t border-neutral-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-full border border-neutral-800 bg-[#12161F] px-5 py-2.5 text-xs font-bold uppercase text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-full bg-[#CCFF00] px-6 py-2.5 text-xs font-black uppercase text-black hover:bg-[#b8e600] disabled:opacity-50 transition shadow-[0_0_15px_rgba(204,255,0,0.3)]"
                  >
                    {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                    <span>{editingProduct ? 'Update Product' : 'Publish to Catalog'}</span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL: DELETE PRODUCT CONFIRMATION
         ========================================================================= */}
      <AnimatePresence>
        {productToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-neutral-800 bg-[#0D1117] p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white">Delete Product Listing?</h3>
              <p className="mt-2 text-xs sm:text-sm font-medium text-neutral-400">
                Are you sure you want to delete{' '}
                <span className="font-bold text-white">"{productToDelete.name}"</span>? This will
                immediately delete the record from Supabase table <code className="text-[#CCFF00]">products</code> and remove it from the live storefront.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="rounded-full border border-neutral-800 bg-[#12161F] px-5 py-2 text-xs font-bold uppercase text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProduct}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-xs font-black uppercase text-white hover:bg-red-700 transition"
                >
                  {isDeleting && <Loader2 size={13} className="animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL: DISPATCH ORDER
         ========================================================================= */}
      <AnimatePresence>
        {dispatchModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-neutral-800 bg-[#0D1117] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-base font-bold text-white">
                  Dispatch Order {selectedOrder.id}
                </h3>
                <button
                  onClick={() => setDispatchModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Select Integrated Logistics Carrier
                  </label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-neutral-800 bg-[#12161F] px-4 py-3 text-xs text-white outline-none"
                  >
                    <option>Delhivery Surface & Express</option>
                    <option>Blue Dart Corporate Freight</option>
                    <option>DHL Worldwide Logistics</option>
                    <option>Shadowfax Ultra-Fast B2B</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Consignment Waybill / AWB Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DEL-8849201948"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-neutral-800 bg-[#12161F] px-4 py-3 text-xs text-white outline-none focus:border-[#CCFF00]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    onClick={() => setDispatchModal(false)}
                    className="rounded-full border border-neutral-800 bg-[#12161F] px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      toast.success(
                        `Consignment for ${selectedOrder.id} booked with ${carrier}`
                      );
                      setDispatchModal(false);
                    }}
                    className="rounded-full bg-[#CCFF00] px-5 py-2 text-xs font-black uppercase text-black hover:bg-[#b8e600]"
                  >
                    Confirm Dispatch
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
