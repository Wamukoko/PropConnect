import { createAdminClient } from "@/lib/supabase/admin";
import { sendTextMessage, sendTemplateMessage, type SendResult } from "@/lib/whatsapp/client";
import crypto from "crypto";

export interface EnqueueMessageParams {
  accountId: string;
  leadId: string;
  whatsappAccountId: string;
  jobType: "text" | "template" | "interactive";
  templateName?: string;
  language?: string;
  payload: Record<string, any>;
}

export async function enqueueMessage(
  params: EnqueueMessageParams
): Promise<{ jobId: string; result?: SendResult }> {
  const supabase = createAdminClient();

  // Generate idempotency key
  const idempotencyKey = `msg_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

  // Insert job
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
    console.error("[outbound] Failed to enqueue:", insertError);
    throw new Error("Failed to enqueue message");
  }

  return { jobId: job.id };
}

export async function sendQueuedMessage(jobId: string): Promise<SendResult> {
  const supabase = createAdminClient();

  // Fetch the job
  const { data: job, error: fetchError } = await supabase
    .from("outbound_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (fetchError || !job) {
    return { success: false, error: { code: 0, message: "Job not found" } };
  }

  // Get the lead's phone number
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

  let result: SendResult;

  switch (job.job_type) {
    case "text":
      result = await sendTextMessage({
        to: lead.phone,
        text: job.payload.text,
      });
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

  // Update job status
  const updateData: Record<string, any> = {
    status: result.success ? "sent" : "failed",
    last_error: result.error ? result.error.message : null,
    provider_message_id: result.messageId || null,
  };

  if (result.success) {
    updateData.sent_at = new Date().toISOString();
  }

  await supabase.from("outbound_jobs").update(updateData).eq("id", jobId);

  // Also insert into outbound_messages
  if (result.success) {
    await supabase.from("outbound_messages").insert({
      account_id: job.account_id,
      lead_id: job.lead_id,
      provider_message_id: result.messageId,
      template_name: job.template_name,
      status: "sent",
      sent_at: new Date().toISOString(),
    });
  }

  return result;
}

export async function processOutboundQueue(batchSize: number = 20): Promise<void> {
  const supabase = createAdminClient();

  // Claim jobs using PostgreSQL function
  const { data: jobs, error: claimError } = await supabase
    .rpc("claim_outbound_job", { p_worker_id: "default", p_batch_size: batchSize });

  if (claimError || !jobs?.length) return;

  for (const job of jobs) {
    await sendQueuedMessage(job.id);
  }
}
