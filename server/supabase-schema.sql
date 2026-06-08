-- Run this in Supabase SQL Editor (Database → SQL Editor → New query)

create table if not exists licenses (
  id              uuid    default gen_random_uuid() primary key,
  license_id      integer not null unique,
  key             text    not null unique,
  email           text    not null,
  buyer_name      text,
  gumroad_sale_id text    unique,
  activations     text[]  default '{}',
  activated_at    timestamptz,
  created_at      timestamptz default now()
);

-- Index for fast key lookup (used on every activation)
create index if not exists licenses_key_idx on licenses (key);

-- Index for email recovery
create index if not exists licenses_email_idx on licenses (email);

-- Row Level Security: public can't read/write directly
-- Only the service_role key (used by our serverless functions) can access
alter table licenses enable row level security;

-- No public policies — all access goes through our API with service_role key

-- ─── user_data: cloud sync table ──────────────────────────────────────────────
create table if not exists user_data (
  id                uuid        default gen_random_uuid() primary key,
  user_id           uuid        not null unique references auth.users(id) on delete cascade,
  transactions      jsonb       default '[]',
  budgets           jsonb       default '{}',
  custom_categories jsonb       default '{}',
  updated_at        timestamptz default now(),
  created_at        timestamptz default now()
);

create index if not exists user_data_user_id_idx on user_data (user_id);

alter table user_data enable row level security;

-- Each user can only read and write their own row
create policy "users_select_own" on user_data
  for select using (auth.uid() = user_id);

create policy "users_insert_own" on user_data
  for insert with check (auth.uid() = user_id);

create policy "users_update_own" on user_data
  for update using (auth.uid() = user_id);

create policy "users_delete_own" on user_data
  for delete using (auth.uid() = user_id);
