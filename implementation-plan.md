***
generated_from:
  - Prompt.md
last_updated: 2026-08-26
generation_mode: high-assurance
***

# Implementation Plan — PropConnect

## Delivery strategy

The phases are ordered by dependency and risk:

1. **Foundation first** — tenant isolation (RLS), accounts, agents, auth, and white-label branding must exist before any business feature. Getting tenancy wrong would require a full redesign.
2. **Property inventory early** — properties are the central domain object. Leads reference them, matching depends on them, viewings are booked against them, public pages display them.
3. **WhatsApp foundation before CRM** — the webhook pipeline is the ingestion layer for all customer communication. It must be reliable before leads or conversations make sense.
4. **CRM before matching** — leads, contacts, and conversation state must exist before property matching can be demonstrated end-to-end.
5. **Matching before viewings** — a customer must receive property recommendations before requesting a viewing.
6. **Outbound queue before viewings** — confirmed viewings require reliable outbound messaging. The queue must be operational.
7. **Viewings are the capstone of the P0 core journey** — the full property → enquiry → lead → match → recommend → view → follow-up loop closes here.
8. **Public listings are deferred to P1** — they are read-only, SEO-facing pages that do not block the agent workflow.
9. **P1 features (analytics, saved searches, tasks, Google Contacts) build on the stable P0 core**.
10. **P2 integrations (AI, broadcasts, catalog, documents) are feature-flagged and optional** — they must not break P0 if disabled.

The highest technical risk is the **WhatsApp webhook pipeline** (idempotency, signature verification, traversal of all entries/changes/statuses). This is addressed in Phase 3, early in the sequence.

The second highest risk is **concurrent viewing booking** (PG exclusion constraints). This is addressed in Phase 7 after the property and queue foundations are stable.

---

## Phase 1 — Foundation

**Goal:**
A deployable Next.js application with Supabase Auth, multi-tenant account model, agent model, RLS on every tenant-owned table, white-label branding configuration, and a functional dashboard shell.

**Requirements covered:**
R-01, R-02, R-03, R-04, R-20, R-32

**Scope:**
- `[database-architect]` Supabase project setup; accounts, agents, whatsapp_accounts, account_branding tables; RLS policies for every tenant-owned table; migration framework
- `[backend-engineer]` Next.js project scaffold; Supabase Auth integration; server-side route protection; account/agent API routes; white-label branding API
- `[frontend-engineer]` Dashboard shell with navigation; login/auth flow; settings pages; white-label theme resolution via CSS variables
- `[devops-engineer]` Environment configuration (.env.example); Vercel project setup; Supabase project linking; feature flag infrastructure
- `[security-engineer]` RLS policy review; auth flow audit; secret management verification
- `[qa-engineer]` RLS isolation tests; auth protection tests; migration smoke tests

**Sequencing:**
1. Database-architect creates migration framework and foundation tables (accounts, agents, whatsapp_accounts, account_branding)
2. Backend-engineer scaffolds Next.js project and integrates Supabase Auth
3. Frontend-engineer builds dashboard shell and login flow
4. Backend-engineer implements account/agent/branding API routes
5. Frontend-engineer implements white-label theme resolution
6. Devops-engineer configures environments and feature flags
7. Security-engineer reviews RLS and auth
8. QA-engineer runs isolation and protection tests

**Exit criteria:**
- Migrations run on a clean Supabase project and create all foundation tables with RLS enabled
- An authenticated agent can log in and see a protected dashboard
- Two test accounts cannot see each other's records (RLS isolation verified)
- White-label branding loads dynamically per account via CSS variables
- Qabila Realtors branding appears as the default tenant
- "Powered by Qabila Realtors" appears in the authenticated footer
- No secret appears in browser bundles or client-side code
- Feature flags can disable optional features without breaking the core
- All lint, typecheck, and tests pass

**Decisions needed:**
- D-01 (Supabase free tier) — default: yes
- D-02 (Vercel free tier) — default: yes
- D-04 (Qabila as initial tenant) — default: yes
- D-13 (Qabila brand colors) — default: navy #182744, gold #B49362
- D-14 (RLS enforcement) — default: database-level RLS on every table

**Risks and mitigations:**
- Risk: RLS policies may be incomplete or bypassed — mitigation: security-engineer reviews every policy; QA tests cross-tenant access
- Risk: White-label token resolution may leak tenant data — mitigation: server-side theme loading; CSS variables scoped to account

---

## Phase 2 — Property Inventory

**Goal:**
A complete property management system with type/listing/status separation, location hierarchy, photo management with private storage, and inventory search/filter.

**Requirements covered:**
R-10, R-11

**Scope:**
- `[database-architect]` Property tables (properties, property_photos, locations, location_aliases); enum types (property_type, listing_type, listing_status); geographic hierarchy tables; photo metadata table
- `[backend-engineer]` Property CRUD API routes; photo upload pipeline (MIME validation, size limits, EXIF stripping, thumbnail generation); property search/filter logic; location API
- `[frontend-engineer]` Property list view with filters; property detail view; property create/edit forms; photo upload UI with drag-and-drop; location picker
- `[integration-engineer]` Supabase Storage bucket configuration (property-public-derived, property-private-originals); signed URL generation for private originals
- `[qa-engineer]` Property CRUD tests; photo upload validation tests; search/filter tests; storage access tests

**Sequencing:**
1. Database-architect creates property schema and geographic hierarchy
2. Backend-engineer implements property CRUD and location API
3. Frontend-engineer builds property UI
4. Integration-engineer configures storage buckets and signed URLs
5. Backend-engineer implements photo upload pipeline
6. QA-engineer tests CRUD, storage, and access control

**Exit criteria:**
- An agent can create, read, update, and delete properties within their account
- Property types, listing types, and listing statuses are correctly separated
- Photos are stored in private buckets and accessed via signed URLs
- Thumbnails are generated on upload
- EXIF data is stripped from uploaded photos
- Properties from Account A are invisible to Account B (RLS verified)
- Location hierarchy supports country → county → city → neighbourhood → estate
- Property search/filter returns correct results
- Archived listings are excluded from search results and public pages
- All lint, typecheck, and tests pass

**Decisions needed:**
- D-05 (default timezone) — Africa/Nairobi applied to property availability display

**Risks and mitigations:**
- Risk: Photo upload may fail silently — mitigation: server-side validation with clear error messages; upload status tracked
- Risk: Location hierarchy may be over-engineered for initial launch — mitigation: start with flat locations, normalize later if needed

---

## Phase 3 — WhatsApp Foundation

**Goal:**
A reliable WhatsApp webhook pipeline that is signature-verified, fully traversing, idempotent, and returns quickly. WhatsApp account model supports multiple numbers per account.

**Requirements covered:**
R-05, R-06

**Scope:**
- `[database-architect]` whatsapp_accounts table (already created in Phase 1); webhook_events table; messages table; outbound_messages table; outbound_jobs table; necessary indexes
- `[backend-engineer]` Webhook verification endpoint (GET handshake); POST webhook handler (raw body reading, HMAC-SHA256 signature verification, buffer length check, timingSafeEqual); durable event ingestion; traversal of all entries/changes/messages/statuses; idempotency via provider_event_id and wa_message_id
- `[integration-engineer]` Meta WhatsApp Cloud API client; outbound message sending; template message support; provider status callback processing; webhook event logging with correlation IDs
- `[security-engineer]` Webhook security review; secret handling audit; log redaction verification (phone numbers, message content)
- `[qa-engineer]` Valid/invalid webhook signature tests; truncated signature header test; duplicate webhook concurrency test; multiple entries/changes/messages/statuses test; status callback without delivered callback test; malformed payload test

**Sequencing:**
1. Database-architect creates webhook, message, and outbound tables
2. Backend-engineer implements webhook verification and POST handler
3. Integration-engineer implements Meta API client and outbound sending
4. Backend-engineer implements idempotent event ingestion and traversal
5. Security-engineer reviews webhook security
6. QA-engineer runs comprehensive webhook tests

**Exit criteria:**
- GET verification handshake succeeds with Meta
- POST webhook verifies X-Hub-Signature-256 using HMAC-SHA256
- Raw request body is read exactly once
- Every entry, change, message, and status object is traversed
- Duplicate webhooks (same wa_message_id) are idempotent — exactly one message record, no duplicate business action
- HTTP 200 is returned quickly; slow work is queued
- Malformed/unsupported payloads are handled safely without leaking secrets
- No secrets appear in logs
- Phone numbers and message content are redacted from logs
- Correlation IDs are assigned to every webhook event
- Status callbacks are processed separately from inbound messages
- All lint, typecheck, and tests pass

**Decisions needed:**
- D-03 (direct Meta API) — default: yes, no paid BSP
- D-12 (Catalog deferred) — default: behind FEATURE_CATALOG_SYNC

**Risks and mitigations:**
- Risk: Meta may deliver webhooks faster than processing — mitigation: durable event ingestion returns 200 immediately; slow work queued
- Risk: Signature verification may reject legitimate webhooks — mitigation: buffer length check before timingSafeEqual; test with Meta's test webhook tool
- Risk: WhatsApp API changes may break integration — mitigation: integration-contracts.md documents expected API behavior; version pinned via graph_api_version

---

## Phase 4 — Lead CRM

**Goal:**
A complete lead management system with lead creation from WhatsApp, conversation sessions, message history, lead timeline, stage management, contact directory, CSV/VCF import/export, and contact deduplication.

**Requirements covered:**
R-07, R-08, R-18, R-19

**Scope:**
- `[database-architect]` leads table; conversation_sessions table; messages table (from Phase 3); lead_timeline_events table; contacts table; contact_external_ids table; import_history table; necessary indexes and RLS policies
- `[backend-engineer]` Lead creation from inbound WhatsApp messages; conversation session management; message history API; lead timeline API (chronological events); stage management API; contact CRUD; CSV import/export pipeline; VCF import/export pipeline; contact deduplication logic (normalized phone/email); import preview and confirmation workflow
- `[frontend-engineer]` Lead list view; lead detail view with timeline; conversation view; contact directory; CSV import UI (upload, column mapping, duplicate preview, confirmation); VCF import UI; contact merge workflow; stage management controls
- `[security-engineer]` Contact export account isolation verification; import audit logging
- `[qa-engineer]` Lead creation from webhook test; timeline event ordering test; CSV import preview/rollback test; VCF import/export test; contact deduplication test; cross-tenant contact isolation test

**Sequencing:**
1. Database-architect creates lead, contact, timeline, and import tables
2. Backend-engineer implements lead creation from WhatsApp inbound
3. Backend-engineer implements conversation session management
4. Backend-engineer implements message history API
5. Backend-engineer implements lead timeline
6. Frontend-engineer builds lead list, detail, and timeline UI
7. Backend-engineer implements contact CRUD and deduplication
8. Backend-engineer implements CSV import/export
9. Backend-engineer implements VCF import/export
10. Frontend-engineer builds contact directory and import UIs
11. Security-engineer verifies isolation and audit
12. QA-engineer runs comprehensive tests

**Exit criteria:**
- Inbound WhatsApp messages create leads with correct account association
- Conversation sessions track state per lead/account/WhatsApp context
- Message history shows inbound and outbound messages chronologically
- Lead timeline displays all event types (messages, stage changes, notes, property interactions)
- Contacts can be created, imported via CSV, imported via VCF, and exported
- CSV import shows preview with column mapping and duplicate detection before confirmation
- VCF import normalizes vCard 3.0 fields and identifies duplicates
- Contact deduplication uses normalized phone/email within account scope
- Contacts from Account A are invisible to Account B
- Import history records all operations with counts and error reports
- All lint, typecheck, and tests pass

**Decisions needed:**
- D-10 (explicit conversation state) — default: versioned state machine

**Risks and mitigations:**
- Risk: CSV import may fail on large files — mitigation: durable import jobs for large files; progress reporting
- Risk: VCF parsing may encounter malformed files — mitigation: graceful error handling; partial import with error report
- Risk: Contact deduplication may produce false positives — mitigation: agent confirms merge; create-separate option available

---

## Phase 5 — Property Finder

**Goal:**
A structured WhatsApp interaction flow with explicit conversation state machine, deterministic property matching, match explanations, property recommendations, and recovery from stale interactions.

**Requirements covered:**
R-09, R-12

**Scope:**
- `[database-architect]` Conversation state enum; collected_filters JSONB on conversation_sessions; match_results table (if needed for explainability)
- `[backend-engineer]` Conversation state machine (idle → choosing_intent → choosing_listing_type → choosing_property_type → choosing_budget → choosing_area → matching → showing_results → choosing_property → choosing_viewing → completed/handoff/expired); state transitions; collected filters persistence; deterministic matching engine (weighted: listing type, property type, budget, location, bedrooms, bathrooms, amenities, distance); match reason generation; stale/expired session recovery; property recommendation via WhatsApp
- `[frontend-engineer]` Matching configuration UI (if needed); match results display in dashboard; match reason visualization
- `[integration-engineer]` WhatsApp interactive message sending for conversation flow; quick-reply/list message handling
- `[qa-engineer]` State transition tests; stale session recovery test; matching score calculation tests; match explanation tests; expired conversation handling test

**Sequencing:**
1. Database-architect updates conversation_sessions with state enum and filters
2. Backend-engineer implements conversation state machine
3. Backend-engineer implements deterministic matching engine
4. Integration-engineer implements WhatsApp interactive messages for conversation flow
5. Backend-engineer implements stale session recovery
6. Frontend-engineer builds match results display
7. QA-engineer runs comprehensive tests

**Exit criteria:**
- Conversation state progresses through defined states with version tracking
- Unknown, expired, duplicate, or stale interactive replies trigger safe recovery
- Matching is deterministic — same inputs always produce same results
- Match reasons are stored and visible to agents (e.g., "Within rental budget", "Preferred neighbourhood")
- AI is not used as the primary matching engine
- Expired sessions are detected and recovered
- Property recommendations are sent via WhatsApp with correct formatting
- All lint, typecheck, and tests pass

**Decisions needed:**
- D-10 (conversation state machine) — default: versioned, explicit states

**Risks and mitigations:**
- Risk: Conversation state may become inconsistent — mitigation: version field on session; optimistic concurrency control
- Risk: Matching may produce poor results for edge cases — mitigation: agent can manually override; match scores visible in dashboard

---

## Phase 6 — Outbound Queue

**Goal:**
A durable outbound message queue with atomic job claiming, retry/backoff, opt-out and consent checks, provider status handling, and a global kill switch.

**Requirements covered:**
R-13, R-14, R-16, R-17

**Scope:**
- `[database-architect]` outbound_jobs table enhancements (locked_at, locked_by, next_attempt_at, idempotency_key unique constraint); outbound_messages table; consent_records table; PostgreSQL function for atomic job claiming (FOR UPDATE SKIP LOCKED)
- `[backend-engineer]` Outbound queue worker (atomic claim, bounded batch processing); retry/backoff logic (transient vs permanent failure classification); opt-out check at send time; consent verification at send time; provider status callback processing; outbound kill switch; system health API
- `[frontend-engineer]` System health dashboard (webhook stats, queue depth, failed jobs, WhatsApp API status, storage estimate, DB growth, worker status, kill switch control)
- `[integration-engineer]` WhatsApp send API integration with provider response persistence; template message validation
- `[security-engineer]` Consent enforcement review; opt-out enforcement verification
- `[qa-engineer]` Job double-claim prevention test; opt-out enforcement test; consent enforcement test; retry behavior test; permanent failure test; worker restart/resume test; kill switch test

**Sequencing:**
1. Database-architect enhances outbound tables and creates claiming function
2. Backend-engineer implements queue worker with atomic claiming
3. Backend-engineer implements retry/backoff and failure classification
4. Backend-engineer implements opt-out and consent checks at send time
5. Integration-engineer implements WhatsApp send with provider response
6. Backend-engineer implements outbound kill switch
7. Backend-engineer implements system health API
8. Frontend-engineer builds system health dashboard
9. Security-engineer reviews consent and opt-out enforcement
10. QA-engineer runs comprehensive tests

**Exit criteria:**
- Jobs are claimed atomically — two concurrent workers cannot claim the same job
- Opted-out leads receive no marketing messages (checked at send time, not just enqueue time)
- Required marketing consent is verified at send time
- Retry logic distinguishes transient from permanent failures
- Worker restart/resume works correctly
- System health dashboard shows all required metrics
- Global outbound kill switch stops all sending
- All lint, typecheck, and tests pass

**Decisions needed:**
- D-15 (PG-backed queue) — default: yes, FOR UPDATE SKIP LOCKED

**Risks and mitigations:**
- Risk: Queue may back up under load — mitigation: bounded batch processing; monitoring via health dashboard
- Risk: Kill switch may not stop in-flight sends — mitigation: check at job claim time AND at send time

---

## Phase 7 — Viewing Scheduler

**Goal:**
A viewing scheduling system with working hours, slot configuration, blackout dates, property and agent availability, overlap-safe booking via PostgreSQL exclusion constraints, confirmation, cancellation, and rescheduling.

**Requirements covered:**
R-15

**Scope:**
- `[database-architect]` viewings table with start_at/end_at as timestamptz; PG exclusion constraint (EXCLUDE USING gist with property_id AND viewing_range) for overlap prevention; working hours configuration table; blackout_dates table
- `[backend-engineer]` Viewing availability calculation (working days, hours, slot duration, buffer, blackout dates, minimum notice, maximum booking horizon); viewing request API; overlap-safe booking (relies on PG exclusion constraint); confirmation flow; cancellation; rescheduling; WhatsApp notification on confirmation/cancellation
- `[frontend-engineer]` Viewing request UI; availability calendar; viewing list (upcoming, past); confirmation/cancel/reschedule controls
- `[integration-engineer]` WhatsApp template messages for viewing confirmation, cancellation, and reminders
- `[qa-engineer]` Concurrent viewing request test; overlapping viewing rejection test; timezone conversion test; blackout date test; minimum notice test; booking horizon test

**Sequencing:**
1. Database-architect creates viewings table with exclusion constraint
2. Backend-engineer implements availability calculation
3. Backend-engineer implements viewing request and booking API
4. Integration-engineer implements WhatsApp notifications
5. Frontend-engineer builds viewing UI
6. Backend-engineer implements cancellation and rescheduling
7. QA-engineer runs concurrency and scheduling tests

**Exit criteria:**
- Viewings are stored with UTC start_at/end_at
- Display uses Africa/Nairobi by default (configurable per account)
- Overlapping viewings for the same property are rejected by the database (not just application logic)
- A viewing request is confirmed only after the database transaction succeeds
- Working hours, slot duration, buffer, blackout dates, minimum notice, and booking horizon are respected
- Cancellation and rescheduling work correctly
- WhatsApp confirmation is sent on successful booking
- All lint, typecheck, and tests pass

**Decisions needed:**
- D-05 (default timezone) — Africa/Nairobi

**Risks and mitigations:**
- Risk: PG exclusion constraint may not work as expected — mitigation: test with realistic concurrent scenarios; fallback to application-level locking if needed
- Risk: Timezone conversion may cause off-by-one errors — mitigation: store in UTC, convert for display only; test with DST boundaries

---

## Phase 8 — Public Listings

**Goal:**
Public property listing pages with SEO metadata, structured data, sitemap, robots.txt, responsive images, cache invalidation, and WhatsApp enquiry CTA.

**Requirements covered:**
R-24

**Scope:**
- `[database-architect]` Public listing query optimization; slug generation; cache invalidation trigger on listing change
- `[backend-engineer]` Public listing API (published listings only); slug-based routing; SEO metadata generation; structured data (JSON-LD); sitemap generation; robots.txt; cache invalidation on listing status change
- `[frontend-engineer]` Public listing page template (responsive images, photo gallery, property details, location summary, price, WhatsApp CTA, enquiry form); mobile-first design
- `[security-engineer]` Public page security review (no customer data, no internal notes, no storage paths, no unpublished/archived listings, no precise coordinates)
- `[qa-engineer]` Published-only listing test; unpublished/archived exclusion test; slug stability test; structured data validation test; customer data exclusion test

**Sequencing:**
1. Database-architect optimizes public listing queries
2. Backend-engineer implements public listing API and SEO
3. Frontend-engineer builds public listing page
4. Security-engineer reviews public page for data leaks
5. QA-engineer runs security and SEO tests

**Exit criteria:**
- Only published listings appear on public pages
- Stable slugs and canonical URLs
- Structured data (JSON-LD) is valid
- Sitemap includes all published listings
- robots.txt excludes non-public paths
- No customer information, lead counts, internal notes, storage paths, or precise coordinates are exposed
- Cache invalidates when listing status changes
- WhatsApp enquiry CTA links to correct WhatsApp conversation
- All lint, typecheck, and tests pass

**Risks and mitigations:**
- Risk: Cache may serve stale listings — mitigation: explicit invalidation on listing change; short TTL as fallback
- Risk: SEO metadata may be incorrect — mitigation: validate with Google Rich Results Test

---

## Phase 9 — P1 Features

**Goal:**
Google Contacts integration, advanced location matching, saved searches and alerts, agent tasks/follow-ups, funnel analytics, and lead source attribution.

**Requirements covered:**
R-21, R-22, R-23, R-25, R-26

**Scope:**
- `[database-architect]` saved_searches table; agent_tasks table; analytics materialized views or summary tables; Google Contacts external ID tables (already created in Phase 4)
- `[backend-engineer]` Google Contacts OAuth2 flow; one-time import from Google; controlled two-way sync; conflict handling; saved search creation and alert generation (durable jobs); agent task CRUD; analytics aggregation queries; lead source attribution tracking
- `[frontend-engineer]` Saved searches UI; alert configuration; agent tasks list and detail; analytics dashboard (funnel visualization, source performance, agent performance, property performance); Google Contacts integration settings
- `[integration-engineer]` Google People API integration; sync job management; conflict resolution UI
- `[qa-engineer]` Google Contacts sync isolation test; conflict handling test; saved search alert test; analytics deduplication test

**Sequencing:**
1. Database-architect creates saved searches, tasks, and analytics tables
2. Backend-engineer implements saved searches and alerts
3. Backend-engineer implements agent tasks
4. Backend-engineer implements analytics aggregation
5. Integration-engineer implements Google Contacts OAuth and sync
6. Frontend-engineer builds all P1 UIs
7. QA-engineer runs P1 tests

**Exit criteria:**
- Saved searches generate alerts as durable jobs (not synchronous)
- Alerts respect consent — opted-out leads receive no alerts
- Agent tasks support follow-up workflows
- Analytics correctly aggregate without double-counting webhook retries
- Google Contacts sync is isolated per account
- Google sync conflicts follow explicit rules and surface unresolved conflicts
- All lint, typecheck, and tests pass

**Risks and mitigations:**
- Risk: Google API quota limits may throttle sync — mitigation: async job queue with backoff; visible sync status
- Risk: Analytics may double-count — mitigation: deduplication via unique event keys; idempotent aggregation

---

## Phase 10 — P2 Integrations

**Goal:**
Feature-flagged P2 capabilities: WhatsApp Catalog sync, sensitive document capture, email notifications, broadcast campaigns, and AI copilot via OpenRouter.

**Requirements covered:**
R-27, R-28, R-29, R-30, R-31

**Scope:**
- `[database-architect]` Document metadata tables; broadcast campaign tables; AI job queue tables; catalog sync state tables
- `[backend-engineer]` WhatsApp Catalog sync; sensitive document capture with private storage and retention; email notification service; broadcast campaign engine (durable jobs, bounded batches, opt-out/consent checks); AI copilot (conversation summaries, field extraction, lead prioritization, reply drafts, semantic search) via OpenRouter; AI output stored separately from CRM data
- `[frontend-engineer]` Document upload/management UI; broadcast campaign UI; AI copilot panel in lead detail (visually separated from CRM data); email template configuration
- `[integration-engineer]` Meta Catalog API integration; email provider integration; OpenRouter API integration
- `[security-engineer]` Document access audit; AI data handling review (no ID docs, no proof-of-funds, no secrets in AI context); broadcast consent enforcement
- `[qa-engineer]` Catalog sync test; document retention test; broadcast opt-out test; AI output schema validation test; feature flag disable test

**Sequencing:**
1. Database-architect creates P2 tables
2. Each P2 feature implemented behind its feature flag
3. AI copilot implemented last (depends on stable CRM data)
4. All P2 features tested with flags enabled AND disabled
5. Security-engineer reviews AI data handling

**Exit criteria:**
- All P2 features work when enabled behind their feature flags
- All P2 features are completely disabled when flags are off — no errors, no broken UI
- Sensitive documents are stored in private buckets with signed URLs and retention policies
- Broadcast campaigns respect opt-out and consent at send time
- AI output is stored separately from agent-confirmed CRM data
- AI never sends messages, books viewings, mutates CRM fields, or deletes records
- OpenRouter integration works with free-tier models
- All lint, typecheck, and tests pass

**Decisions needed:**
- D-06 (OpenRouter AI provider) — default: behind FEATURE_AI flag, API key provided later
- D-07 (no email provider) — default: behind FEATURE_EMAIL flag
- D-12 (Catalog deferred) — default: behind FEATURE_CATALOG_SYNC

**Risks and mitigations:**
- Risk: OpenRouter free tier may change availability — mitigation: feature flag allows instant disable; provider interface is abstracted
- Risk: Broadcast campaigns may overwhelm WhatsApp API limits — mitigation: bounded batches; rate limiting; kill switch

---

## Future considerations

- **Native mobile application** — current architecture is web-first; mobile app may be warranted for field agents
- **Advanced AI features** — semantic search, predictive lead scoring, automated property description generation
- **Payment integration** — rental payments, deposit collection, escrow
- **Multi-language expansion** — Swahili and additional languages beyond English
- **Custom domain per tenant** — DNS configuration and SSL for agency-branded domains
- **API for external integrations** — allow third-party systems to connect to PropConnect
- **Offline support** — for agents in areas with poor connectivity
- **Advanced analytics** — cohort analysis, predictive analytics, market intelligence
