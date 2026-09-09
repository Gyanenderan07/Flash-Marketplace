import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, Cell, PieChart, Pie,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Layers,
  Package,
  PieChart as PieIcon,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Truck,
  Zap
} from 'lucide-react';
import { Link } from 'wouter';
import { supabase, getExtendedOrders, getExtendedCatalog, type OrderExtended, type ProductExtended } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonCard } from '@/components/seller/SkeletonTable';
import { EmptyState } from '@/components/seller/EmptyState';
import { StatusBadge } from '@/components/seller/StatusBadge';
import SellerShell from './SellerShell';

type DateRange = '7' | '30' | '90' | 'all';
type ChartMode = 'revenue' | 'comparison' | 'inventory_share' | 'depletion_radar';

const DONUT_COLORS = [
  '#CCFF00',
  '#38BDF8',
  '#A855F7',
  '#F59E0B',
  '#EC4899',
  '#10B981',
  '#6366F1',
];

function formatINR(v: number) {
  return '₹' + Math.round(v).toLocaleString('en-IN');
}

/**
 * High-impact animated counter with smooth 60fps mounting count-up motion (0 -> targetValue)
 */
function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = 0;
    const duration = 700;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (value - start) * ease);
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplay(value);
      }
    };

    requestAnimationFrame(update);
  }, [value]);

  return (
    <span className="tabular-nums font-mono font-black">
      {prefix}{display.toLocaleString('en-IN')}{suffix}
    </span>
  );
}

export default function AnalyticsPage() {
  const { isDark } = useTheme();
  const { sellerId, user } = useAuth();
  const effectiveSellerId = sellerId || user?.id || null;
  const [orders,    setOrders]    = useState<OrderExtended[]>([]);
  const [products,  setProducts]  = useState<ProductExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [range,     setRange]     = useState<DateRange>('30');
  const [chartMode, setChartMode] = useState<ChartMode>('revenue');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Load live data from shared Supabase instance scoped to seller ──
  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [o, p] = await Promise.all([
        getExtendedOrders(effectiveSellerId),
        getExtendedCatalog(effectiveSellerId)
      ]);
      setOrders(o || []);
      setProducts(p || []);
    } catch (e: unknown) {
      console.error('Analytics load failed:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [effectiveSellerId]);

  // ── Real-Time Supabase Pipelines ──
  useEffect(() => {
    load();
    const orderChannel = supabase
      .channel(`analytics-orders-rt-${effectiveSellerId || 'global'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        load(true);
      })
      .subscribe();

    const productChannel = supabase
      .channel(`analytics-products-rt-${effectiveSellerId || 'global'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        load(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(productChannel);
    };
  }, [load, effectiveSellerId]);

  // ── Date Range Filtering ──
  const filteredOrders = useMemo(() => {
    if (range === 'all') return orders;
    const days = parseInt(range, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return orders.filter(o => new Date(o.created_at).getTime() >= cutoff);
  }, [orders, range]);

  // ── 1. Live Gross Revenue Velocity ──
  const grossRevenueVelocity = useMemo(() => {
    return filteredOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
  }, [filteredOrders]);

  // ── 2. Order Fulfillment Velocity (Grouped by status) ──
  const fulfillmentVelocity = useMemo(() => {
    const counts = {
      pending: 0,
      awaiting_dispatch: 0,
      shipped: 0,
      delivered: 0,
      total: filteredOrders.length
    };

    filteredOrders.forEach(o => {
      const s = (o.delivery_status || 'pending').toLowerCase();
      if (s === 'pending' || s === 'new') {
        counts.pending++;
      } else if (s === 'processing' || s === 'awaiting_dispatch') {
        counts.awaiting_dispatch++;
      } else if (s === 'shipped' || s === 'dispatched') {
        counts.shipped++;
      } else if (s === 'delivered') {
        counts.delivered++;
      } else {
        counts.pending++;
      }
    });

    return counts;
  }, [filteredOrders]);

  // ── 3. Active SKU Inventory Units ──
  const totalStockUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock ?? 0), 0);
  }, [products]);

  // ── 4. Stock Depletion Tracking ──
  const depletionItems = useMemo(() => {
    return products
      .filter(p => (p.stock ?? 0) <= (p.low_stock_threshold || 5))
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  }, [products]);

  // ── Revenue Trend Series ──
  const revenueTrendSeries = useMemo(() => {
    const days = range === 'all' ? 30 : parseInt(range, 10);
    const now = Date.now();
    const map: Record<string, { revenue: number; orders: number }> = {};

    for (let d = days - 1; d >= 0; d--) {
      const dateKey = new Date(now - d * 86400000).toISOString().slice(5, 10); // MM-DD
      map[dateKey] = { revenue: 0, orders: 0 };
    }

    filteredOrders.forEach(o => {
      const dateKey = o.created_at.slice(5, 10);
      if (map[dateKey]) {
        map[dateKey].revenue += Number(o.total_amount || 0);
        map[dateKey].orders += 1;
      }
    });

    return Object.entries(map).map(([date, val]) => ({
      date,
      revenue: Math.round(val.revenue),
      orders: val.orders,
    }));
  }, [filteredOrders, range]);

  // ── Category Distribution (Units vs. Revenue) ──
  const categoryDistribution = useMemo(() => {
    const map: Record<string, { units: number; revenue: number }> = {};

    products.forEach(p => {
      const cat = p.category || 'General';
      if (!map[cat]) map[cat] = { units: 0, revenue: 0 };
      map[cat].units += p.stock ?? 0;
    });

    filteredOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = prod?.category || 'General';
        if (map[cat]) {
          map[cat].revenue += (item.price || 0) * (item.qty || 1);
        }
      });
    });

    return Object.entries(map)
      .map(([name, v]) => ({ name, units: v.units, revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 7);
  }, [products, filteredOrders]);

  // ── Category Share for Donut Chart ──
  const categoryShare = useMemo(() => {
    const sumUnits = categoryDistribution.reduce((acc, c) => acc + c.units, 0) || 1;
    return categoryDistribution.map((c, i) => ({
      ...c,
      percentage: Math.max(1, Math.round((c.units / sumUnits) * 100)),
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));
  }, [categoryDistribution]);

  // ── Design Tokens ──
  const C = useMemo(() => ({
    card:    isDark ? 'border-neutral-800/80 bg-[#0D1117]' : 'border-neutral-200/90 bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06),0_2px_6px_-1px_rgba(0,0,0,0.03)]',
    well:    isDark ? 'border-neutral-800 bg-[#12161F]' : 'border-neutral-200 bg-neutral-50/90',
    text:    isDark ? 'text-white' : 'text-neutral-900',
    muted:   isDark ? 'text-neutral-400' : 'text-neutral-500',
    divider: isDark ? 'border-[#1F2430]' : 'border-neutral-200',
  }), [isDark]);

  const primaryAccent = useMemo(() => isDark ? '#CCFF00' : '#15803D', [isDark]);
  const gridStroke    = useMemo(() => isDark ? '#1F2430' : '#E5E7EB', [isDark]);
  const axisText      = useMemo(() => isDark ? '#9CA3AF' : '#6B7280', [isDark]);

  const tooltipStyle = useMemo(() => ({
    backgroundColor: isDark ? '#0D1117' : '#FFFFFF',
    border: `1px solid ${isDark ? '#1F2430' : '#E5E7EB'}`,
    borderRadius: '12px',
    color: isDark ? '#FFFFFF' : '#111827',
    fontSize: '11px',
    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.7)' : '0 10px 30px rgba(0,0,0,0.1)',
  }), [isDark]);

  const CHART_MODES = [
    { id: 'revenue',         label: '📈 Revenue Trend',       desc: 'Area Trendline' },
    { id: 'comparison',      label: '📊 Category Comparison', desc: 'Units vs Sales' },
    { id: 'inventory_share', label: '🍩 Inventory Share',     desc: 'Stock Donut Ring' },
    { id: 'depletion_radar', label: '⚠️ Restock Radar',       desc: `${depletionItems.length} Low Stock` },
  ] as const;

  return (
    <SellerShell
      title="Analytics Hub"
      breadcrumbs={[
        { label: 'Seller Central', href: '/seller/dashboard' },
        { label: 'Real-Time Analytics & Data Suite' }
      ]}
    >
      <div className="space-y-7">
        {/* ── HEADER & RANGE CONTROLS ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 dark:border-[#1F2430] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#15803D] dark:bg-[#CCFF00] shadow-[0_0_8px_#CCFF00] animate-pulse" />
              <span className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>
                Live Shared Instance: Flash-DB
              </span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${C.text}`}>
              Real-Time Merchant Analytics
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Interactive Date Range Switcher */}
            <div className={`flex items-center rounded-full border p-1 ${C.well}`}>
              {(['7', '30', '90', 'all'] as DateRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
                    range === r
                      ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.35)] font-extrabold'
                      : `${C.muted} hover:text-neutral-900 dark:hover:text-white`
                  }`}
                >
                  {r === 'all' ? 'All-Time' : `${r}D`}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <motion.button
              whileTap={{ rotate: 360 }}
              onClick={() => load(true)}
              disabled={isRefreshing}
              className={`rounded-full border p-2 transition ${C.well} ${C.muted} hover:text-neutral-900 dark:hover:text-[#CCFF00]`}
              title="Refresh Analytics"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#15803D] dark:text-[#CCFF00]' : ''} />
            </motion.button>
          </div>
        </div>

        {/* ── 4 REAL-TIME HIGH-VELOCITY METRIC CARDS ── */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Gross Revenue Velocity */}
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setChartMode('revenue')}
            className={`cursor-pointer relative overflow-hidden rounded-2xl border p-5 transition-[background-color,border-color,box-shadow] duration-200 ${C.card} ${
              chartMode === 'revenue' ? 'ring-2 ring-[#CCFF00]' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-[#CCFF00]">
                Gross Revenue
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 dark:bg-[#CCFF00]/20 text-emerald-800 dark:text-[#CCFF00]">
                <TrendingUp size={14} />
              </span>
            </div>
            <div className="mt-3">
              <div className={`font-mono text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${C.text}`}>
                {formatINR(grossRevenueVelocity)}
              </div>
              <p className={`mt-1 text-[11px] ${C.muted}`}>
                Across {filteredOrders.length} processed customer order{filteredOrders.length === 1 ? '' : 's'}.
              </p>
            </div>
          </motion.div>

          {/* Card 2: Wholesale Fulfillment Rate */}
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setChartMode('comparison')}
            className={`cursor-pointer relative overflow-hidden rounded-2xl border p-5 transition-[background-color,border-color,box-shadow] duration-200 ${C.card} ${
              chartMode === 'comparison' ? 'ring-2 ring-[#CCFF00]' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-sky-400">
                Fulfillment Rate
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-100 dark:bg-sky-500/20 text-blue-700 dark:text-sky-400">
                <CheckCircle2 size={14} />
              </span>
            </div>
            <div className="mt-3">
              <div className={`font-mono text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${C.text}`}>
                {filteredOrders.length > 0
                  ? `${Math.round(((fulfillmentVelocity.shipped + fulfillmentVelocity.delivered) / filteredOrders.length) * 100)}%`
                  : '100%'}
              </div>
              <p className={`mt-1 text-[11px] ${C.muted}`}>
                {fulfillmentVelocity.delivered} delivered · {fulfillmentVelocity.awaiting_dispatch + fulfillmentVelocity.pending} active
              </p>
            </div>
          </motion.div>

          {/* Card 3: Live Units in Stock */}
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setChartMode('inventory_share')}
            className={`cursor-pointer relative overflow-hidden rounded-2xl border p-5 transition-[background-color,border-color,box-shadow] duration-200 ${C.card} ${
              chartMode === 'inventory_share' ? 'ring-2 ring-[#CCFF00]' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-purple-400">
                Total Stock In-Hand
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100 dark:bg-purple-500/20 text-violet-700 dark:text-purple-400">
                <Package size={14} />
              </span>
            </div>
            <div className="mt-3">
              <div className={`font-mono text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${C.text}`}>
                {totalStockUnits.toLocaleString()}
              </div>
              <p className={`mt-1 text-[11px] ${C.muted}`}>
                Distributed across {products.length} live catalog product{products.length === 1 ? '' : 's'}.
              </p>
            </div>
          </motion.div>

          {/* Card 4: Restock Depletion Radar */}
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setChartMode('depletion_radar')}
            className={`cursor-pointer relative overflow-hidden rounded-2xl border p-5 transition-[background-color,border-color,box-shadow] duration-200 ${C.card} ${
              chartMode === 'depletion_radar' ? 'ring-2 ring-amber-400' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Restock Radar
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                <AlertTriangle size={14} />
              </span>
            </div>
            <div className="mt-3">
              <div className={`font-mono text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${
                depletionItems.length > 0 ? 'text-amber-600 dark:text-amber-400' : C.text
              }`}>
                {depletionItems.length}
              </div>
              <p className={`mt-1 text-[11px] ${C.muted}`}>
                {depletionItems.length > 0
                  ? `${depletionItems.length} SKU(s) nearing or below threshold (≤ 5 units)`
                  : 'All catalog SKUs adequately stocked above threshold.'}
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── INTERACTIVE CHART MODE SWITCHER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto horizontal-scroll-rail p-1.5 rounded-2xl bg-neutral-200/80 dark:bg-[#14171F]">
            {CHART_MODES.map(mode => {
              const isSelected = chartMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setChartMode(mode.id)}
                  className={`shrink-0 relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-md font-extrabold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>{mode.label}</span>
                  {isSelected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#15803D] dark:bg-[#CCFF00]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className={`text-xs font-semibold ${C.muted} hidden md:block`}>
            Showing: <strong className={C.text}>{CHART_MODES.find(m => m.id === chartMode)?.label}</strong>
          </div>
        </div>

        {/* ── ACTIVE VISUALIZATION CANVAS ── */}
        <AnimatePresence mode="wait">
          {/* ════ 1. REVENUE AREA CHART ════ */}
          {chartMode === 'revenue' && (
            <motion.div
              key="revenue-chart"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`rounded-3xl border p-6 sm:p-8 ${C.card}`}
            >
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#15803D] dark:text-[#CCFF00]">
                      Volume Trajectory
                    </span>
                    <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[9px] font-bold text-neutral-600 dark:text-neutral-300">
                      Live Bezier Stream
                    </span>
                  </div>
                  <h2 className={`text-xl font-black tracking-tight ${C.text} mt-0.5`}>
                    Gross Revenue Trendline
                  </h2>
                  <p className={`text-xs ${C.muted} mt-0.5`}>
                    Daily wholesale order gross billing across all storefront purchases.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`rounded-xl border px-3.5 py-2 text-right ${C.well}`}>
                    <div className={`text-[9px] uppercase font-bold ${C.muted}`}>Period Gross</div>
                    <div className="font-mono text-sm font-extrabold text-emerald-700 dark:text-[#CCFF00]">
                      {formatINR(grossRevenueVelocity)}
                    </div>
                  </div>
                  <div className={`rounded-xl border px-3.5 py-2 text-right ${C.well}`}>
                    <div className={`text-[9px] uppercase font-bold ${C.muted}`}>Average Order</div>
                    <div className={`font-mono text-sm font-extrabold ${C.text}`}>
                      {formatINR(filteredOrders.length ? grossRevenueVelocity / filteredOrders.length : 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendSeries} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isDark ? '#CCFF00' : '#15803D'} stopOpacity={isDark ? 0.45 : 0.3} />
                        <stop offset="95%" stopColor={isDark ? '#CCFF00' : '#15803D'} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="date" stroke={axisText} fontSize={11} tickLine={false} />
                    <YAxis
                      stroke={axisText}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val: any) => [formatINR(Number(val || 0)), 'Gross Revenue']}
                      labelFormatter={l => `Date: ${l}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={isDark ? '#CCFF00' : '#15803D'}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#revenueGlow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* ════ 2. CATEGORY COMPARISON BAR CHART ════ */}
          {chartMode === 'comparison' && (
            <motion.div
              key="comparison-chart"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`rounded-3xl border p-6 sm:p-8 ${C.card}`}
            >
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#15803D] dark:text-[#CCFF00]">
                    Cross-Category Correlation
                  </span>
                  <h2 className={`text-xl font-black tracking-tight ${C.text} mt-0.5`}>
                    Inventory Units vs. Sales Velocity
                  </h2>
                  <p className={`text-xs ${C.muted} mt-0.5`}>
                    Side-by-side comparison of active stock depth vs gross revenue generated per category.
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-[#15803D] dark:bg-[#CCFF00]" />
                    <span className={C.text}>Stock Units</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-sky-500" />
                    <span className={C.text}>Sales Velocity (₹)</span>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryDistribution} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="name" stroke={axisText} fontSize={11} tickLine={false} />
                    <YAxis
                      yAxisId="left"
                      stroke={axisText}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `${v} u`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#38BDF8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val: any, name: string) => [
                        name === 'units' ? `${Number(val || 0)} units` : formatINR(Number(val || 0)),
                        name === 'units' ? 'Inventory Units' : 'Sales Revenue'
                      ]}
                    />
                    <Bar yAxisId="left" dataKey="units" fill={isDark ? '#CCFF00' : '#15803D'} radius={[6, 6, 0, 0]} name="units" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#38BDF8" radius={[6, 6, 0, 0]} name="revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* ════ 3. INVENTORY SHARE RING / DONUT CHART ════ */}
          {chartMode === 'inventory_share' && (
            <motion.div
              key="inventory-share-chart"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`rounded-3xl border p-6 sm:p-8 ${C.card}`}
            >
              <div className="mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#15803D] dark:text-[#CCFF00]">
                  Portfolio Composition
                </span>
                <h2 className={`text-xl font-black tracking-tight ${C.text} mt-0.5`}>
                  Category Stock Distribution &amp; Share
                </h2>
                <p className={`text-xs ${C.muted} mt-0.5`}>
                  Proportional unit allocation breakdown across all active warehouse SKUs.
                </p>
              </div>

              <div className="grid gap-8 lg:grid-cols-2 items-center">
                {/* Donut Chart with Centered Total Counter */}
                <div className="relative h-72 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryShare}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="units"
                        nameKey="name"
                      >
                        {categoryShare.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(val: any, name: string) => [
                          `${Number(val || 0)} units (${Math.round((Number(val || 0) / (totalStockUnits || 1)) * 100)}%)`,
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Total Units Count */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black font-mono tracking-tight text-neutral-900 dark:text-white">
                      {totalStockUnits.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                      Total Units
                    </span>
                  </div>
                </div>

                {/* Data Legend & Proportional Progress Rows */}
                <div className="space-y-3">
                  {categoryShare.map((cat, i) => (
                    <div
                      key={cat.name}
                      className={`flex flex-col gap-1.5 rounded-2xl border p-3.5 transition-colors ${C.well}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className={`text-xs font-bold ${C.text}`}>{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-mono font-bold ${C.text}`}>
                            {cat.units.toLocaleString('en-IN')} units
                          </span>
                          <span className="font-mono text-xs font-extrabold text-neutral-900 dark:text-[#CCFF00]">
                            {cat.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ 4. RESTOCK RADAR / DEPLETION GAUGES ════ */}
          {chartMode === 'depletion_radar' && (
            <motion.div
              key="depletion-radar-chart"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`rounded-3xl border p-6 sm:p-8 ${C.card}`}
            >
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                      Depletion Risk Radar
                    </span>
                  </div>
                  <h2 className={`text-xl font-black tracking-tight ${C.text} mt-0.5`}>
                    Restock Threshold Gauges (Stock ≤ 5 units)
                  </h2>
                  <p className={`text-xs ${C.muted} mt-0.5`}>
                    Catalog products currently at critical risk of stockout and losing buyer buy-box ranking.
                  </p>
                </div>

                <Link
                  href="/seller/inventory"
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 dark:bg-black px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[#CCFF00] shadow-[0_0_12px_rgba(204,255,0,0.25)] hover:scale-105 transition active:scale-95"
                >
                  <span>Inventory Stepper</span>
                  <ArrowUpRight size={13} />
                </Link>
              </div>

              {depletionItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
                  <div className={`text-base font-bold ${C.text}`}>All Stock Levels Optimal</div>
                  <p className={`text-xs ${C.muted} mt-1 max-w-sm`}>
                    Zero items currently at or below the critical replenishment threshold.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {depletionItems.map(item => {
                    const threshold = item.low_stock_threshold || 5;
                    const stock = item.stock ?? 0;
                    const pct = Math.min(100, Math.round((stock / threshold) * 100));
                    const isZero = stock === 0;

                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border p-4 transition-all ${C.well} ${
                          isZero ? 'border-red-400/40 bg-red-50/40 dark:bg-red-950/20' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-extrabold truncate ${C.text}`}>{item.name}</span>
                            <StatusBadge
                              label={isZero ? 'Out of Stock' : 'Low Stock'}
                              variant={isZero ? 'danger' : 'warning'}
                            />
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-neutral-500">
                            <span>SKU: {item.sku || 'N/A'}</span>
                            <span>·</span>
                            <span>Category: {item.category}</span>
                            <span>·</span>
                            <span className="font-bold text-neutral-900 dark:text-white">{formatINR(item.price)}</span>
                          </div>
                        </div>

                        {/* Gauge Meter */}
                        <div className="w-full md:w-64 flex flex-col gap-1">
                          <div className="flex justify-between text-[11px] font-mono font-bold">
                            <span className={isZero ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}>
                              {stock} / {threshold} units
                            </span>
                            <span className={C.muted}>{pct}% threshold</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isZero ? 'bg-red-500' : 'bg-amber-400'
                              }`}
                              style={{ width: `${Math.max(5, pct)}%` }}
                            />
                          </div>
                        </div>

                        <Link
                          href="/seller/inventory"
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:border-[#15803D] dark:hover:border-[#CCFF00] hover:text-[#15803D] dark:hover:text-[#CCFF00] transition whitespace-nowrap"
                        >
                          <span>Restock SKU</span>
                          <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SellerShell>
  );
}
