import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'accent';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'border-emerald-300 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold',
  warning: 'border-amber-300 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold',
  danger:  'border-red-300 dark:border-red-800/50 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-bold',
  info:    'border-blue-300 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold',
  accent:  'border-lime-300 dark:border-[#CCFF00]/20 bg-lime-50 dark:bg-[#CCFF00]/10 text-lime-800 dark:text-[#CCFF00] font-bold',
  default: 'border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-400 font-bold',
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  success: 'bg-emerald-600 dark:bg-emerald-400',
  warning: 'bg-amber-600 dark:bg-amber-400',
  danger:  'bg-red-600 dark:bg-red-400',
  info:    'bg-blue-600 dark:bg-blue-400',
  accent:  'bg-lime-600 dark:bg-[#CCFF00]',
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
