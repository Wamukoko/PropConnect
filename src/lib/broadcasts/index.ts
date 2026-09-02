import { createAdminClient } from "@/lib/supabase/admin";
import {
  enqueueMessage,
  isLeadOptedOut,
  hasConsent,
} from "@/lib/whatsapp/outbound";
import { isFeatureEnabled } from "@/lib/feature-flags";

type DbClient = any;

function defaultClient(): DbClient {
  return createAdminClient();
}

export interface BroadcastTarget {
  leadId: string;
  phone: string;
}

/**
 * Creates a broadcast campaign and provisions recipients from the target
 * filter. Honors consent (broadcasts) and opt-out at enqueue time.
 */
export async function createBroadcastCampaign(
  input: {
    accountId: string;
    agentId: string;
    whatsappAccountId: string;
    name: string;
    templateName: string;
    language?: string;
    payload: Record<string, unknown>;
    targetFilter: Record<string, unknown>;
  },
  client: DbClient = defaultClient()
): Promise<{ campaignId?: string; error?: string }> {
  if (!isFeatureEnabled("BROADCASTS")) {
    return { error: "Broadcasts feature is disabled" };
  }
  const supabase = client;

  const { data: leads, error: leadError } = await supabase
    .from("leads" as any)
    .select("id, opted_out, stage")
    .eq("account_id", input.accountId)
    .eq("opted_out", false);

  if (leadError) return { error: leadError.message };

  const eligible: string[] = [];
  for (const lead of leads || []) {
    // Consent check for broadcast purpose
    const consented = await hasConsent(input.accountId, lead.id, "broadcasts");
    if (consented) eligible.push(lead.id);
  }

  const { data: campaign, error } = await supabase
    .from("broadcast_campaigns" as any)
    .insert({
      account_id: input.accountId,
      whatsapp_account_id: input.whatsappAccountId,
      name: input.name,
      status: "queued",
      template_name: input.templateName,
      language: input.language || "en",
      payload: input.payload,
      target_filter: input.targetFilter,
      total_recipients: eligible.length,
      created_by: input.agentId,
    })
    .select()
    .single();

  if (error || !campaign) {
    return { error: error?.message || "Failed to create campaign" };
  }

  for (const leadId of eligible) {
    await supabase.from("broadcast_recipients" as any).upsert(
      {
        account_id: input.accountId,
        campaign_id: campaign.id,
        lead_id: leadId,
        status: "pending",
      },
      { onConflict: "campaign_id,lead_id" }
    );
  }

  return { campaignId: campaign.id };
}

/**
 * Sends a campaign in bounded batches. Each send re-checks opt-out and
 * consent at send time, per queue requirements.
 */
export async function sendBroadcastCampaign(
  campaignId: string,
  batchSize = 20,
  client: DbClient = defaultClient()
): Promise<{ sent: number; skipped: number; failed: number }> {
  const supabase = client;
  const { data: campaign } = await supabase
    .from("broadcast_campaigns" as any)
    .select("*")
    .eq("id", campaignId)
    .single();
  if (!campaign) return { sent: 0, skipped: 0, failed: 0 };

  await supabase
    .from("broadcast_campaigns" as any)
    .update({ status: "sending", started_at: new Date().toISOString() })
    .eq("id", campaignId);

  const { data: recipients } = await supabase
    .from("broadcast_recipients" as any)
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .limit(batchSize);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipient of recipients || []) {
    if (await isLeadOptedOut(recipient.lead_id)) {
      await supabase
        .from("broadcast_recipients" as any)
        .update({ status: "skipped", error: "opted-out" })
        .eq("id", recipient.id);
      skipped++;
      continue;
    }

    const consented = await hasConsent(campaign.account_id, recipient.lead_id, "broadcasts");
    if (!consented) {
      await supabase
        .from("broadcast_recipients" as any)
        .update({ status: "skipped", error: "no-consent" })
        .eq("id", recipient.id);
      skipped++;
      continue;
    }

    try {
      await enqueueMessage({
        accountId: campaign.account_id,
        leadId: recipient.lead_id,
        whatsappAccountId: campaign.whatsapp_account_id,
        jobType: "template",
        templateName: campaign.template_name,
        language: campaign.language || "en",
        payload: { components: campaign.payload.components || [] },
        purpose: "broadcasts",
      });
      await supabase
        .from("broadcast_recipients" as any)
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", recipient.id);
      sent++;
    } catch {
      await supabase
        .from("broadcast_recipients" as any)
        .update({ status: "failed", error: "enqueue failed" })
        .eq("id", recipient.id);
      failed++;
    }
  }

  const { data: remaining } = await supabase
    .from("broadcast_recipients" as any)
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  const { data: counts } = await supabase
    .from("broadcast_recipients" as any)
    .select("status")
    .eq("campaign_id", campaignId);

  const sentCount = (counts || []).filter((c: any) => c.status === "sent").length;
  const failedCount = (counts || []).filter((c: any) => c.status === "failed").length;

  await supabase
    .from("broadcast_campaigns" as any)
    .update({
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: remaining?.length ? null : new Date().toISOString(),
      status: remaining?.length ? "sending" : "completed",
    })
    .eq("id", campaignId);

  return { sent, skipped, failed };
}

export async function cancelBroadcastCampaign(
  campaignId: string,
  client: DbClient = defaultClient()
) {
  const supabase = client;
  return await supabase
    .from("broadcast_campaigns" as any)
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", campaignId);
}

export async function listBroadcastCampaigns(
  accountId: string,
  client: DbClient = defaultClient()
) {
  const supabase = client;
  return await supabase
    .from("broadcast_campaigns" as any)
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
}
