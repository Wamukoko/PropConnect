"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PhotoUpload } from "@/components/properties/photo-upload";

const propertyTypes = [
  "apartment", "house", "townhouse", "villa", "maisonette",
  "land", "office", "shop", "warehouse", "commercial", "serviced_apartment",
];

const listingTypes = ["sale", "rent", "lease"];

const listingStatuses = [
  "draft", "pending_review", "published", "available", "reserved",
  "under_offer", "let", "sold", "withdrawn", "expired", "archived",
];

interface PropertyPhoto {
  id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  signed_url?: string | null;
}

interface Property {
  id: string;
  title: string;
  description: string | null;
  property_type: string;
  listing_type: string;
  status: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area: number | null;
  furnished: boolean | null;
  parking_spaces: number | null;
  public_location_text: string | null;
  property_photos?: PropertyPhoto[];
}

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "apartment",
    listing_type: "rent",
    status: "draft",
    price: "",
    bedrooms: "",
    bathrooms: "",
    floor_area: "",
    furnished: false,
    parking_spaces: "",
    public_location_text: "",
  });

  useEffect(() => {
    fetch(`/api/properties/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((p: Property) => {
        setForm({
          title: p.title || "",
          description: p.description || "",
          property_type: p.property_type || "apartment",
          listing_type: p.listing_type || "rent",
          status: p.status || "draft",
          price: p.price != null ? String(p.price) : "",
          bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
          bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
          floor_area: p.floor_area != null ? String(p.floor_area) : "",
          furnished: p.furnished ?? false,
          parking_spaces: p.parking_spaces != null ? String(p.parking_spaces) : "",
          public_location_text: p.public_location_text || "",
        });
        setPhotos(p.property_photos || []);
        setLoading(false);
      })
      .catch(() => router.replace("/properties"));
  }, [params.id, router]);

  const update = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/properties/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          property_type: form.property_type,
          listing_type: form.listing_type,
          status: form.status,
          price: parseFloat(form.price) || 0,
          bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
          bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
          floor_area: form.floor_area ? parseFloat(form.floor_area) : null,
          furnished: form.furnished,
          parking_spaces: form.parking_spaces ? parseInt(form.parking_spaces) : null,
          public_location_text: form.public_location_text || undefined,
        }),
      });

      if (res.ok) {
        router.push(`/properties/${params.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update property");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-primary)" }}>
        Edit Property
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold" style={{ color: "var(--color-primary)" }}>
            Basic Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. Modern 2BR Apartment in Kilimani"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Describe the property..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type *</label>
              <select
                value={form.property_type}
                onChange={(e) => update("property_type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {propertyTypes.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type *</label>
              <select
                value={form.listing_type}
                onChange={(e) => update("listing_type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {listingTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {listingStatuses.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold" style={{ color: "var(--color-primary)" }}>
            Pricing & Details
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (KES) *</label>
              <input
                type="number"
                required
                min="0"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={form.public_location_text}
                onChange={(e) => update("public_location_text", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. Kilimani, Nairobi"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
              <input
                type="number"
                min="0"
                value={form.bedrooms}
                onChange={(e) => update("bedrooms", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
              <input
                type="number"
                min="0"
                value={form.bathrooms}
                onChange={(e) => update("bathrooms", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parking</label>
              <input
                type="number"
                min="0"
                value={form.parking_spaces}
                onChange={(e) => update("parking_spaces", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Floor Area (sqm)</label>
              <input
                type="number"
                min="0"
                value={form.floor_area}
                onChange={(e) => update("floor_area", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.furnished}
                  onChange={(e) => update("furnished", e.target.checked)}
                  className="rounded border-gray-300"
                />
                Furnished
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold" style={{ color: "var(--color-primary)" }}>
            Photos
          </h2>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo) => (
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

          <PhotoUpload
            propertyId={params.id as string}
            onUploadComplete={(photo: any) =>
              setPhotos((prev) => [...prev, photo])
            }
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-md text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}