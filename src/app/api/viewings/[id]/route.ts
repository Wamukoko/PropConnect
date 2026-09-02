import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTaskWithTimeline, hasActiveTaskType } from "@/lib/analytics/tasks";

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
    .from("viewings")
    .select("*, properties(title, public_location_text, price, property_type, listing_type), leads(name, phone, email)")
    .eq("id", id)
    .eq("account_id", agent.account_id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Viewing not found" }, { status: 404 });
  }

  return NextResponse.json({ viewing: data });
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

  // Get current viewing
  const { data: current } = await supabase
    .from("viewings")
    .select("status, lead_id, property_id, start_at")
    .eq("id", id)
    .eq("account_id", agent.account_id)
    .single();

  if (!current) {
    return NextResponse.json({ error: "Viewing not found" }, { status: 404 });
  }

  // Handle status updates
  if (body.status) {
    const validTransitions: Record<string, string[]> = {
      requested: ["confirmed", "cancelled"],
      confirmed: ["completed", "cancelled", "no_show"],
      rescheduled: ["confirmed", "cancelled"],
    };

    if (!validTransitions[current.status]?.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${current.status} to ${body.status}` },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("viewings")
      .update({
        status: body.status,
        cancelled_reason: body.status === "cancelled" ? body.cancelled_reason : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("account_id", agent.account_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create timeline event
    await supabase.from("lead_timeline_events").insert({
      account_id: agent.account_id,
      lead_id: current.lead_id,
      property_id: current.property_id,
      actor_type: "agent",
      actor_id: user.id,
      event_type: `viewing_${body.status}`,
      metadata: {
        viewing_id: id,
        reason: body.cancelled_reason,
      },
    });

    // Follow-up task after a completed viewing
    if (body.status === "completed" && current.lead_id) {
      const hasFollowUp = await hasActiveTaskType(
        {
          accountId: agent.account_id,
          leadId: current.lead_id,
          type: "post_viewing_follow_up",
        },
        supabase
      );
      if (!hasFollowUp) {
        await createTaskWithTimeline(
          {
            accountId: agent.account_id,
            leadId: current.lead_id,
            agentId: user.id,
            actorAgentId: user.id,
            type: "post_viewing_follow_up",
            title: "Post-viewing follow-up",
            description: `The viewing has been completed — follow up with the customer to gauge interest and next steps.`,
            priority: "medium",
            dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
          supabase
        );
      }
    }

    return NextResponse.json({ status: body.status });
  }

  // Handle notes update
  if (body.notes !== undefined) {
    const { error } = await supabase
      .from("viewings")
      .update({ notes: body.notes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("account_id", agent.account_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "No valid update provided" }, { status: 400 });
}

export async function DELETE(
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

  // Soft cancel instead of hard delete
  const { error } = await supabase
    .from("viewings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("account_id", agent.account_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
