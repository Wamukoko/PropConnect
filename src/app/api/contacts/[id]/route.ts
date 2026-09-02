import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const fields = [
    "first_name",
    "last_name",
    "display_name",
    "phone",
    "email",
    "company",
    "job_title",
    "notes",
    "contact_type",
  ] as const;
  for (const key of fields) {
    if (typeof body[key] === "string") patch[key] = body[key];
  }
  if (typeof body.phone === "string") {
    patch.normalized_phone = body.phone.replace(/[^+\d]/g, "").trim() || null;
  }
  if (body.archived !== undefined) {
    patch.archived_at = body.archived ? new Date().toISOString() : null;
  }

  if (process.env.FEATURE_MOCK_AUTH === "true") {
    return NextResponse.json({ contact: { id, ...patch } });
  }

  const { data, error } = await supabase
    .from("contacts" as any)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contact: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.FEATURE_MOCK_AUTH === "true") {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("contacts" as any)
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
