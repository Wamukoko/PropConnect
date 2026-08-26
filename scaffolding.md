***
generated_from:
  - Prompt.md
last_updated: 2026-08-26
***

# Scaffolding — PropConnect

## Module structure

```text
propconnect/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Auth group (login, callback)
│   │   ├── login/
│   │   └── callback/
│   ├── (dashboard)/                  # Authenticated dashboard group
│   │   ├── layout.tsx                # Dashboard shell with nav + white-label
│   │   ├── page.tsx                  # Dashboard home
│   │   ├── contacts/
│   │   │   ├── page.tsx              # Contact list
│   │   │   ├── [id]/page.tsx         # Contact detail
│   │   │   └── import/page.tsx       # CSV/VCF import
│   │   ├── leads/
│   │   │   ├── page.tsx              # Lead list
│   │   │   └── [id]/page.tsx         # Lead detail + timeline
│   │   ├── properties/
│   │   │   ├── page.tsx              # Property list
│   │   │   ├── [id]/page.tsx         # Property detail
│   │   │   └── new/page.tsx          # Property create
│   │   ├── viewings/
│   │   │   ├── page.tsx              # Viewing list
│   │   │   └── [id]/page.tsx         # Viewing detail
│   │   ├── messages/page.tsx         # Message overview
│   │   ├── tasks/page.tsx            # Agent tasks (P1)
│   │   ├── saved-searches/page.tsx   # Saved searches (P1)
│   │   ├── campaigns/page.tsx        # Broadcasts (P2)
│   │   ├── analytics/page.tsx        # Analytics (P1)
│   │   ├── integrations/page.tsx     # Integration settings
│   │   ├── settings/page.tsx         # Account settings
│   │   └── system-health/page.tsx    # System health
│   ├── (public)/                     # Public-facing group
│   │   ├── listings/
│   │   │   ├── page.tsx              # Public listing index
│   │   │   └── [slug]/page.tsx       # Public listing detail
│   │   └── enquiry/page.tsx          # Public enquiry form
│   ├── api/                          # API routes
│   │   ├── webhook/whatsapp/route.ts # WhatsApp webhook POST
│   │   ├── webhook/whatsapp/verify/route.ts # WhatsApp webhook GET
│   │   ├── contacts/route.ts
│   │   ├── contacts/import/route.ts
│   │   ├── contacts/export/route.ts
│   │   ├── leads/route.ts
│   │   ├── leads/[id]/route.ts
│   │   ├── leads/[id]/timeline/route.ts
│   │   ├── properties/route.ts
│   │   ├── properties/[id]/route.ts
│   │   ├── properties/[id]/photos/route.ts
│   │   ├── viewings/route.ts
│   │   ├── viewings/[id]/route.ts
│   │   ├── matching/route.ts
│   │   ├── system-health/route.ts
│   │   ├── outbound/kill-switch/route.ts
│   │   └── branding/route.ts
│   ├── layout.tsx                    # Root layout
│   └── globals.css                   # Tailwind + CSS variables
│
├── lib/                              # Shared libraries
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client (auth)
│   │   ├── admin.ts                  # Service role client (server only)
│   │   └── middleware.ts             # Auth middleware
│   ├── whatsapp/
│   │   ├── client.ts                 # Meta WhatsApp Cloud API client
│   │   ├── webhook.ts                # Webhook verification + parsing
│   │   ├── templates.ts              # Template message definitions
│   │   └── interactive.ts            # Interactive message helpers
│   ├── matching/
│   │   ├── engine.ts                 # Deterministic matching engine
│   │   ├── scorer.ts                 # Match score calculation
│   │   └── reasons.ts                # Match reason generation
│   ├── queue/
│   │   ├── worker.ts                 # Outbound job queue worker
│   │   ├── claim.ts                  # Atomic job claiming
│   │   └── retry.ts                  # Retry/backoff logic
│   ├── contacts/
│   │   ├── csv.ts                    # CSV import/export
│   │   ├── vcf.ts                    # VCF import/export
│   │   ├── dedup.ts                  # Contact deduplication
│   │   └── normalize.ts              # Phone/email normalization
│   ├── consent/
│   │   ├── enforcement.ts            # Consent check at send time
│   │   └── opt-out.ts                # Opt-out handling
│   ├── branding/
│   │   └── resolver.ts               # White-label token resolution
│   ├── storage/
│   │   ├── photos.ts                 # Property photo upload pipeline
│   │   └── signed-url.ts             # Signed URL generation
│   ├── validators/
│   │   ├── contact.ts                # Zod schemas for contacts
│   │   ├── lead.ts                   # Zod schemas for leads
│   │   ├── property.ts               # Zod schemas for properties
│   │   └── viewing.ts                # Zod schemas for viewings
│   └── feature-flags.ts              # Feature flag resolution
│
├── workers/                          # Background workers
│   ├── outbound-worker.ts            # Outbound message queue worker
│   ├── matching-worker.ts            # Property matching worker
│   ├── sync-worker.ts                # Google Contacts sync worker
│   └── ai-worker.ts                  # AI copilot worker (P2)
│
├── components/                       # React components
│   ├── ui/                           # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── dashboard/                    # Dashboard-specific components
│   │   ├── nav.tsx
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   ├── contacts/                     # Contact components
│   ├── leads/                        # Lead components
│   │   ├── timeline.tsx
│   │   ├── qualification.tsx
│   │   └── ai-copilot-panel.tsx
│   ├── properties/                   # Property components
│   │   ├── photo-upload.tsx
│   │   ├── property-card.tsx
│   │   └── filter-panel.tsx
│   ├── viewings/                     # Viewing components
│   └── public/                       # Public-facing components
│       ├── listing-page.tsx
│       └── enquiry-form.tsx
│
├── types/                            # TypeScript type definitions
│   ├── database.ts                   # Generated Supabase types
│   ├── enums.ts                      # Enum type definitions
│   └── api.ts                        # API response types
│
├── migrations/                       # Supabase migrations
│   ├── 001_foundation.sql            # accounts, agents, whatsapp_accounts, branding
│   ├── 002_properties.sql            # properties, photos, locations
│   ├── 003_whatsapp.sql              # webhook_events, messages
│   ├── 004_contacts.sql              # contacts, external_ids, import_history
│   ├── 005_leads.sql                 # leads, timeline_events, conversation_sessions
│   ├── 006_matching.sql              # matching configuration
│   ├── 007_outbound.sql              # outbound_messages, outbound_jobs, consent_records
│   ├── 008_viewings.sql              # viewings, working_hours, blackout_dates
│   ├── 009_public.sql                # public listing support
│   ├── 010_p1.sql                    # saved_searches, tasks, analytics
│   └── 011_p2.sql                    # documents, broadcasts, ai_jobs, catalog
│
├── supabase/
│   ├── config.toml                   # Supabase local config
│   └── functions/                    # Edge Functions
│       ├── webhook-ingest/
│       ├── outbound-worker/
│       └── sync-worker/
│
├── public/                           # Static assets
│   ├── favicon.ico
│   └── ...
│
├── .env.example                      # Environment variable template
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Dependency map

```text
lib/supabase/*          ← used by everything (no outbound deps from supabase layer)
lib/validators/*        ← used by api routes and components
lib/branding/resolver.ts ← used by layout.tsx, components
lib/feature-flags.ts    ← used by api routes, components, workers

lib/whatsapp/*          ← used by webhook route, outbound worker, integration-engineer
lib/matching/*          ← used by matching worker, matching API route
lib/queue/*             ← used by outbound worker, workers/*
lib/contacts/*          ← used by contacts API routes, import routes
lib/consent/*           ← used by outbound worker, broadcast worker
lib/storage/*           ← used by property photo routes, signed URL generation

workers/*               ← deployed as Supabase Edge Functions or pg_cron targets
types/*                 ← used by all TypeScript files
migrations/*            ← run sequentially, each depends on previous
components/*            ← used by app/ pages
app/api/*               ← used by components (via fetch) and external clients
app/(dashboard)/*       ← depends on components/*, lib/*
app/(public)/*          ← depends on components/*, lib/matching, lib/storage
```

## Key dependency risks

| Risk | Modules affected | Mitigation |
|---|---|---|
| WhatsApp client depends on secret management | lib/whatsapp, integration-engineer | Secrets in env vars only; never in client bundles |
| Matching engine depends on property schema | lib/matching, database-architect | Schema must be stable before matching is implemented |
| Queue worker depends on outbound schema + consent | lib/queue, lib/consent, database-architect | Outbound tables and consent tables must exist first |
| Public pages depend on property + matching | app/(public), lib/matching | Public listing pages are P1 — deferred until P0 is stable |
| White-label resolver depends on branding schema | lib/branding, database-architect | Branding table created in Phase 1 |
