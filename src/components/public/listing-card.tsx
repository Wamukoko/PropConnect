"use client";

import Link from "next/link";
import type { PublicListing } from "@/lib/public/listings";

export function PublicListingCard({
  listing,
  whatsappNumber,
}: {
  listing: PublicListing;
  whatsappNumber?: string | null;
}) {
  const photo = listing.photos[0]?.url || "";
  const enquiryUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Hi, I'm interested in "${listing.title}". Is it still available?`
      )}`
    : null;

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <Link href={`/listings/${listing.slug}`} className="block">
        <div className="h-48 bg-gray-100 relative">
          {photo ? (
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${photo})` }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No photo
            </div>
          )}
        </div>

        <div className="p-4">
          <p className="text-xs text-gray-500 mb-1">
            {listing.property_type_label} · {listing.listing_type}
          </p>
          <h3 className="font-semibold text-sm mb-2 truncate" style={{ color: "var(--color-primary)" }}>
            {listing.title}
          </h3>
          <p className="font-bold text-sm mb-2" style={{ color: "var(--color-secondary)" }}>
            {listing.currency} {listing.price.toLocaleString()}
          </p>
          <div className="flex gap-3 text-xs text-gray-500">
            {listing.bedrooms !== null && <span>{listing.bedrooms} bed</span>}
            {listing.bathrooms !== null && <span>{listing.bathrooms} bath</span>}
          </div>
          {listing.public_location_text && (
            <p className="text-xs text-gray-400 mt-1">{listing.public_location_text}</p>
          )}
        </div>
      </Link>

      {enquiryUrl && (
        <div className="px-4 pb-4 mt-auto">
          <a
            href={enquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm font-medium py-2 rounded-md text-white"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            Enquire on WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
