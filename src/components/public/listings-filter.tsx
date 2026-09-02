"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PROPERTY_TYPES = [
  { value: "", label: "All types" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
  { value: "villa", label: "Villa" },
  { value: "maisonette", label: "Maisonette" },
  { value: "land", label: "Land" },
  { value: "office", label: "Office" },
  { value: "shop", label: "Shop" },
  { value: "warehouse", label: "Warehouse" },
  { value: "commercial", label: "Commercial" },
  { value: "serviced_apartment", label: "Serviced Apartment" },
];

const LISTING_TYPES = [
  { value: "", label: "All" },
  { value: "sale", label: "For Sale" },
  { value: "rent", label: "For Rent" },
  { value: "lease", label: "For Lease" },
];

export function PublicListingsFilter({
  initial = {},
}: {
  initial?: { property_type?: string; listing_type?: string; search?: string };
}) {
  const router = useRouter();
  const [propertyType, setPropertyType] = useState(initial.property_type || "");
  const [listingType, setListingType] = useState(initial.listing_type || "");
  const [search, setSearch] = useState(initial.search || "");

  function applyFilters() {
    const params = new URLSearchParams();
    if (propertyType) params.set("property_type", propertyType);
    if (listingType) params.set("listing_type", listingType);
    if (search) params.set("search", search);
    const qs = params.toString();
    router.push(qs ? `/listings?${qs}` : "/listings");
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={listingType}
          onChange={(e) => setListingType(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm"
        >
          {LISTING_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm"
        >
          {PROPERTY_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="border border-gray-200 rounded-md px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-3">
        <button
          onClick={applyFilters}
          className="px-4 py-2 rounded-md text-sm text-white"
          style={{ backgroundColor: "var(--color-navy)" }}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
