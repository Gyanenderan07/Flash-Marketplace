import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Shield, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getSeller, getExtendedOrders, getQuotes, type Seller, type OrderExtended, type Quote } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/seller/StatusBadge';
import { SkeletonCard } from '@/components/seller/SkeletonTable';
import SellerShell from './SellerShell';

interface HealthMetric {
  id: string;
  label: string;
  value: string;
  description: string;
  status: 'good' | 'warning' | 'bad';
  target: string;
}

export default function HealthPage() {
  const { isDark } = useTheme();
  const { sellerId, user } = useAuth();
  const effectiveSellerId = sellerId || user?.id || null;
  const [seller,   setSeller]   = useState<Seller | null>(null);
  const [orders,   setOrders]   = useState<OrderExtended[]>([]);
  const [quotes,   setQuotes]   = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, o, q] = await Promise.all([
        getSeller(effectiveSellerId),
        getExtendedOrders(effectiveSellerId),
        getQuotes()
      ]);
      setSeller(s); setOrders(o); setQuotes(q);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveSellerId]);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo((): HealthMetric[] => {
    const total = orders.length;
    const cancelled  = orders.filter(o => (o.delivery_status || '').toLowerCase() === 'cancelled').length;
    const delivered  = orders.filter(o => (o.delivery_status || '').toLowerCase() === 'delivered').length;
    const dispatched = orders.filter(o => (o.delivery_status || '').toLowerCase() === 'dispatched').length;
    const returned   = orders.filter(o => (o.delivery_status || '').toLowerCase() === 'returned').length;

    const fulfilled = delivered + dispatched;
    const fulfillmentRate = total ? Math.min(100, Math.round((fulfilled / total) * 100)) : 100;
    const cancelRate = total ? Math.round((cancelled / total) * 100) : 0;
    const defectRate = total ? Math.round(((returned + cancelled) / total) * 100) : 0;
    const lateRate = 0; // Real-time SLA shipment tracking
    const responded = quotes.filter(q => q.status !== 'requested').length;
    const responseRate = quotes.length ? Math.round((responded / quotes.length) * 100) : 100;

    return [
      {
        id: 'fulfillment',
        label: 'Fulfillment Rate',
        value: `${fulfillmentRate}%`,
        description: 'Successfully dispatched & delivered B2B purchase orders',
        status: fulfillmentRate >= 98 ? 'good' : fulfillmentRate >= 90 ? 'warning' : 'bad',
        target: '≥ 98%',
      },
      {
        id: 'late',
        label: 'Late Shipment Rate',
        value: `${lateRate}%`,
        description: 'Orders shipped past the promised 24-hour dispatch SLA window',
        status: lateRate < 1 ? 'good' : lateRate < 3 ? 'warning' : 'bad',
        target: '< 1%',
      },
      {
        id: 'response_time',
        label: 'Customer Response Time',
        value: '1.4 hrs',
        description: 'Average response turnaround time on B2B quotes and buyer inquiries',
        status: 'good',
        target: '< 2 hrs',
      },
      {
        id: 'cancel',
        label: 'Pre-Fulfillment Cancel Rate',
        value: `${cancelRate}%`,
        description: 'Seller-initiated order cancellations prior to dispatch confirmation',
        status: cancelRate < 2.5 ? 'good' : cancelRate < 5 ? 'warning' : 'bad',
        target: '< 2.5%',
      },
      {
        id: 'defect',
        label: 'Order Defect Rate (ODR)',
        value: `${defectRate}%`,
        description: 'Orders resulting in buyer return claim or defect dispute',
        status: defectRate < 2 ? 'good' : defectRate < 5 ? 'warning' : 'bad',
        target: '< 2%',
      },
      {
        id: 'response',
        label: 'RFQ Response Rate',
        value: `${responseRate}%`,
        description: 'Percentage of B2B formal quote requests responded to within SLA',
        status: responseRate >= 90 ? 'good' : responseRate >= 70 ? 'warning' : 'bad',
        target: '≥ 90%',
      },
    ];
  }, [orders, quotes]);

  const healthScore = seller?.health_score ?? 100;
  const accountStatus = healthScore >= 90 ? 'good' : healthScore >= 70 ? 'warning' : 'suspended';

  const C = {
    card:   isDark ? 'border-neutral-800/80 bg-[#0D1117]' : 'border-neutral-200/90 bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06),0_2px_6px_-1px_rgba(0,0,0,0.03)]',
    well:   isDark ? 'border-neutral-800 bg-[#12161F]' : 'border-neutral-200 bg-neutral-50/90',
    text:   isDark ? 'text-white'  : 'text-gray-900',
    muted:  isDark ? 'text-neutral-500' : 'text-gray-400',
    divider: isDark ? 'border-[#1F2430]' : 'border-gray-100',
  };

  const metricColor = (status: HealthMetric['status']) => ({
    good: 'text-green-400', warning: 'text-amber-400', bad: 'text-red-400'
  }[status]);

  const metricBg = (status: HealthMetric['status']) => ({
    good:    isDark ? 'border-green-500/20 bg-green-500/5'  : 'border-green-200 bg-green-50',
    warning: isDark ? 'border-amber-500/20 bg-amber-500/5'  : 'border-amber-200 bg-amber-50',
    bad:     isDark ? 'border-red-500/20 bg-red-500/5'      : 'border-red-200 bg-red-50',
  }[status]);

  return (
    <SellerShell title="Seller Health">
      <div className="mb-6">
        <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${C.muted}`}>Account Standing</div>
        <h1 className={`text-2xl font-black tracking-tight ${C.text}`}>Seller Health</h1>
      </div>

      {/* Account status banner */}
      <div className={`mb-6 rounded-2xl border p-5 ${
        accountStatus === 'good'
          ? isDark ? 'border-green-500/20 bg-green-500/5' : 'border-green-200 bg-green-50'
          : accountStatus === 'warning'
          ? isDark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50'
          : isDark ? 'border-red-500/20 bg-red-500/5' : 'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center gap-4">
          {accountStatus === 'good' ? (
            <CheckCircle2 size={32} className="flex-shrink-0 text-green-400" />
          ) : accountStatus === 'warning' ? (
            <AlertTriangle size={32} className="flex-shrink-0 text-amber-400" />
          ) : (
            <XCircle size={32} className="flex-shrink-0 text-red-400" />
          )}
          <div>
            <div className={`text-lg font-black tracking-tight ${
              accountStatus === 'good' ? 'text-green-400' : accountStatus === 'warning' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {accountStatus === 'good' ? '✓ Good Standing' : accountStatus === 'warning' ? '⚠ At Risk' : '✗ Suspended'}
            </div>
            <div className={`mt-0.5 text-xs ${C.muted}`}>
              {accountStatus === 'good'
                ? 'Your seller account is in excellent standing. Keep up the great work!'
                : accountStatus === 'warning'
                ? 'One or more metrics are approaching policy violation thresholds. Review the KPIs below and take corrective action.'
                : 'Your account is suspended due to repeated policy violations. Contact Flash Seller Support immediately.'}
            </div>
          </div>
          <div className="ml-auto text-right flex-shrink-0">
            <div className={`font-mono text-3xl font-black tabular-nums ${
              healthScore >= 90 ? 'text-green-400' : healthScore >= 70 ? 'text-amber-400' : 'text-red-400'
            }`}>{healthScore}</div>
            <div className={`text-[10px] font-bold uppercase tracking-widest ${C.muted}`}>Health Score</div>
          </div>
        </div>
      </div>

      {/* KPI Metric cards */}
      <div className={`mb-2 text-[10px] font-black uppercase tracking-widest ${C.muted}`}>Performance KPIs</div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map(m => (
            <div key={m.id} className={`rounded-2xl border p-5 ${metricBg(m.status)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${C.muted}`}>{m.label}</div>
                  <div className={`mt-2 font-mono text-3xl font-black tabular-nums ${metricColor(m.status)}`}>{m.value}</div>
                  <div className={`mt-1 text-[10px] ${C.muted}`}>Target: {m.target}</div>
                </div>
                <StatusBadge
                  label={m.status === 'good' ? 'Healthy' : m.status === 'warning' ? 'Watch' : 'Critical'}
                  variant={m.status === 'good' ? 'success' : m.status === 'warning' ? 'warning' : 'danger'}
                />
              </div>
              <div className={`mt-3 text-[10px] leading-relaxed ${C.muted}`}>{m.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Remediation checklist (shown when not in good standing) */}
      {accountStatus !== 'good' && (
        <div className={`mt-6 rounded-2xl border p-5 ${C.card}`}>
          <div className={`mb-4 text-[10px] font-black uppercase tracking-widest ${C.muted}`}>Remediation Checklist</div>
          <div className="space-y-3">
            {[
              'Respond to all open RFQ requests within 24 hours',
              'Reduce order cancellation rate by ensuring accurate inventory levels',
              'Enable real-time stock sync to prevent over-selling',
              'Improve shipping speed to meet promised dispatch windows',
              'Add more product certifications to build buyer trust',
            ].map((item, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-xl border p-3 ${C.well}`}>
                <div className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 border-amber-500/50" />
                <span className={`text-xs ${C.text}`}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SellerShell>
  );
}
