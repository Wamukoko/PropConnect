-- PropConnect Migration 009: Agent Tasks — types, notes, due-date indexing
-- Aligns agent_tasks with the task/follow-up model in the build spec
-- (Prompt.md section 23: typed tasks + notes + agent work queue).

-- ============================================================
-- agent_tasks.type — required; defaults for pre-existing rows
-- ============================================================
alter table agent_tasks add column if not exists type text not null default 'lead_follow_up';

alter table agent_tasks drop constraint if exists agent_tasks_type_check;
alter table agent_tasks add constraint agent_tasks_type_check
  check (
    type in (
      'lead_follow_up',
      'call_customer',
      'send_property_options',
      'confirm_viewing',
      'post_viewing_follow_up',
      'request_documents',
      'negotiation_follow_up'
    )
  );

-- ============================================================
-- agent_tasks.notes — free-form follow-up notes per the spec
-- ============================================================
alter table agent_tasks add column if not exists notes text;

-- ============================================================
-- Work-queue indexes
-- ============================================================
create index if not exists idx_agent_tasks_type on agent_tasks(type);
create index if not exists idx_agent_tasks_due on agent_tasks(due_at);