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
}

export interface SupabaseOrder {
  id: string;
  total_amount: number;
  delivery_status: string;
  customer_name?: string;
  customer_email?: string;
  payment_status?: string;
  items?: any;
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
 * Retrieves the live product catalog ordered by created_at desc
 */
export async function getLiveCatalog(): Promise<SupabaseProduct[]> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
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
 * Retrieves live orders from the orders table
 */
export async function getLiveOrders(): Promise<SupabaseOrder[]> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

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
 * Computes dashboard KPIs directly from live Supabase tables
 */
export async function getDashboardMetrics(): Promise<{
  grossRevenue: number;
  pendingOrders: number;
  totalOrders: number;
  skuCount: number;
}> {
  try {
    const [productsRes, ordersRes] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("total_amount, delivery_status, payment_status"),
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
    };
  } catch (err) {
    console.error("Error computing dashboard metrics:", err);
    return {
      grossRevenue: 0,
      pendingOrders: 0,
      totalOrders: 0,
      skuCount: 0,
    };
  }
}

/**
 * Inserts a new product directly into the shared Supabase products table
 */
export async function insertProductToCatalog(product: Omit<SupabaseProduct, "id" | "created_at">) {
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
    product.primary_image.trim() ||
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80";

  const payload = {
    name: product.name.trim(),
    brand: product.brand.trim() || "Flash",
    category: catFormatted,
    price: price,
    original_price: origPrice,
    discount: discountVal,
    stock: Number(product.stock ?? 10),
    description: product.description.trim() || "Flash verified product.",
    primary_image: primaryImg,
    hover_images: product.hover_images?.length ? product.hover_images : [primaryImg],
    colors: product.colors?.length ? product.colors : [{ name: "Obsidian", hex: "#0F1115" }],
  };

  const { data, error } = await supabase.from("products").insert([payload]).select();
  if (error) {
    throw error;
  }
  return data?.[0] as SupabaseProduct;
}

/**
 * Updates an existing product in Supabase
 */
export async function updateProductInCatalog(id: string, product: Partial<SupabaseProduct>) {
  const payload: Record<string, any> = { ...product };

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

  const { data, error } = await supabase.from("products").update(payload).eq("id", id).select();
  if (error) {
    throw error;
  }
  return data?.[0] as SupabaseProduct;
}

/**
 * Quick inline inventory stock adjustment
 */
export async function updateProductStock(id: string, newStock: number) {
  const sanitizedStock = Math.max(0, Math.floor(newStock));
  const { data, error } = await supabase
    .from("products")
    .update({ stock: sanitizedStock })
    .eq("id", id)
    .select();

  if (error) {
    throw error;
  }
  return data?.[0] as SupabaseProduct;
}

/**
 * Deletes a product from the live catalog
 */
export async function deleteProductFromCatalog(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
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
