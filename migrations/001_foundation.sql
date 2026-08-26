-- PropConnect Migration 001: Foundation
-- Creates: accounts, agents, whatsapp_accounts, account_branding
-- Enables RLS on all tables

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;

-- ============================================================
-- accounts (tenant boundary)
-- ============================================================
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  business_name text,
  country text not null default 'KE',
  currency text not null default 'KES',
  timezone text not null default 'Africa/Nairobi',
  status text not null default 'active'
    check (status in ('active', 'suspended', 'cancelled')),
  subscription_plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table accounts enable row level security;

create policy "tenant_isolation_accounts" on accounts
  for all
  using (
    id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  )
  with check (
    id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  );

-- ============================================================
-- agents
-- ============================================================
create table agents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  name text not null,
  email text not null,
  role text not null default 'agent'
    check (role in ('admin', 'agent', 'viewer')),
  active boolean not null default true,
  notify_on_hot_lead boolean not null default false,
  hot_lead_threshold int not null default 80,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, email)
);

alter table agents enable row level security;

create policy "tenant_isolation_agents" on agents
  for all
  using (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  );

create index idx_agents_account on agents(account_id);

-- ============================================================
-- whatsapp_accounts
-- ============================================================
create table whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  business_account_id text,
  phone_number_id text not null,
  display_phone text,
  verified_name text,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'suspended', 'disabled')),
  graph_api_version text not null default 'v18.0',
  access_token_ref text,
  verify_token_ref text,
  app_secret_ref text,
  quality_rating text,
  messaging_limit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, phone_number_id)
);

alter table whatsapp_accounts enable row level security;

create policy "tenant_isolation_whatsapp_accounts" on whatsapp_accounts
  for all
  using (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  );

create index idx_whatsapp_accounts_account on whatsapp_accounts(account_id);

-- ============================================================
-- account_branding (white-label)
-- ============================================================
create table account_branding (
  account_id uuid primary key references accounts(id),
  firm_name text,
  display_name text,
  logo_storage_path text,
  favicon_storage_path text,
  primary_color text not null default '#182744',
  secondary_color text not null default '#B49362',
  accent_color text not null default '#B49362',
  phone text,
  email text,
  website text,
  address jsonb,
  social_links jsonb,
  public_contact_name text,
  public_contact_email text,
  public_contact_phone text,
  custom_domain text,
  custom_domain_status text default 'none',
  show_powered_by boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table account_branding enable row level security;

create policy "tenant_isolation_account_branding" on account_branding
  for all
  using (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a
      where a.id = auth.uid()
    )
  );

-- ============================================================
-- Default Qabila Realtors tenant
-- ============================================================
insert into accounts (id, name, slug, business_name, country, currency, timezone)
values (
  '00000000-0000-0000-0000-000000000001',
  'Qabila Realtors',
  'qabila-realtors',
  'Qabila Realtors',
  'KE',
  'KES',
  'Africa/Nairobi'
);

insert into account_branding (account_id, firm_name, display_name, primary_color, secondary_color, accent_color)
values (
  '00000000-0000-0000-0000-000000000001',
  'Qabila Realtors',
  'Qabila Realtors',
  '#182744',
  '#B49362',
  '#B49362'
);
