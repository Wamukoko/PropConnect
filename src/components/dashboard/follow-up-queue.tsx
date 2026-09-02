"use client";

import { useState } from "react";
import Link from "next/link";
import { IconTasks } from "@/components/icons/sidebar-icons";

export interface FollowUpSuggestion {
  leadId: string;
  leadName: string | null;
  phone: string;
  daysSinceContact: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  dueAt: string;
}

const PRIORITY_STYLES: Record<FollowUpSuggestion["priority"], string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-red-100 text-red-800",
};

export function FollowUpQueue({ suggestions }: { suggestions: FollowUpSuggestion[] }) {
  const [creating, setCreating] = useState<string | null>(null);
  const [created, setCreated] = useState<Record<string, boolean>>({});

  async function createTask(s: FollowUpSuggestion) {
    setCreating(s.leadId);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: s.leadId,
          type: "lead_follow_up",
          title: s.title,
          description: s.description,
          priority: s.priority,
          due_at: s.dueAt,
        }),
      });
      if (res.ok) {
        setCreated((prev) => ({ ...prev, [s.leadId]: true }));
      }
    } finally {
      setCreating(null);
    }
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-8 rounded-lg border border-gray-100 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
          Needs Follow-up
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          {suggestions.length}
        </span>
      </div>
      <ul className="divide-y divide-gray-100">
        {suggestions.map((s) => (
          <li key={s.leadId} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/leads/${s.leadId}`}
                  className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  {s.leadName || s.phone}
                </Link>
                <span className={`text-xs rounded-full px-2 py-0.5 ${PRIORITY_STYLES[s.priority]}`}>
                  {s.priority}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-500">{s.description}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {s.phone} · {s.daysSinceContact} days since last contact
              </p>
            </div>
            <button
              onClick={() => createTask(s)}
              disabled={creating === s.leadId || created[s.leadId]}
              className="flex-none rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
              style={{
                borderColor: created[s.leadId] ? "transparent" : undefined,
                backgroundColor: created[s.leadId] ? "var(--color-secondary)" : undefined,
                color: created[s.leadId] ? "#fff" : undefined,
              }}
            >
              <IconTasks size={13} />
              {created[s.leadId]
                ? "Task created"
                : creating === s.leadId
                  ? "Creating..."
                  : "Create task"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}