import { describe, it, expect } from "vitest";
import { validatePhotoUpload } from "@/lib/properties/photo-processing";

describe("photo upload validation", () => {
  it("accepts valid JPEG files", () => {
    const result = validatePhotoUpload({ type: "image/jpeg", size: 1024 * 1024 });
    expect(result.valid).toBe(true);
  });

  it("accepts valid PNG files", () => {
    const result = validatePhotoUpload({ type: "image/png", size: 1024 * 1024 });
    expect(result.valid).toBe(true);
  });

  it("accepts valid WebP files", () => {
    const result = validatePhotoUpload({ type: "image/webp", size: 1024 * 1024 });
    expect(result.valid).toBe(true);
  });

  it("rejects GIF files", () => {
    const result = validatePhotoUpload({ type: "image/gif", size: 1024 * 1024 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file type");
  });

  it("rejects PDF files", () => {
    const result = validatePhotoUpload({ type: "application/pdf", size: 1024 });
    expect(result.valid).toBe(false);
  });

  it("rejects files over 10MB", () => {
    const result = validatePhotoUpload({
      type: "image/jpeg",
      size: 11 * 1024 * 1024,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("File too large");
  });

  it("accepts files at exactly 10MB", () => {
    const result = validatePhotoUpload({
      type: "image/jpeg",
      size: 10 * 1024 * 1024,
    });
    expect(result.valid).toBe(true);
  });

  it("accepts small files", () => {
    const result = validatePhotoUpload({ type: "image/jpeg", size: 100 });
    expect(result.valid).toBe(true);
  });
});
