"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

interface Lead {
  id: string;
  name: string | null;
  whatsapp_name: string | null;
  phone: string;
  stage: string;
  opted_out: boolean;
  source: string | null;
  email: string | null;
  preferred_language: string | null;
}

interface Conversation {
  lead_id: string;
  lead: Lead | null;
  last_message: {
    direction: string | null;
    type: string | null;
    body: string;
    created_at: string | null;
    status: string;
  };
  unread_count: number;
  total_count: number;
  inbound_count: number;
  outbound_count: number;
  has_failed: boolean;
}

interface Message {
  id: string;
  lead_id: string;
  direction: string;
  type: string;
  content: any;
  wa_message_id: string | null;
  status: string | null;
  read_at: string | null;
  created_at: string | null;
}

type StageFilter =
  | ""
  | "new"
  | "contacted"
  | "qualified"
  | "matching"
  | "recommendation_sent"
  | "viewing_requested"
  | "viewing_confirmed"
  | "negotiation"
  | "converted"
  | "lost"
  | "dormant";

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

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-orange-100 text-orange-700",
  matching: "bg-purple-100 text-purple-700",
  recommendation_sent: "bg-indigo-100 text-indigo-700",
  viewing_requested: "bg-cyan-100 text-cyan-700",
  viewing_confirmed: "bg-green-100 text-green-700",
  negotiation: "bg-amber-100 text-amber-700",
  converted: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
  dormant: "bg-gray-100 text-gray-500",
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [readFilter, setReadFilter] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (directionFilter) params.set("direction", directionFilter);
      if (readFilter) params.set("read", readFilter);
      if (stageFilter) params.set("stage", stageFilter);

      const res = await fetch(`/api/messages?${params.toString()}`);
      const json = await res.json();
      setConversations(json.conversations || []);
    } catch {
      console.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [search, directionFilter, readFilter, stageFilter]);

  useEffect(() => {
    setLoading(true);
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  async function markAllRead() {
    setMarking(true);
    try {
      const res = await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) await load();
    } finally {
      setMarking(false);
    }
  }

  async function markSelectedRead() {
    setMarking(true);
    try {
      for (const leadId of bulkSelected) {
        await fetch("/api/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_id: leadId }),
        });
      }
      setBulkSelected(new Set());
      setBulkMode(false);
      await load();
    } finally {
      setMarking(false);
    }
  }

  function toggleBulkSelect(leadId: string) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }

  function clearFilters() {
    setSearch("");
    setDirectionFilter("");
    setReadFilter("");
    setStageFilter("");
  }

  const hasFilters = search || directionFilter || readFilter || stageFilter;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation list panel */}
      <div
        className={`flex flex-col border-r border-gray-100 bg-white ${
          selectedLeadId ? "hidden md:flex" : "flex"
        } ${selectedLeadId ? "w-full md:w-[380px]" : "w-full"}`}
      >
        {/* Header */}
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="mb-3 flex items-center justify-between">
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--color-primary)" }}
            >
              Messages
              {unreadTotal > 0 && (
                <span
                  className="ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: "var(--color-secondary)" }}
                >
                  {unreadTotal}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2">
              {bulkMode ? (
                <>
                  <span className="text-xs text-gray-400">
                    {bulkSelected.size} selected
                  </span>
                  <button
                    onClick={markSelectedRead}
                    disabled={bulkSelected.size === 0 || marking}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Mark read
                  </button>
                  <button
                    onClick={() => {
                      setBulkMode(false);
                      setBulkSelected(new Set());
                    }}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {unreadTotal > 0 && (
                    <button
                      onClick={markAllRead}
                      disabled={marking}
                      className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {marking ? "Marking..." : "Mark all read"}
                    </button>
                  )}
                  <button
                    onClick={() => setBulkMode(true)}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Select
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1.5">
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:border-[var(--color-secondary)] focus:outline-none"
            >
              <option value="">All directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:border-[var(--color-secondary)] focus:outline-none"
            >
              <option value="">All read status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as StageFilter)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:border-[var(--color-secondary)] focus:outline-none"
            >
              <option value="">All stages</option>
              {Object.entries(STAGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-gray-50"
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm font-medium text-gray-700">
                {hasFilters ? "No matching conversations" : "No conversations yet"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {hasFilters
                  ? "Try adjusting your filters or search terms."
                  : "Inbound WhatsApp messages will appear here."}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-xs font-medium"
                  style={{ color: "var(--color-secondary)" }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            conversations.map((c, idx) => {
              const name =
                c.lead?.name ||
                c.lead?.whatsapp_name ||
                c.lead?.phone ||
                "Unknown";
              const inbound = c.last_message.direction === "inbound";
              const isSelected = selectedLeadId === c.lead_id;
              const isBulkChecked = bulkSelected.has(c.lead_id);

              return (
                <div
                  key={c.lead_id}
                  className={`relative flex items-start gap-3 border-b border-gray-50 px-4 py-3 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[var(--color-off-white)]"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    if (bulkMode) {
                      toggleBulkSelect(c.lead_id);
                    } else {
                      setSelectedLeadId(c.lead_id);
                    }
                  }}
                >
                  {bulkMode && (
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={isBulkChecked}
                        onChange={() => toggleBulkSelect(c.lead_id)}
                        className="h-4 w-4 rounded border-gray-300"
                        style={{
                          accentColor: "var(--color-secondary)",
                        }}
                      />
                    </div>
                  )}

                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-primary)" }}>
                    {name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {name}
                        </p>
                        {c.unread_count > 0 && (
                          <span
                            className="flex h-5 min-w-5 flex-none items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                            style={{
                              backgroundColor: "var(--color-secondary)",
                            }}
                          >
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      {c.last_message.created_at && (
                        <span className="flex-none text-[11px] text-gray-400">
                          {formatTime(c.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="text-xs text-gray-400">
                        {inbound ? "←" : "→"}
                      </span>
                      <p className="truncate text-xs text-gray-500">
                        {c.last_message.body || "(no text)"}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {c.lead?.stage && (
                        <span
                          className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            STAGE_COLORS[c.lead.stage] || "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {STAGE_LABELS[c.lead.stage] || c.lead.stage}
                        </span>
                      )}
                      {c.lead?.opted_out && (
                        <span className="inline-flex rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                          Opted out
                        </span>
                      )}
                      {c.has_failed && (
                        <span className="inline-flex rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                          Failed
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {c.total_count} msg{c.total_count === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Inline conversation panel */}
      {selectedLeadId ? (
        <InlineConversation
          leadId={selectedLeadId}
          onBack={() => setSelectedLeadId(null)}
          conversations={conversations}
        />
      ) : (
        <div className="hidden flex-1 items-center justify-center bg-gray-50 md:flex">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Select a conversation
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Choose a conversation from the list to view messages
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineConversation({
  leadId,
  onBack,
  conversations,
}: {
  leadId: string;
  onBack: () => void;
  conversations: Conversation[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversation = conversations.find((c) => c.lead_id === leadId);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/messages/conversation?lead_id=${leadId}`
      );
      const json = await res.json();
      setMessages(json.messages || []);
    } catch {
      console.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadMessages();
    const timer = setInterval(loadMessages, 10000);
    return () => clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || sending) return;
    setSendError("");
    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, body: reply.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setReply("");
        await loadMessages();
      } else {
        setSendError(json.error || "Failed to send message");
      }
    } catch {
      setSendError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const leadName =
    conversation?.lead?.name ||
    conversation?.lead?.whatsapp_name ||
    conversation?.lead?.phone ||
    "Unknown";

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Conversation header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: "var(--color-primary)" }}>
          {leadName.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {leadName}
          </p>
          {conversation?.lead?.phone && (
            <p className="text-xs text-gray-400">
              {conversation.lead.phone}
              {conversation.lead.stage && (
                <span className="ml-1.5">
                  · {STAGE_LABELS[conversation.lead.stage] || conversation.lead.stage}
                </span>
              )}
            </p>
          )}
        </div>

        <Link
          href={`/leads/${leadId}`}
          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          View lead
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-50" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-500">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => {
            const inbound = msg.direction === "inbound";
            const body = extractBody(msg.content);
            return (
              <div
                key={msg.id}
                className={`mb-3 flex ${inbound ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    inbound
                      ? "rounded-bl-md bg-gray-100 text-gray-800"
                      : "rounded-br-md text-white"
                  }`}
                  style={
                    !inbound
                      ? { backgroundColor: "var(--color-primary)" }
                      : undefined
                  }
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {body || `(${msg.type || "message"})`}
                  </p>
                  <div
                    className={`mt-1 flex items-center gap-1 text-[10px] ${
                      inbound ? "text-gray-400" : "text-white/60"
                    }`}
                  >
                    <span>{formatTimeFull(msg.created_at)}</span>
                    {!inbound && (
                      <MessageStatus status={msg.status} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply box */}
      <div className="border-t border-gray-100 px-4 py-3">
        {conversation?.lead?.opted_out && (
          <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
            This lead has opted out of messaging. Sending messages may violate
            their consent.
          </div>
        )}
        {sendError && (
          <div className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
            {sendError}
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <textarea
            value={reply}
            onChange={(e) => {
              setReply(e.target.value);
              if (sendError) setSendError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-[var(--color-secondary)] focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={!reply.trim() || sending || conversation?.lead?.opted_out}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            {sending ? (
              <svg
                className="h-5 w-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageStatus({ status }: { status: string | null }) {
  if (!status || status === "unknown") return null;

  const icons: Record<string, string> = {
    sent: "✓",
    delivered: "✓✓",
    read: "✓✓",
    failed: "✗",
    permanent_failure: "✗",
  };

  const colors: Record<string, string> = {
    sent: "text-white/50",
    delivered: "text-white/60",
    read: "text-blue-200",
    failed: "text-red-300",
    permanent_failure: "text-red-300",
  };

  return (
    <span
      className={`text-[10px] ${colors[status] || "text-white/50"}`}
      title={status}
    >
      {icons[status] || ""}
    </span>
  );
}

function extractBody(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (typeof content.body === "string") return content.body;
  try {
    return JSON.stringify(content);
  } catch {
    return "";
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTimeFull(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (d.toDateString() === now.toDateString()) return time;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${time}`;
}
