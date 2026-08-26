export type MessageType = "text" | "image" | "video" | "audio" | "document" | "location" | "interactive" | "template" | "system";

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WebhookContact[];
    messages?: WebhookMessage[];
    statuses?: WebhookStatus[];
  };
  field: string;
}

export interface WebhookContact {
  profile: { name: string };
  wa_id: string;
}

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  video?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  interactive?: {
    type: string;
    button?: { text: string; payload: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  context?: { from: string; id: string };
}

export interface WebhookStatus {
  id: string;
  recipient_id: string;
  timestamp: string;
  status: "sent" | "delivered" | "read" | "failed";
  errors?: { code: number; title: string; message: string; error_data?: { details: string } }[];
}

export interface ParsedWebhook {
  accountId: string | null;
  whatsappAccountId: string | null;
  phoneNumberId: string;
  providerEventId: string;
  messages: ParsedMessage[];
  statuses: ParsedStatus[];
  contacts: { waId: string; name: string }[];
}

export interface ParsedMessage {
  waMessageId: string;
  from: string;
  timestamp: string;
  type: MessageType;
  content: Record<string, any>;
  contextFrom?: string;
  contextId?: string;
}

export interface ParsedStatus {
  waMessageId: string;
  recipientId: string;
  timestamp: string;
  status: "sent" | "delivered" | "read" | "failed";
  errors?: { code: number; title: string; message: string }[];
}

export function parseWebhookPayload(payload: any): ParsedWebhook {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  const messages: ParsedMessage[] = [];
  const statuses: ParsedStatus[] = [];
  const contacts: { waId: string; name: string }[] = [];

  if (value?.messages) {
    for (const msg of value.messages) {
      const type = mapMessageType(msg.type);
      const content = extractContent(msg);

      messages.push({
        waMessageId: msg.id,
        from: msg.from,
        timestamp: msg.timestamp,
        type,
        content,
        contextFrom: msg.context?.from,
        contextId: msg.context?.id,
      });
    }
  }

  if (value?.statuses) {
    for (const status of value.statuses) {
      statuses.push({
        waMessageId: status.id,
        recipientId: status.recipient_id,
        timestamp: status.timestamp,
        status: status.status,
        errors: status.errors,
      });
    }
  }

  if (value?.contacts) {
    for (const contact of value.contacts) {
      contacts.push({
        waId: contact.wa_id,
        name: contact.profile?.name || "",
      });
    }
  }

  return {
    accountId: null,
    whatsappAccountId: null,
    phoneNumberId: value?.metadata?.phone_number_id || "",
    providerEventId: generateProviderEventId(payload),
    messages,
    statuses,
    contacts,
  };
}

function mapMessageType(type: string): MessageType {
  const map: Record<string, MessageType> = {
    text: "text",
    image: "image",
    video: "video",
    audio: "audio",
    document: "document",
    location: "location",
    interactive: "interactive",
    template: "template",
  };
  return map[type] || "system";
}

function extractContent(msg: WebhookMessage): Record<string, any> {
  switch (msg.type) {
    case "text":
      return { body: msg.text?.body || "" };
    case "image":
      return { id: msg.image?.id, mime_type: msg.image?.mime_type, caption: msg.image?.caption };
    case "video":
      return { id: msg.video?.id, mime_type: msg.video?.mime_type, caption: msg.video?.caption };
    case "audio":
      return { id: msg.audio?.id, mime_type: msg.audio?.mime_type };
    case "document":
      return { id: msg.document?.id, mime_type: msg.document?.mime_type, filename: msg.document?.filename, caption: msg.document?.caption };
    case "location":
      return { latitude: msg.location?.latitude, longitude: msg.location?.longitude, name: msg.location?.name, address: msg.location?.address };
    case "interactive":
      return {
        type: msg.interactive?.type,
        button_text: msg.interactive?.button?.text,
        button_payload: msg.interactive?.button?.payload,
        list_id: msg.interactive?.list_reply?.id,
        list_title: msg.interactive?.list_reply?.title,
      };
    default:
      return {};
  }
}

function generateProviderEventId(payload: any): string {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  const msgId = value?.messages?.[0]?.id;
  const statusId = value?.statuses?.[0]?.id;

  if (msgId) return `msg_${msgId}`;
  if (statusId) return `status_${statusId}`;

  return `evt_${Date.now()}_${JSON.stringify(payload).slice(0, 50)}`;
}
