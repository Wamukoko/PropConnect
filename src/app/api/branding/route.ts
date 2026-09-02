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

  const { data: branding } = await supabase
    .from("account_branding" as any)
    .select("*")
    .eq("account_id", agent.account_id)
    .single();

  return NextResponse.json(branding || {});
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

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const textFields = [
    "firm_name",
    "display_name",
    "logo_storage_path",
    "favicon_storage_path",
    "primary_color",
    "secondary_color",
    "accent_color",
    "phone",
    "email",
    "website",
    "custom_domain",
    "public_contact_name",
    "public_contact_email",
    "public_contact_phone",
  ] as const;
  for (const key of textFields) {
    if (typeof body[key] === "string") patch[key] = body[key];
  }
  if (typeof body.show_powered_by === "boolean") patch.show_powered_by = body.show_powered_by;

  if (process.env.FEATURE_MOCK_AUTH === "true") {
    return NextResponse.json({ branding: { account_id: agent.account_id, ...patch } });
  }

  const { data } = await supabase
    .from("account_branding" as any)
    .upsert({ ...patch, account_id: agent.account_id })
    .select()
    .single();

  return NextResponse.json({ branding: data || null });
}
