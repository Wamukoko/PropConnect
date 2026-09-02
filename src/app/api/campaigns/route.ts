import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  createBroadcastCampaign,
  listBroadcastCampaigns,
} from "@/lib/broadcasts";

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

  const { data, error } = await listBroadcastCampaigns(agent.account_id, supabase);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ campaigns: data });
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
  if (!body?.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body?.template_name) {
    return NextResponse.json(
      { error: "template_name is required" },
      { status: 400 }
    );
  }

  const { data: waAccount } = await supabase
    .from("whatsapp_accounts" as any)
    .select("id")
    .eq("account_id", agent.account_id)
    .limit(1)
    .single();

  if (!waAccount) {
    return NextResponse.json(
      { error: "No WhatsApp account configured" },
      { status: 400 }
    );
  }

  const result = await createBroadcastCampaign(
    {
      accountId: agent.account_id,
      agentId: user.id,
      whatsappAccountId: waAccount.id,
      name: body.name,
      templateName: body.template_name,
      language: body.language || "en",
      payload: body.payload || {},
      targetFilter: body.target_filter || {},
    },
    supabase
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 501 });
  }
  return NextResponse.json({ id: result.campaignId }, { status: 201 });
}
