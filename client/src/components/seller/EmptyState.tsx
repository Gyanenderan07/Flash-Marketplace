import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Designed empty state with neon CTA */
export function EmptyState({ icon: Icon, title, body, actionLabel, onAction, className = '' }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 dark:border-[#1F2430] bg-white dark:bg-[#0D1117] px-8 py-16 text-center ${className}`}
    >
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-neutral-200 dark:border-[#1F2430] bg-neutral-100 dark:bg-[#12161F]">
        <Icon size={28} className="text-[#CCFF00] opacity-70" />
      </div>
      <h3 className="text-base font-black tracking-tight text-neutral-900 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ y: -1, boxShadow: '0 0 20px rgba(204,255,0,0.35)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-neutral-900 dark:bg-black px-6 py-2.5 text-xs font-black uppercase tracking-widest text-[#CCFF00] shadow-[0_0_16px_rgba(204,255,0,0.2)] transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-95"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}
