import { NextResponse } from "next/server";
import { exchangeCodeForTokens, importGoogleContacts } from "@/lib/contacts/google";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect("/contacts?google=error");
  }

  let stateData: { accountId: string; agentId: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.redirect("/contacts?google=error");
  }
  if (!stateData.accountId || !stateData.agentId) {
    return NextResponse.redirect("/contacts?google=error");
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens?.accessToken) {
    return NextResponse.redirect("/contacts?google=error");
  }

  const result = await importGoogleContacts({
    accountId: stateData.accountId,
    accessToken: tokens.accessToken,
  });

  const params = new URLSearchParams({
    google: "success",
    imported: String(result.imported),
    skipped: String(result.skipped),
  });
  return NextResponse.redirect(`/contacts?${params}`);
}
