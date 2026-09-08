import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Check, Loader2, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { getReturns, updateReturn, insertLedgerEntry, type Return } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBadge } from '@/components/seller/StatusBadge';
import { SkeletonTable } from '@/components/seller/SkeletonTable';
import { EmptyState } from '@/components/seller/EmptyState';
import { ConfirmModal } from '@/components/seller/ConfirmModal';
import SellerShell from './SellerShell';

const SPRING = { type: 'spring', stiffness: 300, damping: 25 } as const;

function returnVariant(status: string) {
  if (status === 'approved' || status === 'refunded') return 'success' as const;
  if (status === 'requested')  return 'warning' as const;
  if (status === 'rejected')   return 'danger'  as const;
  return 'default' as const;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function ReturnsPage() {
  const { isDark } = useTheme();
  const [returns,      setReturns]      = useState<Return[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [selected,     setSelected]     = useState<Return | null>(null);
  const [restockFee,   setRestockFee]   = useState('');
  const [isSaving,     setIsSaving]     = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | { action: 'approved' | 'rejected' | 'refunded'; label: string }>(null);

  const load = useCallback(async () => {
    setIsLoading(true); setError(null);
    try { setReturns(await getReturns()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action: Return['status']) => {
    if (!selected) return;
    setIsSaving(true);
    setConfirmAction(null);
    try {
      const fee = action === 'refunded' ? parseFloat(restockFee) || 0 : selected.restocking_fee;
      const patch: Partial<Return> = { status: action, restocking_fee: fee };
      await updateReturn(selected.id, patch);

      // If refunded, write a ledger entry
      if (action === 'refunded' && selected.order_id) {
        await insertLedgerEntry({ order_id: selected.order_id, type: 'refund', amount: -(fee) });
      }

      setReturns(prev => prev.map(r => r.id === selected.id ? { ...r, ...patch } : r));
      setSelected(s => s ? { ...s, ...patch } : s);
      toast.success(`Return ${action}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setIsSaving(false);
    }
  };

  const C = {
    card:   isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white',
    well:   isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-gray-50',
    text:   isDark ? 'text-white'  : 'text-gray-900',
    muted:  isDark ? 'text-neutral-500' : 'text-gray-400',
    input:  isDark ? 'border-[#1F2430] bg-[#12161F] text-white focus:border-[#CCFF00]' : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-[#CCFF00]',
    divider: isDark ? 'border-[#1F2430]' : 'border-gray-100',
  };

  return (
    <SellerShell title="Returns">
      <div className="mb-6">
        <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${C.muted}`}>Return & Refund Center</div>
        <h1 className={`text-2xl font-black tracking-tight ${C.text}`}>Returns</h1>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-3 grid-cols-1 sm:grid-cols-3">
        {[
          { label: 'Total Returns', value: returns.length, color: C.text },
          { label: 'Pending',    value: returns.filter(r => r.status === 'requested').length, color: 'text-amber-400' },
          { label: 'Refunded',   value: returns.filter(r => r.status === 'refunded').length, color: 'text-green-400' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 ${C.card}`}>
            <div className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>{k.label}</div>
            <div className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {error ? (
        <div className={`flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border p-12 ${C.card}`}>
          <AlertCircle className="h-8 w-8 text-red-400" />
          <button onClick={load} className="text-xs font-bold text-[#CCFF00]">Retry</button>
        </div>
      ) : isLoading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : returns.length === 0 ? (
        <EmptyState icon={RotateCcw} title="No returns yet" body="Return requests from buyers will appear here for your review and action." />
      ) : (
        <div className="space-y-3">
          {returns.map(r => (
            <motion.div key={r.id} whileHover={{ y: -1 }}
              onClick={() => { setSelected(r); setRestockFee(String(r.restocking_fee || '')); }}
              className={`cursor-pointer rounded-2xl border p-4 transition ${C.card} ${r.status === 'requested' ? isDark ? 'border-amber-500/20' : 'border-amber-200' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className={`font-mono text-[10px] ${C.muted}`}>{r.order_id ? `Order #${r.order_id.slice(0, 8)}` : 'No order linked'}</div>
                  <div className={`text-xs leading-relaxed ${C.muted}`}>{r.reason || 'No reason provided'}</div>
                  {r.restocking_fee > 0 && (
                    <div className={`text-[10px] font-bold text-amber-400`}>Restocking fee: ₹{r.restocking_fee}</div>
                  )}
                  <div className={`text-[10px] font-mono ${C.muted}`}>{formatDate(r.created_at)}</div>
                </div>
                <StatusBadge label={r.status} variant={returnVariant(r.status)} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Return detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={SPRING}
              className={`flex h-full w-full max-w-md flex-col border-l shadow-2xl ${isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white'}`}>
              <div className={`flex items-center justify-between border-b px-5 py-4 ${C.divider}`}>
                <div>
                  <StatusBadge label={selected.status} variant={returnVariant(selected.status)} />
                  <h2 className={`mt-1 text-base font-black ${C.text}`}>Return Request</h2>
                </div>
                <button onClick={() => setSelected(null)} className={`rounded-full border p-1.5 ${C.well} ${C.muted}`}>
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 space-y-5">
                <div className={`rounded-xl border p-4 space-y-2 ${C.well}`}>
                  <div className="flex justify-between text-xs">
                    <span className={C.muted}>Order ID</span>
                    <span className={`font-mono font-bold ${C.text}`}>{selected.order_id?.slice(0, 12) || 'N/A'}…</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={C.muted}>Requested</span>
                    <span className={C.text}>{formatDate(selected.created_at)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={C.muted}>Status</span>
                    <StatusBadge label={selected.status} variant={returnVariant(selected.status)} />
                  </div>
                </div>

                <div>
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${C.muted}`}>Return Reason</div>
                  <div className={`rounded-xl border p-4 text-xs leading-relaxed ${C.well} ${C.text}`}>
                    {selected.reason || 'No reason provided by buyer.'}
                  </div>
                </div>

                {selected.status === 'requested' && (
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.muted}`}>
                      Restocking Fee (₹)
                    </label>
                    <input type="number" min="0" placeholder="0"
                      value={restockFee} onChange={e => setRestockFee(e.target.value)}
                      className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono outline-none transition ${C.input}`} />
                    <div className={`mt-1.5 text-[10px] ${C.muted}`}>Leave 0 for a full refund.</div>
                  </div>
                )}
              </div>

              {selected.status === 'requested' && (
                <div className={`flex items-center gap-2.5 border-t px-5 py-4 ${C.divider}`}>
                  <button onClick={() => setConfirmAction({ action: 'rejected', label: 'Reject Return' })} disabled={isSaving}
                    className="flex-1 rounded-full border border-red-500/30 bg-red-500/10 py-2.5 text-[10px] font-black uppercase tracking-wider text-red-400">
                    Reject
                  </button>
                  <button onClick={() => setConfirmAction({ action: 'approved', label: 'Approve Return' })} disabled={isSaving}
                    className="flex-1 rounded-full border border-blue-500/30 bg-blue-500/10 py-2.5 text-[10px] font-black uppercase tracking-wider text-blue-400">
                    Approve
                  </button>
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => setConfirmAction({ action: 'refunded', label: 'Process Refund' })} disabled={isSaving}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-black py-2.5 text-[10px] font-black uppercase tracking-wider text-[#CCFF00] shadow-[0_0_12px_rgba(204,255,0,0.2)] disabled:opacity-50">
                    {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Refund
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm modals */}
      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.label || ''}
        body={confirmAction?.action === 'refunded'
          ? `Process refund${parseFloat(restockFee) > 0 ? ` with ₹${restockFee} restocking fee` : ' (full)'} and mark as refunded.`
          : `Are you sure you want to ${confirmAction?.action === 'approved' ? 'approve' : 'reject'} this return?`}
        confirmLabel={confirmAction?.label || 'Confirm'}
        danger={confirmAction?.action === 'rejected'}
        onConfirm={() => { if (confirmAction) handleAction(confirmAction.action); }}
        onCancel={() => setConfirmAction(null)}
      />
    </SellerShell>
  );
}
