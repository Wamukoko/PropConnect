const GRAPH_API_URL = "https://graph.facebook.com";

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
}

export interface TextMessage {
  to: string;
  text: string;
}

export interface TemplateMessage {
  to: string;
  templateName: string;
  language: string;
  components?: Record<string, any>[];
}

export interface InteractiveListMessage {
  to: string;
  header?: { type: "text"; text: string };
  body: string;
  button: string;
  sections: {
    title: string;
    rows: { id: string; title: string; description?: string }[];
  }[];
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: { code: number; message: string; subcode?: string };
}

export function getConfig(): WhatsAppConfig {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_ID!,
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || "v18.0",
  };
}

export async function sendTextMessage(params: TextMessage): Promise<SendResult> {
  const config = getConfig();
  const url = `${GRAPH_API_URL}/${config.graphApiVersion}/${config.phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "text",
        text: { preview_url: false, body: params.text },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: {
          code: data.error?.code || res.status,
          message: data.error?.message || "Unknown error",
          subcode: data.error?.error_subcode,
        },
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 0,
        message: error instanceof Error ? error.message : "Network error",
      },
    };
  }
}

export async function sendTemplateMessage(
  params: TemplateMessage
): Promise<SendResult> {
  const config = getConfig();
  const url = `${GRAPH_API_URL}/${config.graphApiVersion}/${config.phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.to,
        type: "template",
        template: {
          name: params.templateName,
          language: { code: params.language },
          ...(params.components && { components: params.components }),
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: {
          code: data.error?.code || res.status,
          message: data.error?.message || "Unknown error",
          subcode: data.error?.error_subcode,
        },
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 0,
        message: error instanceof Error ? error.message : "Network error",
      },
    };
  }
}

export async function sendInteractiveList(
  params: InteractiveListMessage
): Promise<SendResult> {
  const config = getConfig();
  const url = `${GRAPH_API_URL}/${config.graphApiVersion}/${config.phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.to,
        type: "interactive",
        interactive: {
          type: "list",
          ...(params.header && { header: params.header }),
          body: { text: params.body },
          action: {
            button: params.button,
            sections: params.sections,
          },
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: {
          code: data.error?.code || res.status,
          message: data.error?.message || "Unknown error",
          subcode: data.error?.error_subcode,
        },
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 0,
        message: error instanceof Error ? error.message : "Network error",
      },
    };
  }
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return `+${digits}`;
  if (digits.startsWith("0")) return `+254${digits.slice(1)}`;
  return `+${digits}`;
}

export function redactPhone(phone: string): string {
  if (phone.length <= 6) return "*".repeat(phone.length);
  const keep = 3;
  const masked = phone.length - keep * 2;
  return phone.slice(0, keep) + "*".repeat(masked) + phone.slice(-keep);
}
