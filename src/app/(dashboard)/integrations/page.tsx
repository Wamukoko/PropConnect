"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const ENABLED = process.env.NEXT_PUBLIC_FEATURE_CONTACT_GOOGLE_SYNC === "true";

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [googleReady, setGoogleReady] = useState(ENABLED);

  useEffect(() => {
    const google = searchParams.get("google");
    if (google === "success") {
      const imported = searchParams.get("imported");
      const skipped = searchParams.get("skipped");
      setMessage(`Google Contacts sync complete: imported ${imported || 0}, skipped ${skipped || 0}.`);
    } else if (google === "error") {
      setMessage("Google Contacts sync failed. Please try again.");
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Integrations</h1>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {message}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Google Contacts</h2>
            <p className="text-sm text-gray-500 mt-1">
              Import your Google Contacts into the contact directory with automatic
              duplicate detection.
            </p>
          </div>
          {googleReady ? (
            // eslint-disable-next-line @next/next/no-html-link-for-pages -- anchors are used for API OAuth flow, not page navigation
            <a
              href="/api/contacts/google/auth"
              className="rounded-lg px-4 py-2 text-sm text-white hover:opacity-90"
              style={{ backgroundColor: "var(--color-navy)" }}
            >
              Connect Google
            </a>
          ) : (
            <span className="text-xs text-gray-400 rounded-full bg-gray-100 px-3 py-1">
              Not configured
            </span>
          )}
        </div>
        {!googleReady && (
          <p className="text-xs text-gray-400 mt-3">
            Enable by setting <code>FEATURE_CONTACT_GOOGLE_SYNC=true</code> and the
            Google OAuth client credentials in your environment.
          </p>
        )}
      </div>
    </div>
  );
}
