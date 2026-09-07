import React from 'react';
import { Link, useLocation } from 'wouter';
import { ExternalLink, Store } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Auth Views
import LoginPage from './auth/LoginPage';
import SignupPage from './auth/SignupPage';

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
 * Consumer Storefront Redirection view
 * (Shown if someone attempts to visit buyer shopping paths on the seller console)
 */
function BuyerRedirectNotice({ path }: { path: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F5F7] dark:bg-[#000000] p-6 text-center text-neutral-900 dark:text-white antialiased transition-colors duration-200">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 dark:border-[#1F2430] bg-white dark:bg-[#0D1117] p-8 shadow-2xl space-y-5">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-[#CCFF00]">
          <Store size={24} />
        </span>
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900 dark:text-white">
            Consumer Shopping Portal
          </h2>
          <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            This deployment is strictly the <span className="text-[#15803D] dark:text-[#CCFF00] font-bold">Flash Business Seller Central</span>. Consumer shopping, retail cart, and buyer checkout are located on the official Buyer Storefront.
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
            className="inline-flex w-full items-center justify-center rounded-full border border-neutral-200 dark:border-[#1F2430] bg-neutral-100 dark:bg-[#12161F] py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
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
 * Strictly protected enterprise portal with multi-tenant authentication.
 */
export default function AppRouter() {
  const [location] = useLocation();

  // Public Auth Routes
  if (location === '/auth/login')  return <LoginPage />;
  if (location === '/auth/signup') return <SignupPage />;

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

  // Protected Seller Central Routes
  if (location === '/seller/listings') {
    return <ProtectedRoute><ListingsPage /></ProtectedRoute>;
  }
  if (location === '/seller/inventory') {
    return <ProtectedRoute><InventoryPage /></ProtectedRoute>;
  }
  if (location === '/seller/orders') {
    return <ProtectedRoute><OrdersPage /></ProtectedRoute>;
  }
  if (location === '/seller/rfq') {
    return <ProtectedRoute><RFQPage /></ProtectedRoute>;
  }
  if (location === '/seller/analytics') {
    return <ProtectedRoute><AnalyticsPage /></ProtectedRoute>;
  }
  if (location === '/seller/promotions') {
    return <ProtectedRoute><PromotionsPage /></ProtectedRoute>;
  }
  if (location === '/seller/returns') {
    return <ProtectedRoute><ReturnsPage /></ProtectedRoute>;
  }
  if (location === '/seller/payouts') {
    return <ProtectedRoute><PayoutsPage /></ProtectedRoute>;
  }
  if (location === '/seller/health') {
    return <ProtectedRoute><HealthPage /></ProtectedRoute>;
  }
  if (location === '/seller/settings') {
    return <ProtectedRoute><SettingsPage /></ProtectedRoute>;
  }

  // Default protected root dashboard (/ or /seller or /seller/dashboard)
  return (
    <ProtectedRoute>
      <SellerDashboardView />
    </ProtectedRoute>
  );
}
