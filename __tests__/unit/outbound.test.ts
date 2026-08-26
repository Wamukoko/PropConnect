import { describe, it, expect } from "vitest";

// Test the failure classification and backoff logic directly
// (no Supabase needed for these unit tests)

const PERMANENT_FAILURE_CODES = new Set([
  "131026", "131027", "131051", "132000", "132001", "132012", "133004", "368",
]);

function isPermanentFailure(errorCode: string | undefined): boolean {
  if (!errorCode) return false;
  return PERMANENT_FAILURE_CODES.has(errorCode);
}

function calculateBackoff(attempt: number): number {
  const delays = [60, 300, 900, 3600, 14400];
  const index = Math.min(attempt - 1, delays.length - 1);
  return delays[index];
}

describe("outbound failure classification", () => {
  it("identifies permanent failures", () => {
    expect(isPermanentFailure("131026")).toBe(true); // invalid phone
    expect(isPermanentFailure("132000")).toBe(true); // blocked
    expect(isPermanentFailure("132001")).toBe(true); // not on WhatsApp
    expect(isPermanentFailure("368")).toBe(true); // temporarily blocked
  });

  it("does not classify transient errors as permanent", () => {
    expect(isPermanentFailure("130429")).toBe(false); // rate limit
    expect(isPermanentFailure("131000")).toBe(false); // generic
    expect(isPermanentFailure("131047")).toBe(false); // Re-engagement message
  });

  it("returns false for undefined/empty", () => {
    expect(isPermanentFailure(undefined)).toBe(false);
    expect(isPermanentFailure("")).toBe(false);
  });
});

describe("backoff calculation", () => {
  it("returns 1 minute for first attempt", () => {
    expect(calculateBackoff(1)).toBe(60);
  });

  it("returns 5 minutes for second attempt", () => {
    expect(calculateBackoff(2)).toBe(300);
  });

  it("returns 15 minutes for third attempt", () => {
    expect(calculateBackoff(3)).toBe(900);
  });

  it("returns 1 hour for fourth attempt", () => {
    expect(calculateBackoff(4)).toBe(3600);
  });

  it("returns 4 hours for fifth+ attempt", () => {
    expect(calculateBackoff(5)).toBe(14400);
    expect(calculateBackoff(10)).toBe(14400);
  });
});
