"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_ITEMS } from "@/components/dashboard/sidebar";
import {
  IconBell,
  IconChevronDown,
  IconLogout,
  IconMapPin,
  IconMenu,
  IconMoon,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSun,
  IconTasks,
  IconViewings,
  IconX,
} from "@/components/icons/sidebar-icons";

interface ViewingRequest {
  id: string;
  start_at: string;
  properties?: { title: string | null };
  leads?: { name: string | null; phone: string | null };
}

interface PendingTask {
  id: string;
  title: string;
  priority?: string | null;
  due_at?: string | null;
}

type OpenMenu = "bell" | "user" | null;

export function DashboardNav({
  user,
  onMenuClick,
}: {
  user: { email?: string };
  onMenuClick?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState<OpenMenu>(null);
  const [query, setQuery] = useState("");
  const [mobileSearch, setMobileSearch] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifs, setNotifs] = useState<{ requests: ViewingRequest[]; tasks: PendingTask[] }>({
    requests: [],
    tasks: [],
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private mode / storage blocked — theme still applies for this session.
    }
    setDark(next);
  }

  const pageLabel = useCallback(() => {
    if (pathname === "/") return "Dashboard";
    return NAV_ITEMS.find((i) => i.href !== "/" && pathname.startsWith(i.href))?.label;
  }, [pathname]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [viewingsRes, tasksRes] = await Promise.all([
          fetch("/api/viewings?status=requested&limit=4").then((r) => r.json()),
          fetch("/api/tasks?status=pending&limit=3").then((r) => r.json()),
        ]);
        if (!active) return;
        setNotifs({
          requests: viewingsRes.viewings || [],
          tasks: tasksRes.tasks || [],
        });
      } catch {
        // Notifications are non-critical; fail silently.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    router.push(term ? `/properties?search=${encodeURIComponent(term)}` : "/properties");
    setQuery("");
  }

  const label = pageLabel();
  const badgeTotal = notifs.requests.length + notifs.tasks.length;

  return (
    <header
      className="sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)]"
      style={{
        backgroundColor: "var(--color-navy-deep)",
        borderColor: "rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="h-16 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4">
      {/* Brand + current section */}
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <IconMenu size={20} />
          </button>
        )}
        <Link href="/" className="flex flex-none items-center gap-2.5">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: "var(--color-secondary)" }}
          />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-[var(--color-secondary)]">Prop</span>
            <span className="text-white">Connect</span>
            <span className="text-[var(--color-secondary)]">.</span>
          </span>
        </Link>

        {label && (
          <>
            <span className="hidden h-5 w-px bg-white/15 sm:block" />
            <span className="hidden text-sm font-medium text-white/60 sm:block">{label}</span>
          </>
        )}
      </div>

      {/* Global search */}
      <form
        onSubmit={handleSearch}
        className="hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 focus-within:border-[var(--color-secondary)] md:flex"
      >
        <span className="text-white/40">
          <IconSearch size={16} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search properties…"
          className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
        />
        <kbd className="rounded border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/40">
          ↵
        </kbd>
      </form>

      {/* Right cluster */}
      <div ref={rootRef} className="flex flex-none items-center gap-2">
        <Link
          href="/properties/new"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 lg:flex"
          style={{ backgroundColor: "var(--color-secondary)", color: "var(--color-navy-deep)" }}
        >
          <IconPlus size={15} strokeWidth={2.4} />
          New property
        </Link>

        {/* Mobile search toggle */}
        <button
          onClick={() => setMobileSearch((v) => !v)}
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
        >
          <IconSearch size={18} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setOpen(open === "bell" ? null : "bell")}
            aria-label="Notifications"
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              open === "bell" ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <IconBell size={18} />
            {badgeTotal > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{ backgroundColor: "var(--color-secondary)", color: "var(--color-navy-deep)" }}
              >
                {badgeTotal > 9 ? "9+" : badgeTotal}
              </span>
            )}
          </button>

          {open === "bell" && <NotificationPanel notifs={notifs} />}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen(open === "user" ? null : "user")}
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 transition-colors hover:bg-white/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: "rgba(var(--color-secondary-rgb), 0.25)" }}>
              {initials(user.email)}
            </span>
            <span className="hidden max-w-[10rem] truncate text-sm text-white/80 xl:block">{user.email}</span>
            <IconChevronDown size={14} className="text-white/40" />
          </button>

          {open === "user" && <UserMenu email={user.email} onSignOut={handleSignOut} />}
        </div>
      </div>
      </div>

      {/* Mobile search row */}
      {mobileSearch && (
        <div className="border-t border-white/10 px-3 pb-3 sm:px-5 md:hidden">
          <form
            onSubmit={(e) => {
              handleSearch(e);
              setMobileSearch(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 focus-within:border-[var(--color-secondary)]"
          >
            <span className="text-white/40">
              <IconSearch size={16} />
            </span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search properties…"
              className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setMobileSearch(false)}
              aria-label="Close search"
              className="text-white/40 transition-colors hover:text-white"
            >
              <IconX size={16} />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}

function NotificationPanel({
  notifs,
}: {
  notifs: { requests: ViewingRequest[]; tasks: PendingTask[] };
}) {
  const isEmpty = notifs.requests.length === 0 && notifs.tasks.length === 0;

  return (
    <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl shadow-black/10">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
          Notifications
        </p>
        {!isEmpty && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            {notifs.requests.length + notifs.tasks.length} new
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-medium text-gray-700">You&apos;re all caught up</p>
          <p className="mt-1 text-xs text-gray-400">Nothing needs your attention right now.</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {notifs.requests.length > 0 && (
            <div className="py-2">
              <p className="px-4 pb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                Viewing requests · {notifs.requests.length}
              </p>
              {notifs.requests.map((v) => (
                <Link
                  key={v.id}
                  href={`/viewings/${v.id}`}
                  className="flex items-start gap-2.5 px-4 py-2 transition-colors hover:bg-gray-50"
                >
                  <span className="mt-0.5 text-gray-300">
                    <IconViewings size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-800">
                      {v.properties?.title || "Property viewing"}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="truncate">{v.leads?.name || v.leads?.phone || "Unknown lead"}</span>
                      <span>·</span>
                      <span className="flex-none">{formatWhen(v.start_at)}</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {notifs.tasks.length > 0 && (
            <div className="border-t border-gray-100 py-2">
              <p className="px-4 pb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                Pending tasks · {notifs.tasks.length}
              </p>
              {notifs.tasks.map((t) => (
                <Link
                  key={t.id}
                  href="/tasks"
                  className="flex items-start gap-2.5 px-4 py-2 transition-colors hover:bg-gray-50"
                >
                  <span className="mt-0.5 text-gray-300">
                    <IconTasks size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-800">{t.title}</span>
                    <span className="text-xs text-gray-400">
                      {t.priority ? <span className="capitalize">{t.priority}</span> : "Task"}
                      {t.due_at ? ` · due ${formatWhen(t.due_at)}` : ""}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 text-xs font-medium">
        <Link href="/viewings" className="flex items-center gap-1" style={{ color: "var(--color-secondary)" }}>
          <IconMapPin size={13} />
          All viewings
        </Link>
        <span className="text-gray-200">|</span>
        <Link href="/tasks" className="flex items-center gap-1" style={{ color: "var(--color-secondary)" }}>
          <IconTasks size={13} />
          All tasks
        </Link>
      </div>
    </div>
  );
}

function UserMenu({ email, onSignOut }: { email?: string; onSignOut: () => void }) {
  return (
    <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl shadow-black/10">
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <span
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: "rgba(var(--color-secondary-rgb), 0.35)" }}
        >
          {initials(email)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-500">Signed in as</p>
          <p className="truncate text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
            {email}
          </p>
        </div>
      </div>

      <div className="p-1.5">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          <span className="text-gray-400">
            <IconSettings size={16} />
          </span>
          Settings
        </Link>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
        >
          <IconLogout size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
}

function initials(email?: string): string {
  const local = (email || "U").split("@")[0];
  const parts = local.split(/[^a-zA-Z]+/).filter(Boolean);
  const letters = ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  return letters || (local[0] || "U").toUpperCase();
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((dayStart - startOfToday) / 86400000);
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Tomorrow ${time}`;
  if (diff === -1) return `Yesterday ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${time}`;
}