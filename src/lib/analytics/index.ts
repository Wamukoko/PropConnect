import { createAdminClient } from "@/lib/supabase/admin";

export interface FunnelSnapshot {
  stage: string;
  leads: number;
}

export interface SourcePerformance {
  source: string;
  leads: number;
  conversions: number;
}

export interface AgentPerformance {
  agent_id: string | null;
  agent_name: string | null;
  tasks_completed: number;
  viewings_confirmed: number;
}

export interface PropertyPerformance {
  property_id: string;
  title: string;
  enquiries: number;
  viewings: number;
}

// Ordered lead pipeline. Leads count toward the furthest stage they've reached
// is complex; here we report current stage distribution for the funnel.
export const FUNNEL_STAGES = [
  "new",
  "contacted",
  "qualified",
  "matching",
  "recommendation_sent",
  "viewing_requested",
  "viewing_confirmed",
  "negotiation",
  "converted",
] as const;

const VIEWING_STATUSES = ["confirmed", "completed"];

/**
 * Records an analytics event exactly-once per account + event_key.
 * Used to guarantee webhook retries are never double-counted.
 */
export async function recordAnalyticsEvent(input: {
  accountId: string;
  eventKey: string;
  eventType: string;
  leadId?: string | null;
  propertyId?: string | null;
  meta?: Record<string, unknown>;
  occurredAt?: string;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("analytics_events" as any).insert({
    account_id: input.accountId,
    event_key: input.eventKey,
    event_type: input.eventType,
    lead_id: input.leadId ?? null,
    property_id: input.propertyId ?? null,
    meta: input.meta ?? {},
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  });
  return !error;
}

export async function getFunnel(accountId: string): Promise<FunnelSnapshot[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("leads" as any)
    .select("stage")
    .eq("account_id", accountId);

  const counts: Record<string, number> = {};
  for (const l of data || []) {
    counts[l.stage] = (counts[l.stage] || 0) + 1;
  }

  return FUNNEL_STAGES.map((stage) => ({
    stage,
    leads: counts[stage] || 0,
  }));
}

export async function getSourceAttribution(accountId: string): Promise<SourcePerformance[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("leads" as any)
    .select("source, stage")
    .eq("account_id", accountId);

  const map = new Map<string, { leads: number; conversions: number }>();
  for (const l of data || []) {
    const source = l.source || "unknown";
    const entry = map.get(source) || { leads: 0, conversions: 0 };
    entry.leads++;
    if (l.stage === "converted") entry.conversions++;
    map.set(source, entry);
  }

  return Array.from(map.entries()).map(([source, v]) => ({
    source,
    leads: v.leads,
    conversions: v.conversions,
  }));
}

export async function getPropertyPerformance(accountId: string): Promise<PropertyPerformance[]> {
  const supabase = createAdminClient();

  const { data: events } = await supabase
    .from("analytics_events" as any)
    .select("event_type, property_id")
    .eq("account_id", accountId)
    .in("event_type", ["property_enquiry"]);

  const enquiryCounts = new Map<string, number>();
  for (const e of events || []) {
    if (!e.property_id) continue;
    enquiryCounts.set(e.property_id, (enquiryCounts.get(e.property_id) || 0) + 1);
  }

  const { data: viewings } = await supabase
    .from("viewings" as any)
    .select("property_id")
    .eq("account_id", accountId)
    .in("status", VIEWING_STATUSES);

  const viewingCounts = new Map<string, number>();
  for (const v of viewings || []) {
    viewingCounts.set(v.property_id, (viewingCounts.get(v.property_id) || 0) + 1);
  }

  const propertyIds = new Set([
    ...enquiryCounts.keys(),
    ...viewingCounts.keys(),
  ]);

  const { data: properties } = propertyIds.size
    ? await supabase
        .from("properties" as any)
        .select("id, title")
        .in("id", Array.from(propertyIds))
    : { data: [] as any[] };

  const titleMap = new Map<string, string>();
  for (const p of properties || []) titleMap.set(p.id, p.title);

  return Array.from(propertyIds).map((id) => ({
    property_id: id,
    title: titleMap.get(id) || "Unknown property",
    enquiries: enquiryCounts.get(id) || 0,
    viewings: viewingCounts.get(id) || 0,
  }));
}

export async function getAgentPerformance(accountId: string): Promise<AgentPerformance[]> {
  const supabase = createAdminClient();

  const { data: tasks } = await supabase
    .from("agent_tasks" as any)
    .select("agent_id, status")
    .eq("account_id", accountId)
    .eq("status", "completed");

  const taskCounts = new Map<string | null, number>();
  for (const t of tasks || []) {
    taskCounts.set(t.agent_id, (taskCounts.get(t.agent_id) || 0) + 1);
  }

  const { data: viewings } = await supabase
    .from("viewings" as any)
    .select("agent_id")
    .eq("account_id", accountId)
    .in("status", VIEWING_STATUSES);

  const viewingCounts = new Map<string | null, number>();
  for (const v of viewings || []) {
    viewingCounts.set(v.agent_id, (viewingCounts.get(v.agent_id) || 0) + 1);
  }

  const agentIds = Array.from(
    new Set([...taskCounts.keys(), ...viewingCounts.keys()].filter(Boolean) as string[])
  );

  const { data: agents } = agentIds.length
    ? await supabase.from("agents" as any).select("id, name").in("id", agentIds)
    : { data: [] as any[] };

  const nameMap = new Map<string | null, string | null>();
  nameMap.set(null, "Unassigned");
  for (const a of agents || []) nameMap.set(a.id, a.name);

  const ids = Array.from(
    new Set([...taskCounts.keys(), ...viewingCounts.keys()])
  );

  return ids.map((id) => ({
    agent_id: id,
    agent_name: nameMap.get(id) || null,
    tasks_completed: taskCounts.get(id) || 0,
    viewings_confirmed: viewingCounts.get(id) || 0,
  }));
}

export interface AnalyticsSummary {
  funnel: FunnelSnapshot[];
  sources: SourcePerformance[];
  properties: PropertyPerformance[];
  agents: AgentPerformance[];
}

export async function getAnalyticsSummary(accountId: string): Promise<AnalyticsSummary> {
  const [funnel, sources, properties, agents] = await Promise.all([
    getFunnel(accountId),
    getSourceAttribution(accountId),
    getPropertyPerformance(accountId),
    getAgentPerformance(accountId),
  ]);
  return { funnel, sources, properties, agents };
}
