import { describe, it, expect } from "vitest";
import { canTransition, getNextStates } from "@/lib/conversations/state-machine";
import { formatPropertyRecommendation } from "@/lib/conversations/matching";

describe("conversation state machine", () => {
  describe("canTransition", () => {
    it("allows idle → choosing_intent", () => {
      expect(canTransition("idle", "choosing_intent")).toBe(true);
    });

    it("allows choosing_intent → choosing_listing_type", () => {
      expect(canTransition("choosing_intent", "choosing_listing_type")).toBe(true);
    });

    it("allows choosing_intent → expired", () => {
      expect(canTransition("choosing_intent", "expired")).toBe(true);
    });

    it("allows choosing_intent → opted_out", () => {
      expect(canTransition("choosing_intent", "opted_out")).toBe(true);
    });

    it("allows choosing_intent → human_handoff", () => {
      expect(canTransition("choosing_intent", "human_handoff")).toBe(true);
    });

    it("allows showing_results → choosing_property", () => {
      expect(canTransition("showing_results", "choosing_property")).toBe(true);
    });

    it("allows showing_results → completed", () => {
      expect(canTransition("showing_results", "completed")).toBe(true);
    });

    it("allows completed → idle (restart)", () => {
      expect(canTransition("completed", "idle")).toBe(true);
    });

    it("allows expired → idle (restart)", () => {
      expect(canTransition("expired", "idle")).toBe(true);
    });

    it("allows opted_out → idle (restart)", () => {
      expect(canTransition("opted_out", "idle")).toBe(true);
    });

    it("blocks invalid transition idle → completed", () => {
      expect(canTransition("idle", "completed")).toBe(false);
    });

    it("blocks invalid transition choosing_budget → choosing_intent", () => {
      expect(canTransition("choosing_budget", "choosing_intent")).toBe(false);
    });

    it("blocks backward transition completed → showing_results", () => {
      expect(canTransition("completed", "showing_results")).toBe(false);
    });

    it("blocks choosing_viewing_date → choosing_intent", () => {
      expect(canTransition("choosing_viewing_date", "choosing_intent")).toBe(false);
    });

    it("allows full happy path flow", () => {
      const steps = [
        "idle",
        "choosing_intent",
        "choosing_property_type",
        "choosing_budget",
        "choosing_area",
        "matching_properties",
        "showing_results",
        "choosing_property",
        "choosing_viewing_date",
        "choosing_viewing_slot",
        "awaiting_confirmation",
        "completed",
      ] as const;

      for (let i = 0; i < steps.length - 1; i++) {
        expect(canTransition(steps[i], steps[i + 1])).toBe(true);
      }
    });
  });

  describe("getNextStates", () => {
    it("returns valid next states for idle", () => {
      const next = getNextStates("idle");
      expect(next).toContain("choosing_intent");
      expect(next).toContain("expired");
      expect(next).toContain("opted_out");
    });

    it("returns empty for completed", () => {
      const next = getNextStates("completed");
      expect(next).toContain("idle");
    });

    it("includes recovery states at each step", () => {
      const states = [
        "choosing_intent",
        "choosing_property_type",
        "choosing_budget",
        "choosing_area",
        "showing_results",
      ];

      for (const state of states) {
        const next = getNextStates(state as any);
        expect(next).toContain("expired");
        expect(next).toContain("human_handoff");
      }
    });
  });
});

describe("formatPropertyRecommendation", () => {
  it("formats a rental property", () => {
    const prop = {
      id: "12345678-1234-1234-1234-123456789012",
      title: "Modern Apartment in Kilimani",
      property_type: "apartment",
      listing_type: "rent",
      price: 85000,
      currency: "KES",
      bedrooms: 2,
      bathrooms: 2,
      amenities: {},
      location_id: null,
      public_location_text: "Kilimani, Nairobi",
      description: null,
      score: 85,
      reasons: ["Within budget", "In preferred area"],
    };

    const text = formatPropertyRecommendation(prop);
    expect(text).toContain("Modern Apartment in Kilimani");
    expect(text).toContain("Rent");
    expect(text).toContain("85,000 KES/month");
    expect(text).toContain("2 bed");
    expect(text).toContain("Kilimani, Nairobi");
    expect(text).toContain("Within budget");
  });

  it("formats a sale property", () => {
    const prop = {
      id: "12345678-1234-1234-1234-123456789012",
      title: "3 Bedroom House in Karen",
      property_type: "house",
      listing_type: "sale",
      price: 15000000,
      currency: "KES",
      bedrooms: 3,
      bathrooms: 2,
      amenities: {},
      location_id: null,
      public_location_text: "Karen, Nairobi",
      description: null,
      score: 90,
      reasons: ["Has pool", "In gated community"],
    };

    const text = formatPropertyRecommendation(prop);
    expect(text).toContain("For Sale");
    expect(text).toContain("15,000,000 KES");
    expect(text).not.toContain("/month");
  });

  it("handles property without bedrooms", () => {
    const prop = {
      id: "12345678-1234-1234-1234-123456789012",
      title: "Vacant Land in Kiambu",
      property_type: "land",
      listing_type: "sale",
      price: 2000000,
      currency: "KES",
      bedrooms: null,
      bathrooms: null,
      amenities: {},
      location_id: null,
      public_location_text: "Kiambu",
      description: null,
      score: 75,
      reasons: ["In preferred area"],
    };

    const text = formatPropertyRecommendation(prop);
    expect(text).toContain("Vacant Land in Kiambu");
    expect(text).not.toContain("bed");
    expect(text).not.toContain("bath");
  });
});
