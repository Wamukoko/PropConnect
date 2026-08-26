-- PropConnect Migration 004: Lead CRM
-- Creates: contacts, leads, conversation_sessions, lead_timeline_events

-- ============================================================
-- contacts
-- ============================================================
create table contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  first_name text,
  last_name text,
  display_name text,
  phone text,
  normalized_phone text,
  email text,
  company text,
  job_title text,
  address jsonb,
  notes text,
  source text,
  contact_type text
    check (contact_type in (
      'prospect', 'lead', 'customer', 'buyer', 'seller',
      'landlord', 'tenant', 'property_owner', 'agent', 'vendor', 'other'
    )),
  owner_agent_id uuid references agents(id),
  avatar_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table contacts enable row level security;

create policy "tenant_isolation_contacts" on contacts
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

create policy "service_role_contacts" on contacts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_contacts_account on contacts(account_id);
create index idx_contacts_phone on contacts(normalized_phone);
create index idx_contacts_email on contacts(email);

-- ============================================================
-- leads
-- ============================================================
create table leads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  contact_id uuid references contacts(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  phone text not null,
  whatsapp_name text,
  name text,
  email text,
  preferred_language text not null default 'en',
  budget_min numeric check (budget_min >= 0),
  budget_max numeric check (budget_max >= 0),
  listing_type text,
  property_type text,
  preferred_area text,
  stage text not null default 'new',
  lead_score int not null default 0,
  source text,
  opted_out boolean not null default false,
  opted_out_at timestamptz,
  last_location_lat double precision,
  last_location_lng double precision,
  location_consent_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, phone)
);

alter table leads enable row level security;

create policy "tenant_isolation_leads" on leads
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

create policy "service_role_leads" on leads
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_leads_account on leads(account_id);
create index idx_leads_stage on leads(stage);
create index idx_leads_phone on leads(phone);
create index idx_leads_created on leads(created_at);

-- ============================================================
-- conversation_sessions
-- ============================================================
create table conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  state text not null default 'idle',
  language text not null default 'en',
  collected_filters jsonb not null default '{}',
  last_interaction_at timestamptz not null default now(),
  expires_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conversation_sessions enable row level security;

create policy "tenant_isolation_conversations" on conversation_sessions
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

create policy "service_role_conversations" on conversation_sessions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_conversations_lead on conversation_sessions(lead_id);
create index idx_conversations_account on conversation_sessions(account_id);

-- ============================================================
-- lead_timeline_events
-- ============================================================
create table lead_timeline_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  property_id uuid references properties(id),
  actor_type text not null,
  actor_id uuid,
  event_type text not null,
  metadata jsonb not null default '{}',
  dedup_key text,
  created_at timestamptz not null default now()
);

alter table lead_timeline_events enable row level security;

create policy "tenant_isolation_timeline" on lead_timeline_events
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

create policy "service_role_timeline" on lead_timeline_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_timeline_lead on lead_timeline_events(lead_id);
create index idx_timeline_account on lead_timeline_events(account_id);
create index idx_timeline_created on lead_timeline_events(created_at);
create index idx_timeline_dedup on lead_timeline_events(dedup_key);

-- ============================================================
-- Seed Qabila test leads
-- ============================================================
insert into leads (account_id, phone, whatsapp_name, name, stage, source, preferred_language)
select
  a.id,
  '+254712345001',
  'Amina Hassan',
  'Amina Hassan',
  'new',
  'whatsapp',
  'sw'
from accounts a where a.slug = 'qabila-realtors'
on conflict (account_id, phone) do nothing;

insert into leads (account_id, phone, whatsapp_name, name, stage, source, preferred_language)
select
  a.id,
  '+254723456002',
  'John Kamau',
  'John Kamau',
  'qualified',
  'whatsapp',
  'en'
from accounts a where a.slug = 'qabila-realtors'
on conflict (account_id, phone) do nothing;

insert into leads (account_id, phone, whatsapp_name, name, stage, source, preferred_language)
select
  a.id,
  '+254734567003',
  'Fatima Ali',
  'Fatima Ali',
  'viewing_requested',
  'whatsapp',
  'sw'
from accounts a where a.slug = 'qabila-realtors'
on conflict (account_id, phone) do nothing;
