"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Lead {
  id: string;
  phone: string;
  whatsapp_name: string | null;
  name: string | null;
  stage: string;
  lead_score: number;
  source: string | null;
  created_at: string;
  last_contacted_at: string | null;
}

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-purple-100 text-purple-800",
  matching: "bg-indigo-100 text-indigo-800",
  recommendation_sent: "bg-cyan-100 text-cyan-800",
  viewing_requested: "bg-orange-100 text-orange-800",
  viewing_confirmed: "bg-green-100 text-green-800",
  negotiation: "bg-amber-100 text-amber-800",
  converted: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-800",
  dormant: "bg-gray-100 text-gray-600",
};

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  matching: "Matching",
  recommendation_sent: "Recommendation Sent",
  viewing_requested: "Viewing Requested",
  viewing_confirmed: "Viewing Confirmed",
  negotiation: "Negotiation",
  converted: "Converted",
  lost: "Lost",
  dormant: "Dormant",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      sort: "created_at",
      order: "desc",
    });
    if (search) params.set("search", search);
    if (stageFilter) params.set("stage", stageFilter);

    try {
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  }, [page, search, stageFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        />
        <select
          value={stageFilter}
          onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
        >
          <option value="">All stages</option>
          {Object.entries(STAGE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No leads found. Leads are created automatically from WhatsApp messages.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {lead.name || lead.whatsapp_name || "Unknown"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage] || "bg-gray-100 text-gray-800"}`}>
                      {STAGE_LABELS[lead.stage] || lead.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-[var(--color-primary)]"
                          style={{ width: `${lead.lead_score}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{lead.lead_score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.source || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={leads.length < 20}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
