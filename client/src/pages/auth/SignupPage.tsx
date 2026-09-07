import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Store,
  Zap,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { BUYER_STOREFRONT_URL } from '@/lib/supabase';

export default function SignupPage() {
  const { user, signUp, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [businessName, setBusinessName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    if (!businessName.trim()) {
      setErrorMsg('Please enter your business or legal company name.');
      return;
    }
    if (!email.trim() || !password) {
      setErrorMsg('Please provide a valid work email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const { error } = await signUp(
        businessName,
        storeName || businessName,
        email,
        password
      );

      if (error) {
        setErrorMsg(error.message || 'Registration failed. Please check your details and try again.');
        toast.error('Merchant registration failed');
      } else {
        toast.success('Merchant enterprise account created! Redirecting…');
        navigate('/seller/dashboard');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred during registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
          <span className="rounded-full border border-[#CCFF00]/40 bg-[#CCFF00]/10 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[#CCFF00]">
            B2B Onboarding
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Register Merchant Enterprise
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            Create an isolated seller tenant partition with your dedicated inventory catalog, RFQ responder, and order queues.
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
              Legal Business Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                <Building2 size={15} />
              </span>
              <input
                type="text"
                required
                value={businessName}
                onChange={e => {
                  setBusinessName(e.target.value);
                  if (!storeName) setStoreName(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="e.g. Apex Industrial Solutions Pvt Ltd"
                className="w-full rounded-xl border border-[#1F2430] bg-[#141720] pl-10 pr-4 py-3 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition focus:border-[#CCFF00]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5">
              Store Display Name (Buyer Storefront)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                <ShoppingBag size={15} />
              </span>
              <input
                type="text"
                required
                value={storeName}
                onChange={e => { setStoreName(e.target.value); setErrorMsg(null); }}
                placeholder="e.g. Apex Official Store"
                className="w-full rounded-xl border border-[#1F2430] bg-[#141720] pl-10 pr-4 py-3 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition focus:border-[#CCFF00]"
              />
            </div>
          </div>

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
                placeholder="procurement@company.com"
                className="w-full rounded-xl border border-[#1F2430] bg-[#141720] pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-neutral-500 outline-none transition focus:border-[#CCFF00]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5">
              Security Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrorMsg(null); }}
                placeholder="Min 6 characters"
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
                  <span>Creating Tenant Partition…</span>
                </>
              ) : (
                <span>Register &amp; Launch Portal</span>
              )}
            </motion.button>

            <Link
              href="/auth/login"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#1F2430] bg-[#12161F] py-3 text-xs font-bold uppercase tracking-wider text-neutral-300 transition hover:border-neutral-600 hover:text-white"
            >
              Already registered? Sign in
            </Link>
          </div>
        </form>

        <div className="flex items-center justify-between border-t border-[#1F2430] pt-4 text-[10px] text-neutral-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-[#CCFF00]" /> KYC Status: Auto-Provisioned
          </span>
          <span>Amazon-Grade Tenant Isolation</span>
        </div>
      </motion.div>
    </div>
  );
}
