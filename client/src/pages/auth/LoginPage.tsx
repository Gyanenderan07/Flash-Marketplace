import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Zap,
  Loader2,
  ArrowRight,
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
      const params = new URLSearchParams(window.location.search);
      const prefillEmail = params.get('email');
      const registeredMsg = params.get('registered');

      if (prefillEmail) {
        setEmail(prefillEmail);
      }
      if (registeredMsg === 'true') {
        toast.success('Account created! Please sign in to access your dashboard.');
      }
    } catch {
      // safe fallback if window search unavailable
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/seller/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both corporate email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setErrorMsg(error.message || 'Invalid credentials. Please verify email and password.');
        setIsSubmitting(false);
      } else {
        toast.success('Authenticated successfully. Loading Merchant Hub...');
        // Navigation handled by auth effect, but fallback push:
        setTimeout(() => navigate('/seller/dashboard'), 200);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error. Please retry.');
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-3.5"
      >
        {/* Mobile Header (Shown on mobile screens < 1024px) */}
        <div className="flex lg:hidden items-center gap-2 mb-1">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#CCFF00] text-black shadow-[0_0_12px_rgba(204,255,0,0.4)]">
            <Zap size={17} fill="currentColor" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-black uppercase tracking-tight leading-none">
              <span className="text-white">FLASH </span>
              <span className="text-[#CCFF00]">BUSINESS</span>
            </span>
            <span className="text-[8px] font-extrabold uppercase tracking-widest text-neutral-400">
              SELLER CENTRAL
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
            Sign In to Seller Central
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-neutral-400">
            Access inventory catalog, order fulfillment, and wholesale analytics.
          </p>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/40 p-2.5 text-xs text-red-300"
            >
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug font-medium text-[11px]">
                <span>{errorMsg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Demo Access Pill */}
        <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-xs text-neutral-300">
          <div className="flex items-center gap-1.5 text-neutral-300 text-[11px]">
            <Sparkles size={13} className="text-[#CCFF00]" />
            <span>Demo merchant account</span>
          </div>
          <button
            type="button"
            onClick={fillDemoAccount}
            className="font-bold text-[11px] text-[#CCFF00] hover:underline cursor-pointer"
          >
            Auto-fill credentials
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email */}
          <div>
            <label
              htmlFor="sellerEmail"
              className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
            >
              Corporate Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                <Mail size={14} />
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
                className="w-full h-11 rounded-xl border border-neutral-800 bg-[#141720] pl-10 pr-3 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="sellerPassword"
                className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                <Lock size={14} />
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
                className="w-full h-11 rounded-xl border border-neutral-800 bg-[#141720] pl-10 pr-10 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-400 text-xs">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-900 text-[#CCFF00] focus:ring-[#CCFF00]"
              />
              <span>Remember this workstation</span>
            </label>
          </div>

          {/* Submit CTA */}
          <div className="pt-1.5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-[#CCFF00] text-xs font-black uppercase tracking-wider text-black shadow-[0_0_16px_rgba(204,255,0,0.3)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Seller Central</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Register Navigation */}
        <div className="pt-1 text-center text-xs text-neutral-400">
          New to Flash Business?{' '}
          <Link
            href="/auth/signup"
            className="font-bold text-[#CCFF00] hover:text-white hover:underline transition"
          >
            Register as a merchant supplier →
          </Link>
        </div>
      </motion.div>
    </AuthSplitLayout>
  );
}
