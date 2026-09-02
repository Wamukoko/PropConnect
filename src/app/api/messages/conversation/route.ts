import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead_id");
  if (!leadId) {
    return NextResponse.json({ error: "lead_id required" }, { status: 400 });
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("account_id", agent.account_id)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })
    .limit(200);

  const now = new Date().toISOString();
  await supabase
    .from("messages")
    .update({ read_at: now })
    .eq("account_id", agent.account_id)
    .eq("lead_id", leadId)
    .eq("direction", "inbound")
    .is("read_at", null);

  return NextResponse.json({ messages: messages || [] });
}
