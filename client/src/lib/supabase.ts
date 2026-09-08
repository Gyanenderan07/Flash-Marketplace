import { createClient } from "@supabase/supabase-js";

/**
 * Standardized Supabase Client Singleton
 * Prioritizes VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from environment variables
 * with graceful fallback to prevent build-time failures.
 */

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://deldhtqoygpoozbrfpgv.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_66X8kv19-K-kjCy3uJC33g_v0G2V4JN";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

const getProjectRef = (url: string) => {
  try {
    return new URL(url).hostname.split(".")[0] || "deldhtqoygpoozbrfpgv";
  } catch {
    return "deldhtqoygpoozbrfpgv";
  }
};

export const SUPABASE_PROJECT_ID = getProjectRef(supabaseUrl);
export const BUYER_STOREFRONT_URL = "https://flash-beryl.vercel.app";

export const VALID_CATEGORIES = [
  "Electronics",
  "Fashion",
  "Footwear",
  "Watches",
  "Home & Living",
  "Beauty",
  "Sports",
  "Accessories",
] as const;

export type ValidCategory = (typeof VALID_CATEGORIES)[number];

export interface SupabaseProduct {
  id?: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  original_price: number;
  discount?: string;
  stock: number;
  description: string;
  primary_image: string;
  hover_images?: string[];
  colors?: Array<{ name: string; hex: string }>;
  created_at?: string;
  seller_id?: string | null;
  sku?: string | null;
  moq?: number;
  status?: string;
  low_stock_threshold?: number;
  tiered_pricing?: Array<{ minQty: number; price: number }> | null;
  shipping?: Record<string, unknown> | null;
  certifications?: Record<string, string> | null;
}

export interface SupabaseOrder {
  id: string;
  total_amount: number;
  delivery_status: string;
  customer_name?: string;
  customer_email?: string;
  payment_status?: string;
  items?: unknown;
  created_at?: string;
}

export interface DatabaseHealth {
  ok: boolean;
  latencyMs: number;
  instance: string;
  skuCount: number;
  lastChecked: string;
}

/**
 * Pings Supabase products table to measure live connection health and latency
 */
export async function pingSupabase(): Promise<DatabaseHealth> {
  const start = performance.now();
  try {
    const { count, error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return {
        ok: false,
        latencyMs,
        instance: SUPABASE_PROJECT_ID,
        skuCount: 0,
        lastChecked: new Date().toLocaleTimeString(),
      };
    }

    return {
      ok: true,
      latencyMs,
      instance: SUPABASE_PROJECT_ID,
      skuCount: count || 0,
      lastChecked: new Date().toLocaleTimeString(),
    };
  } catch {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      instance: SUPABASE_PROJECT_ID,
      skuCount: 0,
      lastChecked: new Date().toLocaleTimeString(),
    };
  }
}

/**
 * Retrieves the live product catalog ordered by created_at desc, strictly scoped to active seller
 */
export async function getLiveCatalog(sellerId?: string | null): Promise<SupabaseProduct[]> {
  try {
    let resolvedId = sellerId;
    if (resolvedId === undefined) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        resolvedId = user.id;
      }
    }

    // Strict multi-tenant isolation: if no authenticated user or seller ID is provided, return empty
    if (!resolvedId) {
      return [];
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", resolvedId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase products fetch warning:", error.message);
      return [];
    }
    return (data as SupabaseProduct[]) || [];
  } catch (err) {
    console.error("Supabase fetch failed:", err);
    return [];
  }
}

/**
 * Retrieves all active products across all sellers for the public buyer storefront
 */
export async function getPublicCatalog(): Promise<SupabaseProduct[]> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Public catalog fetch warning:", error.message);
      return [];
    }
    return (data as SupabaseProduct[]) || [];
  } catch (err) {
    console.error("Public catalog fetch error:", err);
    return [];
  }
}

/**
 * Retrieves live orders from the orders table, optionally scoped to active seller
 */
export async function getLiveOrders(sellerId?: string | null): Promise<SupabaseOrder[]> {
  try {
    let query = supabase.from("orders").select("*");
    if (sellerId) {
      query = query.eq("seller_id", sellerId);
    }
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase orders fetch warning:", error.message);
      return [];
    }
    return (data as SupabaseOrder[]) || [];
  } catch (err) {
    console.error("Supabase orders query failed:", err);
    return [];
  }
}

/**
 * Computes dashboard KPIs directly from live Supabase tables, scoped to seller
 */
export async function getDashboardMetrics(sellerId?: string | null): Promise<{
  grossRevenue: number;
  pendingOrders: number;
  totalOrders: number;
  skuCount: number;
  healthIndex: number;
}> {
  try {
    let prodQuery = supabase.from("products").select("id", { count: "exact", head: true });
    let orderQuery = supabase.from("orders").select("total_amount, delivery_status, payment_status");

    if (sellerId) {
      prodQuery = prodQuery.eq("seller_id", sellerId);
      orderQuery = orderQuery.eq("seller_id", sellerId);
    }

    const [productsRes, ordersRes] = await Promise.all([
      prodQuery,
      orderQuery,
    ]);

    const skuCount = productsRes.count || 0;
    const orders = ordersRes.data || [];

    const grossRevenue = orders.reduce((sum, o) => {
      const amt = Number(o.total_amount) || 0;
      return sum + amt;
    }, 0);

    const pendingOrders = orders.filter(
      (o) => (o.delivery_status || "").toLowerCase() === "pending"
    ).length;

    return {
      grossRevenue,
      pendingOrders,
      totalOrders: orders.length,
      skuCount,
      healthIndex: 98,
    };
  } catch (err) {
    console.error("Error computing dashboard metrics:", err);
    return {
      grossRevenue: 0,
      pendingOrders: 0,
      totalOrders: 0,
      skuCount: 0,
      healthIndex: 98,
    };
  }
}

/**
 * Inserts a new product directly into the shared Supabase products table
 * Enforces status: 'active' by default and auto-generates SKU if omitted.
 */
export async function insertProductToCatalog(
  product: Partial<SupabaseProduct> & { name: string; price: number },
  sellerId?: string | null
) {
  const price = Number(product.price);
  const origPrice = Number(product.original_price || product.price);
  const discountVal =
    origPrice > price
      ? `-${Math.round(((origPrice - price) / origPrice) * 100)}%`
      : "-0%";

  const catFormatted = (product.category || "Electronics")
    .trim()
    .toLowerCase()
    .replace(/ & /g, "-")
    .replace(/\s+/g, "-");

  const primaryImg =
    (product.primary_image || "").trim() ||
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80";

  const hoverImgs = (product.hover_images && product.hover_images.length > 0)
    ? product.hover_images.filter(Boolean)
    : [primaryImg];

  // Auto-generate SKU fallback if empty
  const skuVal = (product.sku || "").trim() || `FL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  let resolvedSellerId = sellerId || product.seller_id;
  if (!resolvedSellerId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        resolvedSellerId = user.id;
      }
    } catch {}
  }
  if (!resolvedSellerId) {
    resolvedSellerId = '00000000-0000-0000-0000-000000000001';
  }

  const payload = {
    name: product.name.trim(),
    brand: (product.brand || "Flash Verified").trim(),
    category: catFormatted,
    price: price,
    original_price: origPrice,
    discount: discountVal,
    stock: Number(product.stock ?? 10),
    description: (product.description || "Flash verified wholesale product.").trim(),
    primary_image: primaryImg,
    hover_images: hoverImgs,
    colors: product.colors?.length ? product.colors : [{ name: "Obsidian", hex: "#0F1115" }],
    // Extended migration columns with enterprise defaults
    sku: skuVal,
    status: product.status || 'active',
    moq: Math.max(1, Number(product.moq ?? 1)),
    low_stock_threshold: Math.max(0, Number(product.low_stock_threshold ?? 5)),
    tiered_pricing: product.tiered_pricing || null,
    seller_id: resolvedSellerId,
    shipping: product.shipping || null,
    certifications: product.certifications || null,
  };

  const { data, error } = await supabase.from("products").insert([payload]).select();
  if (error) {
    throw error;
  }
  return data?.[0] as SupabaseProduct;
}

/**
 * Updates an existing product in Supabase, optionally scoped to seller
 */
export async function updateProductInCatalog(id: string, product: Partial<SupabaseProduct>, sellerId?: string | null) {
  const payload: Record<string, unknown> = { ...product };

  if (product.price !== undefined || product.original_price !== undefined) {
    const orig = Number(product.original_price || product.price || 0);
    const pr = Number(product.price || 0);
    if (orig > pr && orig > 0) {
      payload.discount = `-${Math.round(((orig - pr) / orig) * 100)}%`;
    } else {
      payload.discount = "-0%";
    }
  }

  if (product.category) {
    payload.category = product.category
      .trim()
      .toLowerCase()
      .replace(/ & /g, "-")
      .replace(/\s+/g, "-");
  }

  if (product.primary_image) {
    payload.primary_image = product.primary_image.trim();
    if (!product.hover_images || product.hover_images.length === 0) {
      payload.hover_images = [product.primary_image.trim()];
    }
  }

  if (product.hover_images && product.hover_images.length > 0) {
    payload.hover_images = product.hover_images.filter(Boolean);
  }

  if (product.moq !== undefined) {
    payload.moq = Math.max(1, Number(product.moq));
  }

  if (product.low_stock_threshold !== undefined) {
    payload.low_stock_threshold = Math.max(0, Number(product.low_stock_threshold));
  }

  if (product.tiered_pricing !== undefined) {
    payload.tiered_pricing = product.tiered_pricing;
  }

  if (product.status) {
    payload.status = product.status;
  }

  let query = supabase.from("products").update(payload).eq("id", id);
  if (sellerId) {
    query = query.eq("seller_id", sellerId);
  }

  const { data, error } = await query.select();
  if (error) {
    throw error;
  }
  return data?.[0] as SupabaseProduct;
}

/**
 * Quick inline inventory stock adjustment, scoped to seller
 */
export async function updateProductStock(id: string, newStock: number, sellerId?: string | null) {
  const sanitizedStock = Math.max(0, Math.floor(newStock));
  let query = supabase
    .from("products")
    .update({ stock: sanitizedStock, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (sellerId) {
    query = query.eq("seller_id", sellerId);
  }

  const { data, error } = await query.select();

  if (error) {
    throw error;
  }
  return data?.[0] as SupabaseProduct;
}

/**
 * Decrements product inventory stock upon order placement / checkout
 */
export async function decrementProductStock(id: string, quantity: number) {
  try {
    const { data: prod } = await supabase
      .from("products")
      .select("stock")
      .eq("id", id)
      .single();

    if (!prod) return null;
    const currentStock = Number(prod.stock) || 0;
    const newStock = Math.max(0, currentStock - quantity);

    const { data, error } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", id)
      .select();

    if (error) throw error;
    return data?.[0] as SupabaseProduct;
  } catch (err) {
    console.error("Error decrementing stock:", err);
    return null;
  }
}

/**
 * Deletes a product from the live catalog, scoped to seller
 */
export async function deleteProductFromCatalog(id: string, sellerId?: string | null) {
  let query = supabase.from("products").delete().eq("id", id);
  if (sellerId) {
    query = query.eq("seller_id", sellerId);
  }
  const { error } = await query;
  if (error) {
    throw error;
  }
  return true;
}

/**
 * Generates live buyer storefront URL for a product
 */
export function getBuyerProductUrl(id?: string): string {
  if (!id) return BUYER_STOREFRONT_URL;
  return `${BUYER_STOREFRONT_URL}/product/${id}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SELLER CENTRAL — NEW QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Seller, ProductExtended, ProductPriceTier, ProductVariant,
  OrderExtended, Quote, Return, Promotion, Payout, LedgerEntry,
  SellerTeamMember, QuoteThreadMessage, StatusTimelineEntry,
  TeamMemberRole
} from './seller-types';
export type {
  Seller, ProductExtended, ProductPriceTier, ProductVariant,
  OrderExtended, Quote, Return, Promotion, Payout, LedgerEntry,
  SellerTeamMember, QuoteThreadMessage, StatusTimelineEntry,
  TeamMemberRole
};
export { DEMO_SELLER_ID } from './seller-types';

/**
 * Fetch the seller profile row, scoped by sellerId or current authenticated user
 */
export async function getSeller(sellerId?: string | null): Promise<Seller | null> {
  try {
    let targetId = sellerId;
    if (!targetId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) targetId = user.id;
    }
    if (!targetId) {
      targetId = '00000000-0000-0000-0000-000000000001';
    }
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .or(`id.eq.${targetId},auth_user_id.eq.${targetId}`)
      .maybeSingle();
    if (error) { console.warn('getSeller:', error.message); return null; }
    return data as Seller;
  } catch { return null; }
}

/**
 * Update seller profile fields
 */
export async function updateSeller(patch: Partial<Seller>, sellerId?: string | null): Promise<Seller | null> {
  try {
    let targetId = sellerId;
    const { data: { user } } = await supabase.auth.getUser();
    if (!targetId && user?.id) {
      targetId = user.id;
    }
    if (!targetId) {
      targetId = '00000000-0000-0000-0000-000000000001';
    }

    const payload: Record<string, unknown> = { ...patch };

    // Sync store_name / business_name to user_metadata if available
    if (user && (payload.store_name || payload.business_name)) {
      try {
        await supabase.auth.updateUser({
          data: {
            ...(payload.store_name ? { store_name: payload.store_name } : {}),
            ...(payload.business_name ? { business_name: payload.business_name } : {}),
          },
        });
      } catch {
        // Non-critical if auth metadata update fails
      }
    }

    let { data, error } = await supabase
      .from('sellers')
      .update(payload)
      .or(`id.eq.${targetId},auth_user_id.eq.${targetId}`)
      .select()
      .maybeSingle();

    // If store_name column is missing on remote database schema, retry without it
    if (error && error.message?.includes('store_name')) {
      delete payload.store_name;
      const retry = await supabase
        .from('sellers')
        .update(payload)
        .or(`id.eq.${targetId},auth_user_id.eq.${targetId}`)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return (data as Seller) || null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(msg);
  }
}

/**
 * Fetch the full extended products list, strictly scoped to seller
 */
export async function getExtendedCatalog(sellerId?: string | null): Promise<ProductExtended[]> {
  try {
    let resolvedId = sellerId;
    if (resolvedId === undefined) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        resolvedId = user.id;
      }
    }

    // Strict multi-tenant isolation: do not leak products if unauthenticated
    if (!resolvedId) {
      return [];
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', resolvedId)
      .order('created_at', { ascending: false });

    if (error) { console.warn('getExtendedCatalog:', error.message); return []; }
    return (data as ProductExtended[]) || [];
  } catch { return []; }
}

/**
 * Fetch price tiers for a product
 */
export async function getPriceTiers(productId: string): Promise<ProductPriceTier[]> {
  try {
    const { data, error } = await supabase
      .from('product_price_tiers')
      .select('*')
      .eq('product_id', productId)
      .order('min_qty', { ascending: true });
    if (error) { console.warn('getPriceTiers:', error.message); return []; }
    return (data as ProductPriceTier[]) || [];
  } catch { return []; }
}

/**
 * Upsert price tiers for a product (replace all)
 */
export async function upsertPriceTiers(
  productId: string,
  tiers: Array<{ min_qty: number; unit_price: number }>
): Promise<void> {
  await supabase.from('product_price_tiers').delete().eq('product_id', productId);
  if (tiers.length === 0) return;
  await supabase.from('product_price_tiers').insert(
    tiers.map(t => ({ product_id: productId, seller_id: '00000000-0000-0000-0000-000000000001', ...t }))
  );
}

/**
 * Fetch variants for a product
 */
export async function getVariants(productId: string): Promise<ProductVariant[]> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId);
    if (error) { console.warn('getVariants:', error.message); return []; }
    return (data as ProductVariant[]) || [];
  } catch { return []; }
}

/**
 * Fetch extended orders, optionally scoped to seller
 */
export async function getExtendedOrders(sellerId?: string | null): Promise<OrderExtended[]> {
  try {
    let query = supabase.from('orders').select('*');
    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) { console.warn('getExtendedOrders:', error.message); return []; }
    return (data as OrderExtended[]) || [];
  } catch { return []; }
}

/**
 * Update order carrier / tracking / status_timeline
 */
export async function dispatchOrder(
  orderId: string,
  patch: Partial<OrderExtended>
): Promise<OrderExtended | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw error;
    return data as OrderExtended;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(msg);
  }
}

/**
 * Fetch all RFQ quotes for this seller
 */
export async function getQuotes(): Promise<Quote[]> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.warn('getQuotes:', error.message); return []; }
    return (data as Quote[]) || [];
  } catch { return []; }
}

/**
 * Respond to a quote
 */
export async function respondToQuote(
  quoteId: string,
  patch: Partial<Quote>
): Promise<Quote | null> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .update(patch)
      .eq('id', quoteId)
      .select()
      .single();
    if (error) throw error;
    return data as Quote;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(msg);
  }
}

/**
 * Fetch all returns
 */
export async function getReturns(): Promise<Return[]> {
  try {
    const { data, error } = await supabase
      .from('returns')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.warn('getReturns:', error.message); return []; }
    return (data as Return[]) || [];
  } catch { return []; }
}

/**
 * Update a return record
 */
export async function updateReturn(id: string, patch: Partial<Return>): Promise<void> {
  const { error } = await supabase.from('returns').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Fetch all promotions
 */
export async function getPromotions(): Promise<Promotion[]> {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.warn('getPromotions:', error.message); return []; }
    return (data as Promotion[]) || [];
  } catch { return []; }
}

/**
 * Insert a promotion
 */
export async function insertPromotion(
  p: Omit<Promotion, 'id' | 'seller_id' | 'created_at'>
): Promise<Promotion> {
  const { data, error } = await supabase
    .from('promotions')
    .insert([{ ...p, seller_id: '00000000-0000-0000-0000-000000000001' }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Promotion;
}

/**
 * Toggle promotion active state
 */
export async function togglePromotion(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('promotions').update({ active }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Delete a promotion
 */
export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Fetch payout history
 */
export async function getPayouts(): Promise<Payout[]> {
  try {
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.warn('getPayouts:', error.message); return []; }
    return (data as Payout[]) || [];
  } catch { return []; }
}

/**
 * Fetch ledger entries
 */
export async function getLedgerEntries(): Promise<LedgerEntry[]> {
  try {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.warn('getLedgerEntries:', error.message); return []; }
    return (data as LedgerEntry[]) || [];
  } catch { return []; }
}

/**
 * Insert a ledger entry (e.g. refund)
 */
export async function insertLedgerEntry(
  entry: Omit<LedgerEntry, 'id' | 'seller_id' | 'created_at'>
): Promise<void> {
  const { error } = await supabase.from('ledger_entries').insert([{
    ...entry,
    seller_id: '00000000-0000-0000-0000-000000000001'
  }]);
  if (error) throw new Error(error.message);
}

/**
 * Fetch team members
 */
export async function getTeamMembers(): Promise<SellerTeamMember[]> {
  try {
    const { data, error } = await supabase
      .from('seller_team_members')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.warn('getTeamMembers:', error.message); return []; }
    return (data as SellerTeamMember[]) || [];
  } catch { return []; }
}

/**
 * Invite a team member
 */
export async function inviteTeamMember(
  email: string,
  role: SellerTeamMember['role']
): Promise<SellerTeamMember> {
  const { data, error } = await supabase
    .from('seller_team_members')
    .insert([{
      seller_id: '00000000-0000-0000-0000-000000000001',
      invited_email: email,
      role,
      status: 'invited'
    }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SellerTeamMember;
}

/**
 * Remove a team member
 */
export async function removeTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from('seller_team_members').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
