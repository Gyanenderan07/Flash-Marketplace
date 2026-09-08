import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Seller } from '@/lib/seller-types';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  sellerProfile: Seller | null;
  sellerId: string | null;
  storeName: string;
  businessName: string;
  isVerified: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (businessName: string, storeName: string, email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sellerProfile, setSellerProfile] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch or initialize merchant profile for the authenticated user
  const fetchSellerProfile = useCallback(async (authUser: User): Promise<Seller | null> => {
    try {
      // 1. Check if a seller record exists matching auth_user_id or id
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .or(`auth_user_id.eq.${authUser.id},id.eq.${authUser.id}`)
        .maybeSingle();

      if (data && !error) {
        return data as Seller;
      }

      // 2. If no record found, create merchant profile for this user
      const bName = (authUser.user_metadata?.business_name as string) || authUser.email?.split('@')[0] || 'Flash Merchant';
      const sName = (authUser.user_metadata?.store_name as string) || bName;

      const newSellerPayload: Record<string, unknown> = {
        id: authUser.id,
        auth_user_id: authUser.id,
        business_name: bName,
        store_name: sName,
        legal_name: bName,
        kyc_status: 'verified',
        health_score: 98,
      };

      // Try inserting with store_name
      let insertRes = await supabase.from('sellers').insert([newSellerPayload]).select().maybeSingle();

      // If store_name column does not exist on legacy table schema, fallback without it
      if (insertRes.error && insertRes.error.message?.includes('store_name')) {
        delete newSellerPayload.store_name;
        insertRes = await supabase.from('sellers').insert([newSellerPayload]).select().maybeSingle();
      }

      if (insertRes.data) {
        return insertRes.data as Seller;
      }
    } catch (err) {
      console.warn('Error in fetchSellerProfile:', err);
    }

    // Fallback in-memory representation
    return {
      id: authUser.id,
      auth_user_id: authUser.id,
      business_name: (authUser.user_metadata?.business_name as string) || (authUser.user_metadata?.store_name as string) || 'Flash Merchant',
      legal_name: (authUser.user_metadata?.business_name as string) || 'Flash Merchant',
      tax_id: null,
      kyc_status: 'verified',
      store_logo_url: null,
      store_banner_url: null,
      policies: null,
      health_score: 100,
      created_at: new Date().toISOString(),
    };
  }, []);

  // Rehydrate session & profile on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession error:', error.message);
        }

        if (initialSession?.user && isMounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          const profile = await fetchSellerProfile(initialSession.user);
          if (isMounted) setSellerProfile(profile);
        } else if (isMounted) {
          setSession(null);
          setUser(null);
          setSellerProfile(null);
        }
      } catch (err) {
        console.error('Failed to initialize auth session:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    // Real-time auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);
        setUser(newSession?.user || null);

        if (newSession?.user) {
          const profile = await fetchSellerProfile(newSession.user);
          if (isMounted) setSellerProfile(profile);
        } else {
          setSellerProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchSellerProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profile = await fetchSellerProfile(user);
      setSellerProfile(profile);
    }
  }, [user, fetchSellerProfile]);

  // Sign In via Supabase Auth
  const signIn = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setIsLoading(false);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const profile = await fetchSellerProfile(data.user);
        setSellerProfile(profile);
      }
      setIsLoading(false);
      return { error: null };
    } catch (err) {
      setIsLoading(false);
      return { error: err instanceof Error ? err : new Error('Login failed') };
    }
  }, [fetchSellerProfile]);

  // Sign Up & Merchant Onboarding via Supabase Auth (does not auto-login)
  const signUp = useCallback(async (
    businessName: string,
    storeName: string,
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    setIsLoading(true);
    try {
      const bName = businessName.trim() || 'Flash Enterprise Merchant';
      const sName = storeName.trim() || bName;
      const cleanEmail = email.trim().toLowerCase();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            business_name: bName,
            store_name: sName,
          },
        },
      });

      if (authError) {
        setIsLoading(false);
        return { error: authError };
      }

      // If user is returned with empty identities, Supabase returns this when email already exists and confirm email is enabled
      if (authData.user && Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        setIsLoading(false);
        return {
          error: new Error('An account with this email already exists. Please sign in.')
        };
      }

      if (authData.user) {
        // Explicitly insert into public.sellers linked to auth user ID
        const sellerPayload: Record<string, unknown> = {
          id: authData.user.id,
          auth_user_id: authData.user.id,
          business_name: bName,
          store_name: sName,
          legal_name: bName,
          kyc_status: 'verified',
          health_score: 100,
        };

        try {
          let res = await supabase.from('sellers').insert([sellerPayload]).select().maybeSingle();
          if (res.error && res.error.message?.includes('store_name')) {
            delete sellerPayload.store_name;
            await supabase.from('sellers').insert([sellerPayload]).select().maybeSingle();
          }
        } catch (e) {
          console.warn('Seller table profile creation note:', e);
        }

        // ENFORCE LOGIN REDIRECT AFTER SIGNUP:
        // Supabase Auth auto-creates a session if email confirmation is disabled.
        // We terminate the session immediately so the merchant must explicitly log in.
        try {
          await supabase.auth.signOut();
        } catch {}

        setUser(null);
        setSession(null);
        setSellerProfile(null);
      }

      setIsLoading(false);
      return { error: null };
    } catch (err) {
      setIsLoading(false);
      return { error: err instanceof Error ? err : new Error('Registration failed') };
    }
  }, []);

  // Sign Out
  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setUser(null);
      setSession(null);
      setSellerProfile(null);
      try {
        localStorage.removeItem('flash-role');
      } catch {}
      setIsLoading(false);
    }
  }, []);

  // Computed values
  const sellerId = useMemo(() => {
    return sellerProfile?.id || user?.id || null;
  }, [sellerProfile, user]);

  const storeName = useMemo(() => {
    return (
      (sellerProfile as any)?.store_name ||
      user?.user_metadata?.store_name ||
      sellerProfile?.business_name ||
      user?.user_metadata?.business_name ||
      user?.email?.split('@')[0] ||
      'Flash Merchant'
    );
  }, [sellerProfile, user]);

  const businessName = useMemo(() => {
    return (
      sellerProfile?.business_name ||
      user?.user_metadata?.business_name ||
      'Flash Business Enterprise'
    );
  }, [sellerProfile, user]);

  const isVerified = useMemo(() => {
    return (sellerProfile?.kyc_status || 'verified') === 'verified';
  }, [sellerProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    sellerProfile,
    sellerId,
    storeName,
    businessName,
    isVerified,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }), [
    user,
    session,
    sellerProfile,
    sellerId,
    storeName,
    businessName,
    isVerified,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
