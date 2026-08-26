"use client";

import { useEffect, useState } from "react";

interface HealthData {
  webhooks: { total: number; processed: number; failed: number };
  queue: { total: number; queued: number; processing: number; sent: number; failed: number };
  messages: { total: number; inbound: number; outbound: number };
  leads: { total: number; new: number; active: number };
  properties: { total: number; published: number; draft: number };
  killSwitch: boolean;
  recentErrors: { id: string; last_error: string; created_at: string }[];
  timestamp: string;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchHealth();
  }, []);

  async function fetchHealth() {
    try {
      const res = await fetch("/api/system-health");
      const data = await res.json();
      setHealth(data);
    } catch {
      console.error("Failed to fetch health");
    } finally {
      setLoading(false);
    }
  }

  async function toggleKillSwitch() {
    if (!health || toggling) return;
    setToggling(true);
    try {
      await fetch("/api/system-health/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !health.killSwitch }),
      });
      setHealth({ ...health, killSwitch: !health.killSwitch });
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading system health...</div>;
  }

  if (!health) {
    return <div className="text-center py-12 text-gray-500">Failed to load health data</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Health</h1>
        <button
          onClick={fetchHealth}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Kill Switch */}
      <div className={`rounded-lg border-2 p-4 ${health.killSwitch ? "border-red-500 bg-red-50" : "border-green-200 bg-green-50"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Outbound Kill Switch</h2>
            <p className="text-sm text-gray-600">
              {health.killSwitch
                ? "All outbound messaging is STOPPED"
                : "Outbound messaging is active"}
            </p>
          </div>
          <button
            onClick={toggleKillSwitch}
            disabled={toggling}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              health.killSwitch
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            } disabled:opacity-50`}
          >
            {toggling ? "Toggling..." : health.killSwitch ? "Enable Messaging" : "Disable Messaging"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Webhook Stats */}
        <StatCard
          title="Webhooks (24h)"
          stats={[
            { label: "Total", value: health.webhooks.total },
            { label: "Processed", value: health.webhooks.processed, color: "text-green-600" },
            { label: "Failed", value: health.webhooks.failed, color: "text-red-600" },
          ]}
        />

        {/* Queue Stats */}
        <StatCard
          title="Outbound Queue"
          stats={[
            { label: "Queued", value: health.queue.queued, color: "text-blue-600" },
            { label: "Processing", value: health.queue.processing, color: "text-yellow-600" },
            { label: "Sent", value: health.queue.sent, color: "text-green-600" },
            { label: "Failed", value: health.queue.failed, color: "text-red-600" },
          ]}
        />

        {/* Message Stats */}
        <StatCard
          title="Messages (7 days)"
          stats={[
            { label: "Total", value: health.messages.total },
            { label: "Inbound", value: health.messages.inbound, color: "text-blue-600" },
            { label: "Outbound", value: health.messages.outbound, color: "text-green-600" },
          ]}
        />

        {/* Lead Stats */}
        <StatCard
          title="Leads"
          stats={[
            { label: "Total", value: health.leads.total },
            { label: "New", value: health.leads.new, color: "text-blue-600" },
            { label: "Active", value: health.leads.active, color: "text-green-600" },
          ]}
        />

        {/* Property Stats */}
        <StatCard
          title="Properties"
          stats={[
            { label: "Total", value: health.properties.total },
            { label: "Published", value: health.properties.published, color: "text-green-600" },
            { label: "Draft", value: health.properties.draft, color: "text-gray-500" },
          ]}
        />
      </div>

      {/* Recent Errors */}
      {health.recentErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="mb-3 text-sm font-medium text-red-800">Recent Failed Jobs</h2>
          <div className="space-y-2">
            {health.recentErrors.map((err) => (
              <div key={err.id} className="flex items-center justify-between text-sm">
                <span className="text-red-700">{err.last_error || "Unknown error"}</span>
                <span className="text-xs text-red-500">
                  {new Date(err.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Last updated: {new Date(health.timestamp).toLocaleString()}
      </p>
    </div>
  );
}

function StatCard({
  title,
  stats,
}: {
  title: string;
  stats: { label: string; value: number; color?: string }[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-700">{title}</h3>
      <div className="space-y-1">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{stat.label}</span>
            <span className={`text-sm font-medium ${stat.color || "text-gray-900"}`}>
              {stat.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
