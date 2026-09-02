import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";
import { PublicListingDetail } from "@/components/public/listing-detail";
import { getPublicListingBySlug, listPublicProperties } from "@/lib/public/listings";
import { resolvePublicBranding } from "@/lib/public/branding";
import { buildListingStructuredData } from "@/lib/public/structured-data";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const listings = await listPublicProperties({ limit: 500 });
  return listings.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublicListingBySlug(slug);
  if (!listing) return {};

  const location = listing.public_location_text
    ? ` in ${listing.public_location_text}`
    : "";
  const title = `${listing.title} — ${listing.listing_type}${location}`;

  return {
    title,
    description: listing.description || title,
    alternates: { canonical: `/listings/${slug}` },
    openGraph: {
      title,
      description: listing.description || title,
      images: listing.photos[0]?.url ? [{ url: listing.photos[0].url }] : undefined,
    },
  };
}

export default async function PublicListingPage({ params }: Props) {
  const { slug } = await params;
  const branding = await resolvePublicBranding();
  const listing = await getPublicListingBySlug(slug);

  if (!listing) notFound();

  const structuredData = buildListingStructuredData({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    property_type: listing.property_type,
    listing_type: listing.listing_type,
    price: listing.price,
    currency: listing.currency,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    floor_area: listing.floor_area,
    land_area: listing.land_area,
    amenities: listing.amenities,
    public_location_text: listing.public_location_text,
    latitude: listing.latitude,
    longitude: listing.longitude,
    listing_url: `/listings/${slug}`,
    photos: listing.photos,
    brand: {
      firmName: branding.firmName,
      phone: branding.phone,
      contactName: branding.displayName,
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader branding={branding} />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <PublicListingDetail listing={listing} whatsappNumber={branding.whatsappNumber} />
      </main>
      <PublicFooter branding={branding} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </div>
  );
}
