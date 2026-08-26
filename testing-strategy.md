***
generated_from:
  - Prompt.md
last_updated: 2026-08-26
***

# Testing Strategy — PropConnect

## Test pyramid

```text
           ┌─────────┐
           │  E2E    │  Complete user journeys
           │ (5-10)  │  WhatsApp inbound → viewing booked
           ├─────────┤
           │  INT    │  RLS, DB functions, queue, webhook
           │ (30-50) │  Cross-tenant isolation, job claiming
           ├─────────┤
           │  UNIT   │  Validation, state, matching, consent
           │ (80-120)│  Scoring, normalization, timezone
           └─────────┘
```

## Unit tests

### Business logic

| Area | Test scenarios |
|---|---|
| Validation | Valid/invalid contact fields; valid/invalid property fields; valid/invalid viewing times; Zod schema rejection |
| State transitions | Conversation state machine: valid transitions; invalid transitions rejected; expired session recovery; version conflict detection |
| Matching engine | Same inputs produce same scores; budget compatibility; location match; bedroom match; listing type match; property type match; availability check; distance calculation with consent; score bounds 0-100 |
| Match reasons | Each criterion generates correct reason text; reasons match score calculation; no internal scoring rules exposed |
| Consent rules | Service vs marketing consent separation; consent withdrawal; consent expiry; purpose-specific enforcement |
| Opt-out rules | Opted-out flag prevents marketing; service messages still allowed; opt-out timestamp recorded |
| Retry classification | Transient errors (429, 503) → retry; permanent errors (400, 404) → fail; network timeout → retry with backoff |
| Timezone calculations | UTC storage → Africa/Nairobi display; DST boundary handling; midnight rollover |
| Phone normalization | Country code addition; leading zeros; whitespace stripping; format consistency |
| Property lifecycle | Draft → published transition; archived exclusion from search; status validation |
| Contact normalization | Phone normalization; email lowercase; display name derivation |
| CSV field mapping | Correct column mapping; missing required fields; extra columns ignored; UTF-8 handling |
| VCF parsing | vCard 3.0 fields; multiple contacts per file; multiple phone numbers; malformed entries |
| Contact deduplication | Same phone → duplicate detected; same email → duplicate detected; different accounts → no duplicate; merge vs skip vs create |
| White-label tokens | Default Qabila colors applied; custom tenant colors override; fallback for missing values |

### Test framework

- **Unit tests:** Vitest (fast, TypeScript-native, works with Next.js)
- **Location:** `__tests__/unit/` mirroring `lib/` structure
- **Pattern:** One test file per function/module

## Integration tests

### Database and RLS

| Area | Test scenarios |
|---|---|
| RLS isolation | Agent A (Account A) cannot read Account B records; cannot insert into Account B; cannot update Account B; cannot delete Account B |
| Database functions | Atomic job claiming returns exactly one job to one worker; concurrent claims don't duplicate; function handles empty queue |
| Queue claiming | FOR UPDATE SKIP LOCKED works under concurrency; locked jobs are not claimed by other workers; job state transitions are atomic |
| Webhook persistence | Webhook event is stored with correct state; duplicate provider_event_id is idempotent; processing state transitions correctly |
| Outbound status | Status update from provider persists; status history is maintained; terminal states prevent further updates |
| Viewing constraints | Overlapping viewing for same property is rejected by DB; non-overlapping viewing succeeds; cancelled viewing does not block overlap check; concurrent requests handled correctly |
| Signed URL authorization | Expired signed URL returns 403; valid signed URL returns file; wrong account signed URL returns 403 |
| Contact import/export isolation | Account A exports only Account A contacts; Account A import does not affect Account B; import history is account-scoped |
| Google sync isolation | Google sync for Account A does not affect Account B; external IDs are account-scoped; conflict handling is per-account |
| Tenant branding isolation | Account A branding loads for Account A; Account B branding loads for Account B; no cross-contamination |

### Test framework

- **Integration tests:** Vitest with Supabase test instance (local `supabase start`)
- **Location:** `__tests__/integration/`
- **Pattern:** Setup test data → execute operation → verify database state

## End-to-end tests

### Complete journey

| Step | Verification |
|---|---|
| WhatsApp inbound webhook | Signature verified; event stored; idempotent on retry |
| Lead created | Lead record exists with correct account_id; timeline event created |
| Conversation state progresses | State transitions through qualification flow |
| Properties matched | Match results returned with scores and reasons |
| Property selected | Property recommendation logged in timeline |
| Viewing requested | Viewing record created with requested status |
| Viewing booked | Viewing status confirmed; overlap constraint prevents double-booking |
| Agent sees timeline | Timeline shows all events in chronological order |

### Additional E2E scenarios

- Opt-out: Customer sends STOP → opted_out = true → marketing job cancelled
- Consent: No saved-search consent → alert job cancelled → no message sent
- Contact import: CSV upload → preview → confirm → contacts created → import history recorded
- White-label: Login as Account A → Account A branding displayed; Login as Account B → Account B branding displayed

### Test framework

- **E2E tests:** Playwright (browser automation) + Supabase test instance
- **Location:** `__tests__/e2e/`
- **Pattern:** Seed data → simulate user actions → verify database + UI state

## Test infrastructure

```text
__tests/
├── unit/
│   ├── matching/
│   │   ├── engine.test.ts
│   │   ├── scorer.test.ts
│   │   └── reasons.test.ts
│   ├── consent/
│   │   ├── enforcement.test.ts
│   │   └── opt-out.test.ts
│   ├── contacts/
│   │   ├── csv.test.ts
│   │   ├── vcf.test.ts
│   │   ├── dedup.test.ts
│   │   └── normalize.test.ts
│   ├── queue/
│   │   └── retry.test.ts
│   ├── validators/
│   │   ├── contact.test.ts
│   │   ├── lead.test.ts
│   │   ├── property.test.ts
│   │   └── viewing.test.ts
│   ├── branding/
│   │   └── resolver.test.ts
│   └── timezone/
│       └── conversions.test.ts
├── integration/
│   ├── rls/
│   │   ├── contacts.test.ts
│   │   ├── leads.test.ts
│   │   ├── properties.test.ts
│   │   └── viewings.test.ts
│   ├── queue/
│   │   ├── claiming.test.ts
│   │   └── concurrency.test.ts
│   ├── webhook/
│   │   ├── persistence.test.ts
│   │   └── idempotency.test.ts
│   ├── viewing/
│   │   └── overlap.test.ts
│   ├── contacts/
│   │   ├── import.test.ts
│   │   └── export.test.ts
│   └── branding/
│       └── isolation.test.ts
├── e2e/
│   ├── full-journey.spec.ts
│   ├── opt-out.spec.ts
│   ├── contact-import.spec.ts
│   └── white-label.spec.ts
└── fixtures/
    ├── accounts.ts
    ├── contacts.ts
    ├── properties.ts
    └── leads.ts
```

## CI integration

```yaml
# Runs on every push/PR
steps:
  - lint
  - typecheck
  - unit tests (fast, no DB)
  - integration tests (Supabase local)
  - E2E tests (Supabase local + Playwright)
```

All tests must pass before merge. No exceptions.
