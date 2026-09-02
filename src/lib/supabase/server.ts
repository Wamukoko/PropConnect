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

// Minimal in-memory persistence so rows created during a mock session
// survive across requests (e.g. create property -> view detail).
const PERSISTED_TABLES = [
  "properties",
  "property_photos",
  "agent_tasks",
  "lead_timeline_events",
  "messages",
  "saved_searches",
];
const mockStore = new Map<string, any[]>();
function mockTableRows(table: string, seed: any[]) {
  if (!mockStore.has(table)) {
    mockStore.set(table, seed.map((r) => ({ ...r })));
  }
  return mockStore.get(table)!;
}
function isPersisted(table: string) {
  return PERSISTED_TABLES.includes(table);
}

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
    from: (table: string) => mockQueryBuilder(table),
    rpc: () => ({ data: [], error: null }),
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: "" }, error: null }),
        createSignedUrl: async (path: string) => ({
          data: { signedUrl: path },
          error: null,
        }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  } as any;
}

function toComparable(v: any) {
  return typeof v === "string" && !isNaN(Date.parse(v)) ? Date.parse(v) : v;
}

function mockQueryBuilder(table: string) {
  const ACCOUNT = MOCK_AGENT.account_id;
  const now = Date.now();
  const day = 864e5;
  const hour = 36e5;

  const MOCK_ROWS: Record<string, any[]> = {
    agents: [{ ...MOCK_AGENT }],
    contacts: [
      { id: "c-1", account_id: ACCOUNT, first_name: "Amina", last_name: "Yusuf", display_name: "Amina Yusuf", phone: "+254711000001", email: "amina@example.com", company: "Apex Realty", job_title: "Buyer", contact_type: "buyer", archived_at: null, created_at: new Date(now - 2 * day).toISOString() },
      { id: "c-2", account_id: ACCOUNT, first_name: "Brian", last_name: "Ochieng", display_name: "Brian Ochieng", phone: "+254722000002", email: "brian@example.com", company: null, job_title: null, contact_type: "prospect", archived_at: null, created_at: new Date(now - 4 * day).toISOString() },
      { id: "c-3", account_id: ACCOUNT, first_name: "Carol", last_name: "Wanjiku", display_name: "Carol Wanjiku", phone: "+254733000003", email: "carol@example.com", company: "Nairobi Homes", job_title: "Landlord", contact_type: "landlord", archived_at: null, created_at: new Date(now - 6 * day).toISOString() },
      { id: "c-4", account_id: ACCOUNT, first_name: "David", last_name: "Mwangi", display_name: "David Mwangi", phone: "+254744000004", email: "david@example.com", company: null, job_title: null, contact_type: "seller", archived_at: null, created_at: new Date(now - 8 * day).toISOString() },
      { id: "c-5", account_id: ACCOUNT, first_name: "Esther", last_name: "Njeri", display_name: "Esther Njeri", phone: "+254755000005", email: "esther@example.com", company: "Kenya Sacco", job_title: "Tenant", contact_type: "tenant", archived_at: new Date(now - 20 * day).toISOString(), created_at: new Date(now - 30 * day).toISOString() },
    ],
    properties: [
      { id: "p-1", account_id: ACCOUNT, title: "Modern 3-bed apartment, Westlands", reference_code: "PC-0001", description: "Bright and spacious apartment with a balcony overlooking the city.", property_type: "apartment", listing_type: "rent", status: "published", price: 150000, currency: "KES", bedrooms: 3, bathrooms: 2, floor_area: 120, furnished: true, parking_spaces: 1, amenities: ["gym", "parking"], public_location_text: "Westlands, Nairobi", published_at: new Date(now - 3 * day).toISOString(), created_at: new Date(now - 3 * day).toISOString() },
      { id: "p-2", account_id: ACCOUNT, title: "Spacious 4-bed villa, Karen", reference_code: "PC-0002", description: "Elegant villa with a private garden and staff quarters.", property_type: "villa", listing_type: "sale", status: "available", price: 65000000, currency: "KES", bedrooms: 4, bathrooms: 5, floor_area: 350, land_area: 1200, furnished: false, parking_spaces: 4, amenities: ["garden", "swimming_pool", "staff_quarters"], public_location_text: "Karen, Nairobi", published_at: new Date(now - 12 * day).toISOString(), created_at: new Date(now - 12 * day).toISOString() },
      { id: "p-3", account_id: ACCOUNT, title: "Office space, Upperhill", reference_code: "PC-0003", description: "Grade-A office space in a prime business district.", property_type: "office", listing_type: "rent", status: "available", price: 400000, currency: "KES", bedrooms: null, bathrooms: 4, floor_area: 400, furnished: false, parking_spaces: 10, amenities: ["lobby", "boardroom", "parking"], public_location_text: "Upperhill, Nairobi", published_at: new Date(now - 20 * day).toISOString(), created_at: new Date(now - 20 * day).toISOString() },
      { id: "p-4", account_id: ACCOUNT, title: "2-bed apartment, Kilimani", reference_code: "PC-0004", description: "Cozy apartment close to schools and shopping malls.", property_type: "apartment", listing_type: "rent", status: "under_offer", price: 95000, currency: "KES", bedrooms: 2, bathrooms: 2, floor_area: 85, furnished: false, parking_spaces: 1, amenities: ["parking"], public_location_text: "Kilimani, Nairobi", published_at: new Date(now - 25 * day).toISOString(), created_at: new Date(now - 25 * day).toISOString() },
      { id: "p-5", account_id: ACCOUNT, title: "Commercial plot, Thika Road", reference_code: "PC-0005", description: "Prime commercial plot with road frontage and clean title.", property_type: "land", listing_type: "sale", status: "draft", price: 85000000, currency: "KES", bedrooms: null, bathrooms: null, land_area: 2000, furnished: false, parking_spaces: null, amenities: [], public_location_text: "Thika Road, Nairobi", created_at: new Date(now - 40 * day).toISOString() },
    ],
    property_photos: [
      { id: "ph-1", account_id: ACCOUNT, property_id: "p-1", storage_path: "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=600", alt_text: "Modern apartment building", sort_order: 0, deleted_at: null, created_at: new Date(now - 3 * day).toISOString() },
      { id: "ph-2", account_id: ACCOUNT, property_id: "p-1", storage_path: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600", alt_text: "Apartment balcony", sort_order: 1, deleted_at: null, created_at: new Date(now - 3 * day).toISOString() },
      { id: "ph-3", account_id: ACCOUNT, property_id: "p-2", storage_path: "https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=600", alt_text: "Villa with garden", sort_order: 0, deleted_at: null, created_at: new Date(now - 12 * day).toISOString() },
      { id: "ph-4", account_id: ACCOUNT, property_id: "p-2", storage_path: "https://images.pexels.com/photos/280222/pexels-photo-280222.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/280222/pexels-photo-280222.jpeg?auto=compress&cs=tinysrgb&w=600", alt_text: "Master bedroom", sort_order: 1, deleted_at: null, created_at: new Date(now - 12 * day).toISOString() },
      { id: "ph-5", account_id: ACCOUNT, property_id: "p-2", storage_path: "https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=600", alt_text: "Living room", sort_order: 2, deleted_at: null, created_at: new Date(now - 12 * day).toISOString() },
      { id: "ph-6", account_id: ACCOUNT, property_id: "p-3", storage_path: "https://images.pexels.com/photos/256150/pexels-photo-256150.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/256150/pexels-photo-256150.jpeg?auto=compress&cs=tinysrgb&w=600", alt_text: "Office building", sort_order: 0, deleted_at: null, created_at: new Date(now - 20 * day).toISOString() },
      { id: "ph-7", account_id: ACCOUNT, property_id: "p-3", storage_path: "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=600", alt_text: "Open plan office interior", sort_order: 1, deleted_at: null, created_at: new Date(now - 20 * day).toISOString() },
      { id: "ph-8", account_id: ACCOUNT, property_id: "p-4", storage_path: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=600", alt_text: "Modern apartment interior", sort_order: 0, deleted_at: null, created_at: new Date(now - 25 * day).toISOString() },
      { id: "ph-9", account_id: ACCOUNT, property_id: "p-5", storage_path: "https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg?auto=compress&cs=tinysrgb&w=600", alt_text: "Vacant land plot", sort_order: 0, deleted_at: null, created_at: new Date(now - 40 * day).toISOString() },
    ],
    leads: [
      { id: "l-1", account_id: ACCOUNT, name: "Amina Yusuf", whatsapp_name: "Amina Yusuf", phone: "+254712345601", email: "amina.yusuf@example.com", stage: "new", lead_score: 35, source: "whatsapp", preferred_language: "en", budget_min: 120000, budget_max: 180000, listing_type: "rent", property_type: "apartment", preferred_area: "Westlands", created_at: new Date(now - 2 * hour).toISOString() },
      { id: "l-2", account_id: ACCOUNT, name: "Brian Ochieng", whatsapp_name: "Brian O.", phone: "+254722345602", email: "brian.ochieng@example.com", stage: "contacted", lead_score: 55, source: "website", preferred_language: "en", budget_min: 45000000, budget_max: 60000000, listing_type: "sale", property_type: "villa", preferred_area: "Karen", created_at: new Date(now - 26 * hour).toISOString() },
      { id: "l-3", account_id: ACCOUNT, name: "Carol Wanjiku", whatsapp_name: "Carol", phone: "+254733345603", email: "carol.wanjiku@example.com", stage: "qualified", lead_score: 72, source: "referral", preferred_language: "en", budget_min: 60000, budget_max: 90000, listing_type: "rent", property_type: "apartment", preferred_area: "Kilimani", created_at: new Date(now - 3 * day).toISOString() },
      { id: "l-4", account_id: ACCOUNT, name: "David Mwangi", whatsapp_name: "David M", phone: "+254744345604", email: "david.mwangi@example.com", stage: "new", lead_score: 20, source: "social", preferred_language: "sw", budget_min: 8000000, budget_max: 15000000, listing_type: "sale", property_type: "land", preferred_area: "Kitengela", created_at: new Date(now - 5 * day).toISOString() },
      { id: "l-5", account_id: ACCOUNT, name: "Esther Njeri", whatsapp_name: "Esther Njeri", phone: "+254755345605", email: "esther.njeri@example.com", stage: "converted", lead_score: 95, source: "whatsapp", preferred_language: "en", budget_min: 200000, budget_max: 300000, listing_type: "sale", property_type: "maisonette", preferred_area: "Ruiru", created_at: new Date(now - 8 * day).toISOString() },
      { id: "l-6", account_id: ACCOUNT, name: "Farida Ali", whatsapp_name: "FaridaAli", phone: "+254766345606", email: "farida.ali@example.com", stage: "contacted", lead_score: 48, source: "instagram", preferred_language: "en", budget_min: 150000, budget_max: 220000, listing_type: "rent", property_type: "apartment", preferred_area: "Kilimani", created_at: new Date(now - 11 * day).toISOString() },
      { id: "l-7", account_id: ACCOUNT, name: "George Kamau", whatsapp_name: "George", phone: "+254777345607", email: "george.kamau@example.com", stage: "new", lead_score: 15, source: "whatsapp", preferred_language: "sw", budget_min: 25000000, budget_max: 40000000, listing_type: "sale", property_type: "townhouse", preferred_area: "Syokimau", created_at: new Date(now - 14 * day).toISOString() },
      { id: "l-8", account_id: ACCOUNT, name: "Hellen Moraa", whatsapp_name: "Hellen M", phone: "+254788345608", email: "hellen.moraa@example.com", stage: "lost", lead_score: 10, source: "referral", preferred_language: "sw", budget_min: 40000, budget_max: 70000, listing_type: "rent", property_type: "bed_sitter", preferred_area: "Kasarani", created_at: new Date(now - 19 * day).toISOString() },
    ],
    viewings: [
      {
        id: "v-1", account_id: ACCOUNT, property_id: "p-1", lead_id: "l-1", agent_id: MOCK_AGENT.id,
        status: "requested",
        start_at: new Date(now + 2 * hour).toISOString(),
        end_at: new Date(now + 3 * hour).toISOString(),
        notes: "Client prefers to meet at the gate.",
        created_at: new Date(now - 1 * hour).toISOString(),
        properties: {
          id: "p-1", title: "Modern 3-bed apartment, Westlands", public_location_text: "Westlands, Nairobi",
          price: 150000, property_type: "apartment", listing_type: "rent",
          property_photos: [
            { storage_path: "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=600" },
          ],
        },
        leads: { name: "Amina Yusuf", phone: "+254712345601" },
      },
      {
        id: "v-2", account_id: ACCOUNT, property_id: "p-4", lead_id: "l-6", agent_id: MOCK_AGENT.id,
        status: "confirmed",
        start_at: new Date(new Date(now + 1 * day).setHours(10, 0, 0, 0)).toISOString(),
        end_at: new Date(new Date(now + 1 * day).setHours(11, 0, 0, 0)).toISOString(),
        notes: null,
        created_at: new Date(now - 2 * hour).toISOString(),
        properties: {
          id: "p-4", title: "2-bed apartment, Kilimani", public_location_text: "Kilimani, Nairobi",
          price: 95000, property_type: "apartment", listing_type: "rent",
          property_photos: [
            { storage_path: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=600" },
          ],
        },
        leads: { name: "Farida Ali", phone: "+254766345606" },
      },
      {
        id: "v-3", account_id: ACCOUNT, property_id: "p-2", lead_id: "l-2", agent_id: MOCK_AGENT.id,
        status: "confirmed",
        start_at: new Date(new Date(now + 2 * day).setHours(9, 0, 0, 0)).toISOString(),
        end_at: new Date(new Date(now + 2 * day).setHours(10, 0, 0, 0)).toISOString(),
        notes: null,
        created_at: new Date(now - 6 * hour).toISOString(),
        properties: {
          id: "p-2", title: "Spacious 4-bed villa, Karen", public_location_text: "Karen, Nairobi",
          price: 65000000, property_type: "villa", listing_type: "sale",
          property_photos: [
            { storage_path: "https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=600" },
          ],
        },
        leads: { name: "Brian Ochieng", phone: "+254722345602" },
      },
      {
        id: "v-4", account_id: ACCOUNT, property_id: "p-1", lead_id: "l-3", agent_id: MOCK_AGENT.id,
        status: "completed",
        start_at: new Date(new Date(now - 1 * day).setHours(14, 0, 0, 0)).toISOString(),
        end_at: new Date(new Date(now - 1 * day).setHours(15, 0, 0, 0)).toISOString(),
        notes: "Loved the apartment — negotiating rent.",
        created_at: new Date(now - 3 * day).toISOString(),
        properties: {
          id: "p-1", title: "Modern 3-bed apartment, Westlands", public_location_text: "Westlands, Nairobi",
          price: 150000, property_type: "apartment", listing_type: "rent",
          property_photos: [
            { storage_path: "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=600" },
          ],
        },
        leads: { name: "Carol Wanjiku", phone: "+254733345603" },
      },
      {
        id: "v-5", account_id: ACCOUNT, property_id: "p-3", lead_id: "l-4", agent_id: MOCK_AGENT.id,
        status: "cancelled",
        start_at: new Date(new Date(now - 4 * day).setHours(11, 0, 0, 0)).toISOString(),
        end_at: new Date(new Date(now - 4 * day).setHours(12, 0, 0, 0)).toISOString(),
        notes: "Client found another office space.",
        created_at: new Date(now - 5 * day).toISOString(),
        properties: {
          id: "p-3", title: "Office space, Upperhill", public_location_text: "Upperhill, Nairobi",
          price: 400000, property_type: "office", listing_type: "rent",
          property_photos: [
            { storage_path: "https://images.pexels.com/photos/256150/pexels-photo-256150.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/256150/pexels-photo-256150.jpeg?auto=compress&cs=tinysrgb&w=600" },
          ],
        },
        leads: { name: "David Mwangi", phone: "+254744345604" },
      },
      {
        id: "v-6", account_id: ACCOUNT, property_id: "p-4", lead_id: "l-5", agent_id: MOCK_AGENT.id,
        status: "no_show",
        start_at: new Date(new Date(now - 6 * day).setHours(16, 0, 0, 0)).toISOString(),
        end_at: new Date(new Date(now - 6 * day).setHours(17, 0, 0, 0)).toISOString(),
        notes: null,
        created_at: new Date(now - 7 * day).toISOString(),
        properties: {
          id: "p-4", title: "2-bed apartment, Kilimani", public_location_text: "Kilimani, Nairobi",
          price: 95000, property_type: "apartment", listing_type: "rent",
          property_photos: [
            { storage_path: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200", thumbnail_path: "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=600" },
          ],
        },
        leads: { name: "Esther Njeri", phone: "+254755345605" },
      },
    ],
    messages: [
      { id: "m-1", account_id: ACCOUNT, lead_id: "l-1", direction: "inbound", type: "text", content: { body: "Hello! I saw the Westlands apartment listing and I'm interested." }, created_at: new Date(now - 1 * hour).toISOString() },
      { id: "m-2", account_id: ACCOUNT, lead_id: "l-1", direction: "outbound", type: "text", content: { body: "Great! It's a modern 3-bed in a great location. When would you like to view it?" }, created_at: new Date(now - 0.8 * hour).toISOString() },
      { id: "m-3", account_id: ACCOUNT, lead_id: "l-1", direction: "inbound", type: "text", content: { body: "This weekend would work if possible. What time slots are available?" }, created_at: new Date(now - 0.5 * hour).toISOString() },
      { id: "m-4", account_id: ACCOUNT, lead_id: "l-2", direction: "inbound", type: "text", content: { body: "Can you share more about the Karen villa?" }, created_at: new Date(now - 2 * hour).toISOString() },
    ],
    lead_timeline_events: [
      { id: "t-1", account_id: ACCOUNT, lead_id: "l-1", actor_type: "system", event_type: "lead_created", metadata: { source: "whatsapp" }, created_at: new Date(now - 3 * hour).toISOString() },
      { id: "t-2", account_id: ACCOUNT, lead_id: "l-1", actor_type: "agent", event_type: "message_received", metadata: { body: "Hello! Interested in Westlands listing" }, created_at: new Date(now - 1.2 * hour).toISOString() },
      { id: "t-3", account_id: ACCOUNT, lead_id: "l-1", actor_type: "agent", event_type: "note_added", metadata: { note: "Prefers the weekend for viewing; high budget range." }, created_at: new Date(now - 0.4 * hour).toISOString() },
    ],
    agent_tasks: [
      { id: "at-1", account_id: ACCOUNT, agent_id: MOCK_AGENT.id, lead_id: "l-2", type: "confirm_viewing", title: "Confirm viewing for Karen villa", description: "Brian requested a viewing for the Karen villa.", notes: "Call to confirm Saturday slot.", status: "pending", priority: "high", due_at: new Date(now + 2 * hour).toISOString(), completed_at: null, created_at: new Date(now - 5 * hour).toISOString(), updated_at: new Date(now - 5 * hour).toISOString() },
      { id: "at-2", account_id: ACCOUNT, agent_id: MOCK_AGENT.id, lead_id: "l-3", type: "negotiation_follow_up", title: "Negotiate rent on Westlands apartment", description: "Carol loved the apartment — negotiate rent.", notes: null, status: "in_progress", priority: "medium", due_at: new Date(new Date(now + 1 * day).setHours(15, 0, 0, 0)).toISOString(), completed_at: null, created_at: new Date(now - 1 * day).toISOString(), updated_at: new Date(now - 1 * day).toISOString() },
      { id: "at-3", account_id: ACCOUNT, agent_id: MOCK_AGENT.id, lead_id: "l-1", type: "send_property_options", title: "Send 2 more options in Westlands", description: "Amina wants more apartments in her budget.", notes: null, status: "pending", priority: "medium", due_at: new Date(now + 1 * day).toISOString(), completed_at: null, created_at: new Date(now - 6 * hour).toISOString(), updated_at: new Date(now - 6 * hour).toISOString() },
      { id: "at-4", account_id: ACCOUNT, agent_id: MOCK_AGENT.id, lead_id: "l-6", type: "request_documents", title: "Request proof of funds from Farida", description: "Needed to progress the Kilimani viewing.", notes: null, status: "pending", priority: "low", due_at: new Date(new Date(now + 3 * day).setHours(10, 0, 0, 0)).toISOString(), completed_at: null, created_at: new Date(now - 2 * day).toISOString(), updated_at: new Date(now - 2 * day).toISOString() },
      { id: "at-5", account_id: ACCOUNT, agent_id: MOCK_AGENT.id, lead_id: "l-5", type: "post_viewing_follow_up", title: "Post-viewing follow-up with Esther", description: "Esther viewed the Kilimani apartment.", notes: null, status: "completed", priority: "medium", due_at: new Date(now - 4 * day).toISOString(), completed_at: new Date(now - 3 * day).toISOString(), created_at: new Date(now - 6 * day).toISOString(), updated_at: new Date(now - 3 * day).toISOString() },
    ],
    conversation_sessions: [
      { id: "s-1", account_id: ACCOUNT, lead_id: "l-1", status: "active", started_at: new Date(now - 3 * hour).toISOString(), created_at: new Date(now - 3 * hour).toISOString() },
    ],
    saved_searches: [
      { id: "ss-1", account_id: ACCOUNT, agent_id: MOCK_AGENT.id, name: "Westlands apartments under 180K", filters: { listing_type: "rent", property_type: "apartment", price_max: 180000 }, alert_enabled: true, alert_frequency: "daily", last_run_at: new Date(now - 1 * day).toISOString(), created_at: new Date(now - 10 * day).toISOString(), updated_at: new Date(now - 1 * day).toISOString() },
      { id: "ss-2", account_id: ACCOUNT, agent_id: MOCK_AGENT.id, name: "Karen villas for sale", filters: { listing_type: "sale", property_type: "villa", price_max: 60000000 }, alert_enabled: false, alert_frequency: "weekly", last_run_at: null, created_at: new Date(now - 5 * day).toISOString(), updated_at: new Date(now - 5 * day).toISOString() },
    ],
  };

  let rows: any[] = isPersisted(table)
    ? mockTableRows(table, MOCK_ROWS[table] || [])
    : (MOCK_ROWS[table] || []).slice();
  let headOnly = false;
  const orderBy: { col: string; asc: boolean } = { col: "created_at", asc: false };
  let limitTo: number | null = null;
  let start: number | null = null;
  let end: number | null = null;

  function sortRows(): any[] {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const av = a[orderBy.col];
      const bv = b[orderBy.col];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return orderBy.asc
        ? new Date(av).getTime() - new Date(bv).getTime()
        : new Date(bv).getTime() - new Date(av).getTime();
    });
    return sorted;
  }

  function resolveData() {
    let list = sortRows();
    if (table === "properties") {
      const photoRows = mockTableRows("property_photos", MOCK_ROWS.property_photos || [])
        .filter((p) => p.deleted_at == null)
        .sort((a, b) => a.sort_order - b.sort_order);
      list = list.map((r) => ({
        ...r,
        property_photos: photoRows.filter((p) => p.property_id === r.id),
      }));
    }
    if (table === "agent_tasks") {
      const leadRows = MOCK_ROWS.leads || [];
      const agentRows = MOCK_ROWS.agents || [];
      list = list.map((r) => ({
        ...r,
        lead: r.lead_id ? leadRows.find((ld) => ld.id === r.lead_id) || null : null,
        agent: r.agent_id ? agentRows.find((a) => a.id === r.agent_id) || null : null,
      }));
    }
    if (start != null && end != null) {
      list = list.slice(start, end + 1);
    } else if (limitTo != null) {
      list = list.slice(0, limitTo);
    }
    if (headOnly) {
      return { data: null, error: null, count: rows.length };
    }
    return { data: list, error: null, count: rows.length };
  }

  function builder() {
    const self = {
      eq: (col: string, val: any) => {
        rows = rows.filter((r) => r[col] === val);
        return self;
      },
      is: (col: string, val: any) => {
        if (val === null) {
          rows = rows.filter((r) => r[col] == null);
        } else {
          rows = rows.filter((r) => r[col] === val);
        }
        return self;
      },
      not: (col: string, op: string, val: any) => {
        if (op === "is" && val === null) {
          rows = rows.filter((r) => r[col] != null);
        } else {
          rows = rows.filter((r) => r[col] !== val);
        }
        return self;
      },
      ilike: (col: string, pattern: string) => {
        const needle = pattern.replace(/%/g, "").toLowerCase();
        rows = rows.filter((r) => (r[col] ?? "").toString().toLowerCase().includes(needle));
        return self;
      },
      in: (col: string, values: any[]) => {
        rows = rows.filter((r) => values.includes(r[col]));
        return self;
      },
      or: (filters: string) => {
        const clauses = filters
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        rows = rows.filter((r) =>
          clauses.some((clause) => {
            const m = /^([a-z_]+)\.ilike\.(.*)$/i.exec(clause);
            if (m) {
              const needle = m[2].replace(/%/g, "").toLowerCase();
              return (r[m[1]] ?? "").toString().toLowerCase().includes(needle);
            }
            return false;
          })
        );
        return self;
      },
      gte: (col: string, val: any) => {
        const target = toComparable(val);
        rows = rows.filter((r) => toComparable(r[col]) >= target);
        return self;
      },
      gt: (col: string, val: any) => {
        const target = toComparable(val);
        rows = rows.filter((r) => toComparable(r[col]) > target);
        return self;
      },
      lte: (col: string, val: any) => {
        const target = toComparable(val);
        rows = rows.filter((r) => toComparable(r[col]) <= target);
        return self;
      },
      lt: (col: string, val: any) => {
        const target = toComparable(val);
        rows = rows.filter((r) => toComparable(r[col]) < target);
        return self;
      },
      order: (col: string, o?: any) => {
        orderBy.col = col;
        orderBy.asc = o?.ascending !== false;
        return self;
      },
      limit: (n: number) => {
        limitTo = n;
        return self;
      },
      range: (a: number, b: number) => {
        start = a;
        end = b;
        return self;
      },
      single: async () => {
        const r = resolveData();
        const list = Array.isArray(r.data) ? r.data : r.data === null ? [] : [r.data];
        return { data: list[0] ?? null, error: r.error };
      },
      then: (resolve: any, reject: any) => {
        resolve(resolveData());
      },
    };
    return self;
  }

  return {
    select: (cols?: string, opts?: any) => {
      if (opts?.head === true) headOnly = true;
      return builder();
    },
    insert: (row: any) => {
      const record = {
        id: `${table.slice(0, 3)}-${Date.now().toString(36)}${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        account_id: ACCOUNT,
        created_at: new Date().toISOString(),
        ...row,
      };
      if (isPersisted(table)) {
        mockTableRows(table, MOCK_ROWS[table] || []).push(record);
      }
      return {
        select: () => ({
          single: () => ({ data: record, error: null }),
        }),
      };
    },
    update: (row: any) => {
      const matched: number[] = [];
      function recordFor(index: number) {
        const updated = { ...rows[index], ...row, updated_at: new Date().toISOString() };
        rows[index] = updated;
        return updated;
      }
      const chain: any = {
        eq: (col: string, val: any) => {
          rows.forEach((r, i) => {
            if (!matched.includes(i) && r[col] === val) matched.push(i);
          });
          return chain;
        },
        is: (col: string, val: any) => {
          rows.forEach((r, i) => {
            if (!matched.includes(i) && (val === null ? r[col] == null : r[col] === val)) {
              matched.push(i);
            }
          });
          return chain;
        },
        select: () => {
          const sub: any = {
            single: () => {
              const i = matched[0];
              return {
                data: i != null ? recordFor(i) : null,
                error: i != null ? null : { message: "Not found" },
              };
            },
            then: (resolve: any) =>
              resolve({ data: matched.map(recordFor), error: null }),
          };
          return sub;
        },
        then: (resolve: any) => resolve({ data: matched.map(recordFor), error: null }),
      };
      return chain;
    },
    upsert: (row: any) => ({
      select: () => ({
        single: () => ({ data: { id: "mock-id", ...row }, error: null }),
      }),
    }),
    delete: () => {
      const matched: number[] = [];
      const chain: any = {
        eq: (col: string, val: any) => {
          rows.forEach((r, i) => {
            if (!matched.includes(i) && r[col] === val) matched.push(i);
          });
          return chain;
        },
        is: (col: string, val: any) => {
          rows.forEach((r, i) => {
            if (!matched.includes(i) && (val === null ? r[col] == null : r[col] === val)) {
              matched.push(i);
            }
          });
          return chain;
        },
        select: () => ({
          single: () => {
            const i = matched[0];
            const target = i != null ? rows[i] : null;
            if (target != null) {
              matched.sort((a, b) => b - a).forEach((idx) => rows.splice(idx, 1));
            }
            return { data: target, error: target ? null : { message: "Not found" } };
          },
        }),
        then: (resolve: any) => {
          matched.sort((a, b) => b - a).forEach((idx) => rows.splice(idx, 1));
          resolve({ error: null });
        },
      };
      return chain;
    },
  };
}
