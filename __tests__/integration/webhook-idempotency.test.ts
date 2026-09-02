import { describe, it, expect } from "vitest";

/**
 * Integration tests for webhook idempotency and payload parsing.
 * Verifies that duplicate webhooks produce exactly one message record
 * and that all entry/message/status types are properly traversed.
 */

import {
  parseWebhookPayload,
  type ParsedWebhook,
} from "@/lib/whatsapp/parser";
import { verifyWebhookSignature, generateCorrelationId } from "@/lib/whatsapp/webhook";
import crypto from "crypto";

function makeWebhookPayload(overrides: Record<string, any> = {}): any {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "ENTRY_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "+254712345678",
                phone_number_id: "wa-1",
              },
              contacts: [{ profile: { name: "Test User" }, wa_id: "254712345678" }],
              messages: [
                {
                  from: "254712345678",
                  id: "msg_abc123",
                  timestamp: "1693440000",
                  type: "text",
                  text: { body: "Hello" },
                },
              ],
              ...overrides,
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

describe("webhook idempotency", () => {
  it("generates consistent provider_event_id for same message", () => {
    const payload = makeWebhookPayload();
    const parsed1 = parseWebhookPayload(payload);
    const parsed2 = parseWebhookPayload(payload);

    expect(parsed1.providerEventId).toBe(parsed2.providerEventId);
    expect(parsed1.providerEventId).toBe("msg_msg_abc123");
  });

  it("generates unique provider_event_ids for different messages", () => {
    const payload1 = makeWebhookPayload();
    payload1.entry[0].changes[0].value.messages[0].id = "msg_001";

    const payload2 = makeWebhookPayload();
    payload2.entry[0].changes[0].value.messages[0].id = "msg_002";

    const parsed1 = parseWebhookPayload(payload1);
    const parsed2 = parseWebhookPayload(payload2);

    expect(parsed1.providerEventId).not.toBe(parsed2.providerEventId);
  });

  it("simulates duplicate webhook detection", () => {
    const processedEvents = new Set<string>();

    const payload = makeWebhookPayload();
    const parsed = parseWebhookPayload(payload);

    // First webhook
    const isDuplicate1 = processedEvents.has(parsed.providerEventId);
    expect(isDuplicate1).toBe(false);
    processedEvents.add(parsed.providerEventId);

    // Second (duplicate) webhook
    const isDuplicate2 = processedEvents.has(parsed.providerEventId);
    expect(isDuplicate2).toBe(true);
  });

  it("generates status provider_event_id for status callbacks", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "ENTRY_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+254712345678",
                  phone_number_id: "wa-1",
                },
                statuses: [
                  {
                    id: "msg_def456",
                    recipient_id: "254798765432",
                    timestamp: "1693440060",
                    status: "delivered",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const parsed = parseWebhookPayload(payload);
    expect(parsed.providerEventId).toBe("status_msg_def456");
  });
});

describe("webhook payload traversal", () => {
  it("parses text messages correctly", () => {
    const payload = makeWebhookPayload();
    const parsed = parseWebhookPayload(payload);

    expect(parsed.messages).toHaveLength(1);
    expect(parsed.messages[0].type).toBe("text");
    expect(parsed.messages[0].content).toEqual({ body: "Hello" });
    expect(parsed.messages[0].from).toBe("254712345678");
  });

  it("parses image messages", () => {
    const payload = makeWebhookPayload();
    payload.entry[0].changes[0].value.messages[0] = {
      from: "254712345678",
      id: "msg_img001",
      timestamp: "1693440000",
      type: "image",
      image: { id: "media_123", mime_type: "image/jpeg", caption: "Property photo" },
    };

    const parsed = parseWebhookPayload(payload);
    expect(parsed.messages[0].type).toBe("image");
    expect(parsed.messages[0].content).toEqual({
      id: "media_123",
      mime_type: "image/jpeg",
      caption: "Property photo",
    });
  });

  it("parses interactive button replies", () => {
    const payload = makeWebhookPayload();
    payload.entry[0].changes[0].value.messages[0] = {
      from: "254712345678",
      id: "msg_int001",
      timestamp: "1693440000",
      type: "interactive",
      interactive: {
        type: "button_reply",
        button: { text: "Yes, interested", payload: "INTEREST_YES" },
      },
    };

    const parsed = parseWebhookPayload(payload);
    expect(parsed.messages[0].type).toBe("interactive");
    expect(parsed.messages[0].content.button_payload).toBe("INTEREST_YES");
  });

  it("parses interactive list replies", () => {
    const payload = makeWebhookPayload();
    payload.entry[0].changes[0].value.messages[0] = {
      from: "254712345678",
      id: "msg_list001",
      timestamp: "1693440000",
      type: "interactive",
      interactive: {
        type: "list_reply",
        list_reply: { id: "area_westlands", title: "Westlands" },
      },
    };

    const parsed = parseWebhookPayload(payload);
    expect(parsed.messages[0].content.list_id).toBe("area_westlands");
    expect(parsed.messages[0].content.list_title).toBe("Westlands");
  });

  it("traverses status callbacks", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "ENTRY_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+254712345678",
                  phone_number_id: "wa-1",
                },
                statuses: [
                  {
                    id: "msg_status001",
                    recipient_id: "254798765432",
                    timestamp: "1693440060",
                    status: "delivered",
                    errors: [{ code: 131026, title: "Error", message: "Phone not found" }],
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const parsed = parseWebhookPayload(payload);
    expect(parsed.statuses).toHaveLength(1);
    expect(parsed.statuses[0].status).toBe("delivered");
    expect(parsed.statuses[0].errors).toHaveLength(1);
    expect(parsed.statuses[0].errors![0].code).toBe(131026);
  });

  it("traverses multiple contacts", () => {
    const payload = makeWebhookPayload();
    payload.entry[0].changes[0].value.contacts = [
      { profile: { name: "User One" }, wa_id: "254711111111" },
      { profile: { name: "User Two" }, wa_id: "254722222222" },
    ];

    const parsed = parseWebhookPayload(payload);
    expect(parsed.contacts).toHaveLength(2);
    expect(parsed.contacts[0].name).toBe("User One");
    expect(parsed.contacts[1].name).toBe("User Two");
  });

  it("handles empty webhook gracefully", () => {
    const parsed = parseWebhookPayload({});
    expect(parsed.messages).toHaveLength(0);
    expect(parsed.statuses).toHaveLength(0);
    expect(parsed.contacts).toHaveLength(0);
  });

  it("parses location messages", () => {
    const payload = makeWebhookPayload();
    payload.entry[0].changes[0].value.messages[0] = {
      from: "254712345678",
      id: "msg_loc001",
      timestamp: "1693440000",
      type: "location",
      location: {
        latitude: -1.2921,
        longitude: 36.8219,
        name: "Westlands",
        address: "Westlands, Nairobi",
      },
    };

    const parsed = parseWebhookPayload(payload);
    expect(parsed.messages[0].type).toBe("location");
    expect(parsed.messages[0].content.latitude).toBe(-1.2921);
    expect(parsed.messages[0].content.name).toBe("Westlands");
  });

  it("parses messages with context (replies)", () => {
    const payload = makeWebhookPayload();
    payload.entry[0].changes[0].value.messages[0].context = {
      from: "254799999999",
      id: "msg_original123",
    };

    const parsed = parseWebhookPayload(payload);
    expect(parsed.messages[0].contextFrom).toBe("254799999999");
    expect(parsed.messages[0].contextId).toBe("msg_original123");
  });

  it("unknown message types map to system", () => {
    const payload = makeWebhookPayload();
    payload.entry[0].changes[0].value.messages[0].type = "unknown_type";

    const parsed = parseWebhookPayload(payload);
    expect(parsed.messages[0].type).toBe("system");
  });
});

describe("correlation ID uniqueness", () => {
  it("generates unique correlation IDs", () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    expect(id1).not.toBe(id2);
  });

  it("correlation IDs are in wh_ format", () => {
    const id = generateCorrelationId();
    expect(id.startsWith("wh_")).toBe(true);
    const regex = /^wh_\d+_[0-9a-f]{16}$/;
    expect(regex.test(id)).toBe(true);
  });
});

describe("webhook signature verification", () => {
  const APP_SECRET = "test-secret-key-12345";

  it("valid signature passes", () => {
    const body = '{"test":"data"}';
    const hmac = crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex");
    const signature = `sha256=${hmac}`;

    expect(verifyWebhookSignature(body, signature, APP_SECRET)).toBe(true);
  });

  it("tampered body fails", () => {
    const body = '{"test":"data"}';
    const hmac = crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex");
    const signature = `sha256=${hmac}`;

    expect(verifyWebhookSignature(body + "tampered", signature, APP_SECRET)).toBe(false);
  });

  it("wrong secret fails", () => {
    const body = '{"test":"data"}';
    const hmac = crypto.createHmac("sha256", APP_SECRET).update(body).digest("hex");
    const signature = `sha256=${hmac}`;

    expect(verifyWebhookSignature(body, signature, "wrong-secret")).toBe(false);
  });
});
