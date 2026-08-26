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
    .select("account_id")
    .eq("id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const checks = await Promise.allSettled([
    supabase.from("accounts" as any).select("id").limit(1),
    supabase.from("agents" as any).select("id").limit(1),
    supabase.from("whatsapp_accounts" as any).select("id").limit(1),
  ]);

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: {
      accounts: checks[0].status === "fulfilled",
      agents: checks[1].status === "fulfilled",
      whatsapp_accounts: checks[2].status === "fulfilled",
    },
  });
}
