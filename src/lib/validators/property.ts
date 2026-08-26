import { z } from "zod";

const propertyTypeEnum = z.enum([
  "apartment",
  "house",
  "townhouse",
  "villa",
  "maisonette",
  "land",
  "office",
  "shop",
  "warehouse",
  "commercial",
  "serviced_apartment",
]);

const listingTypeEnum = z.enum(["sale", "rent", "lease"]);

const listingStatusEnum = z.enum([
  "draft",
  "pending_review",
  "published",
  "available",
  "reserved",
  "under_offer",
  "let",
  "sold",
  "withdrawn",
  "expired",
  "archived",
]);

export const createPropertySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  reference_code: z.string().max(50).optional(),
  description: z.string().max(5000).optional(),
  property_type: propertyTypeEnum,
  listing_type: listingTypeEnum,
  status: listingStatusEnum.default("draft"),
  price: z.number().min(0, "Price must be positive"),
  currency: z.string().min(1).default("KES"),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  floor_area: z.number().min(0).optional(),
  land_area: z.number().min(0).optional(),
  furnished: z.boolean().optional(),
  parking_spaces: z.number().int().min(0).optional(),
  amenities: z.array(z.string()).default([]),
  location_id: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  public_location_text: z.string().max(200).optional(),
  availability_date: z.string().optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export const propertyFilterSchema = z.object({
  property_type: propertyTypeEnum.optional(),
  listing_type: listingTypeEnum.optional(),
  status: listingStatusEnum.optional(),
  price_min: z.coerce.number().min(0).optional(),
  price_max: z.coerce.number().min(0).optional(),
  bedrooms_min: z.coerce.number().int().min(0).optional(),
  bedrooms_max: z.coerce.number().int().min(0).optional(),
  location_id: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyFilterInput = z.infer<typeof propertyFilterSchema>;
