import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/contacts/google";

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

  const auth = buildAuthUrl({
    accountId: agent.account_id,
    agentId: user.id,
  });

  if (!auth) {
    return NextResponse.json(
      { error: "Google Contacts sync is not configured or disabled" },
      { status: 501 }
    );
  }

  return NextResponse.redirect(auth.url);
}
