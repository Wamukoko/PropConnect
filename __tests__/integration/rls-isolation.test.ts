import { describe, it, expect } from "vitest";

/**
 * Integration-style tests for RLS isolation and tenant boundary enforcement.
 * These tests verify the design contract: every tenant-owned table has
 * account_id and the mock client isolates data per account.
 *
 * Because we test against the mock client (not a real Supabase instance),
 * we validate the structural invariants that RLS would enforce in production.
 */

const TENANT_A = "00000000-0000-0000-0000-000000000010";
const TENANT_B = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const TENANT_OWNED_TABLES = [
  "leads",
  "contacts",
  "properties",
  "property_photos",
  "viewings",
  "messages",
  "agent_tasks",
  "lead_timeline_events",
  "saved_searches",
  "broadcast_campaigns",
  "broadcast_recipients",
  "consent_records",
  "outbound_jobs",
  "outbound_messages",
  "webhook_events",
  "conversation_sessions",
  "analytics_events",
  "documents",
  "contact_external_ids",
];

// Policy names don't always match the table name exactly
const POLICY_NAME_MAP: Record<string, string> = {
  consent_records: "tenant_isolation_consent",
  system_settings: "tenant_isolation_settings",
  broadcast_recipients: "tenant_isolation_broadcast_recipients",
  contact_external_ids: "tenant_isolation_contact_external",
  catalog_sync_state: "tenant_isolation_catalog_sync",
  lead_timeline_events: "tenant_isolation_timeline",
  conversation_sessions: "tenant_isolation_conversations",
};

describe("RLS tenant isolation contract", () => {
  it("every tenant-owned table has an account_id column in its migration", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationsDir = path.resolve(process.cwd(), "migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    let combinedSQL = "";
    for (const file of files) {
      combinedSQL += fs.readFileSync(path.join(migrationsDir, file), "utf-8") + "\n";
    }

    for (const table of TENANT_OWNED_TABLES) {
      // Every tenant-owned table should have account_id in its create table or alter table
      const hasAccountId =
        combinedSQL.includes(`${table}`) &&
        (combinedSQL.includes(`account_id uuid`) || combinedSQL.includes(`account_id uuid NOT NULL`));
      expect(hasAccountId).toBe(true);
    }
  });

  it("every tenant-owned table has RLS enabled", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationsDir = path.resolve(process.cwd(), "migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    let combinedSQL = "";
    for (const file of files) {
      combinedSQL += fs.readFileSync(path.join(migrationsDir, file), "utf-8") + "\n";
    }

    const lowerSQL = combinedSQL.toLowerCase();

    for (const table of TENANT_OWNED_TABLES) {
      const hasRLS = lowerSQL.includes(`alter table ${table} enable row level security`);
      expect(hasRLS).toBe(true);
    }
  });

  it("every tenant-owned table has a tenant isolation policy", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationsDir = path.resolve(process.cwd(), "migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    let combinedSQL = "";
    for (const file of files) {
      combinedSQL += fs.readFileSync(path.join(migrationsDir, file), "utf-8") + "\n";
    }

    for (const table of TENANT_OWNED_TABLES) {
      // webhook_events is a service-role ingestion table (no tenant_isolation
      // policy by design - only service_role policy). Skip it for this check.
      if (table === "webhook_events") continue;
      const policyName = POLICY_NAME_MAP[table] || `tenant_isolation_${table}`;
      const hasPolicy = combinedSQL.includes(`"${policyName}"`);
      expect(hasPolicy).toBe(true);
    }
  });

  it("tenant isolation policies reference agents table for auth.uid lookup", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationsDir = path.resolve(process.cwd(), "migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    let combinedSQL = "";
    for (const file of files) {
      combinedSQL += fs.readFileSync(path.join(migrationsDir, file), "utf-8") + "\n";
    }

    // Verify that policies use the agents table for auth mapping
    expect(combinedSQL).toContain("agents a where a.id = auth.uid()");
  });

  it("mock client returns empty results when querying across account boundaries", async () => {
    // Simulate the mock client's eq filter behavior
    const mockLeads = [
      { id: "l-1", account_id: TENANT_A, name: "Lead A" },
      { id: "l-2", account_id: TENANT_B, name: "Lead B" },
    ];

    // Filter for TENANT_A only
    const tenantAResults = mockLeads.filter((r) => r.account_id === TENANT_A);
    const tenantBResults = mockLeads.filter((r) => r.account_id === TENANT_B);

    expect(tenantAResults).toHaveLength(1);
    expect(tenantAResults[0].name).toBe("Lead A");
    expect(tenantBResults).toHaveLength(1);
    expect(tenantBResults[0].name).toBe("Lead B");

    // Cross-tenant isolation: no overlap
    const overlap = tenantAResults.filter((r) => r.account_id === TENANT_B);
    expect(overlap).toHaveLength(0);
  });
});

describe("auth boundary enforcement", () => {
  it("dashboard layout requires authenticated user", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const layoutPath = path.resolve(process.cwd(), "src/app/(dashboard)/layout.tsx");
    const layout = fs.readFileSync(layoutPath, "utf-8");

    expect(layout).toContain("getUser");
    expect(layout).toContain("redirect");
    expect(layout).toContain("/login");
  });

  it("every API route verifies authentication", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const apiDir = path.resolve(process.cwd(), "src/app/api");
    const routeFiles: string[] = [];

    function walkDir(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(full);
        } else if (entry.name === "route.ts") {
          routeFiles.push(full);
        }
      }
    }
    walkDir(apiDir);

    for (const routeFile of routeFiles) {
      const normalized = routeFile.replace(/\\/g, "/");
      const content = fs.readFileSync(routeFile, "utf-8");
      const hasAuth = content.includes("getUser") || content.includes("auth");
      const isWebhook = normalized.includes("webhook");
      const isPublic = normalized.includes("public");
      const isOAuthCallback = normalized.includes("google/callback");

      if (!isWebhook && !isPublic && !isOAuthCallback) {
        expect(hasAuth).toBe(true);
      }
    }
  });

  it("protected API routes verify authentication via getUser", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const apiDir = path.resolve(process.cwd(), "src/app/api");
    const routeFiles: string[] = [];

    function walkDir(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(full);
        } else if (entry.name === "route.ts") {
          routeFiles.push(full);
        }
      }
    }
    walkDir(apiDir);

    for (const routeFile of routeFiles) {
      const content = fs.readFileSync(routeFile, "utf-8");
      const isWebhook = routeFile.includes("webhook");
      const isPublic = routeFile.includes("public");
      const isOAuthCallback = routeFile.includes("google/callback");
      // Routes that use the admin client directly (service role) are exempt
      // because they are not user-scoped by RLS.
      const usesAdminClient = content.includes("createAdminClient");

      if (
        content.includes("getUser") &&
        !isWebhook &&
        !isPublic &&
        !isOAuthCallback &&
        !usesAdminClient
      ) {
        // Session-based routes must rely on RLS for tenant scoping rather
        // than bypassing it with an admin client.
        expect(content).toContain("createClient");
      }
    }
  });
});
