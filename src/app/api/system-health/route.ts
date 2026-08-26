import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
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

  const accountId = agent.account_id;
  const admin = createAdminClient();

  // Gather all metrics in parallel
  const [
    webhookStats,
    queueStats,
    messageStats,
    leadStats,
    propertyStats,
    killSwitch,
    recentErrors,
  ] = await Promise.all([
    // Webhook events (last 24h)
    admin
      .from("webhook_events")
      .select("processing_state", { count: "exact" })
      .gte("received_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .then(({ data, count }) => ({
        total: count || 0,
        processed: data?.filter((e) => e.processing_state === "processed").length || 0,
        failed: data?.filter((e) => e.processing_state === "failed").length || 0,
      })),

    // Outbound queue
    admin
      .from("outbound_jobs")
      .select("status", { count: "exact" })
      .then(({ data, count }) => ({
        total: count || 0,
        queued: data?.filter((j) => j.status === "queued").length || 0,
        processing: data?.filter((j) => j.status === "processing").length || 0,
        sent: data?.filter((j) => j.status === "sent").length || 0,
        failed: data?.filter((j) => j.status === "failed").length || 0,
      })),

    // Message stats (last 7 days)
    admin
      .from("messages")
      .select("direction", { count: "exact" })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .then(({ data, count }) => ({
        total: count || 0,
        inbound: data?.filter((m) => m.direction === "inbound").length || 0,
        outbound: data?.filter((m) => m.direction === "outbound").length || 0,
      })),

    // Lead stats
    admin
      .from("leads")
      .select("stage", { count: "exact" })
      .then(({ data, count }) => ({
        total: count || 0,
        new: data?.filter((l) => l.stage === "new").length || 0,
        active: data?.filter((l) => !["converted", "lost", "dormant"].includes(l.stage)).length || 0,
      })),

    // Property stats
    admin
      .from("properties")
      .select("status", { count: "exact" })
      .then(({ data, count }) => ({
        total: count || 0,
        published: data?.filter((p) => p.status === "published").length || 0,
        draft: data?.filter((p) => p.status === "draft").length || 0,
      })),

    // Kill switch
    admin
      .from("system_settings")
      .select("setting_value")
      .eq("account_id", accountId)
      .eq("setting_key", "outbound_kill_switch")
      .single()
      .then(({ data }) => (data?.setting_value as any)?.enabled === true),

    // Recent failed jobs
    admin
      .from("outbound_jobs")
      .select("id, last_error, created_at")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => data || []),
  ]);

  return NextResponse.json({
    webhooks: webhookStats,
    queue: queueStats,
    messages: messageStats,
    leads: leadStats,
    properties: propertyStats,
    killSwitch,
    recentErrors,
    timestamp: new Date().toISOString(),
  });
}
