import { useState, useEffect, useCallback } from 'react';
import { supabase, getLiveCatalog, type SupabaseProduct } from './supabase';

/**
 * Live Supabase Products Hook
 * 100% dynamic binding to the `products` table in instance deldhtqoygpoozbrfpgv.
 * Subscribes to realtime Postgres changes for live inventory updates.
 */
export function useLiveProducts(sellerId?: string | null) {
  const [products, setProducts] = useState<SupabaseProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await getLiveCatalog(sellerId);
      setProducts(data || []);
      setError(null);
    } catch (err: any) {
      console.warn('Supabase fetch error:', err);
      setError(err?.message || 'Failed to fetch live catalog');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchProducts();

    // Subscribe to realtime changes on products table
    const channel = supabase
      .channel(`products-rt-${sellerId || 'scoped'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts, sellerId]);

  return { products, setProducts, isLoading, error, refresh: fetchProducts };
}
