-- =============================================================================
-- FLASH SELLER CENTRAL — FULL PRODUCTION SCHEMA MIGRATION
-- Project: deldhtqoygpoozbrfpgv (https://deldhtqoygpoozbrfpgv.supabase.co)
-- Execute this entire script once in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/deldhtqoygpoozbrfpgv/sql
-- =============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. SELLERS (Business identity)
-- =============================================================================
create table if not exists sellers (
  id               uuid        primary key default gen_random_uuid(),
  auth_user_id     uuid        references auth.users(id),
  business_name    text        not null default 'Flash Merchant',
  legal_name       text,
  tax_id           text,
  kyc_status       text        not null default 'pending', -- pending | verified | rejected
  store_logo_url   text,
  store_banner_url text,
  policies         jsonb       default '{"returns":"30-day returns accepted","shipping":"Ships within 2 business days","warranty":"1 year manufacturer warranty"}'::jsonb,
  health_score     numeric     not null default 100,
  created_at       timestamptz not null default now()
);

-- Seed demo seller account so Seller Central works seamlessly out of the box
insert into sellers (id, business_name, legal_name, kyc_status, health_score)
values (
  '00000000-0000-0000-0000-000000000001',
  'Northstar Components',
  'Northstar Components Pvt. Ltd.',
  'verified',
  98
) on conflict (id) do update set
  business_name = excluded.business_name,
  legal_name    = excluded.legal_name,
  kyc_status    = excluded.kyc_status;

-- RLS: sellers
alter table sellers enable row level security;
drop policy if exists "sellers_select_own" on sellers;
create policy "sellers_select_own" on sellers for select
  using (auth_user_id = auth.uid() or id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "sellers_update_own" on sellers;
create policy "sellers_update_own" on sellers for update
  using (auth_user_id = auth.uid() or id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "sellers_insert_own" on sellers;
create policy "sellers_insert_own" on sellers for insert
  with check (auth_user_id = auth.uid() or id = '00000000-0000-0000-0000-000000000001'::uuid);

-- =============================================================================
-- 2. EXTEND PRODUCTS (Seller ownership + B2B Catalog fields)
-- =============================================================================
alter table products add column if not exists seller_id           uuid references sellers(id) default '00000000-0000-0000-0000-000000000001';
alter table products add column if not exists sku                 text;
alter table products add column if not exists moq                 int4 not null default 1;
alter table products add column if not exists status              text not null default 'active'; -- draft | active | suppressed
alter table products add column if not exists low_stock_threshold int4 not null default 5;
alter table products add column if not exists certifications      jsonb;
alter table products add column if not exists shipping            jsonb;

-- Backfill demo seller_id
update products set seller_id = '00000000-0000-0000-0000-000000000001' where seller_id is null;

-- Auto-generate SKU for existing products
update products
set sku = 'FL-' || upper(substring(replace(id::text, '-', ''), 1, 8))
where sku is null;

-- =============================================================================
-- 3. PRODUCT PRICE TIERS (Tiered / bulk B2B pricing per product)
-- =============================================================================
create table if not exists product_price_tiers (
  id         uuid    primary key default gen_random_uuid(),
  product_id uuid    not null references products(id) on delete cascade,
  seller_id  uuid    not null references sellers(id) default '00000000-0000-0000-0000-000000000001',
  min_qty    int4    not null,
  unit_price numeric not null
);

alter table product_price_tiers enable row level security;
drop policy if exists "price_tiers_select_own" on product_price_tiers;
create policy "price_tiers_select_own" on product_price_tiers for select
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "price_tiers_insert_own" on product_price_tiers;
create policy "price_tiers_insert_own" on product_price_tiers for insert
  with check (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "price_tiers_update_own" on product_price_tiers;
create policy "price_tiers_update_own" on product_price_tiers for update
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "price_tiers_delete_own" on product_price_tiers;
create policy "price_tiers_delete_own" on product_price_tiers for delete
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- =============================================================================
-- 4. PRODUCT VARIANTS (Size, color, SKU, price override matrix)
-- =============================================================================
create table if not exists product_variants (
  id             uuid    primary key default gen_random_uuid(),
  product_id     uuid    not null references products(id) on delete cascade,
  seller_id      uuid    not null references sellers(id) default '00000000-0000-0000-0000-000000000001',
  variant_name   text,
  sku            text,
  stock          int4    not null default 0,
  price_override numeric
);

alter table product_variants enable row level security;
drop policy if exists "variants_select_own" on product_variants;
create policy "variants_select_own" on product_variants for select
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "variants_insert_own" on product_variants;
create policy "variants_insert_own" on product_variants for insert
  with check (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "variants_update_own" on product_variants;
create policy "variants_update_own" on product_variants for update
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "variants_delete_own" on product_variants;
create policy "variants_delete_own" on product_variants for delete
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- =============================================================================
-- 5. EXTEND ORDERS (Seller attribution + fulfillment fields)
-- =============================================================================
alter table orders add column if not exists seller_id        uuid references sellers(id) default '00000000-0000-0000-0000-000000000001';
alter table orders add column if not exists tracking_number  text;
alter table orders add column if not exists carrier          text;
alter table orders add column if not exists status_timeline  jsonb default '[]'::jsonb;
alter table orders add column if not exists shipping_address jsonb;

update orders set seller_id = '00000000-0000-0000-0000-000000000001' where seller_id is null;

-- =============================================================================
-- 6. QUOTES / RFQ (B2B Request for Quote negotiation)
-- =============================================================================
create table if not exists quotes (
  id               uuid        primary key default gen_random_uuid(),
  buyer_email      text,
  buyer_name       text,
  seller_id        uuid        not null references sellers(id) default '00000000-0000-0000-0000-000000000001',
  product_id       uuid        references products(id),
  requested_qty    int4,
  message          text,
  status           text        not null default 'requested', -- requested | responded | negotiating | accepted | declined
  seller_price     numeric,
  seller_lead_time text,
  thread           jsonb       not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);

alter table quotes enable row level security;
drop policy if exists "quotes_select_own" on quotes;
create policy "quotes_select_own" on quotes for select
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "quotes_insert_own" on quotes;
create policy "quotes_insert_own" on quotes for insert
  with check (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "quotes_update_own" on quotes;
create policy "quotes_update_own" on quotes for update
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "quotes_insert_buyer" on quotes;
create policy "quotes_insert_buyer" on quotes for insert
  with check (true);

-- =============================================================================
-- 7. RETURNS & REFUNDS
-- =============================================================================
create table if not exists returns (
  id              uuid        primary key default gen_random_uuid(),
  order_id        uuid        references orders(id),
  seller_id       uuid        not null references sellers(id) default '00000000-0000-0000-0000-000000000001',
  reason          text,
  status          text        not null default 'requested', -- requested | approved | rejected | refunded
  restocking_fee  numeric     not null default 0,
  created_at      timestamptz not null default now()
);

alter table returns enable row level security;
drop policy if exists "returns_select_own" on returns;
create policy "returns_select_own" on returns for select
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "returns_update_own" on returns;
create policy "returns_update_own" on returns for update
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "returns_insert_own" on returns;
create policy "returns_insert_own" on returns for insert
  with check (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- =============================================================================
-- 8. PROMOTIONS / COUPONS
-- =============================================================================
create table if not exists promotions (
  id             uuid        primary key default gen_random_uuid(),
  seller_id      uuid        not null references sellers(id) default '00000000-0000-0000-0000-000000000001',
  code           text        unique,
  discount_type  text        not null, -- percentage | flat
  discount_value numeric     not null,
  min_spend      numeric     not null default 0,
  expires_at     timestamptz,
  active         boolean     not null default true,
  created_at     timestamptz not null default now()
);

alter table promotions enable row level security;
drop policy if exists "promotions_select_own" on promotions;
create policy "promotions_select_own" on promotions for select
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "promotions_insert_own" on promotions;
create policy "promotions_insert_own" on promotions for insert
  with check (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "promotions_update_own" on promotions;
create policy "promotions_update_own" on promotions for update
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "promotions_delete_own" on promotions;
create policy "promotions_delete_own" on promotions for delete
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- =============================================================================
-- 9. PAYOUTS & TRANSACTION LEDGER
-- =============================================================================
create table if not exists payouts (
  id           uuid        primary key default gen_random_uuid(),
  seller_id    uuid        not null references sellers(id) default '00000000-0000-0000-0000-000000000001',
  amount       numeric     not null default 0,
  status       text        not null default 'pending', -- pending | paid | failed
  period_start date,
  period_end   date,
  created_at   timestamptz not null default now()
);

alter table payouts enable row level security;
drop policy if exists "payouts_select_own" on payouts;
create policy "payouts_select_own" on payouts for select
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "payouts_insert_own" on payouts;
create policy "payouts_insert_own" on payouts for insert
  with check (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create table if not exists ledger_entries (
  id         uuid        primary key default gen_random_uuid(),
  seller_id  uuid        not null references sellers(id) default '00000000-0000-0000-0000-000000000001',
  order_id   uuid        references orders(id),
  type       text        not null, -- sale | fee | refund | tax
  amount     numeric     not null,
  created_at timestamptz not null default now()
);

alter table ledger_entries enable row level security;
drop policy if exists "ledger_select_own" on ledger_entries;
create policy "ledger_select_own" on ledger_entries for select
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "ledger_insert_own" on ledger_entries;
create policy "ledger_insert_own" on ledger_entries for insert
  with check (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- =============================================================================
-- 10. SELLER TEAM MEMBERS (Multi-user organization accounts)
-- =============================================================================
create table if not exists seller_team_members (
  id             uuid        primary key default gen_random_uuid(),
  seller_id      uuid        not null references sellers(id) default '00000000-0000-0000-0000-000000000001',
  auth_user_id   uuid        references auth.users(id),
  role           text        not null default 'staff', -- owner | manager | fulfillment_staff | support
  invited_email  text,
  status         text        not null default 'invited', -- invited | active
  created_at     timestamptz not null default now()
);

alter table seller_team_members enable row level security;
drop policy if exists "team_select_own" on seller_team_members;
create policy "team_select_own" on seller_team_members for select
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "team_insert_own" on seller_team_members;
create policy "team_insert_own" on seller_team_members for insert
  with check (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "team_update_own" on seller_team_members;
create policy "team_update_own" on seller_team_members for update
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "team_delete_own" on seller_team_members;
create policy "team_delete_own" on seller_team_members for delete
  using (seller_id in (select id from sellers where auth_user_id = auth.uid()) or seller_id = '00000000-0000-0000-0000-000000000001'::uuid);
