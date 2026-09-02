/**
 * Contact deduplication and merge utilities.
 * Handles phone normalization, duplicate detection, and merge workflows.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type PhoneCountryCode = "+254" | "+255" | "+256" | "+250" | string;

/**
 * Normalize a Kenyan phone number to E.164 format.
 * Handles various input formats:
 * - 0712345678 → +254712345678
 * - 254712345678 → +254712345678
 * - +254712345678 → +254712345678
 * - 712345678 → +254712345678
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("254")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `+254${digits}`;
  }

  return `+${digits}`;
}

/**
 * Normalize an email address for deduplication.
 * Lowercases and trims whitespace.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

export interface DuplicateCheckResult {
  duplicate: boolean;
  existingContactId?: string;
  matchType: "phone" | "email" | "both" | "none";
}

/**
 * Check if a contact with the given phone/email already exists.
 */
export async function checkForDuplicate(
  supabase: SupabaseClient,
  accountId: string,
  phone: string,
  email: string | null | undefined
): Promise<DuplicateCheckResult> {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);

  // Check phone match
  const { data: phoneMatch } = await supabase
    .from("contacts")
    .select("id")
    .eq("account_id", accountId)
    .eq("normalized_phone", normalizedPhone)
    .limit(1)
    .single();

  if (phoneMatch) {
    return { duplicate: true, existingContactId: phoneMatch.id, matchType: "phone" };
  }

  // Check email match
  if (normalizedEmail) {
    const { data: emailMatch } = await supabase
      .from("contacts")
      .select("id")
      .eq("account_id", accountId)
      .eq("email", normalizedEmail)
      .limit(1)
      .single();

    if (emailMatch) {
      return { duplicate: true, existingContactId: emailMatch.id, matchType: "email" };
    }
  }

  return { duplicate: false, matchType: "none" };
}

export type MergeStrategy = "skip" | "update" | "create_separate";

export interface MergeDecision {
  strategy: MergeStrategy;
  targetContactId: string;
}

/**
 * Merge two contacts by updating the target with non-empty fields from the source.
 * The target contact is updated; the source contact is archived.
 */
export async function mergeContacts(
  supabase: SupabaseClient,
  accountId: string,
  targetId: string,
  sourceId: string
): Promise<{ success: boolean; error?: string }> {
  // Fetch both contacts
  const { data: target } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", targetId)
    .eq("account_id", accountId)
    .single();

  const { data: source } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", sourceId)
    .eq("account_id", accountId)
    .single();

  if (!target || !source) {
    return { success: false, error: "One or both contacts not found" };
  }

  // Merge: prefer target values, fill in from source where target is empty
  const merged: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  const fields = [
    "first_name", "last_name", "display_name", "phone", "email",
    "company", "job_title", "contact_type", "notes",
  ];

  for (const field of fields) {
    if (!target[field] && source[field]) {
      merged[field] = source[field];
    }
  }

  // Always prefer the source's normalized_phone if target doesn't have one
  if (!target.normalized_phone && source.normalized_phone) {
    merged.normalized_phone = source.normalized_phone;
  }

  // Update target
  const { error: updateError } = await supabase
    .from("contacts")
    .update(merged)
    .eq("id", targetId)
    .eq("account_id", accountId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Archive the source contact
  await supabase
    .from("contacts")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", sourceId)
    .eq("account_id", accountId);

  return { success: true };
}
