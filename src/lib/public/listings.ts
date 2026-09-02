import { createAdminClient } from "@/lib/supabase/admin";
import { generateListingSlug } from "@/lib/public/slug";

export const PUBLIC_PROPERTY_TYPES: Record<string, string> = {
  apartment: "Apartment",
  house: "House",
  townhouse: "Townhouse",
  villa: "Villa",
  maisonette: "Maisonette",
  land: "Land",
  office: "Office",
  shop: "Shop",
  warehouse: "Warehouse",
  commercial: "Commercial",
  serviced_apartment: "Serviced Apartment",
};

const VISIBLE_STATUSES = ["published", "available"];

interface PhotoRow {
  storage_path: string;
  thumbnail_path: string | null;
  alt_text: string | null;
  sort_order: number;
}

interface PropertyRow {
  id: string;
  account_id: string;
  title: string;
  description: string | null;
  property_type: string;
  listing_type: string;
  status: string;
  archived_at: string | null;
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area: number | null;
  land_area: number | null;
  furnished: boolean | null;
  amenities: unknown;
  public_location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  published_at: string | null;
  property_photos?: PhotoRow[];
}

export interface PublicListing {
  id: string;
  account_id: string;
  title: string;
  slug: string;
  description: string | null;
  property_type: string;
  property_type_label: string;
  listing_type: "sale" | "rent" | "lease";
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area: number | null;
  land_area: number | null;
  furnished: boolean | null;
  amenities: string[];
  public_location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: { url: string; alt_text: string | null }[];
  thumbnails: { url: string | null }[];
}

function mapToPublicProperty(
  p: PropertyRow,
  urls: { url: string; alt_text: string | null }[],
  thumbs: { url: string | null }[]
): PublicListing {
  const raw = (p.amenities as string[]) || [];
  const amenities = Array.isArray(raw) ? raw : [];
  return {
    id: p.id,
    account_id: p.account_id,
    title: p.title,
    slug: generateListingSlug(p.title),
    description: p.description,
    property_type: p.property_type,
    property_type_label: PUBLIC_PROPERTY_TYPES[p.property_type] || p.property_type,
    listing_type: p.listing_type as "sale" | "rent" | "lease",
    price: p.price,
    currency: p.currency,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    floor_area: p.floor_area,
    land_area: p.land_area,
    furnished: p.furnished,
    amenities,
    public_location_text: p.public_location_text,
    latitude: p.latitude,
    longitude: p.longitude,
    photos: urls,
    thumbnails: thumbs,
  };
}

function sortPhotos(rows: PhotoRow[] | undefined): PhotoRow[] {
  return (rows || [])
    .filter((row) => row.storage_path)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function isVisible(p: PropertyRow): boolean {
  return VISIBLE_STATUSES.includes(p.status) && p.archived_at === null;
}

async function resolvePhotoUrls(
  supabase: ReturnType<typeof createAdminClient>,
  rows: PhotoRow[]
): Promise<{ urls: { url: string; alt_text: string | null }[]; thumbs: { url: string | null }[] }> {
  const bucket = "property-private-originals";
  const urls: { url: string; alt_text: string | null }[] = [];
  const thumbs: { url: string | null }[] = [];
  for (const row of rows) {
    const { data: signed } = await supabase.storage
      .from(bucket)
      .createSignedUrl(row.storage_path, 3600);
    const { data: thumbSigned } = row.thumbnail_path
      ? await supabase.storage.from(bucket).createSignedUrl(row.thumbnail_path, 3600)
      : { data: signed };
    urls.push({ url: signed?.signedUrl || "", alt_text: row.alt_text });
    thumbs.push({ url: thumbSigned?.signedUrl || null });
  }
  return { urls, thumbs };
}

export interface PublicListQuery {
  property_type?: string;
  listing_type?: string;
  price_min?: number;
  price_max?: number;
  search?: string;
  limit?: number;
}

export async function listPublicProperties(
  query: PublicListQuery = {}
): Promise<PublicListing[]> {
  if (process.env.FEATURE_PUBLIC_LISTINGS === "false") return [];
  const supabase = createAdminClient();
  const limit = query.limit ?? 200;

  let builder: any = supabase
    .from("properties" as any)
    .select(`
      *,
      property_photos (
        storage_path, thumbnail_path, alt_text, sort_order
      )
    `)
    .in("status", VISIBLE_STATUSES)
    .is("archived_at", null);

  if (query.property_type) builder = builder.eq("property_type", query.property_type);
  if (query.listing_type) builder = builder.eq("listing_type", query.listing_type);
  if (query.price_min !== undefined) builder = builder.gte("price", query.price_min);
  if (query.price_max !== undefined) builder = builder.lte("price", query.price_max);
  if (query.search) builder = builder.ilike("title", `%${query.search}%`);

  const { data, error } = await builder
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];

  const rows = data as PropertyRow[];
  const out: PublicListing[] = [];
  for (const raw of rows) {
    if (!isVisible(raw)) continue;
    const sorted = sortPhotos(raw.property_photos);
    const { urls, thumbs } = await resolvePhotoUrls(supabase, sorted);
    out.push(mapToPublicProperty(raw, urls, thumbs));
  }
  return out;
}

export async function getPublicListingBySlug(
  slug: string
): Promise<PublicListing | null> {
  if (process.env.FEATURE_PUBLIC_LISTINGS === "false") return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("properties" as any)
    .select(`
      *,
      property_photos (
        storage_path, thumbnail_path, alt_text, sort_order
      )
    `)
    .in("status", VISIBLE_STATUSES)
    .is("archived_at", null);

  if (error || !data) return null;

  const rows = data as PropertyRow[];
  let match: PropertyRow | null = null;
  for (const raw of rows) {
    if (generateListingSlug(raw.title) === slug && isVisible(raw)) {
      match = raw;
      break;
    }
  }
  if (!match) return null;

  const sorted = sortPhotos(match.property_photos);
  const { urls, thumbs } = await resolvePhotoUrls(supabase, sorted);
  return mapToPublicProperty(match, urls, thumbs);
}

export async function getAllPublicListingSlugs(): Promise<string[]> {
  if (process.env.FEATURE_PUBLIC_LISTINGS === "false") return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("properties" as any)
    .select("title, status, archived_at");

  if (!data) return [];
  return (data as { title: string; status: string; archived_at: string | null }[])
    .filter((p) => VISIBLE_STATUSES.includes(p.status) && p.archived_at === null)
    .map((p) => generateListingSlug(p.title));
}
