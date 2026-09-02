import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("account_id")
    .eq("id", user.id)
    .single();
  if (!agent) {
    return NextResponse.json({ error: "No account" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const direction = searchParams.get("direction") || "";
  const readStatus = searchParams.get("read") || "";
  const stage = searchParams.get("stage") || "";
  const leadId = searchParams.get("lead_id") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "500", 10), 1000);

  let query = supabase
    .from("messages")
    .select("*")
    .eq("account_id", agent.account_id);

  if (direction === "inbound") query = query.eq("direction", "inbound");
  if (direction === "outbound") query = query.eq("direction", "outbound");
  if (readStatus === "unread") query = query.is("read_at", null).eq("direction", "inbound");
  if (readStatus === "read") query = query.not("read_at", "is", null);
  if (leadId) query = query.eq("lead_id", leadId);

  query = query.order("created_at", { ascending: false }).limit(limit);

  const { data: messages } = await query;

  const byLead = new Map<string, any[]>();
  for (const m of messages || []) {
    if (!m.lead_id) continue;
    const list = byLead.get(m.lead_id) || [];
    list.push(m);
    byLead.set(m.lead_id, list);
  }

  const leadIds = Array.from(byLead.keys());
  const { data: leads } = leadIds.length
    ? await supabase
        .from("leads")
        .select("id, name, whatsapp_name, phone, stage, opted_out, source, email, preferred_language")
        .in("id", leadIds)
    : { data: [] };

  const leadMap = new Map<string, any>();
  for (const l of leads || []) leadMap.set(l.id, l);

  let conversations = Array.from(byLead.entries())
    .map(([lid, list]) => {
      const lead = leadMap.get(lid) || null;
      const latest = list[0];
      const inbound = list.filter((m) => m.direction === "inbound");
      const outbound = list.filter((m) => m.direction === "outbound");

      const lastOutbound = outbound[0];
      let lastDeliveryStatus = "unknown";
      if (lastOutbound?.status) {
        lastDeliveryStatus = lastOutbound.status;
      } else if (lastOutbound) {
        lastDeliveryStatus = "sent";
      }

      return {
        lead_id: lid,
        lead: lead
          ? {
              id: lead.id,
              name: lead.name,
              whatsapp_name: lead.whatsapp_name,
              phone: lead.phone,
              stage: lead.stage,
              opted_out: lead.opted_out,
              source: lead.source,
              email: lead.email,
              preferred_language: lead.preferred_language,
            }
          : null,
        last_message: {
          direction: latest?.direction ?? null,
          type: latest?.type ?? null,
          body: messageBody(latest),
          created_at: latest?.created_at ?? null,
          status: lastDeliveryStatus,
        },
        unread_count: inbound.filter((m) => !m.read_at).length,
        total_count: list.length,
        inbound_count: inbound.length,
        outbound_count: outbound.length,
        has_failed: outbound.some(
          (m) => m.status === "failed" || m.status === "permanent_failure"
        ),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.last_message.created_at ?? 0).getTime() -
        new Date(a.last_message.created_at ?? 0).getTime()
    );

  if (stage) {
    conversations = conversations.filter((c) => c.lead?.stage === stage);
  }

  if (search) {
    const term = search.toLowerCase();
    conversations = conversations.filter((c) => {
      const name = (c.lead?.name || "").toLowerCase();
      const phone = (c.lead?.phone || "").toLowerCase();
      const whatsapp = (c.lead?.whatsapp_name || "").toLowerCase();
      return name.includes(term) || phone.includes(term) || whatsapp.includes(term);
    });
  }

  return NextResponse.json({ conversations });
}

function messageBody(m: any): string {
  const c = m?.content;
  if (!c) return "";
  if (typeof c === "string") return c;
  if (typeof c.body === "string") return c.body;
  try {
    return JSON.stringify(c);
  } catch {
    return "";
  }
}
