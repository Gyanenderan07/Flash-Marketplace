export type Tier = { minQty: number; unitPrice: number };

export function unitPriceForQuantity(basePrice: number, quantity: number, tiers?: Tier[]) {
  const ladder = tiers ?? [{ minQty: 1, unitPrice: basePrice }, { minQty: 10, unitPrice: Math.round(basePrice * 0.87) }, { minQty: 50, unitPrice: Math.round(basePrice * 0.78) }];
  return [...ladder].sort((a, b) => b.minQty - a.minQty).find(tier => quantity >= tier.minQty)?.unitPrice ?? basePrice;
}

export function cartSubtotal(lines: Array<{ unitPrice: number; quantity: number }>) {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

export function approvalRequired(total: number, threshold = 50000) {
  return total > threshold;
}

export type SellerStatus = 'pending' | 'verified' | 'suppressed';
export type ListingStatus = 'active' | 'draft' | 'suppressed';
export type OrderStatus = 'pending-approval' | 'confirmed' | 'awaiting-dispatch' | 'shipped' | 'delivered' | 'returned';
export type QuoteStatus = 'draft' | 'sent' | 'countered' | 'accepted' | 'declined';
export type DisputeStatus = 'open' | 'seller-response' | 'resolved';

export interface Seller { id: string; name: string; status: SellerStatus; accountHealth: number; payoutBalance: number; }
export interface Listing { id: string; sellerId: string; title: string; sku: string; status: ListingStatus; stock: number; basePrice: number; tiers: Tier[]; }
export interface MarketplaceOrder { id: string; buyerId: string; sellerIds: string[]; status: OrderStatus; subtotal: number; tax: number; total: number; approvalRequired: boolean; }
export interface Quote { id: string; buyerId: string; sellerId: string; listingId: string; quantity: number; targetPrice: number; counterPrice?: number; leadTimeDays?: number; status: QuoteStatus; }
export interface Dispute { id: string; orderId: string; buyerClaim: string; sellerDefense?: string; status: DisputeStatus; resolution?: 'refund-buyer' | 'release-funds'; }
