-- ============================================================
-- Migration 002: Extend products table with seller & B2B fields
-- ============================================================

alter table products add column if not exists seller_id           uuid        references sellers(id) default '00000000-0000-0000-0000-000000000001';
alter table products add column if not exists sku                 text;
alter table products add column if not exists moq                 int4        not null default 1;
alter table products add column if not exists status              text        not null default 'active'; -- draft | active | suppressed
alter table products add column if not exists low_stock_threshold int4        not null default 5;
alter table products add column if not exists certifications      jsonb;
alter table products add column if not exists shipping            jsonb;

-- Backfill demo seller_id for any existing rows
update products set seller_id = '00000000-0000-0000-0000-000000000001' where seller_id is null;

-- Auto-generate SKU for existing products that lack one
update products
set sku = 'FL-' || upper(substring(replace(id::text, '-', ''), 1, 8))
where sku is null;
