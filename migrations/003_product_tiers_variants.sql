-- ============================================================
-- Migration 003: product_price_tiers (bulk/tiered pricing)
-- ============================================================

create table if not exists product_price_tiers (
  id         uuid    primary key default gen_random_uuid(),
  product_id uuid    not null references products(id) on delete cascade,
  seller_id  uuid    not null references sellers(id) default '00000000-0000-0000-0000-000000000001',
  min_qty    int4    not null,
  unit_price numeric not null
);

alter table product_price_tiers enable row level security;

create policy if not exists "price_tiers_select_own"
  on product_price_tiers for select
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "price_tiers_insert_own"
  on product_price_tiers for insert
  with check (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "price_tiers_update_own"
  on product_price_tiers for update
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "price_tiers_delete_own"
  on product_price_tiers for delete
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================================
-- Migration 004: product_variants
-- ============================================================

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

create policy if not exists "variants_select_own"
  on product_variants for select
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "variants_insert_own"
  on product_variants for insert
  with check (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "variants_update_own"
  on product_variants for update
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "variants_delete_own"
  on product_variants for delete
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);
