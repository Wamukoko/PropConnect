***
generated_from:
  - Prompt.md
last_updated: 2026-08-26
***

# Environments — PropConnect

## Environment overview

| Environment | Purpose | Supabase | Vercel | WhatsApp |
|---|---|---|---|---|
| **Local development** | Active development and debugging | `supabase start` (local) | `next dev` | WhatsApp test numbers |
| **Preview (per-PR)** | Review changes before merge | Supabase staging project | Vercel preview deployment | WhatsApp sandbox |
| **Staging** | Pre-production validation | Supabase staging project | Vercel preview/production | WhatsApp sandbox |
| **Production** | Live system | Supabase production project | Vercel production | WhatsApp production |

## Local development

### Setup requirements

- Node.js 18+
- Supabase CLI (`supabase start`)
- Git

### Configuration

```text
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
SUPABASE_SERVICE_ROLE_KEY=<local service role key>

# WhatsApp test configuration (Meta test mode)
WHATSAPP_ACCESS_TOKEN=<test token>
WHATSAPP_PHONE_ID=<test phone number ID>
WHATSAPP_BUSINESS_ACCOUNT_ID=<test WABA ID>
WHATSAPP_VERIFY_TOKEN=<local verify token>
WHATSAPP_APP_SECRET=<test app secret>
WHATSAPP_GRAPH_API_VERSION=v18.0

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional providers (disabled by default in local)
# OPTIONAL_EMAIL_PROVIDER_KEY=
# OPTIONAL_MAPS_PROVIDER_KEY=
# OPTIONAL_AI_PROVIDER_KEY=
```

### Feature flags (local defaults)

```text
FEATURE_CONTACT_GOOGLE_SYNC=false
FEATURE_CONTACT_VCF=true
FEATURE_CONTACT_CSV=true
FEATURE_CATALOG_SYNC=false
FEATURE_DOCUMENTS=false
FEATURE_EMAIL=false
FEATURE_BROADCASTS=false
FEATURE_AI=false
FEATURE_MAP_MATCHING=false
FEATURE_PUBLIC_LISTINGS=true
FEATURE_ANALYTICS=true
```

### Local behavior

- Supabase local runs on localhost:54321
- Migrations run via `supabase db reset`
- Edge Functions run locally via `supabase functions serve`
- WhatsApp webhook can be exposed via ngrok or similar for Meta test webhook
- Auth uses local Supabase Auth UI

## Preview (per-PR)

### Trigger

Every push to a non-main branch creates a Vercel preview deployment.

### Configuration

- Uses Supabase staging project (separate from production)
- Feature flags set to match staging defaults
- WhatsApp sandbox numbers only
- No production data

### Purpose

- Review UI changes in a deployed environment
- Validate database migrations against staging schema
- Test integration flows without affecting production

## Staging

### Setup

- Separate Supabase project (staging)
- Vercel preview or dedicated staging domain
- WhatsApp sandbox phone number
- Same feature flags as production (or close)

### Configuration

```text
NEXT_PUBLIC_SUPABASE_URL=<staging supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging anon key>
SUPABASE_SERVICE_ROLE_KEY=<staging service role key>

WHATSAPP_ACCESS_TOKEN=<sandbox token>
WHATSAPP_PHONE_ID=<sandbox phone number ID>
WHATSAPP_BUSINESS_ACCOUNT_ID=<sandbox WABA ID>
WHATSAPP_VERIFY_TOKEN=<staging verify token>
WHATSAPP_APP_SECRET=<sandbox app secret>
WHATSAPP_GRAPH_API_VERSION=v18.0

NEXT_PUBLIC_APP_URL=<staging URL>

# Optional providers (disabled unless testing)
# OPTIONAL_AI_PROVIDER_KEY=<openrouter key for testing>
```

### Purpose

- Full integration testing with real Supabase (not local)
- WhatsApp sandbox testing with Meta
- Migration validation
- Performance testing
- Pre-production sign-off

### Data

- Seeded with test data (not production data)
- Test accounts: Qabila Realtors (primary), Test Agency (white-label verification)
- Test properties, leads, contacts pre-loaded

## Production

### Setup

- Supabase production project
- Vercel production deployment
- WhatsApp production phone number and WABA
- All feature flags as intended for launch

### Configuration

```text
NEXT_PUBLIC_SUPABASE_URL=<production supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production anon key>
SUPABASE_SERVICE_ROLE_KEY=<production service role key>

WHATSAPP_ACCESS_TOKEN=<production token>
WHATSAPP_PHONE_ID=<production phone number ID>
WHATSAPP_BUSINESS_ACCOUNT_ID=<production WABA ID>
WHATSAPP_VERIFY_TOKEN=<production verify token>
WHATSAPP_APP_SECRET=<production app secret>
WHATSAPP_GRAPH_API_VERSION=v18.0

NEXT_PUBLIC_APP_URL=<production URL>

# Optional providers (configured as available)
# OPTIONAL_AI_PROVIDER_KEY=<openrouter key>
# OPTIONAL_EMAIL_PROVIDER_KEY=
# OPTIONAL_MAPS_PROVIDER_KEY=
```

### Feature flags (production)

```text
FEATURE_CONTACT_GOOGLE_SYNC=false    # P1
FEATURE_CONTACT_VCF=true
FEATURE_CONTACT_CSV=true
FEATURE_CATALOG_SYNC=false           # P2
FEATURE_DOCUMENTS=false              # P2
FEATURE_EMAIL=false                  # P2
FEATURE_BROADCASTS=false             # P2
FEATURE_AI=false                     # P2
FEATURE_MAP_MATCHING=false           # P1
FEATURE_PUBLIC_LISTINGS=true
FEATURE_ANALYTICS=true               # P1
```

### Secrets management

- All secrets in Vercel environment variables
- Service role key restricted to server-side only
- WhatsApp tokens restricted to server-side only
- No secrets in git, logs, or client bundles
- Future: migrate to Vercel Encrypted Environment Variables or external secret manager

### Monitoring

- Vercel Analytics and Speed Insights
- Supabase Dashboard (database, auth, storage metrics)
- System Health dashboard at `/system-health`
- WhatsApp quality rating and messaging limit monitoring

## Environment variable reference

| Variable | Local | Staging | Production | Client |
|---|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Yes | Yes | Yes | Yes |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | Yes | Yes | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Yes | Yes | No (server only) |
| WHATSAPP_ACCESS_TOKEN | Yes | Yes | Yes | No |
| WHATSAPP_PHONE_ID | Yes | Yes | Yes | No |
| WHATSAPP_BUSINESS_ACCOUNT_ID | Yes | Yes | Yes | No |
| WHATSAPP_VERIFY_TOKEN | Yes | Yes | Yes | No |
| WHATSAPP_APP_SECRET | Yes | Yes | Yes | No |
| WHATSAPP_GRAPH_API_VERSION | Yes | Yes | Yes | No |
| NEXT_PUBLIC_APP_URL | Yes | Yes | Yes | Yes |
| OPTIONAL_AI_PROVIDER_KEY | Optional | Optional | Optional | No |
| OPTIONAL_EMAIL_PROVIDER_KEY | Optional | Optional | Optional | No |
| OPTIONAL_MAPS_PROVIDER_KEY | Optional | Optional | Optional | No |
