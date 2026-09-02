"use client";

import { useState, useEffect } from "react";
import { PropertyCard } from "@/components/properties/property-card";
import { FilterPanel } from "@/components/properties/filter-panel";
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

interface Filters {
  property_type?: string;
  listing_type?: string;
  status?: string;
  price_min?: string;
  price_max?: string;
  bedrooms_min?: string;
  search?: string;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get("search");
    if (search) setFilters((f) => ({ ...f, search }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });

    setLoading(true);
    fetch(`/api/properties?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setProperties(data.properties || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
          Properties
        </h1>
        <Link
          href="/properties/new"
          className="px-4 py-2 rounded-md text-white text-sm font-medium"
          style={{ backgroundColor: "var(--color-secondary)" }}
        >
          + Add Property
        </Link>
      </div>

      <FilterPanel filters={filters} onFilterChange={setFilters} />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : properties.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
          <p className="text-gray-500 mb-4">No properties found.</p>
          <Link
            href="/properties/new"
            className="text-sm underline"
            style={{ color: "var(--color-secondary)" }}
          >
            Add your first property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
