-- PropConnect Migration 007: P1 Features
-- Creates: saved_searches, agent_tasks, analytics tables, contact_external_ids

-- ============================================================
-- saved_searches
-- ============================================================
create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  agent_id uuid references agents(id),
  name text not null,
  filters jsonb not null default '{}',
  alert_enabled boolean not null default false,
  alert_frequency text not null default 'daily'
    check (alert_frequency in ('instant', 'daily', 'weekly')),
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table saved_searches enable row level security;

create policy "tenant_isolation_saved_searches" on saved_searches
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

create policy "service_role_saved_searches" on saved_searches
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_saved_searches_account on saved_searches(account_id);

-- ============================================================
-- agent_tasks
-- ============================================================
create table agent_tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  agent_id uuid references agents(id),
  lead_id uuid references leads(id),
  title text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table agent_tasks enable row level security;

create policy "tenant_isolation_agent_tasks" on agent_tasks
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

create policy "service_role_agent_tasks" on agent_tasks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_agent_tasks_account on agent_tasks(account_id);
create index idx_agent_tasks_agent on agent_tasks(agent_id);
create index idx_agent_tasks_status on agent_tasks(status);

-- ============================================================
-- contact_external_ids (Google Contacts external linkage)
-- ============================================================
create table contact_external_ids (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  contact_id uuid not null references contacts(id),
  provider text not null default 'google',
  external_id text not null,
  raw jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(provider, external_id)
);

alter table contact_external_ids enable row level security;

create policy "tenant_isolation_contact_external" on contact_external_ids
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

create policy "service_role_contact_external" on contact_external_ids
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_contact_external_contact on contact_external_ids(contact_id);
create index idx_contact_external_account on contact_external_ids(account_id);

-- ============================================================
-- analytics_events (deduplicated analytics source)
-- ============================================================
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  event_key text not null,
  event_type text not null,
  lead_id uuid references leads(id),
  property_id uuid references properties(id),
  meta jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  unique(account_id, event_key)
);

alter table analytics_events enable row level security;

create policy "tenant_isolation_analytics_events" on analytics_events
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

create policy "service_role_analytics_events" on analytics_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_analytics_events_account on analytics_events(account_id);
create index idx_analytics_events_type on analytics_events(event_type);
create index idx_analytics_events_key on analytics_events(event_key);
