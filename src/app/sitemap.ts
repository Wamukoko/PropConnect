import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qabila.co.ke";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/listings`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const { data: listings } = await supabase
      .from("properties" as any)
      .select("id, title, updated_at, created_at, listing_type, property_type, bedrooms, price, currency, public_location_text")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5000);

    for (const listing of listings || []) {
      const slug = generateListingSlug(listing);
      staticPages.push({
        url: `${baseUrl}/listings/${slug}`,
        lastModified: new Date(listing.updated_at || listing.created_at),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // If DB query fails, return just static pages
  }

  return staticPages;
}

function generateListingSlug(listing: any): string {
  const typeLabel = listing.listing_type === "rent" ? "for-rent" : "for-sale";
  const location = (listing.public_location_text || "nairobi")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const titleSlug = (listing.title || "property")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return `${titleSlug}-${typeLabel}-${location.slice(0, 30)}`;
}
