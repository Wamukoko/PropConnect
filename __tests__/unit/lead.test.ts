import { describe, it, expect } from "vitest";
import {
  createLeadSchema,
  updateLeadSchema,
  updateStageSchema,
  leadFilterSchema,
} from "@/lib/validators/lead";

describe("lead validators", () => {
  describe("createLeadSchema", () => {
    it("accepts valid lead data", () => {
      const result = createLeadSchema.safeParse({
        phone: "+254712345678",
        whatsapp_name: "Test User",
      });
      expect(result.success).toBe(true);
    });

    it("requires phone number", () => {
      const result = createLeadSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects very short phone", () => {
      const result = createLeadSchema.safeParse({ phone: "123" });
      expect(result.success).toBe(false);
    });

    it("defaults stage to new", () => {
      const result = createLeadSchema.safeParse({ phone: "+254712345678" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stage).toBe("new");
      }
    });

    it("accepts all valid stages", () => {
      const stages = [
        "new", "contacted", "qualified", "matching",
        "recommendation_sent", "viewing_requested", "viewing_confirmed",
        "negotiation", "converted", "lost", "dormant",
      ];
      for (const stage of stages) {
        const result = createLeadSchema.safeParse({
          phone: "+254712345678",
          stage,
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts optional budget fields", () => {
      const result = createLeadSchema.safeParse({
        phone: "+254712345678",
        budget_min: 100000,
        budget_max: 500000,
        listing_type: "rent",
        property_type: "apartment",
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative budget", () => {
      const result = createLeadSchema.safeParse({
        phone: "+254712345678",
        budget_min: -100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateLeadSchema", () => {
    it("accepts partial updates", () => {
      const result = updateLeadSchema.safeParse({ name: "Updated Name" });
      expect(result.success).toBe(true);
    });

    it("accepts empty update", () => {
      const result = updateLeadSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("validates email format", () => {
      const result = updateLeadSchema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);
    });

    it("validates lead_score range", () => {
      const result = updateLeadSchema.safeParse({ lead_score: 150 });
      expect(result.success).toBe(false);
    });

    it("allows null for nullable fields", () => {
      const result = updateLeadSchema.safeParse({
        budget_min: null,
        budget_max: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateStageSchema", () => {
    it("accepts valid stage", () => {
      const result = updateStageSchema.safeParse({ stage: "qualified" });
      expect(result.success).toBe(true);
    });

    it("accepts stage with note", () => {
      const result = updateStageSchema.safeParse({
        stage: "contacted",
        note: "Called and spoke to lead",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid stage", () => {
      const result = updateStageSchema.safeParse({ stage: "invalid_stage" });
      expect(result.success).toBe(false);
    });
  });

  describe("leadFilterSchema", () => {
    it("parses with defaults", () => {
      const result = leadFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sort).toBe("created_at");
        expect(result.data.order).toBe("desc");
      }
    });

    it("parses stage filter", () => {
      const result = leadFilterSchema.safeParse({ stage: "qualified" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stage).toBe("qualified");
      }
    });

    it("rejects limit over 100", () => {
      const result = leadFilterSchema.safeParse({ limit: "101" });
      expect(result.success).toBe(false);
    });
  });
});
