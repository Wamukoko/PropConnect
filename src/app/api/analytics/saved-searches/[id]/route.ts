import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  updateSavedSearch,
  deleteSavedSearch,
} from "@/lib/analytics/saved-searches";

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

  const { data, error } = await updateSavedSearch(
    id,
    {
      name: body.name,
      filters: body.filters,
      alert_enabled: body.alert_enabled,
      alert_frequency: body.alert_frequency,
    },
    supabase
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const { error } = await deleteSavedSearch(id, supabase);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
