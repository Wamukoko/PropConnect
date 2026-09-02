import { describe, it, expect } from "vitest";
import {
  isValidDocumentType,
  isValidDocumentSize,
} from "@/lib/documents";

describe("sensitive document validation", () => {
  describe("isValidDocumentType", () => {
    it("accepts pdf and common image types", () => {
      expect(isValidDocumentType("application/pdf")).toBe(true);
      expect(isValidDocumentType("image/jpeg")).toBe(true);
      expect(isValidDocumentType("image/png")).toBe(true);
      expect(isValidDocumentType("image/webp")).toBe(true);
    });

    it("rejects executables and other types", () => {
      expect(isValidDocumentType("application/x-msdownload")).toBe(false);
      expect(isValidDocumentType("text/html")).toBe(false);
      expect(isValidDocumentType("")).toBe(false);
    });
  });

  describe("isValidDocumentSize", () => {
    it("accepts a reasonable size", () => {
      expect(isValidDocumentSize(1024 * 1024)).toBe(true);
    });

    it("accepts the maximum allowed size", () => {
      expect(isValidDocumentSize(15 * 1024 * 1024)).toBe(true);
    });

    it("rejects zero and negative sizes", () => {
      expect(isValidDocumentSize(0)).toBe(false);
      expect(isValidDocumentSize(-5)).toBe(false);
    });

    it("rejects sizes over the maximum", () => {
      expect(isValidDocumentSize(16 * 1024 * 1024)).toBe(false);
    });
  });
});
