import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createTaskWithTimeline,
  listTasks,
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
    .select("account_id, name")
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

export async function GET(request: Request) {
  const supabase = await createClient();
  const session = await getSessionAccount(supabase);
  if (session.error) return session.error;
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { data, error } = await listTasks(
    {
      accountId: session.accountId,
      status: searchParams.get("status") || undefined,
      type: searchParams.get("type") || undefined,
      leadId: searchParams.get("lead_id") || undefined,
      agentId: searchParams.get("agent_id") || undefined,
      mine: searchParams.get("mine") === "true",
      actorAgentId: session.user.id,
    },
    supabase
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tasks: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const session = await getSessionAccount(supabase);
  if (session.error) return session.error;
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (body.type && !TASK_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "Unknown task type" }, { status: 400 });
  }

  const { data, error } = await createTaskWithTimeline(
    {
      accountId: session.accountId,
      agentId: body.agent_id ?? session.user.id,
      actorAgentId: session.user.id,
      leadId: body.lead_id ?? null,
      type: body.type,
      title: body.title,
      description: body.description,
      notes: body.notes,
      priority: body.priority,
      dueAt: body.due_at ?? null,
    },
    supabase
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}