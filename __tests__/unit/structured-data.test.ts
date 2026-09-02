import { describe, it, expect } from "vitest";
import { buildListingStructuredData } from "@/lib/public/structured-data";

const base = {
  id: "prop-1",
  title: "Modern Apartment in Kilimani",
  description: "A beautiful apartment",
  property_type: "apartment",
  listing_type: "rent" as const,
  price: 85000,
  currency: "KES",
  bedrooms: 2,
  bathrooms: 2,
  floor_area: 120,
  land_area: null,
  amenities: ["wifi", "parking"],
  public_location_text: "Kilimani",
  latitude: -1.2921,
  longitude: 36.786,
  listing_url: "/listings/modern-apartment-in-kilimani",
  photos: [{ url: "https://example.com/photo.jpg", alt_text: "Main" }],
  brand: { firmName: "Qabila Realtors", phone: "+254700000000", contactName: "Agent" },
};

describe("buildListingStructuredData", () => {
  it("produces valid Product schema", () => {
    const data = buildListingStructuredData(base);
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe(base.title);
  });

  it("includes offer with correct price currency", () => {
    const data = buildListingStructuredData(base);
    const offers = data.offers as Record<string, unknown>;
    expect(offers.price).toBe(85000);
    expect(offers.priceCurrency).toBe("KES");
  });

  it("adds unit price specification for non-sale listings", () => {
    const data = buildListingStructuredData(base);
    const offers = data.offers as Record<string, unknown>;
    const spec = offers.priceSpecification as Record<string, unknown>;
    expect(spec["@type"]).toBe("UnitPriceSpecification");
    expect(spec.unitText).toBe("PER_MONTH");
  });

  it("does not add unit price spec for sale listings", () => {
    const data = buildListingStructuredData({
      ...base,
      listing_type: "sale",
    });
    const offers = data.offers as Record<string, unknown>;
    expect(offers.priceSpecification).toBeUndefined();
  });

  it("includes photos as image array", () => {
    const data = buildListingStructuredData(base);
    expect(data.image).toEqual(["https://example.com/photo.jpg"]);
  });

  it("includes geo coordinates", () => {
    const data = buildListingStructuredData(base);
    const geo = data.geo as Record<string, unknown>;
    expect(geo["@type"]).toBe("GeoCoordinates");
    expect(geo.latitude).toBe(-1.2921);
    expect(geo.longitude).toBe(36.786);
  });

  it("includes additional property values", () => {
    const data = buildListingStructuredData(base);
    const props = data.additionalProperty as Record<string, unknown>[];
    expect(props.some((p) => p.name === "bedrooms" && p.value === 2)).toBe(true);
    expect(props.some((p) => p.name === "amenities")).toBe(true);
  });

  it("excludes client-only fields", () => {
    const data = buildListingStructuredData(base);
    expect(JSON.stringify(data)).not.toContain("account_id");
  });
});
