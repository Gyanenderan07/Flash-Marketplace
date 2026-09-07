import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSonner, toast } from 'sonner';

/**
 * Dynamic Island Notification System
 * Floating top-center capsule notification with real-time spring animations,
 * dynamic status dot, and context-aware color palettes.
 */
export function DynamicIslandToaster() {
  const { toasts } = useSonner();

  // Filter out any dismissed toasts, take top 3 for stacking
  const activeToasts = (toasts || []).filter(
    (t) => !(t as unknown as { delete?: boolean }).delete
  );

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2 select-none"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {activeToasts.map((t) => {
          const rawMessage = typeof t.title === 'function' ? t.title() : t.title;
          const message = typeof rawMessage === 'string'
            ? rawMessage
            : React.isValidElement(rawMessage)
            ? rawMessage
            : String(rawMessage || 'Notification');

          const strMsg = typeof message === 'string' ? message.toLowerCase() : '';

          // Determine message palette
          const isStock = strMsg.includes('stock') || strMsg.includes('→');
          const isLowStock = strMsg.includes('low stock') || strMsg.includes('reorder');
          const isSuccess = t.type === 'success' || strMsg.includes('published') || strMsg.includes('created') || strMsg.includes('saved');
          const isError = t.type === 'error' || strMsg.includes('failed') || strMsg.includes('error');
          const isWarning = t.type === 'warning' || isLowStock;

          let borderClass = 'border-[#CCFF00]/40';
          let glowClass = 'shadow-[0_8px_30px_rgba(204,255,0,0.2)]';
          let dotColor = 'bg-[#CCFF00]';

          if (isError) {
            borderClass = 'border-red-500/50';
            glowClass = 'shadow-[0_8px_30px_rgba(239,68,68,0.25)]';
            dotColor = 'bg-red-500';
          } else if (isWarning) {
            borderClass = 'border-amber-500/50';
            glowClass = 'shadow-[0_8px_30px_rgba(245,158,11,0.25)]';
            dotColor = 'bg-amber-400';
          } else if (isSuccess) {
            borderClass = 'border-emerald-500/50';
            glowClass = 'shadow-[0_8px_30px_rgba(16,185,129,0.25)]';
            dotColor = 'bg-emerald-400';
          } else if (isStock) {
            borderClass = 'border-[#CCFF00]/50';
            glowClass = 'shadow-[0_8px_30px_rgba(204,255,0,0.25)]';
            dotColor = 'bg-[#CCFF00]';
          }

          return (
            <motion.div
              key={t.id}
              initial={{ y: -40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -30, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={() => toast.dismiss(t.id)}
              className={`pointer-events-auto flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-xl border ${borderClass} ${glowClass} bg-[#000000]/92 text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform`}
            >
              {/* Dynamic Status Dot */}
              <span className={`h-2 w-2 rounded-full ${dotColor} animate-pulse shrink-0`} />

              {/* Message Content */}
              <span className="text-xs font-bold tracking-wide text-white">
                {message}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
