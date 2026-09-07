import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';

export interface SortOption<T = string> {
  id: T;
  label: string;
}

interface TableSortDropdownProps<T = string> {
  options: SortOption<T>[];
  currentSort: T;
  onSortChange: (sortId: T) => void;
  className?: string;
}

export function TableSortDropdown<T extends string = string>({
  options,
  currentSort,
  onSortChange,
  className = '',
}: TableSortDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === currentSort) || options[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/80 px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-sm transition-all hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/80 focus:outline-none"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <ArrowUpDown size={12} className="text-neutral-500 dark:text-neutral-400 shrink-0" />
        <span>Sort by: <strong className="font-extrabold text-neutral-900 dark:text-white">{selectedOption.label}</strong></span>
        <ChevronDown
          size={12}
          className={`text-neutral-500 dark:text-neutral-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 z-50 mt-1.5 min-w-[200px] origin-top-right rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D1117] p-1.5 shadow-xl shadow-black/10 dark:shadow-black/50"
            role="listbox"
          >
            <div className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Sort Options
            </div>
            {options.map(opt => {
              const isSelected = opt.id === currentSort;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSortChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-[#CCFF00]/15 text-neutral-900 dark:text-white font-extrabold'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <Check size={14} className="text-[#15803D] dark:text-[#CCFF00] shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
