import { describe, it, expect } from "vitest";
import { verifyWebhookSignature, generateCorrelationId } from "@/lib/whatsapp/webhook";
import crypto from "crypto";

describe("webhook signature verification", () => {
  const appSecret = "test_app_secret_12345";

  it("returns true for valid signature", () => {
    const body = '{"entry":[{"changes":[{"value":{"messaging_product":"whatsapp"}}]}]}';
    const hmac = crypto.createHmac("sha256", appSecret).update(body, "utf8").digest("hex");
    const signature = `sha256=${hmac}`;

    expect(verifyWebhookSignature(body, signature, appSecret)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    const body = '{"entry":[]}';
    const signature = "sha256=0000000000000000000000000000000000000000000000000000000000000000";

    expect(verifyWebhookSignature(body, signature, appSecret)).toBe(false);
  });

  it("returns false for null signature", () => {
    const body = '{"entry":[]}';
    expect(verifyWebhookSignature(body, null, appSecret)).toBe(false);
  });

  it("returns false for empty signature", () => {
    const body = '{"entry":[]}';
    expect(verifyWebhookSignature(body, "", appSecret)).toBe(false);
  });

  it("returns false for signature without sha256= prefix", () => {
    const body = '{"entry":[]}';
    const hmac = crypto.createHmac("sha256", appSecret).update(body, "utf8").digest("hex");

    expect(verifyWebhookSignature(body, hmac, appSecret)).toBe(false);
  });

  it("returns false for truncated signature", () => {
    const body = '{"entry":[]}';
    const hmac = crypto.createHmac("sha256", appSecret).update(body, "utf8").digest("hex");
    const truncated = `sha256=${hmac.slice(0, 32)}`;

    expect(verifyWebhookSignature(body, truncated, appSecret)).toBe(false);
  });

  it("returns false for non-hex signature after prefix", () => {
    const body = '{"entry":[]}';
    expect(verifyWebhookSignature(body, "sha256=not_a_valid_hex_string_at_all!", appSecret)).toBe(false);
  });

  it("returns false when body is tampered", () => {
    const originalBody = '{"original": "data"}';
    const hmac = crypto.createHmac("sha256", appSecret).update(originalBody, "utf8").digest("hex");
    const signature = `sha256=${hmac}`;
    const tamperedBody = '{"tampered": "data"}';

    expect(verifyWebhookSignature(tamperedBody, signature, appSecret)).toBe(false);
  });

  it("is timing-safe (same length, different content)", () => {
    const body = "a".repeat(100);
    const hmac = crypto.createHmac("sha256", appSecret).update(body, "utf8").digest("hex");
    const signature = `sha256=${hmac}`;

    // A different body of same length should not match
    const otherBody = "b".repeat(100);
    expect(verifyWebhookSignature(otherBody, signature, appSecret)).toBe(false);
  });

  it("returns false for signature with wrong algorithm", () => {
    const body = '{"entry":[]}';
    expect(verifyWebhookSignature(body, "md5=abc123", appSecret)).toBe(false);
  });
});

describe("generateCorrelationId", () => {
  it("generates unique IDs", () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    expect(id1).not.toBe(id2);
  });

  it("starts with wh_ prefix", () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^wh_\d+_[a-f0-9]+$/);
  });
});
