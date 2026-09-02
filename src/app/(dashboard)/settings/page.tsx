"use client";

import { useEffect, useState } from "react";

interface Agent {
  id: string;
  account_id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

interface Account {
  id: string;
  name: string;
  business_name?: string | null;
  country?: string | null;
  currency?: string | null;
  timezone?: string | null;
}

interface Branding {
  firm_name?: string | null;
  display_name?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  show_powered_by?: boolean | null;
}

interface WhatsAppAccount {
  id: string;
  display_phone?: string | null;
  verified_name?: string | null;
  status?: string | null;
  quality_rating?: string | null;
}

type Tab = "account" | "branding" | "whatsapp";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("account");

  const tabs: { key: Tab; label: string }[] = [
    { key: "account", label: "Account" },
    { key: "branding", label: "Branding" },
    { key: "whatsapp", label: "WhatsApp" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
        Settings
      </h1>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-current"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={tab === t.key ? { color: "var(--color-secondary)" } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "account" && <AccountSection />}
      {tab === "branding" && <BrandingSection />}
      {tab === "whatsapp" && <WhatsAppSection />}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-6">
      <h2 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
        {title}
      </h2>
      {description && <p className="text-sm text-gray-500 mt-1 mb-4">{description}</p>}
      {children}
    </div>
  );
}

function SuccessBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
      Changes saved.
    </div>
  );
}

function AccountSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("agent");

  useEffect(() => {
    fetch("/api/settings/account")
      .then((r) => r.json())
      .then((data) => {
        setAgent(data.agent || null);
        setAccount(data.account || null);
        setName(data.agent?.name || "");
        setRole(data.agent?.role || "agent");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  const input =
    "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-400";

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Profile" description="Your name and role within the workspace.">
        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-sm font-medium block mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input
              value={agent?.email || ""}
              disabled
              className={`${input} bg-gray-50 text-gray-400`}
            />
            <p className="text-xs text-gray-400 mt-1">Email is tied to your sign-in and cannot be changed here.</p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={input}>
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: "var(--color-navy)" }}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <SuccessBanner show={saved} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Workspace" description="Details for your organisation.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="text-sm font-medium block mb-1">Organisation name</label>
            <input value={account?.name || ""} disabled className={`${input} bg-gray-50 text-gray-400`} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Business name</label>
            <input value={account?.business_name || ""} disabled className={`${input} bg-gray-50 text-gray-400`} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Country</label>
            <input value={account?.country || ""} disabled className={`${input} bg-gray-50 text-gray-400`} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Currency</label>
            <input value={account?.currency || ""} disabled className={`${input} bg-gray-50 text-gray-400`} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function BrandingSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [branding, setBranding] = useState<Branding>({});

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => r.json())
      .then(setBranding)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  const input =
    "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-400";

  const set = (key: keyof Branding) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBranding((b) => ({ ...b, [key]: e.target.value }));

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <SectionCard
      title="Branding"
      description="How your brand appears on the public listings site and shared links."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div>
          <label className="text-sm font-medium block mb-1">Firm name</label>
          <input value={branding.firm_name || ""} onChange={set("firm_name")} className={input} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Display name</label>
          <input value={branding.display_name || ""} onChange={set("display_name")} className={input} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Phone</label>
          <input value={branding.phone || ""} onChange={set("phone")} className={input} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Email</label>
          <input value={branding.email || ""} onChange={set("email")} className={input} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Website</label>
          <input value={branding.website || ""} onChange={set("website")} className={input} />
        </div>
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Primary colour</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primary_color || "#182744"}
                onChange={set("primary_color")}
                className="h-9 w-12 border border-gray-200 rounded-md cursor-pointer"
              />
              <input value={branding.primary_color || ""} onChange={set("primary_color")} className={input} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Secondary colour</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.secondary_color || "#B49362"}
                onChange={set("secondary_color")}
                className="h-9 w-12 border border-gray-200 rounded-md cursor-pointer"
              />
              <input value={branding.secondary_color || ""} onChange={set("secondary_color")} className={input} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Accent colour</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.accent_color || "#B49362"}
                onChange={set("accent_color")}
                className="h-9 w-12 border border-gray-200 rounded-md cursor-pointer"
              />
              <input value={branding.accent_color || ""} onChange={set("accent_color")} className={input} />
            </div>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!branding.show_powered_by}
            onChange={(e) =>
              setBranding((b) => ({ ...b, show_powered_by: e.target.checked }))
            }
            className="h-4 w-4"
          />
          Show &ldquo;Powered by&rdquo; badge on the public site
        </label>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 hover:opacity-90"
          style={{ backgroundColor: "var(--color-navy)" }}
        >
          {saving ? "Saving..." : "Save branding"}
        </button>
        <SuccessBanner show={saved} />
      </div>
    </SectionCard>
  );
}

function WhatsAppSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);

  useEffect(() => {
    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((data) => setAccounts(data.whatsapp_accounts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const input =
    "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-400";

  async function save(wa: WhatsAppAccount, displayPhone: string, verifiedName: string) {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: wa.id, display_phone: displayPhone, verified_name: verifiedName }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (accounts.length === 0) {
    return (
      <SectionCard
        title="WhatsApp"
        description="Connect your WhatsApp Business API number."
      >
        <p className="text-sm text-gray-500">
          No WhatsApp numbers are connected yet. In mock mode, new numbers appear here once a
          real WhatsApp Business API account is connected via Supabase.
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      {accounts.map((wa) => (
        <EditableWhatsAppRow
          key={wa.id}
          wa={wa}
          input={input}
          saving={saving}
          onSave={save}
        />
      ))}
      <SuccessBanner show={saved} />
    </div>
  );
}

function EditableWhatsAppRow({
  wa,
  input,
  saving,
  onSave,
}: {
  wa: WhatsAppAccount;
  input: string;
  saving: boolean;
  onSave: (wa: WhatsAppAccount, displayPhone: string, verifiedName: string) => void;
}) {
  const [displayPhone, setDisplayPhone] = useState(wa.display_phone || "");
  const [verifiedName, setVerifiedName] = useState(wa.verified_name || "");

  return (
    <SectionCard title={wa.verified_name || wa.display_phone || "WhatsApp number"}>
      <div className="space-y-4 max-w-md">
        <div className="flex items-center gap-2">
          <span
            className="text-xs rounded-full px-2 py-0.5 capitalize"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "#fff",
            }}
          >
            {wa.status || "pending"}
          </span>
          {wa.quality_rating && (
            <span className="text-xs text-gray-400">Quality: {wa.quality_rating}</span>
          )}
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Display phone</label>
          <input value={displayPhone} onChange={(e) => setDisplayPhone(e.target.value)} className={input} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Verified name</label>
          <input value={verifiedName} onChange={(e) => setVerifiedName(e.target.value)} className={input} />
        </div>
        <button
          onClick={() => onSave(wa, displayPhone, verifiedName)}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 hover:opacity-90"
          style={{ backgroundColor: "var(--color-navy)" }}
        >
          {saving ? "Saving..." : "Save number"}
        </button>
      </div>
    </SectionCard>
  );
}
