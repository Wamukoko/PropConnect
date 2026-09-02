import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents" as any)
    .select("account_id")
    .eq("id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "vcf" ? "vcf" : "csv";

  const { data, error } = await supabase
    .from("contacts" as any)
    .select("*")
    .eq("account_id", agent.account_id)
    .is("archived_at", null)
    .order("last_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const contacts = data || [];

  const body = format === "vcf" ? toVcf(contacts) : toCsv(contacts);
  const contentType =
    format === "vcf"
      ? "text/vcard; charset=utf-8"
      : "text/csv; charset=utf-8";
  const extension = format === "vcf" ? "vcf" : "csv";
  const filename = `contacts-${new Date().toISOString().slice(0, 10)}.${extension}`;

  return new Response("\uFEFF" + body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function toCsv(contacts: any[]): string {
  const header = "first_name,last_name,display_name,phone,email,company,job_title,contact_type,notes";
  const rows = contacts.map((c) =>
    [
      csvField(c.first_name),
      csvField(c.last_name),
      csvField(c.display_name),
      csvField(c.phone),
      csvField(c.email),
      csvField(c.company),
      csvField(c.job_title),
      csvField(c.contact_type),
      csvField(c.notes),
    ].join(",")
  );
  return [header, ...rows].join("\r\n") + "\r\n";
}

function csvField(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toVcf(contacts: any[]): string {
  return (
    contacts
      .map((c) => {
        const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
        const fullName = c.display_name || [c.first_name, c.last_name].filter(Boolean).join(" ");
        if (fullName) {
          lines.push(`FN:${fullName}`);
          lines.push(`N:${c.last_name || ""};${c.first_name || ""};;;`);
        } else if (c.email) {
          lines.push(`FN:${c.email}`);
        }
        if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone}`);
        if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
        if (c.company) lines.push(`ORG:${c.company}`);
        if (c.job_title) lines.push(`TITLE:${c.job_title}`);
        if (c.notes) lines.push(`NOTE:${c.notes}`);
        lines.push("END:VCARD");
        return lines.join("\r\n");
      })
      .join("\r\n") + "\r\n"
  );
}
