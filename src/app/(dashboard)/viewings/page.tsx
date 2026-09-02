"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  IconViewings,
  IconPhone,
  IconMapPin,
  IconProperty,
} from "@/components/icons/sidebar-icons";

interface ViewingPhoto {
  storage_path: string;
  thumbnail_path: string | null;
  signed_url?: string | null;
  thumbnail_url?: string | null;
}

interface Viewing {
  id: string;
  property_id: string;
  lead_id: string;
  agent_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  created_at: string;
  properties?: {
    title: string | null;
    public_location_text: string | null;
    price: number | null;
    property_type: string | null;
    listing_type: string | null;
    property_photos?: ViewingPhoto[];
  };
  leads?: { name: string | null; phone: string | null };
}

interface ViewingStats {
  today: number;
  upcoming: number;
  requested: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

interface DaySection {
  key: string;
  label: string;
  items: Viewing[];
}

const STATUS_META: Record<string, { label: string; pill: string }> = {
  requested: { label: "Requested", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmed", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", pill: "bg-sky-50 text-sky-700 border-sky-200" },
  cancelled: { label: "Cancelled", pill: "bg-red-50 text-red-600 border-red-200" },
  rescheduled: { label: "Rescheduled", pill: "bg-orange-50 text-orange-700 border-orange-200" },
  no_show: { label: "No Show", pill: "bg-gray-100 text-gray-600 border-gray-200" },
};

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "all", label: "All time" },
  { id: "past", label: "Past" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function ViewingsPage() {
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [stats, setStats] = useState<ViewingStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [loading, setLoading] = useState(true);

  const fetchViewings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "20" });
    if (statusFilter) params.set("status", statusFilter);
    if (tab === "upcoming") params.set("from", new Date().toISOString());
    if (tab === "past") params.set("to", new Date().toISOString());

    try {
      const res = await fetch(`/api/viewings?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setViewings(data.viewings || []);
      setStats(data.stats || null);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error("Failed to fetch viewings", error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, tab]);

  useEffect(() => {
    fetchViewings();
  }, [fetchViewings]);

  const sections = useMemo(() => {
    const ordered = tab === "past" ? [...viewings].reverse() : viewings;
    return groupByDay(ordered);
  }, [viewings, tab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--color-primary)" }}
          >
            <span className="text-[var(--color-secondary)]">
              <IconViewings size={22} />
            </span>
            Viewings
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Property showings across your portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/viewings/export"
            download
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Export CSV
          </a>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500">
            {total} scheduled
          </div>
        </div>
      </div>

      <StatsRow stats={stats} loading={loading} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white p-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-[var(--color-navy)] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="requested">Requested</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : viewings.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.key}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                  {section.label}
                </h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  {section.items.length}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
                {section.items.map((v, idx) => (
                  <ViewingRow key={v.id} viewing={v} divider={idx > 0} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function StatsRow({ stats, loading }: { stats: ViewingStats | null; loading: boolean }) {
  const items: { label: string; value: number; color: string }[] = loading
    ? []
    : [
        { label: "Today", value: stats?.today ?? 0, color: "var(--color-gold-muted)" },
        { label: "Upcoming", value: stats?.upcoming ?? 0, color: "var(--color-primary)" },
        { label: "Awaiting confirmation", value: stats?.requested ?? 0, color: "#b45309" },
        { label: "Completed", value: stats?.completed ?? 0, color: "#047857" },
      ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-gray-100 bg-white p-4"
        >
          <p className="text-xs text-gray-500 mb-1">{item.label}</p>
          <p className="text-2xl font-bold" style={{ color: item.color }}>
            {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-gray-200" /> : item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ViewingRow({ viewing, divider }: { viewing: Viewing; divider: boolean }) {
  const start = new Date(viewing.start_at);
  const end = new Date(viewing.end_at);
  const status = STATUS_META[viewing.status] || {
    label: viewing.status,
    pill: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const photo = viewing.properties?.property_photos?.[0];
  const photoUrl = photo?.thumbnail_url || photo?.signed_url || photo?.thumbnail_path || photo?.storage_path;
  const location = viewing.properties?.public_location_text;
  const price = viewing.properties?.price;
  const type = viewing.properties?.property_type?.replace(/_/g, " ");
  const listing = viewing.properties?.listing_type;

  return (
    <Link
      href={`/viewings/${viewing.id}`}
      className={`group flex items-center gap-4 p-4 transition-colors hover:bg-[var(--color-off-white)] ${
        divider ? "border-t border-gray-100" : ""
      }`}
    >
      <div className="flex h-14 w-14 flex-none flex-col items-center justify-center rounded-lg border border-gray-200 bg-[var(--color-off-white)]">
        <span className="text-lg font-bold leading-none" style={{ color: "var(--color-primary)" }}>
          {start.getDate()}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
          {start.toLocaleDateString("en-US", { weekday: "short" })}
        </span>
      </div>

      <div className="relative h-16 w-20 flex-none overflow-hidden rounded-md bg-gray-100">
        {photoUrl ? (
          <div
            className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url(${photoUrl})` }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-gray-300"
            style={{ color: "var(--color-gold-muted)" }}
          >
            <IconProperty size={22} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-semibold group-hover:underline"
          style={{ color: "var(--color-primary)" }}
        >
          {viewing.properties?.title || "Unknown Property"}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
          {type && <span className="capitalize">{type}</span>}
          {type && listing && <span>·</span>}
          {listing && <span className="capitalize">{listing}</span>}
          {price != null && (
            <>
              <span>·</span>
              <span style={{ color: "var(--color-secondary)" }}>
                KES {price.toLocaleString()}
              </span>
            </>
          )}
        </p>
        {location && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-400">
            <IconMapPin size={12} />
            {location}
          </p>
        )}
        <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
          <span className="font-medium">
            {viewing.leads?.name || "Unknown lead"}
          </span>
          {viewing.leads?.phone && (
            <span className="inline-flex items-center gap-1 text-gray-400">
              <IconPhone size={12} />
              {viewing.leads.phone}
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-none flex-col items-end gap-1.5">
        <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
          {formatTimeRange(start, end)}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.pill}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {status.label}
        </span>
      </div>
    </Link>
  );
}

function groupByDay(viewings: Viewing[]): DaySection[] {
  const sections = new Map<string, DaySection>();
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  for (const v of viewings) {
    const d = new Date(v.start_at);
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime().toString();
    const existing = sections.get(key);
    if (existing) {
      existing.items.push(v);
      continue;
    }
    sections.set(key, {
      key,
      label: dayLabel(key, startOfToday, d),
      items: [v],
    });
  }

  return Array.from(sections.values());
}

function dayLabel(key: string, startOfToday: number, d: Date): string {
  const diff = Math.round((parseInt(key) - startOfToday) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatTimeRange(start: Date, end: Date): string {
  return `${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })} – ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {[0, 1].map((s) => (
        <div key={s}>
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
            {[0, 1, 2].map((r) => (
              <div
                key={r}
                className={`flex items-center gap-4 p-4 ${r > 0 ? "border-t border-gray-100" : ""}`}
              >
                <div className="h-14 w-14 flex-none animate-pulse rounded-lg bg-gray-100" />
                <div className="h-16 w-20 flex-none animate-pulse rounded-md bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/5 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-6 w-24 flex-none animate-pulse rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const copy =
    tab === "upcoming"
      ? { title: "No upcoming viewings", hint: "New viewing requests will appear here." }
      : tab === "past"
        ? { title: "No past viewings", hint: "Completed and cancelled showings will appear here." }
        : { title: "No viewings yet", hint: "Once viewings are scheduled they'll show up here." };

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-gray-100 bg-white py-16 px-6 text-center">
      <div className="mb-3 rounded-full bg-gray-100 p-4 text-gray-300">
        <IconViewings size={28} />
      </div>
      <p className="text-sm font-medium text-gray-700">{copy.title}</p>
      <p className="mt-1 text-xs text-gray-400">{copy.hint}</p>
    </div>
  );
}