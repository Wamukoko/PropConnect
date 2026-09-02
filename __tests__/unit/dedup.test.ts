import { describe, it, expect } from "vitest";
import { normalizePhone, normalizeEmail } from "@/lib/contacts/dedup";

describe("phone normalization", () => {
  it("normalizes Kenyan mobile (07xx)", () => {
    expect(normalizePhone("0712345678")).toBe("+254712345678");
  });

  it("normalizes Kenyan mobile (01xx)", () => {
    expect(normalizePhone("0112345678")).toBe("+254112345678");
  });

  it("normalizes already international format", () => {
    expect(normalizePhone("+254712345678")).toBe("+254712345678");
  });

  it("normalizes without country code prefix", () => {
    expect(normalizePhone("254712345678")).toBe("+254712345678");
  });

  it("normalizes 9-digit number", () => {
    expect(normalizePhone("712345678")).toBe("+254712345678");
  });

  it("strips non-digit characters", () => {
    expect(normalizePhone("(071) 234-5678")).toBe("+254712345678");
  });

  it("handles whitespace", () => {
    expect(normalizePhone(" 0712345678 ")).toBe("+254712345678");
  });

  it("handles dashes", () => {
    expect(normalizePhone("0712-345-678")).toBe("+254712345678");
  });
});

describe("email normalization", () => {
  it("lowercases email", () => {
    expect(normalizeEmail("Test@Example.COM")).toBe("test@example.com");
  });

  it("trims whitespace", () => {
    expect(normalizeEmail("  test@example.com  ")).toBe("test@example.com");
  });

  it("returns null for null/undefined", () => {
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeEmail("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normalizeEmail("   ")).toBeNull();
  });

  it("handles normal email", () => {
    expect(normalizeEmail("user@domain.co.ke")).toBe("user@domain.co.ke");
  });
});
