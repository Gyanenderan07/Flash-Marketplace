import React from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Moon,
  Package,
  ShieldCheck,
  Store,
  Sun,
  Truck,
  Wallet,
  Zap
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { BUYER_STOREFRONT_URL } from '@/lib/supabase';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  badgeText?: string;
}

export function AuthSplitLayout({ children, badgeText = 'Enterprise Verified' }: AuthSplitLayoutProps) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <div className="relative flex min-h-screen w-full bg-[#F4F5F7] dark:bg-[#000000] text-neutral-900 dark:text-white antialiased transition-colors duration-200">
      {/* ── FLOATING THEME TOGGLE (Top-Right) ── */}
      <div className="absolute right-5 top-5 z-50">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-[#0D1117]/90 text-neutral-700 dark:text-neutral-200 shadow-md backdrop-blur-sm transition hover:border-[#CCFF00]"
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
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── LEFT SHOWCASE PANEL (Desktop >= 1024px) ── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] relative flex-col justify-between overflow-hidden border-r border-neutral-800/80 bg-[#07090E] p-12 xl:p-16 text-white select-none">
        {/* Ambient Neon & Obsidian Glow Orbs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#CCFF00]/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#38BDF8]/10 blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#CCFF00_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.04]" />

        {/* Top Branding */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 transition hover:opacity-90">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#CCFF00] text-black shadow-[0_0_24px_rgba(204,255,0,0.45)]">
              <Zap size={24} fill="currentColor" />
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-black uppercase tracking-tight leading-none">
                <span className="text-white">FLASH </span>
                <span className="text-[#CCFF00]">BUSINESS</span>
              </span>
              <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase mt-1">
                ENTERPRISE SELLER CENTRAL
              </span>
            </div>
          </Link>
        </div>

        {/* Center Content & Value Props */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-lg">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{badgeText}</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight">
              Scale Your Wholesale Distribution on{' '}
              <span className="bg-gradient-to-r from-white via-[#CCFF00] to-emerald-400 bg-clip-text text-transparent">
                Flash Commerce
              </span>
            </h2>
            <p className="text-sm leading-relaxed text-neutral-400">
              Direct access to live retail storefront inventory, dynamic MOQ tier calculation, and real-time buyer RFQ inquiries with instant automated dispatch.
            </p>
          </div>

          {/* Metric Showcase Pills */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: '⚡ 100% Real-Time Sync', desc: 'Instant catalog reflection' },
              { title: '₹0 Friction Payouts', desc: 'Automated ledger settlement' },
              { title: '🛡️ Multi-Tenant Scoping', desc: 'Isolated catalog inventory' },
              { title: '📦 Priority AWBs', desc: 'Delhivery & BlueDart tracking' },
            ].map((pill, i) => (
              <div
                key={i}
                className="rounded-2xl border border-neutral-800 bg-[#0E121A]/80 p-3.5 backdrop-blur-sm transition hover:border-[#CCFF00]/30"
              >
                <div className="font-bold text-xs text-white">{pill.title}</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">{pill.desc}</div>
              </div>
            ))}
          </div>

          {/* Merchant Testimonial / Trust Card */}
          <div className="rounded-2xl border border-neutral-800 bg-[#0A0D14]/90 p-5 backdrop-blur-md space-y-3">
            <div className="flex items-center gap-1 text-[#CCFF00]">
              {'★'.repeat(5)}
            </div>
            <p className="text-xs leading-relaxed text-neutral-300 italic">
              "Flash Business transformed our wholesale operations. Syncing products directly with the consumer storefront while managing bulk tiered volume pricing gave us a 40%+ boost in enterprise repeat orders."
            </p>
            <div className="flex items-center gap-3 pt-1 border-t border-neutral-800/80">
              <div className="h-8 w-8 rounded-full bg-[#CCFF00]/20 border border-[#CCFF00]/40 flex items-center justify-center font-bold text-xs text-[#CCFF00]">
                RM
              </div>
              <div>
                <div className="text-xs font-bold text-white">Rajiv Malhotra</div>
                <div className="text-[10px] text-neutral-400">Director of Operations · Northstar Components</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Status & Storefront Link */}
        <div className="relative z-10 flex items-center justify-between pt-6 border-t border-neutral-800 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#CCFF00]" />
            <span>Dedicated Multi-Tenant Partition</span>
          </div>
          <a
            href={BUYER_STOREFRONT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-neutral-400 hover:text-[#CCFF00] transition"
          >
            <span>Buyer Storefront</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* ── RIGHT FORM CONTAINER (Full width on mobile, 52% on desktop) ── */}
      <div className="flex flex-1 flex-col justify-center items-center p-6 sm:p-10 lg:p-14 xl:p-20 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
