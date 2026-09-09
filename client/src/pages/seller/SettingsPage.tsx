import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { AlertCircle, Loader2, Settings2, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  getSeller, updateSeller, getTeamMembers, inviteTeamMember, removeTeamMember,
  type Seller, type SellerTeamMember, type TeamMemberRole
} from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { StatusBadge } from '@/components/seller/StatusBadge';
import { SkeletonTable } from '@/components/seller/SkeletonTable';
import { EmptyState } from '@/components/seller/EmptyState';
import { ConfirmModal } from '@/components/seller/ConfirmModal';
import SellerShell from './SellerShell';
import { smoothCenter } from '@/lib/utils';

const ROLES: TeamMemberRole[] = ['owner', 'manager', 'fulfillment_staff', 'support'];

type SettingsTab = 'profile' | 'team' | 'notifications';

export default function SettingsPage() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const settingsTabsRef = useRef<HTMLDivElement>(null);
  const activeSettingsRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeSettingsRef.current && settingsTabsRef.current) {
      smoothCenter(settingsTabsRef.current, activeSettingsRef.current);
    }
  }, [activeTab]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [members, setMembers] = useState<SellerTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SellerTeamMember | null>(null);

  // Profile form state
  const [bizName, setBizName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [policies, setPolicies] = useState({ returns: '', shipping: '', warranty: '' });

  // Team invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>('fulfillment_staff');
  const [isInviting, setIsInviting] = useState(false);

  // Notification toggles
  const [notifs, setNotifs] = useState({ newOrder: true, newRFQ: true, lowStock: true, payout: false });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, t] = await Promise.all([getSeller(), getTeamMembers()]);
      if (s) {
        setSeller(s);
        setBizName(s.business_name || '');
        setLegalName(s.legal_name || '');
        setTaxId(s.tax_id || '');
        setLogoUrl(s.store_logo_url || '');
        setPolicies({
          returns: s.policies?.returns || '',
          shipping: s.policies?.shipping || '',
          warranty: s.policies?.warranty || '',
        });
      }
      setMembers(t);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateSeller({
        business_name: bizName.trim(),
        legal_name: legalName.trim() || null,
        tax_id: taxId.trim() || null,
        store_logo_url: logoUrl.trim() || null,
        policies: { returns: policies.returns, shipping: policies.shipping, warranty: policies.warranty },
      });
      toast.success('Store profile updated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) { toast.error('Enter a valid email'); return; }
    setIsInviting(true);
    try {
      const member = await inviteTeamMember(inviteEmail.trim(), inviteRole);
      setMembers(prev => [member, ...prev]);
      setInviteEmail('');
      toast.success(`Invite sent to ${member.invited_email}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Invite failed');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setMembers(prev => prev.filter(m => m.id !== removeTarget.id));
    setRemoveTarget(null);
    try { await removeTeamMember(removeTarget.id); toast.success('Team member removed'); }
    catch { load(); }
  };

  const C = {
    card: isDark ? 'border-[#1F2430] bg-[#0D1117]' : 'border-gray-200 bg-white',
    well: isDark ? 'border-[#1F2430] bg-[#12161F]' : 'border-gray-200 bg-gray-50',
    text: isDark ? 'text-white' : 'text-gray-900',
    muted: isDark ? 'text-neutral-500' : 'text-gray-400',
    input: isDark ? 'border-[#1F2430] bg-[#12161F] text-white focus:border-[#CCFF00] placeholder:text-neutral-600' : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-[#CCFF00]',
    label: isDark ? 'text-neutral-400' : 'text-gray-500',
    divider: isDark ? 'border-[#1F2430]' : 'border-gray-100',
  };

  const inputClass = `w-full rounded-xl border px-4 py-2.5 text-xs outline-none transition ${C.input}`;
  const labelClass = `block text-[10px] font-black uppercase tracking-wider mb-1.5 ${C.label}`;

  return (
    <SellerShell title="Settings">
      <div className="mb-6">
        <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${C.muted}`}>Account & Team</div>
        <h1 className={`text-2xl font-black tracking-tight ${C.text}`}>Settings</h1>
      </div>

      {/* Tabs */}
      <LayoutGroup id="settings-tabs">
        <div
          ref={settingsTabsRef}
          className={`mb-6 flex overflow-x-auto no-scrollbar horizontal-scroll-rail gap-1.5 border-b pb-3 touch-pan-x select-none scroll-smooth ${C.divider}`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {[
            { id: 'profile', label: 'Store Profile', icon: Settings2 },
            { id: 'team', label: 'Team Members', icon: Users },
            { id: 'notifications', label: 'Notifications', icon: Settings2 },
          ].map(tab => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={isTabActive ? (el) => { activeSettingsRef.current = el; } : undefined}
                onClick={(e) => {
                  setActiveTab(tab.id as SettingsTab);
                  smoothCenter(settingsTabsRef.current, e.currentTarget);
                }}
                className={`relative shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${isTabActive
                    ? 'text-black font-extrabold shadow-[0_0_12px_rgba(204,255,0,0.25)]'
                    : `border ${C.well} ${C.muted} hover:border-[#CCFF00]/30`
                  }`}
              >
                {isTabActive && (
                  <motion.div
                    layoutId="settings-tab-pill"
                    className="absolute inset-0 rounded-full bg-[#CCFF00] z-0 shadow-[0_0_12px_rgba(204,255,0,0.3)]"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      {isLoading ? (
        <SkeletonTable rows={4} cols={3} />
      ) : (
        <>
          {/* ── Profile tab ── */}
          {activeTab === 'profile' && (
            <div className={`rounded-2xl border p-6 space-y-5 ${C.card}`}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Business Name</label>
                  <input value={bizName} onChange={e => setBizName(e.target.value)} className={inputClass} placeholder="Northstar Components" />
                </div>
                <div>
                  <label className={labelClass}>Legal Name</label>
                  <input value={legalName} onChange={e => setLegalName(e.target.value)} className={inputClass} placeholder="Northstar Components Pvt. Ltd." />
                </div>
                <div>
                  <label className={labelClass}>GST / Tax ID</label>
                  <input value={taxId} onChange={e => setTaxId(e.target.value)} className={inputClass} placeholder="27AAAAN1234F1ZW" />
                </div>
                <div>
                  <label className={labelClass}>Store Logo URL</label>
                  <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className={inputClass} placeholder="https://…" />
                </div>
              </div>

              <div className={`border-t pt-5 ${C.divider}`}>
                <div className={`mb-4 text-[10px] font-black uppercase tracking-widest ${C.muted}`}>Store Policies</div>
                <div className="space-y-4">
                  {[
                    { key: 'returns' as const, label: 'Returns Policy' },
                    { key: 'shipping' as const, label: 'Shipping Policy' },
                    { key: 'warranty' as const, label: 'Warranty Terms' },
                  ].map(p => (
                    <div key={p.key}>
                      <label className={labelClass}>{p.label}</label>
                      <textarea rows={3} value={policies[p.key]}
                        onChange={e => setPolicies(prev => ({ ...prev, [p.key]: e.target.value }))}
                        className={`w-full resize-none rounded-xl border px-4 py-2.5 text-xs outline-none transition ${C.input}`}
                        placeholder={`Enter your ${p.label.toLowerCase()}…`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                  onClick={handleSaveProfile} disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-xs font-black uppercase tracking-widest text-[#CCFF00] shadow-[0_0_16px_rgba(204,255,0,0.2)] disabled:opacity-50 transition">
                  {isSaving && <Loader2 size={12} className="animate-spin" />}
                  Save Profile
                </motion.button>
              </div>
            </div>
          )}

          {/* ── Team tab ── */}
          {activeTab === 'team' && (
            <div className="space-y-5">
              {/* Invite form */}
              <div className={`rounded-2xl border p-5 ${C.card}`}>
                <div className={`mb-4 text-[10px] font-black uppercase tracking-widest ${C.muted}`}>Invite Team Member</div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input type="email" placeholder="colleague@company.com" value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-xs outline-none transition ${C.input}`}
                    onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }} />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value as TeamMemberRole)}
                    className={`rounded-xl border px-4 py-2.5 text-xs outline-none transition ${C.input}`}>
                    {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleInvite} disabled={isInviting}
                    className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[#CCFF00] shadow-[0_0_12px_rgba(204,255,0,0.2)] disabled:opacity-50 whitespace-nowrap">
                    {isInviting ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                    Invite
                  </motion.button>
                </div>
              </div>

              {/* Members list */}
              {members.length === 0 ? (
                <EmptyState icon={Users} title="No team members yet"
                  body="Invite colleagues to manage orders, inventory, and customer queries." />
              ) : (
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${C.card}`}>
                      <div>
                        <div className={`text-xs font-bold ${C.text}`}>{m.invited_email || 'Team Member'}</div>
                        <div className={`mt-0.5 flex items-center gap-2`}>
                          <StatusBadge label={m.role.replace('_', ' ')} variant="info" />
                          <StatusBadge label={m.status} variant={m.status === 'active' ? 'success' : 'warning'} />
                        </div>
                      </div>
                      <button onClick={() => setRemoveTarget(m)}
                        className={`rounded-full border p-1.5 transition ${C.well} ${C.muted} hover:border-red-500/50 hover:text-red-400`}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Notifications tab ── */}
          {activeTab === 'notifications' && (
            <div className={`rounded-2xl border p-5 space-y-4 ${C.card}`}>
              <div className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>Notification Preferences</div>
              {[
                { key: 'newOrder' as const, label: 'New Order Alerts', sub: 'Notify when a new order is placed on the storefront' },
                { key: 'newRFQ' as const, label: 'New RFQ Requests', sub: 'Notify when a buyer submits a quote request' },
                { key: 'lowStock' as const, label: 'Low Stock Warnings', sub: 'Alert when product stock falls below threshold' },
                { key: 'payout' as const, label: 'Payout Confirmations', sub: 'Notify when a payout is processed to your account' },
              ].map(n => (
                <div key={n.key} className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${C.well}`}>
                  <div>
                    <div className={`text-xs font-bold ${C.text}`}>{n.label}</div>
                    <div className={`mt-0.5 text-[10px] ${C.muted}`}>{n.sub}</div>
                  </div>
                  <button
                    onClick={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${notifs[n.key] ? 'bg-[#CCFF00]' : isDark ? 'bg-[#1F2430]' : 'bg-gray-200'
                      }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform shadow ${notifs[n.key] ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                  </button>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => toast.success('Notification preferences saved')}
                  className="rounded-full bg-black px-6 py-2.5 text-xs font-black uppercase tracking-widest text-[#CCFF00] shadow-[0_0_12px_rgba(204,255,0,0.2)] transition">
                  Save Preferences
                </motion.button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={!!removeTarget}
        title="Remove Team Member?"
        body={`${removeTarget?.invited_email || 'This member'} will lose access to Seller Central.`}
        confirmLabel="Remove" danger
        onConfirm={handleRemove} onCancel={() => setRemoveTarget(null)}
      />
    </SellerShell>
  );
}
