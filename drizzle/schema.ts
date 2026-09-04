import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** OAuth identifier (openId) returned from the auth provider callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const sellers = mysqlTable("sellers", { id: int("id").autoincrement().primaryKey(), name: varchar("name", { length: 180 }).notNull(), status: mysqlEnum("status", ["pending", "verified", "suppressed"]).default("pending").notNull(), accountHealth: int("accountHealth").default(100).notNull(), payoutBalance: decimal("payoutBalance", { precision: 14, scale: 2 }).default("0").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const listings = mysqlTable("listings", { id: int("id").autoincrement().primaryKey(), sellerId: int("sellerId").notNull(), title: varchar("title", { length: 240 }).notNull(), sku: varchar("sku", { length: 80 }).notNull().unique(), status: mysqlEnum("status", ["active", "draft", "suppressed"]).default("draft").notNull(), stock: int("stock").default(0).notNull(), basePrice: decimal("basePrice", { precision: 14, scale: 2 }).notNull(), tiers: json("tiers"), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const marketplaceOrders = mysqlTable("marketplaceOrders", { id: int("id").autoincrement().primaryKey(), buyerId: int("buyerId").notNull(), status: mysqlEnum("status", ["pending-approval", "confirmed", "awaiting-dispatch", "shipped", "delivered", "returned"]).default("confirmed").notNull(), subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull(), tax: decimal("tax", { precision: 14, scale: 2 }).notNull(), total: decimal("total", { precision: 14, scale: 2 }).notNull(), approvalRequired: int("approvalRequired").default(0).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const quotes = mysqlTable("quotes", { id: int("id").autoincrement().primaryKey(), buyerId: int("buyerId").notNull(), sellerId: int("sellerId").notNull(), listingId: int("listingId").notNull(), quantity: int("quantity").notNull(), targetPrice: decimal("targetPrice", { precision: 14, scale: 2 }).notNull(), counterPrice: decimal("counterPrice", { precision: 14, scale: 2 }), status: mysqlEnum("status", ["draft", "sent", "countered", "accepted", "declined"]).default("draft").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const disputes = mysqlTable("disputes", { id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull(), buyerClaim: text("buyerClaim").notNull(), sellerDefense: text("sellerDefense"), status: mysqlEnum("status", ["open", "seller-response", "resolved"]).default("open").notNull(), resolution: mysqlEnum("resolution", ["refund-buyer", "release-funds"]), createdAt: timestamp("createdAt").defaultNow().notNull() });

export type Seller = typeof sellers.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type MarketplaceOrder = typeof marketplaceOrders.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type Dispute = typeof disputes.$inferSelect;