import { createAdminClient } from "@/lib/supabase/admin";
import {
  TASK_TYPES,
  TASK_TYPE_LABELS,
  VALID_STATUSES,
  STATUS_LABELS,
  VALID_PRIORITIES,
  PRIORITY_LABELS,
} from "@/lib/analytics/task-types";

import type { TaskType, TaskStatus, TaskPriority } from "@/lib/analytics/task-types";

export {
  TASK_TYPES,
  TASK_TYPE_LABELS,
  VALID_STATUSES,
  STATUS_LABELS,
  VALID_PRIORITIES,
  PRIORITY_LABELS,
};
export type { TaskType, TaskStatus, TaskPriority } from "@/lib/analytics/task-types";

type DbClient = any;

function defaultClient(): DbClient {
  return createAdminClient();
}

export interface CreateTaskInput {
  accountId: string;
  agentId?: string | null;
  leadId?: string | null;
  type?: TaskType;
  title: string;
  description?: string;
  notes?: string;
  priority?: TaskPriority;
  dueAt?: string | null;
}

function normalizeTaskRow(input: CreateTaskInput) {
  return {
    account_id: input.accountId,
    agent_id: input.agentId ?? null,
    lead_id: input.leadId ?? null,
    type: TASK_TYPES.includes(input.type as TaskType) ? input.type : ("lead_follow_up" as TaskType),
    title: input.title,
    description: input.description ?? null,
    notes: input.notes ?? null,
    priority: VALID_PRIORITIES.includes(input.priority as TaskPriority)
      ? input.priority
      : ("medium" as TaskPriority),
    due_at: input.dueAt ?? null,
    status: "pending",
  };
}

export async function createTask(input: CreateTaskInput, client: DbClient = defaultClient()) {
  return await client
    .from("agent_tasks" as any)
    .insert(normalizeTaskRow(input))
    .select()
    .single();
}

/**
 * Create a task and immediately record the agent_task_created event on the
 * lead timeline when the task is linked to a lead.
 */
export async function createTaskWithTimeline(
  input: CreateTaskInput & { actorAgentId?: string | null },
  client: DbClient = defaultClient()
) {
  const { data: task, error } = await createTask(input, client);
  if (error || !task) {
    return { data: task, error };
  }
  if (task.lead_id) {
    await client.from("lead_timeline_events").insert({
      account_id: task.account_id,
      lead_id: task.lead_id,
      actor_type: "agent",
      actor_id: input.actorAgentId ?? task.agent_id ?? null,
      event_type: "agent_task_created",
      metadata: {
        task_id: task.id,
        title: task.title,
        task_type: task.type,
        status: task.status,
        due_at: task.due_at,
      },
    });
  }
  return { data: task, error: null };
}

export async function listTasks(
  input: {
    accountId: string;
    status?: string;
    type?: string;
    leadId?: string;
    agentId?: string;
    mine?: boolean;
    actorAgentId?: string | null;
    limit?: number;
  },
  client: DbClient = defaultClient()
) {
  let query: any = client
    .from("agent_tasks" as any)
    .select(
      "*, lead:leads(id, name, whatsapp_name, phone, email, stage), agent:agents(id, name)"
    )
    .eq("account_id", input.accountId);
  if (input.status) query = query.eq("status", input.status);
  if (input.type) query = query.eq("type", input.type);
  if (input.leadId) query = query.eq("lead_id", input.leadId);
  if (input.mine && input.actorAgentId) query = query.eq("agent_id", input.actorAgentId);
  else if (input.agentId) query = query.eq("agent_id", input.agentId);
  const { data, error } = await query
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(input.limit ?? 200);
  return { data, error };
}

export async function updateTaskStatus(
  id: string,
  status: string,
  actorAgentId: string | null,
  opts: { accountId?: string; client?: DbClient } = {}
) {
  const client = opts.client ?? defaultClient();
  if (!VALID_STATUSES.includes(status as TaskStatus)) {
    return { error: new Error("Invalid task status") };
  }
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    updated_at: now,
  };
  if (status === "completed") {
    patch.completed_at = now;
  }
  if (status === "pending" || status === "in_progress") {
    patch.completed_at = null;
  }
  if (actorAgentId) {
    patch.agent_id = actorAgentId;
  }
  let query = client.from("agent_tasks" as any).update(patch).eq("id", id);
  if (opts.accountId) query = query.eq("account_id", opts.accountId);
  return await query.select().single();
}

export async function updateTask(
  id: string,
  input: Partial<CreateTaskInput>,
  opts: { accountId?: string; client?: DbClient } = {}
) {
  const client = opts.client ?? defaultClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.notes !== undefined) patch.notes = input.notes ?? null;
  if (input.type !== undefined) {
    patch.type = TASK_TYPES.includes(input.type as TaskType)
      ? input.type
      : ("lead_follow_up" as TaskType);
  }
  if (input.priority !== undefined) {
    patch.priority = VALID_PRIORITIES.includes(input.priority as TaskPriority)
      ? input.priority
      : ("medium" as TaskPriority);
  }
  if (input.dueAt !== undefined) patch.due_at = input.dueAt ?? null;
  if (input.agentId !== undefined) patch.agent_id = input.agentId ?? null;
  let query = client.from("agent_tasks" as any).update(patch).eq("id", id);
  if (opts.accountId) query = query.eq("account_id", opts.accountId);
  return await query.select().single();
}

export async function deleteTask(
  id: string,
  opts: { accountId?: string; client?: DbClient } = {}
) {
  const client = opts.client ?? defaultClient();
  let query = client.from("agent_tasks" as any).delete().eq("id", id);
  if (opts.accountId) query = query.eq("account_id", opts.accountId);
  return await query;
}

/**
 * Whether a lead already has an outstanding task of a given type — used to
 * prevent duplicate tasks created automatically from pipeline events.
 */
export async function hasActiveTaskType(
  input: { accountId: string; leadId: string; type: TaskType },
  client: DbClient = defaultClient()
) {
  const { count } = await client
    .from("agent_tasks" as any)
    .select("id", { count: "exact", head: true })
    .eq("account_id", input.accountId)
    .eq("lead_id", input.leadId)
    .eq("type", input.type)
    .in("status", ["pending", "in_progress"]);
  return (count ?? 0) > 0;
}

/**
 * Suggest a follow-up task for a lead whose last contact was long ago.
 * Returns the suggested task without persisting it (agent confirms).
 */
export async function suggestFollowUp(input: {
  accountId: string;
  agentId: string | null;
  leadId: string;
  leadName: string | null;
  daysSinceContact: number;
}) {
  const priority: TaskPriority =
    input.daysSinceContact >= 14
      ? "high"
      : input.daysSinceContact >= 7
        ? "medium"
        : "low";
  return {
    type: "lead_follow_up" as TaskType,
    title: `Follow up with ${input.leadName || "lead"}`,
    description: `Lead has not been contacted in ${input.daysSinceContact} days.`,
    priority,
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}