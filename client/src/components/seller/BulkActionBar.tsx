import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
}

/**
 * Slide-up bulk action bar — appears from the bottom when checkboxes are selected.
 * Background: obsidian (#000000), action buttons: neon text.
 */
export function BulkActionBar({ selectedCount, actions, onClear }: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-[#1F2430] bg-black px-4 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.8)] backdrop-blur-md">
            {/* Count chip */}
            <div className="flex items-center gap-2 rounded-full border border-[#CCFF00]/30 bg-[#CCFF00]/10 px-3 py-1">
              <span className="text-xs font-black tabular-nums text-[#CCFF00]">{selectedCount}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#CCFF00]/70">selected</span>
            </div>

            <div className="h-5 w-px bg-[#1F2430]" />

            {/* Action buttons */}
            {actions.map((action, i) => (
              <motion.button
                key={i}
                whileHover={{ y: -0.5 }}
                whileTap={{ scale: 0.96 }}
                onClick={action.onClick}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
                  action.danger
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'bg-[#12161F] text-white hover:bg-[#1F2430]'
                }`}
              >
                {action.icon}
                {action.label}
              </motion.button>
            ))}

            <div className="h-5 w-px bg-[#1F2430]" />

            {/* Clear */}
            <button
              onClick={onClear}
              className="grid h-7 w-7 place-items-center rounded-full bg-[#12161F] text-neutral-500 transition hover:text-white"
              title="Clear selection"
            >
              <X size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
