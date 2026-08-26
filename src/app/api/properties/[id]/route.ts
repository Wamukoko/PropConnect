import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { updatePropertySchema } from "@/lib/validators/property";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: property, error } = await supabase
    .from("properties" as any)
    .select(
      `
      *,
      property_photos (
        id, storage_path, thumbnail_path, alt_text, sort_order, deleted_at
      ),
      locations (
        id, name, slug, location_type, parent_id
      )
      `
    )
    .eq("id", id)
    .is("property_photos.deleted_at", null)
    .single();

  if (error || !property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(property);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const parsed = updatePropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updateData = {
    ...parsed.data,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data: property, error } = await supabase
    .from("properties" as any)
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(property);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("properties" as any)
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
