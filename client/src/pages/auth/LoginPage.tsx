import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Zap,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';

export default function LoginPage() {
  const { user, signIn, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

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
      const { error } = await signIn(email.trim(), password);
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
    toast.info('Filled demo credentials');
  };

  return (
    <AuthSplitLayout badgeText="Seller Authentication">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Mobile Header (Shown on mobile screens < 1024px) */}
        <div className="flex lg:hidden items-center gap-2.5 mb-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#CCFF00] text-black shadow-[0_0_16px_rgba(204,255,0,0.4)]">
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
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
            Sign In to Seller Central
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Access your inventory catalog, wholesale fulfillment queue, and merchant analytics.
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
              <div className="flex-1 leading-snug font-medium">
                <span>{errorMsg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Demo Access Pill */}
        <div className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0D1117] p-3 shadow-sm text-xs">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <Sparkles size={14} className="text-[#15803D] dark:text-[#CCFF00]" />
            <span>Demo merchant account</span>
          </div>
          <button
            type="button"
            onClick={fillDemoAccount}
            className="font-bold text-xs text-[#15803D] dark:text-[#CCFF00] hover:underline"
          >
            Auto-fill credentials
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="sellerEmail"
              className="block text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400 mb-1.5"
            >
              Corporate Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400 dark:text-neutral-500">
                <Mail size={15} />
              </span>
              <input
                id="sellerEmail"
                type="email"
                required
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setErrorMsg(null);
                }}
                autoComplete="email"
                placeholder="seller@flash.enterprise"
                className="w-full rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#0D1117] pl-10 pr-4 py-3.5 text-xs font-semibold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] shadow-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="sellerPassword"
                className="block text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400"
              >
                Password
              </label>
              <span className="text-[10px] font-bold text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400 dark:text-neutral-500">
                <Lock size={15} />
              </span>
              <input
                id="sellerPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#0D1117] pl-10 pr-11 py-3.5 text-xs font-semibold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-600 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700 text-[#CCFF00] focus:ring-[#CCFF00]"
              />
              <span>Remember this workstation</span>
            </label>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#CCFF00] py-4 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_20px_rgba(204,255,0,0.35)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Seller Central</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Register Navigation */}
        <div className="pt-2 text-center text-xs text-neutral-600 dark:text-neutral-400">
          New to Flash Business?{' '}
          <Link
            href="/auth/signup"
            className="font-bold text-neutral-900 dark:text-[#CCFF00] hover:underline"
          >
            Register as a merchant supplier →
          </Link>
        </div>
      </motion.div>
    </AuthSplitLayout>
  );
}
