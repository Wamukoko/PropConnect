import { createClient } from "@/lib/supabase/server";
import { IconLeads, IconViewings } from "@/components/icons/sidebar-icons";
import { FollowUpQueue } from "@/components/dashboard/follow-up-queue";
import type { FollowUpSuggestion } from "@/components/dashboard/follow-up-queue";
import { suggestFollowUp } from "@/lib/analytics/tasks";

interface DashboardCounts {
  activeLeads: number;
  properties: number;
  viewingsThisWeek: number;
  messagesToday: number;
}

interface ActivityItem {
  id: string;
  type: string;
  label: string;
  detail: string;
  created_at: string;
}

export interface TrendPoint {
  day: string;
  date: string;
  inbound: number;
  outbound: number;
  viewings: number;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const counts = (await Promise.all([
    countQuery(supabase, "leads", "Active Leads"),
    countQuery(supabase, "properties", "Properties"),
    countQuery(supabase, "viewings", "Viewings This Week"),
    countQuery(supabase, "messages", "Messages Today"),
  ])).reduce<DashboardCounts>(
    (acc, cur) => {
      switch (cur.key) {
        case "leads":
          acc.activeLeads = cur.count;
          break;
        case "properties":
          acc.properties = cur.count;
          break;
        case "viewings":
          acc.viewingsThisWeek = cur.count;
          break;
        case "messages":
          acc.messagesToday = cur.count;
          break;
      }
      return acc;
    },
    { activeLeads: 0, properties: 0, viewingsThisWeek: 0, messagesToday: 0 }
  );

  const activity = await fetchActivity(supabase);
  const followUps = await fetchFollowUpSuggestions(supabase);
  const trend = await fetchTrend(supabase);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-primary)" }}>
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Leads" value={counts.activeLeads} color="var(--color-primary)" />
        <StatCard title="Properties" value={counts.properties} color="var(--color-secondary)" />
        <StatCard title="Viewings This Week" value={counts.viewingsThisWeek} color="var(--color-primary)" />
        <StatCard title="Messages Today" value={counts.messagesToday} color="var(--color-secondary)" />
      </div>

      <TrendChart points={trend} />

      <div className="mt-8 bg-white rounded-lg border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary)" }}>
          Recent Activity
        </h2>
        {activity.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No recent activity. Activity will appear here once WhatsApp conversations and lead
            interactions begin.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activity.map((item) => (
              <li key={item.id} className="py-3 flex items-start gap-3">
                <span className="mt-0.5 text-gray-400">{activityIcon(item.type)}</span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="capitalize text-gray-900 font-medium">{item.label}</span>
                    {" — "}
                    {item.detail}
                  </p>
                  <p className="text-xs text-gray-400">{formatTime(item.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FollowUpQueue suggestions={followUps} />
    </div>
  );
}

async function fetchFollowUpSuggestions(supabase: any): Promise<FollowUpSuggestion[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: agent } = await supabase
    .from("agents")
    .select("id, account_id")
    .eq("id", user.id)
    .single();
  if (!agent) return [];

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, whatsapp_name, phone, stage, opted_out, last_contacted_at, created_at")
    .eq("account_id", agent.account_id)
    .order("created_at", { ascending: false })
    .limit(60);

  const STALE_STAGES = ["converted", "lost", "dormant"];
  const MIN_STALE_DAYS = 2;

  const suggestions: FollowUpSuggestion[] = (leads || [])
    .filter(
      (l: any) =>
        !l.opted_out && !STALE_STAGES.includes(l.stage) && l.stage !== "new"
    )
    .map((l: any) => {
      const last = l.last_contacted_at || l.created_at;
      const daysSinceContact = Math.max(
        0,
        Math.floor((Date.now() - new Date(last).getTime()) / 86400000)
      );
      return { lead: l, daysSinceContact };
    })
    .filter((s: any) => s.daysSinceContact >= MIN_STALE_DAYS)
    .sort((a: any, b: any) => b.daysSinceContact - a.daysSinceContact)
    .slice(0, 5)
    .map(async (s: any) => {
      const suggestion = await suggestFollowUp({
        accountId: agent.account_id,
        agentId: agent.id,
        leadId: s.lead.id,
        leadName: s.lead.name || s.lead.whatsapp_name,
        daysSinceContact: s.daysSinceContact,
      });
      return {
        leadId: s.lead.id,
        leadName: s.lead.name || s.lead.whatsapp_name,
        phone: s.lead.phone,
        daysSinceContact: s.daysSinceContact,
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority,
        dueAt: suggestion.dueAt,
      };
    });

  return Promise.all(suggestions);
}

async function countQuery(
  supabase: any,
  table: string,
  _label: string
): Promise<{ key: string; count: number }> {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  return { key: table, count: count ?? 0 };
}

async function fetchActivity(supabase: any): Promise<ActivityItem[]> {
  const { data: leads, error: leadErr } = await supabase
    .from("leads")
    .select("id,name,stage,created_at")
    .order("created_at", { ascending: false })
    .limit(3);
  const { data: viewings, error: viewErr } = await supabase
    .from("viewings")
    .select("id,status,start_at")
    .order("start_at", { ascending: false })
    .limit(3);

  const items: ActivityItem[] = [];

  (leads || []).forEach((lead: any) => {
    if (leadErr) return;
    items.push({
      id: `lead-${lead.id}`,
      type: "lead",
      label: "New lead",
      detail: lead.name || "New lead",
      created_at: lead.created_at,
    });
  });

  (viewings || []).forEach((v: any) => {
    if (viewErr) return;
    items.push({
      id: `viewing-${v.id}`,
      type: "viewing",
      label: "Viewing",
      detail: v.status || "requested",
      created_at: v.start_at,
    });
  });

  return items
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);
}

async function fetchTrend(supabase: any): Promise<TrendPoint[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: agent } = await supabase
    .from("agents")
    .select("account_id")
    .eq("id", user.id)
    .single();
  if (!agent) return [];

  const since = new Date(Date.now() - 6 * 864e5);
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const { data: messages } = await supabase
    .from("messages")
    .select("direction, created_at")
    .eq("account_id", agent.account_id)
    .gte("created_at", sinceIso);
  const { data: viewings } = await supabase
    .from("viewings")
    .select("start_at")
    .eq("account_id", agent.account_id)
    .gte("start_at", sinceIso);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  const key = (iso: string) => new Date(iso).toISOString().slice(0, 10);

  return days.map((d) => {
    const dayKey = d.toISOString().slice(0, 10);
    const msgs = (messages || []).filter((m: any) => key(m.created_at) === dayKey);
    const inbound = msgs.filter((m: any) => m.direction === "inbound").length;
    const outbound = msgs.filter((m: any) => m.direction === "outbound").length;
    const viewCount = (viewings || []).filter((v: any) => key(v.start_at) === dayKey).length;
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      date: dayKey,
      inbound,
      outbound,
      viewings: viewCount,
    };
  });
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(
    1,
    ...points.map((p) => Math.max(p.inbound, p.outbound, p.viewings))
  );
  const barHeight = (n: number) => (n === 0 ? 2 : Math.max(8, (n / max) * 100));

  return (
    <div className="mt-8 rounded-lg border border-gray-100 bg-white p-6">
      <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-primary)" }}>
        Activity — Last 7 Days
      </h2>
      <p className="mb-4 text-xs text-gray-400">
        Inbound / outbound WhatsApp messages and viewings per day.
      </p>
      <div className="flex items-end justify-between gap-4">
        {points.map((p) => (
          <div key={p.date} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end justify-center gap-1">
              <div
                className="w-3 rounded-t bg-[var(--color-primary)]"
                style={{ height: `${barHeight(p.inbound)}%` }}
                title={`${p.inbound} inbound`}
              />
              <div
                className="w-3 rounded-t bg-[var(--color-secondary)]"
                style={{ height: `${barHeight(p.outbound)}%` }}
                title={`${p.outbound} outbound`}
              />
              <div
                className="w-3 rounded-t bg-gray-300"
                style={{ height: `${barHeight(p.viewings)}%` }}
                title={`${p.viewings} viewings`}
              />
            </div>
            <span className="text-xs text-gray-500">{p.day}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-primary)]" /> Inbound
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-secondary)]" /> Outbound
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gray-300" /> Viewings
        </span>
      </div>
    </div>
  );
}

function activityIcon(type: string) {
  switch (type) {
    case "lead":
      return <IconLeads size={16} />;
    case "viewing":
      return <IconViewings size={16} />;
    default:
      return <span className="block h-1 w-1 rounded-full bg-gray-400" />;
  }
}

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-6">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold" style={{ color }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
