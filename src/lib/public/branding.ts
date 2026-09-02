import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_ACCOUNT_ID = "00000000-0000-0000-0000-000000000010";

export interface PublicBranding {
  firmName: string;
  displayName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  showPoweredBy: boolean;
  whatsappNumber: string | null;
}

const DEFAULT_PUBLIC_BRANDING: PublicBranding = {
  firmName: "Qabila Realtors",
  displayName: "Qabila Realtors",
  logoUrl: null,
  primaryColor: "#182744",
  secondaryColor: "#B49362",
  phone: null,
  email: null,
  website: null,
  showPoweredBy: true,
  whatsappNumber: null,
};

export async function resolvePublicBranding(
  accountId = DEFAULT_ACCOUNT_ID
): Promise<PublicBranding> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("account_branding" as any)
    .select("*")
    .eq("account_id", accountId)
    .single();

  if (!data) return DEFAULT_PUBLIC_BRANDING;

  return {
    firmName: data.firm_name || DEFAULT_PUBLIC_BRANDING.firmName,
    displayName: data.display_name || DEFAULT_PUBLIC_BRANDING.displayName,
    logoUrl: data.logo_storage_path || null,
    primaryColor: data.primary_color || DEFAULT_PUBLIC_BRANDING.primaryColor,
    secondaryColor: data.secondary_color || DEFAULT_PUBLIC_BRANDING.secondaryColor,
    phone: data.phone || null,
    email: data.email || null,
    website: data.website || null,
    showPoweredBy: data.show_powered_by ?? true,
    whatsappNumber: data.public_contact_phone || data.phone || null,
  };
}
