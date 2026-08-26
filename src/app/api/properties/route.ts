import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { propertyFilterSchema } from "@/lib/validators/property";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());

  const parsed = propertyFilterSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { page, limit, ...filters } = parsed.data;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("properties" as any)
    .select(
      `
      *,
      property_photos!inner (
        id, storage_path, thumbnail_path, alt_text, sort_order
      ),
      locations!inner (
        id, name, slug, location_type
      )
      `,
      { count: "exact" }
    )
    .is("property_photos.deleted_at", null);

  if (filters.property_type) {
    query = query.eq("property_type", filters.property_type);
  }
  if (filters.listing_type) {
    query = query.eq("listing_type", filters.listing_type);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.price_min !== undefined) {
    query = query.gte("price", filters.price_min);
  }
  if (filters.price_max !== undefined) {
    query = query.lte("price", filters.price_max);
  }
  if (filters.bedrooms_min !== undefined) {
    query = query.gte("bedrooms", filters.bedrooms_min);
  }
  if (filters.bedrooms_max !== undefined) {
    query = query.lte("bedrooms", filters.bedrooms_max);
  }
  if (filters.location_id) {
    query = query.eq("location_id", filters.location_id);
  }
  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    properties: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
    },
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

  const body = await request.json();

  const { data: agent } = await supabase
    .from("agents" as any)
    .select("account_id")
    .eq("id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const { data: property, error } = await supabase
    .from("properties" as any)
    .insert({
      ...body,
      account_id: agent.account_id,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(property, { status: 201 });
}
