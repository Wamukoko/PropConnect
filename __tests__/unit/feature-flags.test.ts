import { describe, it, expect } from "vitest";
import { featureFlags, isFeatureEnabled } from "@/lib/feature-flags";

describe("feature flags", () => {
  it("has all required flags defined", () => {
    const requiredFlags = [
      "CONTACT_GOOGLE_SYNC",
      "CONTACT_VCF",
      "CONTACT_CSV",
      "CATALOG_SYNC",
      "DOCUMENTS",
      "EMAIL",
      "BROADCASTS",
      "AI",
      "MAP_MATCHING",
      "PUBLIC_LISTINGS",
      "ANALYTICS",
    ];

    for (const flag of requiredFlags) {
      expect(featureFlags).toHaveProperty(flag);
    }
  });

  it("returns boolean for isFeatureEnabled", () => {
    const result = isFeatureEnabled("CONTACT_CSV");
    expect(typeof result).toBe("boolean");
  });

  it("CONTACT_CSV defaults to true when env not set", () => {
    // In test environment, env vars are not set
    // CONTACT_CSV defaults to true (FALLS through !== "false" check)
    expect(featureFlags.CONTACT_CSV).toBe(true);
  });

  it("CATALOG_SYNC defaults to false when env not set", () => {
    // CATALOG_SYNC requires explicit "true" to enable
    expect(featureFlags.CATALOG_SYNC).toBe(false);
  });
});
