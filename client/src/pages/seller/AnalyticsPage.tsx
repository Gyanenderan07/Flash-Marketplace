import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, Cell, PieChart, Pie,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { getExtendedOrders, getExtendedCatalog, type OrderExtended, type ProductExtended } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { SkeletonCard } from '@/components/seller/SkeletonTable';
import { EmptyState } from '@/components/seller/EmptyState';
import SellerShell from './SellerShell';

type Range = '30' | '90';

const NEON    = '#CCFF00';
const GRID    = '#1F2430';
const SURFACE = '#12161F';

const PIE_COLORS = [NEON, '#16A34A', '#2563EB', '#F59E0B', '#DC2626'];

function formatINR(v: number) {
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

export default function AnalyticsPage() {
  const { isDark } = useTheme();
  const [orders,    setOrders]    = useState<OrderExtended[]>([]);
  const [products,  setProducts]  = useState<ProductExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [range,     setRange]     = useState<Range>('30');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [o, p] = await Promise.all([getExtendedOrders(), getExtendedCatalog()]);
      setOrders(o); setProducts(p);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Sales trend data ──────────────────────────────────────────────────────
  const salesTrend = useMemo(() => {
    const days = parseInt(range);
    const now  = Date.now();
    const map: Record<string, { revenue: number; count: number }> = {};
    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(now - d * 86400000).toISOString().slice(0, 10);
      map[date] = { revenue: 0, count: 0 };
    }
    orders.forEach(o => {
      const date = o.created_at.slice(0, 10);
      if (map[date]) { map[date].revenue += Number(o.total_amount || 0); map[date].count++; }
    });
    return Object.entries(map).map(([date, v]) => ({
      date: date.slice(5), // MM-DD
      revenue: Math.round(v.revenue),
      orders: v.count,
    }));
  }, [orders, range]);

  // ── Category performance ──────────────────────────────────────────────────
  const categoryPerf = useMemo(() => {
    const catMap: Record<string, { revenue: number; units: number }> = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const cat = product?.category || 'Other';
        if (!catMap[cat]) catMap[cat] = { revenue: 0, units: 0 };
        catMap[cat].revenue += item.price * item.qty;
        catMap[cat].units   += item.qty;
      });
    });
    return Object.entries(catMap)
      .map(([category, v]) => ({ category, revenue: Math.round(v.revenue), units: v.units }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [orders, products]);

  // ── Top products ──────────────────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; units: number }> = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.name || item.productId, revenue: 0, units: 0 };
        map[item.productId].revenue += item.price * item.qty;
        map[item.productId].units   += item.qty;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders]);

  // ── Order status distribution ─────────────────────────────────────────────
  const statusDist = useMemo(() => {
    const m: Record<string, number> = {};
    orders.forEach(o => {
      const s = o.delivery_status || 'pending';
      m[s] = (m[s] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const totalRevenue = useMemo(() => orders.reduce((a, o) => a + Number(o.total_amount || 0), 0), [orders]);
  const totalOrders  = orders.length;
  const avgOrder     = totalOrders ? totalRevenue / totalOrders : 0;

  const C = {
    card:   isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white',
    well:   isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-gray-50',
    text:   isDark ? 'text-white'  : 'text-gray-900',
    muted:  isDark ? 'text-neutral-500' : 'text-gray-400',
    chart:  isDark ? '#1F2430' : '#E5E7EB',
  };

  const tooltipStyle = {
    backgroundColor: isDark ? '#0D1117' : '#fff',
    border: `1px solid ${isDark ? '#1F2430' : '#E5E7EB'}`,
    borderRadius: '12px',
    color: isDark ? '#fff' : '#111',
    fontSize: '11px',
  };

  return (
    <SellerShell title="Analytics">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${C.muted}`}>Business Intelligence</div>
          <h1 className={`text-2xl font-black tracking-tight ${C.text}`}>Analytics</h1>
        </div>
        <div className="flex gap-1.5">
          {(['30', '90'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                range === r ? 'bg-[#CCFF00] text-black' : `border ${C.well} ${C.muted}`
              }`}>
              Last {r} days
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total Revenue',   value: formatINR(totalRevenue), sub: `${totalOrders} orders` },
            { label: 'Avg. Order Value', value: formatINR(avgOrder),    sub: 'Per transaction' },
            { label: 'Products Listed', value: products.length,          sub: 'In live catalog' },
          ].map(k => (
            <div key={k.label} className={`rounded-2xl border p-5 ${C.card}`}>
              <div className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>{k.label}</div>
              <div className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${C.text}`}>{k.value}</div>
              <div className={`mt-1 text-[10px] ${C.muted}`}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {totalOrders === 0 && !isLoading ? (
        <EmptyState icon={BarChart3} title="No order data yet"
          body="Analytics charts will populate as your first orders come in from the buyer storefront." />
      ) : (
        <div className="space-y-6">
          {/* Sales trend area chart */}
          <div className={`rounded-2xl border p-5 ${C.card}`}>
            <div className={`mb-4 text-xs font-black uppercase tracking-widest ${C.muted}`}>Revenue Trend</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="neonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={NEON} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={NEON} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.chart} />
                <XAxis dataKey="date" tick={{ fill: isDark ? '#6B7280' : '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₹${v >= 1000 ? `${Math.round(v/1000)}k` : v}`} tick={{ fill: isDark ? '#6B7280' : '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatINR(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke={NEON} strokeWidth={2} fill="url(#neonGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Category performance bar chart */}
            {categoryPerf.length > 0 && (
              <div className={`rounded-2xl border p-5 ${C.card}`}>
                <div className={`mb-4 text-xs font-black uppercase tracking-widest ${C.muted}`}>Category Performance</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryPerf} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.chart} horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `₹${v >= 1000 ? `${Math.round(v/1000)}k` : v}`} tick={{ fill: isDark ? '#6B7280' : '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="category" tick={{ fill: isDark ? '#6B7280' : '#9CA3AF', fontSize: 9 }} width={70} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatINR(v), 'Revenue']} />
                    <Bar dataKey="revenue" fill={NEON} radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Order status donut */}
            {statusDist.length > 0 && (
              <div className={`rounded-2xl border p-5 ${C.card}`}>
                <div className={`mb-4 text-xs font-black uppercase tracking-widest ${C.muted}`}>Order Status Mix</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {statusDist.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {statusDist.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className={`capitalize ${C.muted}`}>{s.name} ({s.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top products table */}
          {topProducts.length > 0 && (
            <div className={`rounded-2xl border p-5 ${C.card}`}>
              <div className={`mb-4 text-xs font-black uppercase tracking-widest ${C.muted}`}>Top Products by Revenue</div>
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className={`w-5 flex-shrink-0 text-[10px] font-black tabular-nums ${C.muted}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`truncate text-xs font-bold ${C.text}`}>{p.name}</div>
                      <div className={`text-[9px] ${C.muted}`}>{p.units} units sold</div>
                    </div>
                    <span className={`font-mono text-sm font-bold tabular-nums ${C.text}`}>{formatINR(p.revenue)}</span>
                    {/* mini bar */}
                    <div className={`hidden w-20 sm:block h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#12161F]' : 'bg-gray-100'}`}>
                      <div className="h-full rounded-full bg-[#CCFF00] transition-all"
                        style={{ width: `${Math.round((p.revenue / topProducts[0].revenue) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SellerShell>
  );
}
