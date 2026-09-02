import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface ParsedContact {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
}

const STATUS_OK = { status: 200 as const };

export async function POST(request: Request) {
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

  const body = await request.json();
  const text: string = typeof body.content === "string" ? body.content : "";
  const format: string = body.format === "csv" || body.format === "vcf" ? body.format : "csv";

  const parsed = format === "vcf" ? parseVcf(text) : parseCsv(text);

  if (parsed.length === 0) {
    return NextResponse.json({ error: "No valid contacts found" }, { status: 400 });
  }

  if (process.env.FEATURE_MOCK_AUTH === "true") {
    const created = parsed.map((p) => ({
      id: `mock-c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      account_id: agent.account_id,
      ...p,
    }));
    return NextResponse.json({ imported: created.length, contacts: created }, STATUS_OK);
  }

  const rows = parsed.map((p) => ({
    account_id: agent.account_id,
    ...p,
    normalized_phone: (p.phone || "").replace(/[^+\d]/g, "") || null,
    source: "import",
  }));

  const { data, error } = await supabase.from("contacts" as any).insert(rows).select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: data?.length ?? 0, contacts: data }, STATUS_OK);
}

function parseCsv(text: string): ParsedContact[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = header.findIndex((h) => /name/i.test(h));
  const firstIdx = header.findIndex((h) => /first/i.test(h));
  const lastIdx = header.findIndex((h) => /last/i.test(h) || /surname/i.test(h));
  const phoneIdx = header.findIndex((h) => /phone|mobile|tel/i.test(h));
  const emailIdx = header.findIndex((h) => /email/i.test(h));
  const companyIdx = header.findIndex((h) => /company|org/i.test(h));
  const titleIdx = header.findIndex((h) => /title|role|job/i.test(h));

  const results: ParsedContact[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const pick = (idx: number) => (idx >= 0 ? cols[idx] || null : null);
    const first = pick(firstIdx);
    const last = pick(lastIdx);
    const full = pick(nameIdx);
    let firstName = first;
    let lastName = last;
    if (!firstName && full) {
      const parts = full.split(" ");
      firstName = parts[0] || null;
      lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
    }
    if (!firstName && !lastName && !full) continue;
    results.push({
      first_name: firstName,
      last_name: lastName,
      display_name: full || (firstName && lastName ? `${firstName} ${lastName}` : firstName),
      phone: pick(phoneIdx),
      email: pick(emailIdx),
      company: pick(companyIdx),
      job_title: pick(titleIdx),
    });
  }
  return results;
}

function parseVcf(text: string): ParsedContact[] {
  const cards = text.split(/END:VCARD/i);
  const results: ParsedContact[] = [];

  for (const card of cards) {
    if (!/BEGIN:VCARD/i.test(card)) continue;
    let full: string | null = null;
    let phone: string | null = null;
    let email: string | null = null;
    let company: string | null = null;
    let title: string | null = null;

    for (const line of card.split(/\r?\n/)) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const key = line.slice(0, idx).toUpperCase();
      const value = line.slice(idx + 1).trim();
      if (key.startsWith("FN")) full = value;
      else if (key.startsWith("TEL")) phone = phone || value;
      else if (key.startsWith("EMAIL")) email = value;
      else if (key.startsWith("ORG")) company = value;
      else if (key.startsWith("TITLE")) title = value;
    }

    let firstName: string | null = null;
    let lastName: string | null = null;
    if (full) {
      const parts = full.split(" ");
      firstName = parts[0] || null;
      lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
    }
    if (!firstName && !lastName && !phone && !email) continue;

    results.push({
      first_name: firstName,
      last_name: lastName,
      display_name: full,
      phone,
      email,
      company,
      job_title: title,
    });
  }
  return results;
}
