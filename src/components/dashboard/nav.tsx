"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export function DashboardNav({ user }: { user: User }) {
  return (
    <nav
      className="h-16 border-b flex items-center justify-between px-6"
      style={{
        backgroundColor: "var(--color-primary)",
        borderColor: "rgba(var(--color-primary-rgb), 0.2)",
      }}
    >
      <Link href="/" className="text-white text-xl font-bold">
        PropConnect
      </Link>

      <div className="flex items-center gap-4">
        <span className="text-white text-sm">
          {user.email}
        </span>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm px-3 py-1 rounded border border-white/30 text-white hover:bg-white/10 transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>
    </nav>
  );
}
