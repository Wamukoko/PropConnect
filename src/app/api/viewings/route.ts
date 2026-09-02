import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { viewingFilterSchema } from "@/lib/validators/viewing";
import { resolvePropertyPhotoUrls } from "@/lib/properties";
import { createTaskWithTimeline, hasActiveTaskType } from "@/lib/analytics/tasks";

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
    .select(
      "*, properties(title, address:location_id, public_location_text, price, property_type, listing_type, property_photos(storage_path, thumbnail_path)), leads(name, phone)",
      { count: "exact" }
    )
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

  if (data) {
    for (const viewing of data) {
      const photos = viewing.properties?.property_photos;
      if (photos?.length) {
        const enriched = await Promise.all(
          photos.map(async (p: any) => {
            const urls = await resolvePropertyPhotoUrls(supabase, p);
            return { ...p, ...urls };
          })
        );
        viewing.properties = { ...viewing.properties, property_photos: enriched };
      }
    }
  }

  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const [todayRes, upcomingRes, requestedRes, confirmedRes, completedRes, cancelledRes] =
    await Promise.all([
      supabase.from("viewings").select("id", { count: "exact", head: true })
        .eq("account_id", agent.account_id).gte("start_at", dayStart.toISOString()).lt("start_at", dayEnd.toISOString()),
      supabase.from("viewings").select("id", { count: "exact", head: true })
        .eq("account_id", agent.account_id).gte("start_at", today.toISOString()),
      supabase.from("viewings").select("id", { count: "exact", head: true })
        .eq("account_id", agent.account_id).eq("status", "requested"),
      supabase.from("viewings").select("id", { count: "exact", head: true })
        .eq("account_id", agent.account_id).eq("status", "confirmed"),
      supabase.from("viewings").select("id", { count: "exact", head: true })
        .eq("account_id", agent.account_id).eq("status", "completed"),
      supabase.from("viewings").select("id", { count: "exact", head: true })
        .eq("account_id", agent.account_id).eq("status", "cancelled"),
    ]);

  const stats = {
    today: todayRes.count ?? 0,
    upcoming: upcomingRes.count ?? 0,
    requested: requestedRes.count ?? 0,
    confirmed: confirmedRes.count ?? 0,
    completed: completedRes.count ?? 0,
    cancelled: cancelledRes.count ?? 0,
  };

  return NextResponse.json({
    viewings: data,
    total: count,
    page: filters.page,
    limit: filters.limit,
    totalPages: count ? Math.ceil(count / filters.limit) : 0,
    stats,
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

  // Follow-up task: agent must confirm the requested viewing
  if (body.lead_id) {
    const hasConfirm = await hasActiveTaskType(
      {
        accountId: agent.account_id,
        leadId: body.lead_id,
        type: "confirm_viewing",
      },
      supabase
    );
    if (!hasConfirm) {
      await createTaskWithTimeline(
        {
          accountId: agent.account_id,
          leadId: body.lead_id,
          agentId: body.agent_id || user.id,
          actorAgentId: user.id,
          type: "confirm_viewing",
          title: "Confirm viewing request",
          description: `A viewing has been requested and needs confirmation before the slot.`,
          priority: "medium",
          dueAt: startAt.toISOString(),
        },
        supabase
      );
    }
  }

  return NextResponse.json({ viewing: data }, { status: 201 });
}
