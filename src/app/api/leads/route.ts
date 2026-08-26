import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leadFilterSchema } from "@/lib/validators/lead";

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);

  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { params[k] = v; });

  const parsed = leadFilterSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : leadFilterSchema.parse({});

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get account_id from agents table
  const { data: agent } = await supabase
    .from("agents")
    .select("account_id")
    .eq("id", user.id)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("account_id", agent.account_id);

  if (filters.stage) {
    query = query.eq("stage", filters.stage);
  }
  if (filters.source) {
    query = query.eq("source", filters.source);
  }
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,whatsapp_name.ilike.%${filters.search}%`);
  }

  const offset = (filters.page - 1) * filters.limit;
  query = query
    .order(filters.sort, { ascending: filters.order === "asc" })
    .range(offset, offset + filters.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    leads: data,
    total: count,
    page: filters.page,
    limit: filters.limit,
    totalPages: count ? Math.ceil(count / filters.limit) : 0,
  });
}
