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

  const { data: viewings, error } = await supabase
    .from("viewings")
    .select("*, properties(title, public_location_text), leads(name, whatsapp_name, phone)")
    .eq("account_id", agent.account_id)
    .order("start_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header =
    "property,location,lead,phone,status,start_at,end_at,notes,agent_id";
  const rows = (viewings || []).map((v: any) =>
    [
      csvField(v.properties?.title),
      csvField(v.properties?.public_location_text),
      csvField(v.leads?.name || v.leads?.whatsapp_name),
      csvField(v.leads?.phone),
      csvField(v.status),
      csvField(v.start_at),
      csvField(v.end_at),
      csvField(v.notes),
      csvField(v.agent_id),
    ].join(",")
  );
  const body = [header, ...rows].join("\r\n") + "\r\n";
  const filename = `viewings-${new Date().toISOString().slice(0, 10)}.csv`;

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