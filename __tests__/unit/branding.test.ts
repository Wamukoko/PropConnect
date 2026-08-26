import { describe, it, expect } from "vitest";
import { brandingToCssVariables } from "@/lib/branding/resolver";
import type { BrandingTokens } from "@/lib/branding/resolver";

describe("branding resolver", () => {
  const qabilaBranding: BrandingTokens = {
    firmName: "Qabila Realtors",
    displayName: "Qabila Realtors",
    logoUrl: null,
    faviconUrl: null,
    primaryColor: "#182744",
    secondaryColor: "#B49362",
    accentColor: "#B49362",
    phone: null,
    email: null,
    website: null,
    showPoweredBy: true,
  };

  it("converts branding tokens to CSS variables", () => {
    const vars = brandingToCssVariables(qabilaBranding);

    expect(vars["--color-primary"]).toBe("#182744");
    expect(vars["--color-secondary"]).toBe("#B49362");
    expect(vars["--color-accent"]).toBe("#B49362");
  });

  it("converts hex to RGB format", () => {
    const vars = brandingToCssVariables(qabilaBranding);

    expect(vars["--color-primary-rgb"]).toBe("24, 39, 68");
    expect(vars["--color-secondary-rgb"]).toBe("180, 147, 98");
  });

  it("handles non-Qabila branding", () => {
    const customBranding: BrandingTokens = {
      ...qabilaBranding,
      firmName: "Custom Agency",
      primaryColor: "#FF0000",
      secondaryColor: "#00FF00",
      accentColor: "#0000FF",
    };

    const vars = brandingToCssVariables(customBranding);

    expect(vars["--color-primary"]).toBe("#FF0000");
    expect(vars["--color-primary-rgb"]).toBe("255, 0, 0");
  });
});
