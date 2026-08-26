"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/contacts", label: "Contacts", icon: "👥" },
  { href: "/leads", label: "Leads", icon: "🎯" },
  { href: "/properties", label: "Properties", icon: "🏠" },
  { href: "/viewings", label: "Viewings", icon: "📅" },
  { href: "/messages", label: "Messages", icon: "💬" },
  { href: "/tasks", label: "Tasks", icon: "✅" },
  { href: "/saved-searches", label: "Saved Searches", icon: "🔍" },
  { href: "/campaigns", label: "Campaigns", icon: "📢" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/integrations", label: "Integrations", icon: "🔗" },
  { href: "/system-health", label: "System Health", icon: "💓" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-100 min-h-[calc(100vh-4rem)]">
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
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
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
