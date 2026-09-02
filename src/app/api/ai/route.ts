import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createAiJob, completeAiJob } from "@/lib/ai";

const JOB_SYSTEM_PROMPTS: Record<string, string> = {
  conversation_summary:
    "You are a concise assistant. Summarize the conversation history provided, in bullet points, highlighting the customer's requirements, budget, preferred area, and intent.",
  reply_draft:
    "You are a helpful real estate agent. Draft a professional, friendly reply to the customer's latest message. Keep it under 120 words.",
  lead_prioritization:
    "You are a sales analyst. Given the lead details, rate the lead's priority from 1 to 10 and give one short reason. Return JSON: {\"score\": number, \"reason\": string}.",
  semantic_search:
    "Given the customer's requirements, return a short list of property types and features to search for.",
};

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
  const jobType = body?.job_type;
  if (!jobType || !JOB_SYSTEM_PROMPTS[jobType]) {
    return NextResponse.json(
      { error: "Unsupported job_type" },
      { status: 400 }
    );
  }

  const { jobId, error } = await createAiJob({
    accountId: agent.account_id,
    agentId: user.id,
    jobType,
    inputData: body.input || {},
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const result = await completeAiJob(jobId!, JOB_SYSTEM_PROMPTS[jobType]);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const { data: job } = await supabase
    .from("ai_jobs" as any)
    .select("*")
    .eq("id", jobId)
    .single();

  return NextResponse.json(job);
}
