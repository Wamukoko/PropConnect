"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/nav";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardFooter } from "@/components/dashboard/footer";

export function DashboardShell({
  user,
  children,
}: {
  user: { email?: string };
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <DashboardNav user={user} onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1">
        <DashboardSidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 min-w-0 p-4 sm:p-6">{children}</main>
      </div>
      <DashboardFooter />
    </div>
  );
}
