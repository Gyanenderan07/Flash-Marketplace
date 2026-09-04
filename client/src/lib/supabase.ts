import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://deldhtqoygpoozbrfpgv.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_66X8kv19-K-kjCy3uJC33g_v0G2V4JN";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

export async function insertProductToCatalog(product: Omit<SupabaseProduct, "id" | "created_at">) {
  const discountVal =
    product.original_price && product.original_price > product.price
      ? `-${Math.round(((product.original_price - product.price) / product.original_price) * 100)}%`
      : "-0%";

  const payload = {
    name: product.name.trim(),
    brand: product.brand.trim() || "Flash",
    category: product.category ? product.category.toLowerCase().replace(/\s+/g, "-") : "electronics",
    price: Number(product.price),
    original_price: Number(product.original_price || product.price),
    discount: discountVal,
    stock: Number(product.stock ?? 10),
    description: product.description.trim() || "Flash verified product.",
    primary_image:
      product.primary_image.trim() ||
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
    hover_images: product.hover_images?.length
      ? product.hover_images
      : [
          product.primary_image.trim() ||
            "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
        ],
    colors: product.colors?.length ? product.colors : [{ name: "Obsidian", hex: "#0F1115" }],
  };

  const { data, error } = await supabase.from("products").insert([payload]).select();
  if (error) {
    throw error;
  }
  return data;
}

export async function updateProductInCatalog(id: string, product: Partial<SupabaseProduct>) {
  const discountVal =
    product.original_price && product.price && product.original_price > product.price
      ? `-${Math.round(((product.original_price - product.price) / product.original_price) * 100)}%`
      : product.discount || "-0%";

  const payload: Record<string, any> = {
    ...product,
    discount: discountVal,
  };

  if (product.category) {
    payload.category = product.category.toLowerCase().replace(/\s+/g, "-");
  }

  const { data, error } = await supabase.from("products").update(payload).eq("id", id).select();
  if (error) {
    throw error;
  }
  return data;
}

export async function deleteProductFromCatalog(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    throw error;
  }
  return true;
}
