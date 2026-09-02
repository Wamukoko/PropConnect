import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDocumentSignedUrl, deleteDocument } from "@/lib/documents";

export async function GET(
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
  const result = await getDocumentSignedUrl(id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if ((result as any).expired) {
    return NextResponse.json({ error: "Document has expired" }, { status: 410 });
  }
  return NextResponse.json({ url: (result as any).url });
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
  const { error } = await deleteDocument(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
