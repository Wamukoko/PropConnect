import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

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
  const propertyId = formData.get("property_id") as string;
  const file = formData.get("file") as File;
  const altText = formData.get("alt_text") as string | null;
  const sortOrder = parseInt(formData.get("sort_order") as string || "0");

  if (!propertyId || !file) {
    return NextResponse.json(
      { error: "property_id and file are required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum: ${MAX_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${agent.account_id}/${propertyId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("property-private-originals")
    .upload(fileName, file, {
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: photo, error: insertError } = await supabase
    .from("property_photos" as any)
    .insert({
      account_id: agent.account_id,
      property_id: propertyId,
      storage_path: fileName,
      alt_text: altText,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: signedUrl } = await supabase.storage
    .from("property-private-originals")
    .createSignedUrl(fileName, 3600);

  return NextResponse.json(
    { photo, signedUrl: signedUrl?.signedUrl },
    { status: 201 }
  );
}
