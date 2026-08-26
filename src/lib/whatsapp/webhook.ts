import crypto from "crypto";

export function verifyWebhookSignature(
  body: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader) return false;

  const expectedPrefix = "sha256=";
  if (!signatureHeader.startsWith(expectedPrefix)) return false;

  const signatureHex = signatureHeader.slice(expectedPrefix.length);
  if (signatureHex.length !== 64) return false;

  const signatureBytes = Buffer.from(signatureHex, "hex");
  if (signatureBytes.length !== 32) return false;

  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(body, "utf8");
  const expectedBytes = hmac.digest();

  return crypto.timingSafeEqual(signatureBytes, expectedBytes);
}

export function generateCorrelationId(): string {
  return `wh_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}
