-- PropConnect Migration 006: Viewing Scheduler
-- Creates: viewings, working_hours, blackout_dates

-- ============================================================
-- viewings
-- ============================================================
create table viewings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  property_id uuid not null references properties(id),
  lead_id uuid not null references leads(id),
  agent_id uuid references agents(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show')),
  cancelled_reason text,
  rescheduled_from uuid references viewings(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

-- Exclusion constraint: prevent overlapping viewings for the same property
-- Requires btree_gist extension
create extension if not exists btree_gist;

alter table viewings add constraint viewings_no_overlap
  exclude using gist (
    property_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) where (status not in ('cancelled', 'rescheduled'));

alter table viewings enable row level security;

create policy "tenant_isolation_viewings" on viewings
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

create policy "service_role_viewings" on viewings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index idx_viewings_account on viewings(account_id);
create index idx_viewings_property on viewings(property_id);
create index idx_viewings_lead on viewings(lead_id);
create index idx_viewings_agent on viewings(agent_id);
create index idx_viewings_status on viewings(status);
create index idx_viewings_start on viewings(start_at);

-- ============================================================
-- working_hours
-- ============================================================
create table working_hours (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_duration_minutes int not null default 30,
  buffer_minutes int not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, day_of_week)
);

alter table working_hours enable row level security;

create policy "tenant_isolation_working_hours" on working_hours
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

create policy "service_role_working_hours" on working_hours
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- blackout_dates
-- ============================================================
create table blackout_dates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique(account_id, date)
);

alter table blackout_dates enable row level security;

create policy "tenant_isolation_blackout" on blackout_dates
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

create policy "service_role_blackout" on blackout_dates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- Seed default working hours for Qabila (Mon-Fri 8am-6pm)
-- ============================================================
insert into working_hours (account_id, day_of_week, start_time, end_time, slot_duration_minutes, buffer_minutes)
select a.id, d.day_of_week, '08:00'::time, '18:00'::time, 30, 15
from accounts a
cross join (select generate_series(1, 5) as day_of_week) d
where a.slug = 'qabila-realtors'
on conflict (account_id, day_of_week) do nothing;
