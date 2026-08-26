***
generated_from:
  - Prompt.md
last_updated: 2026-08-26
***

# Integration Contracts — PropConnect

## Meta WhatsApp Cloud API

### Base URL

```text
https://graph.facebook.com/{graph_api_version}
```

Default version: `v18.0`

### Authentication

```text
Authorization: Bearer {access_token}
```

Access token is per-whatsapp_account, stored as `access_token_ref` in the database.

### Webhook verification (GET)

**Endpoint:** `GET /api/webhook/whatsapp/verify`

**Meta sends:**
```text
hub.mode=subscribe
hub.verify_token={verify_token}
hub.challenge={challenge}
```

**Expected response:**
- If `verify_token` matches: return the `challenge` value as plain text, HTTP 200
- If not: HTTP 403

### Webhook POST

**Endpoint:** `POST /api/webhook/whatsapp`

**Request headers:**
```text
X-Hub-Signature-256: sha256={hmac_signature}
Content-Type: application/json
```

**Request body structure:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "{whatsapp_business_account_id}",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "...",
              "phone_number_id": "..."
            },
            "contacts": [...],
            "messages": [...],
            "statuses": [...]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**PropConnect must:**
1. Read raw body exactly once
2. Verify `X-Hub-Signature-256` using HMAC-SHA256 with app_secret
3. Check buffer lengths before timingSafeEqual
4. Parse JSON
5. Durably ingest the event (store in webhook_events)
6. Return HTTP 200 immediately
7. Traverse every entry → every change → every message/status
8. Process inbound messages and status callbacks separately
9. Use provider_message_id for idempotency

**Must NOT do synchronously in webhook handler:**
- Media downloads
- AI calls
- Email sends
- Catalog synchronization
- Broadcasts
- Expensive matching
- Long-running notifications

### Send text message

**Endpoint:** `POST /{phone_number_id}/messages`

**Request:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{customer_phone}",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "Message text"
  }
}
```

**Response (success):**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "wa_id": "..." }],
  "messages": [{ "id": "wamid.xxx" }]
}
```

**Response (error):**
```json
{
  "error": {
    "message": "...",
    "type": "...",
    "code": 400,
    "error_subcode": "...",
    "fbtrace_id": "..."
  }
}
```

### Send template message

**Endpoint:** `POST /{phone_number_id}/messages`

**Request:**
```json
{
  "messaging_product": "whatsapp",
  "to": "{customer_phone}",
  "type": "template",
  "template": {
    "name": "{template_name}",
    "language": { "code": "en" },
    "components": [...]
  }
}
```

### Send interactive message (list)

**Endpoint:** `POST /{phone_number_id}/messages`

**Request:**
```json
{
  "messaging_product": "whatsapp",
  "to": "{customer_phone}",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": { "type": "text", "text": "Header" },
    "body": { "text": "Body text" },
    "action": {
      "button": "Choose",
      "sections": [
        {
          "title": "Section",
          "rows": [
            { "id": "row_1", "title": "Option 1", "description": "Description" }
          ]
        }
      ]
    }
  }
}
```

### Status callback

**Inbound from Meta (via webhook POST):**
```json
{
  "statuses": [
    {
      "id": "wamid.xxx",
      "status": "sent" | "delivered" | "read" | "failed",
      "timestamp": "...",
      "recipient_id": "...",
      "errors": [
        {
          "code": 131047,
          "title": "...",
          "message": "...",
          "error_data": { "details": "..." }
        }
      ]
    }
  ]
}
```

**PropConnect maps:**
- `sent` → outbound_messages.status = 'sent'
- `delivered` → outbound_messages.status = 'delivered'
- `read` → outbound_messages.status = 'read'
- `failed` → outbound_messages.status = 'failed' + record error_code

### Template management

**List templates:** `GET /{waba_id}/message_templates`

**Create template:** `POST /{waba_id}/message_templates`

Note: Templates must be approved by Meta before use. Template approval is a manual Meta Business process, not an API operation.

### Rate limits

- Messaging limit tiers: 250, 1K, 10K, 100K conversations per 24 hours
- Quality rating affects tier progression
- Rate limit errors (429) are transient — retry with exponential backoff
- PropConnect must monitor quality rating and messaging limit via API

---

## Google Contacts API (P1)

### Base URL

```text
https://people.googleapis.com/v1
```

### Authentication

OAuth 2.0 flow:
1. Redirect to Google consent screen
2. Receive authorization code
3. Exchange for access token + refresh token
4. Store tokens per-account (encrypted)
5. Refresh before expiry

**Scopes:**
```text
https://www.googleapis.com/auth/contacts.readonly
https://www.googleapis.com/auth/contacts
```

### List connections

**Endpoint:** `GET /people/me/connections`

**Parameters:**
- `personFields`: names,phoneNumbers,emailAddresses,organizations,addresses,biographies,photos
- `pageSize`: 100 (max)
- `pageToken`: for pagination

**Response:**
```json
{
  "connections": [
    {
      "resourceName": "people/c1234567890",
      "etag": "...",
      "names": [{ "displayName": "..." }],
      "phoneNumbers": [{ "value": "+254..." }],
      "emailAddresses": [{ "value": "..." }]
    }
  ],
  "nextPageToken": "..."
}
```

### PropConnect sync rules

- PropConnect is the system of record — Google is an endpoint
- Use `contact_external_ids` with provider = 'google_contacts' to prevent duplicates
- Conflict rules: PropConnect wins on shared fields unless explicitly configured
- Sync runs asynchronously via durable job queue
- Per-account disconnect/revoke flow must clear external IDs and tokens
- Sync status visible in integration settings

---

## OpenRouter API (P2)

### Base URL

```text
https://openrouter.ai/api/v1
```

### Authentication

```text
Authorization: Bearer {openrouter_api_key}
```

### Chat completion

**Endpoint:** `POST /chat/completions`

**Request:**
```json
{
  "model": "mistralai/mistral-7b-instruct:free",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "max_tokens": 1000
}
```

### PropConnect AI usage rules

- AI is advisory only — dashboard display only
- AI never sends WhatsApp messages autonomously
- AI never books viewings
- AI never mutates CRM fields
- AI never deletes records
- AI output stored separately from agent-confirmed data
- AI calls use durable ai_jobs queue
- Sensitive data excluded from AI context: ID documents, proof-of-funds, secrets, signed URLs
- Phone/name exposure minimized; pseudonymize where practical
- Structured outputs validated with Zod before storage

### AI use cases (P2)

| Use case | Input | Output |
|---|---|---|
| Conversation summary | Message history | Text summary |
| Field extraction | Message text | Structured suggestions (budget, location, type) |
| Lead priority explanation | Lead data + scoring | Natural language explanation |
| Next-best-action | Lead state + timeline | Action suggestion |
| Reply draft | Conversation context | Draft message text |
| Semantic search | Natural language query | Matching CRM records |

---

## Supabase Edge Functions

### Purpose

Edge Functions handle:
- Webhook ingestion (fast response, durable storage)
- Outbound message sending (worker)
- Google Contacts sync (worker)
- AI copilot processing (worker)
- Scheduled cleanup jobs

### Deployment

```bash
supabase functions deploy webhook-ingest
supabase functions deploy outbound-worker
supabase functions deploy sync-worker
```

### Webhook Ingest Function

**Trigger:** Meta WhatsApp webhook POST
**Behavior:** Parse, verify, store event, return 200
**Timeout:** Must complete within Supabase Edge Function timeout (default 60s)
**Environment:** Has access to SUPABASE_SERVICE_ROLE_KEY (server-side only)

### Outbound Worker Function

**Trigger:** pg_cron or manual invocation
**Behavior:** Claim queued jobs, send via WhatsApp API, update status
**Batch size:** Maximum 20 jobs per invocation
**Concurrency:** FOR UPDATE SKIP LOCKED prevents double-claiming

### Sync Worker Function

**Trigger:** pg_cron or manual invocation
**Behavior:** Sync contacts with Google Contacts API
**Concurrency:** Per-account locking to prevent parallel sync for same account
