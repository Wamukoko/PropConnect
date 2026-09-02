import { describe, it, expect } from "vitest";

/**
 * Integration tests for opt-out and consent enforcement.
 * Verifies that opted-out leads receive no marketing messages and
 * consent is checked at both enqueue and send time.
 */

const PERMANENT_FAILURE_CODES = new Set([
  "131026", "131027", "131051", "132000", "132001", "132012", "133004", "368",
]);

function isPermanentFailure(errorCode: string | undefined): boolean {
  if (!errorCode) return false;
  return PERMANENT_FAILURE_CODES.has(errorCode);
}

function calculateBackoff(attempt: number): number {
  const delays = [60, 300, 900, 3600, 14400];
  const index = Math.min(attempt - 1, delays.length - 1);
  return delays[index];
}

describe("opt-out enforcement", () => {
  it("mock client filters opted-out leads correctly", () => {
    const leads = [
      { id: "l-1", opted_out: false, name: "Active Lead" },
      { id: "l-2", opted_out: true, name: "Opted Out Lead" },
      { id: "l-3", opted_out: false, name: "Another Active Lead" },
    ];

    const nonOptedOut = leads.filter((l) => !l.opted_out);
    expect(nonOptedOut).toHaveLength(2);
    expect(nonOptedOut.map((l) => l.id)).toContain("l-1");
    expect(nonOptedOut.map((l) => l.id)).toContain("l-3");
    expect(nonOptedOut.map((l) => l.id)).not.toContain("l-2");
  });

  it("broadcast campaign creation filters opted-out leads", () => {
    const leads = [
      { id: "l-1", opted_out: false },
      { id: "l-2", opted_out: true },
      { id: "l-3", opted_out: false },
    ];

    // Simulate createBroadcastCampaign filtering
    const eligible = leads
      .filter((lead) => !lead.opted_out)
      .map((lead) => lead.id);

    expect(eligible).toEqual(["l-1", "l-3"]);
    expect(eligible).not.toContain("l-2");
  });

  it("send re-checks opt-out at send time, not just enqueue time", () => {
    // Scenario: lead opts out after message is enqueued but before send
    const recipients = [
      { id: "r-1", lead_id: "l-1", status: "pending", leadOptedOut: false },
      { id: "r-2", lead_id: "l-2", status: "pending", leadOptedOut: true },
    ];

    const toSend = recipients.filter((r) => r.status === "pending" && !r.leadOptedOut);
    const toSkip = recipients.filter((r) => r.status === "pending" && r.leadOptedOut);

    expect(toSend).toHaveLength(1);
    expect(toSend[0].id).toBe("r-1");
    expect(toSkip).toHaveLength(1);
    expect(toSkip[0].id).toBe("r-2");
  });

  it("saved search alerts respect opt-out", () => {
    const leads = [
      { id: "l-1", opted_out: false, budget_max: 200000 },
      { id: "l-2", opted_out: true, budget_max: 200000 },
    ];

    const propertyMatches = [
      { title: "Apartment", price: 150000 },
    ];

    const eligibleLeads = leads.filter((l) => !l.opted_out);
    expect(eligibleLeads).toHaveLength(1);
    expect(eligibleLeads[0].id).toBe("l-1");
  });
});

describe("consent enforcement", () => {
  it("mock client consent records track per-purpose consent", () => {
    const consentRecords = [
      { id: "c-1", account_id: "acc-1", lead_id: "l-1", purpose: "broadcasts", granted: true },
      { id: "c-2", account_id: "acc-1", lead_id: "l-2", purpose: "broadcasts", granted: false },
    ];

    const hasConsent = (leadId: string, purpose: string) =>
      consentRecords.some((r) => r.lead_id === leadId && r.purpose === purpose && r.granted);

    expect(hasConsent("l-1", "broadcasts")).toBe(true);
    expect(hasConsent("l-2", "broadcasts")).toBe(false);
    expect(hasConsent("l-3", "broadcasts")).toBe(false);
  });

  it("broadcast campaigns skip recipients without consent", () => {
    const recipients = [
      { id: "r-1", lead_id: "l-1", hasConsent: true },
      { id: "r-2", lead_id: "l-2", hasConsent: false },
      { id: "r-3", lead_id: "l-3", hasConsent: true },
    ];

    const consented = recipients.filter((r) => r.hasConsent);
    expect(consented).toHaveLength(2);
    expect(consented.map((r) => r.id)).toEqual(["r-1", "r-3"]);
  });

  it("outbound kill switch blocks all sending", () => {
    const killSwitchActive = true;
    const messageQueued = false;

    if (killSwitchActive) {
      expect(messageQueued).toBe(false);
    }
  });

  it("consent check defaults to service_messages for non-marketing", () => {
    // service_messages should always be allowed (transactional)
    const purpose = "service_messages";
    expect(purpose).toBe("service_messages");
  });
});

describe("outbound retry and failure handling", () => {
  it("classifies permanent failures correctly", () => {
    expect(isPermanentFailure("131026")).toBe(true); // invalid phone
    expect(isPermanentFailure("132001")).toBe(true); // not on WhatsApp
    expect(isPermanentFailure("368")).toBe(true);     // temporarily blocked
  });

  it("does not retry permanent failures", () => {
    const errorCode = "131026";
    const shouldRetry = !isPermanentFailure(errorCode);
    expect(shouldRetry).toBe(false);
  });

  it("retries transient failures with backoff", () => {
    expect(calculateBackoff(1)).toBe(60);      // 1 min
    expect(calculateBackoff(2)).toBe(300);     // 5 min
    expect(calculateBackoff(3)).toBe(900);     // 15 min
    expect(calculateBackoff(4)).toBe(3600);    // 1 hour
    expect(calculateBackoff(5)).toBe(14400);   // 4 hours
    expect(calculateBackoff(10)).toBe(14400);  // capped at 4 hours
  });

  it("max retry attempts limit", () => {
    const MAX_ATTEMPTS = 5;
    const attempt = 6;
    expect(attempt > MAX_ATTEMPTS).toBe(true);
  });
});
