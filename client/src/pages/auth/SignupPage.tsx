import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
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

  // Strict independent state variables
  const [businessName, setBusinessName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDuplicateUser, setIsDuplicateUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/seller/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setErrorMsg('Please enter your business or legal company name.');
      setIsDuplicateUser(false);
      return;
    }
    if (!email.trim() || !password) {
      setErrorMsg('Please provide a valid corporate email and password.');
      setIsDuplicateUser(false);
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      setIsDuplicateUser(false);
      return;
    }

    setErrorMsg(null);
    setIsDuplicateUser(false);
    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const resolvedStoreName = storeName.trim() || businessName.trim();

      const { error } = await signUp(
        businessName.trim(),
        resolvedStoreName,
        cleanEmail,
        password
      );

      if (error) {
        const msg = error.message || '';
        if (
          msg.toLowerCase().includes('already registered') ||
          msg.toLowerCase().includes('already exists') ||
          msg.toLowerCase().includes('user already exists')
        ) {
          setIsDuplicateUser(true);
          setErrorMsg('An account with this email already exists. Please sign in.');
          toast.error('Account already registered');
        } else {
          setIsDuplicateUser(false);
          setErrorMsg(msg || 'Registration failed. Please check your details and try again.');
          toast.error('Registration failed');
        }
      } else {
        // Clear form state completely
        setBusinessName('');
        setStoreName('');
        setEmail('');
        setPassword('');
        toast.success('Account successfully created! Please sign in with your credentials.');
        navigate(`/auth/login?registered=true&email=${encodeURIComponent(cleanEmail)}`);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred during registration. Please try again.');
      setIsDuplicateUser(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout badgeText="Seller Onboarding">
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

        {/* Form Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
            Create Merchant Account
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Set up your dedicated wholesale portal with catalog isolation, RFQ inbox, and multi-tier pricing.
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
                {isDuplicateUser && (
                  <div className="mt-2">
                    <Link
                      href={`/auth/login?email=${encodeURIComponent(email.trim())}`}
                      className="inline-flex items-center gap-1 font-bold text-red-800 dark:text-[#CCFF00] hover:underline"
                    >
                      Click here to sign in now →
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Legal Business Name */}
          <div>
            <label
              htmlFor="legalBusinessName"
              className="block text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400 mb-1.5"
            >
              Legal Business Name <span className="text-[#15803D] dark:text-[#CCFF00]">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400 dark:text-neutral-500">
                <Building2 size={15} />
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
                className="w-full rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#0D1117] pl-10 pr-4 py-3.5 text-xs font-semibold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] shadow-sm"
              />
            </div>
          </div>

          {/* Field 2: Store Display Name (Completely independent) */}
          <div>
            <label
              htmlFor="storeDisplayName"
              className="block text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400 mb-1.5"
            >
              Store Display Name (Storefront Brand)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400 dark:text-neutral-500">
                <ShoppingBag size={15} />
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
                placeholder="e.g. Apex Official Store (Optional, defaults to business name)"
                className="w-full rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#0D1117] pl-10 pr-4 py-3.5 text-xs font-semibold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] shadow-sm"
              />
            </div>
          </div>

          {/* Field 3: Corporate Email */}
          <div>
            <label
              htmlFor="corporateEmail"
              className="block text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400 mb-1.5"
            >
              Corporate Email Address <span className="text-[#15803D] dark:text-[#CCFF00]">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400 dark:text-neutral-500">
                <Mail size={15} />
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
                className="w-full rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#0D1117] pl-10 pr-4 py-3.5 text-xs font-semibold text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none transition focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00] shadow-sm"
              />
            </div>
          </div>

          {/* Field 4: Password */}
          <div>
            <label
              htmlFor="accountPassword"
              className="block text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400 mb-1.5"
            >
              Master Password (Min. 6 Characters) <span className="text-[#15803D] dark:text-[#CCFF00]">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400 dark:text-neutral-500">
                <Lock size={15} />
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
                  <span>Registering Merchant Account...</span>
                </>
              ) : (
                <>
                  <span>Create Merchant Account</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing User Link */}
        <div className="pt-2 text-center text-xs text-neutral-600 dark:text-neutral-400">
          Already have a merchant portal account?{' '}
          <Link
            href="/auth/login"
            className="font-bold text-neutral-900 dark:text-[#CCFF00] hover:underline"
          >
            Sign in to Seller Central →
          </Link>
        </div>
      </motion.div>
    </AuthSplitLayout>
  );
}
