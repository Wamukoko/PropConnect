import { describe, it, expect, beforeAll } from "vitest";
import { generateCorrelationId } from "@/lib/whatsapp/webhook";
import crypto from "crypto";

describe("webhook signature verification", () => {
  // Import the real implementation
  let verifyWebhookSignature: (body: string, signature: string | null, secret: string) => boolean;

  beforeAll(async () => {
    const mod = await import("@/lib/whatsapp/webhook");
    verifyWebhookSignature = mod.verifyWebhookSignature;
  });

  it("valid signature passes", () => {
    const secret = "test-secret";
    const body = '{"test":"data"}';
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const signature = `sha256=${hmac}`;

    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("tampered body fails", () => {
    const secret = "test-secret";
    const body = '{"test":"data"}';
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const signature = `sha256=${hmac}`;

    expect(verifyWebhookSignature(body + "tampered", signature, secret)).toBe(false);
  });

  it("wrong secret fails", () => {
    const secret = "test-secret";
    const body = '{"test":"data"}';
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const signature = `sha256=${hmac}`;

    expect(verifyWebhookSignature(body, signature, "wrong-secret")).toBe(false);
  });

  it("null signature fails", () => {
    expect(verifyWebhookSignature("body", null, "secret")).toBe(false);
  });

  it("empty signature fails", () => {
    expect(verifyWebhookSignature("body", "", "secret")).toBe(false);
  });

  it("missing sha256= prefix fails", () => {
    const secret = "test-secret";
    const body = '{"test":"data"}';
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyWebhookSignature(body, hmac, secret)).toBe(false);
  });
});

describe("correlation ID generation", () => {
  it("generates unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateCorrelationId());
    }
    expect(ids.size).toBe(100);
  });

  it("generates wh_ format", () => {
    const id = generateCorrelationId();
    const regex = /^wh_\d+_[0-9a-f]{16}$/;
    expect(regex.test(id)).toBe(true);
  });
});
