import React, { useRef } from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  short?: string;
  icon?: LucideIcon;
  route?: string;
}

interface ScrollableTabRowProps {
  tabs: readonly TabItem[] | TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  rightAction?: React.ReactNode;
  className?: string;
  layoutGroupId?: string;
}

/**
 * ScrollableTabRow
 * Responsive, zoom-resilient tab navigation rail with:
 * - Fluid horizontal scrolling on overflow
 * - Wheel delta translation for non-touch mice
 * - shrink-0 text protection
 * - Standard reliable static Tailwind pill states
 * - Separate rightAction CTA
 */
export function ScrollableTabRow({
  tabs,
  activeTab,
  onTabChange,
  rightAction,
  className = '',
}: ScrollableTabRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Translate vertical wheel to horizontal scroll on non-touch mice
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && scrollRef.current) {
      if (scrollRef.current.scrollWidth > scrollRef.current.clientWidth) {
        scrollRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  return (
    <div className={`w-full flex items-center justify-between gap-3 mb-6 flex-wrap xl:flex-nowrap ${className}`}>
      {/* 1. Scrollable Tab Rail */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex-1 min-w-0 flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-100 dark:bg-[#0D1117] border border-neutral-200 dark:border-neutral-800/80 shadow-inner overflow-x-auto horizontal-scroll-rail scroll-smooth touch-pan-x select-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 select-none cursor-pointer ${
                isActive
                  ? 'bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)] font-extrabold'
                  : 'text-neutral-700 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/70 dark:hover:bg-neutral-900/60'
              }`}
            >
              {Icon && <Icon size={14} className="shrink-0" />}
              <span className="whitespace-nowrap shrink-0">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Standalone Distinct Action CTA (Right Side) */}
      {rightAction && (
        <div className="shrink-0">
          {rightAction}
        </div>
      )}
    </div>
  );
}
