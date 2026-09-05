import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Download, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { getPayouts, getLedgerEntries, type Payout, type LedgerEntry } from '@/lib/supabase';
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
  if (status === 'paid')   return 'success' as const;
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
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const [activeTab,    setActiveTab]    = useState<'payouts' | 'ledger'>('ledger');

  const load = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [p, l] = await Promise.all([getPayouts(), getLedgerEntries()]);
      setPayouts(p); setLedger(l);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredLedger = useMemo(() =>
    ledgerFilter === 'all' ? ledger : ledger.filter(e => e.type === ledgerFilter)
  , [ledger, ledgerFilter]);

  const totals = useMemo(() => {
    const sales   = ledger.filter(e => e.type === 'sale').reduce((a, e) => a + e.amount, 0);
    const fees    = ledger.filter(e => e.type === 'fee').reduce((a, e) => a + e.amount, 0);
    const refunds = ledger.filter(e => e.type === 'refund').reduce((a, e) => a + Math.abs(e.amount), 0);
    const paid    = payouts.filter(p => p.status === 'paid').reduce((a, p) => a + p.amount, 0);
    return { sales, fees, refunds, paid, available: sales - fees - refunds - paid };
  }, [ledger, payouts]);

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
    card:    isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white',
    well:    isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-gray-50',
    text:    isDark ? 'text-white'  : 'text-gray-900',
    muted:   isDark ? 'text-neutral-500' : 'text-gray-400',
    th:      isDark ? 'text-neutral-500 bg-[#12161F]' : 'text-gray-400 bg-gray-50',
    divider: isDark ? 'border-[#1F2430]' : 'border-gray-100',
  };

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

      {/* Balance cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Available Balance', value: totals.available, color: 'text-[#CCFF00]', glow: true },
          { label: 'Total Sales',       value: totals.sales,     color: C.text           },
          { label: 'Fees & Taxes',      value: totals.fees,      color: 'text-amber-400' },
          { label: 'Total Refunds',     value: totals.refunds,   color: 'text-red-400'   },
        ].map(card => (
          <div key={card.label}
            className={`rounded-2xl border p-5 ${C.card} ${card.glow ? 'border-[#CCFF00]/20 bg-[#CCFF00]/5' : ''}`}
          >
            <div className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>{card.label}</div>
            <div className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${card.color} ${card.glow ? 'text-shadow-[0_0_20px_rgba(204,255,0,0.4)]' : ''}`}>
              {formatINR(card.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className={`mb-4 flex gap-1.5 border-b pb-3 ${C.divider}`}>
        {[
          { id: 'ledger',  label: 'Transaction Ledger' },
          { id: 'payouts', label: 'Payout History' },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id as 'ledger' | 'payouts')}
            className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
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
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(['all', 'sale', 'fee', 'refund', 'tax'] as LedgerFilter[]).map(f => (
              <button key={f} onClick={() => setLedgerFilter(f)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
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
              <div className="overflow-x-auto">
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
            <div className="overflow-x-auto">
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
