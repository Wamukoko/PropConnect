***
generated_from:
  - Prompt.md
last_updated: 2026-08-26
***

# PropConnect Agent Team

A 8-agent team for PropConnect, scoped to a WhatsApp-first real estate multi-tenant SaaS platform with real-time webhook processing, concurrent booking safety, and white-label branding.

## Roster

| File | Role | Owns |
|---|---|---|
| `ui-ux-engineer.md` | UI/UX Engineer | Design system, white-label tokens, visual design, responsive layout, editorial aesthetic |
| `frontend-engineer.md` | Frontend Engineer | Next.js App Router, client components, dashboard UI, form handling, real-time state |
| `backend-engineer.md` | Backend Engineer | API routes, server actions, business logic, webhook processing, outbound queue, matching engine |
| `database-architect.md` | Database Architect | Schema design, RLS policies, migrations, PG functions, exclusion constraints, indexes |
| `integration-engineer.md` | Integration Engineer | Meta WhatsApp API, Google Contacts OAuth, Supabase Edge Functions, OpenRouter |
| `security-engineer.md` | Security Engineer | RLS audit, consent enforcement, secret management, signed URLs, data retention |
| `devops-engineer.md` | DevOps Engineer | Vercel deployment, Supabase config, environments, feature flags, monitoring |
| `qa-engineer.md` | QA Engineer | Unit/integration/E2E tests, webhook idempotency, RLS isolation, concurrency tests |

## Handoff scenarios

| Scenario | Handoff order |
|---|---|
| New database table and API endpoint | `database-architect → backend-engineer → qa-engineer` |
| New dashboard screen | `ui-ux-engineer → frontend-engineer → qa-engineer` |
| New WhatsApp webhook behavior | `integration-engineer → backend-engineer → database-architect → qa-engineer` |
| New property feature (CRUD, matching, public page) | `database-architect → backend-engineer → ui-ux-engineer → frontend-engineer → security-engineer → qa-engineer` |
| New viewing/booking feature | `database-architect → backend-engineer → integration-engineer → frontend-engineer → qa-engineer` |
| New contact import/export feature | `backend-engineer → database-architect → frontend-engineer → security-engineer → qa-engineer` |
| Deployment or environment change | `devops-engineer → backend-engineer → qa-engineer` |
| Security review or RLS audit | `security-engineer → database-architect → backend-engineer → qa-engineer` |
| New P2 integration (AI, catalog, email, broadcast) | `integration-engineer → backend-engineer → database-architect → security-engineer → qa-engineer` |

## Usage

- **Claude Code:** Copy individual files into `.claude/agents/` as needed.
- **Other AI assistants:** Use the relevant agent file as a system prompt or role briefing, together with the current `project-context.md`.
- **Human contributors:** Treat the file as an ownership and context briefing, not as a replacement for review or accountability.

## Maintenance

When the project brief or project-context.md changes, update the affected agents' "Domain context," ownership boundaries, and handoff scenarios. Change the roster only when the project's surface, data layer, delivery complexity, or risk profile materially changes.
