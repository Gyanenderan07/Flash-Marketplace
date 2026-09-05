-- ============================================================
-- Migration 009: payouts + ledger_entries
-- ============================================================

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

create policy if not exists "payouts_select_own"
  on payouts for select
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "payouts_insert_own"
  on payouts for insert
  with check (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create table if not exists ledger_entries (
  id         uuid        primary key default gen_random_uuid(),
  seller_id  uuid        not null references sellers(id) default '00000000-0000-0000-0000-000000000001',
  order_id   uuid        references orders(id),
  type       text        not null, -- sale | fee | refund | tax
  amount     numeric     not null,
  created_at timestamptz not null default now()
);

alter table ledger_entries enable row level security;

create policy if not exists "ledger_select_own"
  on ledger_entries for select
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "ledger_insert_own"
  on ledger_entries for insert
  with check (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================================
-- Migration 010: seller_team_members
-- ============================================================

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

create policy if not exists "team_select_own"
  on seller_team_members for select
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "team_insert_own"
  on seller_team_members for insert
  with check (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "team_update_own"
  on seller_team_members for update
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "team_delete_own"
  on seller_team_members for delete
  using (seller_id = '00000000-0000-0000-0000-000000000001'::uuid);
