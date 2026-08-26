
# README — Context-Sensitive Pre-Coding Resource Framework

This repository uses a structured pre-coding process to prepare a project
before production application code is written.

The process turns a project brief into a proportionate **pre-coding resource
pack**: a durable project context, an implementation plan, only the agent
definitions genuinely needed, and supporting architecture documents only where
they reduce meaningful delivery risk.

This is not a fixed “standard team” generator. A small CLI utility should not
receive enterprise process. A regulated multi-tenant platform should not rely
on a vague one-page plan.

## Core principles

1. **Start from the brief, not a generic template.**
2. **Make assumptions visible and durable.** Never silently choose a product,
   data, security, or infrastructure default.
3. **Scale process to risk and complexity.**
4. **Give each agent a distinct decision surface.** Merge roles when their
   handoffs would be trivial.
5. **Plan by dependency and risk, not organizational convenience.**
6. **Use testable outcomes, not activity labels, as completion criteria.**
7. **Generate documents only when they will be used.**
8. **Preserve human decisions when the resource pack is regenerated.**

---

## Inputs and source precedence

The project brief may be stored in one or more of these files:

- `Prompt.md`
- `spec.md`
- `Draft.md`

Use the following source precedence:

```text
Prompt.md > spec.md > Draft.md
````

### How to read inputs

1. Read every available brief file in full.
2. Treat the highest-precedence file as authoritative where files conflict.
3. Record any material conflict in `project-context.md` as an ambiguity or
decision needed.
4. Do not silently merge incompatible requirements.
5. Do not modify the source brief files unless explicitly asked.

If none of these files exists, stop and request a project brief before
generating project resources.

______________________________________________________________________

## Output directory structure

All generated files belong in the project root, alongside the source brief.

```text
project-root/
  Prompt.md                          # preferred project brief, if present
  spec.md                            # alternate project brief, if present
  Draft.md                           # alternate project brief, if present
  README.md                          # this process document

  project-context.md                 # required: scope, assumptions, decisions,
                                     # classification, requirements, roster rationale

  implementation-plan.md             # required: phased delivery plan

  agents/                            # generated only in full mode
    README.md                        # team roster + handoff guide
    <role-name>.md                   # one file per selected agent

  scaffolding.md                     # only if warranted
  architecture-decisions.md          # only if warranted
  data-model.md                      # only if warranted
  testing-strategy.md                # only if warranted
  environments.md                    # only if warranted
  integration-contracts.md           # only if warranted
```

`project-context.md` and `implementation-plan.md` are required for every
project. Agent files and supplementary documents depend on the project’s
complexity and risk profile.

______________________________________________________________________

## Generation modes

Choose the smallest mode that safely supports the project.

| Mode | Use when | Required output |
| :-- | :-- | :-- |
| **Minimal mode** | Single developer or agent; one primary surface; no external users; no sensitive data; no production integration risk; no meaningful persistent data | `project-context.md`, `implementation-plan.md` |
| **Standard mode** | Multiple contributors or agents; external users; persistent operational data; meaningful business rules; third-party integrations; scheduled deployment | Required files plus a proportionate agent roster and `agents/README.md` |
| **High-assurance mode** | Regulated, financial, health, political, safety-sensitive, multi-tenant, offline-sync, high-availability, or high-risk AI system | Standard-mode outputs plus required security, testing, and environment documentation where applicable |

### Minimal-mode rule

Do not generate agent files merely because they are available as a template.

A minimal-mode project may still name responsibility in its implementation plan,
for example:

```text
Technical owner: Backend engineering and deployment
Product owner: Project requester
Testing owner: Technical owner
```

Upgrade to standard mode when the project gains a second meaningful workstream,
external users, sensitive data, multi-person coordination, production
integration complexity, or operational risk.

______________________________________________________________________

# Step 0 — Read, classify, and create project context

Before generating agent definitions or implementation plans, read all available
brief files and create `project-context.md`.

This file is the durable record of what the team believes the project is,
which assumptions it is making, and which decisions remain open.

## Required `project-context.md` structure

```markdown
***
generated_from:
  - Prompt.md
source_precedence: Prompt.md > spec.md > Draft.md
generation_mode: minimal | standard | high-assurance
last_generated: YYYY-MM-DD
human_decisions_preserved: true
***

# Project Context — <Project Name>

## Scope

**What it is:**  
[One or two sentences describing the product’s core purpose.]

**Who uses it:**  
[List each user role and its primary action.]

**What is out of scope:**  
[Explicit exclusions. State what this project does not do.]

**Key constraints:**  
[Stack, compliance, hosting, integration, delivery, budget, performance,
accessibility, and timeline constraints that shape downstream work.]

## Project classification

| Axis | Classification | Why it matters |
|---|---|---|
| Surface | Web app, native mobile app, API, CLI, extension, data pipeline, desktop app, etc. | Determines interface and engineering ownership |
| Data layer | None, files, relational database, document store, vector store, geospatial, event stream, cache, etc. | Determines data-model and specialist needs |
| Delivery complexity | Solo utility, internal tool, small team product, multi-tenant SaaS, regulated platform, etc. | Determines coordination, QA, and operations needs |
| Risk areas | Auth, payments, health data, political data, ML, geolocation, offline sync, availability, third-party integrations, etc. | Determines specialist roles and required safeguards |

## Requirements register

| ID | Requirement | Priority | Source | Planned phase |
|---|---|---|---|---|
| R-01 | [Concise, testable requirement] | Must | Prompt.md | Phase 1 |
| R-02 | [Concise, testable requirement] | Should | spec.md | Phase 2 |

Use requirement IDs in the implementation plan so reviewers can verify that
important product requirements are actually delivered.

## Assumptions and decisions

| ID | Decision or ambiguity | Classification | Default assumption | Owner | Needed by | Consequence if wrong |
|---|---|---|---|---|---|---|
| D-01 | [Open question] | Blocks agent definitions / Blocks implementation / Future consideration | [Explicit temporary default] | [Role or named owner] | [Phase or date] | [What changes if resolved differently] |

Classify every ambiguity using these rules:

| Classification | Meaning | Required action |
|---|---|---|
| **Blocks agent definitions** | The answer materially changes the necessary team or major ownership boundaries | State a temporary default, record it here, justify the roster under that assumption, and flag it for early resolution |
| **Blocks implementation details** | Work can be planned, but a specific implementation choice cannot safely be finalized | Record the decision, owner, target phase, and reasonable default |
| **Future consideration** | Useful clarification that does not affect near-term delivery | Record it for later; do not delay planning |

## Agent roster rationale

| Role | Include, merge, defer, or skip | Decision surface owned | Reason |
|---|---|---|---|
| backend-engineer | Include | API and business logic | Project has external API and business rules |
| qa-engineer | Merge into backend | Automated verification | Small internal tool with limited edge cases |

## Supplementary-document decisions

| Document | Generate? | Reason |
|---|---|---|
| scaffolding.md | Yes | Four modules have non-obvious dependencies |
| data-model.md | No | Fewer than ten straightforward entities |
```

## Baseline security review

Every project, including minimal-mode projects, must receive a lightweight
baseline security review in `project-context.md`.

Record ownership and the relevant posture for:

- Authentication and authorization, if users exist
- Secret storage and configuration handling
- Dependency and package-supply-chain practices
- Input validation and output encoding
- Sensitive-data classification and retention
- Logging and prevention of secret or sensitive-data exposure
- Backup, recovery, and deletion expectations for persisted data
- Third-party integration credentials, scopes, rate limits, and failure modes

A dedicated security engineer is not required for every project. Baseline
security ownership may belong to the backend engineer in lower-risk systems.

______________________________________________________________________

# Step 1 — Determine the roster

Do not default to a standard list of roles. Build the roster from the Step 0
classification, the selected generation mode, and the real decisions the
project requires.

**Rule of thumb:** every agent added must own a distinct, consequential
decision surface. If two agents would mostly hand off trivial work, merge
their responsibilities.

## Role-selection guide

| If the project has… | Include or assign | Notes |
| :-- | :-- | :-- |
| Web user interface | `ui-ux-engineer.md` and `frontend-engineer.md` | Merge for a small project with a simple interface |
| Fully native iOS or Android application | `ui-ux-engineer.md` and `mobile-engineer.md` | Native mobile generally replaces frontend engineering |
| Both web and native mobile surfaces | `ui-ux-engineer.md`, `frontend-engineer.md`, and `mobile-engineer.md` | Include both implementation roles only when both surfaces are real deliverables |
| No UI: API, CLI, worker, cron job, or data job | `backend-engineer.md` or an equivalent specialist role | Skip UI and frontend roles |
| Persistent relational, document, geospatial, vector, or operationally significant data | `database-architect.md` or a specialized data role | The specialization must match the data layer |
| Search, retrieval, embeddings, ranking, or vector-store design | `search-retrieval-engineer.md` or `ml-engineer.md` | Do not force this work into a generic database role |
| Event pipelines, analytics workloads, or stream processing | `data-engineer.md` | Include when ingestion, transformation, or reliability of data flows is substantial |
| Significant third-party APIs, OAuth, webhooks, synchronization, or provider risk | Backend ownership or `integration-engineer.md` | Add a distinct role only if integration work is a major decision surface |
| Multiple environments, CI/CD, scheduled deployment, uptime commitments, background jobs, or team coordination | `devops-engineer.md` | For a small prototype, backend may own deployment |
| Meaningful business logic, edge cases, external users, or production changes | `qa-engineer.md` | Merge into engineering only when risk and scope are genuinely small |
| Evolving requirements, competing stakeholder needs, or uncertain priorities | `product-manager.md` | Keep the role thin or omit it when the brief is complete and stable |
| ML, inference, recommendation, generation, model evaluation, or data labeling | `ml-engineer.md` | Include model-risk and evaluation ownership |
| Payments, privileged roles, multi-tenancy, sensitive records, enterprise SSO, regulated data, account recovery, or threat-model complexity | `security-engineer.md` | Do not treat ordinary login alone as sufficient reason |
| Accessibility-critical, public-facing, or design-system-heavy UI | Explicitly assign accessibility ownership | Usually UI/UX plus frontend or mobile engineering |
| High observability, audit, incident-response, or availability needs | DevOps ownership and, where needed, security ownership | State responsibility for alerts, logs, metrics, and operational runbooks |

## Worked examples

| Project type | Classification | Mode | Likely roster |
| :-- | :-- | :-- | :-- |
| Local CLI formatter | CLI; local file output; solo; no meaningful risk | Minimal | No agent files required; technical owner named in plan |
| Internal web dashboard | Web app; relational data; small team; ordinary internal risk | Standard | UI/UX, frontend, backend, database; QA if workflows are consequential |
| Mobile field app with offline sync | Native mobile; relational data; external users; offline and sync risk | Standard or high-assurance | UI/UX, mobile, backend, database, QA, DevOps; security if sensitive data is involved |
| Multi-tenant SaaS with payments | Web app; relational data; multi-tenant; auth, payments, deployment risk | High-assurance | Product, UI/UX, frontend, backend, database, security, DevOps, QA |
| AI retrieval platform | Web/API; relational plus vector data; external users; inference and data-quality risk | High-assurance | Product, UI/UX if needed, frontend if needed, backend, search/retrieval or ML, database, DevOps, QA, security as warranted |

______________________________________________________________________

# Step 2 — Generate agent definition files

Generate `agents/<role-name>.md` only for roles selected in Step 1.

Create the `agents/` directory when the first agent file is needed.

Each file should contain project-specific operating context, not a generic job
description. It may be used as a Claude Code subagent definition, a system
prompt for another assistant, or a briefing document for a human contributor.

## Required format

```markdown
***
name: <role-name>
description: One or two sentences explaining when to invoke this role instead
             of adjacent roles. Make routing decisions clear and specific.
generated_from:
  - Prompt.md
last_updated: YYYY-MM-DD
***

# <Role Title>

## Core skills
- [Three to six skills specific to this project’s technology, risk, or domain]
- [Avoid generic items such as “communication” or “programming”]

## Domain context you must apply
> Revisit this section whenever project requirements shift.

- [Five to ten project-specific facts drawn from the current project context]
- [Data boundaries, user roles, integrations, failure modes, and constraints]
- [Relevant requirement IDs where useful]

## How you work
[Three to five sentences explaining decision-making principles, trade-offs,
documentation expectations, validation requirements, and handoff behavior.]

## What you own
- [Distinct decisions, deliverables, and review responsibilities]
- [State primary ownership clearly]

## What you do not do
- [Name adjacent roles and their ownership boundaries]
- [State when work must be handed off rather than duplicated]
```

## Depth guidance

Use the smallest amount of detail that enables good work without requiring the
agent to reread every source file.

| Section | Recommended depth |
| :-- | :-- |
| Core skills | 3–6 project-specific bullets |
| Domain context | 5–10 project-specific bullets |
| How you work | 3–5 sentences |
| What you own | 2–5 concrete responsibilities |
| What you do not do | 2–4 explicit handoff boundaries |

A standard agent file will usually be 250–600 words. Shorter is acceptable
when a role has a narrow scope. Do not add generic content merely to meet a
word count.

______________________________________________________________________

# Step 3 — Generate the team README

Generate `agents/README.md` when the project has two or more agent files.

It must include:

1. A one-line team description:

```text
A [N]-agent team for [project name], scoped to [primary surface] with
[key risk-domain] expertise.
```

1. A roster table:

| File | Role | Owns |
| :-- | :-- | :-- |
| `backend-engineer.md` | Backend Engineer | APIs, business rules, service integrations |
| `database-architect.md` | Database Architect | Schema, migrations, query strategy, data integrity |

1. Three to five project-specific handoff scenarios:

| Scenario | Handoff order |
| :-- | :-- |
| New customer-facing workflow | `product-manager -> ui-ux-engineer -> frontend-engineer -> qa-engineer` |
| New persisted entity and API | `database-architect -> backend-engineer -> qa-engineer` |
| New payment flow | `security-engineer -> backend-engineer -> qa-engineer -> devops-engineer` |
| New retrieval feature | `ml-engineer -> search-retrieval-engineer -> backend-engineer -> qa-engineer` |
| Deployment or runtime change | `devops-engineer -> backend-engineer -> qa-engineer` |

Only include scenarios that the project could actually require.
4. Usage instructions:
    - **Claude Code:** Copy individual files into `.claude/agents/` as needed.
    - **Other AI assistants:** Use the relevant agent file as a system prompt
or role briefing, together with the current `project-context.md`.
    - **Human contributors:** Treat the file as an ownership and context
briefing, not as a replacement for review or accountability.
5. A maintenance note:

```text
When the project brief or project-context.md changes, update the affected
agents’ “Domain context,” ownership boundaries, and handoff scenarios.
Change the roster only when the project’s surface, data layer, delivery
complexity, or risk profile materially changes.
```

______________________________________________________________________

# Step 4 — Generate `implementation-plan.md`

Generate `implementation-plan.md` for every project.

The plan must be proportionate: a simple utility may need two short phases;
a regulated platform may need five or more.

## Build the plan

1. Review the source brief for an existing build sequence.
2. Use that sequence when present, but reorder work when dependency or risk
requires it.
3. Address the riskiest uncertainty early when practical.
4. Explicitly explain if a high-risk unknown is intentionally deferred.
5. Reference requirement IDs from `project-context.md`.
6. Name the agent or owner responsible for each significant deliverable.

## Required structure

```markdown
***
generated_from:
  - Prompt.md
last_updated: YYYY-MM-DD
generation_mode: standard
***

# Implementation Plan — <Project Name>

## Delivery strategy

[Explain why the phases are ordered this way. Identify the main technical,
product, compliance, integration, or operational risks being resolved early.]

## Phase 1 — <Name>

**Goal:**  
[A measurable product or risk-reduction outcome.]

**Requirements covered:**  
[R-01, R-03]

**Scope:**
- `[backend-engineer]` [Concrete deliverable]
- `[database-architect]` [Concrete deliverable]
- `[qa-engineer]` [Concrete verification deliverable]

**Sequencing:**  
[What blocks what, what can happen in parallel, and which dependencies must
be resolved first.]

**Exit criteria:**
- [Observable, testable condition]
- [Observable, testable condition]

**Decisions needed:**
- [D-01 — owner, required timing, and temporary default]

**Risks and mitigations:**
- [Risk — mitigation]

## Phase 2 — <Name>

[Repeat the same structure.]

## Future considerations

- [Items classified as future considerations]
- [Deferred capabilities, scale-up paths, non-blocking tool choices]
```

## Exit-criteria standard

Avoid statements such as:

```text
Backend complete.
Database implemented.
Frontend finished.
```

Use outcomes that can be verified:

```text
An authenticated organization administrator can create a workspace, invite a
member, and confirm that the invited member cannot access another
organization’s records.

A field user can capture a record while offline, reconnect, synchronize it
without duplicate creation, and see conflict status when the server copy
changed.

A payment succeeds in the provider sandbox, a failed payment does not grant
access, and webhook retries do not create duplicate subscriptions.
```

## Feasibility spikes

This framework is pre-production-code preparation. However, it may include a
strictly bounded feasibility spike when an early risk cannot be evaluated from
documentation alone.

A feasibility spike must state:

- The uncertainty it resolves
- The smallest experiment required
- The success and failure criteria
- The owner
- Whether the artifact will be discarded, retained, or converted into
production work after review

Do not silently turn a research spike into production implementation.

______________________________________________________________________

# Step 5 — Generate supplementary documents only when warranted

Generate each document only when the stated condition is met. Record the
decision in `project-context.md`, including documents deliberately skipped.

| Document | Generate it when… | Skip it when… |
| :-- | :-- | :-- |
| `scaffolding.md` | The project has 3+ modules, packages, services, workers, or clients with non-obvious dependency relationships | A single-package project or conventional structure makes layout self-evident |
| `architecture-decisions.md` | Two or more viable, costly-to-reverse technical approaches exist | Technology choices are explicit, constrained, or inexpensive to change |
| `data-model.md` | The system has 15+ entities/tables, complex relationships, non-obvious access patterns, event flows, consent constraints, or specialized storage | Simple CRUD with fewer than ten straightforward entities |
| `testing-strategy.md` | The project handles regulated, financial, health, political, safety-sensitive, offline-sync, or high-consequence workflows | A low-risk prototype or internal utility with ordinary verification needs |
| `environments.md` | The project has three or more meaningful environments, environment-specific configuration, compliance-driven hosting, or operational deployment differences | One environment or effectively identical environments |
| `integration-contracts.md` | Third-party APIs, OAuth, webhooks, sync jobs, rate limits, retries, idempotency, or provider failure behavior are central to delivery | No meaningful external integration exists |

### Supplementary-document guidance

Keep each document concise and operational. A document should answer a real
decision or reduce a concrete delivery risk. Do not create filler documents
for completeness alone.

______________________________________________________________________

# Regeneration and preservation rules

This framework may be run again as the project evolves.

When regenerating:

1. Re-read all source briefs using the stated precedence order.
2. Compare the updated brief with the current `project-context.md`.
3. Preserve explicitly human-authored decisions unless the new brief directly
overrides them.
4. Update generated sections that are now stale.
5. Produce a concise change summary covering:
    - Changed scope or requirements
    - Added, removed, merged, or deferred roles
    - New or resolved decisions
    - Documents added or no longer warranted
    - Handoff or phase changes
6. Never delete existing files without explicit authorization.
7. Flag contradictions between the current brief and existing generated
material rather than silently choosing one.

Each generated document should include source metadata and a last-updated date.

______________________________________________________________________

# Quality checklist before production coding begins

Every item below must be verifiable by inspecting the generated files.

- [ ] **Sources resolved:** All available brief files were read, precedence was
applied, and material conflicts were recorded.
- [ ] **Scope preserved:** `project-context.md` accurately states what the
product is, who uses it, what is out of scope, and its key constraints.
- [ ] **Classification complete:** Surface, data layer, delivery complexity,
and risk areas contain project-specific values.
- [ ] **Assumptions are durable:** Every meaningful ambiguity has a
classification, explicit temporary default, owner, target timing, and
consequence if the assumption is wrong.
- [ ] **Process is proportionate:** Minimal, standard, or high-assurance mode
was selected intentionally, and generated artifacts match that mode.
- [ ] **Requirements are traceable:** Major requirements have IDs and appear
in at least one implementation-plan phase and exit criterion.
- [ ] **Roster is justified:** Every included agent owns a distinct,
consequential decision surface. No role exists merely because it is common.
- [ ] **Mobile and data ownership are clear:** Native mobile, web, vector,
retrieval, streaming, integration, and specialized-data needs are assigned
to appropriate roles rather than forced into generic defaults.
- [ ] **Security has an owner:** Baseline security topics are addressed for
every project. A dedicated security role exists where risk justifies it.
- [ ] **Agent files are complete:** Each agent file has routing metadata, core
skills, domain context, working principles, explicit ownership, and
non-overlapping handoff boundaries.
- [ ] **Team handoffs match reality:** Team README scenarios reflect real
feature types and risks in this project, not generic web-app workflows.
- [ ] **Plan phases follow dependency and risk:** No phase depends on output
from a later phase. High-risk unknowns are addressed early or explicitly
justified as deferred.
- [ ] **Exit criteria are testable:** Each phase proves an observable user,
system, security, integration, or operational outcome.
- [ ] **Supplementary docs are justified:** Every generated supplementary
document meets its stated condition, and skipped documents have a recorded
reason.
- [ ] **Regeneration is safe:** Generated documents identify their source and
can be updated without silently overwriting human decisions.
- [ ] **No orphaned references exist:** Every role named in plans, handoffs,
or ownership tables has a corresponding agent file where required. Every
referenced requirement and decision ID exists in `project-context.md`.

```

The main change is that `project-context.md` becomes the durable bridge between the brief and all generated output. That prevents scope decisions, assumptions, role rationale, and requirement traceability from disappearing into a one-time chat response.```
```
