import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";
import { PublicListingCard } from "@/components/public/listing-card";
import { PublicListingsFilter } from "@/components/public/listings-filter";
import { listPublicProperties } from "@/lib/public/listings";
import { resolvePublicBranding } from "@/lib/public/branding";

export const metadata: Metadata = {
  title: "Property Listings",
  description: "Browse available properties for sale and rent.",
};

export const revalidate = 3600;

export default async function PublicListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const branding = await resolvePublicBranding();

  const listings = await listPublicProperties({
    property_type: params.property_type,
    listing_type: params.listing_type,
    search: params.search,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader branding={branding} />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-primary)" }}>
          Property Listings
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {listings.length} available propert{listings.length === 1 ? "y" : "ies"}
        </p>

        <PublicListingsFilter
          initial={{
            property_type: params.property_type,
            listing_type: params.listing_type,
            search: params.search,
          }}
        />

        {listings.length === 0 ? (
          <p className="text-gray-500 text-center py-16">
            No properties match your criteria.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <PublicListingCard
                key={listing.id}
                listing={listing}
                whatsappNumber={branding.whatsappNumber}
              />
            ))}
          </div>
        )}
      </main>
      <PublicFooter branding={branding} />
    </div>
  );
}
