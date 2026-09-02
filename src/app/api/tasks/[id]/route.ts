import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  updateTaskStatus,
  updateTask,
  deleteTask,
  VALID_STATUSES,
  TASK_TYPES,
} from "@/lib/analytics/tasks";

interface SessionAccount {
  user: { id: string; email: string | null } | null;
  accountId: string;
  error: NextResponse | null;
}

async function getSessionAccount(supabase: any): Promise<SessionAccount> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      accountId: "",
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const { data: agent } = await supabase
    .from("agents" as any)
    .select("account_id")
    .eq("id", user.id)
    .single();
  const agentUser = { id: user.id, email: user.email ?? null };
  if (!agent) {
    return {
      user: agentUser,
      accountId: "",
      error: NextResponse.json({ error: "No account" }, { status: 403 }),
    };
  }
  return { user: agentUser, accountId: agent.account_id, error: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const session = await getSessionAccount(supabase);
  if (session.error) return session.error;
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const actorId = session.user.id;

  const timelineForStatus = async (status: string, task: any) => {
    if (!task?.lead_id) return;
    if (status !== "completed" && status !== "cancelled") return;
    await supabase.from("lead_timeline_events").insert({
      account_id: task.account_id,
      lead_id: task.lead_id,
      actor_type: "agent",
      actor_id: actorId,
      event_type: `agent_task_${status}`,
      metadata: {
        task_id: task.id,
        title: task.title,
        task_type: task.type,
      },
    });
  };

  if (body.status) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid task status" }, { status: 400 });
    }
    const result = await updateTaskStatus(id, body.status, session.user.id, {
      accountId: session.accountId,
      client: supabase,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    await timelineForStatus(body.status, result.data);
    return NextResponse.json(result.data);
  }

  if (body.type && !TASK_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "Unknown task type" }, { status: 400 });
  }

  const result = await updateTask(
    id,
    {
      title: body.title,
      description: body.description,
      notes: body.notes,
      type: body.type,
      priority: body.priority,
      dueAt: body.due_at,
      agentId: body.agent_id,
    },
    { accountId: session.accountId, client: supabase }
  );

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  return NextResponse.json(result.data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const session = await getSessionAccount(supabase);
  if (session.error) return session.error;
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await deleteTask(id, {
    accountId: session.accountId,
    client: supabase,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}