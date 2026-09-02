-- PropConnect Migration 008: P2 Features (feature-flagged)
-- Creates: documents, broadcast_campaigns, broadcast_recipients,
--          ai_jobs, catalog_sync_state

-- ============================================================
-- documents (sensitive documents, e.g. proof of funds)
-- ============================================================
create table documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid references leads(id),
  contact_id uuid references contacts(id),
  doc_type text not null,
  storage_path text not null,
  display_name text not null,
  mime_type text,
  size_bytes bigint,
  retention_days int,
  expires_at timestamptz,
  created_by uuid references agents(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table documents enable row level security;

create policy "tenant_isolation_documents" on documents
  for all
  using (
    account_id in (
      select a.account_id from agents a where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a where a.id = auth.uid()
    )
  );

create policy "service_role_documents" on documents
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_documents_account on documents(account_id);
create index idx_documents_lead on documents(lead_id);

-- ============================================================
-- broadcast_campaigns
-- ============================================================
create table broadcast_campaigns (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'sending', 'completed', 'cancelled', 'failed')),
  template_name text,
  language text not null default 'en',
  payload jsonb not null default '{}',
  target_filter jsonb not null default '{}',
  total_recipients int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references agents(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table broadcast_campaigns enable row level security;

create policy "tenant_isolation_broadcast_campaigns" on broadcast_campaigns
  for all
  using (
    account_id in (
      select a.account_id from agents a where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a where a.id = auth.uid()
    )
  );

create policy "service_role_broadcast_campaigns" on broadcast_campaigns
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- broadcast_recipients
-- ============================================================
create table broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  campaign_id uuid not null references broadcast_campaigns(id) on delete cascade,
  lead_id uuid not null references leads(id),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(campaign_id, lead_id)
);

alter table broadcast_recipients enable row level security;

create policy "tenant_isolation_broadcast_recipients" on broadcast_recipients
  for all
  using (
    account_id in (
      select a.account_id from agents a where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a where a.id = auth.uid()
    )
  );

create policy "service_role_broadcast_recipients" on broadcast_recipients
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_broadcast_recipients_campaign on broadcast_recipients(campaign_id);

-- ============================================================
-- ai_jobs (AI copilot job queue; output stored separately)
-- ============================================================
create table ai_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  agent_id uuid references agents(id),
  job_type text not null,
  input jsonb not null default '{}',
  output jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error text,
  model text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table ai_jobs enable row level security;

create policy "tenant_isolation_ai_jobs" on ai_jobs
  for all
  using (
    account_id in (
      select a.account_id from agents a where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a where a.id = auth.uid()
    )
  );

create policy "service_role_ai_jobs" on ai_jobs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_ai_jobs_account on ai_jobs(account_id);

-- ============================================================
-- catalog_sync_state
-- ============================================================
create table catalog_sync_state (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  catalog_id text,
  status text not null default 'idle',
  last_synced_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table catalog_sync_state enable row level security;

create policy "tenant_isolation_catalog_sync" on catalog_sync_state
  for all
  using (
    account_id in (
      select a.account_id from agents a where a.id = auth.uid()
    )
  )
  with check (
    account_id in (
      select a.account_id from agents a where a.id = auth.uid()
    )
  );

create policy "service_role_catalog_sync" on catalog_sync_state
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
