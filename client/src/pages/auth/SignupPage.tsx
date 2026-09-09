import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShoppingBag,
  Zap,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';

export default function SignupPage() {
  const { user, signUp, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Strict independent state variables (no auto-sync or character leaks)
  const [businessName, setBusinessName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDuplicateUser, setIsDuplicateUser] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/seller/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDuplicateUser(false);

    // Validation
    const cleanBusiness = businessName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanBusiness) {
      setErrorMsg('Please enter your legal business or registered firm name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please provide a valid corporate email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await signUp(
        cleanBusiness,
        storeName.trim() || cleanBusiness,
        cleanEmail,
        password
      );

      if (error) {
        const msg = error.message || 'Failed to create merchant account.';
        setErrorMsg(msg);
        if (
          msg.toLowerCase().includes('already registered') ||
          msg.toLowerCase().includes('duplicate') ||
          msg.toLowerCase().includes('already in use') ||
          msg.toLowerCase().includes('exists')
        ) {
          setIsDuplicateUser(true);
        }
        setIsSubmitting(false);
      } else {
        toast.success('Registration successful! Directing to login...');
        setTimeout(() => {
          navigate(`/auth/login?registered=true&email=${encodeURIComponent(cleanEmail)}`);
        }, 500);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration exception encountered. Please retry.');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout badgeText="Merchant Onboarding">
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
            Create Merchant Account
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-neutral-400">
            Register your business to sell wholesale across the Flash network.
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
                {isDuplicateUser && (
                  <div className="mt-1">
                    <Link
                      href={`/auth/login?email=${encodeURIComponent(email.trim())}`}
                      className="inline-flex items-center gap-1 font-bold text-[#CCFF00] hover:underline"
                    >
                      Sign in here →
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* Field 1: Legal Business Name */}
          <div>
            <label
              htmlFor="legalBusinessName"
              className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
            >
              Legal Business Name <span className="text-[#CCFF00]">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                <Building2 size={14} />
              </span>
              <input
                id="legalBusinessName"
                type="text"
                required
                value={businessName}
                onChange={e => {
                  setBusinessName(e.target.value);
                  setErrorMsg(null);
                  setIsDuplicateUser(false);
                }}
                autoComplete="organization"
                placeholder="e.g. Apex Industrial Solutions Pvt Ltd"
                className="w-full h-11 rounded-xl border border-neutral-800 bg-[#141720] pl-10 pr-3 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]"
              />
            </div>
          </div>

          {/* Field 2: Store Display Name */}
          <div>
            <label
              htmlFor="storeDisplayName"
              className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
            >
              Store Display Name (Storefront)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                <ShoppingBag size={14} />
              </span>
              <input
                id="storeDisplayName"
                type="text"
                value={storeName}
                onChange={e => {
                  setStoreName(e.target.value);
                  setErrorMsg(null);
                }}
                autoComplete="off"
                placeholder="e.g. Apex Official Store (Optional)"
                className="w-full h-11 rounded-xl border border-neutral-800 bg-[#141720] pl-10 pr-3 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]"
              />
            </div>
          </div>

          {/* Field 3: Corporate Email */}
          <div>
            <label
              htmlFor="corporateEmail"
              className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
            >
              Corporate Email <span className="text-[#CCFF00]">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                <Mail size={14} />
              </span>
              <input
                id="corporateEmail"
                type="email"
                required
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setErrorMsg(null);
                  setIsDuplicateUser(false);
                }}
                autoComplete="email"
                placeholder="ops@apexindustrial.com"
                className="w-full h-11 rounded-xl border border-neutral-800 bg-[#141720] pl-10 pr-3 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]"
              />
            </div>
          </div>

          {/* Field 4: Password */}
          <div>
            <label
              htmlFor="accountPassword"
              className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
            >
              Master Password (Min. 6) <span className="text-[#CCFF00]">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-500">
                <Lock size={14} />
              </span>
              <input
                id="accountPassword"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                autoComplete="new-password"
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
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing User Link */}
        <div className="pt-1 text-center text-xs text-neutral-400">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-bold text-[#CCFF00] hover:text-white hover:underline transition"
          >
            Sign in →
          </Link>
        </div>
      </motion.div>
    </AuthSplitLayout>
  );
}
