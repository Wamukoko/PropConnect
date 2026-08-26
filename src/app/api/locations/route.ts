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

  const { searchParams } = new URL(request.url);
  const parent_id = searchParams.get("parent_id");
  const location_type = searchParams.get("location_type");

  let query = supabase
    .from("locations" as any)
    .select("*")
    .order("name");

  if (parent_id) {
    query = query.eq("parent_id", parent_id);
  }
  if (location_type) {
    query = query.eq("location_type", location_type);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
