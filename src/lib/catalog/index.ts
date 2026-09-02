import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-flags";

const META_GRAPH = `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION || "v18.0"}`;

/**
 * Pushes a product (property) to the WhatsApp catalog.
 * No-op unless CATALOG_SYNC is enabled and credentials are present.
 */
export async function syncProductToCatalog(input: {
  accountId: string;
  whatsappAccountId: string;
  propertyId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isFeatureEnabled("CATALOG_SYNC")) {
    return { ok: false, error: "CATALOG_SYNC feature disabled" };
  }
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
    return { ok: false, error: "WhatsApp catalog credentials not configured" };
  }

  const supabase = createAdminClient();
  const { data: state } = await supabase
    .from("catalog_sync_state" as any)
    .select("*")
    .eq("account_id", input.accountId)
    .eq("whatsapp_account_id", input.whatsappAccountId)
    .single();

  const catalogId = state?.catalog_id;
  if (!catalogId) {
    return { ok: false, error: "No catalog linked for account" };
  }

  const body: Record<string, unknown> = {
    retailer_id: input.propertyId,
    name: input.title,
    description: input.description,
    price: input.price,
    currency: input.currency,
  };
  if (input.imageUrl) body.image_url = input.imageUrl;

  try {
    const res = await fetch(
      `${META_GRAPH}/${catalogId}/products`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      return { ok: false, error: `Catalog sync failed: ${res.status}` };
    }

    await supabase
      .from("catalog_sync_state" as any)
      .upsert({
        account_id: input.accountId,
        whatsapp_account_id: input.whatsappAccountId,
        status: "synced",
        last_synced_at: new Date().toISOString(),
      });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
