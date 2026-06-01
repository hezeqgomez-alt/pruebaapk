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
