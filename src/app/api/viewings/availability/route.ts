import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAvailability } from "@/lib/viewings/availability";

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);

  const propertyId = url.searchParams.get("property_id");
  const date = url.searchParams.get("date");
  const duration = parseInt(url.searchParams.get("duration_minutes") || "30");

  if (!propertyId || !date) {
    return NextResponse.json(
      { error: "property_id and date are required" },
      { status: 400 }
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("account_id")
    .eq("id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const availability = await getAvailability(
    agent.account_id,
    propertyId,
    date,
    duration
  );

  return NextResponse.json(availability);
}
