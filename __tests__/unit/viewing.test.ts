import { describe, it, expect } from "vitest";
import {
  createViewingSchema,
  updateViewingSchema,
  rescheduleViewingSchema,
  availabilityQuerySchema,
  viewingFilterSchema,
} from "@/lib/validators/viewing";

const VALID_UUID = "12345678-1234-4234-8234-123456789012";

describe("viewing validators", () => {
  describe("createViewingSchema", () => {
    it("accepts valid viewing data", () => {
      const result = createViewingSchema.safeParse({
        property_id: VALID_UUID,
        lead_id: VALID_UUID,
        start_at: "2026-09-01T10:00:00Z",
        end_at: "2026-09-01T10:30:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("rejects end_at before start_at", () => {
      const result = createViewingSchema.safeParse({
        property_id: VALID_UUID,
        lead_id: VALID_UUID,
        start_at: "2026-09-01T10:30:00Z",
        end_at: "2026-09-01T10:00:00Z",
      });
      expect(result.success).toBe(false);
    });

    it("rejects equal start and end", () => {
      const result = createViewingSchema.safeParse({
        property_id: VALID_UUID,
        lead_id: VALID_UUID,
        start_at: "2026-09-01T10:00:00Z",
        end_at: "2026-09-01T10:00:00Z",
      });
      expect(result.success).toBe(false);
    });

    it("requires valid UUIDs", () => {
      const result = createViewingSchema.safeParse({
        property_id: "not-a-uuid",
        lead_id: VALID_UUID,
        start_at: "2026-09-01T10:00:00Z",
        end_at: "2026-09-01T10:30:00Z",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateViewingSchema", () => {
    it("accepts status update", () => {
      const result = updateViewingSchema.safeParse({ status: "confirmed" });
      expect(result.success).toBe(true);
    });

    it("accepts cancel with reason", () => {
      const result = updateViewingSchema.safeParse({
        status: "cancelled",
        cancelled_reason: "Lead cannot make it",
      });
      expect(result.success).toBe(true);
    });

    it("accepts notes update", () => {
      const result = updateViewingSchema.safeParse({ notes: "Updated notes" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = updateViewingSchema.safeParse({ status: "invalid" });
      expect(result.success).toBe(false);
    });
  });

  describe("rescheduleViewingSchema", () => {
    it("accepts valid reschedule", () => {
      const result = rescheduleViewingSchema.safeParse({
        new_start_at: "2026-09-02T10:00:00Z",
        new_end_at: "2026-09-02T10:30:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("rejects new_end before new_start", () => {
      const result = rescheduleViewingSchema.safeParse({
        new_start_at: "2026-09-02T10:30:00Z",
        new_end_at: "2026-09-02T10:00:00Z",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("availabilityQuerySchema", () => {
    it("accepts valid query", () => {
      const result = availabilityQuerySchema.safeParse({
        property_id: VALID_UUID,
        date: "2026-09-01",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.duration_minutes).toBe(30);
      }
    });

    it("accepts custom duration", () => {
      const result = availabilityQuerySchema.safeParse({
        property_id: VALID_UUID,
        date: "2026-09-01",
        duration_minutes: "60",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid date format", () => {
      const result = availabilityQuerySchema.safeParse({
        property_id: VALID_UUID,
        date: "09-01-2026",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("viewingFilterSchema", () => {
    it("parses with defaults", () => {
      const result = viewingFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it("parses date range", () => {
      const result = viewingFilterSchema.safeParse({
        from: "2026-09-01",
        to: "2026-09-30",
      });
      expect(result.success).toBe(true);
    });
  });
});
