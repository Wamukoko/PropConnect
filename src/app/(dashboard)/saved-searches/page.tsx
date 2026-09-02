"use client";

import { useEffect, useState } from "react";

interface SavedSearch {
  id: string;
  name: string;
  filters: {
    property_type?: string;
    listing_type?: string;
    price_min?: number;
    price_max?: number;
    location?: string;
  };
  alert_enabled: boolean;
  alert_frequency: string;
  last_run_at: string | null;
}

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [listingType, setListingType] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(false);

  useEffect(() => {
    fetchSearches();
  }, []);

  async function fetchSearches() {
    try {
      const res = await fetch("/api/analytics/saved-searches");
      const data = await res.json();
      setSearches(data.searches || []);
    } catch {
      console.error("Failed to load saved searches");
    } finally {
      setLoading(false);
    }
  }

  async function createSearch() {
    if (!name.trim()) return;
    const res = await fetch("/api/analytics/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        filters: {
          listing_type: listingType || undefined,
          property_type: propertyType || undefined,
          price_max: priceMax ? Number(priceMax) : undefined,
        },
        alert_enabled: alertEnabled,
        alert_frequency: "daily",
      }),
    });
    if (res.ok) {
      setName("");
      setPriceMax("");
      setListingType("");
      setPropertyType("");
      setAlertEnabled(false);
      setShowNew(false);
      fetchSearches();
    }
  }

  async function toggleAlert(id: string, enabled: boolean) {
    await fetch(`/api/analytics/saved-searches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_enabled: enabled }),
    });
    fetchSearches();
  }

  async function deleteSearch(id: string) {
    await fetch(`/api/analytics/saved-searches/${id}`, { method: "DELETE" });
    fetchSearches();
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading saved searches...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Saved Searches</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-lg px-4 py-2 text-sm text-white hover:opacity-90"
          style={{ backgroundColor: "var(--color-navy)" }}
        >
          {showNew ? "Cancel" : "New Search"}
        </button>
      </div>

      {showNew && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Search name"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={listingType}
              onChange={(e) => setListingType(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All listing types</option>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
              <option value="lease">For Lease</option>
            </select>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All property types</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="villa">Villa</option>
              <option value="land">Land</option>
            </select>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Max price (KES)"
              className="border border-gray-200 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={alertEnabled}
              onChange={(e) => setAlertEnabled(e.target.checked)}
            />
            Enable alerts
          </label>
          <button
            onClick={createSearch}
            disabled={!name.trim()}
            className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            Save Search
          </button>
        </div>
      )}

      <div className="space-y-3">
        {searches.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No saved searches yet.</p>
        ) : (
          searches.map((search) => (
            <div
              key={search.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{search.name}</span>
                  <span className="text-xs text-gray-400 rounded-full bg-gray-100 px-2 py-0.5">
                    {search.filters.listing_type || "any"} / {search.filters.property_type || "any"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {search.filters.price_max ? `Max ${search.filters.price_max.toLocaleString()}` : "No price cap"}
                  {search.last_run_at ? ` · Last run ${new Date(search.last_run_at).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={search.alert_enabled}
                    onChange={(e) => toggleAlert(search.id, e.target.checked)}
                  />
                  Alerts
                </label>
                <button
                  onClick={() => deleteSearch(search.id)}
                  className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
