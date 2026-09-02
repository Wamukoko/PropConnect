import { isFeatureEnabled } from "@/lib/feature-flags";

export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Sends an email through the configured provider.
 * Returns { sent: false, reason } when disabled or unconfigured.
 */
export async function sendEmail(message: EmailMessage): Promise<{
  sent: boolean;
  reason?: string;
}> {
  if (!isFeatureEnabled("EMAIL")) {
    return { sent: false, reason: "EMAIL feature disabled" };
  }
  if (!process.env.OPTIONAL_EMAIL_PROVIDER_KEY) {
    return { sent: false, reason: "Email provider not configured" };
  }

  const provider = process.env.EMAIL_PROVIDER || "generic";

  // Provider-abstracted. The generic adapter uses a simple HTTP webhook-style
  // endpoint when configured, otherwise returns unsent.
  const endpoint = process.env.EMAIL_ENDPOINT;
  if (!endpoint) {
    return { sent: false, reason: `Email provider '${provider}' requires EMAIL_ENDPOINT` };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPTIONAL_EMAIL_PROVIDER_KEY}`,
      },
      body: JSON.stringify(message),
    });
    return { sent: res.ok };
  } catch {
    return { sent: false, reason: "Email delivery failed" };
  }
}
