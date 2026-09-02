import { createAdminClient } from "@/lib/supabase/admin";
import { listPublicProperties } from "@/lib/public/listings";
import { enqueueMessage } from "@/lib/whatsapp/outbound";
import { hasConsent, isLeadOptedOut } from "@/lib/whatsapp/outbound";

type DbClient = any;

function defaultClient(): DbClient {
  return createAdminClient();
}

export interface SavedSearchFilters {
  property_type?: string;
  listing_type?: string;
  price_min?: number;
  price_max?: number;
  location?: string;
}

export async function createSavedSearch(
  input: {
    accountId: string;
    agentId: string;
    name: string;
    filters: SavedSearchFilters;
    alertEnabled?: boolean;
    alertFrequency?: string;
  },
  client: DbClient = defaultClient()
) {
  const supabase = client;
  const { data, error } = await supabase
    .from("saved_searches" as any)
    .insert({
      account_id: input.accountId,
      agent_id: input.agentId,
      name: input.name,
      filters: input.filters,
      alert_enabled: input.alertEnabled ?? false,
      alert_frequency: input.alertFrequency ?? "daily",
    })
    .select()
    .single();
  return { data, error };
}

export async function listSavedSearches(
  accountId: string,
  client: DbClient = defaultClient()
) {
  const supabase = client;
  const { data, error } = await supabase
    .from("saved_searches" as any)
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function updateSavedSearch(
  id: string,
  input: Partial<{
    name: string;
    filters: SavedSearchFilters;
    alert_enabled: boolean;
    alert_frequency: string;
  }>,
  client: DbClient = defaultClient()
) {
  const supabase = client;
  const { data, error } = await supabase
    .from("saved_searches" as any)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteSavedSearch(id: string, client: DbClient = defaultClient()) {
  const supabase = client;
  const { error } = await supabase.from("saved_searches" as any).delete().eq("id", id);
  return { error };
}

/**
 * Runs a saved search and returns the matching published properties.
 * Used both for on-demand lookups and alert generation.
 */
export async function runSavedSearch(search: {
  filters: SavedSearchFilters;
}) {
  return await listPublicProperties({
    property_type: search.filters.property_type,
    listing_type: search.filters.listing_type,
    price_min: search.filters.price_min,
    price_max: search.filters.price_max,
  });
}

/**
 * Generates an alert for a single lead that matches the saved search results.
 * Enqueues a durable outbound message honoring consent and opt-out.
 */
export async function generateLeadAlert(input: {
  accountId: string;
  leadId: string;
  whatsappAccountId: string;
  matches: { title: string; price: number; currency: string; slug: string }[];
}): Promise<{ alertJobId?: string; skipped?: boolean; reason?: string }> {
  if (input.matches.length === 0) {
    return { skipped: true, reason: "no-matches" };
  }

  if (await isLeadOptedOut(input.leadId)) {
    return { skipped: true, reason: "opted-out" };
  }

  if (!(await hasConsent(input.accountId, input.leadId, "saved_search_alerts"))) {
    return { skipped: true, reason: "no-consent" };
  }

  const text =
    `We found ${input.matches.length} propert${
      input.matches.length === 1 ? "y" : "ies"
    } that might interest you:\n` +
    input.matches
      .slice(0, 5)
      .map((m) => `• ${m.title} — ${m.currency} ${m.price.toLocaleString()}`)
      .join("\n");

  const { jobId } = await enqueueMessage({
    accountId: input.accountId,
    leadId: input.leadId,
    whatsappAccountId: input.whatsappAccountId,
    jobType: "text",
    payload: { text },
    purpose: "saved_search_alerts",
  });

  return { alertJobId: jobId };
}

/**
 * Runs all saved searches with alerts enabled and matches them against leads
 * that have expressed matching preferences. Honors consent at send time.
 */
export async function processSavedSearchAlerts(): Promise<number> {
  const supabase = createAdminClient();
  const { data: searches } = await supabase
    .from("saved_searches" as any)
    .select("*")
    .eq("alert_enabled", true);

  if (!searches?.length) return 0;

  let alertsSent = 0;
  for (const search of searches) {
    const matches = await runSavedSearch({ filters: search.filters });

    const { data: leads } = await supabase
      .from("leads" as any)
      .select("id, whatsapp_account_id, budget_min, budget_max, listing_type, property_type")
      .eq("account_id", search.account_id)
      .eq("opted_out", false);

    if (!leads) continue;

    for (const lead of leads) {
      const leadMatches = matches.filter((m: any) => {
        if (lead.listing_type && m.listing_type !== lead.listing_type) return false;
        if (lead.property_type && m.property_type !== lead.property_type) return false;
        if (lead.budget_max != null && m.price > lead.budget_max) return false;
        return true;
      });

      if (leadMatches.length === 0 || !lead.whatsapp_account_id) continue;

      await generateLeadAlert({
        accountId: search.account_id,
        leadId: lead.id,
        whatsappAccountId: lead.whatsapp_account_id,
        matches: leadMatches.map((m: any) => ({
          title: m.title,
          price: m.price,
          currency: m.currency,
          slug: m.slug,
        })),
      });
      alertsSent++;
    }

    await supabase
      .from("saved_searches" as any)
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", search.id);
  }

  return alertsSent;
}
