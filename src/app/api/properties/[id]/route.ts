import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { generateListingSlug } from "@/lib/public/slug";
import { updatePropertySchema } from "@/lib/validators/property";
import { enrichPhotosWithSignedUrls } from "@/lib/properties";

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
    .single();

  if (error || !property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cleaned = {
    ...property,
    property_photos: (property.property_photos || []).filter(
      (photo: any) => photo.deleted_at == null
    ),
  };

  const [enriched] = await enrichPhotosWithSignedUrls([cleaned], supabase);

  return NextResponse.json(enriched);
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

  revalidatePublicListingCache(property);

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

  revalidatePath("/listings");

  return NextResponse.json({ success: true });
}

function revalidatePublicListingCache(property: { title?: string; id?: string }) {
  if (process.env.FEATURE_PUBLIC_LISTINGS === "false") return;
  revalidatePath("/listings");
  if (property?.title) {
    revalidatePath(`/listings/${generateListingSlug(property.title)}`);
  }
}
