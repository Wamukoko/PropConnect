import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const MOCK_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@qabila.co.ke",
  user_metadata: { name: "Admin User" },
};

const MOCK_AGENT = {
  id: "00000000-0000-0000-0000-000000000001",
  account_id: "00000000-0000-0000-0000-000000000010",
  name: "Admin User",
  email: "admin@qabila.co.ke",
  role: "admin",
  active: true,
};

export async function createClient() {
  const cookieStore = await cookies();
  const isMockAuth = process.env.FEATURE_MOCK_AUTH === "true";

  if (isMockAuth) {
    return createMockClient(cookieStore);
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — ignore
          }
        },
      },
    }
  );
}

function createMockClient(cookieStore: any) {
  const hasCookie = cookieStore.get("mock_auth")?.value === "true";

  return {
    auth: {
      getUser: async () => {
        if (hasCookie) {
          return { data: { user: MOCK_USER }, error: null };
        }
        return { data: { user: null }, error: null };
      },
      signInWithPassword: async ({ email }: { email: string; password: string }) => {
        cookieStore.set("mock_auth", "true", { path: "/", httpOnly: true });
        return { data: { user: { ...MOCK_USER, email } }, error: null };
      },
      signOut: async () => {
        cookieStore.delete("mock_auth");
        return { error: null };
      },
    },
    from: (table: string) => ({
      select: (cols?: string) => ({
        eq: (col: string, val: any) => ({
          single: () => {
            if (table === "agents" && col === "id" && val === MOCK_USER.id) {
              return { data: MOCK_AGENT, error: null };
            }
            if (table === "agents" && col === "account_id") {
              return { data: [MOCK_AGENT], error: null };
            }
            return { data: null, error: null };
          },
          order: () => ({
            range: () => ({ data: [], error: null, count: 0 }),
            limit: () => ({ data: [], error: null }),
          }),
          limit: () => ({ data: [], error: null }),
        }),
        ilike: () => ({ data: [], error: null, count: 0 }),
        or: () => ({ data: [], error: null, count: 0 }),
        count: { exact: true },
        order: () => ({
          range: () => ({ data: [], error: null, count: 0 }),
          limit: () => ({ data: [], error: null }),
        }),
        limit: () => ({ data: [], error: null }),
      }),
      insert: (row: any) => ({
        select: () => ({
          single: () => ({ data: { id: "mock-id", ...row }, error: null }),
        }),
      }),
      update: (row: any) => ({
        eq: () => ({
          select: () => ({
            single: () => ({ data: { id: "mock-id", ...row }, error: null }),
          }),
        }),
      }),
      upsert: (row: any) => ({
        select: () => ({
          single: () => ({ data: { id: "mock-id", ...row }, error: null }),
        }),
      }),
      delete: () => ({
        eq: () => ({ error: null }),
      }),
    }),
    rpc: () => ({ data: [], error: null }),
  } as any;
}
