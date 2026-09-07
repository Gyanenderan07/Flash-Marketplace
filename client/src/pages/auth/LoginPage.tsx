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
  ShieldCheck,
  Store,
  Zap,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { BUYER_STOREFRONT_URL } from '@/lib/supabase';

export default function LoginPage() {
  const { user, signIn, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        setErrorMsg(error.message || 'Invalid merchant credentials. Please check your email and password.');
        toast.error('Authentication failed');
      } else {
        toast.success('Signed in to Flash Seller Central');
        navigate('/seller/dashboard');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred during sign-in. Please try again.');
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
    <div className="flex min-h-screen items-center justify-center bg-[#000000] p-4 text-white antialiased selection:bg-[#CCFF00] selection:text-black">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md rounded-3xl border border-[#1F2430] bg-[#0D1117] p-8 shadow-2xl space-y-6"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#CCFF00] text-black shadow-[0_0_20px_rgba(204,255,0,0.4)]">
              <Zap size={22} fill="currentColor" />
            </span>
            <div className="flex flex-col">
              <span className="text-lg font-black uppercase tracking-tight">
                <span className="text-white">FLASH </span>
                <span className="text-[#CCFF00]">BUSINESS</span>
              </span>
              <span className="text-[10px] tracking-widest text-neutral-400 font-bold uppercase">
                SELLER CENTRAL
              </span>
            </div>
          </div>
          <span className="rounded-full border border-emerald-800/50 bg-emerald-950/40 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400">
            Tenant Shield Active
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Seller Portal Sign In
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            Enter your enterprise credentials to access your isolated inventory, orders, and wholesale RFQs.
          </p>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2.5 rounded-2xl border border-red-800/60 bg-red-950/30 p-3.5 text-xs text-red-300"
            >
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{errorMsg}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5">
              Corporate Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                <Mail size={15} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setErrorMsg(null); }}
                placeholder="merchant@company.com"
                className="w-full rounded-xl border border-[#1F2430] bg-[#141720] pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-neutral-500 outline-none transition focus:border-[#CCFF00]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Password
              </label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => { setPassword(e.target.value); setErrorMsg(null); }}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[#1F2430] bg-[#141720] pl-10 pr-11 py-3 text-xs font-mono text-white placeholder-neutral-500 outline-none transition focus:border-[#CCFF00]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-500 hover:text-white transition"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-400 hover:text-neutral-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-900 text-[#CCFF00] focus:ring-0 focus:ring-offset-0"
              />
              <span>Remember session</span>
            </label>
            <button
              type="button"
              onClick={fillDemoAccount}
              className="text-[11px] font-bold text-[#CCFF00] hover:underline"
            >
              Fill Demo Credentials
            </button>
          </div>

          <div className="pt-2 space-y-3">
            <motion.button
              whileHover={{ y: -1, boxShadow: '0 0 24px rgba(204,255,0,0.4)' }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#CCFF00] py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_16px_rgba(204,255,0,0.25)] transition disabled:opacity-60"
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#1F2430] bg-[#12161F] py-3 text-xs font-bold uppercase tracking-wider text-neutral-300 transition hover:border-neutral-600 hover:text-white"
            >
              New merchant? Register your enterprise
            </Link>
          </div>
        </form>

        {/* Storefront redirect & SSL badge */}
        <div className="space-y-3 border-t border-[#1F2430] pt-4">
          <a
            href={BUYER_STOREFRONT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 text-xs font-medium text-neutral-400 hover:text-[#CCFF00] transition"
          >
            <Store size={13} />
            <span>Visit Consumer Buyer Storefront</span>
            <ExternalLink size={11} />
          </a>

          <div className="flex items-center justify-between text-[10px] text-neutral-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[#CCFF00]" /> 256-bit Row-Level Security
            </span>
            <span>Multi-Tenant Partitioning</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
