"use client";

import { useEffect, useState } from "react";

interface FunnelSnapshot {
  stage: string;
  leads: number;
}

interface SourcePerformance {
  source: string;
  leads: number;
  conversions: number;
}

interface PropertyPerformance {
  property_id: string;
  title: string;
  enquiries: number;
  viewings: number;
}

interface AgentPerformance {
  agent_id: string | null;
  agent_name: string | null;
  tasks_completed: number;
  viewings_confirmed: number;
}

interface AnalyticsSummary {
  funnel: FunnelSnapshot[];
  sources: SourcePerformance[];
  properties: PropertyPerformance[];
  agents: AgentPerformance[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/analytics");
      const json = await res.json();
      setData(json);
    } catch {
      console.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading analytics...</div>;
  }
  if (!data) {
    return <div className="text-center py-12 text-gray-500">Failed to load analytics</div>;
  }

  const totalLeads = data.sources.reduce((sum, s) => sum + s.leads, 0);
  const totalConversions = data.sources.reduce((sum, s) => sum + s.conversions, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <button
          onClick={fetchData}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Leads" value={totalLeads} />
        <KpiCard label="Conversions" value={totalConversions} />
        <KpiCard
          label="Conversion Rate"
          value={totalLeads ? `${((totalConversions / totalLeads) * 100).toFixed(1)}%` : "0%"}
        />
      </div>

      {/* Funnel */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-4 text-sm font-medium text-gray-700">Lead Funnel</h2>
        <div className="space-y-2">
          {data.funnel.map((f) => (
            <div key={f.stage} className="flex items-center gap-3">
              <span className="w-44 text-sm text-gray-600 capitalize">
                {f.stage.replace(/_/g, " ")}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${totalLeads ? (f.leads / totalLeads) * 100 : 0}%`,
                    backgroundColor: "var(--color-secondary)",
                  }}
                />
              </div>
              <span className="w-10 text-right text-sm font-medium">{f.leads}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Source attribution */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-4 text-sm font-medium text-gray-700">Lead Source Attribution</h2>
        {data.sources.length === 0 ? (
          <p className="text-sm text-gray-500">No source data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Source</th>
                <th className="py-2">Leads</th>
                <th className="py-2">Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((s) => (
                <tr key={s.source} className="border-b last:border-0">
                  <td className="py-2 capitalize">{s.source.replace(/_/g, " ")}</td>
                  <td className="py-2">{s.leads}</td>
                  <td className="py-2">
                    {s.leads ? `${((s.conversions / s.leads) * 100).toFixed(1)}%` : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Agent performance */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-4 text-sm font-medium text-gray-700">Agent Performance</h2>
        {data.agents.length === 0 ? (
          <p className="text-sm text-gray-500">No performance data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Agent</th>
                <th className="py-2">Tasks Completed</th>
                <th className="py-2">Viewings Confirmed</th>
              </tr>
            </thead>
            <tbody>
              {data.agents.map((a) => (
                <tr key={a.agent_id || "unassigned"} className="border-b last:border-0">
                  <td className="py-2">{a.agent_name || "Unassigned"}</td>
                  <td className="py-2">{a.tasks_completed}</td>
                  <td className="py-2">{a.viewings_confirmed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Property performance */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-4 text-sm font-medium text-gray-700">Property Performance</h2>
        {data.properties.length === 0 ? (
          <p className="text-sm text-gray-500">No property performance yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Property</th>
                <th className="py-2">Enquiries</th>
                <th className="py-2">Viewings</th>
              </tr>
            </thead>
            <tbody>
              {data.properties.map((p) => (
                <tr key={p.property_id} className="border-b last:border-0">
                  <td className="py-2">{p.title}</td>
                  <td className="py-2">{p.enquiries}</td>
                  <td className="py-2">{p.viewings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: "var(--color-primary)" }}>
        {value}
      </p>
    </div>
  );
}
