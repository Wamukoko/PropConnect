"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconAnalytics,
  IconCampaigns,
  IconContacts,
  IconDashboard,
  IconHealth,
  IconIntegrations,
  IconLeads,
  IconMessages,
  IconProperty,
  IconSavedSearches,
  IconSettings,
  IconTasks,
  IconViewings,
} from "@/components/icons/sidebar-icons";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", Icon: IconDashboard },
  { href: "/contacts", label: "Contacts", Icon: IconContacts },
  { href: "/leads", label: "Leads", Icon: IconLeads },
  { href: "/properties", label: "Properties", Icon: IconProperty },
  { href: "/viewings", label: "Viewings", Icon: IconViewings },
  { href: "/messages", label: "Messages", Icon: IconMessages, hasBadge: true },
  { href: "/tasks", label: "Tasks", Icon: IconTasks },
  { href: "/saved-searches", label: "Saved Searches", Icon: IconSavedSearches },
  { href: "/campaigns", label: "Campaigns", Icon: IconCampaigns },
  { href: "/analytics", label: "Analytics", Icon: IconAnalytics },
  { href: "/integrations", label: "Integrations", Icon: IconIntegrations },
  { href: "/system-health", label: "System Health", Icon: IconHealth },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchUnread() {
      try {
        const res = await fetch("/api/messages?read=unread&limit=1");
        const json = await res.json();
        if (!active) return;
        const total = (json.conversations || []).reduce(
          (sum: number, c: any) => sum + c.unread_count,
          0
        );
        setUnreadCount(total);
      } catch {
        // Non-critical; fail silently
      }
    }
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <aside className="w-56 bg-white border-r border-gray-100 min-h-[calc(100vh-4rem)]">
      <nav className="p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-accent/10 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              style={isActive ? { color: "var(--color-secondary)" } : undefined}
            >
              <span className="text-base leading-none">
                <item.Icon size={20} />
              </span>
              <span className="flex-1">{item.label}</span>
              {item.hasBadge && unreadCount > 0 && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: "var(--color-secondary)" }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
