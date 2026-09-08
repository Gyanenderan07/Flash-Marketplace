import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Download, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import {
  supabase, getPayouts, getLedgerEntries, getExtendedOrders,
  type Payout, type LedgerEntry, type OrderExtended
} from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBadge } from '@/components/seller/StatusBadge';
import { SkeletonTable } from '@/components/seller/SkeletonTable';
import { EmptyState } from '@/components/seller/EmptyState';
import SellerShell from './SellerShell';

type LedgerFilter = 'all' | 'sale' | 'fee' | 'refund' | 'tax';

function formatINR(v: number) {
  return '₹' + Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function payoutVariant(status: string) {
  if (status === 'paid' || status === 'completed') return 'success' as const;
  if (status === 'failed') return 'danger'  as const;
  return 'warning' as const;
}

function ledgerSign(type: string) {
  return ['fee', 'refund', 'tax'].includes(type) ? -1 : 1;
}

export default function PayoutsPage() {
  const { isDark } = useTheme();
  const [payouts,      setPayouts]      = useState<Payout[]>([]);
  const [ledger,       setLedger]       = useState<LedgerEntry[]>([]);
  const [orders,       setOrders]       = useState<OrderExtended[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const [activeTab,    setActiveTab]    = useState<'payouts' | 'ledger'>('ledger');

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [p, l, o] = await Promise.all([getPayouts(), getLedgerEntries(), getExtendedOrders()]);
      setPayouts(p || []);
      setLedger(l || []);
      setOrders(o || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load payouts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('payouts-ledger-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payouts' }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, () => load(true))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const filteredLedger = useMemo(() =>
    ledgerFilter === 'all' ? ledger : ledger.filter(e => e.type === ledgerFilter)
  , [ledger, ledgerFilter]);

  const totals = useMemo(() => {
    const rawSales = ledger.filter(e => e.type === 'sale').reduce((a, e) => a + e.amount, 0);
    // If ledger has no sales yet, derive sales from completed orders
    const orderSales = orders.reduce((a, o) => a + (Number(o.total_amount) || 0), 0);
    const sales = rawSales > 0 ? rawSales : orderSales;

    const fees = ledger.filter(e => e.type === 'fee').reduce((a, e) => a + e.amount, 0);
    const refunds = ledger.filter(e => e.type === 'refund').reduce((a, e) => a + Math.abs(e.amount), 0);
    const paid = payouts
      .filter(p => p.status === 'paid' || (p.status as string) === 'completed')
      .reduce((a, p) => a + Number(p.amount || 0), 0);
    const standardFee = fees > 0 ? fees : Math.round(sales * 0.08);
    const net = Math.max(0, sales - standardFee - refunds - paid);
    // Escrow is 20% of net or pending clearance reserve
    const escrow = Math.round(net * 0.20);
    const available = Math.max(0, net - escrow);

    return { sales, fees: standardFee, refunds, paid, net, escrow, available, standardFee };
  }, [ledger, payouts, orders]);

  const exportPayoutCSV = () => {
    const csv = [
      ['ID', 'Amount', 'Status', 'Period Start', 'Period End', 'Date'],
      ...payouts.map(p => [p.id, p.amount, p.status, p.period_start || '', p.period_end || '', p.created_at])
    ].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: 'flash-payouts.csv'
    });
    a.click(); toast.success('Payout statement exported');
  };

  const C = {
    card:    isDark ? 'border-neutral-800/80 bg-[#0D1117]' : 'border-neutral-200/90 bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06),0_2px_6px_-1px_rgba(0,0,0,0.03)]',
    well:    isDark ? 'border-neutral-800 bg-[#12161F]' : 'border-neutral-200 bg-neutral-50/90',
    text:    isDark ? 'text-white'  : 'text-gray-900',
    muted:   isDark ? 'text-neutral-500' : 'text-gray-400',
    th:      isDark ? 'text-neutral-300 bg-[#14171F]' : 'text-neutral-700 bg-neutral-100',
    divider: isDark ? 'border-[#1F2430]' : 'border-gray-100',
  };

  const totalBalance = (totals.available + totals.escrow) || 1;
  const availablePct = Math.round((totals.available / totalBalance) * 100);
  const escrowPct = 100 - availablePct;

  return (
    <SellerShell title="Payouts">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${C.muted}`}>Financial Overview</div>
          <h1 className={`text-2xl font-black tracking-tight ${C.text}`}>Payments & Payouts</h1>
        </div>
        <button onClick={exportPayoutCSV}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${C.well} ${C.muted} hover:text-[#CCFF00]`}>
          <Download size={13} /> Export Statement
        </button>
      </div>

      {/* Balance meter & Key Metrics */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {/* Dynamic Available vs. Escrow Balance Meter */}
        <div className={`lg:col-span-2 rounded-2xl border p-6 ${C.card} border-[#CCFF00]/20`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>Settlement Allocation Meter</span>
            <span className="text-[10px] font-mono font-bold text-[#CCFF00] bg-[#CCFF00]/10 px-2 py-0.5 rounded-full">T+2 Rolling Settlement</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className={`text-xs ${C.muted}`}>Available for Transfer</div>
              <div className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-[#CCFF00] tabular-nums">
                {formatINR(totals.available)}
              </div>
              <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{availablePct}% of cleared capital</div>
            </div>
            <div>
              <div className={`text-xs ${C.muted}`}>Escrow Hold Reserve</div>
              <div className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums">
                {formatINR(totals.escrow)}
              </div>
              <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{escrowPct}% held in delivery audit</div>
            </div>
          </div>

          {/* Visual Gauge Bar */}
          <div className="mt-5">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800 flex">
              <div
                className="h-full bg-[#CCFF00] transition-all duration-700 shadow-[0_0_12px_rgba(204,255,0,0.5)]"
                style={{ width: `${availablePct}%` }}
              />
              <div
                className="h-full bg-amber-400 transition-all duration-700"
                style={{ width: `${escrowPct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-mono text-neutral-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#CCFF00]" /> Cleared Available</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Escrow Security (Fulfillment Hold)</span>
            </div>
          </div>
        </div>

        {/* 8% Marketplace Transaction Fee Breakdown Card */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between ${C.card}`}>
          <div>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>Marketplace Take Rate</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-white">8.0% Flat</span>
            </div>
            <div className="mt-3">
              <div className={`text-xs ${C.muted}`}>Standard B2B Fee (8%)</div>
              <div className="mt-1 font-mono text-2xl font-bold text-neutral-200 tabular-nums">
                {formatINR(totals.standardFee)}
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-400">
              Covers enterprise buyer escrow, B2B net-terms financing, payment gateway processing, and live GST tax settlement.
            </p>
          </div>
          <div className={`mt-4 pt-3 border-t text-[11px] font-mono flex justify-between ${C.divider}`}>
            <span className={C.muted}>Lifetime Net Payouts:</span>
            <span className="font-bold text-white tabular-nums">{formatINR(totals.paid)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`mb-4 flex overflow-x-auto horizontal-scroll-rail gap-1.5 border-b pb-3 ${C.divider}`}>
        {[
          { id: 'ledger',  label: 'Transaction Ledger' },
          { id: 'payouts', label: 'Payout History' },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id as 'ledger' | 'payouts')}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
              activeTab === tab.id
                ? 'bg-[#CCFF00] text-black'
                : `border ${C.well} ${C.muted} hover:border-[#CCFF00]/30`
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className={`flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border p-12 ${C.card}`}>
          <AlertCircle className="h-8 w-8 text-red-400" />
          <button onClick={load} className="text-xs font-bold text-[#CCFF00]">Retry</button>
        </div>
      ) : isLoading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : activeTab === 'ledger' ? (
        <>
          {/* Ledger type filter */}
          <div className="mb-4 flex overflow-x-auto horizontal-scroll-rail pb-1 gap-1.5">
            {(['all', 'sale', 'fee', 'refund', 'tax'] as LedgerFilter[]).map(f => (
              <button key={f} onClick={() => setLedgerFilter(f)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
                  ledgerFilter === f ? 'bg-[#CCFF00] text-black' : `border ${C.well} ${C.muted}`
                }`}>
                {f}
              </button>
            ))}
          </div>

          {filteredLedger.length === 0 ? (
            <EmptyState icon={Wallet} title="No transactions" body="Ledger entries will appear as orders are placed and processed." />
          ) : (
            <div className={`overflow-hidden rounded-2xl border ${C.card}`}>
              <div className="overflow-x-auto horizontal-scroll-rail">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b text-[9px] font-black uppercase tracking-widest ${C.divider} ${C.th}`}>
                    <tr>
                      {['Type', 'Amount', 'Order ID', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-[#1F2430]/60' : 'divide-gray-100'}`}>
                    {filteredLedger.map(e => {
                      const sign = ledgerSign(e.type);
                      return (
                        <tr key={e.id} className={isDark ? 'hover:bg-[#12161F]/70' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3">
                            <StatusBadge
                              label={e.type}
                              variant={e.type === 'sale' ? 'success' : e.type === 'refund' ? 'danger' : e.type === 'fee' ? 'warning' : 'default'}
                            />
                          </td>
                          <td className={`px-4 py-3 font-mono font-bold tabular-nums ${sign > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {sign > 0 ? '+' : '–'}{formatINR(e.amount)}
                          </td>
                          <td className={`px-4 py-3 font-mono text-[10px] ${C.muted}`}>{e.order_id?.slice(0, 12) || '—'}…</td>
                          <td className={`px-4 py-3 ${C.muted}`}>{formatDate(e.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        // Payouts table
        payouts.length === 0 ? (
          <EmptyState icon={Wallet} title="No payout history" body="Payouts will appear here once your balance is settled by the Flash finance team." />
        ) : (
          <div className={`overflow-hidden rounded-2xl border ${C.card}`}>
            <div className="overflow-x-auto horizontal-scroll-rail">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[9px] font-black uppercase tracking-widest ${C.divider} ${C.th}`}>
                  <tr>
                    {['Amount', 'Status', 'Period', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-[#1F2430]/60' : 'divide-gray-100'}`}>
                  {payouts.map(p => (
                    <tr key={p.id} className={isDark ? 'hover:bg-[#12161F]/70' : 'hover:bg-gray-50'}>
                      <td className={`px-4 py-3 font-mono text-base font-bold tabular-nums ${C.text}`}>{formatINR(p.amount)}</td>
                      <td className="px-4 py-3"><StatusBadge label={p.status} variant={payoutVariant(p.status)} /></td>
                      <td className={`px-4 py-3 text-[10px] ${C.muted}`}>
                        {p.period_start && p.period_end ? `${formatDate(p.period_start)} – ${formatDate(p.period_end)}` : '—'}
                      </td>
                      <td className={`px-4 py-3 ${C.muted}`}>{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </SellerShell>
  );
}
