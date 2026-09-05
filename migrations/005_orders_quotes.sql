-- ============================================================
-- Migration 005: Extend orders with seller + fulfillment fields
-- ============================================================

alter table orders add column if not exists seller_id        uuid    references sellers(id) default '00000000-0000-0000-0000-000000000001';
alter table orders add column if not exists tracking_number  text;
alter table orders add column if not exists carrier          text;
alter table orders add column if not exists status_timeline  jsonb   default '[]'::jsonb;
alter table orders add column if not exists shipping_address jsonb;

-- Backfill seller_id
update orders set seller_id = '00000000-0000-0000-0000-000000000001' where seller_id is null;

-- ============================================================
-- Migration 006: quotes table (RFQ / negotiation)
-- ============================================================

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

create policy if not exists "quotes_select_own"
  on quotes for select
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "quotes_insert_own"
  on quotes for insert
  with check (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "quotes_update_own"
  on quotes for update
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Allow unauthenticated buyers to insert quote requests (from storefront)
create policy if not exists "quotes_insert_buyer"
  on quotes for insert
  with check (true);
