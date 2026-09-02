export const featureFlags = {
  CONTACT_GOOGLE_SYNC: process.env.FEATURE_CONTACT_GOOGLE_SYNC === "true",
  CONTACT_VCF: process.env.FEATURE_CONTACT_VCF !== "false",
  CONTACT_CSV: process.env.FEATURE_CONTACT_CSV !== "false",
  CATALOG_SYNC: process.env.FEATURE_CATALOG_SYNC === "true",
  DOCUMENTS: process.env.FEATURE_DOCUMENTS === "true",
  EMAIL: process.env.FEATURE_EMAIL === "true",
  BROADCASTS: process.env.FEATURE_BROADCASTS === "true",
  AI: process.env.FEATURE_AI === "true",
  WHATSAPP_CONVERSATIONS: process.env.FEATURE_WHATSAPP_CONVERSATIONS === "true",
  MAP_MATCHING: process.env.FEATURE_MAP_MATCHING === "true",
  PUBLIC_LISTINGS: process.env.FEATURE_PUBLIC_LISTINGS !== "false",
  ANALYTICS: process.env.FEATURE_ANALYTICS !== "false",
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
