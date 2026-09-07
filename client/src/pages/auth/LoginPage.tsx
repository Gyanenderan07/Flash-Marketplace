import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Store,
  Sun,
  Zap,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { BUYER_STOREFRONT_URL } from '@/lib/supabase';
import { AuthAmbientCanvas } from '@/components/auth/AuthAmbientCanvas';

export default function LoginPage() {
  const { user, signIn, isLoading: authLoading } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read message or prefilled email from URL query params (e.g. after signup redirect)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const registered = searchParams.get('registered');
      const emailParam = searchParams.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
      if (registered === 'true') {
        toast.success('Account successfully created! Please sign in with your credentials.');
      }
    } catch {}
  }, []);

  // If already authenticated, redirect immediately to seller dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/seller/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both corporate email and password.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg('Invalid email or password');
        toast.error('Invalid email or password');
      } else {
        toast.success('Signed in to Flash Seller Central');
        navigate('/seller/dashboard');
      }
    } catch (err) {
      setErrorMsg('Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('seller@flash.enterprise');
    setPassword('FlashSeller#2026');
    setErrorMsg(null);
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#F8F9FA] dark:bg-[#000000] p-4 text-neutral-900 dark:text-white antialiased selection:bg-[#CCFF00] selection:text-black transition-colors duration-200">
      {/* Interactive Reactive Ambient Grid Canvas */}
      <AuthAmbientCanvas />

      {/* Floating Theme Toggle (Top-Right) */}
      <div className="absolute right-5 top-5 z-20">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D1117] text-neutral-700 dark:text-neutral-200 shadow-md transition hover:border-[#CCFF00]"
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

      {/* Main Authentication Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-neutral-200 dark:border-[#1F2430] bg-white dark:bg-[#0D1117] p-8 shadow-2xl space-y-6 transition-colors duration-200"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#CCFF00] text-black shadow-[0_0_20px_rgba(204,255,0,0.4)]">
              <Zap size={22} fill="currentColor" />
            </span>
            <div className="flex flex-col">
              <span className="text-lg font-black uppercase tracking-tight">
                <span className="text-neutral-900 dark:text-white">FLASH </span>
                <span className="text-[#15803D] dark:text-[#CCFF00]">BUSINESS</span>
              </span>
              <span className="text-[10px] tracking-widest text-neutral-500 dark:text-neutral-400 font-bold uppercase">
                SELLER CENTRAL
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
            Enterprise Verified
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            Seller Portal Sign In
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            Enter your enterprise credentials to access your catalog, orders, and wholesale RFQs.
          </p>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 dark:bg-red-950/40 p-3.5 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug font-medium">{errorMsg}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400 mb-1.5">
              Corporate Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400 dark:text-neutral-500">
                <Mail size={15} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setErrorMsg(null); }}
                placeholder="merchant@company.com"
                className="w-full rounded-xl border border-neutral-200 dark:border-[#1F2430] bg-neutral-50 dark:bg-[#141720] pl-10 pr-4 py-3.5 text-xs font-mono text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
                Password
              </label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400 dark:text-neutral-500">
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => { setPassword(e.target.value); setErrorMsg(null); }}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-neutral-200 dark:border-[#1F2430] bg-neutral-50 dark:bg-[#141720] pl-10 pr-11 py-3.5 text-xs font-mono text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-neutral-800 dark:text-neutral-500 dark:hover:text-white transition"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="rounded border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[#15803D] dark:text-[#CCFF00] focus:ring-0 focus:ring-offset-0"
              />
              <span>Remember session</span>
            </label>
            <button
              type="button"
              onClick={fillDemoAccount}
              className="text-[11px] font-bold text-[#15803D] dark:text-[#CCFF00] hover:underline"
            >
              Fill Demo Credentials
            </button>
          </div>

          <div className="pt-2 space-y-3">
            <motion.button
              whileHover={{ y: -1, boxShadow: '0 0 24px rgba(204,255,0,0.4)' }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#CCFF00] px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider text-black shadow-[0_0_16px_rgba(204,255,0,0.25)] transition disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <span>Sign In to Seller Central</span>
              )}
            </motion.button>

            <Link
              href="/auth/signup"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-neutral-200 dark:border-[#1F2430] bg-neutral-100 dark:bg-[#12161F] px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider text-neutral-800 dark:text-neutral-300 transition hover:border-[#CCFF00] hover:text-black dark:hover:text-white"
            >
              New merchant? Register your enterprise
            </Link>
          </div>
        </form>

        {/* Storefront redirect & Enterprise trust badge */}
        <div className="space-y-3 border-t border-neutral-200 dark:border-[#1F2430] pt-4">
          <a
            href={BUYER_STOREFRONT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-[#15803D] dark:hover:text-[#CCFF00] transition"
          >
            <Store size={13} />
            <span>Visit Consumer Buyer Storefront</span>
            <ExternalLink size={11} />
          </a>

          <div className="flex items-center justify-center text-[10px] text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck size={13} className="text-[#15803D] dark:text-[#CCFF00]" /> Enterprise Verified Merchant Portal
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
