import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import type { ProductPriceTier } from '@/lib/seller-types';

interface TierRow {
  id?: string;
  min_qty: number;
  unit_price: number;
}

interface TieredPricingTableProps {
  tiers: TierRow[];
  onChange: (tiers: TierRow[]) => void;
  currency?: string;
  readonly?: boolean;
}

/**
 * Editable tiered / bulk pricing table.
 * Neon highlight on lowest-min_qty tier (best deal indicator).
 */
export function TieredPricingTable({ tiers, onChange, currency = '₹', readonly = false }: TieredPricingTableProps) {
  const addTier = () => {
    const lastQty = tiers.length ? tiers[tiers.length - 1].min_qty : 0;
    onChange([...tiers, { min_qty: lastQty + 10, unit_price: 0 }]);
  };

  const removeTier = (idx: number) => {
    onChange(tiers.filter((_, i) => i !== idx));
  };

  const updateTier = (idx: number, field: 'min_qty' | 'unit_price', value: number) => {
    onChange(tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Min Qty</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Unit Price ({currency})</span>
        {!readonly && <span />}
      </div>

      {sorted.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#1F2430] bg-[#12161F] px-4 py-4 text-center text-xs text-neutral-600">
          No tiers yet — add bulk pricing tiers below
        </div>
      )}

      {sorted.map((tier, idx) => {
        const isLowest = idx === 0 && sorted.length > 1;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`grid grid-cols-[1fr_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
              isLowest
                ? 'border-[#CCFF00]/30 bg-[#CCFF00]/5'
                : 'border-[#1F2430] bg-[#12161F]'
            }`}
          >
            {isLowest && (
              <div className="col-span-full -mt-1 mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#CCFF00]/70">
                  ★ Best deal tier
                </span>
              </div>
            )}

            {/* Min Qty */}
            <input
              type="number"
              min={1}
              value={tier.min_qty}
              disabled={readonly}
              onChange={e => updateTier(idx, 'min_qty', parseInt(e.target.value) || 1)}
              className="w-full rounded-lg border border-[#1F2430] bg-[#0D1117] px-3 py-2 text-xs font-mono text-white outline-none transition focus:border-[#CCFF00] disabled:opacity-60"
            />

            {/* Unit Price */}
            <input
              type="number"
              min={0}
              step={0.01}
              value={tier.unit_price}
              disabled={readonly}
              onChange={e => updateTier(idx, 'unit_price', parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-[#1F2430] bg-[#0D1117] px-3 py-2 text-xs font-mono text-white outline-none transition focus:border-[#CCFF00] disabled:opacity-60"
            />

            {/* Remove */}
            {!readonly && (
              <button
                type="button"
                onClick={() => removeTier(idx)}
                className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border border-[#1F2430] bg-[#0D1117] text-neutral-600 transition hover:border-red-500/50 hover:text-red-400"
              >
                <Trash2 size={13} />
              </button>
            )}
          </motion.div>
        );
      })}

      {/* Add tier */}
      {!readonly && (
        <button
          type="button"
          onClick={addTier}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#1F2430] px-4 py-2.5 text-xs font-bold text-neutral-500 transition hover:border-[#CCFF00]/40 hover:text-[#CCFF00]"
        >
          <Plus size={12} /> Add Price Tier
        </button>
      )}
    </div>
  );
}
