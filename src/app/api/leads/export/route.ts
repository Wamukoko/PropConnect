import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("account_id")
    .eq("id", user.id)
    .single();
  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("account_id", agent.account_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leads = data || [];
  const header =
    "name,whatsapp_name,phone,email,stage,lead_score,source,listing_type,property_type,preferred_area,budget_min,budget_max,created_at,last_contacted_at";
  const rows = leads.map((l: any) =>
    [
      csvField(l.name),
      csvField(l.whatsapp_name),
      csvField(l.phone),
      csvField(l.email),
      csvField(l.stage),
      csvField(l.lead_score),
      csvField(l.source),
      csvField(l.listing_type),
      csvField(l.property_type),
      csvField(l.preferred_area),
      csvField(l.budget_min),
      csvField(l.budget_max),
      csvField(l.created_at),
      csvField(l.last_contacted_at),
    ].join(",")
  );
  const body = [header, ...rows].join("\r\n") + "\r\n";
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response("\uFEFF" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvField(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}