import type { SupabaseClient } from "@supabase/supabase-js";

interface ProcessMessageParams {
  accountId: string;
  whatsappAccountId: string;
  leadId: string | null;
  message: {
    waMessageId: string;
    from: string;
    timestamp: string;
    type: string;
    content: Record<string, any>;
    contextFrom?: string;
    contextId?: string;
  };
}

interface ProcessStatusParams {
  accountId: string;
  whatsappAccountId: string;
  status: {
    waMessageId: string;
    recipientId: string;
    timestamp: string;
    status: "sent" | "delivered" | "read" | "failed";
    errors?: { code: number; title: string; message: string }[];
  };
}

export async function processInboundMessage(
  supabase: SupabaseClient,
  params: ProcessMessageParams
): Promise<void> {
  // Insert the message
  const { error: msgError } = await supabase.from("messages").insert({
    account_id: params.accountId,
    lead_id: params.leadId,
    whatsapp_account_id: params.whatsappAccountId,
    direction: "inbound",
    type: params.message.type,
    content: params.message.content,
    wa_message_id: params.message.waMessageId,
    provider_timestamp: new Date(
      parseInt(params.message.timestamp) * 1000
    ).toISOString(),
    correlation_id: params.message.contextId || null,
  });

  if (msgError) {
    console.error("[processor] Failed to insert inbound message:", msgError);
    return;
  }

  // Update lead's last contacted timestamp
  if (params.leadId) {
    await supabase
      .from("leads")
      .update({ last_contacted_at: new Date().toISOString() })
      .eq("id", params.leadId);

    // Emit timeline event for the inbound message
    await supabase.from("lead_timeline_events").insert({
      account_id: params.accountId,
      lead_id: params.leadId,
      actor_type: "customer",
      actor_id: null,
      event_type: "message_received",
      metadata: {
        message_type: params.message.type,
        wa_message_id: params.message.waMessageId,
        content_summary:
          params.message.type === "text"
            ? (params.message.content.body || "").slice(0, 100)
            : params.message.type,
      },
    });
  }
}

export async function processStatusCallback(
  supabase: SupabaseClient,
  params: ProcessStatusParams
): Promise<void> {
  // Update the outbound message status
  const statusMap: Record<string, string> = {
    sent: "sent",
    delivered: "delivered",
    read: "read",
    failed: "failed",
  };

  const mappedStatus = statusMap[params.status.status] || "failed";

  const { error: updateError } = await supabase
    .from("outbound_messages")
    .update({
      status: mappedStatus,
      sent_at: params.status.status === "sent"
        ? new Date(parseInt(params.status.timestamp) * 1000).toISOString()
        : undefined,
      error_code: params.status.errors?.[0]?.code?.toString(),
    })
    .eq("provider_message_id", params.status.waMessageId);

  if (updateError) {
    console.error("[processor] Failed to update outbound status:", updateError);
  }

  // Also update the outbound_jobs table
  await supabase
    .from("outbound_jobs")
    .update({
      status: mappedStatus === "failed" ? "failed" : "sent",
      sent_at: params.status.status === "sent"
        ? new Date(parseInt(params.status.timestamp) * 1000).toISOString()
        : undefined,
      last_error: params.status.errors?.[0]?.message,
    })
    .eq("provider_message_id", params.status.waMessageId);
}
