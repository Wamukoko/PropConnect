import { createAdminClient } from "@/lib/supabase/admin";
import {
  startConversation,
  advanceConversation,
  getActiveSession,
  type ConversationState,
} from "./state-machine";
import { matchProperties, formatPropertyRecommendation } from "./matching";
import { enqueueMessage } from "@/lib/whatsapp/outbound";

interface HandleMessageParams {
  accountId: string;
  leadId: string;
  whatsappAccountId: string;
  leadPhone: string;
  messageBody: string;
}

interface SendCtx {
  accountId: string;
  leadId: string;
  whatsappAccountId: string;
}

interface ListOptions {
  body: string;
  button: string;
  sections: {
    title: string;
    rows: { id: string; title: string; description?: string }[];
  }[];
}

async function sendText(ctx: SendCtx, text: string): Promise<void> {
  await enqueueMessage({
    accountId: ctx.accountId,
    leadId: ctx.leadId,
    whatsappAccountId: ctx.whatsappAccountId,
    jobType: "text",
    payload: { text },
  });
}

async function sendList(ctx: SendCtx, options: ListOptions): Promise<void> {
  await enqueueMessage({
    accountId: ctx.accountId,
    leadId: ctx.leadId,
    whatsappAccountId: ctx.whatsappAccountId,
    jobType: "interactive",
    payload: options,
  });
}

export async function handleIncomingMessage(params: HandleMessageParams): Promise<void> {
  const supabase = createAdminClient();
  const { accountId, leadId, whatsappAccountId, messageBody } = params;
  const ctx: SendCtx = { accountId, leadId, whatsappAccountId };

  const session = await getActiveSession(leadId);

  if (!session) {
    // Start a new conversation
    const sessionId = await startConversation({
      accountId,
      leadId,
      whatsappAccountId,
    });

    await sendIntentMenu(ctx, sessionId);
    return;
  }

  const state = session.state as ConversationState;

  switch (state) {
    case "choosing_intent":
      await handleIntentChoice(supabase, session, messageBody, ctx);
      break;
    case "choosing_listing_type":
      await handleListingTypeChoice(supabase, session, messageBody, ctx);
      break;
    case "choosing_property_type":
      await handlePropertyTypeChoice(supabase, session, messageBody, ctx);
      break;
    case "choosing_budget":
      await handleBudgetChoice(supabase, session, messageBody, ctx);
      break;
    case "choosing_area":
      await handleAreaChoice(supabase, session, messageBody, ctx);
      break;
    case "showing_results":
      await handlePropertyChoice(supabase, session, messageBody, ctx);
      break;
    case "idle":
    case "completed":
    case "expired":
    case "opted_out":
      // Start fresh
      const newSessionId = await startConversation({
        accountId,
        leadId,
        whatsappAccountId,
      });
      await sendIntentMenu(ctx, newSessionId);
      break;
    default:
      break;
  }
}

async function sendIntentMenu(ctx: SendCtx, sessionId: string): Promise<void> {
  await sendList(ctx, {
    body: "Welcome to PropConnect! What are you looking for?",
    button: "Choose",
    sections: [
      {
        title: "What do you need?",
        rows: [
          { id: "buy", title: "Buy Property", description: "I want to purchase a property" },
          { id: "rent", title: "Rent Property", description: "I want to rent a property" },
          { id: "sell", title: "Sell Property", description: "I want to sell my property" },
        ],
      },
    ],
  });
}

async function handleIntentChoice(
  supabase: ReturnType<typeof createAdminClient>,
  session: any,
  body: string,
  ctx: SendCtx
): Promise<void> {
  const intent = body.toLowerCase().trim();

  if (intent.includes("buy")) {
    await advanceConversation({
      sessionId: session.id,
      newState: "choosing_property_type",
      filters: { intent: "buy" },
    });
    await sendPropertyTypeMenu(ctx);
  } else if (intent.includes("rent")) {
    await advanceConversation({
      sessionId: session.id,
      newState: "choosing_property_type",
      filters: { intent: "rent" },
    });
    await sendPropertyTypeMenu(ctx);
  } else if (intent.includes("sell")) {
    await advanceConversation({
      sessionId: session.id,
      newState: "human_handoff",
      filters: { intent: "sell" },
    });
    await sendText(ctx, "Great! One of our agents will reach out to help you sell your property. Thank you!");
  } else {
    await sendText(ctx, "Sorry, I didn't understand. Please choose from the options.");
    await sendIntentMenu(ctx, session.id);
  }
}

async function sendPropertyTypeMenu(ctx: SendCtx): Promise<void> {
  await sendList(ctx, {
    body: "What type of property are you looking for?",
    button: "Choose",
    sections: [
      {
        title: "Property Type",
        rows: [
          { id: "apartment", title: "Apartment" },
          { id: "house", title: "House" },
          { id: "townhouse", title: "Townhouse" },
          { id: "villa", title: "Villa" },
          { id: "land", title: "Land" },
          { id: "office", title: "Office" },
          { id: "shop", title: "Shop" },
        ],
      },
    ],
  });
}

async function handlePropertyTypeChoice(
  supabase: ReturnType<typeof createAdminClient>,
  session: any,
  body: string,
  ctx: SendCtx
): Promise<void> {
  const type = body.toLowerCase().trim();
  const validTypes = [
    "apartment", "house", "townhouse", "villa", "maisonette",
    "land", "office", "shop", "warehouse", "commercial", "serviced_apartment",
  ];

  if (validTypes.includes(type)) {
    const filters = typeof session.collected_filters === "object" ? session.collected_filters : {};
    await advanceConversation({
      sessionId: session.id,
      newState: "choosing_budget",
      filters: { ...filters, property_type: type },
    });

    await sendText(ctx, "What is your budget range?\n\nReply with a number (e.g., 50000) for max budget, or type 'skip'.");
  } else {
    await sendText(ctx, "Please choose a valid property type from the menu.");
    await sendPropertyTypeMenu(ctx);
  }
}

async function handleListingTypeChoice(
  supabase: ReturnType<typeof createAdminClient>,
  session: any,
  body: string,
  ctx: SendCtx
): Promise<void> {
  // Not used directly — listing type comes from intent
  await sendPropertyTypeMenu(ctx);
}

async function handleBudgetChoice(
  supabase: ReturnType<typeof createAdminClient>,
  session: any,
  body: string,
  ctx: SendCtx
): Promise<void> {
  const trimmed = body.toLowerCase().trim();

  if (trimmed === "skip" || trimmed === "any") {
    const filters = typeof session.collected_filters === "object" ? session.collected_filters : {};
    await advanceConversation({
      sessionId: session.id,
      newState: "choosing_area",
      filters,
    });
    await sendAreaMenu(ctx);
    return;
  }

  const budget = parseInt(trimmed.replace(/[^0-9]/g, ""));
  if (isNaN(budget) || budget <= 0) {
    await sendText(ctx, "Please enter a valid budget number (e.g., 50000) or type 'skip'.");
    return;
  }

  const filters = typeof session.collected_filters === "object" ? session.collected_filters : {};
  const intent = filters.intent || "rent";
  const listingType = intent === "buy" ? "sale" : "rent";

  await advanceConversation({
    sessionId: session.id,
    newState: "choosing_area",
    filters: {
      ...filters,
      listing_type: listingType,
      budget_max: budget,
    },
  });

  await sendAreaMenu(ctx);
}

async function sendAreaMenu(ctx: SendCtx): Promise<void> {
  await sendList(ctx, {
    body: "Which area do you prefer?",
    button: "Choose",
    sections: [
      {
        title: "Nairobi Areas",
        rows: [
          { id: "kilimani", title: "Kilimani" },
          { id: "westlands", title: "Westlands" },
          { id: "karen", title: "Karen" },
          { id: "lavington", title: "Lavington" },
          { id: "langata", title: "Langata" },
          { id: "kiambu", title: "Kiambu" },
          { id: "any", title: "Any Area" },
        ],
      },
    ],
  });
}

async function handleAreaChoice(
  supabase: ReturnType<typeof createAdminClient>,
  session: any,
  body: string,
  ctx: SendCtx
): Promise<void> {
  const area = body.toLowerCase().trim();
  const filters = typeof session.collected_filters === "object" ? session.collected_filters : {};

  const updatedFilters = {
    ...filters,
    preferred_area: area === "any" ? undefined : area,
  };

  // Move to matching
  await advanceConversation({
    sessionId: session.id,
    newState: "matching_properties",
    filters: updatedFilters,
  });

  // Run matching
  const matchResult = await matchProperties(session.account_id, {
    listing_type: updatedFilters.listing_type,
    property_type: updatedFilters.property_type,
    budget_max: updatedFilters.budget_max,
    preferred_area: updatedFilters.preferred_area,
  }, 3);

  if (matchResult.properties.length === 0) {
    await advanceConversation({
      sessionId: session.id,
      newState: "showing_results",
      filters: updatedFilters,
    });

    await sendText(ctx, "Sorry, no properties match your criteria at the moment. We'll notify you when new listings are available.");
    return;
  }

  // Send top 3 matches
  for (let i = 0; i < matchResult.properties.length; i++) {
    const prop = matchResult.properties[i];
    await sendText(ctx, `${i + 1}. ${formatPropertyRecommendation(prop)}`);
  }

  await advanceConversation({
    sessionId: session.id,
    newState: "showing_results",
    filters: updatedFilters,
  });

  if (matchResult.properties.length === 1) {
    await sendText(ctx, "Reply '1' to request a viewing, or 'menu' to start a new search.");
  } else {
    await sendText(ctx, `Reply with the number (1-${matchResult.properties.length}) to request a viewing, or 'menu' to start a new search.`);
  }
}

async function handlePropertyChoice(
  supabase: ReturnType<typeof createAdminClient>,
  session: any,
  body: string,
  ctx: SendCtx
): Promise<void> {
  const trimmed = body.toLowerCase().trim();

  if (trimmed === "menu" || trimmed === "start" || trimmed === "new") {
    await advanceConversation({
      sessionId: session.id,
      newState: "idle",
    });
    await sendIntentMenu(ctx, session.id);
    return;
  }

  const choice = parseInt(trimmed);
  if (!isNaN(choice) && choice >= 1 && choice <= 3) {
    await advanceConversation({
      sessionId: session.id,
      newState: "choosing_viewing_date",
      filters: {
        ...(typeof session.collected_filters === "object" ? session.collected_filters : {}),
        selected_index: choice - 1,
      },
    });

    await sendText(ctx, "Great choice! What date would you like to view the property?\n\nReply with a date (e.g., 'tomorrow', 'Saturday', '2024-03-15').");
  } else {
    await sendText(ctx, "Please reply with a valid number or 'menu' to start a new search.");
  }
}
