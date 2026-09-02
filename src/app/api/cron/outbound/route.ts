import { NextResponse } from "next/server";
import { processOutboundQueue } from "@/lib/whatsapp/outbound";
import { expireStaleSessions } from "@/lib/conversations/state-machine";

const CRON_SECRET = process.env.CRON_SECRET || "";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (CRON_SECRET && request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sent = await processOutboundQueue(20);
  const expired = await expireStaleSessions(30);

  return NextResponse.json({ ok: true, sent, expired });
}

export { GET as POST };