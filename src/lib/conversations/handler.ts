import { createAdminClient } from "@/lib/supabase/admin";
import {
  startConversation,
  advanceConversation,
  getActiveSession,
  getNextStates,
  type ConversationState,
} from "./state-machine";
import { matchProperties, formatPropertyRecommendation } from "./matching";
import { sendInteractiveList, sendTextMessage } from "@/lib/whatsapp/client";

interface HandleMessageParams {
  accountId: string;
  leadId: string;
  whatsappAccountId: string;
  leadPhone: string;
  messageBody: string;
}

export async function handleIncomingMessage(params: HandleMessageParams): Promise<void> {
  const supabase = createAdminClient();
  const { accountId, leadId, whatsappAccountId, leadPhone, messageBody } = params;

  const session = await getActiveSession(leadId);

  if (!session) {
    // Start a new conversation
    const sessionId = await startConversation({
      accountId,
      leadId,
      whatsappAccountId,
    });

    await sendIntentMenu(leadPhone, sessionId);
    return;
  }

  const state = session.state as ConversationState;

  switch (state) {
    case "choosing_intent":
      await handleIntentChoice(supabase, session, messageBody, leadPhone);
      break;
    case "choosing_listing_type":
      await handleListingTypeChoice(supabase, session, messageBody, leadPhone);
      break;
    case "choosing_property_type":
      await handlePropertyTypeChoice(supabase, session, messageBody, leadPhone);
      break;
    case "choosing_budget":
      await handleBudgetChoice(supabase, session, messageBody, leadPhone);
      break;
    case "choosing_area":
      await handleAreaChoice(supabase, session, messageBody, leadPhone);
      break;
    case "showing_results":
      await handlePropertyChoice(supabase, session, messageBody, leadPhone);
      break;
    case "completed":
    case "expired":
    case "opted_out":
      // Start fresh
      const newSessionId = await startConversation({
        accountId,
        leadId,
        whatsappAccountId,
      });
      await sendIntentMenu(leadPhone, newSessionId);
      break;
    default:
      break;
  }
}

async function sendIntentMenu(phone: string, sessionId: string): Promise<void> {
  await sendInteractiveList({
    to: phone,
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
  phone: string
): Promise<void> {
  const intent = body.toLowerCase().trim();

  if (intent.includes("buy")) {
    await advanceConversation({
      sessionId: session.id,
      newState: "choosing_property_type",
      filters: { intent: "buy" },
    });
    await sendPropertyTypeMenu(phone);
  } else if (intent.includes("rent")) {
    await advanceConversation({
      sessionId: session.id,
      newState: "choosing_property_type",
      filters: { intent: "rent" },
    });
    await sendPropertyTypeMenu(phone);
  } else if (intent.includes("sell")) {
    await advanceConversation({
      sessionId: session.id,
      newState: "human_handoff",
      filters: { intent: "sell" },
    });
    await sendTextMessage({
      to: phone,
      text: "Great! One of our agents will reach out to help you sell your property. Thank you!",
    });
  } else {
    await sendTextMessage({
      to: phone,
      text: "Sorry, I didn't understand. Please choose from the options.",
    });
    await sendIntentMenu(phone, session.id);
  }
}

async function sendPropertyTypeMenu(phone: string): Promise<void> {
  await sendInteractiveList({
    to: phone,
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
  phone: string
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

    await sendTextMessage({
      to: phone,
      text: "What is your budget range?\n\nReply with a number (e.g., 50000) for max budget, or type 'skip'.",
    });
  } else {
    await sendTextMessage({
      to: phone,
      text: "Please choose a valid property type from the menu.",
    });
    await sendPropertyTypeMenu(phone);
  }
}

async function handleListingTypeChoice(
  supabase: ReturnType<typeof createAdminClient>,
  session: any,
  body: string,
  phone: string
): Promise<void> {
  // Not used directly — listing type comes from intent
  await sendPropertyTypeMenu(phone);
}

async function handleBudgetChoice(
  supabase: ReturnType<typeof createAdminClient>,
  session: any,
  body: string,
  phone: string
): Promise<void> {
  const trimmed = body.toLowerCase().trim();

  if (trimmed === "skip" || trimmed === "any") {
    const filters = typeof session.collected_filters === "object" ? session.collected_filters : {};
    await advanceConversation({
      sessionId: session.id,
      newState: "choosing_area",
      filters,
    });
    await sendAreaMenu(phone);
    return;
  }

  const budget = parseInt(trimmed.replace(/[^0-9]/g, ""));
  if (isNaN(budget) || budget <= 0) {
    await sendTextMessage({
      to: phone,
      text: "Please enter a valid budget number (e.g., 50000) or type 'skip'.",
    });
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

  await sendAreaMenu(phone);
}

async function sendAreaMenu(phone: string): Promise<void> {
  await sendInteractiveList({
    to: phone,
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
  phone: string
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

    await sendTextMessage({
      to: phone,
      text: "Sorry, no properties match your criteria at the moment. We'll notify you when new listings are available.",
    });
    return;
  }

  // Send top 3 matches
  for (let i = 0; i < matchResult.properties.length; i++) {
    const prop = matchResult.properties[i];
    await sendTextMessage({
      to: phone,
      text: `${i + 1}. ${formatPropertyRecommendation(prop)}`,
    });
  }

  await advanceConversation({
    sessionId: session.id,
    newState: "showing_results",
    filters: updatedFilters,
  });

  if (matchResult.properties.length === 1) {
    await sendTextMessage({
      to: phone,
      text: "Reply '1' to request a viewing, or 'menu' to start a new search.",
    });
  } else {
    await sendTextMessage({
      to: phone,
      text: `Reply with the number (1-${matchResult.properties.length}) to request a viewing, or 'menu' to start a new search.`,
    });
  }
}

async function handlePropertyChoice(
  supabase: ReturnType<typeof createAdminClient>,
  session: any,
  body: string,
  phone: string
): Promise<void> {
  const trimmed = body.toLowerCase().trim();

  if (trimmed === "menu" || trimmed === "start" || trimmed === "new") {
    await advanceConversation({
      sessionId: session.id,
      newState: "idle",
    });
    await sendIntentMenu(phone, session.id);
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

    await sendTextMessage({
      to: phone,
      text: "Great choice! What date would you like to view the property?\n\nReply with a date (e.g., 'tomorrow', 'Saturday', '2024-03-15').",
    });
  } else {
    await sendTextMessage({
      to: phone,
      text: "Please reply with a valid number or 'menu' to start a new search.",
    });
  }
}
