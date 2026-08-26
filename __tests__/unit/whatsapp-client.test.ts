import { describe, it, expect } from "vitest";
import { normalizePhone, redactPhone } from "@/lib/whatsapp/client";

describe("normalizePhone", () => {
  it("adds +254 prefix to Kenyan numbers", () => {
    expect(normalizePhone("0712345678")).toBe("+254712345678");
  });

  it("preserves international format", () => {
    expect(normalizePhone("+254712345678")).toBe("+254712345678");
  });

  it("handles digits-only with 254 prefix", () => {
    expect(normalizePhone("254712345678")).toBe("+254712345678");
  });

  it("strips spaces and dashes", () => {
    expect(normalizePhone("+254 712 345 678")).toBe("+254712345678");
  });

  it("handles short codes", () => {
    expect(normalizePhone("123")).toBe("+123");
  });
});

describe("redactPhone", () => {
  it("redacts middle digits", () => {
    expect(redactPhone("+254712345678")).toBe("+25*******678");
  });

  it("handles short numbers", () => {
    expect(redactPhone("1234")).toBe("****");
  });

  it("handles 5-character numbers", () => {
    expect(redactPhone("12345")).toBe("*****");
  });
});
