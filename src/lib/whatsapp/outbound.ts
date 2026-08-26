import { createAdminClient } from "@/lib/supabase/admin";
import { sendTextMessage, sendTemplateMessage, type SendResult } from "@/lib/whatsapp/client";

// ============================================================
// Failure classification
// ============================================================
const PERMANENT_FAILURE_CODES = new Set([
  "131026", // Recipient phone number is not a valid phone number
  "131027", // Recipient phone number is not in allowed list
  "131051", // Recipient cannot receive this message
  "132000", // Recipient has blocked your business on WhatsApp
  "132001", // Recipient phone number is not on WhatsApp
  "132012", // Recipient has not accepted our new Terms of Service and Privacy Policy
  "133004", // Temporary authentication failure
  "368", // Temporarily blocked for policy violations
]);

function isPermanentFailure(errorCode: string | undefined): boolean {
  if (!errorCode) return false;
  return PERMANENT_FAILURE_CODES.has(errorCode);
}

function calculateBackoff(attempt: number): number {
  // Exponential backoff: 1min, 5min, 15min, 1hr, 4hr
  const delays = [60, 300, 900, 3600, 14400];
  const index = Math.min(attempt - 1, delays.length - 1);
  return delays[index];
}

// ============================================================
// Kill switch
// ============================================================
export async function isKillSwitchActive(accountId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("account_id", accountId)
    .eq("setting_key", "outbound_kill_switch")
    .single();

  return (data?.setting_value as any)?.enabled === true;
}

export async function setKillSwitch(accountId: string, enabled: boolean): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("system_settings")
    .upsert(
      {
        account_id: accountId,
        setting_key: "outbound_kill_switch",
        setting_value: { enabled },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id,setting_key" }
    );
}

// ============================================================
// Opt-out and consent checks
// ============================================================
export async function isLeadOptedOut(leadId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("leads")
    .select("opted_out")
    .eq("id", leadId)
    .single();

  return data?.opted_out === true;
}

export async function hasConsent(
  accountId: string,
  leadId: string,
  purpose: string
): Promise<boolean> {
  const supabase = createAdminClient();

  // Check if the most recent consent record grants consent
  const { data } = await supabase
    .from("consent_records")
    .select("granted")
    .eq("account_id", accountId)
    .eq("lead_id", leadId)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // If no consent record, assume granted for service_messages
  if (!data) {
    return purpose === "service_messages";
  }

  return data.granted;
}

// ============================================================
// Enhanced enqueue with pre-checks
// ============================================================
export interface EnqueueMessageParams {
  accountId: string;
  leadId: string;
  whatsappAccountId: string;
  jobType: "text" | "template" | "interactive";
  templateName?: string;
  language?: string;
  payload: Record<string, any>;
  purpose?: string;
}

export async function enqueueMessage(
  params: EnqueueMessageParams
): Promise<{ jobId: string }> {
  const supabase = createAdminClient();
  const purpose = params.purpose || "service_messages";

  // Pre-check: kill switch
  if (await isKillSwitchActive(params.accountId)) {
    throw new Error("Outbound messaging is disabled (kill switch active)");
  }

  // Pre-check: opt-out
  if (await isLeadOptedOut(params.leadId)) {
    throw new Error("Lead has opted out of messaging");
  }

  // Pre-check: consent for non-service messages
  if (purpose !== "service_messages") {
    if (!(await hasConsent(params.accountId, params.leadId, purpose))) {
      throw new Error(`Lead has not consented to ${purpose}`);
    }
  }

  const idempotencyKey = `msg_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

  const { data: job, error: insertError } = await supabase
    .from("outbound_jobs")
    .insert({
      account_id: params.accountId,
      lead_id: params.leadId,
      whatsapp_account_id: params.whatsappAccountId,
      job_type: params.jobType,
      template_name: params.templateName,
      language: params.language || "en",
      payload: params.payload,
      idempotency_key: idempotencyKey,
      status: "queued",
    })
    .select("id")
    .single();

  if (insertError || !job) {
    throw new Error("Failed to enqueue message");
  }

  return { jobId: job.id };
}

// ============================================================
// Send with retry logic
// ============================================================
export async function sendQueuedMessage(jobId: string): Promise<SendResult> {
  const supabase = createAdminClient();

  const { data: job, error: fetchError } = await supabase
    .from("outbound_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (fetchError || !job) {
    return { success: false, error: { code: 0, message: "Job not found" } };
  }

  // Kill switch check at send time
  if (await isKillSwitchActive(job.account_id)) {
    await supabase
      .from("outbound_jobs")
      .update({ status: "cancelled", last_error: "Kill switch active" })
      .eq("id", jobId);
    return { success: false, error: { code: 0, message: "Kill switch active" } };
  }

  // Opt-out check at send time
  if (await isLeadOptedOut(job.lead_id)) {
    await supabase
      .from("outbound_jobs")
      .update({ status: "cancelled", last_error: "Lead opted out" })
      .eq("id", jobId);
    return { success: false, error: { code: 0, message: "Lead opted out" } };
  }

  // Get lead phone
  const { data: lead } = await supabase
    .from("leads")
    .select("phone")
    .eq("id", job.lead_id)
    .single();

  if (!lead?.phone) {
    await supabase
      .from("outbound_jobs")
      .update({ status: "failed", last_error: "Lead phone not found" })
      .eq("id", jobId);
    return { success: false, error: { code: 0, message: "Lead phone not found" } };
  }

  // Send the message
  let result: SendResult;

  switch (job.job_type) {
    case "text":
      result = await sendTextMessage({ to: lead.phone, text: job.payload.text });
      break;
    case "template":
      result = await sendTemplateMessage({
        to: lead.phone,
        templateName: job.template_name!,
        language: job.language || "en",
        components: job.payload.components,
      });
      break;
    default:
      result = { success: false, error: { code: 0, message: `Unknown job type: ${job.job_type}` } };
  }

  if (result.success) {
    await supabase
      .from("outbound_jobs")
      .update({
        status: "sent",
        provider_message_id: result.messageId,
        sent_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await supabase.from("outbound_messages").insert({
      account_id: job.account_id,
      lead_id: job.lead_id,
      provider_message_id: result.messageId,
      template_name: job.template_name,
      status: "sent",
      sent_at: new Date().toISOString(),
    });
  } else {
    const errorCode = result.error?.code?.toString();
    const permanent = isPermanentFailure(errorCode);

    if (permanent || job.attempts >= 5) {
      await supabase
        .from("outbound_jobs")
        .update({
          status: "failed",
          last_error: result.error?.message || "Unknown error",
        })
        .eq("id", jobId);
    } else {
      const backoff = calculateBackoff(job.attempts);
      await supabase
        .from("outbound_jobs")
        .update({
          status: "queued",
          last_error: result.error?.message,
          next_attempt_at: new Date(Date.now() + backoff * 1000).toISOString(),
        })
        .eq("id", jobId);
    }
  }

  return result;
}

// ============================================================
// Batch processor
// ============================================================
export async function processOutboundQueue(batchSize: number = 20): Promise<number> {
  const supabase = createAdminClient();

  const { data: jobs, error: claimError } = await supabase
    .rpc("claim_outbound_job", { p_worker_id: "default", p_batch_size: batchSize });

  if (claimError || !jobs?.length) return 0;

  let sent = 0;
  for (const job of jobs) {
    const result = await sendQueuedMessage(job.id);
    if (result.success) sent++;
  }

  return sent;
}
