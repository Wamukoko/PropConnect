"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  contact_type: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
}

interface ListResponse {
  contacts: Contact[];
  total: number;
  totalPages: number;
  page: number;
}

const CONTACT_TYPES = [
  "prospect",
  "lead",
  "customer",
  "buyer",
  "seller",
  "landlord",
  "tenant",
  "property_owner",
  "agent",
  "vendor",
  "other",
];

const input =
  "w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-400";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [total, setTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "success") {
      setSyncMsg(
        `Google Contacts sync complete: ${params.get("imported") || 0} imported, ${params.get("skipped") || 0} skipped.`
      );
    } else if (params.get("google") === "error") {
      setSyncMsg("Google Contacts sync failed or was cancelled.");
    }
  }, []);

  async function exportContacts(format: "csv" | "vcf") {
    setExporting(true);
    try {
      const res = await fetch(`/api/contacts/export?format=${format}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename = match ? match[1] : `contacts.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      if (showArchived) params.set("archived", "true");
      const res = await fetch(`/api/contacts?${params.toString()}`);
      const data: ListResponse = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [search, type, showArchived]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const searchDebounced = useDebouncedCallback(fetchContacts, 300);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
            Contacts
          </h1>
          <p className="text-sm text-gray-500 mt-1">{total} contact{total === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="rounded-lg px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50"
          >
            Import
          </button>
          <button
            onClick={() => exportContacts("csv")}
            disabled={exporting}
            className="rounded-lg px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            onClick={() => exportContacts("vcf")}
            disabled={exporting}
            className="rounded-lg px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            Export VCF
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-lg px-4 py-2 text-sm text-white hover:opacity-90"
            style={{ backgroundColor: "var(--color-navy)" }}
          >
            Add Contact
          </button>
        </div>
      </div>

      {syncMsg && (
        <div
          className={`text-sm px-3 py-2 rounded-md border ${
            syncMsg.startsWith("Google Contacts sync failed")
              ? "text-red-700 bg-red-50 border-red-200"
              : "text-green-700 bg-green-50 border-green-200"
          }`}
        >
          {syncMsg}
        </div>
      )}

      <SyncSection />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            searchDebounced();
          }}
          placeholder="Search name, phone, email, company..."
          className={`${input} max-w-xs`}
        />
        <select value={type} onChange={(e) => { setType(e.target.value); }} className={`${input} max-w-[180px]`}>
          <option value="">All types</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4"
          />
          Show archived
        </label>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No contacts{search || type || showArchived ? " match your filters" : " yet"}.{" "}
          {!search && !type && (
            <>
              Add a contact manually or import from CSV/VCF.
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Company / Role</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contacts.map((c) => (
                <ContactRow key={c.id} contact={c} onChanged={fetchContacts} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <ContactForm
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            fetchContacts();
          }}
        />
      )}

      {showImport && (
        <ImportDialog
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            fetchContacts();
          }}
        />
      )}
    </div>
  );
}

function useDebouncedCallback(fn: () => void, delay: number) {
  const callback = useCallback(fn, [fn]);
  const timer = useRef<number | null>(null);
  const debounced = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => callback(), delay);
  }, [callback, delay]);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);
  return debounced;
}

function SyncSection() {
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/contacts/google/status")
      .then((r) => r.json())
      .then((data) => {
        setConnectUrl(data.enabled ? data.url : null);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-6">
      <h2 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
        Contact Sync
      </h2>
      <p className="text-sm text-gray-500 mt-1 mb-4">
        Import and keep contacts in sync with your Google account.
      </p>
      {checking ? (
        <p className="text-sm text-gray-400">Checking sync availability...</p>
      ) : connectUrl ? (
        <a
          href={connectUrl}
          className="inline-block rounded-lg px-4 py-2 text-sm text-white hover:opacity-90"
          style={{ backgroundColor: "var(--color-secondary)" }}
        >
          Connect Google Contacts
        </a>
      ) : (
        <p className="text-sm text-gray-500">
          Google Contacts sync is not configured or disabled. Enable it by setting{" "}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">FEATURE_CONTACT_GOOGLE_SYNC=true</code>{" "}
          and adding Google OAuth credentials.
        </p>
      )}
    </div>
  );
}

function ContactRow({ contact: c, onChanged }: { contact: Contact; onChanged: () => void }) {
  const [archiving, setArchiving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const name = c.display_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
  const typeLabel = c.contact_type?.replace(/_/g, " ") || "—";

  async function archive() {
    setArchiving(true);
    try {
      await fetch(`/api/contacts/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      onChanged();
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      <tr className={c.archived_at ? "opacity-60" : ""}>
        <td className="px-4 py-3 font-medium">{name}</td>
        <td className="px-4 py-3">{c.phone || "—"}</td>
        <td className="px-4 py-3">{c.email || "—"}</td>
        <td className="px-4 py-3">
          {[c.company, c.job_title].filter(Boolean).join(" · ") || "—"}
        </td>
        <td className="px-4 py-3">
          <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 capitalize">{typeLabel}</span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Edit
            </button>
            {!c.archived_at && (
              <button
                onClick={archive}
                disabled={archiving}
                className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                {archiving ? "..." : "Archive"}
              </button>
            )}
          </div>
        </td>
      </tr>
      {showEdit && (
        <ContactForm
          contact={c}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            onChanged();
          }}
        />
      )}
    </>
  );
}

function ContactForm({
  contact,
  onClose,
  onSaved,
}: {
  contact?: Contact;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [first, setFirst] = useState(contact?.first_name || "");
  const [last, setLast] = useState(contact?.last_name || "");
  const [phone, setPhone] = useState(contact?.phone || "");
  const [email, setEmail] = useState(contact?.email || "");
  const [company, setCompany] = useState(contact?.company || "");
  const [title, setTitle] = useState(contact?.job_title || "");
  const [type, setType] = useState(contact?.contact_type || "other");
  const [notes, setNotes] = useState(contact?.notes || "");

  async function save() {
    setSaving(true);
    setError("");
    const payload = {
      first_name: first,
      last_name: last,
      display_name: first || last ? `${first} ${last}`.trim() : null,
      phone,
      email,
      company,
      job_title: title,
      contact_type: type,
      notes,
    };
    try {
      const res = contact
        ? await fetch(`/api/contacts/${contact.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save contact");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={contact ? "Edit Contact" : "Add Contact"} onClose={onClose}>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">First name</label>
            <input value={first} onChange={(e) => setFirst(e.target.value)} className={input} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Last name</label>
            <input value={last} onChange={(e) => setLast(e.target.value)} className={input} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Company</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={input} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Job title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={input}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 hover:opacity-90"
          style={{ backgroundColor: "var(--color-navy)" }}
        >
          {saving ? "Saving..." : contact ? "Save changes" : "Add contact"}
        </button>
      </div>
    </Modal>
  );
}

function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [format, setFormat] = useState<"csv" | "vcf">("csv");
  const [content, setContent] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
        return;
      }
      setResult(data);
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal title="Import Contacts" onClose={onClose}>
      {!result ? (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Paste CSV (columns: name, phone, email, company, title) or VCF text.
          </p>
          <div className="flex gap-2 mb-3">
            {(["csv", "vcf"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`rounded-md px-3 py-1.5 text-sm border ${
                  format === f
                    ? "text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
                style={format === f ? { backgroundColor: "var(--color-navy)" } : undefined}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={7}
            placeholder={
              format === "csv"
                ? "name,phone,email,company,title\nAmina Yusuf,+254711000001,amina@example.com,Apex Realty,Buyer"
                : "BEGIN:VCARD\nFN:Amina Yusuf\nTEL:+254711000001\nEMAIL:amina@example.com\nORG:Apex Realty\nTITLE:Buyer\nEND:VCARD"
            }
            className={input}
          />
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={run}
              disabled={importing || !content.trim()}
              className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: "var(--color-navy)" }}
            >
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4">
            Successfully imported {result.imported} contact{result.imported === 1 ? "" : "s"}.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setResult(null);
                setContent("");
              }}
              className="rounded-lg px-4 py-2 text-sm border border-gray-200 hover:bg-gray-50"
            >
              Import more
            </button>
            <button
              onClick={onImported}
              className="rounded-lg px-4 py-2 text-sm text-white hover:opacity-90"
              style={{ backgroundColor: "var(--color-navy)" }}
            >
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
            {title}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
