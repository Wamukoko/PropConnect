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
  const text = body?.body as string | undefined;

  if (!leadId || !text?.trim()) {
    return NextResponse.json({ error: "lead_id and body required" }, { status: 400 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, phone, opted_out")
    .eq("id", leadId)
    .eq("account_id", agent.account_id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (lead.opted_out) {
    return NextResponse.json({ error: "Lead has opted out" }, { status: 400 });
  }

  const { data: whatsappAccount } = await supabase
    .from("whatsapp_accounts")
    .select("id")
    .eq("account_id", agent.account_id)
    .limit(1)
    .single();

  const trimmedText = text.trim();

  const { error: msgError } = await supabase.from("messages").insert({
    account_id: agent.account_id,
    lead_id: leadId,
    whatsapp_account_id: whatsappAccount?.id || null,
    direction: "outbound",
    type: "text",
    content: { body: trimmedText },
  });

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  if (whatsappAccount) {
    try {
      const { enqueueMessage } = await import("@/lib/whatsapp/outbound");
      await enqueueMessage({
        accountId: agent.account_id,
        leadId: leadId,
        whatsappAccountId: whatsappAccount.id,
        jobType: "text",
        payload: { text: trimmedText },
        purpose: "service_messages",
      });
    } catch (err: any) {
      return NextResponse.json({
        ok: true,
        warning: err.message || "Message saved but delivery queue failed",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
