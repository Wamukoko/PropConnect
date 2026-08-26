import { createAdminClient } from "@/lib/supabase/admin";

const CONVERSATION_STATES = [
  "idle", "choosing_intent", "choosing_listing_type",
  "choosing_property_type", "choosing_budget", "choosing_area",
  "awaiting_location", "matching_properties", "showing_results",
  "choosing_property", "choosing_viewing_date", "choosing_viewing_slot",
  "awaiting_confirmation", "completed", "human_handoff",
  "opted_out", "expired",
] as const;

export type ConversationState = typeof CONVERSATION_STATES[number];

interface StateTransition {
  from: ConversationState;
  to: ConversationState;
  valid: boolean;
}

const VALID_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  idle: ["choosing_intent", "expired", "opted_out", "human_handoff"],
  choosing_intent: ["choosing_listing_type", "choosing_property_type", "expired", "opted_out", "human_handoff"],
  choosing_listing_type: ["choosing_property_type", "choosing_budget", "expired", "opted_out", "human_handoff"],
  choosing_property_type: ["choosing_budget", "expired", "opted_out", "human_handoff"],
  choosing_budget: ["choosing_area", "matching_properties", "expired", "opted_out", "human_handoff"],
  choosing_area: ["awaiting_location", "matching_properties", "expired", "opted_out", "human_handoff"],
  awaiting_location: ["matching_properties", "expired", "opted_out", "human_handoff"],
  matching_properties: ["showing_results", "expired", "human_handoff"],
  showing_results: ["choosing_property", "choosing_intent", "completed", "expired", "human_handoff"],
  choosing_property: ["choosing_viewing_date", "showing_results", "expired", "human_handoff"],
  choosing_viewing_date: ["choosing_viewing_slot", "choosing_property", "expired", "human_handoff"],
  choosing_viewing_slot: ["awaiting_confirmation", "choosing_viewing_date", "expired", "human_handoff"],
  awaiting_confirmation: ["completed", "choosing_viewing_slot", "expired", "human_handoff"],
  completed: ["idle"],
  human_handoff: ["idle"],
  opted_out: ["idle"],
  expired: ["idle"],
};

export function canTransition(from: ConversationState, to: ConversationState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextStates(current: ConversationState): ConversationState[] {
  return VALID_TRANSITIONS[current] || [];
}

interface StartSessionParams {
  accountId: string;
  leadId: string;
  whatsappAccountId?: string;
  language?: string;
}

export async function startConversation(params: StartSessionParams): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("conversation_sessions")
    .insert({
      account_id: params.accountId,
      lead_id: params.leadId,
      whatsapp_account_id: params.whatsappAccountId || null,
      state: "choosing_intent",
      language: params.language || "en",
      collected_filters: {},
      version: 1,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Failed to start conversation session");
  }

  return data.id;
}

interface AdvanceParams {
  sessionId: string;
  newState: ConversationState;
  filters?: Record<string, any>;
}

export async function advanceConversation(params: AdvanceParams): Promise<void> {
  const supabase = createAdminClient();

  const { data: session, error: fetchError } = await supabase
    .from("conversation_sessions")
    .select("state, version, collected_filters")
    .eq("id", params.sessionId)
    .single();

  if (fetchError || !session) {
    throw new Error("Session not found");
  }

  if (!canTransition(session.state as ConversationState, params.newState)) {
    throw new Error(`Invalid transition: ${session.state} → ${params.newState}`);
  }

  const mergedFilters = {
    ...(typeof session.collected_filters === "object" ? session.collected_filters : {}),
    ...(params.filters || {}),
  };

  const { error: updateError } = await supabase
    .from("conversation_sessions")
    .update({
      state: params.newState,
      collected_filters: mergedFilters,
      version: session.version + 1,
      last_interaction_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.sessionId)
    .eq("version", session.version);

  if (updateError) {
    throw new Error("Optimistic lock conflict — session was modified");
  }
}

export async function expireStaleSessions(maxAgeMinutes: number = 30): Promise<number> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("conversation_sessions")
    .update({
      state: "expired",
      updated_at: new Date().toISOString(),
    })
    .in("state", [
      "choosing_intent", "choosing_listing_type", "choosing_property_type",
      "choosing_budget", "choosing_area", "awaiting_location",
      "matching_properties", "showing_results", "choosing_property",
      "choosing_viewing_date", "choosing_viewing_slot", "awaiting_confirmation",
    ])
    .lt("last_interaction_at", cutoff)
    .select("id");

  return data?.length || 0;
}

export async function getActiveSession(leadId: string): Promise<any | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("conversation_sessions")
    .select("*")
    .eq("lead_id", leadId)
    .not("state", "in", "(completed,expired,opted_out,human_handoff)")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data || null;
}
