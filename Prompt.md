# PropConnect — WhatsApp-First Real Estate Lead-to-Viewing Platform
## Build Specification v3 — White-Label Multi-Tenant, Production-Hardened, Free-Tier-to-Scale

> **Status:** Recommended master build specification
>
> **Primary launch tenant:** Qabila Realtors
>
> **Product thesis:** PropConnect is not merely a WhatsApp CRM. It is a white-label, WhatsApp-first real estate lead-to-viewing platform that connects property inventory, contacts, WhatsApp conversations, structured qualification, property matching, viewing scheduling, agent follow-up and analytics in one system. Qabila Realtors is the platform operator/brand, while each subscribing agency can present the application as its own branded CRM.

---

## 1. Purpose

Build **PropConnect**, beginning with Qabila Realtors as the first tenant, using free-tier infrastructure where practical and preserving a clean path to paid infrastructure and multi-agency SaaS operation without a fundamental rewrite.

The platform must support this core journey:

```text
Property Inventory
       ↓
WhatsApp / Web Enquiry
       ↓
Lead Creation
       ↓
Structured Qualification
       ↓
Property Matching
       ↓
Property Recommendations
       ↓
Viewing Request
       ↓
Viewing Confirmation
       ↓
Agent Follow-up
       ↓
Negotiation / Conversion
       ↓
Analytics + AI Copilot
```

The system must remain useful when optional integrations such as Meta Catalog, email, maps or AI are unavailable.

---

# 2. MASTER BUILD PROMPT

```text
Build "PropConnect" — a WhatsApp-first real estate lead-to-viewing platform for real estate agencies, initially deployed for Qabila Realtors and architected for future multi-agency SaaS operation.

Do not treat this as a generic CRM or generic WhatsApp chatbot. The core product is the complete property-discovery-to-viewing journey:

Property inventory → WhatsApp/web enquiry → lead qualification → matching → property recommendation → viewing request → confirmed viewing → agent follow-up → conversion.

TECH STACK
- Next.js 14+ App Router
- TypeScript
- Supabase Postgres as the system of record
- Supabase Auth
- Supabase Storage with private buckets and signed URLs
- Supabase Edge Functions + Cron/pg_cron for durable background work
- Meta WhatsApp Cloud API directly, without requiring a paid BSP
- Tailwind CSS with a small set of custom components
- Zod for request validation
- PostgreSQL functions/constraints for transactional operations and concurrency control
- Optional P1/P2 integrations behind feature flags

CORE ARCHITECTURAL RULES
1. PostgreSQL is the source of truth for CRM, property inventory, conversations, jobs, consent, viewings and audit history.
2. Every business record belongs to an account/tenant. Never rely on authentication alone for authorization.
3. Introduce a real accounts table. Do not use an unreferenced account_id generated on an agent row.
4. Every WhatsApp number belongs to a whatsapp_accounts record associated with an account.
5. Never place provider secrets in browser bundles or client-side code.
6. The WhatsApp webhook must durably ingest events, be signature verified, be idempotent and return quickly.
7. Never run long loops, broadcasts, contact synchronization, media downloads, AI calls, email sends or catalog synchronization inside a Vercel request.
8. Use durable job queues backed by PostgreSQL and worker functions for asynchronous work.
9. Use explicit conversation state. Never infer transaction state solely from free text or an LLM.
10. Use PostgreSQL constraints/functions to enforce business-critical concurrency rules such as viewing overlap.
11. AI is advisory and dashboard-only. It never autonomously sends, books, changes CRM fields or deletes records.
12. Consent must be explicit, purpose-specific and auditable before marketing communication.
13. Sensitive documents remain private and are accessed only through short-lived signed URLs.
14. Do not silently mock external integrations. If an integration is unavailable, expose a clear degraded state and continue operating with supported fallback behavior.
15. Build P0 completely before P1 and P2.
16. If a feature cannot be completed safely, implement a typed interface, migration, feature flag and documented TODO rather than a fake success path.
17. Treat white-label configuration as tenant data, not hardcoded branding. Every agency must be able to customize its firm name, logo, colors, contact details and optional custom domain without changing application code.
18. The platform operator attribution "Powered by Qabila Realtors" remains visible in the application footer unless the platform owner explicitly changes the policy. It must not be injected into WhatsApp messages, customer-facing email content or property descriptions unless configured.

EXTERNAL DEPENDENCIES
Before coding, identify requirements that depend on:
- Meta Business/Developer configuration
- WhatsApp Phone Number ID
- WhatsApp Business Account
- System User access token
- Meta App Secret
- approved WhatsApp templates
- Meta Catalog/Commerce Manager access
- Google Cloud project + OAuth consent configuration for Google Contacts (P1)
- Supabase quotas/features
- domain/DNS configuration
- optional email provider
- optional maps/geocoding provider
- optional AI provider

The application must continue operating with catalog, email, maps and AI disabled.

MVP PRIORITY
P0 — production-quality core:
1. Database migrations and account-scoped RLS
2. Accounts, agents and tenant boundaries
3. Supabase Auth and protected dashboard
4. WhatsApp account configuration model
5. Signature-verified, fully traversing, idempotent webhook ingestion
6. Lead creation and complete message history
7. Lead timeline
8. Explicit conversation state machine
9. Property CRUD and inventory lifecycle
10. Private property photo storage
11. Deterministic property matching
12. Outbound message logging and provider status processing
13. Durable outbound queue
14. Basic viewing request and concurrency-safe booking
15. Consent/opt-out enforcement
16. System health and operational diagnostics
17. Contact management, CSV import/export and VCF import/export
18. Tenant white-label configuration and branding

P1 — after P0 tests pass:
1. Google Contacts integration and controlled two-way synchronization
2. Advanced location matching
3. Geographic hierarchy
4. Saved searches and alerts
5. Public property listing pages
6. Agent tasks/follow-ups
7. Analytics
8. Lead source attribution
9. Viewing reminders
10. Property availability synchronization within the CRM

P2 — feature flagged:
1. WhatsApp Catalog synchronization
2. Sensitive document capture
3. Email notifications
4. Broadcast campaigns
5. Advanced reporting
6. AI copilot
7. Semantic CRM search
8. External listing/API integrations

Do not thin out P0 to accelerate P1/P2.

BRANDING / WHITE LABEL
PropConnect is a multi-tenant white-label platform operated by Qabila Realtors. The platform must support agency-level branding without forks or code changes.

Each account may configure:
- firm_name
- display_name
- logo
- favicon
- primary_color
- secondary_color
- accent_color
- email
- phone
- physical_address
- website
- social links
- WhatsApp display details
- public listing contact details
- timezone
- currency
- custom domain, when enabled by the platform

Qabila Realtors remains the platform operator. The default attribution is:

"Powered by Qabila Realtors"

This attribution may appear in the authenticated application footer, public-facing tenant pages and other designated platform surfaces. It must remain visually subordinate to the tenant brand. It must never replace the tenant's firm name/logo or be inserted into WhatsApp messages, customer notes, property descriptions or agent communications unless explicitly configured.

DEFAULT QABILA BRAND
- Navy: #182744
- Gold: #B49362
- White: #FFFFFF
- Navy deep: #101B30
- Navy light: #24365C
- Gold muted: #8C7550
- Off-white: #F7F5F1

Define defaults in the Tailwind theme and expose tenant overrides through CSS variables/design tokens. Do not hardcode tenant-specific values in components.

WEB DESIGN
Use a clean, airy, editorial real-estate aesthetic:
- large property photography
- generous whitespace
- navy as dominant brand color
- gold sparingly for accents and CTAs
- white/off-white content surfaces
- confident typography
- no generic admin-template appearance
- responsive mobile-first UI

Web pages should show a centered "Powered by Qabila Realtors" footer where appropriate. Never inject this footer into WhatsApp messages.

TENANCY
Create:
accounts
agents
whatsapp_accounts

All tenant-owned tables must contain account_id and have explicit account-scoped RLS.

A future agency must be able to have:
Account A → WhatsApp A → Agents A → Properties A → Leads A
Account B → WhatsApp B → Agents B → Properties B → Leads B

Do not redesign the database later to introduce tenancy.

PROPERTY MODEL
Separate:
- property_type: apartment, house, townhouse, villa, maisonette, land, office, shop, warehouse, commercial, serviced_apartment, etc.
- listing_type: sale, rent, lease
- listing_status: draft, pending_review, published, available, reserved, under_offer, let, sold, withdrawn, expired, archived

A property must not be treated as publicly available merely because it exists in the database.

LOCATION MODEL
Use a normalized geographic hierarchy where practical:
country → county → city/town → sub_county/municipality → neighbourhood → estate/building

Store property coordinates separately from public-facing location descriptions. Never expose precise customer coordinates publicly.

LEAD TIMELINE
The lead detail screen must have a chronological timeline containing:
- inbound WhatsApp messages
- outbound WhatsApp messages
- property recommendations
- property views/enquiries
- saved properties
- stage changes
- viewing requests
- viewing confirmations
- cancellations/reschedules
- agent notes
- tasks/follow-ups
- consent changes
- important system events

The timeline is a first-class CRM feature, not merely a derived message list.

WEBHOOK RELIABILITY
- Read raw request body exactly once.
- Verify X-Hub-Signature-256 using HMAC-SHA256.
- Check buffer lengths before timingSafeEqual.
- Never log secrets, access tokens, raw authorization headers or sensitive content.
- Traverse every entry, change, message and status object.
- Durably ingest events before slow processing.
- Use unique provider IDs for idempotency.
- Do not use pre-check-then-insert idempotency.
- Process status callbacks separately from inbound messages.
- Store processing state, attempts, errors and timestamps.
- Use correlation IDs.
- Redact phone numbers and message content from logs.
- Malformed/unsupported payloads must be handled safely without leaking secrets.

CONVERSATION STATE
Create an explicit conversation_sessions model.
Suggested states:
idle
choosing_intent
choosing_listing_type
choosing_property_type
choosing_budget
choosing_area
awaiting_location
matching_properties
showing_results
choosing_property
choosing_viewing_date
choosing_viewing_slot
awaiting_confirmation
completed
human_handoff
opted_out
expired

Persist state and version it.

Unknown, expired, duplicate or stale interactive replies must trigger safe recovery rather than guessing.

PROPERTY MATCHING
Matching must initially be deterministic and explainable.
Suggested weighted criteria:
- transaction/listing type
- property type
- budget
- location
- bedrooms
- availability
- optional amenities
- distance when consented location is available

Store match reasons so the agent can understand why a property was recommended.
Do not use AI as the primary matching engine in P0.

VIEWINGS
Store start/end time as UTC.
Display in Africa/Nairobi by default.
Configure:
- working days
- working hours
- slot duration
- buffer
- blackout dates
- minimum notice
- maximum booking horizon

Prevent overlapping bookings for the same property and same agent using PostgreSQL transactional logic/range exclusion, not merely unique timestamp equality.

A viewing request must be confirmed only after the database transaction succeeds.

OUTBOUND QUEUE
Create a durable outbound_jobs table.
Workers must atomically claim jobs using a PostgreSQL transaction/function and row locking such as FOR UPDATE SKIP LOCKED or an equivalent safe mechanism.

Each job must have:
- unique idempotency key
- status
- attempts
- next_attempt_at
- locked_at
- locked_by
- last_error
- provider_message_id
- created_at
- sent_at

At send time:
1. verify lead still exists
2. verify account is active
3. re-check opt-out
4. re-check required consent for marketing
5. verify appropriate WhatsApp message/template rules
6. send
7. persist provider response
8. retry only transient failures

Use bounded batches. Never process an entire campaign in one worker invocation.

CONSENT
Separate consent purposes:
- service_messages
- saved_search_alerts
- broadcasts

Consent records must include:
- purpose
- channel
- source
- exact wording
- policy version
- timestamp
- withdrawal timestamp
- evidence/reference

Marketing opt-in must never be true without the appropriate consent record.

AI COPILOT
AI is P2 and optional.
It can provide:
- conversation summaries
- suggested field extraction
- lead-priority explanations
- next-best-action suggestions
- reply drafts
- semantic CRM search

AI output must be stored separately from agent-confirmed CRM data.
AI must not:
- send WhatsApp messages automatically
- book viewings
- change stages
- overwrite CRM fields
- delete records
- reject customers

All AI calls use a durable ai_jobs queue.
Unknown is preferred over guessing.

PRIVACY
Treat phone numbers, precise coordinates, ID documents, proof-of-funds and message content as protected personal data.
Implement:
- privacy notice
- purpose-specific consent
- data export
- correction workflow
- deletion/anonymization workflow
- configurable retention periods
- access logs for sensitive documents
- configurable controller/contact details
- no public exposure of customer coordinates
- no automatic classification of inbound media as identity documents

MEDIA
Property photos:
- private storage
- server-side validation
- client compression
- thumbnails/display variants
- EXIF stripping
- ordering
- alt text
- soft deletion

Sensitive inbound media:
- official provider download endpoint
- server-side token
- MIME/size validation
- private bucket
- classification by agent/system workflow
- retention policy
- expiring signed URLs
- access audit

PUBLIC LISTINGS
For published listings:
- stable slugs
- canonical URLs
- metadata
- OG tags
- sitemap
- robots.txt
- accurate structured data
- responsive images
- cache invalidation on listing change

Never expose:
- lead counts
- internal notes
- storage paths
- customer data
- exact customer coordinates
- archived/private listings

OBSERVABILITY
System health dashboard should show:
- webhook received/rejected/duplicate/malformed/failed
- oldest unprocessed event
- outbound queue depth
- failed/retrying jobs
- WhatsApp API errors
- catalog sync errors
- storage estimate
- DB growth estimate
- last successful worker run
- outbound kill switch
- stuck jobs
- integration health

TESTING
At minimum test:
- valid/invalid webhook signatures
- truncated signature header
- duplicate webhook under concurrency
- multiple entries/changes/messages/statuses
- status callback without delivered callback
- stale interactive response
- expired conversation
- opt-out enforcement
- consent enforcement
- deterministic matching
- concurrent viewing requests
- overlapping viewing rejection
- timezone conversion
- queue job double-claim prevention
- retry behavior
- permanent failure behavior
- worker restart/resume
- RLS tenant isolation
- signed URL access
- invalid uploads
- archived listings excluded from matching/public pages
- analytics deduplication
- AI output schema validation
- contact import preview and rollback behavior
- tenant-specific branding on authenticated/public surfaces

DEFINITION OF DONE
The application is complete only when:
- migrations run on a clean Supabase project
- RLS tests prove cross-tenant isolation
- dashboard routes are protected server-side
- duplicate signed webhooks are idempotent
- all webhook objects are traversed
- outbound statuses are recorded
- opt-outs cannot receive marketing
- required marketing consent is verified at send time
- concurrent viewings cannot overlap for the same property/agent
- jobs cannot be double-claimed
- private files require expiring signed URLs
- optional integrations can be disabled without breaking P0
- no secret appears in browser code, logs or committed files
- all incomplete features are feature-flagged
- lint, typecheck, unit, integration and E2E tests pass

IMPLEMENTATION METHOD
Before coding:
1. inspect repository/config
2. identify assumptions
3. identify external credentials
4. produce implementation plan
5. identify migrations
6. identify risks

Per milestone:
1. ship migration first
2. update types
3. implement server-side behavior
4. implement UI
5. add tests
6. run lint/typecheck/tests
7. update .env.example
8. document deferred work

Never create fake success paths for real Meta, Supabase Storage, queue or authentication flows.
Use local development adapters only when explicitly gated by an environment variable.
```

---

# 3. Product Architecture

## 3.1 Core modules

```text
PropConnect
│
├── Tenant / Account Management
│   ├── Accounts
│   ├── White-Label Branding
│   ├── Agents
│   ├── Roles
│   ├── Permissions
│   └── Domains
│
├── WhatsApp Integration
│   ├── WhatsApp Accounts
│   ├── Webhook
│   ├── Message Client
│   ├── Templates
│   └── Provider Status
│
├── Property Inventory
│   ├── Properties
│   ├── Locations
│   ├── Photos
│   ├── Availability
│   └── Publishing
│
├── Contacts
│   ├── Contact Directory
│   ├── CSV Import/Export
│   ├── VCF Import/Export
│   ├── Google Contacts Integration
│   ├── Deduplication
│   └── Import History
│
├── Lead CRM
│   ├── Leads
│   ├── Conversations
│   ├── Messages
│   ├── Timeline
│   ├── Tasks
│   ├── Notes
│   └── Consent
│
├── Matching
│   ├── Filters
│   ├── Match Rules
│   ├── Match Results
│   └── Location Matching
│
├── Viewing Management
│   ├── Availability
│   ├── Booking
│   ├── Confirmation
│   ├── Reschedule
│   └── Cancellation
│
├── Campaigns
│   ├── Saved Searches
│   ├── Alerts
│   └── Broadcasts
│
├── Public Listings
│   ├── Listing Pages
│   ├── SEO
│   └── WhatsApp Enquiry
│
├── Operations
│   ├── Job Queues
│   ├── Webhook Health
│   ├── Integration Health
│   └── Audit Logs
│
└── AI Copilot
    ├── Summaries
    ├── Extraction Suggestions
    ├── Lead Prioritization
    ├── Next Actions
    └── Reply Drafts
```

---

# 4. Tenant Model

## 4.1 Accounts

`accounts` is the tenant boundary.

Suggested fields:

```text
id
name
slug
business_name
country
currency
timezone
status
subscription_plan
created_at
updated_at
```

## 4.2 Agents

Every agent belongs to exactly one account initially.

```text
agents
├── id
├── account_id
├── name
├── email
├── role
├── active
├── notify_on_hot_lead
├── hot_lead_threshold
├── created_at
└── updated_at
```

Do not make `account_id` a random UUID with no foreign-key relationship.

---

# 5. Contact Management

Contacts are a first-class CRM object and are separate from leads. A person may exist as a contact before becoming a lead, may have multiple interactions, and may later become a buyer, seller, landlord, tenant, owner, agent or other relationship.

## 5.1 Contact model

```sql
create table contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  first_name text,
  last_name text,
  display_name text,
  phone text,
  normalized_phone text,
  email text,
  company text,
  job_title text,
  address jsonb,
  notes text,
  source text,
  contact_type text,
  owner_agent_id uuid references agents(id),
  avatar_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
```

Suggested contact types:

```text
prospect
lead
customer
buyer
seller
landlord
tenant
property_owner
agent
vendor
other
```

Do not duplicate a person merely because they appear in a different import source. Contact identity must be normalized and deduplicated primarily using account-scoped normalized phone/email identifiers.

## 5.2 Contact external identities

Use a dedicated table to link PropConnect contacts to external systems without making those systems the source of truth.

```text
contact_external_ids
├── id
├── account_id
├── contact_id
├── provider
├── external_contact_id
├── external_etag/version
├── last_synced_at
└── metadata
```

Supported providers initially:
- google_contacts

Future providers can be added through adapters.

## 5.3 CSV import/export

Support: 
- CSV contact import
- CSV contact export
- filtered/bulk export
- UTF-8 CSV
- configurable delimiter handling where practical
- duplicate detection
- field mapping
- validation preview
- import error report
- import history

CSV import workflow:

```text
Upload
  ↓
Parse
  ↓
Map columns
  ↓
Validate
  ↓
Detect duplicates
  ↓
Preview changes
  ↓
Confirm import
  ↓
Create/update contacts
  ↓
Import report
```

The user must be able to choose how possible duplicates are handled:
- merge
- update existing
- create separate
- skip

Imports must be durable jobs for large files and must not block a normal web request.

## 5.4 VCF / vCard import/export

Support:
- .vcf / vCard files
- vCard 3.0
- vCard 4.0 where practical
- multiple contacts per file
- multiple phone numbers
- email addresses
- organization
- job title
- address
- notes
- contact photo where available and permitted

Provide:
- VCF import preview
- field normalization
- duplicate detection
- merge/skip/create choices
- VCF export for one or multiple contacts

## 5.5 Google Contacts

Google Contacts integration is P1. Use OAuth 2.0 with explicit account-level authorization.

Support initially:
- one-time import from Google Contacts
- one-time export from PropConnect to Google Contacts where supported
- controlled two-way synchronization
- connection status
- last sync timestamp
- sync error reporting
- conflict handling
- per-account disconnect/revoke flow

PropConnect remains the system of record for CRM contacts. Google Contacts is an integration endpoint, not the master database.

Use `contact_external_ids` to prevent duplicate creation during synchronization.

Do not silently overwrite CRM values when Google and PropConnect disagree. Define explicit conflict rules and surface unresolved conflicts to the user.

Google synchronization must run asynchronously through a durable integration job queue.

## 5.6 Contact import/export audit

Record:
- user/agent who initiated the operation
- account
- source
- operation type
- file name where applicable
- number of records
- created count
- updated count
- merged count
- skipped count
- failed count
- error report reference
- started/completed timestamps

Contact exports must be account-scoped and must never expose contacts from another tenant.

# 5A. White-Label Configuration

Create an account-level branding/configuration model.

```text
account_branding
├── account_id
├── firm_name
├── display_name
├── logo_storage_path
├── favicon_storage_path
├── primary_color
├── secondary_color
├── accent_color
├── phone
├── email
├── website
├── address
├── social_links
├── public_contact_name
├── public_contact_email
├── public_contact_phone
├── custom_domain
├── custom_domain_status
├── show_powered_by
└── updated_at
```

`show_powered_by` should default to true for tenant accounts. Platform-level policy may prevent tenants from disabling the Qabila attribution.

The UI must load branding dynamically by account and expose design tokens through CSS variables.

A tenant must be able to customize the application without code changes.

Required tenant-branded surfaces:
- dashboard shell
- login/authenticated entry where appropriate
- public property pages
- public enquiry pages
- email templates where email is enabled
- reports/exports where applicable

WhatsApp messages remain governed by the connected WhatsApp Business identity and approved templates; tenant branding must not falsely alter provider identity.

# 5. WhatsApp Account Model

Create a first-class `whatsapp_accounts` table.

```sql
create table whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  business_account_id text,
  phone_number_id text not null,
  display_phone text,
  verified_name text,
  status text not null default 'pending',
  graph_api_version text not null,
  access_token_ref text,
  verify_token_ref text,
  app_secret_ref text,
  quality_rating text,
  messaging_limit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, phone_number_id)
);
```

**Security note:** actual secrets must be stored in the deployment secret manager/environment, not as plaintext database values. `*_ref` fields may contain a provider-specific secret reference if a secret manager is introduced.

---

# 6. Property Architecture

## 6.1 Property transaction model

Separate the concepts:

```text
property_type
├── apartment
├── house
├── townhouse
├── villa
├── maisonette
├── land
├── office
├── shop
├── warehouse
├── commercial
└── serviced_apartment
```

and:

```text
listing_type
├── sale
├── rent
└── lease
```

and:

```text
listing_status
├── draft
├── pending_review
├── published
├── available
├── reserved
├── under_offer
├── let
├── sold
├── withdrawn
├── expired
└── archived
```

## 6.2 Property fields

Recommended fields include:

```text
id
account_id
title
reference_code
description
property_type
listing_type
status
price
currency
bedrooms
bathrooms
floor_area
land_area
furnished
parking_spaces
amenities
location_id
latitude
longitude
public_location_text
availability_date
published_at
archived_at
created_by
updated_by
created_at
updated_at
```

Do not expose precise coordinates on public listing pages unless explicitly intended.

---

# 7. Geographic Model

The system should support structured geography rather than relying only on `area text`.

Recommended hierarchy:

```text
Country
  ↓
County
  ↓
City / Town
  ↓
Sub-county / Municipality
  ↓
Neighbourhood
  ↓
Estate / Building
```

Suggested tables:

```text
locations
location_aliases
```

A property may have:

```text
county = Nairobi
city = Nairobi
neighbourhood = Kilimani
estate/building = Example Apartments
```

This supports deterministic matching and future integration with property intelligence/search systems.

---

# 8. Property Photos

Use a dedicated table:

```sql
create table property_photos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  property_id uuid not null references properties(id),
  storage_path text not null,
  thumbnail_path text,
  alt_text text,
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
```

Required behavior:

- private bucket
- server-side MIME validation
- file-size limits
- image dimension checks
- EXIF stripping
- thumbnail generation
- display-size variant
- ordering
- soft deletion

---

# 9. Lead CRM

## 9.1 Lead model

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  contact_id uuid references contacts(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  wa_id text not null,
  local_phone text,
  name text,
  email text,
  preferred_language text not null default 'en',
  budget_min numeric check (budget_min >= 0),
  budget_max numeric check (budget_max >= 0),
  listing_type listing_type,
  property_type property_type,
  preferred_area text,
  stage lead_stage not null default 'new',
  lead_score int not null default 0,
  source text,
  opted_out boolean not null default false,
  opted_out_at timestamptz,
  last_location_lat double precision,
  last_location_lng double precision,
  location_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, wa_id)
);
```

The CRM-confirmed values in `leads` are authoritative.

AI suggestions must never silently overwrite them.

---

# 10. Lead Timeline

Create a first-class timeline/event model.

Suggested event types:

```text
lead_created
message_received
message_sent
property_viewed
property_enquired
property_saved
property_matched
stage_changed
viewing_requested
viewing_confirmed
viewing_cancelled
viewing_rescheduled
agent_note
agent_task_created
consent_granted
consent_withdrawn
opted_out
handoff_to_agent
```

Every event should contain:

```text
account_id
lead_id
property_id nullable
actor_type
actor_id nullable
event_type
metadata
dedup_key nullable
created_at
```

The timeline must be readable by an agent without requiring them to reconstruct the customer's journey manually from multiple tables.

---

# 11. Conversation State

```sql
create table conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  state conversation_state not null default 'idle',
  language text not null default 'en',
  collected_filters jsonb not null default '{}',
  last_interaction_at timestamptz not null default now(),
  expires_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Only one active session should exist for a lead/account/WhatsApp context unless the product explicitly introduces multiple concurrent conversations.

---

# 12. Message Model

```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  direction message_direction not null,
  type message_type not null,
  content jsonb not null,
  wa_message_id text,
  provider_timestamp timestamptz,
  created_at timestamptz not null default now(),
  unique(whatsapp_account_id, wa_message_id)
);
```

Provider message ID uniqueness is the primary inbound idempotency mechanism.

---

# 13. Webhook Events

Use separate event-level and business-message-level tracking.

```sql
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  provider_event_id text,
  processing_state webhook_processing_state not null default 'received',
  attempts int not null default 0,
  last_error text,
  processed_at timestamptz,
  received_at timestamptz not null default now(),
  raw_payload jsonb
);
```

Raw payload retention must be configurable and automatically purged/anonymized after the operational debugging period.

Normalized messages and business records should have their own retention policy.

---

# 14. Viewing Scheduler

## 14.1 Correct time model

Store:

```text
start_at timestamptz
end_at timestamptz
```

Display in:

```text
Africa/Nairobi
```

unless the account explicitly configures another timezone.

## 14.2 Concurrency model

Do not rely on:

```sql
unique(property_id, scheduled_at)
```

because this does not prevent:

```text
10:00–10:30
10:15–10:45
```

Use PostgreSQL range/exclusion logic or an equivalent transactional database constraint.

Conceptually:

```sql
EXCLUDE USING gist (
  property_id WITH =,
  viewing_range WITH &&
)
WHERE (status IN ('scheduled', 'confirmed'));
```

Apply equivalent protection to agent availability where necessary.

The exact implementation must be validated against the chosen PostgreSQL schema and migration tooling before deployment.

---

# 15. Deterministic Matching Engine

P0 matching must be deterministic and explainable.

Example priority:

```text
1. Available listing
2. Listing type
3. Property type
4. Budget compatibility
5. Geographic compatibility
6. Bedrooms
7. Bathrooms
8. Amenities
9. Distance, if location consent exists
```

Example result:

```text
Property: KIL-0031
Match score: 92

Reasons:
✓ Within rental budget
✓ Preferred property type
✓ Preferred neighbourhood
✓ 3 bedrooms requested / 3 bedrooms available
✓ Available immediately
✓ 1.8 km from consented location
```

The matching engine must never expose internal scoring rules unnecessarily to customers, but the agent should see understandable match reasons.

---

# 16. Saved Searches

```sql
create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  listing_type listing_type,
  property_type property_type,
  budget_min numeric,
  budget_max numeric,
  location_filter jsonb,
  bedrooms_min int,
  amenities jsonb,
  opted_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`opted_in` remains false until an appropriate consent record exists.

Alerts are generated as durable jobs, not synchronously from property CRUD.

---

# 17. Consent

```sql
create table consent_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  purpose consent_purpose not null,
  channel text not null,
  source text,
  wording text not null,
  policy_version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  evidence jsonb
);
```

Purpose-specific consent is mandatory.

The application must distinguish service communication from marketing communication.

---

# 18. Outbound Messaging

## 18.1 Outbound messages

```sql
create table outbound_messages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  message_id uuid references messages(id),
  provider_message_id text,
  template_name text,
  template_version text,
  status outbound_message_status not null default 'queued',
  error_code text,
  attempt_count int not null default 0,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
```

## 18.2 Outbound jobs

```sql
create table outbound_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  lead_id uuid not null references leads(id),
  whatsapp_account_id uuid references whatsapp_accounts(id),
  job_type text not null,
  template_name text,
  language text,
  payload jsonb,
  idempotency_key text not null unique,
  status outbound_job_status not null default 'queued',
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
```

### Job claiming

Worker implementation must atomically claim jobs.

Preferred pattern:

```sql
select *
from outbound_jobs
where status = 'queued'
  and next_attempt_at <= now()
order by created_at
for update skip locked
limit 20;
```

Wrap claim/update in a transaction or use a dedicated PostgreSQL RPC/function.

Do not use a non-transactional select followed by an independent update as the sole locking mechanism.

---

# 19. WhatsApp Webhook Behavior

## Verification

Support Meta's GET verification handshake.

## POST

Process:

```text
raw request body
       ↓
signature verification
       ↓
parse JSON
       ↓
durable event ingestion
       ↓
traverse all entries
       ↓
traverse all changes
       ↓
process all messages
       ↓
process all statuses
       ↓
HTTP 200
```

Slow work is queued.

### Never perform synchronously inside webhook

- media downloads
- AI calls
- email
- catalog synchronization
- broadcasts
- expensive matching
- long-running notifications

---

# 20. Opt-Out Handling

Recognize configured opt-out commands such as:

```text
STOP
UNSUBSCRIBE
OPT OUT
OPTOUT
```

However, the product should not rely only on keyword matching forever. Interactive opt-out and account-configurable language-aware handling should be supported later.

When opted out:

```text
lead.opted_out = true
```

and marketing jobs must be suppressed immediately.

The worker must re-check opt-out immediately before sending.

---

# 21. Public Listings

Public pages should be generated only from properties whose status permits publication.

Required:

- stable slug
- canonical URL
- title
- description
- price
- property type
- listing type
- location summary
- bedrooms/bathrooms where applicable
- photo gallery
- enquiry CTA
- WhatsApp CTA
- structured metadata
- sitemap
- robots.txt

Public pages must never reveal:

- customer information
- lead counts
- internal notes
- storage paths
- sensitive coordinates
- unpublished listings
- archived listings

---

# 22. Agent Dashboard

The dashboard should prioritize the agent's work rather than database administration.

## Main navigation

```text
Dashboard
Contacts
Leads
Properties
Viewings
Messages
Tasks
Saved Searches
Campaigns
Analytics
Integrations
System Health
Settings
```

## Lead screen

A lead detail page should have:

```text
Lead header
├── Name
├── Phone
├── Stage
├── Lead score
├── Source
├── Assigned agent
└── Quick actions

Qualification
├── Intent
├── Listing type
├── Property type
├── Budget
├── Area
├── Bedrooms
└── Timeline

Timeline
├── Messages
├── Property interactions
├── Matches
├── Viewings
├── Tasks
├── Notes
└── Consent events

AI Copilot
├── Summary
├── Suggested fields
├── Priority explanation
└── Next best action
```

AI sections must be visually and semantically separated from confirmed CRM values.

---

# 23. Agent Tasks and Follow-Up

Introduce a simple task model in P1.

Example:

```text
lead_follow_up
call_customer
send_property_options
confirm_viewing
post_viewing_follow_up
request_documents
negotiation_follow_up
```

Tasks should support:

```text
account_id
lead_id
agent_id
type
title
due_at
status
priority
notes
completed_at
created_at
```

This is important because the product's value is not only automation; it is helping the agent convert leads.

---

# 24. Analytics

P1 analytics should focus on the funnel:

```text
Enquiries
   ↓
Qualified Leads
   ↓
Property Matches
   ↓
Property Enquiries
   ↓
Viewing Requests
   ↓
Confirmed Viewings
   ↓
Completed Viewings
   ↓
Negotiations
   ↓
Closed
```

Core metrics:

- leads created
- response time
- qualification rate
- match rate
- property enquiry rate
- viewing conversion
- viewing attendance
- stage conversion
- close rate
- lead source performance
- agent performance
- property performance
- saved-search alert performance

Do not double-count webhook retries or frontend refreshes.

---

# 25. AI Copilot

AI remains P2.

## Allowed

```text
Conversation summary
Field extraction suggestion
Lead priority explanation
Next-best-action suggestion
Reply draft
Natural-language CRM search
```

## Not allowed

```text
Autonomous WhatsApp sending
Autonomous viewing booking
Automatic CRM mutation
Automatic customer rejection
Automatic deletion
Automatic document classification as ID
```

AI data handling:

- exclude ID documents
- exclude proof-of-funds
- exclude secrets
- exclude signed URLs
- minimize phone/name exposure
- pseudonymize where practical
- use provider agreements appropriate to the deployment
- define retention
- support re-run
- validate structured outputs
- require human approval for consequential actions

---

# 26. Security Architecture

## Authentication

Use Supabase Auth.

Every dashboard page and mutation must be protected server-side.

## RLS

Enable RLS on every tenant-owned table.

Policies must effectively implement:

```text
authenticated user
        ↓
agent membership
        ↓
agent.account_id
        ↓
record.account_id
```

Never use:

```sql
auth.role() = 'authenticated'
```

as the sole policy.

## Service role

The service-role key:

- server only
- webhook/worker only where required
- never browser-exposed
- never logged

---

# 27. Data Retention

Implement configurable retention classes.

Example:

```text
Raw webhook payloads      → short operational retention
Messages                  → configurable business retention
Lead records              → business retention
Audit logs                → longer compliance retention
Sensitive documents       → short configurable retention
Precise customer location → minimal necessary retention
AI inputs/outputs         → configurable AI retention
```

Do not retain everything forever simply because storage is inexpensive.

---

# 28. Storage

Use Supabase Storage buckets such as:

```text
property-public-derived
property-private-originals
lead-private-media
lead-sensitive-documents
```

Prefer private originals and generated public-safe variants.

Do not make sensitive documents public.

---

# 29. System Health

Provide `/system-health` for authorized administrators.

Show:

```text
Webhook
├── received
├── rejected
├── malformed
├── duplicate
└── failed

Inbound Queue
├── pending
├── oldest pending
├── failed
└── retrying

Outbound Queue
├── queued
├── processing
├── failed
└── cancelled

WhatsApp
├── API status
├── last successful send
├── error rate
└── quality/rate-limit signals where available

Storage
├── estimated usage
└── growth trend

Database
├── estimated size
└── scheduled-job health

Workers
├── last successful run
├── stuck jobs
└── retry counts
```

Include a global outbound kill switch.

---

# 30. Environment Variables

Example `.env.example` should include placeholders for:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_GRAPH_API_VERSION=

NEXT_PUBLIC_APP_URL=

OPTIONAL_EMAIL_PROVIDER_KEY=
OPTIONAL_MAPS_PROVIDER_KEY=
OPTIONAL_AI_PROVIDER_KEY=
```

Never commit actual credentials.

---

# 31. Deployment Strategy

## Initial deployment

```text
GitHub
  ↓
Vercel
  ↓
Next.js application

Supabase
├── Postgres
├── Auth
├── Storage
├── Cron
└── Edge Functions

Meta
└── WhatsApp Cloud API
```

## Growth path

When usage exceeds free-tier limits, scale individual components rather than redesigning the product.

Possible evolution:

```text
Supabase Postgres
        ↓
Managed Postgres / dedicated infrastructure if required

Supabase Edge Workers
        ↓
Dedicated queue workers if required

Vercel
        ↓
Scale application compute as required

Meta Cloud API
        ↓
Maintain direct API or introduce BSP only if business needs justify it
```

The product must not assume that free-tier limits are permanent.

---

# 32. Feature Flags

At minimum:

```text
FEATURE_CONTACT_GOOGLE_SYNC
FEATURE_CONTACT_VCF
FEATURE_CONTACT_CSV
FEATURE_CATALOG_SYNC
FEATURE_DOCUMENTS
FEATURE_EMAIL
FEATURE_BROADCASTS
FEATURE_AI
FEATURE_MAP_MATCHING
FEATURE_PUBLIC_LISTINGS
FEATURE_ANALYTICS
```

Disabled features must not break the rest of the system.

---

# 33. Acceptance Criteria

## Webhook duplicate

```text
Given a valid signed webhook containing wa_message_id X
And X has already been processed
When Meta delivers X again
Then HTTP 200 is returned
And exactly one message exists for X
And no duplicate business action occurs
```

## Cross-tenant isolation

```text
Given Agent A belongs to Account A
And Property P belongs to Account B
When Agent A requests Property P
Then no record is returned
```

## Opt-out

```text
Given a lead has opted out
And a marketing job exists
When the worker claims the job
Then the job is cancelled
And no WhatsApp marketing message is sent
```

## Consent

```text
Given a lead has no saved-search consent
When a saved-search alert job is processed
Then the job is cancelled
And no marketing message is sent
```

## Viewing overlap

```text
Given Property P has a confirmed viewing from 10:00 to 10:30
When another lead attempts to book 10:15 to 10:45
Then the database rejects the overlapping booking
And the customer receives a slot-unavailable response
```

## Job double-claim

```text
Given two workers process the queue concurrently
When both attempt to claim Job X
Then only one worker obtains the job lease
And Job X is sent at most once according to its idempotency policy
```

## Contact CSV import

```text
Given an account uploads a valid CSV
When the import preview is generated
Then columns can be mapped to contact fields
And duplicate candidates are identified
And no contacts are changed before confirmation
```

## VCF import/export

```text
Given an account uploads a multi-contact VCF file
When the file is processed
Then valid vCards are normalized
And duplicates are identified
And the user can choose merge, create or skip
And a contact export can produce a valid VCF file
```

## Google Contacts

```text
Given an account has authorized Google Contacts
When synchronization runs
Then external contact IDs prevent duplicate creation
And conflicts follow explicit rules
And the sync is isolated to the account
And failures are visible in the integration status
```

## White-label

```text
Given Agency A configures its firm name, logo and colors
When an Agency A user opens the application
Then Agency A branding is displayed
And Agency B branding is never exposed
And the configured Qabila attribution remains where platform policy requires it
```

## AI suggestion

```text
Given AI suggests budget_max = 120000
When the agent has confirmed budget_max = 100000
Then the confirmed CRM value remains 100000
And the AI suggestion remains separately reviewable
```

## Private document

```text
Given a sensitive document exists in private storage
When an unauthorised user requests it
Then access is denied
And no public URL is exposed
```

---

# 34. Testing Strategy

## Unit tests

Test:

- validation
- state transitions
- matching score calculation
- consent rules
- opt-out rules
- retry classification
- timezone calculations
- phone normalization
- property lifecycle rules
- contact normalization
- CSV field mapping
- VCF parsing
- duplicate contact detection
- contact merge rules
- white-label token resolution

## Integration tests

Test:

- RLS
- database functions
- queue claiming
- webhook persistence
- outbound status updates
- viewing constraints
- signed URL authorization
- contact import/export account isolation
- Google Contacts external-ID synchronization
- Google sync conflict handling
- tenant branding isolation

## End-to-end tests

Test the complete journey:

```text
WhatsApp inbound
 ↓
Lead created
 ↓
Finder state progresses
 ↓
Properties matched
 ↓
Property selected
 ↓
Viewing requested
 ↓
Viewing booked
 ↓
Agent sees timeline
```

---

# 35. Implementation Milestones

## Milestone 1 — Foundation

Deliver:

- Next.js project
- Supabase project configuration
- environment configuration
- accounts
- agents
- roles
- RLS foundation
- database migration framework
- base UI shell
- white-label account branding/configuration
- tenant branding tokens and Qabila attribution

## Milestone 2 — Property Inventory

Deliver:

- property types
- listing types
- listing lifecycle
- locations
- property CRUD
- photo management
- inventory search/filter

## Milestone 3 — WhatsApp Foundation

Deliver:

- WhatsApp account model
- Meta configuration
- webhook verification
- signature validation
- durable webhook events
- idempotent messages
- status callbacks

## Milestone 4 — Lead CRM

Deliver:

- leads
- conversation sessions
- message history
- lead timeline
- stage management
- agent notes
- contact directory
- contact-to-lead relationship
- CSV import/export
- VCF import/export
- contact deduplication and merge workflow

## Milestone 5 — Property Finder

Deliver:

- structured WhatsApp interaction
- state machine
- deterministic matching
- match explanations
- property recommendations
- recovery from stale interactions

## Milestone 6 — Outbound Queue

Deliver:

- outbound messages
- jobs
- atomic claiming
- retry/backoff
- opt-out checks
- consent checks
- provider status handling
- kill switch

## Milestone 7 — Viewing Scheduler

Deliver:

- working hours
- slots
- blackout dates
- property availability
- agent availability
- overlap-safe booking
- confirmation
- cancellation
- rescheduling

## Milestone 8 — Public Listings

Deliver:

- public property pages
- SEO metadata
- structured data
- WhatsApp enquiry CTA
- sitemap
- cache invalidation

## Milestone 9 — Saved Searches + Analytics

Deliver:

- saved searches
- alerts
- funnel analytics
- source attribution
- property performance
- agent performance

## Milestone 10 — P2 Integrations

Only after P0/P1 are stable:

- Google Contacts two-way synchronization
- Catalog
- documents
- email
- broadcasts
- AI copilot
- external APIs

---

# 36. Recommended Initial Qabila Configuration

The first production tenant is:

```text
Account:
Qabila Realtors

Country:
Kenya

Currency:
KES

Timezone:
Africa/Nairobi

Primary channel:
WhatsApp

Languages:
English + Swahili

Brand:
Qabila Realtors

Primary colors:
Navy #182744
Gold #B49362
```

The architecture must not hardcode Qabila-specific business logic into the core application. Qabila is the initial tenant, not the permanent architecture boundary.

---

# 37. Product Principles

## White-label by design

PropConnect is a platform operated by Qabila Realtors, not a Qabila-only application. Tenant branding must be configurable through data and design tokens.

A subscribing agency should experience the application as its own CRM:

```text
Agency Logo
Agency Name
Agency Colors
Agency Contact Details
Agency Properties
Agency Agents
Agency Leads

        Powered by Qabila Realtors
```

The Qabila attribution is a platform-level attribution and should remain subordinate to the tenant brand.

## Contact portability

Users own their CRM contact data within the bounds of applicable privacy law and account permissions. PropConnect should make it easy to import and export contacts without trapping agencies in the platform.

Supported portability formats:
- CSV
- VCF / vCard
- Google Contacts integration


1. **Reliability before intelligence.**
2. **Structured workflows before free-form AI.**
3. **Database constraints before application assumptions.**
4. **Tenant isolation from day one.**
5. **Human approval for consequential AI actions.**
6. **Consent before marketing.**
7. **Durable queues instead of in-process loops.**
8. **The lead timeline is the source of operational truth for the agent.**
9. **Property availability must be trustworthy.**
10. **Optional integrations must fail gracefully.**
11. **Every important action should be observable and auditable.**
12. **Design for the agency workflow, not for database administration.**

---

# 38. Final Definition of the Product

PropConnect should ultimately feel like this to a real-estate agent:

> **"Every property enquiry that comes through WhatsApp becomes an organized lead, every lead is qualified, relevant properties are matched automatically, customers can request and book viewings, and I can see the entire journey in one place."**

The system is therefore complete when it reliably connects:

```text
PROPERTY
   ↓
ENQUIRY
   ↓
LEAD
   ↓
QUALIFICATION
   ↓
MATCH
   ↓
RECOMMENDATION
   ↓
VIEWING
   ↓
FOLLOW-UP
   ↓
NEGOTIATION
   ↓
CONVERSION
```

AI, Catalog, email, broadcasts and external integrations are accelerators around this core — not substitutes for it.

---

# 39. Final Engineering Rule

**Do not build a visually impressive prototype that merely demonstrates the happy path. Build a reliable system that survives duplicate webhooks, concurrent bookings, tenant isolation, provider failures, expired conversations, opt-outs, retries, stale interactions and incomplete integrations.**

That is the standard for PropConnect v3.
