"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Viewing {
  id: string;
  property_id: string;
  lead_id: string;
  agent_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  cancelled_reason: string | null;
  created_at: string;
  properties?: {
    title: string;
    public_location_text: string | null;
    price: number;
    property_type: string;
    listing_type: string;
  };
  leads?: {
    name: string | null;
    phone: string | null;
    email: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  rescheduled: "bg-orange-100 text-orange-800",
  no_show: "bg-gray-100 text-gray-600",
};

export default function ViewingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const fetchViewing = useCallback(async () => {
    try {
      const res = await fetch(`/api/viewings/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setViewing(data.viewing);
    } catch {
      console.error("Failed to fetch viewing");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchViewing();
  }, [fetchViewing]);

  async function updateStatus(status: string, reason?: string) {
    setActionLoading(true);
    try {
      await fetch(`/api/viewings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, cancelled_reason: reason }),
      });
      fetchViewing();
      setShowCancel(false);
      setCancelReason("");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!viewing) {
    return <div className="text-center py-12 text-gray-500">Viewing not found</div>;
  }

  const startDate = new Date(viewing.start_at);
  const endDate = new Date(viewing.end_at);
  const currentStatus = STATUS_COLORS[viewing.status] || "bg-gray-100 text-gray-800";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{viewing.properties?.title || "Property Viewing"}</h1>
          <p className="text-sm text-gray-500">
            {viewing.leads?.name || viewing.leads?.phone || "Unknown Lead"}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${currentStatus}`}>
          {viewing.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">Viewing Details</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Date</dt>
                <dd className="font-medium">{startDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Time</dt>
                <dd className="font-medium">
                  {startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })} -{" "}
                  {endDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Lead</dt>
                <dd className="font-medium">{viewing.leads?.name || "-"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium">{viewing.leads?.phone || "-"}</dd>
              </div>
              {viewing.properties && (
                <>
                  <div>
                    <dt className="text-gray-500">Property Type</dt>
                    <dd className="font-medium">{viewing.properties.property_type}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Price</dt>
                    <dd className="font-medium">{viewing.properties.price?.toLocaleString()} KES</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {viewing.notes && (
            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="mb-2 text-sm font-medium text-gray-700">Notes</h2>
              <p className="text-sm text-gray-600">{viewing.notes}</p>
            </div>
          )}

          {viewing.cancelled_reason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h2 className="mb-2 text-sm font-medium text-red-800">Cancellation Reason</h2>
              <p className="text-sm text-red-700">{viewing.cancelled_reason}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">Actions</h2>
            <div className="space-y-2">
              {viewing.status === "requested" && (
                <>
                  <button
                    onClick={() => updateStatus("confirmed")}
                    disabled={actionLoading}
                    className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Processing..." : "Confirm Viewing"}
                  </button>
                  <button
                    onClick={() => setShowCancel(true)}
                    disabled={actionLoading}
                    className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
              {viewing.status === "confirmed" && (
                <>
                  <button
                    onClick={() => updateStatus("completed")}
                    disabled={actionLoading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Mark Completed
                  </button>
                  <button
                    onClick={() => updateStatus("no_show")}
                    disabled={actionLoading}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Mark No Show
                  </button>
                  <button
                    onClick={() => setShowCancel(true)}
                    disabled={actionLoading}
                    className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
              {(viewing.status === "completed" || viewing.status === "cancelled" || viewing.status === "no_show") && (
                <p className="text-sm text-gray-500 text-center py-2">No actions available</p>
              )}
            </div>
          </div>

          {showCancel && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="mb-2 text-sm font-medium text-red-800">Cancel Viewing</h3>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (optional)"
                className="w-full rounded-md border border-red-300 p-2 text-sm"
                rows={3}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => updateStatus("cancelled", cancelReason)}
                  disabled={actionLoading}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Confirm Cancel
                </button>
                <button
                  onClick={() => { setShowCancel(false); setCancelReason(""); }}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 p-4">
            <button
              onClick={() => router.back()}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Viewings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
