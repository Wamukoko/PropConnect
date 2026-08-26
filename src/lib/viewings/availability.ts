import { createAdminClient } from "@/lib/supabase/admin";

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface AvailabilityResult {
  date: string;
  slots: TimeSlot[];
  workingHours: { start: string; end: string } | null;
  isBlackout: boolean;
}

export async function getAvailability(
  accountId: string,
  propertyId: string,
  dateStr: string,
  durationMinutes: number = 30
): Promise<AvailabilityResult> {
  const supabase = createAdminClient();
  const date = new Date(dateStr + "T00:00:00Z");
  const dayOfWeek = date.getUTCDay();

  // Check blackout
  const { data: blackout } = await supabase
    .from("blackout_dates")
    .select("id")
    .eq("account_id", accountId)
    .eq("date", dateStr)
    .single();

  if (blackout) {
    return { date: dateStr, slots: [], workingHours: null, isBlackout: true };
  }

  // Get working hours for this day
  const { data: wh } = await supabase
    .from("working_hours")
    .select("start_time, end_time, slot_duration_minutes, buffer_minutes")
    .eq("account_id", accountId)
    .eq("day_of_week", dayOfWeek)
    .single();

  if (!wh) {
    return { date: dateStr, slots: [], workingHours: null, isBlackout: false };
  }

  // Generate slots
  const slotDuration = wh.slot_duration_minutes || durationMinutes;
  const buffer = wh.buffer_minutes || 15;
  const totalSlotMinutes = slotDuration + buffer;

  const startMinutes = timeToMinutes(wh.start_time);
  const endMinutes = timeToMinutes(wh.end_time);
  const slots: TimeSlot[] = [];

  for (let m = startMinutes; m + slotDuration <= endMinutes; m += totalSlotMinutes) {
    const slotStart = minutesToTime(m);
    const slotEnd = minutesToTime(m + slotDuration);

    slots.push({
      start: `${dateStr}T${slotStart}:00Z`,
      end: `${dateStr}T${slotEnd}:00Z`,
      available: true,
    });
  }

  // Get existing viewings for this property on this date
  const dayStart = `${dateStr}T00:00:00Z`;
  const dayEnd = `${dateStr}T23:59:59Z`;

  const { data: existingViewings } = await supabase
    .from("viewings")
    .select("start_at, end_at")
    .eq("property_id", propertyId)
    .gte("start_at", dayStart)
    .lte("start_at", dayEnd)
    .not("status", "in", "(cancelled,rescheduled)");

  // Mark overlapping slots as unavailable
  if (existingViewings?.length) {
    for (const slot of slots) {
      for (const viewing of existingViewings) {
        const vStart = new Date(viewing.start_at).getTime();
        const vEnd = new Date(viewing.end_at).getTime();
        const sStart = new Date(slot.start).getTime();
        const sEnd = new Date(slot.end).getTime();

        if (sStart < vEnd && sEnd > vStart) {
          slot.available = false;
          break;
        }
      }
    }
  }

  // Filter out slots in the past (minimum notice: 2 hours)
  const now = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const filteredSlots = slots.filter((slot) => new Date(slot.start) > now);

  return {
    date: dateStr,
    slots: filteredSlots,
    workingHours: { start: wh.start_time, end: wh.end_time },
    isBlackout: false,
  };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function formatSlotForWhatsApp(slot: TimeSlot, timezone: string = "Africa/Nairobi"): string {
  const start = new Date(slot.start);
  const end = new Date(slot.end);

  const startTimeStr = start.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });
  const endTimeStr = end.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });

  return `${startTimeStr} - ${endTimeStr}`;
}
