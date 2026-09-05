import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'accent';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'border-green-500/20 bg-green-500/10 text-green-400',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  danger:  'border-red-500/20 bg-red-500/10 text-red-400',
  info:    'border-blue-500/20 bg-blue-500/10 text-blue-400',
  accent:  'border-[#CCFF00]/20 bg-[#CCFF00]/10 text-[#CCFF00]',
  default: 'border-neutral-700 bg-neutral-800/50 text-neutral-400',
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  success: 'bg-green-400',
  warning: 'bg-amber-400',
  danger:  'bg-red-400',
  info:    'bg-blue-400',
  accent:  'bg-[#CCFF00]',
  default: 'bg-neutral-500',
};

/**
 * Semantic status pill badge.
 * NOTE: neon (#CCFF00) is reserved for "accent" variant — not for general status.
 */
export function StatusBadge({ label, variant = 'default', dot = false, className = '' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${VARIANTS[variant]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[variant]}`} />}
      {label}
    </span>
  );
}

/** Map common delivery_status string → badge variant */
export function orderStatusVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (s === 'delivered') return 'success';
  if (s === 'dispatched' || s === 'processing') return 'info';
  if (s === 'cancelled' || s === 'rejected' || s === 'refunded') return 'danger';
  if (s === 'pending' || s === 'requested') return 'warning';
  if (s === 'responded' || s === 'negotiating') return 'info';
  if (s === 'accepted' || s === 'approved') return 'success';
  if (s === 'active') return 'success';
  if (s === 'draft') return 'warning';
  if (s === 'suppressed') return 'danger';
  return 'default';
}
