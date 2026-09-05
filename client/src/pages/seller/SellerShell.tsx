import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
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
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase, BUYER_STOREFRONT_URL } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBadge } from '@/components/seller/StatusBadge';

const SPRING = { type: 'spring', stiffness: 340, damping: 28 } as const;

// ─── Nav items ──────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  icon: LayoutDashboard, href: '/seller/dashboard'  },
  { label: 'Listings',   icon: Package,         href: '/seller/listings'   },
  { label: 'Inventory',  icon: Layers,           href: '/seller/inventory'  },
  { label: 'Orders',     icon: ClipboardList,    href: '/seller/orders'     },
  { label: 'RFQ / Quotes', icon: ClipboardList,  href: '/seller/rfq'        },
  { label: 'Promotions', icon: PercentSquare,    href: '/seller/promotions' },
  { label: 'Returns',    icon: RotateCcw,        href: '/seller/returns'    },
  { label: 'Payouts',    icon: Wallet,           href: '/seller/payouts'    },
  { label: 'Health',     icon: Shield,           href: '/seller/health'     },
  { label: 'Analytics',  icon: BarChart3,        href: '/seller/analytics'  },
  { label: 'Settings',   icon: Settings2,        href: '/seller/settings'   },
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

// ─── Sidebar Nav Item ────────────────────────────────────────────────────────
function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const [location] = useLocation();
  const { isDark } = useTheme();
  const isActive = location === item.href || location.startsWith(item.href + '/');
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
              ? 'text-neutral-500 hover:bg-[#12161F] hover:text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        {/* Active left-border indicator */}
        {isActive && (
          <motion.div
            layoutId="navIndicator"
            transition={SPRING}
            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#CCFF00]"
          />
        )}
        <Icon
          size={16}
          className={`flex-shrink-0 transition ${isActive ? 'text-[#CCFF00]' : ''}`}
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
}

export default function SellerShell({ children, title }: SellerShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { theme, isDark, toggleTheme } = useTheme();
  const [, navigate] = useLocation();

  const unread = notifications.filter(n => !n.read).length;

  // Realtime notifications (orders + quotes)
  useEffect(() => {
    const channel = supabase
      .channel('seller-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        const order = payload.new as { id: string };
        const n: Notification = {
          id: `order-${order.id}`,
          type: 'order',
          title: 'New Order Received',
          body: `Order #${String(order.id).slice(0, 8)} is ready to fulfill.`,
          at: new Date().toISOString(),
          read: false,
        };
        setNotifications(prev => [n, ...prev.slice(0, 19)]);
        toast.success('New order received!');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quotes' }, payload => {
        const q = payload.new as { id: string; buyer_name?: string };
        const n: Notification = {
          id: `quote-${q.id}`,
          type: 'quote',
          title: 'New RFQ Received',
          body: `${q.buyer_name || 'A buyer'} submitted a quote request.`,
          at: new Date().toISOString(),
          read: false,
        };
        setNotifications(prev => [n, ...prev.slice(0, 19)]);
        toast.success('New RFQ received!');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const handleLogout = () => {
    try { localStorage.removeItem('flash-role'); } catch {}
    toast.success('Signed out of Seller Central');
    navigate('/auth/login');
  };

  const sidebarBg = isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white';
  const mainBg    = isDark ? 'bg-[#000000]' : 'bg-[#F8F9FA]';
  const topbarBg  = isDark ? 'border-[#1F2430] bg-[#000000]/90' : 'border-gray-200 bg-white/90';

  return (
    <div className={`flex min-h-screen antialiased ${mainBg}`}>

      {/* ─── MOBILE OVERLAY ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── SIDEBAR ─── */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={SPRING}
        className={`fixed left-0 top-0 z-50 hidden h-full flex-col border-r overflow-hidden lg:flex ${sidebarBg}`}
      >
        {/* Logo */}
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[#1F2430] px-3">
          {!collapsed && (
            <Link href="/seller/dashboard" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#CCFF00] text-black">
                <Zap size={17} fill="currentColor" />
              </span>
              <span className={`text-sm font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                flash<span className="text-[#CCFF00]">.biz</span>
              </span>
            </Link>
          )}
          {collapsed && (
            <Link href="/seller/dashboard" className="mx-auto">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#CCFF00] text-black">
                <Zap size={17} fill="currentColor" />
              </span>
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-lg p-1.5 text-neutral-500 hover:text-white transition"
            >
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="scrollbar-none flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <SidebarLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Expand button (collapsed state) */}
        {collapsed && (
          <div className="border-t border-[#1F2430] p-2">
            <button
              onClick={() => setCollapsed(false)}
              className="w-full grid place-items-center rounded-xl border border-[#1F2430] p-2.5 text-neutral-500 hover:text-[#CCFF00] transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Sidebar footer */}
        {!collapsed && (
          <div className="flex-shrink-0 border-t border-[#1F2430] p-3 space-y-1">
            <a
              href={BUYER_STOREFRONT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl border border-[#1F2430] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 transition hover:border-[#CCFF00]/40 hover:text-[#CCFF00]"
            >
              <ExternalLink size={12} /> View Storefront
            </a>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-600 transition hover:text-red-400"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        )}
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
            transition={SPRING}
            className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r lg:hidden ${sidebarBg}`}
          >
            <div className="flex h-14 items-center justify-between border-b border-[#1F2430] px-4">
              <span className={`text-sm font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                flash<span className="text-[#CCFF00]">.biz</span>
              </span>
              <button onClick={() => setMobileOpen(false)} className="text-neutral-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <nav className="scrollbar-none flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
              {NAV_ITEMS.map(item => (
                <SidebarLink key={item.href} item={item} collapsed={false} />
              ))}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div
        className="flex flex-1 flex-col transition-all duration-300"
        style={{ marginLeft: collapsed ? 64 : 220 }}
      >
        {/* ─── TOP BAR ─── */}
        <header className={`sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur-md sm:px-6 ${topbarBg}`}>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className={`rounded-lg border p-2 transition lg:hidden ${isDark ? 'border-[#1F2430] bg-[#12161F] text-neutral-400' : 'border-gray-200 text-gray-500'}`}
          >
            <Layers size={15} />
          </button>

          {/* Page title */}
          {title && (
            <h1 className={`text-sm font-black uppercase tracking-wider hidden sm:block ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h1>
          )}

          {/* Right controls */}
          <div className="ml-auto flex items-center gap-2">
            {/* Theme toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className={`rounded-full border p-2 transition ${isDark ? 'border-[#1F2430] bg-[#12161F] text-neutral-400 hover:text-[#CCFF00]' : 'border-gray-200 bg-white text-gray-500 hover:text-[#CCFF00]'}`}
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
            <div className="relative">
              <button
                onClick={() => setBellOpen(b => !b)}
                className={`relative rounded-full border p-2 transition ${isDark ? 'border-[#1F2430] bg-[#12161F] text-neutral-400 hover:text-white' : 'border-gray-200 bg-white text-gray-500'}`}
              >
                <Bell size={15} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#CCFF00] text-[8px] font-black text-black">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {/* Notification drawer */}
              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className={`absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl ${isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white'}`}
                  >
                    <div className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? 'border-[#1F2430]' : 'border-gray-100'}`}>
                      <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</span>
                      <div className="flex items-center gap-2">
                        {unread > 0 && (
                          <button onClick={markAllRead} className="text-[10px] font-bold text-[#CCFF00] hover:underline">
                            Mark all read
                          </button>
                        )}
                        <button onClick={() => setBellOpen(false)} className="text-neutral-500 hover:text-white">
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto scrollbar-thin">
                      {notifications.length === 0 ? (
                        <div className={`px-4 py-8 text-center text-xs ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            className={`flex items-start gap-3 border-b px-4 py-3 transition ${
                              isDark
                                ? `border-[#1F2430] ${!n.read ? 'bg-[#12161F]' : ''}`
                                : `border-gray-50 ${!n.read ? 'bg-blue-50/30' : ''}`
                            }`}
                          >
                            {!n.read && (
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#CCFF00]" />
                            )}
                            <div className={n.read ? 'pl-3' : ''}>
                              <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{n.title}</div>
                              <div className={`mt-0.5 text-[10px] ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{n.body}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#CCFF00] text-[10px] font-black text-black select-none">
              NS
            </div>
          </div>
        </header>

        {/* ─── PAGE CONTENT ─── */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
