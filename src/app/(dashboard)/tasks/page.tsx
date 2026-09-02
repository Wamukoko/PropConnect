"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IconTasks, IconPhone } from "@/components/icons/sidebar-icons";
import {
  TASK_TYPES,
  TASK_TYPE_LABELS,
  VALID_STATUSES,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/lib/analytics/task-types";
import type { TaskType, TaskStatus, TaskPriority } from "@/lib/analytics/task-types";
import { buildCounts, buildSections } from "@/lib/analytics/task-grouping";

interface TaskLead {
  id: string;
  name: string | null;
  whatsapp_name: string | null;
  phone: string | null;
  email: string | null;
  stage: string | null;
}

interface TaskRow {
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
  lead_id: string | null;
  agent_id: string | null;
  lead?: TaskLead | null;
  agent?: { id: string; name: string | null } | null;
}

interface LeadOption {
  id: string;
  name: string | null;
  whatsapp_name: string | null;
  phone: string;
  stage: string;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-400",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulking, setBulking] = useState(false);

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (agentFilter === "mine") params.set("mine", "true");
    try {
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      console.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, agentFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const refresh = useCallback(async () => {
    await fetchTasks();
    setEditingId(null);
    setBulkSelected(new Set());
  }, [fetchTasks]);

  const counts = useMemo(() => buildCounts(tasks), [tasks]);
  const sections = useMemo(() => buildSections(tasks), [tasks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--color-primary)" }}
          >
            <span className="text-[var(--color-secondary)]">
              <IconTasks size={22} />
            </span>
            Tasks
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Follow-ups and agent work queue
          </p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded-lg bg-[var(--color-navy)] px-4 py-2 text-sm text-white hover:opacity-90"
        >
          {showNew ? "Cancel" : "New Task"}
        </button>
      </div>

      <SummaryBar counts={counts} />

      {showNew && (
        <NewTaskForm
          saving={saving}
          onSave={async (payload) => {
            setSaving(true);
            try {
              const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!res.ok) return false;
              setShowNew(false);
              await fetchTasks();
              return true;
            } finally {
              setSaving(false);
            }
          }}
        />
      )}

      <div className="flex flex-wrap gap-3 rounded-lg border border-gray-100 bg-white p-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {VALID_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {TASK_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All agents</option>
          <option value="mine">Assigned to me</option>
        </select>
      </div>

      {bulkSelected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/5 p-3">
          <span className="text-sm font-medium text-gray-700">
            {bulkSelected.size} selected
          </span>
          <button
            onClick={async () => {
              setBulking(true);
              for (const id of Array.from(bulkSelected)) {
                await fetch(`/api/tasks/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "completed" }),
                });
              }
              await refresh();
              setBulking(false);
            }}
            disabled={bulking}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {bulking ? "Completing..." : "Complete selected"}
          </button>
          <button
            onClick={() => setBulkSelected(new Set())}
            disabled={bulking}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-gray-100 bg-white" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-white py-16 text-center">
          <p className="text-sm font-medium text-gray-700">No tasks yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Create a follow-up, or let viewing bookings and stale leads generate tasks for you.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) =>
            section.tasks.length === 0 ? null : (
              <section key={section.key}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                    {section.label}
                  </h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    {section.tasks.length}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
                  {section.tasks.map((task, idx) => (
                    <TaskRowCard
                      key={task.id}
                      task={task}
                      divider={idx > 0}
                      editing={editingId === task.id}
                      selected={bulkSelected.has(task.id)}
                      onToggleSelect={() =>
                        setBulkSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(task.id)) next.delete(task.id);
                          else next.add(task.id);
                          return next;
                        })
                      }
                      onToggleEdit={() => setEditingId(editingId === task.id ? null : task.id)}
                      onEdit={async (payload) => {
                        const res = await fetch(`/api/tasks/${task.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        });
                        if (res.ok) await refresh();
                      }}
                      onStatus={async (status) => {
                        const res = await fetch(`/api/tasks/${task.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status }),
                        });
                        if (res.ok) await refresh();
                      }}
                      onDelete={async () => {
                        const res = await fetch(`/api/tasks/${task.id}`, {
                          method: "DELETE",
                        });
                        if (res.ok) await refresh();
                      }}
                    />
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}
    </div>
  );
}

function SummaryBar({ counts }: { counts: ReturnType<typeof buildCounts> }) {
  const items = [
    { label: "Overdue", value: counts.overdue, color: "#dc2626" },
    { label: "Due today", value: counts.today, color: "var(--color-secondary)" },
    { label: "Upcoming", value: counts.upcoming, color: "var(--color-primary)" },
    { label: "In progress", value: counts.inProgress, color: "#2563eb" },
    { label: "Completed", value: counts.completed, color: "#047857" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-gray-100 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">{item.label}</p>
          <p className="text-2xl font-bold" style={{ color: item.color }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function NewTaskForm({
  saving,
  onSave,
}: {
  saving: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [type, setType] = useState<TaskType>("lead_follow_up");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueAt, setDueAt] = useState("");
  const [lead, setLead] = useState<LeadOption | null>(null);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <LeadPicker value={lead} onChange={setLead} />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TaskType)}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {TASK_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm"
        >
          {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm"
        />
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
      />
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
      />
      <div className="flex justify-end">
        <button
          onClick={async () => {
            if (!title.trim()) return;
            const ok = await onSave({
              type,
              title: title.trim(),
              description: description.trim() || null,
              notes: notes.trim() || null,
              priority,
              due_at: dueAt || null,
              lead_id: lead?.id ?? null,
            });
            if (ok) {
              setTitle("");
              setDescription("");
              setNotes("");
              setDueAt("");
              setLead(null);
              setType("lead_follow_up");
              setPriority("medium");
            }
          }}
          disabled={saving || !title.trim()}
          className="rounded-lg bg-[var(--color-navy)] px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Task"}
        </button>
      </div>
    </div>
  );
}

function LeadPicker({
  value,
  onChange,
}: {
  value: LeadOption | null;
  onChange: (lead: LeadOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LeadOption[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/leads?search=${encodeURIComponent(q)}&limit=6`);
      const data = await res.json();
      setResults(data.leads || []);
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  if (value) {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
        <Link
          href={`/leads/${value.id}`}
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          {value.name || value.whatsapp_name || value.phone}
        </Link>
        <button
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Remove lead link"
        >
          ×
        </button>
      </span>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Link to lead (optional)"
        className="w-64 rounded-md border border-gray-200 px-3 py-2 text-sm"
      />
      {open && query.trim() && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          {results.map((lead) => (
            <button
              key={lead.id}
              onClick={() => {
                onChange(lead);
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span className="font-medium text-gray-800">
                {lead.name || lead.whatsapp_name || lead.phone}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <IconPhone size={11} />
                {lead.phone} · {lead.stage}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRowCard({
  task,
  divider,
  editing,
  selected,
  onToggleSelect,
  onToggleEdit,
  onEdit,
  onStatus,
  onDelete,
}: {
  task: TaskRow;
  divider: boolean;
  editing: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleEdit: () => void;
  onEdit: (payload: Record<string, unknown>) => Promise<void>;
  onStatus: (status: TaskStatus) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");
  const [type, setType] = useState<TaskType>(task.type);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueAt, setDueAt] = useState(task.due_at ? toLocalInput(task.due_at) : "");

  const leadName = task.lead?.name || task.lead?.whatsapp_name;
  const completed = task.status === "completed";
  const cancelled = task.status === "cancelled";

  if (editing) {
    return (
      <div className={`p-4 space-y-3 ${divider ? "border-t border-gray-100" : ""}`}>
        <div className="flex flex-wrap gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            className="rounded-md border border-gray-200 px-2 py-1.5 text-xs"
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
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
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="rounded-md border border-gray-200 px-2 py-1.5 text-xs"
          />
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onToggleEdit}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              await onEdit({
                title: title.trim() || task.title,
                description: description.trim() || null,
                notes: notes.trim() || null,
                type,
                priority,
                due_at: dueAt || null,
              });
            }}
            className="rounded-md bg-[var(--color-navy)] px-3 py-1 text-xs text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-4 p-4 transition-colors hover:bg-[var(--color-off-white)] ${
        divider ? "border-t border-gray-100" : ""
      } ${completed || cancelled ? "opacity-60" : ""}`}
    >
      {!completed && !cancelled && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label="Select task"
          className="mt-1 flex-none accent-[var(--color-secondary)]"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-900">{task.title}</span>
          <span className={`text-xs rounded-full px-2 py-0.5 ${PRIORITY_STYLES[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          <span className={`text-xs rounded-full px-2 py-0.5 ${STATUS_STYLES[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
          <span className="text-xs rounded-full border border-gray-200 px-2 py-0.5 text-gray-500">
            {TASK_TYPE_LABELS[task.type] ?? task.type}
          </span>
        </div>

        {task.description && (
          <p className="mt-1 text-sm text-gray-600">{task.description}</p>
        )}
        {task.notes && (
          <p className="mt-1 text-xs text-gray-400 italic">Notes: {task.notes}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {task.lead?.id ? (
            <Link
              href={`/leads/${task.lead.id}`}
              className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline"
            >
              {leadName || "Lead"}
              {task.lead.phone && (
                <span className="inline-flex items-center gap-1 text-gray-400">
                  <IconPhone size={11} />
                  {task.lead.phone}
                </span>
              )}
            </Link>
          ) : (
            <span className="text-gray-400">Unlinked task</span>
          )}
          <span>·</span>
          <span>
            {task.agent?.name ? `Assigned: ${task.agent.name}` : "Unassigned"}
          </span>
          {task.due_at && (
            <>
              <span>·</span>
              <span className={dueStatusClass(task)}>{formatDue(task.due_at)}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-none items-center gap-2">
        {!completed && !cancelled && (
          <>
            <button
              onClick={() =>
                onStatus(task.status === "in_progress" ? "pending" : "in_progress")
              }
              className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
            >
              {task.status === "in_progress" ? "Pause" : "Start"}
            </button>
            <button
              onClick={() => onStatus("completed")}
              className="rounded-md bg-emerald-600 px-3 py-1 text-xs text-white hover:opacity-90"
            >
              Complete
            </button>
            <button
              onClick={() => onStatus("cancelled")}
              className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          </>
        )}
        {completed && (
          <button
            onClick={() => onStatus("pending")}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            Reopen
          </button>
        )}
        <button
          onClick={onToggleEdit}
          className="rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
        >
          Edit
        </button>
        <button
          onClick={() => {
            if (window.confirm("Delete this task?")) onDelete();
          }}
          className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dueStatusClass(task: TaskRow) {
  if (task.status !== "pending" && task.status !== "in_progress") return "text-gray-400";
  const due = new Date(task.due_at as string).getTime();
  const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  if (due < startOfToday) return "font-medium text-red-600";
  if (due < startOfToday + 86400000) return "font-medium text-amber-600";
  return "text-gray-500";
}

function formatDue(iso: string) {
  const d = new Date(iso);
  const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  const diff = Math.round((d.getTime() - startOfToday) / 86400000);
  if (diff < 0) return `Overdue · ${d.toLocaleString()}`;
  if (diff === 0) return `Due today · ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  if (diff === 1) return `Due tomorrow · ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}