import React, { useRef } from 'react';
import { motion, LayoutGroup } from 'framer-motion';

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
 * - Animated spring indicator
 */
export function CategoryChipRow({
  categories,
  selectedCategory,
  onSelectCategory,
  layoutGroupId = 'shared-category-rail',
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
      <LayoutGroup id={layoutGroupId}>
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
                onClick={(e) => {
                  onSelectCategory(cat);
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
                className={`relative shrink-0 whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-[background-color,color,border-color,box-shadow,transform] duration-150 active:scale-95 cursor-pointer ${
                  isCatActive
                    ? 'text-black shadow-[0_0_14px_rgba(204,255,0,0.35)] font-extrabold'
                    : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700/60'
                }`}
              >
                {isCatActive && (
                  <motion.div
                    layoutId={`${layoutGroupId}-glow`}
                    className="absolute inset-0 rounded-xl bg-[#CCFF00] -z-0"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{cat}</span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}
