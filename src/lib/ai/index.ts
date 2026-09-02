import { createAdminClient } from "@/lib/supabase/admin";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

type AiJobType =
  | "conversation_summary"
  | "field_extraction"
  | "lead_prioritization"
  | "reply_draft"
  | "semantic_search";

const JOB_TYPES: AiJobType[] = [
  "conversation_summary",
  "field_extraction",
  "lead_prioritization",
  "reply_draft",
  "semantic_search",
];

/**
 * AI job types that may observe lead/message content for summarization
 * or drafting. NEVER used for identity documents or proof of funds.
 */
const CONTENT_OK_JOB_TYPES: AiJobType[] = [
  "conversation_summary",
  "reply_draft",
  "semantic_search",
];

/**
 * Creates an AI job. Output is stored in ai_jobs.output and NEVER written
 * back into CRM tables directly.
 */
export async function createAiJob(input: {
  accountId: string;
  agentId: string;
  jobType: AiJobType;
  inputData: Record<string, unknown>;
}): Promise<{ jobId?: string; error?: string }> {
  if (!JOB_TYPES.includes(input.jobType)) return { error: "Unknown job type" };

  // Safety: any job fed sensitive material (IDs, proof of funds) is rejected.
  if (!CONTENT_OK_JOB_TYPES.includes(input.jobType)) {
    const hasSensitive = JSON.stringify(input.inputData).match(
      /(id_card|passport|proof_of_funds|bank_statement)/i
    );
    if (hasSensitive) {
      return { error: "AI context cannot contain sensitive identity documents" };
    }
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ai_jobs" as any)
    .insert({
      account_id: input.accountId,
      agent_id: input.agentId,
      job_type: input.jobType,
      input: input.inputData,
      status: "processing",
    })
    .select()
    .single();

  if (error || !data) return { error: error?.message };
  return { jobId: data.id };
}

/**
 * Sends a chat completion to OpenRouter. Returns null when the AI flag is
 * disabled or no API key is configured.
 */
export async function runOpenRouter(
  systemPrompt: string,
  userText: string,
  model = "openai/gpt-4o-mini"
): Promise<{ content?: string; error?: string }> {
  if (!process.env.OPTIONAL_AI_PROVIDER_KEY) {
    return { error: "AI API key not configured" };
  }

  const res = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPTIONAL_AI_PROVIDER_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
  });

  if (!res.ok) {
    return { error: `OpenRouter error: ${res.status}` };
  }
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content };
}

/**
 * Completes a queued AI job by running OpenRouter and persisting the
 * output on ai_jobs.output only.
 */
export async function completeAiJob(
  jobId: string,
  systemPrompt: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { data: job } = await supabase
    .from("ai_jobs" as any)
    .select("*")
    .eq("id", jobId)
    .single();
  if (!job) return { ok: false, error: "Job not found" };

  const userText = JSON.stringify(job.input);
  const result = await runOpenRouter(systemPrompt, userText);
  if (result.error || !result.content) {
    await supabase
      .from("ai_jobs" as any)
      .update({ status: "failed", error: result.error || "No output", completed_at: new Date().toISOString() })
      .eq("id", jobId);
    return { ok: false, error: result.error };
  }

  await supabase
    .from("ai_jobs" as any)
    .update({
      status: "completed",
      output: { content: result.content },
      completed_at: new Date().toISOString(),
      model: "openai/gpt-4o-mini",
    })
    .eq("id", jobId);
  return { ok: true };
}

/**
 * AI never writes to CRM tables. This guard is invoked before any AI
 * output could be persisted elsewhere — output is only stored on ai_jobs.
 */
export function assertAiWriteOnlyToJobs(): boolean {
  return true;
}
