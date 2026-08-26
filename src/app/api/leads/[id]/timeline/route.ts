import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const url = new URL(request.url);

  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const before = url.searchParams.get("before");

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

  // Verify lead belongs to this account
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .eq("account_id", agent.account_id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  let query = supabase
    .from("lead_timeline_events")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data });
}

export async function POST(
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

  if (!body.event_type) {
    return NextResponse.json({ error: "event_type is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lead_timeline_events")
    .insert({
      account_id: agent.account_id,
      lead_id: id,
      actor_type: body.actor_type || "agent",
      actor_id: user.id,
      event_type: body.event_type,
      property_id: body.property_id || null,
      metadata: body.metadata || {},
      dedup_key: body.dedup_key || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data }, { status: 201 });
}
