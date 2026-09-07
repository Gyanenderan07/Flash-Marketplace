/**
 * Flash Seller Central — Enterprise Database Schema Types
 * Production instance: deldhtqoygpoozbrfpgv (Supabase)
 */

export type ProductStatus = 'draft' | 'active' | 'suppressed' | 'archived';

export interface TieredPrice {
  minQty: number;
  price: number;
  min_qty?: number;
  unit_price?: number;
}

export interface ProductShipping {
  weight?: number | null;
  dims?: string | null;
  class?: string | null;
  handlingDays?: number | null;
  regions?: string[] | null;
}

export interface DbProduct {
  id: string;
  seller_id: string | null;
  name: string;
  brand?: string | null;
  category: string;
  sku: string;
  price: number;
  original_price: number;
  discount?: string | null;
  stock: number;
  moq: number;
  status: ProductStatus;
  low_stock_threshold: number;
  tiered_pricing?: TieredPrice[] | null;
  description?: string | null;
  primary_image: string;
  hover_images?: string[] | null;
  colors?: Array<{ name: string; hex: string }> | null;
  shipping?: ProductShipping | null;
  certifications?: Record<string, string> | null;
  created_at: string;
  updated_at?: string | null;
}

export interface DbSeller {
  id: string;
  auth_user_id?: string | null;
  business_name: string;
  legal_name?: string | null;
  tax_id?: string | null;
  kyc_status: 'pending' | 'verified' | 'rejected';
  store_logo_url?: string | null;
  store_banner_url?: string | null;
  payout_account?: {
    account_holder?: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    upi_id?: string;
  } | null;
  policies?: {
    returns: string;
    shipping: string;
    warranty: string;
  } | null;
  health_score: number;
  created_at: string;
}

export type QuoteStatus = 'requested' | 'responded' | 'negotiating' | 'accepted' | 'declined';

export interface QuoteMessage {
  sender: 'buyer' | 'seller';
  message: string;
  timestamp: string;
}

export interface DbQuote {
  id: string;
  product_id: string | null;
  seller_id: string | null;
  buyer_name: string | null;
  buyer_email?: string | null;
  requested_qty: number;
  message?: string | null;
  status: QuoteStatus;
  seller_price?: number | null;
  seller_lead_time?: string | null;
  history?: QuoteMessage[] | null;
  thread?: QuoteMessage[] | null;
  created_at: string;
}

export type PayoutType = 'sale' | 'fee' | 'refund' | 'payout';
export type PayoutStatus = 'pending' | 'completed' | 'paid' | 'failed';

export interface DbPayout {
  id: string;
  seller_id: string | null;
  order_id?: string | null;
  amount: number;
  type?: PayoutType;
  status: PayoutStatus;
  period_start?: string | null;
  period_end?: string | null;
  created_at: string;
}

export interface DbLedgerEntry {
  id: string;
  seller_id: string | null;
  order_id?: string | null;
  type: 'sale' | 'fee' | 'refund' | 'tax';
  amount: number;
  created_at: string;
}

export interface DbProductPriceTier {
  id: string;
  product_id: string;
  seller_id: string;
  min_qty: number;
  unit_price: number;
}

export interface DbProductVariant {
  id: string;
  product_id: string;
  seller_id: string;
  variant_name: string | null;
  sku: string | null;
  stock: number;
  price_override: number | null;
}

export interface DbOrderLineItem {
  productId: string;
  name?: string;
  qty: number;
  price: number;
  sku?: string;
  image?: string;
}

export type OrderFulfillmentStatus =
  | 'pending'
  | 'new'
  | 'awaiting_dispatch'
  | 'processing'
  | 'shipped'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface StatusTimelineEvent {
  status: string;
  timestamp: string;
  note?: string;
}

export interface DbOrder {
  id: string;
  seller_id?: string | null;
  total_amount: number;
  delivery_status: OrderFulfillmentStatus;
  customer_name?: string | null;
  customer_email?: string | null;
  payment_status?: string | null;
  payment_id?: string | null;
  items?: DbOrderLineItem[] | null;
  tracking_number?: string | null;
  carrier?: string | null;
  status_timeline?: StatusTimelineEvent[] | null;
  shipping_address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  created_at: string;
}

export interface DbReturn {
  id: string;
  order_id?: string | null;
  seller_id?: string | null;
  reason?: string | null;
  status: 'requested' | 'approved' | 'rejected' | 'refunded';
  restocking_fee: number;
  created_at: string;
}

export interface DbPromotion {
  id: string;
  seller_id?: string | null;
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_spend: number;
  expires_at?: string | null;
  active: boolean;
  created_at: string;
}

export interface DbSellerTeamMember {
  id: string;
  seller_id: string | null;
  auth_user_id?: string | null;
  role: 'owner' | 'manager' | 'fulfillment_staff' | 'support';
  invited_email: string;
  status: 'invited' | 'active';
  created_at: string;
}
