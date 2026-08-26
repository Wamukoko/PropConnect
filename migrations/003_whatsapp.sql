-- PropConnect Migration 003: WhatsApp Foundation
-- Creates: webhook_events, messages, outbound_messages, outbound_jobs

-- ============================================================
-- webhook_events
-- ============================================================
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

alter table webhook_events enable row level security;

create policy "service_role_webhook_events" on webhook_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_webhook_events_provider_id on webhook_events(provider_event_id);
create index idx_webhook_events_state on webhook_events(processing_state);
create index idx_webhook_events_received on webhook_events(received_at);

-- ============================================================
-- messages
-- ============================================================
create type message_direction as enum ('inbound', 'outbound');
create type message_type as enum (
  'text', 'image', 'video', 'audio', 'document',
  'location', 'interactive', 'template', 'system'
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid,
  whatsapp_account_id uuid references whatsapp_accounts(id),
  direction message_direction not null,
  type message_type not null,
  content jsonb not null,
  wa_message_id text,
  provider_timestamp timestamptz,
  correlation_id text,
  created_at timestamptz not null default now(),
  unique(whatsapp_account_id, wa_message_id)
);

alter table messages enable row level security;

create policy "tenant_isolation_messages" on messages
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

-- Also allow service role for webhook ingestion
create policy "service_role_messages" on messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_messages_account on messages(account_id);
create index idx_messages_lead on messages(lead_id);
create index idx_messages_wa_id on messages(whatsapp_account_id, wa_message_id);
create index idx_messages_correlation on messages(correlation_id);
create index idx_messages_created on messages(created_at);

-- ============================================================
-- outbound_messages
-- ============================================================
create type outbound_message_status as enum (
  'queued', 'sent', 'delivered', 'read', 'failed', 'cancelled'
);

create table outbound_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null,
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

alter table outbound_messages enable row level security;

create policy "tenant_isolation_outbound_messages" on outbound_messages
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

create policy "service_role_outbound_messages" on outbound_messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_outbound_messages_account on outbound_messages(account_id);
create index idx_outbound_messages_status on outbound_messages(status);
create index idx_outbound_messages_lead on outbound_messages(lead_id);

-- ============================================================
-- outbound_jobs
-- ============================================================
create type outbound_job_status as enum (
  'queued', 'processing', 'sent', 'failed', 'cancelled'
);

create table outbound_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null,
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

alter table outbound_jobs enable row level security;

create policy "tenant_isolation_outbound_jobs" on outbound_jobs
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

create policy "service_role_outbound_jobs" on outbound_jobs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_outbound_jobs_status on outbound_jobs(status, next_attempt_at);
create index idx_outbound_jobs_account on outbound_jobs(account_id);
create index idx_outbound_jobs_idempotency on outbound_jobs(idempotency_key);

-- ============================================================
-- PostgreSQL function for atomic job claiming
-- ============================================================
create or replace function claim_outbound_job(
  p_worker_id text,
  p_batch_size int default 20
)
returns setof outbound_jobs
language plpgsql
as $$
begin
  return query
  update outbound_jobs
  set
    status = 'processing',
    locked_at = now(),
    locked_by = p_worker_id,
    attempts = attempts + 1
  where id in (
    select oj.id
    from outbound_jobs oj
    where oj.status = 'queued'
      and oj.next_attempt_at <= now()
    order by oj.created_at
    limit p_batch_size
    for update skip locked
  )
  returning *;
end;
$$;
