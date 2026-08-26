***
generated_from:
  - Prompt.md
last_updated: 2026-08-26
***

# Data Model — PropConnect

## Entity relationship overview

```text
accounts ──┬── agents
           ├── whatsapp_accounts
           ├── account_branding
           ├── properties ──┬── property_photos
           │                └── viewings
           ├── locations ──┬── location_aliases
           │                └── properties (location_id)
           ├── contacts ──┬── contact_external_ids
           │               └── leads
           ├── leads ──┬── conversation_sessions
           │            ├── messages
           │            ├── lead_timeline_events
           │            ├── saved_searches
           │            ├── consent_records
           │            └── viewings
           ├── outbound_messages
           ├── outbound_jobs
           └── webhook_events
```

## Tables

### accounts (tenant boundary)

```sql
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
```

### agents

```sql
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
```

### whatsapp_accounts

```sql
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
```

### account_branding

```sql
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
```

### locations

```sql
create table locations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  name text not null,
  slug text not null,
  location_type text not null
    check (location_type in ('country', 'county', 'city', 'sub_county', 'neighbourhood', 'estate')),
  parent_id uuid references locations(id),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  unique(account_id, slug)
);
```

### location_aliases

```sql
create table location_aliases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  location_id uuid not null references locations(id),
  alias text not null,
  unique(account_id, location_id, alias)
);
```

### properties

```sql
create type property_type as enum (
  'apartment', 'house', 'townhouse', 'villa', 'maisonette',
  'land', 'office', 'shop', 'warehouse', 'commercial', 'serviced_apartment'
);

create type listing_type as enum ('sale', 'rent', 'lease');

create type listing_status as enum (
  'draft', 'pending_review', 'published', 'available',
  'reserved', 'under_offer', 'let', 'sold',
  'withdrawn', 'expired', 'archived'
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  title text not null,
  reference_code text,
  description text,
  property_type property_type not null,
  listing_type listing_type not null,
  status listing_status not null default 'draft',
  price numeric not null check (price >= 0),
  currency text not null default 'KES',
  bedrooms int check (bedrooms >= 0),
  bathrooms int check (bathrooms >= 0),
  floor_area numeric check (floor_area >= 0),
  land_area numeric check (land_area >= 0),
  furnished boolean,
  parking_spaces int check (parking_spaces >= 0),
  amenities jsonb not null default '[]',
  location_id uuid references locations(id),
  latitude double precision,
  longitude double precision,
  public_location_text text,
  availability_date date,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references agents(id),
  updated_by uuid references agents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### property_photos

```sql
create table property_photos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  property_id uuid not null references properties(id),
  storage_path text not null,
  thumbnail_path text,
  alt_text text,
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
```

### contacts

```sql
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
```

### contact_external_ids

```sql
create table contact_external_ids (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  contact_id uuid not null references contacts(id),
  provider text not null,
  external_contact_id text not null,
  external_etag text,
  last_synced_at timestamptz,
  metadata jsonb,
  unique(account_id, provider, external_contact_id)
);
```

### leads

```sql
create type lead_stage as enum (
  'new', 'contacted', 'qualified', 'matching',
  'recommendation_sent', 'viewing_requested',
  'viewing_confirmed', 'negotiation', 'converted', 'lost', 'dormant'
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  contact_id uuid references contacts(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  wa_id text not null,
  local_phone text,
  name text,
  email text,
  preferred_language text not null default 'en',
  budget_min numeric check (budget_min >= 0),
  budget_max numeric check (budget_max >= 0),
  listing_type listing_type,
  property_type property_type,
  preferred_area text,
  stage lead_stage not null default 'new',
  lead_score int not null default 0,
  source text,
  opted_out boolean not null default false,
  opted_out_at timestamptz,
  last_location_lat double precision,
  last_location_lng double precision,
  location_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, wa_id)
);
```

### conversation_sessions

```sql
create type conversation_state as enum (
  'idle', 'choosing_intent', 'choosing_listing_type',
  'choosing_property_type', 'choosing_budget', 'choosing_area',
  'awaiting_location', 'matching_properties', 'showing_results',
  'choosing_property', 'choosing_viewing_date', 'choosing_viewing_slot',
  'awaiting_confirmation', 'completed', 'human_handoff',
  'opted_out', 'expired'
);

create table conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  state conversation_state not null default 'idle',
  language text not null default 'en',
  collected_filters jsonb not null default '{}',
  last_interaction_at timestamptz not null default now(),
  expires_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### messages

```sql
create type message_direction as enum ('inbound', 'outbound');
create type message_type as enum (
  'text', 'image', 'video', 'audio', 'document',
  'location', 'interactive', 'template', 'system'
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  direction message_direction not null,
  type message_type not null,
  content jsonb not null,
  wa_message_id text,
  provider_timestamp timestamptz,
  created_at timestamptz not null default now(),
  unique(whatsapp_account_id, wa_message_id)
);
```

### lead_timeline_events

```sql
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
```

### webhook_events

```sql
create type webhook_processing_state as enum (
  'received', 'processing', 'processed', 'failed', 'skipped'
);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  provider_event_id text,
  processing_state webhook_processing_state not null default 'received',
  attempts int not null default 0,
  last_error text,
  processed_at timestamptz,
  received_at timestamptz not null default now(),
  raw_payload jsonb
);
```

### consent_records

```sql
create type consent_purpose as enum (
  'service_messages', 'saved_search_alerts', 'broadcasts'
);

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  purpose consent_purpose not null,
  channel text not null,
  source text,
  wording text not null,
  policy_version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  evidence jsonb
);
```

### outbound_messages

```sql
create type outbound_message_status as enum (
  'queued', 'sent', 'delivered', 'read', 'failed', 'cancelled'
);

create table outbound_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  message_id uuid references messages(id),
  provider_message_id text,
  template_name text,
  template_version text,
  status outbound_message_status not null default 'queued',
  error_code text,
  attempt_count int not null default 0,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
```

### outbound_jobs

```sql
create type outbound_job_status as enum (
  'queued', 'processing', 'sent', 'failed', 'cancelled'
);

create table outbound_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  job_type text not null,
  template_name text,
  language text,
  payload jsonb,
  idempotency_key text not null unique,
  status outbound_job_status not null default 'queued',
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
```

### viewings

```sql
create type viewing_status as enum (
  'requested', 'scheduled', 'confirmed', 'completed',
  'cancelled', 'rescheduled', 'no_show'
);

create table viewings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  property_id uuid not null references properties(id),
  agent_id uuid not null references agents(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status viewing_status not null default 'requested',
  notes text,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);
```

### saved_searches (P1)

```sql
create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  listing_type listing_type,
  property_type property_type,
  budget_min numeric,
  budget_max numeric,
  location_filter jsonb,
  bedrooms_min int,
  amenities jsonb,
  opted_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### import_history

```sql
create table import_history (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  agent_id uuid not null references agents(id),
  source text not null,
  operation_type text not null,
  file_name text,
  total_records int,
  created_count int default 0,
  updated_count int default 0,
  merged_count int default 0,
  skipped_count int default 0,
  failed_count int default 0,
  error_report_ref text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
```

## Indexes

```sql
-- Foreign key indexes (PostgreSQL does not auto-index FKs)
create index idx_agents_account on agents(account_id);
create index idx_whatsapp_accounts_account on whatsapp_accounts(account_id);
create index idx_properties_account on properties(account_id);
create index idx_properties_location on properties(location_id);
create index idx_properties_status on properties(status);
create index idx_contacts_account on contacts(account_id);
create index idx_contacts_normalized_phone on contacts(account_id, normalized_phone);
create index idx_contacts_email on contacts(account_id, email);
create index idx_contact_external_ids_contact on contact_external_ids(contact_id);
create index idx_leads_account on leads(account_id);
create index idx_leads_wa_id on leads(account_id, wa_id);
create index idx_leads_stage on leads(stage);
create index idx_messages_lead on messages(lead_id);
create index idx_messages_wa_id on messages(whatsapp_account_id, wa_message_id);
create index idx_conversation_sessions_lead on conversation_sessions(lead_id);
create index idx_lead_timeline_events_lead on lead_timeline_events(lead_id);
create index idx_webhook_events_provider_id on webhook_events(provider_event_id);
create index idx_consent_records_lead on consent_records(lead_id);
create index idx_outbound_jobs_status on outbound_jobs(status, next_attempt_at);
create index idx_viewings_property on viewings(property_id);
create index idx_viewings_agent on viewings(agent_id);
create index idx_viewings_status on viewings(status);
```

## PostgreSQL extension

```sql
-- Required for exclusion constraint on viewings
create extension if not exists btree_gist;
```

## Exclusion constraint (viewings)

```sql
-- Prevent overlapping viewings for the same property
alter table viewings add exclude using gist (
  property_id with =,
  tstzrange(start_at, end_at) with &&
) where (status in ('scheduled', 'confirmed'));
```

## RLS pattern

Every tenant-owned table follows this pattern:

```sql
alter table <table_name> enable row level security;

create policy "tenant_isolation" on <table_name>
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
```
