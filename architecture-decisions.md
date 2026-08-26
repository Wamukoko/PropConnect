***
generated_from:
  - Prompt.md
last_updated: 2026-08-26
***

# Architecture Decisions — PropConnect

## ADR-01: WhatsApp integration — Direct Meta Cloud API vs Paid BSP

**Status:** Decided — Direct Meta Cloud API

**Context:**
PropConnect needs WhatsApp messaging. Options: (A) Direct Meta Cloud API, (B) Paid Business Solution Provider (BSP) like Twilio, MessageBird, 360dialog.

**Decision:**
Use Meta WhatsApp Cloud API directly without a paid BSP.

**Rationale:**
- No per-message markup from BSP
- Full control over webhook handling and message formatting
- Direct access to Meta's interactive message features
- Qabila Realtors as the initial tenant can manage Meta Business/Developer configuration
- Free tier covers initial volume; BSP can be introduced later if business needs justify it

**Consequences:**
- Must handle webhook verification, signature validation, and API errors directly
- Must manage access token lifecycle and quality rating monitoring
- Must implement template message submission and approval workflow
- BSP introduction is a future option, not a rewrite

---

## ADR-02: Job queue — PostgreSQL-backed vs External queue service

**Status:** Decided — PostgreSQL-backed

**Context:**
PropConnect needs durable background job processing for outbound messages, matching, sync, and AI. Options: (A) PostgreSQL with FOR UPDATE SKIP LOCKED, (B) Redis/BullMQ, (C) Supabase Edge Functions with pg_cron, (D) External service (Inngest, Trigger.dev).

**Decision:**
Use PostgreSQL as the primary job queue backing with FOR UPDATE SKIP LOCKED for atomic claiming. Supplement with Supabase Edge Functions or pg_cron for worker execution.

**Rationale:**
- PostgreSQL is already the system of record — no new infrastructure
- FOR UPDATE SKIP LOCKED provides safe concurrent claiming without external dependencies
- Supabase free tier includes Postgres — no additional cost
- Workers can run as Edge Functions or pg_cron jobs
- External queue services add cost and operational complexity for initial deployment

**Consequences:**
- Queue performance is bounded by Postgres throughput (sufficient for initial scale)
- Must implement bounded batch processing (limit 20 jobs per worker invocation)
- Must handle worker restart/resume gracefully
- Growth path: if queue volume exceeds Postgres capacity, can introduce Redis or dedicated worker service without changing the job schema

---

## ADR-03: Matching engine — Deterministic vs AI-powered

**Status:** Decided — Deterministic for P0, AI advisory in P2

**Context:**
Property matching must recommend properties to leads based on their criteria. Options: (A) Deterministic weighted scoring, (B) AI/ML-powered matching, (C) Hybrid.

**Decision:**
P0 uses deterministic weighted scoring. AI provides advisory explanations in P2 but never replaces the core matching algorithm.

**Rationale:**
- Deterministic matching is explainable — agents can see why a property was recommended
- No external API dependency for core matching
- Deterministic results are reproducible and testable
- AI can enhance with natural-language explanations and suggestions in P2
- AI must never autonomously act on matching results

**Consequences:**
- Match quality depends on the weight configuration — must be tunable
- Complex matching criteria (e.g., lifestyle preferences) may require AI in P2
- Match reasons must be stored and visible to agents
- AI suggestions are stored separately from confirmed CRM data

---

## ADR-04: White-label strategy — Data-driven tokens vs Theme provider

**Status:** Decided — CSS variables + Tailwind theme

**Context:**
Each agency must be able to customize branding without code changes. Options: (A) CSS custom properties (design tokens) resolved per-account, (B) React theme provider with context, (C) Build-time theme generation.

**Decision:**
Use CSS custom properties resolved at the server/layout level per-account, integrated with Tailwind theme configuration.

**Rationale:**
- CSS variables work everywhere (components, public pages, email templates)
- No client-side React context needed for basic theming
- Tailwind theme can reference CSS variables for utility classes
- Server-side resolution means branding loads before first paint
- No build-time complexity

**Consequences:**
- Must define all brand-related CSS variables (colors, fonts, logo URLs)
- Must resolve variables per-account in the layout server component
- Components must use CSS variable references, never hardcoded colors
- Default Qabila branding provides fallback values
- Custom domain support (future) requires DNS-level configuration

---

## ADR-05: Conversation state — State machine vs LLM-inferred

**Status:** Decided — Explicit state machine

**Context:**
WhatsApp conversations with customers need to track where the customer is in the property-finding journey. Options: (A) Explicit state machine with defined transitions, (B) LLM-inferred conversation state, (C) Hybrid with LLM fallback.

**Decision:**
Use an explicit, versioned state machine with defined states and transitions. LLM is not used for state inference in P0.

**Rationale:**
- Explicit states are deterministic, testable, and debuggable
- State transitions can be validated and logged
- Version field enables optimistic concurrency control
- LLM inference is unreliable for critical state transitions
- Expired/stale/duplicate replies must trigger safe recovery, not guessing

**Consequences:**
- Must define all valid states and transitions upfront
- Must handle edge cases: expired sessions, stale replies, duplicates, unknown intents
- State machine must be versioned to prevent race conditions
- Future: LLM can suggest transitions, but agent or system must confirm

---

## ADR-06: Viewing overlap prevention — Application-level vs Database constraint

**Status:** Decided — PostgreSQL exclusion constraint

**Context:**
Two agents must not book overlapping viewings for the same property. Options: (A) Application-level locking, (B) Unique timestamp constraint, (C) PostgreSQL exclusion constraint with range types.

**Decision:**
Use PostgreSQL EXCLUDE USING gist with property_id and viewing range (tstzrange) to prevent overlapping bookings at the database level.

**Rationale:**
- Database constraint is the strongest guarantee — application bugs cannot create overlaps
- Unique timestamp equality (e.g., `unique(property_id, scheduled_at)`) does not prevent 10:00-10:30 overlapping with 10:15-10:45
- Exclusion constraint uses PostgreSQL's range type system
- Must install btree_gist extension for non-gist column types

**Consequences:**
- Must use tstzrange or tsrange for the viewing time range
- Constraint must only apply to active viewings (scheduled, confirmed) — not cancelled/completed
- Application must handle constraint violation gracefully (inform customer that slot is unavailable)
- Must test with realistic concurrent booking scenarios

---

## ADR-07: Contact identity — Single table vs External ID table

**Status:** Decided — Dedicated external ID table

**Context:**
Contacts may be imported from CSV, VCF, Google Contacts, or WhatsApp. Options: (A) Single contacts table with provider columns, (B) Dedicated contact_external_ids table, (C) Contact as a view over multiple provider tables.

**Decision:**
Use a dedicated contact_external_ids table to link PropConnect contacts to external systems.

**Rationale:**
- PropConnect is the system of record — external systems are endpoints
- External ID table prevents duplicate creation during sync
- Supports multiple providers without schema changes
- Enables conflict detection and sync status tracking
- Contact normalization uses account-scoped phone/email, not external IDs

**Consequences:**
- Must query contact_external_ids for deduplication during import/sync
- Must handle cases where external system and PropConnect disagree (conflict rules)
- Google Contacts sync uses external_id for idempotent upserts
- Future providers (Outlook, Apple Contacts) can be added without schema changes

---

## ADR-08: Data retention — Configurable per-class vs Global default

**Status:** Decided — Configurable per-class

**Context:**
Different data types have different retention needs. Options: (A) Single global retention period, (B) Configurable retention per data class, (C) No retention policy (keep everything).

**Decision:**
Implement configurable retention per data class with sensible defaults.

**Rationale:**
- Raw webhook payloads need short operational retention
- Audit logs need longer compliance retention
- Sensitive documents need short configurable retention
- AI inputs/outputs need separate configurable retention
- Storage is inexpensive but unlimited retention of personal data creates compliance risk

**Consequences:**
- Must define retention classes and defaults in code
- Must implement scheduled cleanup jobs (pg_cron or Edge Functions)
- Must support data export and deletion/anonymization workflows
- Configurable per-account retention is a future enhancement
