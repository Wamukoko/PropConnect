"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const propertyTypes = [
  "apartment", "house", "townhouse", "villa", "maisonette",
  "land", "office", "shop", "warehouse", "commercial", "serviced_apartment",
];

const listingTypes = ["sale", "rent", "lease"];

export default function NewPropertyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; preview: string }[]>([]);
  const previewUrls = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const next = Array.from(files).map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.push(preview);
      return { file, preview };
    });
    setPendingPhotos((prev) => [...prev, ...next]);
  };

  const removePhoto = (index: number) => {
    setPendingPhotos((prev) => {
      const target = prev[index];
      if (target) {
        URL.revokeObjectURL(target.preview);
        previewUrls.current = previewUrls.current.filter((url) => url !== target.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const [form, setForm] = useState({
    title: "",
    description: "",
    property_type: "apartment",
    listing_type: "rent",
    price: "",
    bedrooms: "",
    bathrooms: "",
    floor_area: "",
    furnished: false,
    parking_spaces: "",
    public_location_text: "",
    status: "draft",
  });

  const update = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price) || 0,
          bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
          bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
          floor_area: form.floor_area ? parseFloat(form.floor_area) : null,
          parking_spaces: form.parking_spaces ? parseInt(form.parking_spaces) : null,
        }),
      });

      if (res.ok) {
        const property = await res.json();
        for (const { file } of pendingPhotos) {
          const uploadBody = new FormData();
          uploadBody.append("property_id", property.id);
          uploadBody.append("file", file);

          try {
            const uploadRes = await fetch(`/api/properties/${property.id}/photos`, {
              method: "POST",
              body: uploadBody,
            });
            if (!uploadRes.ok) {
              const err = await uploadRes.json().catch(() => ({}));
              alert(err.error || "One or more photos failed to upload");
              break;
            }
          } catch {
            alert("One or more photos failed to upload");
            break;
          }
        }
        router.push(`/properties/${property.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create property");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-primary)" }}>
        Add Property
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

          {pendingPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {pendingPhotos.map((photo, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-md overflow-hidden border border-gray-200"
                >
                  <img
                    src={photo.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-xs text-gray-700 shadow hover:bg-white"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver ? "border-accent bg-accent/5" : "border-gray-200"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <p className="text-sm text-gray-500 mb-2">
              Drag photos here, or{" "}
              <span className="underline" style={{ color: "var(--color-secondary)" }}>
                browse
              </span>
            </p>
            <p className="text-xs text-gray-400">
              JPEG, PNG, or WebP. Uploaded right after the property is created.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-md text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            {saving ? "Creating..." : "Create Property"}
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
