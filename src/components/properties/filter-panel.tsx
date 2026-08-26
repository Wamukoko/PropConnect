"use client";

import { useState } from "react";

interface Filters {
  property_type?: string;
  listing_type?: string;
  status?: string;
  price_min?: string;
  price_max?: string;
  bedrooms_min?: string;
  search?: string;
}

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

const propertyTypes = [
  "apartment", "house", "townhouse", "villa", "maisonette",
  "land", "office", "shop", "warehouse", "commercial", "serviced_apartment",
];

const listingTypes = ["sale", "rent", "lease"];

const statuses = [
  "draft", "pending_review", "published", "available",
  "reserved", "under_offer", "let", "sold", "withdrawn", "expired", "archived",
];

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const [local, setLocal] = useState<Filters>(filters);

  const update = (key: keyof Filters, value: string) => {
    const next = { ...local, [key]: value || undefined };
    setLocal(next);
    onFilterChange(next);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
          <input
            type="text"
            value={local.search || ""}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Title..."
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select
            value={local.property_type || ""}
            onChange={(e) => update("property_type", e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Listing</label>
          <select
            value={local.listing_type || ""}
            onChange={(e) => update("listing_type", e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All</option>
            {listingTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={local.status || ""}
            onChange={(e) => update("status", e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Min Price</label>
          <input
            type="number"
            value={local.price_min || ""}
            onChange={(e) => update("price_min", e.target.value)}
            placeholder="0"
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Bedrooms</label>
          <input
            type="number"
            value={local.bedrooms_min || ""}
            onChange={(e) => update("bedrooms_min", e.target.value)}
            placeholder="Any"
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>
    </div>
  );
}
