***
generated_from:
  - Prompt.md
source_precedence: Prompt.md
generation_mode: high-assurance
last_generated: 2026-08-26
human_decisions_preserved: true
***

# Project Context — PropConnect

## Scope

**What it is:**
PropConnect is a white-label, WhatsApp-first real estate lead-to-viewing platform that connects property inventory, contacts, WhatsApp conversations, structured qualification, property matching, viewing scheduling, agent follow-up, and analytics in one system. It is operated by Qabila Realtors as the platform owner, with each subscribing agency presenting the application as its own branded CRM.

**Who uses it:**

| Role | Primary action |
|---|---|
| Platform operator (Qabila Realtors) | Manages platform-level configuration, tenant onboarding, and attribution |
| Agency agent | Qualifies leads, matches properties, books viewings, follows up with customers via WhatsApp |
| Agency administrator | Configures agency branding, manages agents, reviews analytics, handles settings |
| Customer (WhatsApp end-user) | Enquires about properties, receives recommendations, requests viewings via WhatsApp |
| System administrator | Monitors system health, webhook status, queue depth, integration health |

**What is out of scope:**
- Native mobile applications (iOS/Android) — web-first only
- Property listing aggregation from third-party portals
- Payment processing or escrow
- Mortgage or financial product comparison
- Tenant/landlord rental payment management
- Physical document management beyond sensitive document capture (P2)
- Telephony or voice calls
- In-app chat (WhatsApp is the communication channel)

**Key constraints:**

| Constraint | Detail |
|---|---|
| Tech stack | Next.js 14+ App Router, TypeScript, Supabase (Postgres, Auth, Storage, Edge Functions, Cron), Tailwind CSS, Zod |
| WhatsApp integration | Meta WhatsApp Cloud API directly — no paid BSP |
| Hosting | Vercel (app), Supabase (backend), free-tier first with paid growth path |
| Database | Supabase Postgres as single source of truth; RLS for tenant isolation |
| Default timezone | Africa/Nairobi |
| Default currency | KES |
| Default languages | English + Swahili |
| AI | Advisory only, dashboard-only, never autonomous — OpenRouter free tier (P2) |
| White-label | Tenant branding via data/config, not code forks; "Powered by Qabila Realtors" attribution |
| Privacy | Phone numbers, coordinates, ID docs, message content are protected personal data |
| Compliance posture | Consent before marketing, auditable consent records, data export/deletion workflows |

---

## Project classification

| Axis | Classification | Why it matters |
|---|---|---|
| Surface | Web application (Next.js App Router) with WhatsApp as primary customer channel | Dashboard is agent-facing web; customer interaction is WhatsApp-only |
| Data layer | Relational database (Supabase Postgres) with private object storage (Supabase Storage) | Complex schema with 20+ entities, RLS, exclusion constraints, timeline events |
| Delivery complexity | Multi-tenant SaaS with white-label branding, role-based access, and external API integration | Requires tenant isolation from day one, audit trails, consent enforcement |
| Risk areas | Multi-tenant data isolation (RLS), WhatsApp webhook reliability (idempotency, signature verification), concurrent viewing booking (PG exclusion constraints), consent enforcement, secret management, third-party API failure handling, contact deduplication | Requires dedicated security, database architecture, and integration expertise |

---

## Requirements register

| ID | Requirement | Priority | Source | Planned phase |
|---|---|---|---|---|
| R-01 | Database migrations run cleanly on a clean Supabase project with RLS enabled on every tenant-owned table | Must | Prompt.md §2 | Phase 1 |
| R-02 | Accounts, agents, and tenant boundaries are established with proper FK relationships | Must | Prompt.md §2, §4 | Phase 1 |
| R-03 | Supabase Auth protects all dashboard routes server-side | Must | Prompt.md §2, §26 | Phase 1 |
| R-04 | White-label account branding/configuration model is functional with dynamic token resolution | Must | Prompt.md §2, §5A | Phase 1 |
| R-05 | WhatsApp account model supports multiple WhatsApp numbers per account | Must | Prompt.md §5 | Phase 3 |
| R-06 | Webhook is signature-verified (HMAC-SHA256), fully traversing, idempotent, and returns quickly | Must | Prompt.md §2, §19 | Phase 3 |
| R-07 | Lead creation from WhatsApp inbound with complete message history | Must | Prompt.md §2, §9 | Phase 4 |
| R-08 | Lead timeline is a first-class CRM feature with chronological events | Must | Prompt.md §2, §10 | Phase 4 |
| R-09 | Explicit conversation state machine with versioned state and safe recovery | Must | Prompt.md §2, §11 | Phase 5 |
| R-10 | Property CRUD with type/listing/status separation and location model | Must | Prompt.md §2, §6, §7 | Phase 2 |
| R-11 | Private property photo storage with server-side validation, EXIF stripping, thumbnails | Must | Prompt.md §2, §8 | Phase 2 |
| R-12 | Deterministic, explainable property matching with weighted criteria | Must | Prompt.md §2, §15 | Phase 5 |
| R-13 | Outbound message logging and provider status processing | Must | Prompt.md §2, §18 | Phase 6 |
| R-14 | Durable outbound job queue with atomic claiming (FOR UPDATE SKIP LOCKED) | Must | Prompt.md §2, §18.2 | Phase 6 |
| R-15 | Basic viewing request with concurrency-safe booking (PG exclusion constraint) | Must | Prompt.md §2, §14 | Phase 7 |
| R-16 | Consent/opt-out enforcement — marketing suppressed immediately on opt-out | Must | Prompt.md §2, §17, §20 | Phase 6 |
| R-17 | System health and operational diagnostics dashboard | Must | Prompt.md §2, §29 | Phase 6 |
| R-18 | Contact management with CSV import/export and VCF import/export | Must | Prompt.md §2, §5 | Phase 4 |
| R-19 | Contact deduplication using normalized phone/email identifiers | Must | Prompt.md §5.1 | Phase 4 |
| R-20 | Tenant white-label configuration with CSS variable design tokens | Must | Prompt.md §2, §5A | Phase 1 |
| R-21 | Google Contacts integration (one-time import, controlled two-way sync) | Should | Prompt.md P1, §5.5 | Phase 9 |
| R-22 | Advanced location matching with geographic hierarchy | Should | Prompt.md P1, §7 | Phase 9 |
| R-23 | Saved searches and alerts | Should | Prompt.md P1, §16 | Phase 9 |
| R-24 | Public property listing pages with SEO, structured data, sitemap | Should | Prompt.md P1, §21 | Phase 8 |
| R-25 | Agent tasks and follow-up management | Should | Prompt.md P1, §23 | Phase 9 |
| R-26 | Funnel analytics with source attribution | Should | Prompt.md P1, §24 | Phase 9 |
| R-27 | WhatsApp Catalog synchronization | Could | Prompt.md P2 | Phase 10 |
| R-28 | Sensitive document capture with private storage | Could | Prompt.md P2 | Phase 10 |
| R-29 | Email notifications | Could | Prompt.md P2 | Phase 10 |
| R-30 | Broadcast campaigns | Could | Prompt.md P2 | Phase 10 |
| R-31 | AI copilot (summaries, extraction, drafts, semantic search) via OpenRouter | Could | Prompt.md P2 | Phase 10 |
| R-32 | Feature flags for all optional integrations | Must | Prompt.md §32 | Phase 1 |

---

## Assumptions and decisions

| ID | Decision or ambiguity | Classification | Default assumption | Owner | Needed by | Consequence if wrong |
|---|---|---|---|---|---|---|
| D-01 | Supabase free tier acceptable for initial deployment | Blocks implementation | Yes — free tier with growth path to paid | Technical owner | Phase 1 | Must redesign hosting if limits hit sooner than expected |
| D-02 | Vercel free/hobby tier acceptable for initial deployment | Blocks implementation | Yes — hobby tier | Technical owner | Phase 1 | Must upgrade or migrate hosting |
| D-03 | No paid BSP — direct Meta WhatsApp Cloud API only | Blocks implementation | Direct API with Meta system user token | Technical owner | Phase 3 | If Meta changes API terms, may need BSP intermediary |
| D-04 | Qabila Realtors is the sole initial tenant and platform operator | Blocks agent definitions | Yes — Qabila is operator and first tenant; white-label supports future tenants | Product owner | Phase 1 | Roster and branding scope would change if multiple launch tenants |
| D-05 | Africa/Nairobi is the default timezone for all date/time display | Blocks implementation | Africa/Nairobi; configurable per-account | Technical owner | Phase 1 | Time display would be wrong for non-Kenya tenants |
| D-06 | AI provider is OpenRouter free tier | Blocks implementation | OpenRouter API with free models; key provided later; behind FEATURE_AI flag | Technical owner | Phase 10 | Must swap provider if free tier changes |
| D-07 | No email provider configured at launch | Future consideration | Email disabled behind FEATURE_EMAIL flag; P2 | Product owner | Phase 10 | No email notifications until provider configured |
| D-08 | No maps/geocoding provider at launch | Future consideration | Maps disabled; location matching uses text-based hierarchy only initially; P1 | Product owner | Phase 9 | No distance-based matching until provider configured |
| D-09 | PostgreSQL is the system of truth for all business records | Blocks implementation | Yes — Supabase Postgres with RLS | Technical owner | Phase 1 | Fundamental architecture change if source of truth changes |
| D-10 | WhatsApp conversation state uses explicit state machine, not free text inference | Blocks implementation | Yes — versioned state machine with defined transitions | Technical owner | Phase 5 | Unreliable conversation flow if state is inferred |
| D-11 | AI never autonomously sends messages, books viewings, or mutates CRM data | Blocks implementation | Yes — AI is advisory and dashboard-only | Product owner | Phase 10 | Liability and data integrity risk if AI is autonomous |
| D-12 | Meta Catalog integration is deferred to P2 | Blocks implementation | Catalog sync behind FEATURE_CATALOG_SYNC flag | Product owner | Phase 10 | No WhatsApp catalog until configured |
| D-13 | Default Qabila brand colors are navy #182744 and gold #B49362 | Blocks implementation | Yes — defined in Tailwind theme as defaults | Technical owner | Phase 1 | Visual identity would be wrong |
| D-14 | RLS policies enforce tenant isolation at the database level, not just application layer | Blocks implementation | Yes — every tenant-owned table has account_id + account-scoped RLS | Technical owner | Phase 1 | Cross-tenant data leak if RLS is missing |
| D-15 | Outbound job queue uses PostgreSQL with FOR UPDATE SKIP LOCKED, not an external queue service | Blocks implementation | Yes — PG-backed durable queue | Technical owner | Phase 6 | Must redesign queue if external service required |

---

## Agent roster rationale

| Role | Include, merge, defer, or skip | Decision surface owned | Reason |
|---|---|---|---|
| ui-ux-engineer | Include | Design system, white-label token resolution, responsive layout, editorial aesthetic | Public-facing property pages and branded dashboard require dedicated design attention |
| frontend-engineer | Include | Next.js App Router, client components, real-time dashboard state, form handling | Complex dashboard with timeline, matching results, viewing scheduler, white-label rendering |
| backend-engineer | Include | API routes, server actions, business logic, webhook processing, outbound queue workers | WhatsApp webhook handling, job queue, consent enforcement, property matching logic |
| database-architect | Include | Supabase Postgres schema, RLS policies, migrations, PG functions, exclusion constraints | 20+ entities, complex FK graph, RLS, PG exclusion constraints for viewings, timeline events |
| integration-engineer | Include | Meta WhatsApp Cloud API, Google Contacts OAuth, Supabase Edge Functions | WhatsApp webhook verification, send API, templates, status callbacks, Google sync |
| security-engineer | Include | RLS audit, consent enforcement, secret management, signed URLs, data retention | Multi-tenant SaaS with sensitive PII, WhatsApp message content, location data, document storage |
| devops-engineer | Include | Vercel deployment, Supabase config, environment management, feature flags, monitoring | Deployment pipeline, environment-specific config, system health dashboard |
| qa-engineer | Include | Unit/integration/E2E testing, webhook idempotency, RLS isolation, concurrency tests | Critical acceptance criteria: duplicate webhooks, concurrent viewings, cross-tenant isolation, job double-claim |

No roles merged — all 8 own distinct, consequential decision surfaces given the high-assurance classification.

---

## Supplementary-document decisions

| Document | Generate? | Reason |
|---|---|---|
| scaffolding.md | Yes | 10+ modules (tenant, WhatsApp, property, contacts, CRM, matching, viewings, campaigns, public listings, operations, AI) with non-obvious dependency chains |
| architecture-decisions.md | Yes | Multiple viable approaches for: WhatsApp direct vs BSP, job queue backing, matching engine design, white-label token strategy, conversation state model |
| data-model.md | Yes | 20+ entities with complex FK relationships, RLS policies, consent model, exclusion constraints, timeline event model, contact external IDs |
| testing-strategy.md | Yes | Multi-tenant RLS isolation tests, concurrent viewing booking tests, webhook idempotency tests, job double-claim prevention, opt-out enforcement |
| environments.md | Yes | Dev (local Supabase + Vercel preview), staging (Supabase staging project + Vercel preview), production (Supabase production + Vercel); WhatsApp sandbox vs production |
| integration-contracts.md | Yes | Meta WhatsApp Cloud API (webhook GET/POST, send, templates, status), Google Contacts OAuth2, Supabase Edge Function contracts, OpenRouter API (P2) |

---

## Baseline security review

| Topic | Ownership | Posture |
|---|---|---|
| Authentication | backend-engineer + security-engineer | Supabase Auth; every dashboard page and mutation protected server-side; no client-only auth |
| Authorization | security-engineer + database-architect | Multi-tenant RLS on every tenant-owned table; agent membership → account_id → record.account_id chain; service-role key server-only |
| Secret storage | security-engineer + devops-engineer | WhatsApp tokens, App Secret, Supabase service-role key in environment variables; never in browser bundles, logs, or committed files; `*_ref` fields for future secret manager |
| Dependency supply chain | devops-engineer | npm audit, Dependabot or equivalent, lockfile committed, no unpinned dependencies in production |
| Input validation | backend-engineer + frontend-engineer | Zod for all API inputs; server-side validation on all mutations; client-side validation for UX only |
| Output encoding | frontend-engineer | Next.js default escaping; no raw HTML injection; structured data validated before rendering |
| Sensitive data classification | security-engineer | Phone numbers, precise coordinates, ID documents, proof-of-funds, message content = protected personal data; purpose-specific consent required |
| Data retention | security-engineer | Configurable per-class retention; raw webhook payloads short-term; audit logs longer; sensitive documents short configurable; AI inputs/outputs configurable |
| Logging | security-engineer + devops-engineer | Never log secrets, access tokens, raw authorization headers; redact phone numbers and message content; correlation IDs for webhook tracing |
| Third-party integrations | integration-engineer + security-engineer | Meta API credentials scoped to specific WhatsApp accounts; Google OAuth with account-level authorization and disconnect/revoke; rate limit awareness; failure modes documented |
| Private storage | database-architect + security-engineer | Supabase Storage private buckets; signed URLs with expiry; server-side MIME/size validation; EXIF stripping on property photos; access audit for sensitive documents |
| Consent enforcement | security-engineer + backend-engineer | Purpose-specific consent records with wording, policy version, timestamp; opt-out checked at send time; marketing suppressed immediately on withdrawal |
