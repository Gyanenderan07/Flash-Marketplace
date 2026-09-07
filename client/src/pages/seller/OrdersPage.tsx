import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, Check, ChevronLeft, ChevronRight, ClipboardList,
  Loader2, Truck, X, Download, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import {
  supabase, getExtendedOrders, dispatchOrder,
  type OrderExtended, type StatusTimelineEntry
} from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge, orderStatusVariant } from '@/components/seller/StatusBadge';
import { SkeletonTable } from '@/components/seller/SkeletonTable';
import { EmptyState } from '@/components/seller/EmptyState';
import { ConfirmModal } from '@/components/seller/ConfirmModal';
import { TableSortDropdown, type SortOption } from '@/components/seller/TableSortDropdown';
import SellerShell from './SellerShell';

export type OrderSortKey = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'customer_asc';

export const ORDER_SORT_OPTIONS: SortOption<OrderSortKey>[] = [
  { id: 'newest',       label: 'Newest First' },
  { id: 'oldest',       label: 'Oldest First' },
  { id: 'amount_desc',  label: 'Amount: High to Low' },
  { id: 'amount_asc',   label: 'Amount: Low to High' },
  { id: 'customer_asc', label: 'Buyer Name (A-Z)' },
];

const PAGE_SIZE = 20;
const SPRING    = { type: 'spring', stiffness: 300, damping: 25 } as const;
const FADE      = { duration: 0.2, ease: 'easeOut' } as const;

type StatusTab = 'all' | 'pending' | 'processing' | 'dispatched' | 'delivered' | 'cancelled' | 'returned';

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'all',        label: 'All'               },
  { id: 'pending',    label: 'New'               },
  { id: 'processing', label: 'Awaiting Dispatch' },
  { id: 'dispatched', label: 'Shipped'           },
  { id: 'delivered',  label: 'Delivered'         },
  { id: 'cancelled',  label: 'Cancelled'         },
  { id: 'returned',   label: 'Returned'          },
];

const FULFILLMENT_STEPS = ['pending', 'processing', 'dispatched', 'delivered'] as const;

function formatINR(v: number) {
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function OrdersPage() {
  const { isDark } = useTheme();
  const { sellerId, user } = useAuth();
  const effectiveSellerId = sellerId || user?.id || null;
  const [orders,       setOrders]       = useState<OrderExtended[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [statusTab,    setStatusTab]    = useState<StatusTab>('all');
  const [sortKey,      setSortKey]      = useState<OrderSortKey>('newest');
  const [page,         setPage]         = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderExtended | null>(null);
  const [carrier,      setCarrier]      = useState('Delhivery Express');
  const [trackingNum,  setTrackingNum]  = useState('');
  const [isSaving,     setIsSaving]     = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try { setOrders(await getExtendedOrders(effectiveSellerId)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setIsLoading(false); }
  }, [effectiveSellerId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`orders-seller-rt-${effectiveSellerId || 'global'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, effectiveSellerId]);

  const filtered = useMemo(() => {
    let list = orders;
    if (statusTab === 'processing') {
      list = orders.filter(o => {
        const s = (o.delivery_status || 'pending').toLowerCase();
        return s === 'processing' || s === 'awaiting_dispatch' || s === 'awaiting dispatch';
      });
    } else if (statusTab !== 'all') {
      list = orders.filter(o => (o.delivery_status || 'pending').toLowerCase() === statusTab);
    }
    const copy = [...list];
    copy.sort((a, b) => {
      switch (sortKey) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount_desc':
          return (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
        case 'amount_asc':
          return (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0);
        case 'customer_asc':
          return (a.customer_name || '').localeCompare(b.customer_name || '');
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return copy;
  }, [orders, statusTab, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    orders.forEach(o => {
      let s = (o.delivery_status || 'pending').toLowerCase();
      if (s === 'awaiting_dispatch' || s === 'awaiting dispatch') s = 'processing';
      c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [orders]);

  const advanceStatus = async (order: OrderExtended) => {
    const cur  = (order.delivery_status || 'pending').toLowerCase();
    const idx  = FULFILLMENT_STEPS.indexOf(cur as typeof FULFILLMENT_STEPS[number]);
    if (idx < 0 || idx >= FULFILLMENT_STEPS.length - 1) return;
    const next = FULFILLMENT_STEPS[idx + 1];
    const timeline: StatusTimelineEntry[] = [
      ...(order.status_timeline || []),
      { status: next, timestamp: new Date().toISOString() }
    ];
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, delivery_status: next, status_timeline: timeline } : o));
    if (selectedOrder?.id === order.id) setSelectedOrder(o => o ? { ...o, delivery_status: next, status_timeline: timeline } : o);
    await dispatchOrder(order.id, { delivery_status: next, status_timeline: timeline });
    toast.success(`Order ${order.id.slice(0, 8)} → ${next}`);
  };

  const handleDispatch = async () => {
    if (!selectedOrder) return;
    setIsSaving(true);
    try {
      const timeline: StatusTimelineEntry[] = [
        ...(selectedOrder.status_timeline || []),
        { status: 'dispatched', timestamp: new Date().toISOString(), note: `${carrier} · AWB: ${trackingNum}` }
      ];
      const updated = await dispatchOrder(selectedOrder.id, {
        delivery_status: 'dispatched', tracking_number: trackingNum, carrier, status_timeline: timeline
      });
      if (updated) setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(null);
      toast.success(`Order dispatched via ${carrier}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Dispatch failed');
    } finally {
      setIsSaving(false);
    }
  };

  const printPackingSlip = (order: OrderExtended) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Packing Slip #${order.id.slice(0,8)}</title>
    <style>body{font-family:monospace;padding:2rem;max-width:600px;margin:auto}h1{font-size:1.2rem;border-bottom:2px solid #000;padding-bottom:0.5rem}.label{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em;color:#666;margin-top:1rem}.value{font-size:0.9rem;margin-top:0.25rem}table{width:100%;border-collapse:collapse;margin-top:1rem}td,th{padding:0.5rem;border-bottom:1px solid #ddd;text-align:left;font-size:0.8rem}@media print{button{display:none}}</style>
    </head><body>
    <h1>FLASH B2B — PACKING SLIP</h1>
    <p class="label">Order ID</p><p class="value">${order.id}</p>
    <p class="label">Customer</p><p class="value">${order.customer_name || 'B2B Buyer'}</p>
    <p class="label">Order Date</p><p class="value">${formatDate(order.created_at)}</p>
    <p class="label">Items</p>
    <table><tr><th>Product</th><th>Qty</th><th>Unit Price</th></tr>
    ${(order.items || []).map(i => `<tr><td>${i.name || i.productId}</td><td>${i.qty}</td><td>₹${i.price}</td></tr>`).join('')}
    </table>
    <p class="label">Total</p><p class="value">${formatINR(Number(order.total_amount || 0))}</p>
    <br/><button onclick="window.print()">Print</button>
    </body></html>`);
    w.document.close();
  };

  const printShippingLabel = (order: OrderExtended) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const addr = order.shipping_address as { street?: string; city?: string; state?: string; zip?: string; country?: string } | null;
    const addrStr = addr ? `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}, ${addr.country || 'India'}` : 'Commercial Delivery Address on File';
    w.document.write(`<!DOCTYPE html><html><head><title>Shipping Label #${order.id.slice(0,8)}</title>
    <style>body{font-family:monospace;padding:1.5rem;max-width:480px;margin:auto;border:3px dashed #000}h1{font-size:1.3rem;letter-spacing:0.1em;margin:0 0 1rem 0;border-bottom:2px solid #000;padding-bottom:0.5rem}.sec{margin-bottom:1rem}.label{font-size:0.65rem;text-transform:uppercase;color:#555;margin:0 0 0.2rem 0}.val{font-size:0.95rem;font-weight:bold;margin:0}.barcode{letter-spacing:0.3em;font-size:1.6rem;text-align:center;padding:1rem 0;border-top:1px solid #000;border-bottom:1px solid #000;margin:1rem 0}@media print{button{display:none}}</style>
    </head><body>
    <h1>FLASH LOGISTICS PRIORITY</h1>
    <div class="sec"><p class="label">SHIP TO:</p><p class="val">${order.customer_name || 'B2B Enterprise Buyer'}</p><p class="val" style="font-weight:normal;font-size:0.85rem">${addrStr}</p></div>
    <div class="sec"><p class="label">SHIPPER / ORIGIN:</p><p class="val">Northstar Components Pvt. Ltd.</p><p class="val" style="font-weight:normal;font-size:0.85rem">Flash B2B Fulfillment Hub #01</p></div>
    <div class="barcode">||| | |||| || ||||| |||</div>
    <div style="display:flex;justify-content:space-between">
      <div><p class="label">CARRIER</p><p class="val">${order.carrier || carrier}</p></div>
      <div><p class="label">TRACKING / AWB</p><p class="val">${order.tracking_number || trackingNum || 'PENDING-AWB'}</p></div>
    </div>
    <br/><button onclick="window.print()" style="padding:0.5rem 1rem;cursor:pointer">Print Shipping Label</button>
    </body></html>`);
    w.document.close();
  };

  const C = {
    card:   isDark ? 'border-neutral-800/80 bg-[#0D1117]' : 'border-neutral-200/90 bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06),0_2px_6px_-1px_rgba(0,0,0,0.03)]',
    well:   isDark ? 'border-neutral-800 bg-[#12161F]' : 'border-neutral-200 bg-neutral-50/90',
    text:   isDark ? 'text-white'  : 'text-gray-900',
    muted:  isDark ? 'text-neutral-500' : 'text-gray-400',
    th:     isDark ? 'text-neutral-300 bg-[#14171F]' : 'text-neutral-700 bg-neutral-100',
    row:    isDark ? 'border-[#1F2430]/60 hover:bg-[#12161F]/70' : 'border-gray-100 hover:bg-gray-50',
    input:  isDark ? 'border-[#1F2430] bg-[#12161F] text-white focus:border-[#CCFF00]' : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-[#CCFF00]',
    divider: isDark ? 'border-[#1F2430]' : 'border-gray-100',
  };

  return (
    <SellerShell title="Orders">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${C.muted}`}>Fulfillment Queue</div>
          <h1 className={`text-2xl font-black tracking-tight ${C.text}`}>Orders</h1>
        </div>
        <button
          onClick={() => {
            const csv = [['ID','Customer','Email','Amount','Status','Date'],
              ...orders.map(o => [o.id, o.customer_name || '', o.customer_email || '', o.total_amount, o.delivery_status || 'pending', o.created_at])
            ].map(r => r.join(',')).join('\n');
            const a = Object.assign(document.createElement('a'), {
              href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
              download: 'flash-orders.csv'
            });
            a.click();
            toast.success('Orders exported');
          }}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${C.well} ${C.muted} hover:text-[#CCFF00]`}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Status tabs */}
      <div className={`mb-4 flex overflow-x-auto scrollbar-none gap-1 border-b pb-3 ${C.divider}`}>
        {STATUS_TABS.map(tab => (
          <button key={tab.id}
            onClick={() => { setStatusTab(tab.id); setPage(1); }}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
              statusTab === tab.id
                ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.25)]'
                : `border ${C.well} ${C.muted} hover:border-[#CCFF00]/30`
            }`}
          >
            {tab.label}
            {counts[tab.id] !== undefined && counts[tab.id] > 0 && (
              <span className="ml-1.5 rounded-full bg-black/20 px-1.5">{counts[tab.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Stats & Sort bar ── */}
      {!isLoading && (
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <span className={`text-xs font-semibold ${C.muted}`}>
            {filtered.length} order{filtered.length !== 1 ? 's' : ''} · Page {page}/{totalPages}
          </span>
          <TableSortDropdown<OrderSortKey>
            options={ORDER_SORT_OPTIONS}
            currentSort={sortKey}
            onSortChange={setSortKey}
          />
        </div>
      )}

      {/* Content */}
      {error ? (
        <div className={`flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border p-12 text-center ${C.card}`}>
          <AlertCircle className="h-8 w-8 text-red-400" />
          <div className={`text-sm font-bold ${C.text}`}>{error}</div>
          <button onClick={() => load()} className="text-xs font-bold text-[#CCFF00] hover:underline">Retry</button>
        </div>
      ) : isLoading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title={`No ${statusTab === 'all' ? '' : statusTab} orders`}
          body="Orders from the buyer storefront appear here in real-time as customers checkout." />
      ) : (
        <>
          {/* Desktop table */}
          <div className={`hidden overflow-hidden rounded-2xl border md:block ${C.card}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[9px] font-black uppercase tracking-widest ${C.divider} ${C.th}`}>
                  <tr>
                    {['Order ID', 'Customer', 'Amount', 'Status', 'Tracking', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#1F2430]/60' : 'divide-gray-100'}`}>
                  {paged.map(o => (
                    <tr key={o.id} className={`transition ${C.row}`}>
                      <td className={`px-4 py-3 font-mono text-[10px] ${C.muted}`}>{o.id.slice(0, 12)}…</td>
                      <td className="px-4 py-3">
                        <div className={`font-bold ${C.text}`}>{o.customer_name || 'B2B Buyer'}</div>
                        <div className={`text-[10px] ${C.muted}`}>{o.customer_email || ''}</div>
                      </td>
                      <td className={`px-4 py-3 font-mono font-bold tabular-nums ${C.text}`}>{formatINR(Number(o.total_amount || 0))}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={o.delivery_status || 'pending'} variant={orderStatusVariant(o.delivery_status || 'pending')} />
                      </td>
                      <td className={`px-4 py-3 font-mono text-[10px] ${C.muted}`}>{o.tracking_number || '—'}</td>
                      <td className={`px-4 py-3 ${C.muted}`}>{formatDate(o.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { setSelectedOrder(o); setTrackingNum(o.tracking_number || ''); setCarrier(o.carrier || 'Delhivery Express'); }}
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                              (o.delivery_status || 'pending') !== 'delivered'
                                ? 'bg-black text-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.2)]'
                                : `border ${C.well} ${C.muted}`
                            }`}>
                            {(o.delivery_status || 'pending') === 'pending' ? 'Process' : 'Update'}
                          </button>
                          <button onClick={() => printPackingSlip(o)}
                            className={`rounded-full border px-2 py-1 text-[10px] font-bold transition ${C.well} ${C.muted} hover:text-neutral-900 dark:hover:text-white`}>
                            Slip
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {paged.map(o => (
              <div key={o.id} className={`rounded-2xl border p-4 ${C.card}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`font-mono text-[10px] ${C.muted}`}>{o.id.slice(0, 12)}…</div>
                    <div className={`text-sm font-bold mt-0.5 ${C.text}`}>{o.customer_name || 'B2B Buyer'}</div>
                    <div className={`font-mono text-base font-semibold tabular-nums mt-1 ${C.text}`}>{formatINR(Number(o.total_amount || 0))}</div>
                  </div>
                  <StatusBadge label={o.delivery_status || 'pending'} variant={orderStatusVariant(o.delivery_status || 'pending')} />
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setSelectedOrder(o); setTrackingNum(o.tracking_number || ''); setCarrier(o.carrier || 'Delhivery Express'); }}
                    className="flex-1 rounded-full bg-black py-2 text-[10px] font-black uppercase tracking-wider text-[#CCFF00]">
                    Manage
                  </button>
                  <button onClick={() => printPackingSlip(o)}
                    className={`rounded-full border px-4 py-2 text-[10px] font-bold ${C.well} ${C.muted}`}>
                    Slip
                  </button>
                </div>
              </div>
            ))}
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

      {/* ── Order Detail / Dispatch Drawer ── */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setSelectedOrder(null); }}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={SPRING}
              className={`flex h-full w-full max-w-md flex-col border-l shadow-2xl ${isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white'}`}>
              {/* Header */}
              <div className={`flex items-center justify-between border-b px-5 py-4 ${C.divider}`}>
                <div>
                  <StatusBadge label={selectedOrder.delivery_status || 'pending'} variant={orderStatusVariant(selectedOrder.delivery_status || 'pending')} />
                  <h2 className={`mt-1 text-base font-black tracking-tight ${C.text}`}>Order #{selectedOrder.id.slice(0, 8)}</h2>
                </div>
                <button onClick={() => setSelectedOrder(null)} className={`rounded-full border p-1.5 ${C.well} ${C.muted}`}>
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 space-y-6">
                {/* Buyer info */}
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-3 ${C.muted}`}>Buyer</div>
                  <div className={`rounded-xl border p-4 space-y-1 ${C.well}`}>
                    <div className={`font-bold ${C.text}`}>{selectedOrder.customer_name || 'B2B Buyer'}</div>
                    <div className={`text-xs ${C.muted}`}>{selectedOrder.customer_email || 'No email'}</div>
                    <div className={`font-mono text-sm font-semibold tabular-nums ${C.text}`}>{formatINR(Number(selectedOrder.total_amount || 0))}</div>
                  </div>
                </div>

                {/* Line items */}
                {(selectedOrder.items || []).length > 0 && (
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-3 ${C.muted}`}>Line Items</div>
                    <div className={`rounded-xl border overflow-hidden ${C.card}`}>
                      {(selectedOrder.items || []).map((item, i) => (
                        <div key={i} className={`flex items-center justify-between px-4 py-3 border-b last:border-0 ${C.divider}`}>
                          <div className={`text-xs font-bold ${C.text}`}>{item.name || item.productId}</div>
                          <div className={`text-xs font-mono tabular-nums ${C.muted}`}>×{item.qty} · {formatINR(item.price)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status stepper */}
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-3 ${C.muted}`}>Fulfillment Status</div>
                  <div className="flex items-center gap-1">
                    {FULFILLMENT_STEPS.map((step, i) => {
                      const cur = FULFILLMENT_STEPS.indexOf((selectedOrder.delivery_status || 'pending') as typeof FULFILLMENT_STEPS[number]);
                      const done   = i <= cur;
                      const active = i === cur;
                      return (
                        <React.Fragment key={step}>
                          <div className={`flex flex-col items-center gap-1 flex-1`}>
                            <div className={`h-5 w-5 rounded-full border-2 grid place-items-center transition ${
                              done
                                ? 'border-[#CCFF00] bg-[#CCFF00]'
                                : isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-white'
                            }`}>
                              {done && <Check size={10} className="text-black" />}
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${active ? 'text-[#CCFF00]' : C.muted}`}>
                              {step}
                            </span>
                          </div>
                          {i < FULFILLMENT_STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 rounded-full ${i < cur ? 'bg-[#CCFF00]' : isDark ? 'bg-[#1F2430]' : 'bg-gray-200'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Dispatch form */}
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-3 ${C.muted}`}>Logistics</div>
                  <div className="space-y-3">
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.muted}`}>Carrier</label>
                      <select value={carrier} onChange={e => setCarrier(e.target.value)}
                        className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition ${C.input}`}>
                        {['Delhivery Express', 'Blue Dart Corporate', 'DHL Worldwide', 'Shadowfax B2B Ultra', 'DTDC Priority', 'XpressBees'].map(c => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.muted}`}>AWB / Waybill Number</label>
                      <input type="text" placeholder="e.g. DEL-8849201948"
                        value={trackingNum} onChange={e => setTrackingNum(e.target.value)}
                        className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition ${C.input}`} />
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                {(selectedOrder.status_timeline || []).length > 0 && (
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-3 ${C.muted}`}>Event Timeline</div>
                    <div className="space-y-2">
                      {[...(selectedOrder.status_timeline || [])].reverse().map((event, i) => (
                        <div key={i} className={`flex items-start gap-3 rounded-xl border p-3 ${C.well}`}>
                          <div className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#CCFF00]" />
                          <div>
                            <div className={`text-xs font-bold capitalize ${C.text}`}>{event.status}</div>
                            {event.note && <div className={`text-[10px] mt-0.5 ${C.muted}`}>{event.note}</div>}
                            <div className={`text-[9px] mt-1 font-mono ${C.muted}`}>{new Date(event.timestamp).toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className={`flex items-center gap-2.5 border-t px-5 py-4 ${C.divider}`}>
                <button onClick={() => printPackingSlip(selectedOrder)}
                  className={`flex-1 rounded-full border py-2.5 text-xs font-bold uppercase tracking-wider transition ${C.well} ${C.muted} hover:text-neutral-900 dark:hover:text-white`}>
                  Print Slip
                </button>
                <button onClick={() => printShippingLabel(selectedOrder)}
                  className={`flex-1 rounded-full border py-2.5 text-xs font-bold uppercase tracking-wider transition ${C.well} ${C.muted} hover:text-neutral-900 dark:hover:text-white`}>
                  Print Label
                </button>
                <motion.button
                  whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                  onClick={handleDispatch} disabled={isSaving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-black py-2.5 text-xs font-black uppercase tracking-widest text-[#CCFF00] shadow-[0_0_16px_rgba(204,255,0,0.2)] disabled:opacity-50 transition"
                >
                  {isSaving && <Loader2 size={12} className="animate-spin" />}
                  <Truck size={12} /> Dispatch
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SellerShell>
  );
}
