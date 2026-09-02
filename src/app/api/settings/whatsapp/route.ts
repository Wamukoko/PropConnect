import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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

  const { data } = await supabase
    .from("whatsapp_accounts" as any)
    .select("*")
    .eq("account_id", agent.account_id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ whatsapp_accounts: data || [] });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data: agent } = await supabase
    .from("agents" as any)
    .select("account_id")
    .eq("id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.display_phone === "string") patch.display_phone = body.display_phone;
  if (typeof body.verified_name === "string") patch.verified_name = body.verified_name;
  if (typeof body.business_account_id === "string")
    patch.business_account_id = body.business_account_id;
  if (typeof body.status === "string") patch.status = body.status;
  patch.updated_at = new Date().toISOString();

  if (process.env.FEATURE_MOCK_AUTH === "true") {
    return NextResponse.json({
      whatsapp_account: { id: "mock-wa-1", account_id: agent.account_id, ...patch },
    });
  }

  const id = body.id;
  const { data } = await supabase
    .from("whatsapp_accounts" as any)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json({ whatsapp_account: data || null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data: agent } = await supabase
    .from("agents" as any)
    .select("account_id")
    .eq("id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const row = {
    account_id: agent.account_id,
    display_phone: body.display_phone || "",
    verified_name: body.verified_name || "",
    phone_number_id: body.phone_number_id || "pending",
    status: body.status || "pending",
  };

  if (process.env.FEATURE_MOCK_AUTH === "true") {
    return NextResponse.json(
      { whatsapp_account: { id: "mock-wa-new", ...row } },
      { status: 201 }
    );
  }

  const { data } = await supabase
    .from("whatsapp_accounts" as any)
    .insert(row)
    .select()
    .single();

  return NextResponse.json({ whatsapp_account: data }, { status: 201 });
}
