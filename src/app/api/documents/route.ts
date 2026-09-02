import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { uploadDocument, listDocuments } from "@/lib/documents";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: agent } = await supabase
    .from("agents" as any)
    .select("account_id")
    .eq("id", user.id)
    .single();
  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const { data, error } = await listDocuments({
    accountId: agent.account_id,
    leadId: searchParams.get("lead_id") || undefined,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ documents: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: agent } = await supabase
    .from("agents" as any)
    .select("account_id")
    .eq("id", user.id)
    .single();
  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const leadId = (formData.get("lead_id") as string | null) || null;
  const docType = (formData.get("doc_type") as string) || "general";

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await uploadDocument({
    accountId: agent.account_id,
    agentId: user.id,
    leadId,
    docType,
    file: buffer,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ id: result.id }, { status: 201 });
}
