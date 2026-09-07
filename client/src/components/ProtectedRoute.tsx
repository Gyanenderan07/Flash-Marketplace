import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth/login');
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-[#000000] text-white">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="grid h-16 w-16 place-items-center rounded-2xl bg-[#CCFF00] text-black shadow-[0_0_30px_rgba(204,255,0,0.5)]"
          >
            <Zap size={32} fill="currentColor" />
          </motion.div>
          <div className="flex flex-col items-center">
            <div className="text-xs font-black uppercase tracking-widest text-[#CCFF00]">
              Flash Business
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Verifying Tenant Session…
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
