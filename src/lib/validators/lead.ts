import { z } from "zod";

const LEAD_STAGES = [
  "new", "contacted", "qualified", "matching",
  "recommendation_sent", "viewing_requested", "viewing_confirmed",
  "negotiation", "converted", "lost", "dormant",
] as const;

const PROPERTY_TYPES = [
  "apartment", "house", "townhouse", "villa", "maisonette",
  "land", "office", "shop", "warehouse", "commercial", "serviced_apartment",
] as const;

const LISTING_TYPES = ["sale", "rent", "lease"] as const;

export const createLeadSchema = z.object({
  phone: z.string().min(5, "Phone must be at least 5 characters"),
  whatsapp_name: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  preferred_language: z.string().default("en"),
  budget_min: z.number().nonnegative().optional(),
  budget_max: z.number().nonnegative().optional(),
  listing_type: z.enum(LISTING_TYPES).optional(),
  property_type: z.enum(PROPERTY_TYPES).optional(),
  preferred_area: z.string().optional(),
  stage: z.enum(LEAD_STAGES).default("new"),
  source: z.string().optional(),
});

export const updateLeadSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  preferred_language: z.string().optional(),
  budget_min: z.number().nonnegative().nullable().optional(),
  budget_max: z.number().nonnegative().nullable().optional(),
  listing_type: z.enum(LISTING_TYPES).nullable().optional(),
  property_type: z.enum(PROPERTY_TYPES).nullable().optional(),
  preferred_area: z.string().nullable().optional(),
  lead_score: z.number().min(0).max(100).optional(),
  opted_out: z.boolean().optional(),
});

export const updateStageSchema = z.object({
  stage: z.enum(LEAD_STAGES),
  note: z.string().optional(),
});

export const leadFilterSchema = z.object({
  stage: z.enum(LEAD_STAGES).optional(),
  search: z.string().optional(),
  source: z.string().optional(),
  sort: z.enum(["created_at", "updated_at", "last_contacted_at", "lead_score"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type LeadFilterInput = z.infer<typeof leadFilterSchema>;
