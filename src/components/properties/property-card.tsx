"use client";

import Link from "next/link";

interface Property {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  status: string;
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  public_location_text: string | null;
  property_photos?: { storage_path: string; thumbnail_path: string | null }[];
  locations?: { name: string }[];
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending_review: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-700",
  available: "bg-blue-100 text-blue-700",
  reserved: "bg-purple-100 text-purple-700",
  under_offer: "bg-orange-100 text-orange-700",
  let: "bg-green-100 text-green-700",
  sold: "bg-green-100 text-green-700",
  withdrawn: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
  archived: "bg-gray-100 text-gray-400",
};

export function PropertyCard({ property }: { property: Property }) {
  const photo = property.property_photos?.[0];
  const location = property.locations?.[0]?.name || property.public_location_text;

  return (
    <Link
      href={`/properties/${property.id}`}
      className="block bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-48 bg-gray-100 relative">
        {photo ? (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${photo.thumbnail_path || photo.storage_path})` }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No photo
          </div>
        )}
        <span
          className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${statusColors[property.status] || "bg-gray-100 text-gray-600"}`}
        >
          {property.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-sm mb-1 truncate" style={{ color: "var(--color-primary)" }}>
          {property.title}
        </h3>

        <p className="text-xs text-gray-500 mb-2">
          {property.property_type.replace(/_/g, " ")} · {property.listing_type}
        </p>

        <div className="flex items-center justify-between">
          <p className="font-bold text-sm" style={{ color: "var(--color-secondary)" }}>
            {property.currency} {property.price.toLocaleString()}
          </p>
          <div className="flex gap-2 text-xs text-gray-500">
            {property.bedrooms !== null && <span>{property.bedrooms} bed</span>}
            {property.bathrooms !== null && <span>{property.bathrooms} bath</span>}
          </div>
        </div>

        {location && (
          <p className="text-xs text-gray-400 mt-1">{location}</p>
        )}
      </div>
    </Link>
  );
}
