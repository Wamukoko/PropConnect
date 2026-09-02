import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
    .select("*")
    .eq("id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const { data: account } = await supabase
    .from("accounts" as any)
    .select("*")
    .eq("id", agent.account_id)
    .single();

  return NextResponse.json({ agent, account: account || null });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const agentPatch: Record<string, unknown> = {};
  if (typeof body.name === "string") agentPatch.name = body.name;
  if (typeof body.role === "string") agentPatch.role = body.role;

  let savedAgent = null;

  if (process.env.FEATURE_MOCK_AUTH === "true") {
    savedAgent = {
      id: user.id,
      account_id: "00000000-0000-0000-0000-000000000010",
      name: agentPatch.name ?? "Admin User",
      email: user.email ?? "",
      role: agentPatch.role ?? "admin",
      active: true,
    };
    return NextResponse.json({ agent: savedAgent });
  }

  const { data: current } = await supabase
    .from("agents" as any)
    .select("*")
    .eq("id", user.id)
    .single();

  if (!current) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const { data } = await supabase
    .from("agents" as any)
    .update({ ...agentPatch, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  return NextResponse.json({ agent: data || { ...current, ...agentPatch } });
}
