-- PropConnect Migration 005: Outbound Queue Enhancements
-- Creates: consent_records, system_settings

-- ============================================================
-- consent_records
-- ============================================================
create table consent_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  purpose text not null
    check (purpose in ('service_messages', 'saved_search_alerts', 'broadcasts')),
  granted boolean not null,
  granted_at timestamptz,
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table consent_records enable row level security;

create policy "tenant_isolation_consent" on consent_records
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

create policy "service_role_consent" on consent_records
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_consent_account on consent_records(account_id);
create index idx_consent_lead on consent_records(lead_id);
create index idx_consent_purpose on consent_records(purpose);

-- ============================================================
-- system_settings (for kill switch and config)
-- ============================================================
create table system_settings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  setting_key text not null,
  setting_value jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, setting_key)
);

alter table system_settings enable row level security;

create policy "tenant_isolation_settings" on system_settings
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

create policy "service_role_settings" on system_settings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_settings_account_key on system_settings(account_id, setting_key);

-- Seed default kill switch as OFF for Qabila
insert into system_settings (account_id, setting_key, setting_value)
select a.id, 'outbound_kill_switch', '{"enabled": false}'::jsonb
from accounts a where a.slug = 'qabila-realtors'
on conflict (account_id, setting_key) do nothing;
