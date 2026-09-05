-- ============================================================
-- Migration 001: sellers table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/deldhtqoygpoozbrfpgv/sql
-- ============================================================

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

-- Insert a demo seller row for development (replace UUID if needed)
insert into sellers (id, business_name, legal_name, kyc_status, health_score)
values (
  '00000000-0000-0000-0000-000000000001',
  'Northstar Components',
  'Northstar Components Pvt. Ltd.',
  'verified',
  98
) on conflict (id) do nothing;

-- Enable RLS
alter table sellers enable row level security;

-- Sellers can only read/write their own row
create policy if not exists "sellers_select_own"
  on sellers for select
  using (auth_user_id = auth.uid() or id = '00000000-0000-0000-0000-000000000001'::uuid);

create policy if not exists "sellers_update_own"
  on sellers for update
  using (auth_user_id = auth.uid() or id = '00000000-0000-0000-0000-000000000001'::uuid);
