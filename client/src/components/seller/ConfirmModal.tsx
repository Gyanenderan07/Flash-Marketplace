import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const SPRING = { type: 'spring', stiffness: 300, damping: 25 } as const;

/** Flash-styled confirmation modal — replaces native window.confirm() */
export function ConfirmModal({
  open, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={SPRING}
            className="w-full max-w-sm rounded-3xl border border-neutral-200 dark:border-[#1F2430] bg-white dark:bg-[#0D1117] text-neutral-900 dark:text-white p-6 shadow-2xl"
          >
            {/* Icon */}
            <div className={`mb-4 grid h-12 w-12 place-items-center rounded-2xl border ${
              danger ? 'border-red-500/20 bg-red-500/10' : 'border-[#CCFF00]/20 bg-[#CCFF00]/10'
            }`}>
              <AlertTriangle size={22} className={danger ? 'text-red-400' : 'text-[#CCFF00]'} />
            </div>

            <h3 className="text-base font-black tracking-tight text-neutral-900 dark:text-white">{title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{body}</p>

            <div className="mt-6 flex items-center gap-2.5">
              {/* Cancel */}
              <button
                onClick={onCancel}
                className="flex-1 rounded-full border border-neutral-200 dark:border-[#1F2430] bg-neutral-100 dark:bg-[#12161F] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-400 transition hover:border-neutral-400 dark:hover:border-neutral-600 hover:text-black dark:hover:text-white"
              >
                {cancelLabel}
              </button>

              {/* Confirm */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                className={`flex-1 rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                  danger
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-black text-[#CCFF00] shadow-[0_0_16px_rgba(204,255,0,0.2)] hover:shadow-[0_0_22px_rgba(204,255,0,0.35)]'
                }`}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
