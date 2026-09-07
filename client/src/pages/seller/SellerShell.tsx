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
  const { isDark } = useTheme();
  const isActive = location === item.href || (item.href !== '/seller/dashboard' && location.startsWith(item.href));
  const Icon = item.icon;

  return (
    <Link href={item.href}>
      <motion.div
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        className={`group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150 ${
          isActive
            ? 'bg-[#CCFF00]/10 text-[#CCFF00]'
            : isDark
              ? 'text-neutral-400 hover:bg-[#12161F] hover:text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        {/* Active indicator pill with required spring dampening */}
        {isActive && (
          <motion.div
            layoutId="activeTabIndicator"
            transition={SPRING_TAB}
            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[#CCFF00] shadow-[0_0_8px_rgba(204,255,0,0.6)]"
          />
        )}
        <Icon
          size={16}
          className={`flex-shrink-0 transition-colors duration-150 ${isActive ? 'text-[#CCFF00]' : ''}`}
        />
        {!collapsed && (
          <span className="truncate uppercase tracking-wider">{item.label}</span>
        )}
        {item.badge && !collapsed && (
          <span className="ml-auto rounded-full bg-[#CCFF00] px-1.5 py-0.5 text-[9px] font-black text-black">
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

  const sidebarBg = isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white';
  const mainBg    = isDark ? 'bg-[#000000]' : 'bg-[#F8F9FA]';
  const topbarBg  = isDark ? 'border-[#1F2430] bg-[#0D1117]/90' : 'border-gray-200 bg-white/90';

  return (
    <div className={`flex min-h-screen w-full max-w-[100vw] overflow-x-hidden antialiased ${mainBg} ${isDark ? 'text-white' : 'text-gray-900'}`}>

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

      {/* ─── SIDEBAR (Desktop) ─── */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 256 }}
        transition={SPRING_PANEL}
        className={`sticky top-0 h-screen w-64 shrink-0 hidden md:flex flex-col border-r overflow-hidden ${sidebarBg}`}
      >
        {/* Logo Branding */}
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[#1F2430] px-3.5">
          {!collapsed && (
            <Link href="/seller/dashboard" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)] shrink-0">
                <Zap size={17} fill="currentColor" />
              </span>
              <div className="flex flex-col">
                <span className={`text-sm font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  FLASH BUSINESS
                </span>
                <span className="text-[10px] tracking-widest text-neutral-400 font-bold uppercase">
                  SELLER CENTRAL
                </span>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link href="/seller/dashboard" className="mx-auto" title="Flash Business - Seller Central">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.3)]">
                <Zap size={17} fill="currentColor" />
              </span>
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-lg p-1.5 text-neutral-500 hover:text-white transition"
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
          <div className="border-t border-[#1F2430] p-2">
            <button
              onClick={() => setCollapsed(false)}
              className="w-full grid place-items-center rounded-xl border border-[#1F2430] p-2.5 text-neutral-500 hover:text-[#CCFF00] transition"
              title="Expand sidebar"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Sidebar Footer */}
        {!collapsed && (
          <div className="flex-shrink-0 border-t border-[#1F2430] p-3 space-y-1.5">
            <a
              href={BUYER_STOREFRONT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-[#1F2430] bg-[#12161F]/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 transition hover:border-[#CCFF00]/50 hover:text-[#CCFF00]"
            >
              <span className="flex items-center gap-2">
                <ExternalLink size={12} /> Buyer Storefront
              </span>
              <span className="text-[9px] text-[#CCFF00]">↗</span>
            </a>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 transition hover:text-red-400"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        )}
      </motion.aside>

      {/* ─── MOBILE DRAWER (Mobile) ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -270 }}
            animate={{ x: 0 }}
            exit={{ x: -270 }}
            transition={SPRING_PANEL}
            className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r md:hidden ${sidebarBg}`}
          >
            <div className="flex h-14 items-center justify-between border-b border-[#1F2430] px-4">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#CCFF00] text-black shrink-0">
                  <Zap size={15} fill="currentColor" />
                </span>
                <div className="flex flex-col">
                  <span className={`text-sm font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    FLASH BUSINESS
                  </span>
                  <span className="text-[10px] tracking-widest text-neutral-400 font-bold uppercase">
                    SELLER CENTRAL
                  </span>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-neutral-500 hover:text-white">
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
            <div className="border-t border-[#1F2430] p-3 space-y-1.5">
              <a
                href={BUYER_STOREFRONT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-between rounded-xl border border-[#1F2430] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400"
              >
                <span>View Buyer Storefront</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 min-w-0 w-full flex flex-col min-h-screen overflow-x-hidden">
        {/* ─── PERSISTENT GLOBAL TOP BAR ─── */}
        <header className={`sticky top-0 z-30 w-full flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap border-b px-4 backdrop-blur-md sm:px-6 shrink-0 ${topbarBg}`}>
          <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className={`rounded-lg border p-2 transition md:hidden shrink-0 ${isDark ? 'border-[#1F2430] bg-[#12161F] text-neutral-400' : 'border-gray-200 text-gray-500'}`}
              title="Open Navigation"
            >
              <Layers size={15} />
            </button>

            {/* Dynamic, interactive Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs sm:text-sm min-w-0 overflow-hidden">
              {computedBreadcrumbs.map((bc, i) => {
                const isLast = i === computedBreadcrumbs.length - 1;
                const resolvedHref = bc.href || resolveBreadcrumbRoute(bc.label);
                const isClickable = !isLast && !!resolvedHref;

                return (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="text-neutral-600 select-none px-1 text-xs sm:text-sm shrink-0">
                        ›
                      </span>
                    )}
                    {isClickable ? (
                      <Link
                        href={resolvedHref!}
                        className="hover:text-[#CCFF00] transition-colors cursor-pointer text-neutral-400 font-medium text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[200px]"
                      >
                        {bc.label}
                      </Link>
                    ) : (
                      <span
                        className={`font-bold text-xs sm:text-sm select-text truncate max-w-[160px] sm:max-w-[260px] ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {bc.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto sm:ml-0">
            {/* View Buyer Storefront External CTA button */}
            <a
              href={BUYER_STOREFRONT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#CCFF00]/40 bg-[#CCFF00]/10 px-3 sm:px-3.5 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#CCFF00] transition hover:bg-[#CCFF00] hover:text-black hover:shadow-[0_0_16px_rgba(204,255,0,0.3)] active:scale-95"
            >
              <span>View Buyer Storefront</span>
              <ExternalLink size={11} className="shrink-0" />
            </a>

            {/* Theme toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className={`shrink-0 rounded-full border p-2 transition ${isDark ? 'border-[#1F2430] bg-[#12161F] text-neutral-400 hover:text-[#CCFF00]' : 'border-gray-200 bg-white text-gray-500 hover:text-[#CCFF00]'}`}
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
                className={`relative shrink-0 rounded-full border p-2 transition ${isDark ? 'border-[#1F2430] bg-[#12161F] text-neutral-400 hover:text-white' : 'border-gray-200 bg-white text-gray-500'}`}
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
                      className={`absolute right-0 top-12 z-50 w-80 rounded-2xl border shadow-2xl overflow-hidden ${
                        isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-[#1F2430] px-4 py-3">
                        <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
                      <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-[#1F2430]/60">
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
                                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {n.title}
                                </span>
                              </div>
                              <p className={`mt-0.5 text-[11px] ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
                                {n.body}
                              </p>
                              <span className="mt-1 block text-[9px] font-mono text-neutral-500">
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

        {/* ─── PAGE CONTENT CONTAINER ─── */}
        <main className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
