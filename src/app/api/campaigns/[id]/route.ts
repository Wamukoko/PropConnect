import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendBroadcastCampaign,
  cancelBroadcastCampaign,
} from "@/lib/broadcasts";

export async function POST(
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
  const body = await request.json().catch(() => ({}));

  if (body.action === "cancel") {
    await cancelBroadcastCampaign(id, supabase as any);
    return NextResponse.json({ success: true });
  }

  const result = await sendBroadcastCampaign(id, undefined, supabase as any);
  return NextResponse.json(result);
}

export async function DELETE(
  _request: Request,
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
  await cancelBroadcastCampaign(id, supabase as any);
  return NextResponse.json({ success: true });
}
