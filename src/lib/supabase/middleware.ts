import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const isMockAuth = process.env.FEATURE_MOCK_AUTH === "true";

  if (isMockAuth) {
    const mockAuth = request.cookies.get("mock_auth")?.value === "true";
    const isAuthPage = request.nextUrl.pathname.startsWith("/login");
    const isApiWebhook = request.nextUrl.pathname.startsWith("/api/webhook");
    const isPublicPage = request.nextUrl.pathname.startsWith("/listings") ||
      request.nextUrl.pathname.startsWith("/enquiry");

    if (!mockAuth && !isAuthPage && !isApiWebhook && !isPublicPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (mockAuth && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isApiWebhook = request.nextUrl.pathname.startsWith("/api/webhook");
  const isPublicPage = request.nextUrl.pathname.startsWith("/listings") ||
    request.nextUrl.pathname.startsWith("/enquiry");

  if (!user && !isAuthPage && !isApiWebhook && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
