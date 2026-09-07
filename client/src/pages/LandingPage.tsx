import React, { useState } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Layers,
  Moon,
  Package,
  Quote,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  TrendingUp,
  Truck,
  Wallet,
  Zap
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { BUYER_STOREFRONT_URL } from '@/lib/supabase';
import { ThreeCanvas } from '@/components/landing/ThreeCanvas';

export default function LandingPage() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [activeDemoTab, setActiveDemoTab] = useState<'catalog' | 'radar' | 'rfq'>('catalog');
  const [previewQty, setPreviewQty] = useState(50);

  // Dynamic Tiered Price Calculation for Demo
  const basePrice = 1499;
  const unitPrice = previewQty >= 100 ? 999 : previewQty >= 50 ? 1199 : previewQty >= 10 ? 1399 : basePrice;
  const totalPrice = previewQty * unitPrice;
  const discountPercent = Math.round(((basePrice - unitPrice) / basePrice) * 100);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#F4F5F7] dark:bg-[#000000] text-neutral-900 dark:text-white selection:bg-[#CCFF00] selection:text-black antialiased transition-colors duration-200">
      {/* ── 3D THREE.JS AMBIENT CANVAS ── */}
      <ThreeCanvas className="opacity-90 dark:opacity-100" />

      {/* ── TOP NAVIGATION ── */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-black/80 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#CCFF00] text-black shadow-[0_0_18px_rgba(204,255,0,0.4)]">
              <Zap size={20} fill="currentColor" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight leading-none">
                <span className="text-neutral-900 dark:text-white">FLASH </span>
                <span className="text-[#15803D] dark:text-[#CCFF00]">BUSINESS</span>
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                SELLER CENTRAL
              </span>
            </div>
          </Link>

          {/* Center Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
            <a href="#features" className="hover:text-black dark:hover:text-[#CCFF00] transition">
              Architecture
            </a>
            <a href="#mockup" className="hover:text-black dark:hover:text-[#CCFF00] transition">
              Live Mockup
            </a>
            <a href="#metrics" className="hover:text-black dark:hover:text-[#CCFF00] transition">
              Velocity
            </a>
            <a
              href={BUYER_STOREFRONT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[#15803D] dark:hover:text-[#CCFF00] transition"
            >
              <span>Buyer Storefront</span>
              <ExternalLink size={11} />
            </a>
          </nav>

          {/* Right Action Group */}
          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-[#12161F] text-neutral-700 dark:text-neutral-300 transition hover:border-[#CCFF00]"
              title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </motion.button>

            {/* Login Link */}
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#12161F] px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-white transition hover:border-[#CCFF00] hover:text-black dark:hover:text-[#CCFF00]"
            >
              Seller Login
            </Link>

            {/* Register CTA */}
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#CCFF00] px-4 sm:px-5 py-2 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_18px_rgba(204,255,0,0.35)] transition hover:-translate-y-0.5 active:scale-95"
            >
              <span>Register</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16 text-center">
        {/* Status Pill */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-[#0D1117]/90 px-4 py-1.5 text-xs font-bold shadow-sm backdrop-blur-sm mb-6"
        >
          <span className="flex h-2 w-2 rounded-full bg-[#CCFF00] animate-pulse" />
          <span className="text-neutral-700 dark:text-neutral-300">
            Directly Integrated with <span className="font-mono text-xs font-semibold text-[#15803D] dark:text-[#CCFF00]">flash-beryl.vercel.app</span>
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Realtime
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mx-auto max-w-4xl text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-neutral-900 dark:text-white"
        >
          The High-Velocity Operating System for{' '}
          <span className="bg-gradient-to-r from-neutral-900 via-emerald-600 to-lime-500 dark:from-white dark:via-[#CCFF00] dark:to-emerald-400 bg-clip-text text-transparent">
            Enterprise B2B Merchants
          </span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-400"
        >
          Manage live catalogs with strict multi-tenant isolation, configure dynamic tiered volume pricing, negotiate buyer RFQ quotes, and dispatch orders with automated carrier AWBs—synchronized in real-time with the buyer storefront.
        </motion.p>

        {/* Primary Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <Link
            href="/auth/signup"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#CCFF00] px-7 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_24px_rgba(204,255,0,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(204,255,0,0.6)] active:scale-95"
          >
            <span>Register as Merchant</span>
            <ArrowRight size={14} />
          </Link>

          <Link
            href="/auth/login"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#0D1117] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-white transition hover:border-[#CCFF00] hover:text-black dark:hover:text-[#CCFF00] active:scale-95 shadow-sm"
          >
            <ShieldCheck size={15} className="text-[#15803D] dark:text-[#CCFF00]" />
            <span>Sign In to Seller Central</span>
          </Link>

          <a
            href={BUYER_STOREFRONT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-transparent px-5 py-3.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
          >
            <Store size={14} />
            <span>Explore Buyer Storefront</span>
            <ExternalLink size={12} />
          </a>
        </motion.div>

        {/* Feature Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-neutral-500 dark:text-neutral-400"
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-[#15803D] dark:text-[#CCFF00]" />
            <span>Multi-Tenant Catalog Scoping</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-[#15803D] dark:text-[#CCFF00]" />
            <span>Live Stock Depletion Radar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-[#15803D] dark:text-[#CCFF00]" />
            <span>24h Dispatch SLA Compliance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-[#15803D] dark:text-[#CCFF00]" />
            <span>Automated Delhivery / BlueDart AWBs</span>
          </div>
        </motion.div>
      </section>

      {/* ── INTERACTIVE DEMO SHOWCASE ── */}
      <section id="mockup" className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl border border-neutral-200/90 dark:border-neutral-800/80 bg-white/95 dark:bg-[#0D1117]/95 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)] overflow-hidden transition-colors duration-200">
          {/* Mockup Window Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#090C10] px-4 py-3 gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              <span className="ml-3 font-mono text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold">
                flash-seller-central.prod // cluster-deldhtqoygpoozbrfpgv
              </span>
            </div>

            {/* Mockup Tabs */}
            <div className="flex items-center gap-1 bg-neutral-200/70 dark:bg-neutral-900 rounded-xl p-1">
              {[
                { id: 'catalog', label: 'Tiered Pricing Engine', icon: Layers },
                { id: 'radar',   label: 'Stock Velocity Radar',  icon: TrendingUp },
                { id: 'rfq',     label: 'Wholesale RFQ Inbox',   icon: Quote },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeDemoTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDemoTab(tab.id as any)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      isActive
                        ? 'bg-[#CCFF00] text-black shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <Icon size={12} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mockup Interactive Body */}
          <div className="p-6 sm:p-8">
            {activeDemoTab === 'catalog' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#15803D] dark:text-[#CCFF00]">
                      Live SKU Dynamic Calculator
                    </span>
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                      Industrial High-Torque Smart Servo Drive (RoHS / CE)
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      SKU: FL-8842-AX · Base Wholesale Price: ₹1,499 · MOQ: 1 unit
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Order Quantity:</span>
                    <div className="flex items-center gap-1.5">
                      {[1, 10, 50, 100].map(qty => (
                        <button
                          key={qty}
                          onClick={() => setPreviewQty(qty)}
                          className={`rounded-lg px-3 py-1 text-xs font-mono font-bold transition ${
                            previewQty === qty
                              ? 'bg-[#CCFF00] text-black'
                              : 'border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-[#12161F] text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {qty}+
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tier Breakdown Cards */}
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    { tier: 'Retail / Sample', range: '1 – 9 units', price: 1499, active: previewQty < 10 },
                    { tier: 'Bulk Tier 1',     range: '10 – 49 units', price: 1399, active: previewQty >= 10 && previewQty < 50 },
                    { tier: 'Volume Tier 2',   range: '50 – 99 units', price: 1199, active: previewQty >= 50 && previewQty < 100 },
                    { tier: 'Enterprise Tier', range: '100+ units',   price: 999,  active: previewQty >= 100 },
                  ].map(t => (
                    <div
                      key={t.tier}
                      className={`rounded-2xl border p-4 transition-all duration-200 ${
                        t.active
                          ? 'border-[#CCFF00] bg-lime-500/5 dark:bg-[#CCFF00]/10 shadow-[0_0_20px_rgba(204,255,0,0.15)] ring-1 ring-[#CCFF00]'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#12161F]'
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        {t.tier}
                      </div>
                      <div className="mt-2 font-mono text-2xl font-black text-neutral-900 dark:text-white">
                        ₹{t.price}
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-neutral-500">
                        {t.range}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Checkout Projection */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#141822] p-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                      Selected Quantity: <span className="text-neutral-900 dark:text-white font-mono font-black">{previewQty} Units</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-black text-neutral-900 dark:text-white">
                        ₹{totalPrice.toLocaleString('en-IN')}
                      </span>
                      {discountPercent > 0 && (
                        <span className="rounded-full bg-[#CCFF00] px-2 py-0.5 font-mono text-[10px] font-black text-black">
                          SAVE {discountPercent}%
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#CCFF00] px-4 py-2 font-black uppercase text-black text-[11px] shadow-sm hover:brightness-105"
                  >
                    <span>Configure in Seller Central</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            )}

            {activeDemoTab === 'radar' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                      Predictive Inventory Engine
                    </span>
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                      Automated Stock Depletion & Reorder Points
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Realtime Sync
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { name: '4K Industrial Camera Sensor', sku: 'FL-CAM-01', stock: 4, thresh: 10, status: 'Critical Reorder', color: 'text-red-500' },
                    { name: 'Smart Controller PCB Board', sku: 'FL-PCB-99', stock: 8, thresh: 15, status: 'Low Buffer', color: 'text-amber-500' },
                    { name: '100W GaN Fast Charger Module', sku: 'FL-PWR-88', stock: 48, thresh: 10, status: 'Optimal Health', color: 'text-emerald-500' },
                  ].map(item => (
                    <div
                      key={item.sku}
                      className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#12161F] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-mono text-[10px] text-neutral-400">{item.sku}</div>
                          <div className="font-bold text-sm text-neutral-900 dark:text-white line-clamp-1">{item.name}</div>
                        </div>
                        <span className={`text-[10px] font-black uppercase ${item.color}`}>{item.status}</span>
                      </div>
                      <div className="flex items-baseline justify-between border-t border-neutral-200 dark:border-neutral-800/80 pt-2 font-mono text-xs">
                        <span className="text-neutral-500">Current Units:</span>
                        <span className="font-black text-base text-neutral-900 dark:text-white">{item.stock}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.stock < item.thresh ? 'bg-amber-500' : 'bg-[#CCFF00]'}`}
                          style={{ width: `${Math.min(100, (item.stock / 50) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeDemoTab === 'rfq' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#15803D] dark:text-[#CCFF00]">
                      Formal B2B Quotations
                    </span>
                    <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                      Direct Buyer RFQ Thread & Negotiation
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-neutral-500">SLA Response Window: &lt; 2h</span>
                </div>

                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#12161F] p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">RFQ #9042 — Bharat Heavy Electronics Ltd</span>
                      <p className="text-[11px] text-neutral-500">Requested 500 units of Precision Step Motors with BIS Certification</p>
                    </div>
                    <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-blue-500">
                      Negotiation Open
                    </span>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-[#0D1117] p-3.5 border border-neutral-200 dark:border-neutral-800 text-xs font-mono space-y-1">
                    <div className="text-neutral-500 text-[10px]">Buyer Proposed Target Price:</div>
                    <div className="text-sm font-bold text-neutral-900 dark:text-white">₹850 / unit (500 units = ₹4,25,000)</div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href="/auth/signup"
                      className="rounded-full bg-[#CCFF00] px-4 py-2 text-xs font-black uppercase text-black transition hover:brightness-105"
                    >
                      Accept &amp; Generate Formal Invoice
                    </Link>
                    <Link
                      href="/auth/login"
                      className="rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0D1117] px-4 py-2 text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300 transition hover:border-[#CCFF00]"
                    >
                      Counter Offer
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── ENTERPRISE VALUE PROPOSITION PILLARS ── */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#15803D] dark:text-[#CCFF00]">
            Enterprise Core
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight mt-1">
            Engineered for Modern Wholesale Scale
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Everything your operations team needs to run a high-throughput B2B distributor or manufacturer business.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: RefreshCw,
              title: '100% Realtime Sync',
              desc: 'Every product change or stock step automatically broadcasts to the public storefront within milliseconds.',
            },
            {
              icon: Shield,
              title: 'Tenant Isolation',
              desc: 'Strict multi-tenant security guarantees Seller A only accesses Seller A data. Zero cross-merchant leakage.',
            },
            {
              icon: Truck,
              title: 'Automated Dispatch',
              desc: 'Generate printable packing slips, BlueDart/Delhivery AWBs, and notify buyers on carrier tracking milestones.',
            },
            {
              icon: Wallet,
              title: 'Transparent Ledger',
              desc: 'Track volume revenue, 8% platform fee breakdown, refunds, and bank payouts with downloadable CSV statements.',
            },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="rounded-3xl border border-neutral-200/90 dark:border-neutral-800/80 bg-white dark:bg-[#0D1117] p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06)] dark:shadow-none transition hover:border-[#CCFF00]/40"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-100 dark:bg-[#12161F] text-[#15803D] dark:text-[#CCFF00] mb-5 border border-neutral-200 dark:border-neutral-800">
                  <Icon size={22} />
                </div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── METRICS BANNER ── */}
      <section id="metrics" className="relative z-10 border-y border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-[#0D1117]/70 py-12 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="font-mono text-3xl sm:text-4xl font-black text-[#15803D] dark:text-[#CCFF00]">
              99.98%
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Uptime SLA
            </div>
          </div>
          <div>
            <div className="font-mono text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">
              &lt; 50ms
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Catalog Latency
            </div>
          </div>
          <div>
            <div className="font-mono text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white">
              ₹0
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Setup or Onboarding Fees
            </div>
          </div>
          <div>
            <div className="font-mono text-3xl sm:text-4xl font-black text-[#15803D] dark:text-[#CCFF00]">
              24h
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Fulfillment Standard
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION SECTION ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D1117] p-8 sm:p-12 shadow-xl space-y-6">
          <span className="grid h-12 w-12 mx-auto place-items-center rounded-2xl bg-[#CCFF00] text-black shadow-[0_0_20px_rgba(204,255,0,0.4)]">
            <Sparkles size={24} />
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
            Ready to Accelerate Your Wholesale Operations?
          </h2>
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            Join verified suppliers and industrial merchants using Flash Business Seller Central for real-time inventory management.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/auth/signup"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#CCFF00] px-8 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_20px_rgba(204,255,0,0.35)] transition hover:brightness-105"
            >
              <span>Create Merchant Account</span>
              <ArrowRight size={13} />
            </Link>

            <Link
              href="/auth/login"
              className="flex w-full sm:w-auto items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-[#12161F] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-white transition hover:border-[#CCFF00]"
            >
              Sign In to Existing Store
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#000000] py-8 text-xs text-neutral-500 transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900 dark:text-white">FLASH BUSINESS</span>
            <span>·</span>
            <span>Enterprise B2B Seller Central</span>
          </div>

          <div className="flex items-center gap-6">
            <a href={BUYER_STOREFRONT_URL} target="_blank" rel="noopener noreferrer" className="hover:text-black dark:hover:text-white transition">
              Buyer Storefront ↗
            </a>
            <Link href="/auth/login" className="hover:text-black dark:hover:text-white transition">
              Merchant Login
            </Link>
            <Link href="/auth/signup" className="hover:text-black dark:hover:text-white transition">
              Supplier Registration
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
