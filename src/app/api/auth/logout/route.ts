import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const isMockAuth = process.env.FEATURE_MOCK_AUTH === "true";

  if (isMockAuth) {
    const cookieStore = await cookies();
    cookieStore.delete("mock_auth");
    return NextResponse.json({ ok: true });
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
