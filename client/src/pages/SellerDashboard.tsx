import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  ExternalLink,
  Filter,
  Layers,
  LayoutDashboard,
  Loader2,
  Package,
  Plus,
  Quote,
  RefreshCw,
  Search,
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
  Zap,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import {
  supabase,
  getLiveCatalog,
  insertProductToCatalog,
  updateProductInCatalog,
  deleteProductFromCatalog,
  type SupabaseProduct
} from '@/lib/supabase';

// Fallback seed catalog in case network/offline occurs
const FALLBACK_PRODUCTS: SupabaseProduct[] = [
  {
    id: 'p1',
    name: 'AeroCharge Pro 65W GaN Adapter',
    brand: 'Northstar Components',
    category: 'electronics',
    price: 1499,
    original_price: 1999,
    discount: '-25%',
    stock: 248,
    description: 'High-speed 65W GaN adapter built for enterprise laptop fleets and rapid device charging.',
    primary_image: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=700&q=80',
    hover_images: ['https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=700&q=80'],
    colors: [{ name: 'Obsidian', hex: '#0F1115' }]
  },
  {
    id: 'p2',
    name: 'Recycled Kraft Shipping Cartons (50x)',
    brand: 'Packsmith Industries',
    category: 'packaging',
    price: 1850,
    original_price: 2400,
    discount: '-23%',
    stock: 4200,
    description: 'Triple-wall corrugated heavy-duty cartons tested for 40kg drop resilience.',
    primary_image: 'https://images.unsplash.com/photo-1607166452427-7e447e94c8c6?auto=format&fit=crop&w=700&q=80',
    hover_images: ['https://images.unsplash.com/photo-1607166452427-7e447e94c8c6?auto=format&fit=crop&w=700&q=80'],
    colors: [{ name: 'Natural Kraft', hex: '#C29B62' }]
  },
  {
    id: 'p3',
    name: 'Merino Blend Executive Overshirt',
    brand: 'Common Thread Co.',
    category: 'apparel',
    price: 2899,
    original_price: 3899,
    discount: '-26%',
    stock: 86,
    description: 'Temperature-regulating merino blend uniform layer for corporate floor teams.',
    primary_image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=80',
    hover_images: ['https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=80'],
    colors: [{ name: 'Obsidian', hex: '#0F1115' }]
  },
  {
    id: 'p4',
    name: 'Modular Warehouse Safety Barrier (2m)',
    brand: 'Forge & Field',
    category: 'industrial',
    price: 3890,
    original_price: 4490,
    discount: '-13%',
    stock: 31,
    description: 'High-visibility safety railing with impact dampening foundation anchors.',
    primary_image: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=700&q=80',
    hover_images: ['https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=700&q=80'],
    colors: [{ name: 'Safety Yellow', hex: '#CCFF00' }]
  },
  {
    id: 'p5',
    name: 'Ergonomic Task Chair - Lumbar 3.0',
    brand: 'Form Office Supply',
    category: 'workplace',
    price: 8450,
    original_price: 10990,
    discount: '-23%',
    stock: 64,
    description: 'Commercial 8-hour rated ergonomic chair with responsive 4D armrests and mesh spine.',
    primary_image: 'https://images.unsplash.com/photo-1505843490701-5be5d64d3a7b?auto=format&fit=crop&w=700&q=80',
    hover_images: ['https://images.unsplash.com/photo-1505843490701-5be5d64d3a7b?auto=format&fit=crop&w=700&q=80'],
    colors: [{ name: 'Slate Gray', hex: '#333842' }]
  }
];

const CATEGORIES = [
  'All',
  'Electronics',
  'Packaging',
  'Apparel',
  'Industrial',
  'Workplace',
  'Home-Living'
];

export default function SellerDashboard({ initialTab }: { initialTab?: 'catalog' | 'orders' | 'rfq' | 'payouts' | 'health' } = {}) {
  const [location, navigate] = useLocation();

  const getTabFromPath = (path: string): 'catalog' | 'orders' | 'rfq' | 'payouts' | 'health' => {
    if (initialTab) return initialTab;
    if (path.includes('/seller/orders')) return 'orders';
    if (path.includes('/seller/rfq')) return 'rfq';
    if (path.includes('/seller/payouts')) return 'payouts';
    if (path.includes('/seller/health')) return 'health';
    return 'catalog';
  };

  // State: Tab navigation
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders' | 'rfq' | 'payouts' | 'health'>(() => getTabFromPath(location || ''));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (location) {
      setActiveTab(getTabFromPath(location));
    }
  }, [location, initialTab]);

  // State: Products from Supabase
  const [products, setProducts] = useState<SupabaseProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State: Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // State: Modal for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupabaseProduct | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: 'Northstar Components',
    category: 'electronics',
    price: '',
    original_price: '',
    stock: '10',
    description: '',
    primary_image: ''
  });

  // State: Order dispatch modal
  const [dispatchModal, setDispatchModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [carrier, setCarrier] = useState('Delhivery Express');
  const [trackingId, setTrackingId] = useState('');

  // Fetch catalog from Supabase
  const loadCatalog = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const data = await getLiveCatalog();
      if (data && data.length > 0) {
        setProducts(data);
      } else {
        setProducts(FALLBACK_PRODUCTS);
      }
    } catch (err) {
      console.warn('Fallback to local catalog:', err);
      setProducts(FALLBACK_PRODUCTS);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Handle Sign Out
  const handleLogout = () => {
    try {
      localStorage.removeItem('flash-role');
      sessionStorage.removeItem('auth-session-token');
    } catch {}
    toast.success('Signed out of Seller Central');
    navigate('/auth/login');
  };

  // Open Modal for Add
  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: 'Northstar Components',
      category: 'electronics',
      price: '',
      original_price: '',
      stock: '25',
      description: '',
      primary_image: ''
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const openEditModal = (p: SupabaseProduct) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      brand: p.brand || 'Northstar Components',
      category: p.category || 'electronics',
      price: String(p.price || ''),
      original_price: String(p.original_price || p.price || ''),
      stock: String(p.stock ?? 10),
      description: p.description || '',
      primary_image: p.primary_image || ''
    });
    setIsModalOpen(true);
  };

  // Save product to Supabase (Insert or Update)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      toast.error('Product title and price are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const sellingPrice = Number(formData.price);
      const mrp = Number(formData.original_price || formData.price);
      const stockUnits = Number(formData.stock || 10);
      const defaultImage =
        formData.primary_image.trim() ||
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';

      if (editingProduct && editingProduct.id) {
        // Update Supabase
        await updateProductInCatalog(editingProduct.id, {
          name: formData.name.trim(),
          brand: formData.brand.trim() || 'Flash',
          category: formData.category.toLowerCase().replace(/\s+/g, '-'),
          price: sellingPrice,
          original_price: mrp,
          stock: stockUnits,
          description: formData.description.trim() || 'Flash verified product.',
          primary_image: defaultImage,
          hover_images: [defaultImage]
        });

        toast.success(`"${formData.name}" updated in live Supabase catalog!`);
      } else {
        // Insert to Supabase
        await insertProductToCatalog({
          name: formData.name.trim(),
          brand: formData.brand.trim() || 'Flash',
          category: formData.category.toLowerCase().replace(/\s+/g, '-'),
          price: sellingPrice,
          original_price: mrp,
          stock: stockUnits,
          description: formData.description.trim() || 'Flash verified product.',
          primary_image: defaultImage,
          hover_images: [defaultImage],
          colors: [{ name: 'Obsidian', hex: '#0F1115' }]
        });

        toast.success(`"${formData.name}" added to Supabase & live on buyer storefront!`);
      }

      setIsModalOpen(false);
      await loadCatalog(true);
    } catch (err: any) {
      console.error('Save product failed:', err);
      toast.error('Failed to sync to Supabase: ' + (err.message || 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete product from Supabase
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the live catalog?`)) {
      return;
    }

    // Optimistic UI update
    setProducts((current) => current.filter((p) => p.id !== id));
    toast.success(`"${name}" removed from catalog`);

    try {
      await deleteProductFromCatalog(id);
    } catch (err: any) {
      console.error('Delete product error:', err);
      toast.error('Failed to delete on Supabase: ' + err.message);
      // Revert if failed
      loadCatalog(true);
    }
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const title = (p.name || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || title.includes(q) || brand.includes(q);

      const categoryNorm = (p.category || '').toLowerCase().replace(/[\s_]+/g, '-');
      const selectedNorm = selectedCategory.toLowerCase().replace(/[\s_]+/g, '-');
      const matchesCategory = selectedCategory === 'All' || categoryNorm === selectedNorm;

      const matchesStock = !inStockOnly || Number(p.stock) > 0;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, selectedCategory, inStockOnly]);

  // Live total catalog valuation
  const catalogStats = useMemo(() => {
    const totalSKUs = products.length;
    const totalStock = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
    const totalInventoryValue = products.reduce(
      (acc, p) => acc + (Number(p.price) || 0) * (Number(p.stock) || 0),
      0
    );
    const lowStockCount = products.filter((p) => Number(p.stock) <= 5).length;
    return { totalSKUs, totalStock, totalInventoryValue, lowStockCount };
  }, [products]);

  // Preview discount percentage in form
  const calculatedDiscount = useMemo(() => {
    const p = Number(formData.price);
    const o = Number(formData.original_price);
    if (o > 0 && p > 0 && o > p) {
      return `-${Math.round(((o - p) / o) * 100)}%`;
    }
    return '0%';
  }, [formData.price, formData.original_price]);

  return (
    <div className="min-h-screen bg-[#07090D] text-[#F8F9FA] selection:bg-[#CCFF00] selection:text-black">
      {/* Top Universal Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#1A1F2B] bg-[#07090D]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="group flex items-center gap-2.5 font-black tracking-tight">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#CCFF00] text-black shadow-[0_0_16px_rgba(204,255,0,0.35)] transition group-hover:scale-105">
                <Zap size={20} fill="currentColor" />
              </span>
              <span className="text-xl tracking-tighter">
                flash<span className="text-[#CCFF00]">.seller</span>
              </span>
            </Link>

            <span className="hidden h-5 w-px bg-[#1F2430] md:block" />

            <div className="hidden items-center gap-2 rounded-full border border-[#1F2430] bg-[#0E1117] px-3 py-1 text-xs font-bold text-neutral-400 md:flex">
              <Store size={14} className="text-[#CCFF00]" />
              <span>Northstar Components Central</span>
              <span className="rounded-full bg-[#1A2E12] px-2 py-0.5 text-[9px] font-black text-[#52E82E]">
                VERIFIED TIER-1
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://flash-beryl.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-[#1F2430] bg-[#12151B] px-3.5 py-2 text-xs font-bold text-neutral-300 transition hover:border-[#CCFF00]/40 hover:text-[#CCFF00] sm:flex"
            >
              <span>Live Buyer Storefront</span>
              <ExternalLink size={13} />
            </a>

            <button
              onClick={() => loadCatalog(false)}
              title="Sync live Supabase catalog"
              className="flex items-center gap-1.5 rounded-full border border-[#1F2430] bg-[#12151B] px-3 py-2 text-xs font-bold text-neutral-300 transition hover:border-[#CCFF00]/40 hover:text-[#CCFF00]"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#CCFF00]' : ''} />
              <span className="hidden sm:inline">Sync DB</span>
            </button>

            <button className="grid h-9 w-9 place-items-center rounded-full border border-[#1F2430] bg-[#12151B] text-neutral-300 transition hover:border-neutral-700">
              <Bell size={16} />
            </button>

            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#CCFF00] text-xs font-black text-black shadow-[0_0_12px_rgba(204,255,0,0.25)]">
              NS
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. EXACT REQUESTED TOP HUB HERO BANNER RESKIN
           ========================================================================= */}
        <div className="relative mb-8 flex w-full flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-neutral-800 bg-black p-6 text-white shadow-2xl sm:p-8 md:flex-row md:items-center md:p-10">
          {/* Decorative Neon Accent Glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#CCFF00]/10 blur-3xl" />

          <div className="z-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-[#12151B] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#CCFF00]" />
              Flash Merchant Hub • Supabase Connected
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl md:text-5xl">
              Seller & Merchant Dashboard
            </h1>
            <p className="max-w-xl text-xs font-medium text-neutral-400 sm:text-sm">
              Manage live storefront catalog listings, perform real-time database sync, and track inventory velocity.
            </p>
          </div>

          {/* Primary CTA: Exact Flash Signature Button */}
          <div className="z-10 flex flex-wrap items-center gap-3">
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 rounded-full bg-[#CCFF00] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all duration-200 hover:scale-105 hover:bg-[#b8e600] active:scale-95"
            >
              <span className="text-base font-bold leading-none">+</span>
              <span>Add Product to Catalog</span>
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-neutral-800 bg-neutral-900 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-400 transition-all hover:border-neutral-700 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. HIGH-CONTRAST SELLER KPI METRICS
           ========================================================================= */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Metric 1: Live Catalog Count */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#1F2430] bg-[#0E1117] p-6 shadow-xl transition hover:border-[#CCFF00]/40">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Live Storefront SKUs
              </span>
              <span className="rounded-full bg-[#CCFF00]/10 px-2 py-0.5 text-[9px] font-black text-[#CCFF00]">
                SUPABASE SYNC
              </span>
            </div>
            <div className="mt-4 font-mono text-3xl font-black text-[#F8F9FA] tabular-nums">
              {isLoading ? (
                <span className="animate-pulse text-neutral-600">...</span>
              ) : (
                catalogStats.totalSKUs
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-neutral-400">
              <span className="font-mono text-[#CCFF00]">{catalogStats.totalStock} units</span>
              <span>across live assortments</span>
            </div>
          </div>

          {/* Metric 2: Gross Sales Velocity */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#1F2430] bg-[#0E1117] p-6 shadow-xl transition hover:border-[#CCFF00]/40">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Today's Gross Sales
              </span>
              <TrendingUp size={16} className="text-[#CCFF00]" />
            </div>
            <div className="mt-4 font-mono text-3xl font-black text-[#CCFF00] tabular-nums">
              ₹2,84,920
            </div>
            <div className="mt-2 text-xs font-semibold text-[#52E82E]">
              ↑ 18.4% velocity vs yesterday
            </div>
          </div>

          {/* Metric 3: Pending Shipments */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#1F2430] bg-[#0E1117] p-6 shadow-xl transition hover:border-[#CCFF00]/40">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Pending Shipments
              </span>
              <Truck size={16} className="text-[#CCFF00]" />
            </div>
            <div className="mt-4 font-mono text-3xl font-black text-[#F8F9FA] tabular-nums">
              26
            </div>
            <div className="mt-2 text-xs font-bold text-[#FFB020]">
              4 orders require dispatch &lt; 6h
            </div>
          </div>

          {/* Metric 4: Account Health */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#1F2430] bg-[#0E1117] p-6 shadow-xl transition hover:border-[#CCFF00]/40">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Merchant Health Index
              </span>
              <BarChart3 size={16} className="text-[#CCFF00]" />
            </div>
            <div className="mt-4 font-mono text-3xl font-black text-[#F8F9FA] tabular-nums">
              98 <span className="text-base text-neutral-500 font-normal">/ 100</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-[#52E82E]">
              Good standing • 99.4% SLA adherence
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. PILL-STYLE SUB-NAVIGATION TABS
           ========================================================================= */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#1A1F2B] pb-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
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
                  onClick={() => {
                    const t = tab.id as 'catalog' | 'orders' | 'rfq' | 'payouts' | 'health';
                    setActiveTab(t);
                    const map: Record<string, string> = {
                      catalog: '/seller/dashboard',
                      orders: '/seller/orders',
                      rfq: '/seller/rfq',
                      payouts: '/seller/payouts',
                      health: '/seller/health'
                    };
                    if (map[t]) navigate(map[t]);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                    isActive
                      ? 'bg-[#CCFF00] text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                      : 'border border-neutral-800 bg-[#12151B] text-neutral-400 hover:border-neutral-700 hover:text-white'
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
              className="inline-flex items-center gap-1.5 rounded-full bg-[#181C24] border border-neutral-700 px-3.5 py-2 text-xs font-bold text-[#CCFF00] hover:border-[#CCFF00] transition"
            >
              <Plus size={14} />
              <span>Quick Add</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: LIVE CATALOG & INVENTORY (SUPABASE INTEGRATED)
           ========================================================================= */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#1F2430] bg-[#0E1117] p-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3 rounded-xl bg-[#181C24] px-4 py-2.5">
                <Search size={16} className="text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search products by title, SKU, or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-neutral-500 outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-neutral-500 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-bold transition ${
                      selectedCategory === cat
                        ? 'bg-[#CCFF00] text-black'
                        : 'bg-[#181C24] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Stock Filter & View Toggle */}
              <div className="flex items-center gap-2 border-t border-[#1F2430] pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="accent-[#CCFF00]"
                  />
                  <span>In stock</span>
                </label>

                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                  className="rounded-lg border border-[#1F2430] bg-[#181C24] p-2 text-neutral-400 hover:text-white"
                >
                  <Layers size={14} />
                </button>
              </div>
            </div>

            {/* Products Grid or Table */}
            {isLoading ? (
              <div className="flex h-64 items-center justify-center rounded-3xl border border-[#1F2430] bg-[#0E1117]">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-[#CCFF00]" size={28} />
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Querying Supabase Catalog...
                  </span>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-neutral-800 bg-[#0E1117] p-12 text-center">
                <Package className="mx-auto text-neutral-600" size={42} />
                <h3 className="mt-4 text-lg font-black uppercase text-white">No products found</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  Try adjusting your search terms or add a new listing to the Supabase database.
                </p>
                <button
                  onClick={openAddModal}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#CCFF00] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black"
                >
                  <Plus size={15} /> Add First Product
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#1F2430] bg-[#0E1117] transition-all duration-300 hover:-translate-y-1 hover:border-[#CCFF00]/40 hover:shadow-2xl"
                  >
                    {/* Image Frame */}
                    <div className="relative aspect-square w-full overflow-hidden bg-[#12151B] p-4">
                      <img
                        src={p.primary_image}
                        alt={p.name}
                        className="h-full w-full object-contain mix-blend-screen transition duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as any).src =
                            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      {p.discount && (
                        <span className="absolute left-3 top-3 rounded-full bg-black/90 px-2.5 py-1 text-[10px] font-black tracking-widest text-[#CCFF00] border border-[#CCFF00]/20">
                          {p.discount}
                        </span>
                      )}
                      <span className="absolute right-3 top-3 rounded-full bg-[#181C24]/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                        {p.category}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        {p.brand || 'Flash'}
                      </div>
                      <h3 className="mt-1 line-clamp-2 text-sm font-black leading-snug text-white">
                        {p.name}
                      </h3>

                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="font-mono text-xl font-bold text-white tabular-nums">
                          ₹{Number(p.price).toLocaleString('en-IN')}
                        </span>
                        {p.original_price && Number(p.original_price) > Number(p.price) && (
                          <span className="font-mono text-xs text-neutral-500 line-through tabular-nums">
                            ₹{Number(p.original_price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#1F2430]">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider ${
                            Number(p.stock) <= 5 ? 'text-[#FFB020]' : 'text-[#52E82E]'
                          }`}
                        >
                          {Number(p.stock)} in stock
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="rounded-lg p-2 text-neutral-400 transition hover:bg-[#181C24] hover:text-[#CCFF00]"
                            title="Edit product"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id!, p.name)}
                            className="rounded-lg p-2 text-neutral-400 transition hover:bg-[#181C24] hover:text-red-400"
                            title="Delete product"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* DENSE TABLE VIEW */
              <div className="overflow-hidden rounded-2xl border border-[#1F2430] bg-[#0E1117]">
                <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-[#1F2430] bg-[#12151B] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 md:grid">
                  <span>Product</span>
                  <span>Category</span>
                  <span>Stock</span>
                  <span>Price</span>
                  <span>Discount</span>
                  <span className="text-right">Actions</span>
                </div>

                <div className="divide-y divide-[#1F2430]">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="grid gap-3 px-5 py-4 transition hover:bg-[#12151B]/50 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] md:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={p.primary_image}
                          alt={p.name}
                          className="h-12 w-12 rounded-xl bg-[#181C24] object-contain p-1"
                        />
                        <div>
                          <div className="text-sm font-black text-white">{p.name}</div>
                          <div className="text-[10px] font-bold text-neutral-500 uppercase">
                            {p.brand || 'Flash'}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-neutral-400 uppercase">
                        {p.category}
                      </div>

                      <div className="font-mono text-sm font-bold text-white tabular-nums">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            Number(p.stock) <= 5
                              ? 'bg-amber-950/40 text-amber-400 border border-amber-800'
                              : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {p.stock} units
                        </span>
                      </div>

                      <div className="font-mono text-sm font-bold text-white tabular-nums">
                        ₹{Number(p.price).toLocaleString('en-IN')}
                      </div>

                      <div>
                        <span className="rounded-full bg-black border border-[#CCFF00]/30 px-2 py-0.5 text-[10px] font-black text-[#CCFF00]">
                          {p.discount || '-0%'}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="rounded-lg border border-[#1F2430] bg-[#181C24] p-2 text-xs font-bold text-neutral-300 hover:border-[#CCFF00] hover:text-[#CCFF00]"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id!, p.name)}
                          className="rounded-lg border border-[#1F2430] bg-[#181C24] p-2 text-xs font-bold text-neutral-300 hover:border-red-500 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: FULFILLMENT & ORDERS
           ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase text-white">Order Dispatch Queue</h2>
                <p className="text-xs text-neutral-400 font-medium">
                  Review verified buyer purchases, print packing slips, and confirm consignment dispatch.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#1F2430] bg-[#0E1117]">
              <div className="hidden grid-cols-[1.2fr_1.5fr_1fr_1fr_1.2fr] gap-4 bg-[#12151B] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 md:grid">
                <span>Order Reference</span>
                <span>Corporate Buyer</span>
                <span>Amount</span>
                <span>Status</span>
                <span className="text-right">Fulfillment Action</span>
              </div>

              <div className="divide-y divide-[#1F2430]">
                {[
                  {
                    id: 'FL-28491',
                    buyer: 'Vertex Enterprise Labs',
                    amount: '₹48,200',
                    status: 'Awaiting dispatch',
                    items: '12 × AeroCharge Pro 65W GaN Adapter',
                    urgent: true
                  },
                  {
                    id: 'FL-28478',
                    buyer: 'Aster Retail Logistics',
                    amount: '₹1,24,500',
                    status: 'Shipped',
                    items: '50 × Modular Warehouse Safety Barrier',
                    urgent: false
                  },
                  {
                    id: 'FL-28462',
                    buyer: 'Kite Cloud Infrastructure',
                    amount: '₹18,900',
                    status: 'Delivered',
                    items: '2 × Ergonomic Task Chair',
                    urgent: false
                  }
                ].map((order) => (
                  <div
                    key={order.id}
                    className="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_1.5fr_1fr_1fr_1.2fr] md:items-center"
                  >
                    <div>
                      <span className="font-mono text-xs font-black text-white">{order.id}</span>
                      <div className="text-[11px] text-neutral-400">{order.items}</div>
                    </div>

                    <div className="text-xs font-bold text-white">{order.buyer}</div>

                    <div className="font-mono text-sm font-bold text-[#CCFF00]">
                      {order.amount}
                    </div>

                    <div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                          order.status === 'Awaiting dispatch'
                            ? 'bg-amber-950/40 text-amber-400 border border-amber-800'
                            : order.status === 'Shipped'
                            ? 'bg-blue-950/40 text-blue-400 border border-blue-800'
                            : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="flex justify-end gap-2">
                      {order.status === 'Awaiting dispatch' ? (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setDispatchModal(true);
                          }}
                          className="rounded-full bg-[#CCFF00] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-black transition hover:bg-[#b8e600]"
                        >
                          Dispatch Now
                        </button>
                      ) : (
                        <button
                          onClick={() => toast.success(`Packing slip downloaded for ${order.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 bg-[#181C24] px-3.5 py-2 text-[10px] font-bold text-neutral-300 hover:text-white"
                        >
                          <Download size={12} />
                          <span>Slip</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: BUYER RFQs & QUOTES
           ========================================================================= */}
        {activeTab === 'rfq' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black uppercase text-white">Quotation & RFQ Inbox</h2>
              <p className="text-xs text-neutral-400 font-medium">
                Negotiate tiered volume orders with verified corporate procurement desks.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                {
                  rfq: 'RFQ-284',
                  buyer: 'Vertex Labs Procurement',
                  product: 'AeroCharge Pro 65W GaN Adapter',
                  units: '250 units',
                  target: '₹1,180 / unit',
                  status: 'Counter offer needed',
                  counterSent: false
                },
                {
                  rfq: 'RFQ-279',
                  buyer: 'Packsmith Logistics Hub',
                  product: 'Recycled Kraft Shipping Cartons',
                  units: '2,000 units',
                  target: '₹36 / unit',
                  status: 'Pending buyer response',
                  counterSent: true
                }
              ].map((q) => (
                <div
                  key={q.rfq}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-[#1F2430] bg-[#0E1117] p-5 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#CCFF00]">{q.rfq}</span>
                      <span className="text-xs text-neutral-500">•</span>
                      <span className="text-xs font-bold text-neutral-300">{q.buyer}</span>
                    </div>
                    <h3 className="text-base font-black text-white">{q.product}</h3>
                    <div className="text-xs text-neutral-400">
                      Requested: <span className="font-mono text-white font-bold">{q.units}</span> at{' '}
                      <span className="font-mono text-[#CCFF00] font-bold">{q.target}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        toast.success(`Counter-offer submitted to ${q.buyer}`);
                      }}
                      className="rounded-full bg-[#CCFF00] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black transition hover:bg-[#b8e600]"
                    >
                      Send Counter-Offer
                    </button>
                    <button
                      onClick={() => toast.success('Quote declined with note')}
                      className="rounded-full border border-neutral-800 bg-[#181C24] px-4 py-2.5 text-xs font-bold text-neutral-400 hover:text-white"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: PAYOUT LEDGER
           ========================================================================= */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black uppercase text-white">Merchant Settlement Ledger</h2>
              <p className="text-xs text-neutral-400 font-medium">
                Transparent escrow breakdown, commission reconciliation, and instant settlement requests.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#1F2430] bg-[#0E1117] p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Available for Payout
                </div>
                <div className="mt-3 font-mono text-3xl font-black text-[#CCFF00] tabular-nums">
                  ₹4,82,600
                </div>
                <button
                  onClick={() => toast.success('Settlement request initiated to HDFC Bank (**** 4821)')}
                  className="mt-5 w-full rounded-full bg-[#CCFF00] py-2.5 text-xs font-black uppercase tracking-wider text-black hover:bg-[#b8e600]"
                >
                  Request Instant Withdrawal
                </button>
              </div>

              <div className="rounded-2xl border border-[#1F2430] bg-[#0E1117] p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  In Escrow (18 active dispatches)
                </div>
                <div className="mt-3 font-mono text-3xl font-black text-white tabular-nums">
                  ₹2,16,420
                </div>
                <p className="mt-5 text-xs text-neutral-400">
                  Auto-released upon buyer proof-of-delivery confirmation.
                </p>
              </div>

              <div className="rounded-2xl border border-[#1F2430] bg-[#0E1117] p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Platform Commission
                </div>
                <div className="mt-3 font-mono text-3xl font-black text-[#F8F9FA] tabular-nums">
                  8.0%
                </div>
                <p className="mt-5 text-xs text-neutral-400">
                  Tier-1 Enterprise volume rate locked through FY26.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: ACCOUNT HEALTH
           ========================================================================= */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black uppercase text-white">Merchant Performance Metrics</h2>
              <p className="text-xs text-neutral-400 font-medium">
                Keep key service metrics above target thresholds to protect Tier-1 priority catalog placement.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#1F2430] bg-[#0E1117] p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Late Dispatch Rate
                </div>
                <div className="mt-3 font-mono text-3xl font-black text-[#52E82E]">0.8%</div>
                <div className="mt-2 text-xs font-bold text-neutral-400">Target: &lt; 1.0% (Passing)</div>
              </div>

              <div className="rounded-2xl border border-[#1F2430] bg-[#0E1117] p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Order Cancellation Rate
                </div>
                <div className="mt-3 font-mono text-3xl font-black text-[#52E82E]">0.2%</div>
                <div className="mt-2 text-xs font-bold text-neutral-400">Target: &lt; 0.5% (Passing)</div>
              </div>

              <div className="rounded-2xl border border-[#1F2430] bg-[#0E1117] p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Median RFQ Turnaround
                </div>
                <div className="mt-3 font-mono text-3xl font-black text-[#CCFF00]">1h 42m</div>
                <div className="mt-2 text-xs font-bold text-neutral-400">Target: &lt; 2h 00m (Passing)</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL: ADD / EDIT PRODUCT (SYNCED DIRECTLY TO SUPABASE)
         ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#1F2430] bg-[#0E1117] p-6 text-white shadow-2xl sm:p-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-neutral-800 bg-[#181C24] text-neutral-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#CCFF00]/30 bg-[#CCFF00]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
                <Sparkles size={12} />
                Live Supabase Synchronization
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                {editingProduct ? 'Edit Catalog Product' : 'Add Product to Storefront'}
              </h2>
              <p className="text-xs text-neutral-400 font-medium">
                Changes write directly to the Supabase <code className="text-[#CCFF00]">products</code> table and update buyer-facing listings instantly.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
              {/* Product Title */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AeroCharge Pro 65W GaN Adapter"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1.5 w-full rounded-2xl border border-[#1F2430] bg-[#181C24] px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-[#CCFF00]"
                />
              </div>

              {/* Brand & Category Row */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Northstar Components"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border border-[#1F2430] bg-[#181C24] px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-[#CCFF00]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border border-[#1F2430] bg-[#181C24] px-4 py-3 text-sm text-white outline-none focus:border-[#CCFF00]"
                  >
                    <option value="electronics">Electronics</option>
                    <option value="packaging">Packaging</option>
                    <option value="apparel">Apparel</option>
                    <option value="industrial">Industrial</option>
                    <option value="workplace">Workplace</option>
                    <option value="home-living">Home-Living</option>
                  </select>
                </div>
              </div>

              {/* Price & MRP Row */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="1499"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border border-[#1F2430] bg-[#181C24] px-4 py-3 text-sm font-mono text-white outline-none focus:border-[#CCFF00]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    MRP / List Price (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1999"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border border-[#1F2430] bg-[#181C24] px-4 py-3 text-sm font-mono text-white outline-none focus:border-[#CCFF00]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="25"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="mt-1.5 w-full rounded-2xl border border-[#1F2430] bg-[#181C24] px-4 py-3 text-sm font-mono text-white outline-none focus:border-[#CCFF00]"
                  />
                </div>
              </div>

              {/* Discount Live Calculation Pill */}
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span>Calculated Storefront Discount:</span>
                <span className="rounded-full bg-[#CCFF00] px-2.5 py-0.5 font-black text-black text-[11px]">
                  {calculatedDiscount}
                </span>
              </div>

              {/* Primary Image URL */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Primary Image CDN URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.primary_image}
                  onChange={(e) => setFormData({ ...formData, primary_image: e.target.value })}
                  className="mt-1.5 w-full rounded-2xl border border-[#1F2430] bg-[#181C24] px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-[#CCFF00]"
                />
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                  <span className="text-neutral-500">Quick presets:</span>
                  {[
                    { label: 'Adapter', url: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=700&q=80' },
                    { label: 'Cartons', url: 'https://images.unsplash.com/photo-1607166452427-7e447e94c8c6?auto=format&fit=crop&w=700&q=80' },
                    { label: 'Headphones', url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=700&q=80' },
                    { label: 'Chair', url: 'https://images.unsplash.com/photo-1505843490701-5be5d64d3a7b?auto=format&fit=crop&w=700&q=80' }
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => setFormData({ ...formData, primary_image: preset.url })}
                      className="rounded-full bg-[#181C24] px-2.5 py-1 text-neutral-300 hover:text-[#CCFF00]"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  B2B Description & Specs
                </label>
                <textarea
                  rows={3}
                  placeholder="Enterprise specifications, MOQ policies, warranty, compliance..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1.5 w-full rounded-2xl border border-[#1F2430] bg-[#181C24] px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-[#CCFF00]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-neutral-800 bg-[#181C24] px-6 py-3 text-xs font-black uppercase tracking-wider text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full bg-[#CCFF00] px-7 py-3 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] transition hover:bg-[#b8e600] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Writing to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <span>{editingProduct ? 'Update in Supabase' : 'Publish to Storefront'}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DISPATCH ORDER
         ========================================================================= */}
      {dispatchModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-[#1F2430] bg-[#0E1117] p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F2430] pb-4">
              <h3 className="text-lg font-black uppercase">Dispatch {selectedOrder.id}</h3>
              <button onClick={() => setDispatchModal(false)} className="text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-[#181C24] p-4 text-xs">
                <div className="font-bold text-white">{selectedOrder.buyer}</div>
                <div className="mt-1 text-neutral-400">{selectedOrder.items}</div>
                <div className="mt-2 font-mono font-bold text-[#CCFF00]">{selectedOrder.amount}</div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Logistics Carrier
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-[#1F2430] bg-[#181C24] px-4 py-3 text-sm text-white outline-none"
                >
                  <option>Delhivery Express</option>
                  <option>Blue Dart Corporate</option>
                  <option>DHL Worldwide Express</option>
                  <option>Shadowfax Hyperlocal</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  AWB / Consignment Tracking Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. DEL-8849201948"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-[#1F2430] bg-[#181C24] px-4 py-3 text-sm text-white outline-none focus:border-[#CCFF00]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  onClick={() => setDispatchModal(false)}
                  className="rounded-full border border-neutral-800 bg-[#181C24] px-5 py-2.5 text-xs font-black uppercase text-neutral-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast.success(`Consignment ${selectedOrder.id} dispatched via ${carrier}`);
                    setDispatchModal(false);
                  }}
                  className="rounded-full bg-[#CCFF00] px-6 py-2.5 text-xs font-black uppercase text-black hover:bg-[#b8e600]"
                >
                  Confirm Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
