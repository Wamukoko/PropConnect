import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const signature = request.headers.get("x-hub-signature-256");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // TODO: Verify HMAC-SHA256 signature using WHATSAPP_APP_SECRET
    // TODO: Parse JSON, durably ingest event, traverse all entries/changes/messages/statuses
    // TODO: Return HTTP 200 immediately; queue slow work

    return NextResponse.json({ status: "received" });
  } catch {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
