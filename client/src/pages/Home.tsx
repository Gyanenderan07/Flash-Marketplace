import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Download,
  FileText,
  Filter,
  LayoutDashboard,
  Menu,
  Minus,
  MoreHorizontal,
  Package,
  Plus,
  Quote,
  Search,
  Settings2,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Truck,
  Upload,
  Users,
  Wallet,
  X,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import SellerDashboardView from './SellerDashboard';
import {
  supabase,
  getLiveCatalog,
  decrementProductStock,
  VALID_CATEGORIES,
  type SupabaseProduct
} from '@/lib/supabase';
import { useLiveProducts } from '@/lib/useLiveProducts';
import { SafeImage } from '@/components/SafeImage';

const heroImage =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80';

const categories = [
  ['Industrial', '01', 'bg-[#0D1117] border border-neutral-800'],
  ['Electronics', '02', 'bg-[#0D1117] border border-neutral-800'],
  ['Workplace', '03', 'bg-[#0D1117] border border-neutral-800'],
  ['Packaging', '04', 'bg-[#0D1117] border border-neutral-800'],
  ['Apparel', '05', 'bg-[#0D1117] border border-neutral-800']
];

type CartItem = { productId: string; qty: number };

function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue] as const;
}

function useCart() {
  const [cart, setCart] = usePersistentState<CartItem[]>('flash-cart', []);
  return {
    cart,
    add: (id: string, qty = 1) =>
      setCart((c) => {
        const hit = c.find((x) => x.productId === id);
        return hit
          ? c.map((x) => (x.productId === id ? { ...x, qty: x.qty + qty } : x))
          : [...c, { productId: id, qty }];
      }),
    setQty: (id: string, qty: number) =>
      setCart((c) =>
        c.map((x) => (x.productId === id ? { ...x, qty: Math.max(1, qty) } : x))
      ),
    remove: (id: string) => setCart((c) => c.filter((x) => x.productId !== id)),
    clear: () => setCart([])
  };
}

// Global Catalog Context for 100% Live Supabase Binding
const CatalogContext = createContext<{
  products: SupabaseProduct[];
  isLoading: boolean;
  refresh: () => void;
}>({
  products: [],
  isLoading: true,
  refresh: () => {}
});

function FlashLogo() {
  return (
    <Link href="/">
      <div className="flex items-center gap-2 font-extrabold tracking-tight">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]">
          <Zap size={18} fill="currentColor" />
        </span>
        <span className="text-lg text-white font-black">
          flash<span className="text-neutral-500">.biz</span>
        </span>
      </div>
    </Link>
  );
}

function PrimaryButton({
  children,
  onClick,
  href,
  className = '',
  disabled = false
}: {
  children: any;
  onClick?: () => void;
  href?: string;
  className?: string;
  disabled?: boolean;
}) {
  const body = (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#CCFF00] px-5 py-3 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_18px_rgba(204,255,0,0.25)] transition ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </motion.button>
  );
  return href && !disabled ? <Link href={href}>{body}</Link> : body;
}

function Header({
  cartCount = 0,
  dark = true
}: {
  cartCount?: number;
  dark?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800/80 bg-[#000000]/90 text-white backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3.5 sm:px-6 lg:px-8">
        <FlashLogo />
        <nav className="hidden items-center gap-7 text-xs font-extrabold uppercase tracking-wider text-neutral-300 md:flex">
          <Link href="/shop" className="hover:text-[#CCFF00] transition">
            Marketplace
          </Link>
          <Link href="/buyer/quotes" className="hover:text-[#CCFF00] transition">
            Quotes
          </Link>
          <Link href="/seller/dashboard" className="text-[#CCFF00] hover:underline">
            Seller Central
          </Link>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/auth/login"
            className="text-xs font-black uppercase tracking-widest text-neutral-300 hover:text-white"
          >
            Sign in
          </Link>
          <PrimaryButton href="/shop" className="px-4 py-2.5">
            Shop now <ArrowRight size={14} />
          </PrimaryButton>
          <Link
            href="/cart"
            className="relative rounded-full border border-neutral-800 bg-[#0D1117] p-2.5 text-neutral-300 hover:border-neutral-700 hover:text-white transition"
          >
            <ShoppingCart size={17} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#CCFF00] px-1 text-[10px] font-black text-black">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
        <button
          className="rounded-lg p-2 md:hidden text-neutral-300"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menu && (
        <div className="border-t border-neutral-800 bg-[#0D1117] px-4 py-4 md:hidden">
          <div className="grid gap-3 text-xs font-black uppercase tracking-wider">
            <Link href="/shop" className="text-white hover:text-[#CCFF00]">
              Marketplace
            </Link>
            <Link href="/buyer/quotes" className="text-white hover:text-[#CCFF00]">
              Quotes
            </Link>
            <Link href="/seller/dashboard" className="text-[#CCFF00]">
              Seller Central
            </Link>
            <Link href="/auth/login" className="text-neutral-400">
              Sign in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function MobileBar({ role = 'buyer' }: { role?: 'buyer' | 'seller' }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-neutral-800 bg-[#000000]/95 text-white backdrop-blur md:hidden">
      {(role === 'buyer'
        ? [
            ['/', 'Home', LayoutDashboard],
            ['/shop', 'Search', Search],
            ['/cart', 'Cart', ShoppingCart],
            ['/buyer/quotes', 'Quotes', Quote],
            ['/auth/login', 'Account', Users]
          ]
        : [
            ['/seller/dashboard', 'Home', LayoutDashboard],
            ['/seller/dashboard', 'Inventory', Package],
            ['/seller/orders', 'Orders', ClipboardList],
            ['/seller/rfq', 'Quotes', Quote],
            ['/seller/health', 'Profile', Users]
          ]
      ).map(([href, label, I]: any) => (
        <Link
          href={href as string}
          key={label as string}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-white/60 hover:text-[#CCFF00]"
        >
          <I size={17} />
          <span>{label}</span>
        </Link>
      ))}
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  desc
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-8">
      <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
        {eyebrow}
      </div>
      <h1 className="max-w-3xl text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
        {title}
      </h1>
      {desc && (
        <p className="mt-2.5 max-w-2xl text-xs sm:text-sm font-medium text-neutral-400">
          {desc}
        </p>
      )}
    </div>
  );
}

function Home() {
  const { cart } = useCart();
  const { products, isLoading } = useContext(CatalogContext);

  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <Header cartCount={cart.reduce((a, b) => a + b.qty, 0)} />
      <main>
        {/* Hero Section with Refined Font Scale */}
        <section className="flash-dark-grid overflow-hidden border-b border-neutral-800/80">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-20">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#CCFF00]/30 bg-[#CCFF00]/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
                <Sparkles size={13} /> The operating system for business buying
              </div>
              <h1 className="max-w-3xl text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white">
                Buy better.<br />
                <span className="text-[#CCFF00]">Move faster.</span>
              </h1>
              <p className="mt-5 max-w-xl text-xs sm:text-sm font-medium leading-relaxed text-neutral-400">
                The B2B marketplace built for high-velocity commerce. Verified supplier catalog,
                wholesale volume pricing tiers, and real-time database sync.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <PrimaryButton href="/shop">
                  Explore Marketplace <ArrowRight size={15} />
                </PrimaryButton>
                <Link
                  href="/seller/dashboard"
                  className="inline-flex items-center rounded-full border border-neutral-800 bg-[#0D1117] px-5 py-3 text-xs font-black uppercase tracking-wider text-neutral-300 hover:border-neutral-700 hover:text-white transition"
                >
                  Seller Dashboard
                </Link>
              </div>
              <div className="mt-12 grid max-w-xl grid-cols-3 gap-5 border-t border-neutral-800 pt-6">
                <div>
                  <div className="font-mono text-xl font-semibold text-[#CCFF00] tabular-nums">
                    {products.length} Live
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500 font-bold">
                    Supabase SKUs
                  </div>
                </div>
                <div>
                  <div className="font-mono text-xl font-semibold text-[#CCFF00] tabular-nums">
                    18.4%
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500 font-bold">
                    Avg Wholesale Save
                  </div>
                </div>
                <div>
                  <div className="font-mono text-xl font-semibold text-[#CCFF00] tabular-nums">
                    &lt; 1h
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500 font-bold">
                    Dispatch SLA
                  </div>
                </div>
              </div>
            </div>

            <div className="relative min-h-[360px] overflow-hidden rounded-3xl border border-neutral-800/80 bg-[#0D1117]">
              <img
                src={heroImage}
                className="absolute inset-0 h-full w-full object-cover opacity-45"
                alt="Commerce background"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-neutral-800 bg-[#0D1117]/90 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
                      Real-time Sync
                    </div>
                    <div className="mt-1 text-xs sm:text-sm font-bold text-white">
                      Live Catalog bound to deldhtqoygpoozbrfpgv
                    </div>
                  </div>
                  <Truck className="text-[#CCFF00]" size={20} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Rail with scrollbar-none */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Browse by Category
              </div>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
                Find your wholesale advantage.
              </h2>
            </div>
            <Link
              href="/shop"
              className="hidden text-xs font-black uppercase tracking-widest text-[#CCFF00] hover:underline md:block"
            >
              View all products →
            </Link>
          </div>
          <div className="mt-6 flex gap-3 overflow-x-auto scrollbar-none pb-2 sm:grid sm:grid-cols-5">
            {categories.map(([name, num, bg]) => (
              <Link
                href={`/shop?category=${name}`}
                key={name}
                className={`group ${bg} min-w-[150px] rounded-2xl p-4 transition hover:-translate-y-1 hover:border-[#CCFF00]/40`}
              >
                <div className="flex justify-between text-xs font-bold text-neutral-400">
                  <span>0{num}</span>
                  <ArrowRight size={14} className="opacity-40 transition group-hover:translate-x-1" />
                </div>
                <div className="mt-12 text-sm font-bold text-white">{name}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Live Flash Picks from Supabase (Zero mock data) */}
        <section className="border-t border-neutral-800/80 bg-[#07090D] py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
                  Live Picks • Supabase Database
                </div>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
                  Wholesale catalog items, ready to ship.
                </h2>
              </div>
              <PrimaryButton href="/shop">
                Shop all catalog <ArrowRight size={15} />
              </PrimaryButton>
            </div>

            {isLoading ? (
              <div className="mt-8 flex min-h-[260px] items-center justify-center rounded-2xl border border-neutral-800 bg-[#0D1117]">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
                  <span className="h-2 w-2 rounded-full bg-[#CCFF00] animate-pulse" />
                  Connecting to live Supabase catalog...
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="mt-8 flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-[#0D1117] p-8 text-center">
                <Package className="h-10 w-10 text-neutral-600 mb-2" />
                <div className="text-base font-bold text-white">Catalog currently empty</div>
                <p className="mt-1 text-xs text-neutral-400 max-w-sm">
                  No live products in Supabase table <code className="text-[#CCFF00]">products</code> yet. Use the Seller Hub to publish items.
                </p>
                <Link
                  href="/seller/dashboard"
                  className="mt-4 rounded-full bg-[#CCFF00] px-5 py-2 text-xs font-black uppercase text-black"
                >
                  Open Seller Hub
                </Link>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {products.slice(0, 4).map((p) => (
                  <ProductCard p={p} key={p.id || p.name} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <MobileBar />
    </div>
  );
}

function ProductCard({ p }: { p: any }) {
  const { add } = useCart();
  const price = Number(p.price) || 0;
  const oldPrice = Number(p.original_price || p.old) || price;
  const image = p.primary_image || p.image || '';
  const seller = p.brand || p.seller || 'Flash Verified';
  const moq = p.moq || 1;
  const stock = p.stock ?? 0;
  const badge =
    p.discount && p.discount !== '-0%'
      ? p.discount
      : p.badge || (stock > 0 ? 'IN STOCK' : 'PRE-ORDER');

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#0D1117] transition hover:-translate-y-1 hover:border-[#CCFF00]/40 hover:shadow-xl">
      <Link href={`/product/${p.id}`}>
        <div className="relative aspect-square overflow-hidden bg-[#12161F]">
          <SafeImage
            src={image}
            alt={p.name}
            fallbackText={p.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-black/90 border border-neutral-800 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#CCFF00]">
            {badge}
          </span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            {p.category} · {seller}
          </div>
          <Link
            href={`/product/${p.id}`}
            className="mt-1.5 block min-h-11 text-base font-bold text-white line-clamp-2 hover:text-[#CCFF00] transition"
          >
            {p.name}
          </Link>
        </div>

        <div className="mt-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-lg font-semibold text-white tabular-nums">
                ₹{price.toLocaleString('en-IN')}
              </div>
              {oldPrice > price && (
                <div className="font-mono text-[11px] text-neutral-500 line-through tabular-nums">
                  ₹{oldPrice.toLocaleString('en-IN')}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                add(p.id, moq);
                toast.success(`${moq} units added to bulk cart`);
              }}
              className="grid h-9 w-9 place-items-center rounded-full bg-[#CCFF00] text-black transition hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(204,255,0,0.3)]"
            >
              <Plus size={17} />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-neutral-800/80 pt-3 text-[10px] font-bold text-neutral-400">
            <span>MOQ {moq} units</span>
            <span className={stock > 0 ? 'text-[#52E82E]' : 'text-amber-400'}>
              {stock > 0 ? `${stock} available` : 'Out of stock'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductRow({ p }: { p: any }) {
  const { add } = useCart();
  const price = Number(p.price) || 0;
  const image = p.primary_image || p.image || '';
  const seller = p.brand || p.seller || 'Flash Verified';
  const moq = p.moq || 1;
  const stock = p.stock ?? 0;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-3.5 transition hover:border-neutral-700">
      <div className="h-16 w-16 overflow-hidden rounded-xl bg-[#12161F]">
        <SafeImage
          src={image}
          alt={p.name}
          fallbackText={p.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          {p.category} · {seller}
        </div>
        <Link
          href={`/product/${p.id}`}
          className="mt-1 block truncate text-base font-bold text-white hover:text-[#CCFF00]"
        >
          {p.name}
        </Link>
        <div className="mt-1.5 flex gap-4 text-xs font-medium text-neutral-400">
          <span className="font-mono font-semibold text-white tabular-nums">
            ₹{price.toLocaleString('en-IN')}
          </span>
          <span className={stock > 0 ? 'text-[#52E82E]' : 'text-amber-400'}>
            MOQ {moq} · {stock} in stock
          </span>
        </div>
      </div>
      <button
        onClick={() => {
          add(p.id, moq);
          toast.success('Added to cart');
        }}
        className="rounded-full bg-[#CCFF00] p-2.5 text-black hover:scale-105 transition"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

function Shop() {
  const { cart } = useCart();
  const { products, isLoading } = useContext(CatalogContext);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const [category, setCategory] = useState('All');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState(false);
  const [priceMax, setPriceMax] = useState(100000);
  const [stockOnly, setStockOnly] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        category === 'All' ||
        (p.category || '').toLowerCase().includes(category.toLowerCase().replace(/ & /g, '-')) ||
        category.toLowerCase().includes((p.category || '').toLowerCase());
      const matchQuery =
        !query.trim() ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(query.toLowerCase()));
      const matchPrice = (Number(p.price) || 0) <= priceMax;
      const matchStock = !stockOnly || (Number(p.stock) || 0) > 0;
      return matchCat && matchQuery && matchPrice && matchStock;
    });
  }, [products, category, query, priceMax, stockOnly]);

  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <Header cartCount={cart.reduce((a, b) => a + b.qty, 0)} />
      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <PageTitle
            eyebrow={`Live Marketplace / ${products.length} verified SKUs`}
            title="Buy at business speed."
            desc="Wholesale pricing, verified sellers, and real-time database fulfillment."
          />
          <button
            onClick={() => setFilter(true)}
            className="mb-8 inline-flex items-center gap-2 self-start rounded-full bg-[#0D1117] border border-neutral-800 px-4 py-3 text-xs font-black uppercase tracking-widest text-[#CCFF00] lg:hidden"
          >
            <SlidersHorizontal size={14} /> Filters
          </button>
        </div>

        {/* Search & Category Filter Bar with scrollbar-none */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-neutral-800/80 bg-[#0D1117] p-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-3 rounded-xl bg-[#12161F] px-4">
            <Search size={18} className="text-neutral-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products, SKUs, or sellers"
              className="w-full bg-transparent py-3 text-xs text-white outline-none placeholder:text-neutral-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
            {['All', ...VALID_CATEGORIES].map((x) => (
              <button
                onClick={() => setCategory(x)}
                key={x}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
                  category === x
                    ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]'
                    : 'border border-neutral-800 bg-[#12161F] text-neutral-400 hover:border-neutral-700 hover:text-white'
                }`}
              >
                {x}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-1 border-l border-neutral-800 pl-3 lg:flex">
            <button
              onClick={() => setView('grid')}
              className={`rounded-lg p-2 ${
                view === 'grid' ? 'bg-[#CCFF00] text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutDashboard size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`rounded-lg p-2 ${
                view === 'list' ? 'bg-[#CCFF00] text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ClipboardList size={16} />
            </button>
          </div>
        </div>

        {/* Catalog Grid / Empty State */}
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-neutral-800 bg-[#0D1117]">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
              <span className="h-2 w-2 rounded-full bg-[#CCFF00] animate-pulse" />
              Loading live catalog...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-[#0D1117] p-8 text-center">
            <Package className="h-10 w-10 text-neutral-600 mb-2" />
            <div className="text-base font-bold text-white">No products found</div>
            <p className="mt-1 text-xs text-neutral-400 max-w-sm">
              No products match your search or active filter. Try resetting the category filter.
            </p>
            <button
              onClick={() => {
                setCategory('All');
                setSearchInput('');
              }}
              className="mt-4 rounded-full bg-[#CCFF00] px-5 py-2 text-xs font-black uppercase text-black"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            className={
              view === 'grid'
                ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3'
                : 'grid gap-3'
            }
          >
            {filtered.map((p) =>
              view === 'grid' ? (
                <ProductCard p={p} key={p.id || p.name} />
              ) : (
                <ProductRow p={p} key={p.id || p.name} />
              )
            )}
          </div>
        )}
      </main>
      <MobileBar />
    </div>
  );
}

function ProductPage({ id }: { id: string }) {
  const { products, isLoading } = useContext(CatalogContext);
  const p = products.find((x) => x.id === id);
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] text-white">
        <Header />
        <div className="py-24 text-center text-neutral-400 text-xs font-bold">
          Loading product details...
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-[#000000] text-white">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <p className="mt-2 text-xs text-neutral-400">
            This SKU might have been updated or removed from the catalog.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-block rounded-full bg-[#CCFF00] px-6 py-2.5 text-xs font-black uppercase text-black"
          >
            Back to marketplace
          </Link>
        </main>
      </div>
    );
  }

  const price = Number(p.price) || 0;
  const origPrice = Number(p.original_price || p.price) || price;
  const tier =
    qty >= 50 ? Math.round(price * 0.78) : qty >= 10 ? Math.round(price * 0.87) : price;

  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 pb-24 sm:px-6 lg:px-8">
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-white"
        >
          <ChevronLeft size={14} /> Back to marketplace
        </Link>
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-[#0D1117] p-6">
            <div className="aspect-square w-full overflow-hidden rounded-2xl bg-[#12161F]">
              <SafeImage
                src={p.primary_image}
                alt={p.name}
                fallbackText={p.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
              {p.category} / {p.brand || 'Flash Verified'}
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">{p.name}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-mono text-3xl font-semibold text-white tabular-nums">
                ₹{tier.toLocaleString('en-IN')}
              </span>
              {origPrice > price && (
                <span className="font-mono text-sm text-neutral-500 line-through tabular-nums">
                  ₹{origPrice.toLocaleString('en-IN')}
                </span>
              )}
              <span className="rounded-full bg-[#CCFF00] px-2.5 py-1 text-[10px] font-black text-black">
                WHOLESALE
              </span>
            </div>
            <p className="mt-4 text-xs sm:text-sm font-medium leading-relaxed text-neutral-400">
              {p.description || 'Verified enterprise quality wholesale listing.'}
            </p>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-neutral-800 bg-[#0D1117] p-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Quantity Units
                </div>
                <div className="mt-2 flex items-center rounded-full border border-neutral-800 bg-[#12161F]">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-4 py-2 text-neutral-400 hover:text-white"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-mono text-sm font-semibold tabular-nums">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="px-4 py-2 text-neutral-400 hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  Line Total
                </div>
                <div className="mt-2 font-mono text-xl font-semibold text-[#CCFF00] tabular-nums">
                  ₹{(tier * qty).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <PrimaryButton
                onClick={() => {
                  add(p.id || '', qty);
                  toast.success('Added to bulk cart');
                }}
                className="flex-1"
              >
                Add to bulk cart <ShoppingCart size={15} />
              </PrimaryButton>
            </div>
          </div>
        </div>
      </main>
      <MobileBar />
    </div>
  );
}

function Cart() {
  const { cart, setQty, remove } = useCart();
  const { products } = useContext(CatalogContext);
  const items = cart
    .map((x) => ({ ...x, p: products.find((p) => p.id === x.productId) }))
    .filter((x) => x.p);

  const unit = (p: any, q: number) => {
    const pr = Number(p.price) || 0;
    return q >= 50 ? Math.round(pr * 0.78) : q >= 10 ? Math.round(pr * 0.87) : pr;
  };

  const total = items.reduce((s, x) => s + unit(x.p, x.qty) * x.qty, 0);

  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <Header cartCount={cart.reduce((a, b) => a + b.qty, 0)} />
      <main className="mx-auto max-w-7xl px-4 py-10 pb-24 sm:px-6 lg:px-8">
        <PageTitle
          eyebrow={`Bulk cart / ${items.length} items`}
          title="Ready when your team is."
          desc="Wholesale pricing reflects tiered discount increments."
        />

        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-800 bg-[#0D1117] p-14 text-center">
            <ShoppingCart className="mx-auto text-neutral-600 mb-3" size={38} />
            <h2 className="text-xl font-bold">Your cart is empty</h2>
            <Link
              href="/shop"
              className="mt-4 inline-block text-xs font-black uppercase text-[#CCFF00] underline"
            >
              Browse marketplace
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {items.map((x) => (
                <div
                  key={x.p!.id}
                  className="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-[#0D1117] p-4"
                >
                  <div className="h-16 w-16 overflow-hidden rounded-xl bg-[#12161F]">
                    <SafeImage
                      src={x.p!.primary_image}
                      alt={x.p!.name}
                      fallbackText={x.p!.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white line-clamp-1">{x.p!.name}</div>
                    <div className="mt-1 text-xs text-neutral-400 font-mono">
                      ₹{unit(x.p, x.qty).toLocaleString('en-IN')} / unit
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setQty(x.p!.id!, x.qty - 1)}
                        className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300"
                      >
                        −
                      </button>
                      <span className="font-mono text-xs font-semibold tabular-nums px-1">
                        {x.qty}
                      </span>
                      <button
                        onClick={() => setQty(x.p!.id!, x.qty + 1)}
                        className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(x.p!.id!)}
                    className="text-neutral-500 hover:text-red-400"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="h-fit rounded-3xl border border-neutral-800 bg-[#0D1117] p-6 text-white">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
                Order Summary
              </div>
              <div className="mt-4 flex justify-between border-t border-neutral-800 pt-4 text-base font-bold">
                <span>Estimated total</span>
                <span className="font-mono font-semibold text-[#CCFF00] tabular-nums">
                  ₹{total.toLocaleString('en-IN')}
                </span>
              </div>
              <PrimaryButton href="/checkout" className="mt-6 w-full">
                Continue to checkout <ArrowRight size={15} />
              </PrimaryButton>
            </div>
          </div>
        )}
      </main>
      <MobileBar />
    </div>
  );
}

function Checkout() {
  const [step, setStep] = usePersistentState<number>('flash-checkout-step', 1);
  const { cart, clear } = useCart();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    try {
      // Decrement inventory stock in Supabase for each cart item
      await Promise.all(
        cart.map((item) => decrementProductStock(item.productId, item.qty))
      );

      clear();
      setStep(3);
      toast.success('Order placed! Inventory updated live in Supabase.');
    } catch (err) {
      console.error('Checkout stock decrement error:', err);
      toast.error('Could not sync stock with Supabase');
      setStep(3);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-24 sm:px-6">
        <PageTitle
          eyebrow={`Checkout / Step ${step} of 3`}
          title="Instant enterprise fulfillment."
        />

        <div className="rounded-3xl border border-neutral-800 bg-[#0D1117] p-6 sm:p-9">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white">Delivery Location</h2>
              <div className="mt-4 rounded-2xl border border-neutral-800 bg-[#12161F] p-4 text-xs">
                <div className="font-bold text-white">Primary Enterprise Hub</div>
                <div className="text-neutral-400 mt-1">
                  Unit 4B, Sector 18, Commercial Zone, Gurgaon, HR 122015
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <PrimaryButton onClick={() => setStep(2)}>
                  Continue to payment <ArrowRight size={15} />
                </PrimaryButton>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-white">Payment Method</h2>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-2xl border border-[#CCFF00] bg-[#12161F] p-4 text-xs font-bold">
                  <span>Corporate Net-30 Terms</span>
                  <Check size={16} className="text-[#CCFF00]" />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <PrimaryButton onClick={handlePlaceOrder} disabled={isProcessing}>
                  {isProcessing ? 'Updating Supabase...' : 'Confirm Order'} <ArrowRight size={15} />
                </PrimaryButton>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#CCFF00] text-black">
                <Check size={28} />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white">Order Confirmed!</h2>
              <p className="mt-2 text-xs text-neutral-400 max-w-sm mx-auto">
                Stock has been decremented live in Supabase table <code className="text-[#CCFF00]">products</code>.
              </p>
              <Link
                href="/shop"
                onClick={() => setStep(1)}
                className="mt-6 inline-block rounded-full bg-[#CCFF00] px-6 py-2.5 text-xs font-black uppercase text-black"
              >
                Back to marketplace
              </Link>
            </div>
          )}
        </div>
      </main>
      <MobileBar />
    </div>
  );
}

function Quotes() {
  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10 pb-24 sm:px-6 lg:px-8">
        <PageTitle
          eyebrow="Buyer workspace / RFQs"
          title="Your quote inbox."
          desc="Negotiate directly with verified suppliers for volume orders."
        />
        <div className="rounded-3xl border border-dashed border-neutral-800 bg-[#0D1117] p-12 text-center text-neutral-400 text-xs font-medium">
          <Quote className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
          <div className="text-base font-bold text-white">No active quote requests</div>
          <div className="mt-1">Inquiries requested from suppliers will appear here.</div>
        </div>
      </main>
      <MobileBar />
    </div>
  );
}

function Orders() {
  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10 pb-24 sm:px-6 lg:px-8">
        <PageTitle
          eyebrow="Buyer workspace / Orders"
          title="Your orders, in motion."
          desc="Track fulfillment and download consignment waybills."
        />
        <div className="rounded-3xl border border-dashed border-neutral-800 bg-[#0D1117] p-12 text-center text-neutral-400 text-xs font-medium">
          <Truck className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
          <div className="text-base font-bold text-white">No orders placed yet</div>
          <div className="mt-1">Placed wholesale orders will appear here for shipment tracking.</div>
        </div>
      </main>
      <MobileBar />
    </div>
  );
}

function Auth({ signup = false }: { signup?: boolean }) {
  const [, navigate] = useLocation();
  const demoLogin = (target: 'buyer' | 'seller') => {
    localStorage.setItem('flash-role', target);
    navigate(target === 'buyer' ? '/shop' : '/seller/dashboard');
    toast.success(`${target === 'buyer' ? 'Buyer' : 'Seller'} workspace loaded`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#000000] p-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-[#0D1117] p-8 shadow-2xl">
        <FlashLogo />
        <h2 className="mt-6 text-2xl font-bold">
          {signup ? 'Create an account' : 'Sign in to Flash'}
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Select your workspace demo to continue.
        </p>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => demoLogin('seller')}
            className="w-full rounded-2xl bg-[#CCFF00] py-3 text-xs font-black uppercase text-black hover:bg-[#b8e600] transition"
          >
            Access Seller Central (Supabase Live)
          </button>
          <button
            onClick={() => demoLogin('buyer')}
            className="w-full rounded-2xl border border-neutral-800 bg-[#12161F] py-3 text-xs font-bold uppercase text-neutral-300 hover:text-white transition"
          >
            Access Buyer Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}

function AppRouter() {
  const [location] = useLocation();
  const liveProductsState = useLiveProducts();

  return (
    <CatalogContext.Provider value={liveProductsState}>
      {(() => {
        if (location === '/') return <Home />;
        if (location === '/shop') return <Shop />;
        if (location.startsWith('/product/'))
          return <ProductPage id={location.split('/')[2]} />;
        if (location === '/cart') return <Cart />;
        if (location === '/checkout') return <Checkout />;
        if (location === '/buyer/quotes') return <Quotes />;
        if (location === '/buyer/orders') return <Orders />;
        if (location === '/auth/login') return <Auth />;
        if (location === '/auth/signup') return <Auth signup />;
        if (location.startsWith('/seller')) return <SellerDashboardView />;
        return <Home />;
      })()}
    </CatalogContext.Provider>
  );
}

export default AppRouter;
