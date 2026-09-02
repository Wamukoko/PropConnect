"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhotoUpload } from "@/components/properties/photo-upload";

interface Property {
  id: string;
  title: string;
  description: string | null;
  property_type: string;
  listing_type: string;
  status: string;
  price: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area: number | null;
  land_area: number | null;
  furnished: boolean | null;
  parking_spaces: number | null;
  amenities: string[];
  public_location_text: string | null;
  availability_date: string | null;
  created_at: string;
  property_photos?: { id: string; storage_path: string; alt_text: string | null; sort_order: number; signed_url?: string | null }[];
  locations?: { name: string; location_type: string }[];
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setProperty)
      .catch(() => router.push("/properties"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading...</div>;
  if (!property) return null;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
            {property.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {property.property_type.replace(/_/g, " ")} · {property.listing_type} · {property.status.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/properties/${property.id}/edit`)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={async () => {
              if (!window.confirm(`Delete "${property.title}"? This archives the listing.`)) return;
              setDeleting(true);
              try {
                const res = await fetch(`/api/properties/${property.id}`, {
                  method: "DELETE",
                });
                if (res.ok) {
                  router.push("/properties");
                } else {
                  const err = await res.json().catch(() => ({}));
                  alert(err.error || "Failed to delete property");
                  setDeleting(false);
                }
              } catch {
                alert("Failed to delete property");
                setDeleting(false);
              }
            }}
            disabled={deleting}
            className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Photos */}
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <h2 className="font-semibold mb-4" style={{ color: "var(--color-primary)" }}>
              Photos
            </h2>
            {property.property_photos && property.property_photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {property.property_photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square bg-gray-100 rounded-md bg-cover bg-center"
                    style={{ backgroundImage: `url(${photo.signed_url || photo.storage_path})` }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">No photos uploaded yet.</p>
            )}
            <div className="mt-4">
              <PhotoUpload propertyId={property.id} />
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div className="bg-white rounded-lg border border-gray-100 p-6">
              <h2 className="font-semibold mb-2" style={{ color: "var(--color-primary)" }}>
                Description
              </h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{property.description}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Price */}
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <p className="text-3xl font-bold" style={{ color: "var(--color-secondary)" }}>
              {property.currency} {property.price.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {property.listing_type === "rent" ? "per month" : property.listing_type === "lease" ? "per year" : ""}
            </p>
          </div>

          {/* Details */}
          <div className="bg-white rounded-lg border border-gray-100 p-6 space-y-3">
            <h2 className="font-semibold" style={{ color: "var(--color-primary)" }}>
              Details
            </h2>
            <DetailRow label="Type" value={property.property_type.replace(/_/g, " ")} />
            <DetailRow label="Bedrooms" value={property.bedrooms?.toString() || "—"} />
            <DetailRow label="Bathrooms" value={property.bathrooms?.toString() || "—"} />
            <DetailRow label="Floor Area" value={property.floor_area ? `${property.floor_area} sqm` : "—"} />
            <DetailRow label="Land Area" value={property.land_area ? `${property.land_area} sqm` : "—"} />
            <DetailRow label="Parking" value={property.parking_spaces?.toString() || "—"} />
            <DetailRow label="Furnished" value={property.furnished ? "Yes" : "No"} />
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <h2 className="font-semibold mb-2" style={{ color: "var(--color-primary)" }}>
              Location
            </h2>
            {property.locations && property.locations.length > 0 ? (
              <p className="text-sm text-gray-600">
                {property.locations.map((l) => l.name).join(", ")}
              </p>
            ) : property.public_location_text ? (
              <p className="text-sm text-gray-600">{property.public_location_text}</p>
            ) : (
              <p className="text-sm text-gray-400">No location set</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}
