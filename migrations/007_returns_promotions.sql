-- ============================================================
-- Migration 007: returns table
-- ============================================================

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

create policy if not exists "returns_select_own"
  on returns for select
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "returns_update_own"
  on returns for update
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "returns_insert_own"
  on returns for insert
  with check (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================================
-- Migration 008: promotions table
-- ============================================================

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

create policy if not exists "promotions_select_own"
  on promotions for select
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "promotions_insert_own"
  on promotions for insert
  with check (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "promotions_update_own"
  on promotions for update
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "promotions_delete_own"
  on promotions for delete
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);
