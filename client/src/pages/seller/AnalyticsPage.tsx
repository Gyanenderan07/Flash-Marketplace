import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, Cell, PieChart, Pie,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Package,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Truck,
  Zap
} from 'lucide-react';
import { Link } from 'wouter';
import { supabase, getExtendedOrders, getExtendedCatalog, type OrderExtended, type ProductExtended } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { SkeletonCard, SkeletonTable } from '@/components/seller/SkeletonTable';
import { EmptyState } from '@/components/seller/EmptyState';
import SellerShell from './SellerShell';

type DateRange = '7' | '30' | '90' | 'all';

const NEON = '#CCFF00';
const BORDER_DARK = '#1F2430';

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
    const duration = 750; // ms
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
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
  const [orders,    setOrders]    = useState<OrderExtended[]>([]);
  const [products,  setProducts]  = useState<ProductExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [range,     setRange]     = useState<DateRange>('30');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Load live data from shared Supabase instance ──
  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [o, p] = await Promise.all([getExtendedOrders(), getExtendedCatalog()]);
      setOrders(o || []);
      setProducts(p || []);
    } catch (e: unknown) {
      console.error('Analytics load failed:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // ── Real-Time Supabase Pipelines ──
  useEffect(() => {
    load();

    const orderChannel = supabase
      .channel('analytics-orders-live-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        load(true);
      })
      .subscribe();

    const productChannel = supabase
      .channel('analytics-products-live-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        load(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(productChannel);
    };
  }, [load]);

  // ── Filter Orders by Date Range ──
  const filteredOrders = useMemo(() => {
    if (range === 'all') return orders;
    const days = parseInt(range, 10);
    const cutoff = Date.now() - days * 86400000;
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

  // ── 3. Active SKU Inventory Velocity ──
  const totalStockUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock ?? 0), 0);
  }, [products]);

  // ── 4. Stock Depletion Tracking (Radar of products near/below threshold) ──
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

  // ── Category Distribution ──
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
      .slice(0, 6);
  }, [products, filteredOrders]);

  const C = {
    card:    isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white',
    well:    isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-gray-50',
    text:    isDark ? 'text-white' : 'text-gray-900',
    muted:   isDark ? 'text-neutral-400' : 'text-gray-500',
    divider: isDark ? 'border-[#1F2430]' : 'border-gray-100',
  };

  const tooltipStyle = {
    backgroundColor: isDark ? '#0D1117' : '#FFFFFF',
    border: `1px solid ${isDark ? '#1F2430' : '#E5E7EB'}`,
    borderRadius: '12px',
    color: isDark ? '#FFFFFF' : '#111827',
    fontSize: '11px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
  };

  return (
    <SellerShell
      title="Analytics Hub"
      breadcrumbs={[
        { label: 'Seller Central', href: '/seller/dashboard' },
        { label: 'Real-Time Buyer Hub Analytics' }
      ]}
    >
      <div className="space-y-7">
        {/* ── HEADER & RANGE CONTROLS ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1F2430] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#CCFF00] shadow-[0_0_8px_#CCFF00] animate-pulse" />
              <span className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>
                Live Shared Instance: Flash-DB
              </span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${C.text}`}>
              Real-Time Buyer Hub Analytics
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Interactive Date Range Switcher */}
            <div className={`flex items-center rounded-full border p-1 ${C.well}`}>
              {(['7', '30', '90', 'all'] as DateRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
                    range === r
                      ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.35)]'
                      : `${C.muted} hover:text-white`
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
              className={`rounded-full border p-2 transition ${C.well} ${C.muted} hover:text-[#CCFF00]`}
              title="Refresh Analytics"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#CCFF00]' : ''} />
            </motion.button>
          </div>
        </div>

        {/* ── 4 REAL-TIME HIGH-VELOCITY METRIC CARDS ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Gross Revenue Velocity */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 ${C.card} border-[#CCFF00]/20 bg-[#CCFF00]/5`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00]">
                Gross Revenue Velocity
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#CCFF00]/20 text-[#CCFF00]">
                <TrendingUp size={14} />
              </span>
            </div>
            <div className="mt-4 text-2xl sm:text-3xl text-[#CCFF00]">
              <AnimatedCounter value={grossRevenueVelocity} prefix="₹" />
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Aggregated from live wholesale buyer orders ({range === 'all' ? 'all-time' : `last ${range} days`}).
            </p>
          </div>

          {/* Card 2: Order Fulfillment Velocity */}
          <div className={`rounded-2xl border p-5 ${C.card}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>
                Fulfillment Velocity
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
                <Truck size={14} />
              </span>
            </div>
            <div className={`mt-4 text-2xl sm:text-3xl ${C.text}`}>
              <AnimatedCounter value={fulfillmentVelocity.total} suffix=" Orders" />
            </div>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-amber-400">
                {fulfillmentVelocity.pending} New
              </span>
              <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-purple-400">
                {fulfillmentVelocity.awaiting_dispatch} Packing
              </span>
              <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-blue-400">
                {fulfillmentVelocity.shipped} Shipped
              </span>
            </div>
          </div>

          {/* Card 3: Active SKU Inventory Velocity */}
          <div className={`rounded-2xl border p-5 ${C.card}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>
                Active SKU Inventory
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-neutral-800 text-neutral-300">
                <Package size={14} />
              </span>
            </div>
            <div className={`mt-4 text-2xl sm:text-3xl ${C.text}`}>
              <AnimatedCounter value={totalStockUnits} suffix=" Units" />
            </div>
            <p className={`mt-1 text-[11px] ${C.muted}`}>
              Across {products.length} live catalog listings synced to buyer portal.
            </p>
          </div>

          {/* Card 4: Stock Depletion Radar Alert */}
          <div className={`rounded-2xl border p-5 ${C.card} ${depletionItems.length > 0 ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-widest ${depletionItems.length > 0 ? 'text-amber-400' : C.muted}`}>
                Depletion Radar
              </span>
              <span className={`grid h-7 w-7 place-items-center rounded-lg ${depletionItems.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                {depletionItems.length > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              </span>
            </div>
            <div className={`mt-4 text-2xl sm:text-3xl font-black ${depletionItems.length > 0 ? 'text-amber-400' : 'text-green-400'}`}>
              <AnimatedCounter value={depletionItems.length} suffix=" Low Stock" />
            </div>
            <p className={`mt-1 text-[11px] ${C.muted}`}>
              {depletionItems.length > 0
                ? `${depletionItems.length} SKU(s) nearing or below threshold (<= 5 units)`
                : 'All catalog SKUs adequately stocked above threshold.'}
            </p>
          </div>
        </div>

        {/* ── CHARTS SECTION ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Revenue Velocity Chart (2 cols) */}
          <div className={`rounded-2xl border p-6 lg:col-span-2 ${C.card}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>Velocity Trendline</span>
                <h3 className={`text-base font-extrabold tracking-tight ${C.text}`}>Live Revenue Velocity Curve</h3>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#CCFF00]">
                <Sparkles size={12} /> Live Aggregation
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrendSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="neonGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={NEON} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={NEON} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER_DARK} vertical={false} />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [formatINR(Number(val || 0)), 'Revenue']}
                    labelFormatter={l => `Date: ${l}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={NEON}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#neonGlow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution Bar Chart (1 col) */}
          <div className={`rounded-2xl border p-6 ${C.card}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>Inventory Spread</span>
                <h3 className={`text-base font-extrabold tracking-tight ${C.text}`}>Category Stock Velocity</h3>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER_DARK} horizontal={false} />
                  <XAxis type="number" stroke="#6B7280" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} width={75} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [`${Number(val || 0)} units`, 'Live Stock']}
                  />
                  <Bar dataKey="units" fill={NEON} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── STOCK DEPLETION RADAR PANEL ── */}
        <div className={`rounded-2xl border p-6 ${C.card}`}>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>
                  Stock Depletion Tracking Radar
                </span>
              </div>
              <h3 className={`text-base font-extrabold tracking-tight ${C.text}`}>
                Critical &amp; Low-Stock SKU Monitor (Stock &le; 5 units)
              </h3>
            </div>
            <Link
              href="/seller/inventory"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#CCFF00] hover:underline"
            >
              <span>Manage in Inventory Stepper</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          {depletionItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 size={32} className="text-[#52E82E] mb-2" />
              <div className={`text-sm font-bold ${C.text}`}>All stock levels optimal</div>
              <p className={`text-xs ${C.muted} mt-0.5`}>
                No products are currently at or below the critical replenishment threshold.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b border-[#1F2430] text-[9px] font-black uppercase tracking-widest ${C.muted}`}>
                  <tr>
                    <th className="pb-3">SKU &amp; Product</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3">Stock Gauge</th>
                    <th className="pb-3 text-right">Quick Restock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2430]/60">
                  {depletionItems.slice(0, 8).map(item => {
                    const pct = Math.min(100, Math.round(((item.stock ?? 0) / (item.low_stock_threshold || 5)) * 100));
                    const isCritical = (item.stock ?? 0) === 0;

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3">
                          <div className={`font-bold ${C.text}`}>{item.name}</div>
                          <div className="text-[10px] font-mono text-neutral-500">{item.sku || 'No SKU'}</div>
                        </td>
                        <td className="py-3 text-neutral-400">{item.category}</td>
                        <td className="py-3 font-mono font-bold">{formatINR(item.price)}</td>
                        <td className="py-3 w-48">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-neutral-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isCritical ? 'bg-red-500' : 'bg-amber-400'
                                }`}
                                style={{ width: `${Math.max(8, pct)}%` }}
                              />
                            </div>
                            <span className={`font-mono font-bold text-[10px] ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                              {item.stock ?? 0} left
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href="/seller/inventory"
                            className="inline-flex items-center gap-1 rounded-full border border-[#1F2430] bg-[#12161F] px-3 py-1 text-[10px] font-bold text-neutral-300 hover:border-[#CCFF00] hover:text-[#CCFF00] transition"
                          >
                            <span>Restock</span>
                            <ArrowUpRight size={10} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SellerShell>
  );
}
