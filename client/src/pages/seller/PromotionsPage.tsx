import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Layers, Loader2, PercentSquare, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPromotions, insertPromotion, togglePromotion, deletePromotion,
  getExtendedCatalog, getPriceTiers, upsertPriceTiers,
  type Promotion, type ProductExtended, type ProductPriceTier
} from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBadge } from '@/components/seller/StatusBadge';
import { SkeletonTable } from '@/components/seller/SkeletonTable';
import { EmptyState } from '@/components/seller/EmptyState';
import { ConfirmModal } from '@/components/seller/ConfirmModal';
import { TieredPricingTable } from '@/components/seller/TieredPricingTable';
import SellerShell from './SellerShell';

const SPRING = { type: 'spring', stiffness: 300, damping: 25 } as const;

function formatDate(s: string | null) {
  if (!s) return 'No expiry';
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

type PromoSubTab = 'coupons' | 'volume_tiers';

export default function PromotionsPage() {
  const { isDark } = useTheme();
  const [subTab,       setSubTab]       = useState<PromoSubTab>('coupons');
  const [promos,       setPromos]       = useState<Promotion[]>([]);
  const [products,     setProducts]     = useState<ProductExtended[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [formOpen,     setFormOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [saving,       setSaving]       = useState(false);

  // Promo coupon fields
  const [code,     setCode]     = useState('');
  const [type,     setType]     = useState<'percentage' | 'flat'>('percentage');
  const [value,    setValue]    = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [expiry,   setExpiry]   = useState('');

  // Volume rule builder fields
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [ruleTiers, setRuleTiers] = useState<Array<{ min_qty: number; unit_price: number }>>([
    { min_qty: 10, unit_price: 1350 },
    { min_qty: 50, unit_price: 1200 },
    { min_qty: 100, unit_price: 999 },
  ]);
  const [isSavingTiers, setIsSavingTiers] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [promoData, catalogData] = await Promise.all([
        getPromotions(),
        getExtendedCatalog(),
      ]);
      setPromos(promoData);
      setProducts(catalogData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load product-specific tiers when switching selected product
  useEffect(() => {
    if (selectedProductId !== 'all') {
      getPriceTiers(selectedProductId).then(tiers => {
        if (tiers.length > 0) {
          setRuleTiers(tiers.map(t => ({ min_qty: t.min_qty, unit_price: t.unit_price })));
        }
      });
    }
  }, [selectedProductId]);

  const handleCreate = async () => {
    if (!code.trim() || !value) { toast.error('Code and discount value are required'); return; }
    setSaving(true);
    try {
      const promo = await insertPromotion({
        code: code.trim().toUpperCase(),
        discount_type: type,
        discount_value: parseFloat(value),
        min_spend: parseFloat(minSpend) || 0,
        expires_at: expiry || null,
        active: true,
      });
      setPromos(prev => [promo, ...prev]);
      setFormOpen(false);
      setCode(''); setValue(''); setMinSpend(''); setExpiry('');
      toast.success(`Promo code ${promo.code} created`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (promo: Promotion) => {
    const next = !promo.active;
    setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, active: next } : p));
    try {
      await togglePromotion(promo.id, next);
      toast.success(`${promo.code} ${next ? 'activated' : 'deactivated'}`);
    } catch {
      load();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setPromos(prev => prev.filter(p => p.id !== deleteTarget.id));
    setDeleteTarget(null);
    try {
      await deletePromotion(deleteTarget.id);
      toast.success(`${deleteTarget.code} deleted`);
    } catch {
      toast.error('Delete failed');
      load();
    }
  };

  const handleSaveTiers = async () => {
    setIsSavingTiers(true);
    try {
      if (selectedProductId === 'all') {
        // Apply across catalog
        await Promise.all(products.map(p => upsertPriceTiers(p.id, ruleTiers)));
        toast.success(`Catalog-wide volume discount rules applied to ${products.length} products`);
      } else {
        await upsertPriceTiers(selectedProductId, ruleTiers);
        const prod = products.find(p => p.id === selectedProductId);
        toast.success(`Volume discount tiers updated for ${prod?.name || 'product'}`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save rules');
    } finally {
      setIsSavingTiers(false);
    }
  };

  const C = {
    card:    isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white',
    well:    isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-gray-50',
    text:    isDark ? 'text-white'  : 'text-gray-900',
    muted:   isDark ? 'text-neutral-500' : 'text-gray-400',
    input:   isDark ? 'border-[#1F2430] bg-[#12161F] text-white focus:border-[#CCFF00] placeholder:text-neutral-600' : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-[#CCFF00]',
    divider: isDark ? 'border-[#1F2430]' : 'border-gray-100',
  };

  return (
    <SellerShell title="Promotions">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${C.muted}`}>Discount & B2B Pricing</div>
          <h1 className={`text-2xl font-black tracking-tight ${C.text}`}>Promotions & Tiered Rules</h1>
        </div>
        {subTab === 'coupons' && (
          <motion.button
            whileHover={{ y: -1, boxShadow: '0 0 20px rgba(204,255,0,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setFormOpen(f => !f)}
            className="inline-flex items-center gap-2 rounded-full bg-[#CCFF00] text-black font-extrabold px-5 py-2 text-xs uppercase tracking-widest shadow-[0_0_16px_rgba(204,255,0,0.25)] hover:shadow-[0_0_24px_rgba(204,255,0,0.4)] transition"
          >
            <Plus size={13} /> New Promo Code
          </motion.button>
        )}
      </div>

      {/* Sub-nav Tabs */}
      <div className="mb-6 flex items-center gap-2 border-b border-neutral-200 dark:border-[#1F2430] pb-2">
        <button
          onClick={() => setSubTab('coupons')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
            subTab === 'coupons'
              ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.25)]'
              : `${C.muted} hover:text-neutral-900 dark:hover:text-white`
          }`}
        >
          <PercentSquare size={13} /> Promo Codes ({promos.length})
        </button>
        <button
          onClick={() => setSubTab('volume_tiers')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
            subTab === 'volume_tiers'
              ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.25)]'
              : `${C.muted} hover:text-neutral-900 dark:hover:text-white`
          }`}
        >
          <Layers size={13} /> Volume Discount Rule Builder
        </button>
      </div>

      {subTab === 'coupons' ? (
        <>
          {/* Create form */}
          {formOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className={`mb-6 rounded-2xl border p-5 space-y-4 ${C.card}`}>
              <div className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>New Promotion Code</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.muted}`}>Code</label>
                  <input type="text" placeholder="FLASHB2B20" value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono uppercase tracking-widest outline-none transition ${C.input}`} />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.muted}`}>Discount Type</label>
                  <div className="flex gap-2">
                    {(['percentage', 'flat'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setType(t)}
                        className={`flex-1 rounded-full py-2.5 text-[10px] font-black uppercase tracking-wider transition ${
                          type === t ? 'bg-[#CCFF00] text-black' : `border ${C.well} ${C.muted}`
                        }`}>
                        {t === 'percentage' ? '% Off' : '₹ Flat'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.muted}`}>
                    Value ({type === 'percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" min="0" placeholder={type === 'percentage' ? '15' : '500'}
                    value={value} onChange={e => setValue(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono outline-none transition ${C.input}`} />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.muted}`}>Min Spend (₹)</label>
                  <input type="number" min="0" placeholder="5000"
                    value={minSpend} onChange={e => setMinSpend(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs font-mono outline-none transition ${C.input}`} />
                </div>
                <div className="sm:col-span-2">
                  <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.muted}`}>Expiry Date</label>
                  <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition ${C.input}`} />
                </div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button onClick={() => setFormOpen(false)}
                  className={`rounded-full border px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${C.well} ${C.muted}`}>
                  Cancel
                </button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleCreate} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[#CCFF00] shadow-[0_0_16px_rgba(204,255,0,0.2)] disabled:opacity-50">
                  {saving && <Loader2 size={11} className="animate-spin" />} Create Code
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* List */}
          {error ? (
            <div className={`flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border p-12 ${C.card}`}>
              <AlertCircle className="h-8 w-8 text-red-400" />
              <button onClick={load} className="text-xs font-bold text-[#CCFF00]">Retry</button>
            </div>
          ) : isLoading ? (
            <SkeletonTable rows={4} cols={4} />
          ) : promos.length === 0 ? (
            <EmptyState icon={PercentSquare} title="No promo codes yet"
              body="Create discount codes to run flash sales, B2B bulk discounts, or seasonal promotions."
              actionLabel="+ Create First Code" onAction={() => setFormOpen(true)} />
          ) : (
            <div className="space-y-3">
              {promos.map(p => (
                <div key={p.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${C.card} ${p.active ? '' : isDark ? 'opacity-60' : 'opacity-50'}`}>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono text-base font-black tracking-widest ${C.text}`}>{p.code}</span>
                      <StatusBadge label={p.active ? 'Active' : 'Inactive'} variant={p.active ? 'success' : 'default'} />
                    </div>
                    <div className={`text-xs ${C.muted}`}>
                      {p.discount_type === 'percentage' ? `${p.discount_value}% off` : `₹${p.discount_value} flat`}
                      {p.min_spend > 0 ? ` · Min spend ₹${p.min_spend}` : ''}
                      {' · '}Expires: {formatDate(p.expires_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Toggle switch */}
                    <button onClick={() => handleToggle(p)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.active ? 'bg-[#CCFF00]' : isDark ? 'bg-[#1F2430]' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${p.active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <button onClick={() => setDeleteTarget(p)}
                      className={`rounded-full border p-1.5 transition ${C.well} ${C.muted} hover:border-red-500/50 hover:text-red-400`}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Volume Discount Tier Builder Tab */
        <div className={`rounded-2xl border p-6 space-y-6 ${C.card}`}>
          <div>
            <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${C.muted}`}>Tiered Wholesale Matrix</div>
            <h2 className={`text-lg font-black ${C.text}`}>Volume Discount Rule Builder</h2>
            <p className={`text-xs mt-1 ${C.muted}`}>
              Configure multi-tier wholesale pricing breaks that automatically apply at checkout when buyers meet MOQ thresholds.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.muted}`}>Target Scope</label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className={`w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition ${C.input}`}
              >
                <option value="all">Catalog-wide (Apply to all products)</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku || 'No SKU'} — ₹{p.price})
                  </option>
                ))}
              </select>
            </div>
            <div className={`rounded-xl border p-4 ${C.well}`}>
              <div className="text-[10px] font-bold text-[#CCFF00] uppercase tracking-wider">Active Rule Preview</div>
              <div className={`text-xs mt-1 ${C.text}`}>
                {selectedProductId === 'all'
                  ? `Rules will sync across all ${products.length} catalog items.`
                  : `Rules targeted specifically to "${products.find(p => p.id === selectedProductId)?.name || 'selected item'}".`}
              </div>
            </div>
          </div>

          <div>
            <div className={`text-[10px] font-black uppercase tracking-widest mb-3 ${C.muted}`}>Quantity Break Tiers</div>
            <TieredPricingTable tiers={ruleTiers} onChange={setRuleTiers} />
          </div>

          <div className="pt-2 flex justify-end">
            <motion.button
              whileHover={{ y: -1, boxShadow: '0 0 20px rgba(204,255,0,0.35)' }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveTiers}
              disabled={isSavingTiers}
              className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-xs font-black uppercase tracking-widest text-[#CCFF00] shadow-[0_0_16px_rgba(204,255,0,0.2)] disabled:opacity-50"
            >
              {isSavingTiers ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save & Deploy Volume Rules
            </motion.button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Promo Code?"
        body={`"${deleteTarget?.code}" will be permanently removed.`}
        confirmLabel="Delete" danger
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </SellerShell>
  );
}
