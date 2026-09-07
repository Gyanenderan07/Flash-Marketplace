import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Home as HomeIcon,
  LayoutDashboard,
  Layers,
  LogOut,
  Moon,
  Package,
  PercentSquare,
  RotateCcw,
  Settings2,
  Shield,
  Sun,
  Truck,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, BUYER_STOREFRONT_URL } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBadge } from '@/components/seller/StatusBadge';

const SPRING_TAB = { type: 'spring', stiffness: 380, damping: 30 } as const;
const SPRING_PANEL = { type: 'spring', stiffness: 320, damping: 28 } as const;

// ─── Nav items ──────────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
}

export const SELLER_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   icon: LayoutDashboard, href: '/seller/dashboard'  },
  { label: 'Listings',    icon: Package,         href: '/seller/listings'   },
  { label: 'Inventory',   icon: Layers,          href: '/seller/inventory'  },
  { label: 'Orders',      icon: ClipboardList,   href: '/seller/orders'     },
  { label: 'RFQ / Quotes', icon: ClipboardList,  href: '/seller/rfq'        },
  { label: 'Promotions',  icon: PercentSquare,   href: '/seller/promotions' },
  { label: 'Returns',     icon: RotateCcw,       href: '/seller/returns'    },
  { label: 'Payouts',     icon: Wallet,          href: '/seller/payouts'    },
  { label: 'Health',      icon: Shield,          href: '/seller/health'     },
  { label: 'Analytics',   icon: BarChart3,       href: '/seller/analytics'  },
  { label: 'Settings',    icon: Settings2,       href: '/seller/settings'   },
];

// ─── Notification types ──────────────────────────────────────────────────────
interface Notification {
  id: string;
  type: 'order' | 'quote' | 'stock';
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const BREADCRUMB_ROUTE_MAP: Record<string, string> = {
  'seller central': '/seller/dashboard',
  'dashboard': '/seller/dashboard',
  'operational overview': '/seller/dashboard',
  'overview': '/seller/dashboard',
  'listings': '/seller/listings',
  'live catalog': '/seller/listings',
  'live catalog & inventory': '/seller/listings',
  'catalog & stock': '/seller/listings',
  'catalog': '/seller/listings',
  'product catalog': '/seller/listings',
  'inventory': '/seller/inventory',
  'stock manager': '/seller/inventory',
  'stock': '/seller/inventory',
  'orders': '/seller/orders',
  'fulfillment queue': '/seller/orders',
  'fulfillment console': '/seller/orders',
  'fulfillment': '/seller/orders',
  'rfq / quotes': '/seller/rfq',
  'rfq': '/seller/rfq',
  'quotes': '/seller/rfq',
  'buyer rfqs': '/seller/rfq',
  'bulk rfq negotiation inbox': '/seller/rfq',
  'promotions': '/seller/promotions',
  'returns': '/seller/returns',
  'refunds': '/seller/returns',
  'returns & refunds': '/seller/returns',
  'payouts': '/seller/payouts',
  'payout ledger': '/seller/payouts',
  'payments & payouts': '/seller/payouts',
  'analytics': '/seller/analytics',
  'analytics hub': '/seller/analytics',
  'real-time buyer analytics': '/seller/analytics',
  'real-time buyer hub analytics': '/seller/analytics',
  'health': '/seller/health',
  'account health': '/seller/health',
  'seller health': '/seller/health',
  'settings': '/seller/settings',
  'store settings': '/seller/settings',
};

export function resolveBreadcrumbRoute(label: string): string | undefined {
  if (!label) return undefined;
  const normalized = label.toLowerCase().trim();
  return BREADCRUMB_ROUTE_MAP[normalized];
}

// ─── Sidebar Nav Item ────────────────────────────────────────────────────────
function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const [location] = useLocation();
  const isActive = location === item.href || (item.href !== '/seller/dashboard' && location.startsWith(item.href));
  const Icon = item.icon;

  return (
    <Link href={item.href}>
      <motion.div
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        className={`group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-xs transition-all duration-150 ${
          isActive
            ? 'bg-[#CCFF00] text-black font-extrabold shadow-[0_0_16px_rgba(204,255,0,0.3)]'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900/60 font-semibold'
        }`}
      >
        <Icon
          size={16}
          className={`flex-shrink-0 transition-colors duration-150 ${isActive ? 'text-black' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white'}`}
        />
        {!collapsed && (
          <span className="truncate uppercase tracking-wider">{item.label}</span>
        )}
        {item.badge && !collapsed && (
          <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-black ${isActive ? 'bg-black text-[#CCFF00]' : 'bg-[#CCFF00] text-black'}`}>
            {item.badge}
          </span>
        )}
      </motion.div>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SELLER SHELL
// ═══════════════════════════════════════════════════════════════════════════════
interface SellerShellProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export default function SellerShell({ children, title, breadcrumbs }: SellerShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { theme, isDark, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();

  // Keyboard dismiss (ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setBellOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  // Realtime notifications (orders + quotes from Supabase)
  useEffect(() => {
    const channel = supabase
      .channel('seller-notifications-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const order = payload.new as { id: string; total_amount?: number };
        const n: Notification = {
          id: `order-${order.id}`,
          type: 'order',
          title: 'New Wholesale Order',
          body: `Order #${String(order.id).slice(0, 8)} received — ₹${Number(order.total_amount || 0).toLocaleString('en-IN')}`,
          at: new Date().toISOString(),
          read: false,
        };
        setNotifications(prev => [n, ...prev.slice(0, 19)]);
        toast.success(`New order received! #${String(order.id).slice(0, 8)}`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quotes' }, payload => {
        const q = payload.new as { id: string; buyer_name?: string; requested_qty?: number };
        const n: Notification = {
          id: `quote-${q.id}`,
          type: 'quote',
          title: 'New RFQ Inbound',
          body: `${q.buyer_name || 'Enterprise Buyer'} requested quote for ${q.requested_qty || 1} units.`,
          at: new Date().toISOString(),
          read: false,
        };
        setNotifications(prev => [n, ...prev.slice(0, 19)]);
        toast.success('New RFQ quote request received!');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const handleLogout = () => {
    try { localStorage.removeItem('flash-role'); } catch {}
    toast.success('Signed out of Seller Central');
    navigate('/auth/login');
  };

  // Dynamic automatic breadcrumbs
  const computedBreadcrumbs = useMemo((): BreadcrumbItem[] => {
    if (breadcrumbs && breadcrumbs.length > 0) {
      return breadcrumbs.map(b => ({
        ...b,
        href: b.href || resolveBreadcrumbRoute(b.label),
      }));
    }
    const clean = location.split('?')[0];
    const item = SELLER_NAV_ITEMS.find(n => n.href === clean);
    if (clean === '/seller/dashboard' || clean === '/seller') {
      return [
        { label: 'Seller Central', href: '/seller/dashboard' },
        { label: 'Operational Overview', href: '/seller/dashboard' }
      ];
    }
    return [
      { label: 'Seller Central', href: '/seller/dashboard' },
      { label: item?.label || title || 'Console', href: item?.href || resolveBreadcrumbRoute(title || '') }
    ];
  }, [breadcrumbs, location, title]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F5F7] dark:bg-[#000000] text-neutral-900 dark:text-white transition-colors duration-200">

      {/* ─── MOBILE OVERLAY ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── SIDEBAR (Desktop Fixed/Sticky Navigation) ─── */}
      <aside
        className={`h-screen ${collapsed ? 'w-[68px]' : 'w-64'} shrink-0 hidden md:flex flex-col justify-between border-r border-neutral-200 dark:border-neutral-800/80 bg-[#FFFFFF] dark:bg-[#000000] shadow-sm dark:shadow-none sticky top-0 left-0 z-30 transition-all duration-200 select-none`}
      >
        {/* Brand Logo Header */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-neutral-200 dark:border-neutral-800/80 px-4">
          {!collapsed ? (
            <Link href="/seller/dashboard" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)] shrink-0">
                <Zap size={17} fill="currentColor" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight uppercase">
                  <span className="text-neutral-900 dark:text-white">FLASH </span>
                  <span className="text-[#CCFF00] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] dark:drop-shadow-none">BUSINESS</span>
                </span>
                <span className="text-[10px] tracking-widest text-neutral-500 dark:text-neutral-400 font-bold uppercase">
                  SELLER CENTRAL
                </span>
              </div>
            </Link>
          ) : (
            <Link href="/seller/dashboard" className="mx-auto" title="Flash Business - Seller Central">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]">
                <Zap size={17} fill="currentColor" />
              </span>
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-lg p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Collapse sidebar"
            >
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="scrollbar-none flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {SELLER_NAV_ITEMS.map(item => (
            <SidebarLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Expand button (when collapsed) */}
        {collapsed && (
          <div className="border-t border-neutral-200 dark:border-neutral-800/80 p-2 space-y-1">
            <button
              onClick={() => setCollapsed(false)}
              className="w-full grid place-items-center rounded-xl border border-neutral-200 dark:border-neutral-800 p-2.5 text-neutral-600 dark:text-neutral-400 hover:text-[#CCFF00] hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
              title="Expand sidebar"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={handleLogout}
              className="w-full grid place-items-center rounded-xl p-2.5 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {/* Sidebar Footer — duplicate Buyer Storefront button removed */}
        {!collapsed && (
          <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800/80 p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 transition hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* ─── MOBILE DRAWER ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -270 }}
            animate={{ x: 0 }}
            exit={{ x: -270 }}
            transition={SPRING_PANEL}
            className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-neutral-200 dark:border-neutral-800/80 bg-[#FFFFFF] dark:bg-[#000000] md:hidden shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-neutral-200 dark:border-neutral-800/80 px-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#CCFF00] text-black shrink-0 shadow-[0_0_12px_rgba(204,255,0,0.3)]">
                  <Zap size={16} fill="currentColor" />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-black tracking-tight uppercase">
                    <span className="text-neutral-900 dark:text-white">FLASH </span>
                    <span className="text-[#CCFF00] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] dark:drop-shadow-none">BUSINESS</span>
                  </span>
                  <span className="text-[10px] tracking-widest text-neutral-500 dark:text-neutral-400 font-bold uppercase">
                    SELLER CENTRAL
                  </span>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                <X size={16} />
              </button>
            </div>
            <nav className="scrollbar-none flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
              {SELLER_NAV_ITEMS.map(item => (
                <div key={item.href} onClick={() => setMobileOpen(false)}>
                  <SidebarLink item={item} collapsed={false} />
                </div>
              ))}
            </nav>
            <div className="border-t border-neutral-200 dark:border-neutral-800/80 p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 transition hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─── INDEPENDENT SCROLLING VIEWPORT ─── */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto overflow-x-hidden p-6 sm:p-8 bg-[#F4F5F7] dark:bg-[#000000] transition-colors duration-200">
        {/* ─── EXPANDED TOP NAVBAR WITH BREATHING ROOM ─── */}
        <header className="h-16 w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#0D1117]/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800/60 shadow-sm mb-6 shrink-0 transition-colors duration-200">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-2 transition md:hidden shrink-0 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              title="Open Navigation"
            >
              <Layers size={16} />
            </button>

            {/* Breadcrumbs styling */}
            <nav aria-label="Breadcrumb" className="flex items-center text-sm font-semibold tracking-wide text-neutral-600 dark:text-neutral-300 min-w-0 overflow-hidden">
              {computedBreadcrumbs.map((bc, i) => {
                const isLast = i === computedBreadcrumbs.length - 1;
                const resolvedHref = bc.href || resolveBreadcrumbRoute(bc.label);
                const isClickable = !isLast && !!resolvedHref;

                return (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="px-2 text-neutral-400 dark:text-neutral-600 select-none shrink-0 font-normal">
                        ›
                      </span>
                    )}
                    {isClickable ? (
                      <Link
                        href={resolvedHref!}
                        className="hover:text-black dark:hover:text-[#CCFF00] transition-colors cursor-pointer text-neutral-600 dark:text-neutral-400 font-semibold text-sm truncate max-w-[140px] sm:max-w-[220px]"
                      >
                        {bc.label}
                      </Link>
                    ) : (
                      <span className="font-bold text-sm text-neutral-900 dark:text-white select-text truncate max-w-[160px] sm:max-w-[280px]">
                        {bc.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          {/* Right Header Action Cluster */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-4">
            {/* View Buyer Storefront External CTA button */}
            <a
              href={BUYER_STOREFRONT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#CCFF00]/60 dark:border-[#CCFF00]/40 bg-[#CCFF00]/15 dark:bg-[#CCFF00]/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-[#CCFF00] transition hover:bg-[#CCFF00] hover:text-black hover:shadow-[0_0_16px_rgba(204,255,0,0.3)] active:scale-95"
            >
              <span>VIEW BUYER STOREFRONT ↗</span>
            </a>

            {/* Theme toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="shrink-0 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-2.5 text-neutral-800 dark:text-neutral-200 hover:text-[#CCFF00] transition shadow-sm"
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

            {/* Notification bell */}
            <div className="relative shrink-0">
              <button
                onClick={() => setBellOpen(b => !b)}
                className="relative shrink-0 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-2.5 text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white transition shadow-sm"
                title="Notifications"
              >
                <Bell size={15} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#CCFF00] text-[8px] font-black text-black shadow-[0_0_6px_rgba(204,255,0,0.8)]">
                    {unread}
                  </span>
                )}
              </button>

              {/* Notification dropdown drawer */}
              <AnimatePresence>
                {bellOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setBellOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-neutral-200 dark:border-[#1F2430] bg-[#FFFFFF] dark:bg-[#0D1117] shadow-2xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-[#1F2430] px-4 py-3">
                        <span className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                          Live Notifications
                        </span>
                        {unread > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-[10px] font-bold text-[#CCFF00] hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-neutral-100 dark:divide-[#1F2430]/60">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-neutral-500">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              className={`p-3 text-xs transition ${
                                n.read ? 'opacity-60' : 'bg-[#CCFF00]/5'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                {!n.read && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#CCFF00]" />
                                )}
                                <span className="font-bold text-neutral-900 dark:text-white">
                                  {n.title}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                {n.body}
                              </p>
                              <span className="mt-1 block text-[9px] font-mono text-neutral-400 dark:text-neutral-500">
                                {new Date(n.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* ─── DYNAMIC PAGE CONTENT ─── */}
        <div className="w-full min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
