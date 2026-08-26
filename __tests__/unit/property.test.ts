import { describe, it, expect } from "vitest";
import {
  createPropertySchema,
  updatePropertySchema,
  propertyFilterSchema,
} from "@/lib/validators/property";

describe("property validators", () => {
  describe("createPropertySchema", () => {
    it("accepts valid property data", () => {
      const result = createPropertySchema.safeParse({
        title: "Modern Apartment in Kilimani",
        property_type: "apartment",
        listing_type: "rent",
        price: 85000,
        bedrooms: 2,
        bathrooms: 2,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = createPropertySchema.safeParse({
        title: "",
        property_type: "apartment",
        listing_type: "rent",
        price: 85000,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative price", () => {
      const result = createPropertySchema.safeParse({
        title: "Test Property",
        property_type: "apartment",
        listing_type: "rent",
        price: -100,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid property_type", () => {
      const result = createPropertySchema.safeParse({
        title: "Test Property",
        property_type: "invalid_type",
        listing_type: "rent",
        price: 85000,
      });
      expect(result.success).toBe(false);
    });

    it("defaults status to draft", () => {
      const result = createPropertySchema.safeParse({
        title: "Test Property",
        property_type: "apartment",
        listing_type: "rent",
        price: 85000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("draft");
      }
    });

    it("defaults currency to KES", () => {
      const result = createPropertySchema.safeParse({
        title: "Test Property",
        property_type: "apartment",
        listing_type: "rent",
        price: 85000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe("KES");
      }
    });

    it("accepts all valid property types", () => {
      const types = [
        "apartment", "house", "townhouse", "villa", "maisonette",
        "land", "office", "shop", "warehouse", "commercial", "serviced_apartment",
      ];
      for (const type of types) {
        const result = createPropertySchema.safeParse({
          title: "Test",
          property_type: type,
          listing_type: "sale",
          price: 1000000,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("updatePropertySchema", () => {
    it("accepts partial updates", () => {
      const result = updatePropertySchema.safeParse({
        title: "Updated Title",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty update", () => {
      const result = updatePropertySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("propertyFilterSchema", () => {
    it("parses filter params with defaults", () => {
      const result = propertyFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it("parses numeric filters from strings", () => {
      const result = propertyFilterSchema.safeParse({
        price_min: "50000",
        price_max: "200000",
        bedrooms_min: "2",
        page: "2",
        limit: "10",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.price_min).toBe(50000);
        expect(result.data.price_max).toBe(200000);
        expect(result.data.bedrooms_min).toBe(2);
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
      }
    });

    it("rejects limit over 100", () => {
      const result = propertyFilterSchema.safeParse({ limit: "101" });
      expect(result.success).toBe(false);
    });
  });
});
