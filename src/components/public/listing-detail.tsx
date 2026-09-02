"use client";

import Link from "next/link";
import type { PublicListing } from "@/lib/public/listings";
import { IconMapPin } from "@/components/icons/sidebar-icons";

export function PublicListingDetail({
  listing,
  whatsappNumber,
}: {
  listing: PublicListing;
  whatsappNumber?: string | null;
}) {
  const mainPhoto = listing.photos[0]?.url || "";
  const gallery = listing.photos.slice(1);

  const contactWhatsapp = whatsappNumber;

  const enquiryUrl = contactWhatsapp
    ? `https://wa.me/${String(contactWhatsapp).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
        `Hi, I'm interested in "${listing.title}". Is it still available?`
      )}`
    : null;

  return (
    <div>
      <nav className="text-xs text-gray-500 mb-4">
        <Link href="/listings" className="hover:underline">Listings</Link>
        <span className="mx-1">/</span>
        <span>{listing.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {mainPhoto ? (
            <div className="rounded-lg overflow-hidden h-72 lg:h-96 bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mainPhoto}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden h-72 lg:h-96 bg-gray-100 flex items-center justify-center text-gray-400">
              No photo
            </div>
          )}

          {gallery.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {gallery.map((photo, idx) => (
                <div key={idx} className="rounded-md overflow-hidden h-24 bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={listing.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-lg p-5">
            <p className="text-xs text-gray-500 mb-1">
              {listing.property_type_label} · {listing.listing_type}
            </p>
            <h1 className="text-xl font-bold mb-2" style={{ color: "var(--color-primary)" }}>
              {listing.title}
            </h1>
            <p className="text-2xl font-bold mb-3" style={{ color: "var(--color-secondary)" }}>
              {listing.currency} {listing.price.toLocaleString()}
              {listing.listing_type === "rent" && <span className="text-sm text-gray-500"> / month</span>}
            </p>

            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
              {listing.bedrooms !== null && (
                <div className="bg-gray-50 rounded-md p-2"><strong>{listing.bedrooms}</strong> beds</div>
              )}
              {listing.bathrooms !== null && (
                <div className="bg-gray-50 rounded-md p-2"><strong>{listing.bathrooms}</strong> baths</div>
              )}
              {listing.floor_area !== null && (
                <div className="bg-gray-50 rounded-md p-2"><strong>{listing.floor_area}</strong> m² floor</div>
              )}
              {listing.land_area !== null && (
                <div className="bg-gray-50 rounded-md p-2"><strong>{listing.land_area}</strong> m² land</div>
              )}
            </div>

            {listing.public_location_text && (
              <p className="text-sm text-gray-600 mb-4 flex items-center gap-1.5">
                <IconMapPin size={15} className="text-gray-400" />
                {listing.public_location_text}
              </p>
            )}

            {enquiryUrl && (
              <a
                href={enquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center font-medium py-3 rounded-md text-white"
                style={{ backgroundColor: "var(--color-secondary)" }}
              >
                Enquire on WhatsApp
              </a>
            )}
          </div>
        </aside>
      </div>

      <div className="mt-6 bg-white border border-gray-100 rounded-lg p-5">
        <h2 className="font-semibold mb-2" style={{ color: "var(--color-primary)" }}>
          Description
        </h2>
        <p className="text-sm text-gray-600 whitespace-pre-line">
          {listing.description || "No description provided."}
        </p>
      </div>

      {listing.amenities.length > 0 && (
        <div className="mt-4 bg-white border border-gray-100 rounded-lg p-5">
          <h2 className="font-semibold mb-3" style={{ color: "var(--color-primary)" }}>
            Amenities
          </h2>
          <div className="flex flex-wrap gap-2">
            {listing.amenities.map((a) => (
              <span key={a} className="text-xs bg-gray-100 rounded-full px-3 py-1 text-gray-600">
                {a.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
