import React from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Moon,
  ShieldCheck,
  Sun,
  Zap
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { BUYER_STOREFRONT_URL } from '@/lib/supabase';
import { ThreeBackground } from '@/components/ThreeBackground';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  badgeText?: string;
}

export function AuthSplitLayout({ children, badgeText = 'Enterprise Verified' }: AuthSplitLayoutProps) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <div className="relative h-screen max-h-screen w-screen overflow-hidden flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-[#000000] text-neutral-900 dark:text-white antialiased select-none">
      {/* ── 3D THREE.JS AMBIENT CANVAS BACKGROUND ── */}
      <ThreeBackground className="opacity-45" density="low" />

      {/* ── FLOATING THEME TOGGLE (Top-Right) ── */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6 z-50">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-800 bg-[#0D1117]/90 text-neutral-300 shadow-md backdrop-blur-md transition hover:border-[#CCFF00]"
          title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ opacity: 0, rotate: -20 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 20 }}
              transition={{ duration: 0.15 }}
              className="block"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── SPLIT-SCREEN CONTAINER (LOCKED VIEWPORT FIT) ── */}
      <div className="relative z-10 w-full max-w-5xl h-full max-h-[96vh] sm:max-h-[90vh] rounded-3xl border border-neutral-800/90 bg-[#07090E]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col lg:flex-row">
        {/* ── LEFT SHOWCASE PANEL (Desktop >= 1024px) ── */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-8 xl:p-10 border-r border-neutral-800/80 bg-[#080B10] text-white overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -top-16 -left-16 h-72 w-72 rounded-full bg-[#CCFF00]/10 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-[#38BDF8]/10 blur-[90px]" />

          {/* Top Brand Logo */}
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-2.5 transition hover:opacity-90">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#CCFF00] text-black shadow-[0_0_18px_rgba(204,255,0,0.4)]">
                <Zap size={20} fill="currentColor" />
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-black uppercase tracking-tight leading-none">
                  <span className="text-white">FLASH </span>
                  <span className="text-[#CCFF00]">BUSINESS</span>
                </span>
                <span className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase mt-0.5">
                  SELLER CENTRAL
                </span>
              </div>
            </Link>
          </div>

          {/* Center Value Showcase */}
          <div className="relative z-10 my-auto py-4 space-y-5 max-w-md">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{badgeText}</span>
              </div>
              <h2 className="text-2xl xl:text-3xl font-black tracking-tight leading-tight">
                The Operating System for{' '}
                <span className="bg-gradient-to-r from-white via-[#CCFF00] to-emerald-400 bg-clip-text text-transparent">
                  Enterprise Merchants
                </span>
              </h2>
              <p className="text-xs leading-relaxed text-neutral-400">
                Automate wholesale fulfillment, synchronize live inventory with buyer storefronts, and negotiate bulk quotes with real-time accuracy.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { title: '⚡ Real-Time Catalog Sync', desc: 'Instant storefront reflection' },
                { title: '₹0 Friction Payouts', desc: 'Automated ledger settlements' },
                { title: '📦 Priority AWBs', desc: 'Delhivery & BlueDart tracking' },
                { title: '📊 Wholesale RFQ Inbox', desc: 'Fast formal quote response' },
              ].map((pill, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-neutral-800 bg-[#0E121A]/80 p-2.5 backdrop-blur-sm transition hover:border-[#CCFF00]/40"
                >
                  <div className="font-bold text-[11px] text-white">{pill.title}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">{pill.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-neutral-800/80 text-[11px] text-neutral-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[#CCFF00]" />
              <span>Enterprise Production Cluster</span>
            </div>
            <a
              href={BUYER_STOREFRONT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-neutral-400 hover:text-[#CCFF00] transition"
            >
              <span>Buyer Storefront</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* ── RIGHT FORM CONTAINER (FITS 100% HEIGHT WITH NO SCROLLBAR) ── */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-10 bg-white dark:bg-[#0D1117] overflow-hidden">
          <div className="w-full max-w-sm my-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
