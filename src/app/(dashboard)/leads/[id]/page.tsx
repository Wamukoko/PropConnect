"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface Lead {
  id: string;
  phone: string;
  whatsapp_name: string | null;
  name: string | null;
  email: string | null;
  stage: string;
  lead_score: number;
  source: string | null;
  preferred_language: string;
  budget_min: number | null;
  budget_max: number | null;
  listing_type: string | null;
  property_type: string | null;
  preferred_area: string | null;
  created_at: string;
  last_contacted_at: string | null;
}

interface Message {
  id: string;
  direction: string;
  type: string;
  content: any;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  actor_type: string;
  metadata: any;
  created_at: string;
}

const STAGES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800" },
  { value: "qualified", label: "Qualified", color: "bg-purple-100 text-purple-800" },
  { value: "matching", label: "Matching", color: "bg-indigo-100 text-indigo-800" },
  { value: "recommendation_sent", label: "Recommendation Sent", color: "bg-cyan-100 text-cyan-800" },
  { value: "viewing_requested", label: "Viewing Requested", color: "bg-orange-100 text-orange-800" },
  { value: "viewing_confirmed", label: "Viewing Confirmed", color: "bg-green-100 text-green-800" },
  { value: "negotiation", label: "Negotiation", color: "bg-amber-100 text-amber-800" },
  { value: "converted", label: "Converted", color: "bg-emerald-100 text-emerald-800" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-800" },
  { value: "dormant", label: "Dormant", color: "bg-gray-100 text-gray-600" },
];

const EVENT_ICONS: Record<string, string> = {
  stage_changed: "📋",
  message_sent: "📤",
  message_received: "📥",
  property_viewed: "🏠",
  note_added: "📝",
  lead_created: "✨",
  call_made: "📞",
  call_received: "📞",
};

export default function LeadDetailPage() {
  const { id } = useParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setLead(data.lead);
      setMessages(data.messages || []);
      setTimeline(data.timeline || []);
    } catch {
      console.error("Failed to fetch lead");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const updateStage = async (newStage: string) => {
    if (!lead || updating) return;
    setUpdating(true);
    try {
      await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      setLead({ ...lead, stage: newStage });
      fetchLead();
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!lead) {
    return <div className="text-center py-12 text-gray-500">Lead not found</div>;
  }

  const currentStage = STAGES.find((s) => s.value === lead.stage);
  const currentStageIndex = STAGES.findIndex((s) => s.value === lead.stage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{lead.name || lead.whatsapp_name || "Unknown Lead"}</h1>
          <p className="text-sm text-gray-500">{lead.phone}</p>
        </div>
        {currentStage && (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${currentStage.color}`}>
            {currentStage.label}
          </span>
        )}
      </div>

      {/* Stage Pipeline */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-3 text-sm font-medium text-gray-700">Pipeline</h2>
        <div className="flex gap-1">
          {STAGES.map((stage, idx) => (
            <button
              key={stage.value}
              onClick={() => updateStage(stage.value)}
              disabled={updating}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                stage.value === lead.stage
                  ? "bg-[var(--color-primary)] text-white"
                  : idx <= currentStageIndex
                    ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lead Details */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium">{lead.phone}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{lead.email || "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Source</dt>
                <dd className="font-medium">{lead.source || "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Language</dt>
                <dd className="font-medium">{lead.preferred_language}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Score</dt>
                <dd className="font-medium">{lead.lead_score}/100</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Budget</dt>
                <dd className="font-medium">
                  {lead.budget_min && lead.budget_max
                    ? `${lead.budget_min.toLocaleString()} - ${lead.budget_max.toLocaleString()} KES`
                    : lead.budget_min
                      ? `From ${lead.budget_min.toLocaleString()} KES`
                      : lead.budget_max
                        ? `Up to ${lead.budget_max.toLocaleString()} KES`
                        : "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Listing Type</dt>
                <dd className="font-medium">{lead.listing_type || "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Property Type</dt>
                <dd className="font-medium">{lead.property_type || "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Area</dt>
                <dd className="font-medium">{lead.preferred_area || "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd className="font-medium">{new Date(lead.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Timeline + Messages */}
        <div className="lg:col-span-2 space-y-4">
          {/* Messages */}
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">Messages ({messages.length})</h2>
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500">No messages yet.</p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-2 text-sm ${
                      msg.direction === "inbound"
                        ? "bg-gray-100 text-gray-800 mr-12"
                        : "bg-[var(--color-primary)]/10 text-gray-800 ml-12"
                    }`}
                  >
                    <p>{msg.content?.body || msg.content?.text || JSON.stringify(msg.content)}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {msg.direction === "inbound" ? "📥" : "📤"}{" "}
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">Timeline ({timeline.length})</h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500">No events yet.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <span className="text-lg">{EVENT_ICONS[event.event_type] || "📌"}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.event_type.replace(/_/g, " ")}</p>
                      {event.metadata?.note && (
                        <p className="text-sm text-gray-600">{event.metadata.note}</p>
                      )}
                      {event.metadata?.from_stage && event.metadata?.to_stage && (
                        <p className="text-xs text-gray-500">
                          {event.metadata.from_stage} → {event.metadata.to_stage}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
