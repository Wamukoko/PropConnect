import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-primary)" }}>
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Leads" value="—" color="var(--color-primary)" />
        <StatCard title="Properties" value="—" color="var(--color-secondary)" />
        <StatCard title="Viewings This Week" value="—" color="var(--color-primary)" />
        <StatCard title="Messages Today" value="—" color="var(--color-secondary)" />
      </div>

      <div className="mt-8 bg-white rounded-lg border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary)" }}>
          Recent Activity
        </h2>
        <p className="text-gray-500 text-sm">
          No recent activity. Activity will appear here once WhatsApp conversations and lead interactions begin.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-6">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
