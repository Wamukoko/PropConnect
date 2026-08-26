import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export interface BrandingTokens {
  firmName: string;
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  showPoweredBy: boolean;
}

const DEFAULT_BRANDING: BrandingTokens = {
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

export async function resolveBranding(
  accountId: string
): Promise<BrandingTokens> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("account_branding" as any)
    .select("*")
    .eq("account_id", accountId)
    .single();

  if (!data) return DEFAULT_BRANDING;

  return {
    firmName: data.firm_name || DEFAULT_BRANDING.firmName,
    displayName: data.display_name || DEFAULT_BRANDING.displayName,
    logoUrl: data.logo_storage_path || null,
    faviconUrl: data.favicon_storage_path || null,
    primaryColor: data.primary_color || DEFAULT_BRANDING.primaryColor,
    secondaryColor: data.secondary_color || DEFAULT_BRANDING.secondaryColor,
    accentColor: data.accent_color || DEFAULT_BRANDING.accentColor,
    phone: data.phone || null,
    email: data.email || null,
    website: data.website || null,
    showPoweredBy: data.show_powered_by ?? true,
  };
}

export function brandingToCssVariables(branding: BrandingTokens): Record<string, string> {
  return {
    "--color-primary": branding.primaryColor,
    "--color-secondary": branding.secondaryColor,
    "--color-accent": branding.accentColor,
    "--color-primary-rgb": hexToRgb(branding.primaryColor),
    "--color-secondary-rgb": hexToRgb(branding.secondaryColor),
    "--color-accent-rgb": hexToRgb(branding.accentColor),
  };
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "24, 39, 68";
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
