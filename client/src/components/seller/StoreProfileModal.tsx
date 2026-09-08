import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Store,
  Building2,
  FileText,
  ShieldCheck,
  Clock,
  Loader2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { updateSeller, type Seller } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface StoreProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'identity' | 'legal' | 'policies';

export function StoreProfileModal({ isOpen, onClose }: StoreProfileModalProps) {
  const { sellerProfile, user, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('identity');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [storeName, setStoreName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [policies, setPolicies] = useState({
    shipping: '',
    returns: '',
    warranty: '',
  });

  // Sync state whenever profile opens or changes
  useEffect(() => {
    if (isOpen) {
      setStoreName(
        sellerProfile?.store_name ||
        (sellerProfile as any)?.store_name ||
        user?.user_metadata?.store_name ||
        sellerProfile?.business_name ||
        'Nile Store'
      );
      setBusinessName(sellerProfile?.business_name || user?.user_metadata?.business_name || 'Flash Merchant');
      setLegalName(sellerProfile?.legal_name || '');
      setTaxId(sellerProfile?.tax_id || '');
      setLogoUrl(sellerProfile?.store_logo_url || '');
      setBannerUrl(sellerProfile?.store_banner_url || '');
      setPolicies({
        shipping: sellerProfile?.policies?.shipping || 'Orders dispatched within 24 hours via Delhivery Express.',
        returns: sellerProfile?.policies?.returns || '30-day B2B return window for defective or damaged goods.',
        warranty: sellerProfile?.policies?.warranty || '1-year standard manufacturer replacement warranty.',
      });
      setActiveTab('identity');
    }
  }, [isOpen, sellerProfile, user]);

  // Handle ESC key dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      toast.error('Store display name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const patch: Partial<Seller> = {
        store_name: storeName.trim(),
        business_name: businessName.trim() || storeName.trim(),
        legal_name: legalName.trim() || null,
        tax_id: taxId.trim() || null,
        store_logo_url: logoUrl.trim() || null,
        store_banner_url: bannerUrl.trim() || null,
        policies: {
          shipping: policies.shipping.trim(),
          returns: policies.returns.trim(),
          warranty: policies.warranty.trim(),
        },
      };

      await updateSeller(patch, sellerProfile?.id || user?.id);
      await refreshProfile();

      toast.success('Store Profile & Business Details saved successfully!');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update store profile';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialLetter = (storeName || businessName || 'M').charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-[#FFFFFF] dark:bg-[#0D1117] text-neutral-900 dark:text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] z-10 my-8"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800/80 px-6 py-5 bg-neutral-50/50 dark:bg-neutral-900/30">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CCFF00] text-black font-black text-base shadow-[0_0_15px_rgba(204,255,0,0.35)] shrink-0">
                  {initialLetter}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight uppercase text-neutral-900 dark:text-white">
                      Store Profile &amp; Business Identity
                    </h2>
                    <span className="flex items-center gap-1 rounded-full border border-emerald-800/60 bg-emerald-950/60 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-400">
                      <ShieldCheck size={11} />
                      {sellerProfile?.kyc_status === 'verified' ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Live settings update the merchant navbar badge and public B2B storefront metadata.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-full p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Header Badge Preview Bar */}
            <div className="border-b border-neutral-200 dark:border-neutral-800/60 bg-neutral-100/60 dark:bg-[#12161F]/60 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#CCFF00]" />
                Header Badge Live Preview:
              </span>

              {/* Exact Mock Badge */}
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-700/80 shadow-sm">
                <span className="h-6 w-6 rounded-full bg-[#CCFF00] text-black font-black text-xs flex items-center justify-center select-none shadow-[0_0_8px_rgba(204,255,0,0.4)]">
                  {initialLetter}
                </span>
                <span className="text-xs font-bold text-white truncate max-w-[140px]">
                  {storeName || 'My Store'}
                </span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  {sellerProfile?.kyc_status === 'verified' ? 'VERIFIED' : 'PENDING'}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800/80 px-6 bg-neutral-50/30 dark:bg-neutral-900/10">
              <button
                type="button"
                onClick={() => setActiveTab('identity')}
                className={`flex items-center gap-2 py-3.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'identity'
                    ? 'border-[#CCFF00] text-neutral-900 dark:text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <Store size={14} />
                Storefront Identity
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('legal')}
                className={`flex items-center gap-2 py-3.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'legal'
                    ? 'border-[#CCFF00] text-neutral-900 dark:text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <Building2 size={14} />
                Legal &amp; Tax Entity
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('policies')}
                className={`flex items-center gap-2 py-3.5 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === 'policies'
                    ? 'border-[#CCFF00] text-neutral-900 dark:text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <FileText size={14} />
                Merchant Policies
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4">
                {activeTab === 'identity' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                        Store Display Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={storeName}
                          onChange={e => setStoreName(e.target.value)}
                          placeholder="e.g. Nile Store, Northstar Components"
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#12161F] px-4 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-[#CCFF00] focus:outline-none transition"
                        />
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Shown in the header navbar badge and as the verified supplier on buyer catalog items.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                        Business Trading Name
                      </label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        placeholder="e.g. Nile Wholesale Global"
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#12161F] px-4 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-[#CCFF00] focus:outline-none transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                          Store Logo URL (Optional)
                        </label>
                        <input
                          type="url"
                          value={logoUrl}
                          onChange={e => setLogoUrl(e.target.value)}
                          placeholder="https://.../logo.png"
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#12161F] px-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-[#CCFF00] focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                          Store Banner URL (Optional)
                        </label>
                        <input
                          type="url"
                          value={bannerUrl}
                          onChange={e => setBannerUrl(e.target.value)}
                          placeholder="https://.../banner.jpg"
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#12161F] px-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-[#CCFF00] focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'legal' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                        Registered Legal Entity Name
                      </label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={e => setLegalName(e.target.value)}
                        placeholder="e.g. Nile Logistics India Private Limited"
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#12161F] px-4 py-2.5 text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-[#CCFF00] focus:outline-none transition"
                      />
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Must match your corporate tax filings and official GST/VAT registration.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                        GSTIN / Tax ID / EIN
                      </label>
                      <input
                        type="text"
                        value={taxId}
                        onChange={e => setTaxId(e.target.value.toUpperCase())}
                        placeholder="e.g. 27AABCU9603R1ZM"
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#12161F] px-4 py-2.5 font-mono text-sm font-bold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-[#CCFF00] focus:outline-none transition uppercase"
                      />
                    </div>

                    {/* Verification Card */}
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-[#12161F] p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-900 dark:text-white">
                            Enterprise Merchant Health Index
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            Current Seller Score: <span className="font-mono font-bold text-[#CCFF00]">{sellerProfile?.health_score || 98}/100</span> (Prime B2B Supplier)
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                        {sellerProfile?.kyc_status || 'VERIFIED'}
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === 'policies' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                        Shipping &amp; Fulfillment SLA
                      </label>
                      <textarea
                        rows={2}
                        value={policies.shipping}
                        onChange={e => setPolicies(p => ({ ...p, shipping: e.target.value }))}
                        placeholder="e.g. Dispatches within 24 hours via Delhivery Express."
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#12161F] px-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-[#CCFF00] focus:outline-none transition resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                        Return &amp; Refund Policy
                      </label>
                      <textarea
                        rows={2}
                        value={policies.returns}
                        onChange={e => setPolicies(p => ({ ...p, returns: e.target.value }))}
                        placeholder="e.g. 30-day B2B returns for unopened freight orders."
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#12161F] px-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-[#CCFF00] focus:outline-none transition resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                        Warranty &amp; Service SLA
                      </label>
                      <textarea
                        rows={2}
                        value={policies.warranty}
                        onChange={e => setPolicies(p => ({ ...p, warranty: e.target.value }))}
                        placeholder="e.g. 1-year manufacturer warranty with doorstep replacement."
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#12161F] px-4 py-2.5 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:border-[#CCFF00] focus:outline-none transition resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 px-6 py-4 bg-neutral-50/50 dark:bg-neutral-900/30">
                <span className="text-[11px] text-neutral-500 font-mono">
                  Seller UID: {user?.id ? `${user.id.slice(0, 8)}...` : 'demo-seller'}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="rounded-full border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-full bg-[#CCFF00] px-5 py-2 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_15px_rgba(204,255,0,0.3)] hover:shadow-[0_0_24px_rgba(204,255,0,0.5)] transition active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
