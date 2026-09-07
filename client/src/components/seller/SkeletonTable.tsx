import React from 'react';

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

/** Shimmer skeleton for table loading states */
export function SkeletonTable({ rows = 6, cols = 5, className = '' }: SkeletonTableProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-neutral-200 dark:border-[#1F2430] bg-white dark:bg-[#0D1117] ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-neutral-200 dark:border-[#1F2430] bg-neutral-100 dark:bg-[#12161F] px-5 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-2.5 animate-pulse rounded-full bg-neutral-200 dark:bg-[#1F2430]"
            style={{ width: `${60 + i * 15}px` }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-neutral-100 dark:border-[#1F2430]/60 px-5 py-4"
          style={{ animationDelay: `${r * 60}ms` }}
        >
          {/* Thumbnail placeholder */}
          <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-lg bg-neutral-200 dark:bg-[#1F2430]" />
          {/* Text placeholders */}
          {Array.from({ length: cols - 1 }).map((_, c) => (
            <div
              key={c}
              className="h-2.5 animate-pulse rounded-full bg-neutral-200 dark:bg-[#1F2430]"
              style={{ width: `${50 + ((r + c) * 23) % 90}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Shimmer skeleton for a KPI card */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-neutral-200 dark:border-[#1F2430] bg-white dark:bg-[#0D1117] p-5 ${className}`}>
      <div className="h-2 w-16 rounded-full bg-neutral-200 dark:bg-[#1F2430]" />
      <div className="mt-4 h-7 w-24 rounded-full bg-neutral-200 dark:bg-[#1F2430]" />
      <div className="mt-2 h-2 w-20 rounded-full bg-neutral-200 dark:bg-[#1F2430]" />
    </div>
  );
}
