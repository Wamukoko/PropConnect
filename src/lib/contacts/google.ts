import { createAdminClient } from "@/lib/supabase/admin";

export interface GoogleState {
  accountId: string;
  agentId: string;
  nonce: string;
}

const GCLOUD_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GCLOUD_TOKEN = "https://oauth2.googleapis.com/token";
const PEOPLE_API = "https://people.googleapis.com/v1";

export function isGoogleContactsEnabled(): boolean {
  return (
    process.env.FEATURE_CONTACT_GOOGLE_SYNC === "true" &&
    Boolean(process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET)
  );
}

/**
 * Builds the Google OAuth authorization URL scoped to the People API.
 * Returns null when the feature is disabled.
 */
export function buildAuthUrl(input: {
  accountId: string;
  agentId: string;
}): { url: string } | null {
  if (!isGoogleContactsEnabled()) return null;

  const nonce = crypto.randomUUID();
  const state = Buffer.from(
    JSON.stringify({
      accountId: input.accountId,
      agentId: input.agentId,
      nonce,
    } satisfies GoogleState)
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/contacts",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return { url: `${GCLOUD_AUTH}?${params.toString()}` };
}

/**
 * Exchanges an OAuth authorization code for tokens.
 * Returns null when disabled.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<{ accessToken: string; refreshToken?: string } | null> {
  if (!isGoogleContactsEnabled()) return null;

  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    grant_type: "authorization_code",
  });

  const res = await fetch(GCLOUD_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

interface GooglePerson {
  resourceName: string;
  names?: { displayName?: string; givenName?: string; familyName?: string }[];
  phoneNumbers?: { value?: string }[];
  emailAddresses?: { value?: string }[];
  organizations?: { name?: string; title?: string }[];
}

/**
 * Fetches all contacts from the Google People API for the connected user.
 */
export async function listGoogleContacts(
  accessToken: string
): Promise<GooglePerson[]> {
  let pageToken: string | undefined;
  const contacts: GooglePerson[] = [];
  do {
    const params = new URLSearchParams({
      personFields: "names,phoneNumbers,emailAddresses,organizations",
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${PEOPLE_API}/people/me/connections?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    contacts.push(...(data.connections || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return contacts;
}

/**
 * One-time import of Google contacts into the contact directory.
 * Skips duplicates via normalized phone/email within the account.
 */
export async function importGoogleContacts(input: {
  accountId: string;
  accessToken: string;
}): Promise<{ imported: number; skipped: number }> {
  const supabase = createAdminClient();
  const persons = await listGoogleContacts(input.accessToken);

  const { data: existing } = await supabase
    .from("contacts" as any)
    .select("id, normalized_phone, email")
    .eq("account_id", input.accountId);

  const takenPhones = new Set((existing || []).map((c: any) => c.normalized_phone).filter(Boolean));
  const takenEmails = new Set((existing || []).map((c: any) => c.email).filter(Boolean));

  let imported = 0;
  let skipped = 0;

  for (const person of persons) {
    const first = person.names?.[0]?.givenName || "";
    const last = person.names?.[0]?.familyName || "";
    const display = person.names?.[0]?.displayName || `${first} ${last}`.trim();
    const phone = person.phoneNumbers?.find((p) => p.value)?.value || null;
    const email = person.emailAddresses?.find((e) => e.value)?.value || null;
    const company = person.organizations?.[0]?.name || null;
    const jobTitle = person.organizations?.[0]?.title || null;

    if (!phone && !email) {
      skipped++;
      continue;
    }

    const normalizedPhone = phone ? phone.replace(/[^0-9]/g, "") : null;
    if (normalizedPhone && takenPhones.has(normalizedPhone)) {
      skipped++;
      continue;
    }
    if (email && takenEmails.has(email)) {
      skipped++;
      continue;
    }

    const { data: inserted } = await supabase
      .from("contacts" as any)
      .insert({
        account_id: input.accountId,
        first_name: first || null,
        last_name: last || null,
        display_name: display || null,
        phone,
        normalized_phone: normalizedPhone,
        email,
        company,
        job_title: jobTitle,
        source: "google_contacts",
      })
      .select("id")
      .single();

    if (!inserted) {
      skipped++;
      continue;
    }

    await supabase.from("contact_external_ids" as any).upsert(
      {
        account_id: input.accountId,
        contact_id: inserted.id,
        provider: "google",
        external_id: person.resourceName,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "provider,external_id" }
    );

    if (normalizedPhone) takenPhones.add(normalizedPhone);
    if (email) takenEmails.add(email);
    imported++;
  }

  return { imported, skipped };
}
