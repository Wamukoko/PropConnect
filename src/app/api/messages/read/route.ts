import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const body = await request.json().catch(() => null);
  const leadId = body?.lead_id as string | undefined;

  const now = new Date().toISOString();
  let query = supabase
    .from("messages")
    .update({ read_at: now })
    .eq("account_id", agent.account_id)
    .eq("direction", "inbound")
    .is("read_at", null);
  if (leadId) {
    query = query.eq("lead_id", leadId);
  }
  const { error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ updated: count ?? null, read_at: now });
}