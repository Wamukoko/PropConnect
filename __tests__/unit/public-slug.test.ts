import { describe, it, expect } from "vitest";
import {
  generateListingSlug,
  normalizeSlug,
  stripStopwords,
} from "@/lib/public/slug";

describe("listing slug helpers", () => {
  describe("generateListingSlug", () => {
    it("generates a lowercase hyphenated slug", () => {
      expect(generateListingSlug("Modern Apartment in Kilimani")).toBe(
        "modern-apartment-in-kilimani"
      );
    });

    it("appends reference code when provided", () => {
      expect(generateListingSlug("Modern Apartment", "REF-123")).toBe(
        "modern-apartment-ref-123"
      );
    });

    it("removes special characters", () => {
      expect(generateListingSlug("2 Bedroom! (Premium) Villa")).toBe(
        "2-bedroom-premium-villa"
      );
    });

    it("returns a slug without ref code when title only", () => {
      expect(generateListingSlug("Beachfront House")).toBe("beachfront-house");
    });

    it("is idempotent for the same input", () => {
      const a = generateListingSlug("Same Title");
      const b = generateListingSlug("Same Title");
      expect(a).toBe(b);
    });
  });

  describe("normalizeSlug", () => {
    it("normalizes an arbitrary string to a slug", () => {
      expect(normalizeSlug("  My   Property  ")).toBe("my-property");
    });
  });

  describe("stripStopwords", () => {
    it("removes stopwords from a slug", () => {
      expect(stripStopwords("apartment-in-kilimani")).toBe("apartment-kilimani");
    });

    it("keeps slugs with no stopwords intact", () => {
      expect(stripStopwords("beachfront-house")).toBe("beachfront-house");
    });
  });
});
