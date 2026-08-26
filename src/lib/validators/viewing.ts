import { z } from "zod";

export const viewingStatusSchema = z.enum([
  "requested", "confirmed", "completed", "cancelled", "rescheduled", "no_show",
]);

export const createViewingSchema = z.object({
  property_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  agent_id: z.string().uuid().optional(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  notes: z.string().optional(),
}).refine(
  (data) => new Date(data.end_at) > new Date(data.start_at),
  { message: "end_at must be after start_at" }
);

export const updateViewingSchema = z.object({
  status: viewingStatusSchema.optional(),
  cancelled_reason: z.string().optional(),
  notes: z.string().optional(),
  agent_id: z.string().uuid().nullable().optional(),
});

export const rescheduleViewingSchema = z.object({
  new_start_at: z.string().datetime(),
  new_end_at: z.string().datetime(),
  reason: z.string().optional(),
}).refine(
  (data) => new Date(data.new_end_at) > new Date(data.new_start_at),
  { message: "new_end_at must be after new_start_at" }
);

export const availabilityQuerySchema = z.object({
  property_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.coerce.number().int().min(15).max(240).default(30),
});

export const viewingFilterSchema = z.object({
  status: viewingStatusSchema.optional(),
  property_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateViewingInput = z.infer<typeof createViewingSchema>;
export type UpdateViewingInput = z.infer<typeof updateViewingSchema>;
export type RescheduleViewingInput = z.infer<typeof rescheduleViewingSchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type ViewingFilterInput = z.infer<typeof viewingFilterSchema>;
