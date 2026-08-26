import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/whatsapp/webhook";
import { parseWebhookPayload } from "@/lib/whatsapp/parser";
import { processInboundMessage, processStatusCallback } from "@/lib/whatsapp/processor";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "propconnect_verify";
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const supabase = createAdminClient();

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    if (!APP_SECRET) {
      console.error("[whatsapp-webhook] WHATSAPP_APP_SECRET not configured");
      return NextResponse.json({ status: "error", message: "Webhook not configured" }, { status: 500 });
    }

    if (!verifyWebhookSignature(rawBody, signature, APP_SECRET)) {
      console.warn("[whatsapp-webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const parsed = parseWebhookPayload(payload);

    // Find the whatsapp_accounts record for this phone_number_id
    const { data: waAccount } = await supabase
      .from("whatsapp_accounts")
      .select("id, account_id")
      .eq("phone_number_id", parsed.phoneNumberId)
      .single();

    if (!waAccount) {
      console.warn(`[whatsapp-webhook] Unknown phone_number_id: ${parsed.phoneNumberId}`);
      return NextResponse.json({ status: "received" });
    }

    // Check for duplicate webhook (idempotency)
    const { data: existing } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("provider_event_id", parsed.providerEventId)
      .single();

    if (existing) {
      return NextResponse.json({ status: "received", duplicate: true });
    }

    // Ingest the webhook event
    const { error: insertError } = await supabase.from("webhook_events").insert({
      account_id: waAccount.account_id,
      whatsapp_account_id: waAccount.id,
      provider_event_id: parsed.providerEventId,
      processing_state: "processing",
      raw_payload: payload,
    });

    if (insertError) {
      console.error("[whatsapp-webhook] Failed to ingest event:", insertError);
      return NextResponse.json({ status: "error" }, { status: 500 });
    }

    // Process inbound messages
    for (const msg of parsed.messages) {
      // Resolve or create lead from phone number
      const leadId = await resolveLead(supabase, waAccount.account_id, msg.from);

      // Update contact name from WhatsApp profile
      const contact = parsed.contacts.find((c) => c.waId === msg.from);
      if (contact?.name && leadId) {
        await supabase
          .from("leads")
          .update({ whatsapp_name: contact.name })
          .eq("id", leadId);
      }

      await processInboundMessage(supabase, {
        accountId: waAccount.account_id,
        whatsappAccountId: waAccount.id,
        leadId,
        message: msg,
      });
    }

    // Process status callbacks
    for (const status of parsed.statuses) {
      await processStatusCallback(supabase, {
        accountId: waAccount.account_id,
        whatsappAccountId: waAccount.id,
        status,
      });
    }

    // Mark event as processed
    await supabase
      .from("webhook_events")
      .update({ processing_state: "processed", processed_at: new Date().toISOString() })
      .eq("provider_event_id", parsed.providerEventId);

    return NextResponse.json({ status: "received" });
  } catch (error) {
    console.error("[whatsapp-webhook] Processing error:", error);
    return NextResponse.json({ status: "received" });
  }
}

async function resolveLead(
  supabase: ReturnType<typeof createAdminClient>,
  accountId: string,
  phone: string
): Promise<string | null> {
  const normalized = phone.replace(/\D/g, "");
  const formatted = normalized.startsWith("254")
    ? `+${normalized}`
    : normalized.startsWith("0")
      ? `+254${normalized.slice(1)}`
      : `+${normalized}`;

  // Try to find existing lead
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("account_id", accountId)
    .eq("phone", formatted)
    .single();

  if (existingLead) return existingLead.id;

  // Create new lead
  const { data: newLead, error } = await supabase
    .from("leads")
    .insert({
      account_id: accountId,
      phone: formatted,
      stage: "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[whatsapp-webhook] Failed to create lead:", error);
    return null;
  }

  return newLead.id;
}
