import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateLeadSchema, updateStageSchema } from "@/lib/validators/lead";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("account_id")
    .eq("id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("account_id", agent.account_id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Fetch recent messages
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch timeline events
  const { data: timeline } = await supabase
    .from("lead_timeline_events")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch conversation sessions
  const { data: sessions } = await supabase
    .from("conversation_sessions")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch tasks / follow-ups for this lead
  const { data: tasks } = await supabase
    .from("agent_tasks")
    .select("*, agent:agents(id, name)")
    .eq("lead_id", id)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(50);

  // Mark inbound messages as read now that the agent opened the conversation
  await supabase
    .from("messages" as any)
    .update({ read_at: new Date().toISOString() })
    .eq("lead_id", id)
    .eq("direction", "inbound")
    .is("read_at", null);

  return NextResponse.json({
    lead: data,
    messages: messages || [],
    timeline: timeline || [],
    sessions: sessions || [],
    tasks: tasks || [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("account_id")
    .eq("id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const body = await request.json();

  // Check if this is a stage update
  const stageUpdate = updateStageSchema.safeParse(body);
  if (stageUpdate.success) {
    const { stage, note } = stageUpdate.data;

    // Get current lead
    const { data: currentLead } = await supabase
      .from("leads")
      .select("stage")
      .eq("id", id)
      .eq("account_id", agent.account_id)
      .single();

    if (!currentLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Update stage
    const { error: updateError } = await supabase
      .from("leads")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("account_id", agent.account_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create timeline event
    await supabase.from("lead_timeline_events").insert({
      account_id: agent.account_id,
      lead_id: id,
      actor_type: "agent",
      actor_id: user.id,
      event_type: "stage_changed",
      metadata: {
        from_stage: currentLead.stage,
        to_stage: stage,
        note,
      },
    });

    return NextResponse.json({ stage });
  }

  // General lead update
  const leadUpdate = updateLeadSchema.safeParse(body);
  if (!leadUpdate.success) {
    return NextResponse.json(
      { error: "Invalid data", details: leadUpdate.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .update({ ...leadUpdate.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("account_id", agent.account_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
