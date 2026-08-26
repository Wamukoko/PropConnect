import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { viewingFilterSchema } from "@/lib/validators/viewing";

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);

  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { params[k] = v; });

  const parsed = viewingFilterSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : viewingFilterSchema.parse({});

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

  let query = supabase
    .from("viewings")
    .select("*, properties(title, address:location_id), leads(name, phone)", { count: "exact" })
    .eq("account_id", agent.account_id);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.property_id) {
    query = query.eq("property_id", filters.property_id);
  }
  if (filters.lead_id) {
    query = query.eq("lead_id", filters.lead_id);
  }
  if (filters.from) {
    query = query.gte("start_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("start_at", filters.to);
  }

  const offset = (filters.page - 1) * filters.limit;
  query = query
    .order("start_at", { ascending: true })
    .range(offset, offset + filters.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    viewings: data,
    total: count,
    page: filters.page,
    limit: filters.limit,
    totalPages: count ? Math.ceil(count / filters.limit) : 0,
  });
}

export async function POST(request: Request) {
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

  // Validate times
  const startAt = new Date(body.start_at);
  const endAt = new Date(body.end_at);

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  if (endAt <= startAt) {
    return NextResponse.json({ error: "end_at must be after start_at" }, { status: 400 });
  }

  // Minimum notice: 2 hours
  const minNotice = new Date(Date.now() + 2 * 60 * 60 * 1000);
  if (startAt < minNotice) {
    return NextResponse.json({ error: "Viewing must be at least 2 hours in advance" }, { status: 400 });
  }

  // Try to insert — exclusion constraint will prevent overlaps
  const { data, error } = await supabase
    .from("viewings")
    .insert({
      account_id: agent.account_id,
      property_id: body.property_id,
      lead_id: body.lead_id,
      agent_id: body.agent_id || user.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "requested",
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    if (error.message?.includes("viewings_no_overlap")) {
      return NextResponse.json(
        { error: "This time slot overlaps with an existing viewing" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create timeline event for the lead
  await supabase.from("lead_timeline_events").insert({
    account_id: agent.account_id,
    lead_id: body.lead_id,
    property_id: body.property_id,
    actor_type: "agent",
    actor_id: user.id,
    event_type: "viewing_requested",
    metadata: {
      viewing_id: data.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
    },
  });

  return NextResponse.json({ viewing: data }, { status: 201 });
}
