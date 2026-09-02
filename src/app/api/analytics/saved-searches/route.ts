import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createSavedSearch,
  listSavedSearches,
} from "@/lib/analytics/saved-searches";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents" as any)
    .select("account_id")
    .eq("id", user.id)
    .single();
  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const { data, error } = await listSavedSearches(agent.account_id, supabase);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ searches: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents" as any)
    .select("account_id")
    .eq("id", user.id)
    .single();
  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const body = await request.json();
  if (!body?.name || !body?.filters) {
    return NextResponse.json(
      { error: "name and filters are required" },
      { status: 400 }
    );
  }

  const { data, error } = await createSavedSearch({
    accountId: agent.account_id,
    agentId: user.id,
    name: body.name,
    filters: body.filters,
    alertEnabled: body.alert_enabled,
    alertFrequency: body.alert_frequency,
  }, supabase);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
