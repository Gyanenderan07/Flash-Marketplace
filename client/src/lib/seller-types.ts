/**
 * Flash Seller Central — TypeScript type definitions
 * All interfaces for new Supabase tables introduced in the Amazon Business parity build.
 * TODO: Replace DEMO_SELLER_ID with auth.uid() after Supabase Auth integration.
 */

export const DEMO_SELLER_ID = '00000000-0000-0000-0000-000000000001' as const;

// ─── Seller profile ───────────────────────────────────────────────────────────
export interface Seller {
  id: string;
  auth_user_id: string | null;
  business_name: string;
  store_name?: string | null;
  legal_name: string | null;
  tax_id: string | null;
  kyc_status: 'pending' | 'verified' | 'rejected';
  store_logo_url: string | null;
  store_banner_url: string | null;
  policies: {
    returns: string;
    shipping: string;
    warranty: string;
  } | null;
  health_score: number;
  created_at: string;
}

// ─── Product extensions ───────────────────────────────────────────────────────
export type ProductStatus = 'draft' | 'active' | 'suppressed' | 'archived';

export interface ProductExtended {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  original_price: number;
  discount: string | null;
  stock: number;
  description: string;
  primary_image: string;
  hover_images: string[] | null;
  colors: Array<{ name: string; hex: string }> | null;
  created_at: string;
  updated_at?: string | null;
  // Extended fields
  seller_id: string | null;
  sku: string | null;
  moq: number;
  status: ProductStatus;
  low_stock_threshold: number;
  tiered_pricing?: Array<{ minQty: number; price: number }> | null;
  certifications: Record<string, string> | null;
  shipping: ProductShipping | null;
}

export interface ProductShipping {
  weight: number | null;
  dims: string | null;
  class: string | null;
  handlingDays: number | null;
  regions: string[] | null;
}

// ─── Price tiers ──────────────────────────────────────────────────────────────
export interface ProductPriceTier {
  id: string;
  product_id: string;
  seller_id: string;
  min_qty: number;
  unit_price: number;
}

// ─── Variants ─────────────────────────────────────────────────────────────────
export interface ProductVariant {
  id: string;
  product_id: string;
  seller_id: string;
  variant_name: string | null;
  sku: string | null;
  stock: number;
  price_override: number | null;
}

// ─── Orders (extended) ───────────────────────────────────────────────────────
export type OrderDeliveryStatus = 'pending' | 'processing' | 'dispatched' | 'delivered' | 'cancelled' | 'returned';

export interface OrderExtended {
  id: string;
  total_amount: number;
  delivery_status: OrderDeliveryStatus;
  customer_name: string | null;
  customer_email: string | null;
  payment_status: string | null;
  items: OrderLineItem[] | null;
  created_at: string;
  // Extended fields
  seller_id: string | null;
  tracking_number: string | null;
  carrier: string | null;
  status_timeline: StatusTimelineEntry[] | null;
  shipping_address: ShippingAddress | null;
}

export interface OrderLineItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
}

export interface StatusTimelineEntry {
  status: string;
  timestamp: string;
  note?: string;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

// ─── Quotes / RFQ ────────────────────────────────────────────────────────────
export type QuoteStatus = 'requested' | 'responded' | 'negotiating' | 'accepted' | 'declined';

export interface Quote {
  id: string;
  buyer_email: string | null;
  buyer_name: string | null;
  seller_id: string;
  product_id: string | null;
  requested_qty: number | null;
  message: string | null;
  status: QuoteStatus;
  seller_price: number | null;
  seller_lead_time: string | null;
  thread: QuoteThreadMessage[];
  created_at: string;
}

export interface QuoteThreadMessage {
  sender: 'buyer' | 'seller';
  message: string;
  timestamp: string;
}

// ─── Returns / Refunds ───────────────────────────────────────────────────────
export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'refunded';

export interface Return {
  id: string;
  order_id: string | null;
  seller_id: string;
  reason: string | null;
  status: ReturnStatus;
  restocking_fee: number;
  created_at: string;
}

// ─── Promotions ───────────────────────────────────────────────────────────────
export type DiscountType = 'percentage' | 'flat';

export interface Promotion {
  id: string;
  seller_id: string;
  code: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_spend: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

// ─── Payouts / Ledger ────────────────────────────────────────────────────────
export type PayoutStatus = 'pending' | 'paid' | 'failed';
export type LedgerEntryType = 'sale' | 'fee' | 'refund' | 'tax';

export interface Payout {
  id: string;
  seller_id: string;
  amount: number;
  status: PayoutStatus;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  seller_id: string;
  order_id: string | null;
  type: LedgerEntryType;
  amount: number;
  created_at: string;
}

// ─── Team members ─────────────────────────────────────────────────────────────
export type TeamMemberRole = 'owner' | 'manager' | 'fulfillment_staff' | 'support';
export type TeamMemberStatus = 'invited' | 'active';

export interface SellerTeamMember {
  id: string;
  seller_id: string;
  auth_user_id: string | null;
  role: TeamMemberRole;
  invited_email: string | null;
  status: TeamMemberStatus;
  created_at: string;
}

// ─── Analytics helpers ────────────────────────────────────────────────────────
export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  units: number;
}
