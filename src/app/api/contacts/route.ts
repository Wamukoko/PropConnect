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
  const search = url.searchParams.get("search") || "";
  const type = url.searchParams.get("type") || "";
  const archived = url.searchParams.get("archived") === "true";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));

  let query: any = supabase
    .from("contacts" as any)
    .select("*", { count: "exact" })
    .eq("account_id", agent.account_id);

  if (archived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (type) {
    query = query.eq("contact_type", type);
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,display_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
    );
  }

  const offset = (page - 1) * limit;
  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contacts: data || [],
    total: count ?? 0,
    page,
    limit,
    totalPages: count ? Math.ceil(count / limit) : 0,
  });
}

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

  const row: Record<string, unknown> = {
    account_id: agent.account_id,
    first_name: body.first_name || null,
    last_name: body.last_name || null,
    display_name: body.display_name || null,
    phone: body.phone || null,
    normalized_phone: (body.phone || "").replace(/[^+\d]/g, "") || null,
    email: body.email || null,
    company: body.company || null,
    job_title: body.job_title || null,
    notes: body.notes || null,
    contact_type: body.contact_type || "other",
    source: body.source || "manual",
  };

  if (process.env.FEATURE_MOCK_AUTH === "true") {
    return NextResponse.json(
      { contact: { id: `mock-c-${Date.now()}`, ...row } },
      { status: 201 }
    );
  }

  const { data, error } = await supabase
    .from("contacts" as any)
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contact: data }, { status: 201 });
}
