import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, MessageSquare, Quote, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, getQuotes, respondToQuote, type Quote as QuoteType, type QuoteThreadMessage } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBadge, orderStatusVariant } from '@/components/seller/StatusBadge';
import { SkeletonTable } from '@/components/seller/SkeletonTable';
import { EmptyState } from '@/components/seller/EmptyState';
import SellerShell from './SellerShell';

const SPRING = { type: 'spring', stiffness: 300, damping: 25 } as const;
const FADE   = { duration: 0.2, ease: 'easeOut' } as const;

type QuoteStatusFilter = 'all' | 'requested' | 'responded' | 'negotiating' | 'accepted' | 'declined';

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function RFQPage() {
  const { isDark } = useTheme();
  const [quotes,      setQuotes]      = useState<QuoteType[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>('all');
  const [selected,    setSelected]    = useState<QuoteType | null>(null);
  const [replyPrice,  setReplyPrice]  = useState('');
  const [replyLead,   setReplyLead]   = useState('');
  const [replyMsg,    setReplyMsg]    = useState('');
  const [isSending,   setIsSending]   = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true); setError(null);
    try { setQuotes(await getQuotes()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('quotes-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const filtered = useMemo(() =>
    statusFilter === 'all' ? quotes : quotes.filter(q => q.status === statusFilter)
  , [quotes, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: quotes.length };
    quotes.forEach(q => { c[q.status] = (c[q.status] || 0) + 1; });
    return c;
  }, [quotes]);

  const handleRespond = async (action: 'responded' | 'accepted' | 'declined') => {
    if (!selected) return;
    setIsSending(true);
    try {
      const newMsg: QuoteThreadMessage = {
        sender: 'seller',
        message: replyMsg.trim() || (action === 'declined' ? 'We are unable to fulfil this request.' : `Quoted: ₹${replyPrice} · Lead time: ${replyLead}`),
        timestamp: new Date().toISOString(),
      };
      const existingThread = selected.thread || (selected as unknown as { history?: QuoteThreadMessage[] }).history || [];
      const thread = [...existingThread, newMsg];
      const patch = {
        status: action,
        thread,
        history: thread,
        ...(action === 'responded' && {
          seller_price: replyPrice ? parseFloat(replyPrice) : null,
          seller_lead_time: replyLead || null,
        })
      };
      const updated = await respondToQuote(selected.id, patch as Partial<QuoteType>);
      if (updated) {
        setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q));
        setSelected(updated);
      }
      setReplyMsg(''); setReplyPrice(''); setReplyLead('');
      toast.success(`Quote ${action}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setIsSending(false);
    }
  };

  const C = {
    card:   isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white',
    well:   isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-gray-50',
    text:   isDark ? 'text-white'  : 'text-gray-900',
    muted:  isDark ? 'text-neutral-500' : 'text-gray-400',
    input:  isDark ? 'border-[#1F2430] bg-[#12161F] text-white focus:border-[#CCFF00] placeholder:text-neutral-600' : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-[#CCFF00]',
    divider: isDark ? 'border-[#1F2430]' : 'border-gray-100',
  };

  return (
    <SellerShell title="RFQ / Quotes">
      {/* Header */}
      <div className="mb-6">
        <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${C.muted}`}>Buyer Quote Requests</div>
        <h1 className={`text-2xl font-black tracking-tight ${C.text}`}>RFQ Inbox</h1>
      </div>

      {/* Status tabs */}
      <div className={`mb-4 flex flex-wrap gap-1.5`}>
        {(['all','requested','responded','negotiating','accepted','declined'] as QuoteStatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
              statusFilter === s
                ? 'bg-[#CCFF00] text-black'
                : `border ${C.well} ${C.muted} hover:border-[#CCFF00]/30`
            }`}>
            {s}{counts[s] ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {/* Content */}
      {error ? (
        <div className={`flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border p-12 ${C.card}`}>
          <AlertCircle className="h-8 w-8 text-red-400" />
          <div className={`text-sm font-bold ${C.text}`}>{error}</div>
          <button onClick={load} className="text-xs font-bold text-[#CCFF00]">Retry</button>
        </div>
      ) : isLoading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Quote} title="No quote requests"
          body="Enterprise buyers can submit RFQs from the buyer storefront. Requests will appear here in real-time." />
      ) : (
        <div className="space-y-3">
          {filtered.map(q => {
            const isNew = q.status === 'requested';
            return (
              <motion.div key={q.id}
                whileHover={{ y: -1 }}
                onClick={() => setSelected(q)}
                className={`cursor-pointer rounded-2xl border p-4 transition ${C.card} ${isNew ? isDark ? 'border-[#CCFF00]/20' : 'border-[#CCFF00]/40' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-sm ${C.text}`}>{q.buyer_name || 'Anonymous Buyer'}</span>
                      {isNew && <span className="h-1.5 w-1.5 rounded-full bg-[#CCFF00] shadow-[0_0_6px_rgba(204,255,0,0.8)]" />}
                    </div>
                    <div className={`text-xs ${C.muted}`}>{q.buyer_email || 'No email'}</div>
                    <div className={`text-xs ${C.muted} line-clamp-1`}>{q.message || 'No message'}</div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {q.requested_qty && (
                        <span className={`text-[10px] font-bold ${C.muted}`}>Qty: {q.requested_qty}</span>
                      )}
                      <span className={`text-[10px] font-mono ${C.muted}`}>{formatDate(q.created_at)}</span>
                    </div>
                  </div>
                  <StatusBadge label={q.status} variant={orderStatusVariant(q.status)} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Quote Detail Drawer ── */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={SPRING}
              className={`flex h-full w-full max-w-md flex-col border-l shadow-2xl ${isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white'}`}>
              {/* Header */}
              <div className={`flex items-center justify-between border-b px-5 py-4 ${C.divider}`}>
                <div>
                  <StatusBadge label={selected.status} variant={orderStatusVariant(selected.status)} />
                  <h2 className={`mt-1 text-base font-black ${C.text}`}>{selected.buyer_name || 'RFQ'}</h2>
                  <div className={`text-[10px] font-mono ${C.muted}`}>{selected.buyer_email}</div>
                </div>
                <button onClick={() => setSelected(null)} className={`rounded-full border p-1.5 ${C.well} ${C.muted}`}>
                  <X size={14} />
                </button>
              </div>

              {/* Request details */}
              <div className={`border-b px-5 py-4 space-y-2 ${C.divider}`}>
                <div className={`rounded-xl border p-4 space-y-2 ${C.well}`}>
                  {selected.requested_qty && (
                    <div className="flex justify-between text-xs">
                      <span className={C.muted}>Requested Qty</span>
                      <span className={`font-bold tabular-nums ${C.text}`}>{selected.requested_qty} units</span>
                    </div>
                  )}
                  {selected.seller_price && (
                    <div className="flex justify-between text-xs">
                      <span className={C.muted}>Your Quote</span>
                      <span className="font-bold text-[#CCFF00]">₹{selected.seller_price}</span>
                    </div>
                  )}
                  {selected.seller_lead_time && (
                    <div className="flex justify-between text-xs">
                      <span className={C.muted}>Lead Time</span>
                      <span className={`font-bold ${C.text}`}>{selected.seller_lead_time}</span>
                    </div>
                  )}
                  <div className={`text-xs leading-relaxed ${C.muted}`}>{selected.message || 'No message'}</div>
                </div>
              </div>

              {/* Thread */}
              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
                {((selected.thread || (selected as unknown as { history?: QuoteThreadMessage[] }).history || [])).length === 0 && (
                  <div className={`text-center text-xs py-8 ${C.muted}`}>No conversation yet</div>
                )}
                {((selected.thread || (selected as unknown as { history?: QuoteThreadMessage[] }).history || [])).map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'seller' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.sender === 'seller'
                        ? 'bg-black text-[#CCFF00] rounded-br-sm'
                        : isDark ? 'bg-[#12161F] text-white rounded-bl-sm border border-[#1F2430]' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}>
                      {msg.message}
                      <div className={`mt-1 text-[9px] ${msg.sender === 'seller' ? 'text-[#CCFF00]/60' : C.muted}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Response form */}
              {['requested', 'negotiating'].includes(selected.status) && (
                <div className={`border-t px-5 py-4 space-y-3 ${C.divider}`}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.muted}`}>Quote Price (₹)</label>
                      <input type="number" placeholder="1499" value={replyPrice} onChange={e => setReplyPrice(e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-mono outline-none transition ${C.input}`} />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.muted}`}>Lead Time</label>
                      <input type="text" placeholder="5–7 business days" value={replyLead} onChange={e => setReplyLead(e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2 text-xs outline-none transition ${C.input}`} />
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 rounded-2xl border p-1.5 ${C.well}`}>
                    <input type="text" placeholder="Add a message…" value={replyMsg} onChange={e => setReplyMsg(e.target.value)}
                      className={`flex-1 bg-transparent px-2 text-xs outline-none ${isDark ? 'text-white placeholder:text-neutral-600' : 'text-gray-900 placeholder:text-gray-400'}`}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRespond('responded'); } }} />
                    <button onClick={() => handleRespond('responded')} disabled={isSending}
                      className="grid h-8 w-8 place-items-center rounded-xl bg-black text-[#CCFF00] disabled:opacity-50">
                      {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRespond('accepted')}
                      className="flex-1 rounded-full border border-green-500/30 bg-green-500/10 py-2 text-[10px] font-black uppercase tracking-wider text-green-400">
                      Accept
                    </button>
                    <button onClick={() => handleRespond('declined')}
                      className="flex-1 rounded-full border border-red-500/30 bg-red-500/10 py-2 text-[10px] font-black uppercase tracking-wider text-red-400">
                      Decline
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SellerShell>
  );
}
