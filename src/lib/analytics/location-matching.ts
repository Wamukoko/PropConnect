import { createAdminClient } from "@/lib/supabase/admin";

interface LocationRow {
  id: string;
  name: string;
  slug: string;
  location_type: string;
  parent_id: string | null;
}

/**
 * Loads the location hierarchy for an account and builds a map of
 * normalized names (including parent chain) per location.
 */
export async function resolveLocationAliases(
  accountId: string
): Promise<{ locationId: string; aliases: string[] }[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("locations" as any)
    .select("id, name, slug, location_type, parent_id")
    .eq("account_id", accountId);

  const rows = (data as LocationRow[]) || [];
  const byId = new Map<string, LocationRow>();
  rows.forEach((r) => byId.set(r.id, r));

  function parentChain(id: string | null): string[] {
    const names: string[] = [];
    let current = id;
    let guard = 0;
    while (current && guard++ < 8) {
      const row = byId.get(current);
      if (!row) break;
      names.push(row.name);
      current = row.parent_id;
    }
    return names.reverse();
  }

  return rows.map((r) => ({
    locationId: r.id,
    aliases: [
      r.name,
      r.slug,
      ...parentChain(r.parent_id),
      parentChain(r.id).join(" "),
      parentChain(r.id).join(", "),
    ].filter(Boolean),
  }));
}

/**
 * Given a preferred area string, returns true if any location alias
 * chain matches it (used for advanced area matching beyond exact text).
 */
export function areaAliasMatches(
  aliases: string[],
  preferredArea: string
): boolean {
  const needle = preferredArea.toLowerCase().trim();
  if (!needle) return false;
  return aliases.some((alias) =>
    alias.toLowerCase().includes(needle) || needle.includes(alias.toLowerCase())
  );
}

/**
 * Loads the set of location IDs whose alias chain matches the preferred area.
 */
export async function findMatchingLocationIds(
  accountId: string,
  preferredArea: string
): Promise<string[]> {
  const resolved = await resolveLocationAliases(accountId);
  return resolved
    .filter((entry) => areaAliasMatches(entry.aliases, preferredArea))
    .map((entry) => entry.locationId);
}
