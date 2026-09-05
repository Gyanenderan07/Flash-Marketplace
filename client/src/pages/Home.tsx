import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ExternalLink, ShieldCheck, Store, Zap } from 'lucide-react';
import { toast } from 'sonner';

// Seller Central Views
import SellerDashboardView from './SellerDashboard';
import ListingsPage from './seller/ListingsPage';
import InventoryPage from './seller/InventoryPage';
import OrdersPage from './seller/OrdersPage';
import RFQPage from './seller/RFQPage';
import PromotionsPage from './seller/PromotionsPage';
import ReturnsPage from './seller/ReturnsPage';
import PayoutsPage from './seller/PayoutsPage';
import HealthPage from './seller/HealthPage';
import AnalyticsPage from './seller/AnalyticsPage';
import SettingsPage from './seller/SettingsPage';
import { BUYER_STOREFRONT_URL } from '@/lib/supabase';

/**
 * Clean enterprise Seller Sign-In view
 */
function SellerAuth({ signup = false }: { signup?: boolean }) {
  const [, navigate] = useLocation();

  const handleEnter = () => {
    try {
      localStorage.setItem('flash-role', 'seller');
    } catch {}
    toast.success('Signed in to Flash Seller Central');
    navigate('/seller/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#000000] p-4 text-white antialiased selection:bg-[#CCFF00] selection:text-black">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-3xl border border-[#1F2430] bg-[#0D1117] p-8 shadow-2xl space-y-6"
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#CCFF00] text-black shadow-[0_0_16px_rgba(204,255,0,0.35)]">
            <Zap size={22} fill="currentColor" />
          </span>
          <div className="flex flex-col">
            <span className="text-lg font-black uppercase tracking-tight text-white">
              flash<span className="text-[#CCFF00]">.biz</span>
            </span>
            <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase">
              Enterprise Seller Central
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black tracking-tight text-white">
            {signup ? 'Create Merchant Account' : 'Merchant Sign In'}
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            Access your B2B catalog, wholesale quotes, order fulfillment console, and settlement ledger.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <motion.button
            whileHover={{ y: -2, boxShadow: '0 0 20px rgba(204,255,0,0.35)' }}
            whileTap={{ scale: 0.96 }}
            onClick={handleEnter}
            className="w-full rounded-2xl bg-[#CCFF00] py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_16px_rgba(204,255,0,0.25)] transition"
          >
            Enter Seller Central Hub
          </motion.button>

          <a
            href={BUYER_STOREFRONT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#1F2430] bg-[#12161F] py-3 text-xs font-bold uppercase tracking-wider text-neutral-300 transition hover:border-[#CCFF00]/40 hover:text-[#CCFF00]"
          >
            <Store size={14} />
            <span>Launch Buyer Storefront</span>
            <ExternalLink size={12} />
          </a>
        </div>

        <div className="flex items-center justify-between border-t border-[#1F2430] pt-4 text-[10px] text-neutral-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-[#CCFF00]" /> 256-bit SSL Verified
          </span>
          <span>Flash B2B Enterprise Engine</span>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Consumer Storefront Redirection view
 * (Shown if someone attempts to visit buyer shopping paths on the seller console)
 */
function BuyerRedirectNotice({ path }: { path: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#000000] p-6 text-center text-white antialiased">
      <div className="w-full max-w-md rounded-3xl border border-[#1F2430] bg-[#0D1117] p-8 shadow-2xl space-y-5">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-[#CCFF00]">
          <Store size={24} />
        </span>
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-white">
            Consumer Shopping Portal
          </h2>
          <p className="mt-1.5 text-xs text-neutral-400">
            This deployment is strictly the <span className="text-[#CCFF00] font-bold">Flash Seller Central Hub</span>. Consumer shopping, retail cart, and buyer checkout are located at the official Buyer Storefront.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <a
            href={`${BUYER_STOREFRONT_URL}${path === '/cart' || path === '/checkout' ? '' : path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#CCFF00] py-3 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_16px_rgba(204,255,0,0.3)] transition hover:-translate-y-0.5 active:scale-95"
          >
            <span>Launch Buyer Storefront</span>
            <ExternalLink size={13} />
          </a>

          <Link
            href="/seller/dashboard"
            className="inline-flex w-full items-center justify-center rounded-full border border-[#1F2430] bg-[#12161F] py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition"
          >
            Return to Seller Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Flash Seller Central — Global Master Router
 * Zero consumer cart bloat. All routes point to seller console modules.
 */
export default function AppRouter() {
  const [location] = useLocation();

  // Handle all Seller Central Routes
  if (location === '/' || location === '/seller' || location === '/seller/dashboard') {
    return <SellerDashboardView />;
  }
  if (location === '/seller/listings')   return <ListingsPage />;
  if (location === '/seller/inventory')  return <InventoryPage />;
  if (location === '/seller/orders')     return <OrdersPage />;
  if (location === '/seller/rfq')        return <RFQPage />;
  if (location === '/seller/analytics')  return <AnalyticsPage />;
  if (location === '/seller/promotions') return <PromotionsPage />;
  if (location === '/seller/returns')    return <ReturnsPage />;
  if (location === '/seller/payouts')    return <PayoutsPage />;
  if (location === '/seller/health')     return <HealthPage />;
  if (location === '/seller/settings')   return <SettingsPage />;

  // Auth Routes
  if (location === '/auth/login')  return <SellerAuth />;
  if (location === '/auth/signup') return <SellerAuth signup />;

  // Redirect any legacy buyer/cart URLs
  if (
    location === '/cart' ||
    location === '/checkout' ||
    location === '/shop' ||
    location.startsWith('/product/') ||
    location.startsWith('/buyer/')
  ) {
    return <BuyerRedirectNotice path={location} />;
  }

  // Fallback to Seller Dashboard
  return <SellerDashboardView />;
}
