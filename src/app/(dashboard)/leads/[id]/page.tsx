"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  IconHome,
  IconInbox,
  IconMapPin,
  IconNote,
  IconPhone,
  IconSend,
  IconSparkle,
  IconClipboard,
  IconTasks,
} from "@/components/icons/sidebar-icons";
import { ScoreDonut } from "@/components/score-donut";
import {
  TASK_TYPES,
  TASK_TYPE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/analytics/task-types";
import type { TaskType, TaskStatus, TaskPriority } from "@/lib/analytics/task-types";

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

interface LeadTask {
  id: string;
  type: TaskType;
  title: string;
  description: string | null;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  agent?: { id: string; name: string | null };
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

const EVENT_ICONS: Record<string, () => React.ReactNode> = {
  stage_changed: () => <IconClipboard size={18} />,
  message_sent: () => <IconSend size={18} />,
  message_received: () => <IconInbox size={18} />,
  property_viewed: () => <IconHome size={18} />,
  note_added: () => <IconNote size={18} />,
  lead_created: () => <IconSparkle size={18} />,
  call_made: () => <IconPhone size={18} />,
  call_received: () => <IconPhone size={18} />,
  agent_task_created: () => <IconTasks size={18} />,
  agent_task_completed: () => <IconTasks size={18} />,
  agent_task_cancelled: () => <IconTasks size={18} />,
};

export default function LeadDetailPage() {
  const { id } = useParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState(false);

  const [newTask, setNewTask] = useState({
    title: "",
    type: "lead_follow_up" as TaskType,
    priority: "medium" as TaskPriority,
    due_at: "",
    description: "",
  });
  const [taskMutating, setTaskMutating] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setLead(data.lead);
      setMessages(data.messages || []);
      setTimeline(data.timeline || []);
      setTasks(data.tasks || []);
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

  const convertToContact = async () => {
    if (!lead || converting || converted) return;
    setConverting(true);
    try {
      const [first, ...rest] = (lead.name || lead.whatsapp_name || "").split(" ");
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: first || lead.phone,
          last_name: rest.join(" ") || null,
          display_name: lead.name || lead.whatsapp_name || lead.phone,
          phone: lead.phone,
          email: lead.email || null,
          contact_type: "lead",
          source: lead.source || "lead",
          notes: "Converted from lead",
        }),
      });
      if (!res.ok) throw new Error("Conversion failed");
      setConverted(true);
      if (lead.stage !== "converted") {
        await fetch(`/api/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: "converted" }),
        });
        setLead({ ...lead, stage: "converted" });
        fetchLead();
      }
    } catch {
      console.error("Failed to convert");
    } finally {
      setConverting(false);
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

      <div className="flex items-center gap-2">
        <button
          onClick={convertToContact}
          disabled={converting || converted || lead.stage === "converted"}
          className="rounded-lg bg-[var(--color-navy)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {converted || lead.stage === "converted"
            ? "Converted to Contact"
            : converting
              ? "Converting..."
              : "Convert to Contact"}
        </button>
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
                  ? "bg-[var(--color-navy)] text-white"
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
                <dd className="flex items-center gap-2">
                  <ScoreDonut score={lead.lead_score} size={28} />
                  <span className="text-xs text-gray-500">/100</span>
                </dd>
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
          {/* Tasks / Follow-ups */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-700">
                Tasks &amp; Follow-ups ({tasks.length})
              </h2>
            </div>

            <div className="mb-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                <select
                  value={newTask.type}
                  onChange={(e) => setNewTask({ ...newTask, type: e.target.value as TaskType })}
                  className="rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TASK_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <select
                  value={newTask.priority}
                  onChange={(e) =>
                    setNewTask({ ...newTask, priority: e.target.value as TaskPriority })
                  }
                  className="rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                >
                  {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={newTask.due_at}
                  onChange={(e) => setNewTask({ ...newTask, due_at: e.target.value })}
                  className="rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="New follow-up task title"
                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
                />
                <input
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Notes (optional)"
                  className="hidden w-1/3 rounded-md border border-gray-200 px-2 py-1.5 text-sm sm:block"
                />
                <button
                  onClick={async () => {
                    const title = newTask.title.trim();
                    if (!title || taskMutating || !lead) return;
                    setTaskMutating(true);
                    try {
                      const res = await fetch("/api/tasks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          lead_id: lead.id,
                          type: newTask.type,
                          title,
                          description: newTask.description.trim() || null,
                          priority: newTask.priority,
                          due_at: newTask.due_at || null,
                        }),
                      });
                      if (res.ok) {
                        setNewTask({
                          title: "",
                          description: "",
                          type: "lead_follow_up",
                          priority: "medium",
                          due_at: "",
                        });
                        fetchLead();
                      }
                    } finally {
                      setTaskMutating(false);
                    }
                  }}
                  disabled={taskMutating || !newTask.title.trim()}
                  className="flex-none rounded-md bg-[var(--color-navy)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
                >
                  {taskMutating ? "Adding..." : "Add Task"}
                </button>
              </div>
            </div>

            {tasks.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks or follow-ups yet.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3 ${
                      task.status === "completed" || task.status === "cancelled"
                        ? "opacity-60"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{task.title}</span>
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">
                          {TASK_TYPE_LABELS[task.type]}
                        </span>
                      </div>
                      {task.description && (
                        <p className="mt-0.5 text-xs text-gray-500">{task.description}</p>
                      )}
                      {task.due_at && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          Due {new Date(task.due_at).toLocaleString()}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {STATUS_LABELS[task.status]} · {PRIORITY_LABELS[task.priority]} ·{" "}
                        {task.agent?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <div className="flex flex-none gap-1.5">
                      {task.status === "pending" && (
                        <button
                          onClick={async () => {
                            await fetch(`/api/tasks/${task.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "in_progress" }),
                            });
                            fetchLead();
                          }}
                          className="rounded-md border border-gray-300 px-2 py-1 text-[11px] hover:bg-gray-50"
                        >
                          Start
                        </button>
                      )}
                      {task.status === "in_progress" && (
                        <button
                          onClick={async () => {
                            await fetch(`/api/tasks/${task.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "completed" }),
                            });
                            fetchLead();
                          }}
                          className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] text-white"
                        >
                          Complete
                        </button>
                      )}
                      {task.status === "completed" && (
                        <span className="text-[11px] font-medium text-emerald-600">Done</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                    <p className="mt-1 text-xs text-gray-500 flex items-center gap-1.5">
                      {msg.direction === "inbound" ? (
                        <IconInbox size={13} />
                      ) : (
                        <IconSend size={13} />
                      )}{" "}
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
                    <span className="text-gray-400 mt-0.5">
                      {EVENT_ICONS[event.event_type]
                        ? EVENT_ICONS[event.event_type]()
                        : <IconMapPin size={18} />}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{(event.event_type || "").replace(/_/g, " ")}</p>
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
