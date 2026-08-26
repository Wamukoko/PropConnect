import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setKillSwitch } from "@/lib/whatsapp/outbound";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("account_id, role")
    .eq("id", user.id)
    .single();

  if (!agent || agent.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 });
  }

  await setKillSwitch(agent.account_id, body.enabled);

  return NextResponse.json({
    killSwitch: body.enabled,
    message: body.enabled
      ? "Outbound messaging DISABLED"
      : "Outbound messaging RE-ENABLED",
  });
}
