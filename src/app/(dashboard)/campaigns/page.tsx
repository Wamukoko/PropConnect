"use client";

import { useEffect, useState } from "react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  template_name: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch {
      console.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign() {
    if (!name.trim() || !templateName.trim()) return;
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, template_name: templateName }),
    });
    if (res.ok) {
      setName("");
      setTemplateName("");
      setShowNew(false);
      fetchCampaigns();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create campaign");
    }
  }

  async function sendCampaign(id: string) {
    setSending(id);
    try {
      await fetch(`/api/campaigns/${id}`, { method: "POST", body: "{}" });
      fetchCampaigns();
    } finally {
      setSending(null);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Broadcast Campaigns</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-lg px-4 py-2 text-sm text-white hover:opacity-90"
          style={{ backgroundColor: "var(--color-navy)" }}
        >
          {showNew ? "Cancel" : "New Campaign"}
        </button>
      </div>

      {showNew && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
          <input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="WhatsApp template name"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={createCampaign}
            disabled={!name.trim() || !templateName.trim()}
            className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            Create & Queue
          </button>
          <p className="text-xs text-gray-400">
            Recipients are limited to leads who have consented to broadcast messages
            and have not opted out.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No broadcast campaigns yet.</p>
        ) : (
          campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{campaign.name}</span>
                  <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 capitalize">
                    {campaign.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Template: {campaign.template_name} · {campaign.total_recipients} recipients
                  {campaign.sent_count > 0 && ` · ${campaign.sent_count} sent`}
                  {campaign.failed_count > 0 && ` · ${campaign.failed_count} failed`}
                </p>
              </div>
              <div className="flex gap-2">
                {campaign.status === "queued" && (
                  <button
                    onClick={() => sendCampaign(campaign.id)}
                    disabled={sending === campaign.id}
                    className="rounded-md px-3 py-1 text-xs text-white disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-secondary)" }}
                  >
                    {sending === campaign.id ? "Sending..." : "Send Batch"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
