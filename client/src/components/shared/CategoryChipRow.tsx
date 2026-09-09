import React, { useRef } from 'react';

interface CategoryChipRowProps {
  categories: readonly string[] | string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  layoutGroupId?: string;
  className?: string;
}

/**
 * CategoryChipRow
 * Responsive, zoom-resilient category filter rail with:
 * - Fluid horizontal scrolling on overflow
 * - Wheel delta translation for non-touch mice
 * - shrink-0 chip protection
 * - Reliable static Tailwind pill states
 */
export function CategoryChipRow({
  categories,
  selectedCategory,
  onSelectCategory,
  className = '',
}: CategoryChipRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && scrollRef.current) {
      if (scrollRef.current.scrollWidth > scrollRef.current.clientWidth) {
        scrollRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  return (
    <div className={`w-full relative flex items-center ${className}`}>
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="w-full flex items-center gap-2 overflow-x-auto py-2.5 px-2 scroll-smooth horizontal-scroll-rail touch-pan-x select-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {categories.map((cat) => {
          const isCatActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`shrink-0 inline-flex items-center whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-150 active:scale-95 cursor-pointer select-none ${
                isCatActive
                  ? 'bg-[#CCFF00] text-black shadow-[0_0_14px_rgba(204,255,0,0.35)] font-extrabold'
                  : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700/60'
              }`}
            >
              <span className="whitespace-nowrap">{cat}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
