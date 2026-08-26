import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const isMockAuth = process.env.FEATURE_MOCK_AUTH === "true";

  if (isMockAuth) {
    // Mock auth: any email/password works
    const cookieStore = await cookies();
    cookieStore.set("mock_auth", "true", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        email,
        name: "Admin User",
      },
    });
  }

  // Real Supabase auth
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}
