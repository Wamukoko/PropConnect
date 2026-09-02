import { describe, it, expect } from "vitest";
import { areaAliasMatches } from "@/lib/analytics/location-matching";
import { suggestFollowUp } from "@/lib/analytics/tasks";
import { TASK_TYPES, TASK_TYPE_LABELS } from "@/lib/analytics/task-types";

describe("location matching", () => {
  describe("areaAliasMatches", () => {
    it("matches when alias contains the preferred area", () => {
      expect(areaAliasMatches(["Westlands", "Nairobi Westlands"], "westlands")).toBe(true);
    });

    it("matches when preferred area contains an alias", () => {
      expect(areaAliasMatches(["Kilimani"], "kilimani nairobi")).toBe(true);
    });

    it("returns false for no match", () => {
      expect(areaAliasMatches(["Kilimani", "Westlands"], "ruaka")).toBe(false);
    });

    it("returns false for empty preferred area", () => {
      expect(areaAliasMatches(["Kilimani"], "")).toBe(false);
    });

    it("is case insensitive", () => {
      expect(areaAliasMatches(["KILIMANI"], "kilimani")).toBe(true);
    });
  });
});

describe("suggestFollowUp", () => {
  it("marks high priority for long-dormant leads", async () => {
    const suggestion = await suggestFollowUp({
      accountId: "a",
      agentId: null,
      leadId: "l",
      leadName: "Amina",
      daysSinceContact: 20,
    });
    expect(suggestion.priority).toBe("high");
    expect(suggestion.type).toBe("lead_follow_up");
    expect(suggestion.dueAt).toBeTruthy();
  });

  it("marks low priority for recently contacted leads", async () => {
    const suggestion = await suggestFollowUp({
      accountId: "a",
      agentId: null,
      leadId: "l",
      leadName: "John",
      daysSinceContact: 1,
    });
    expect(suggestion.priority).toBe("low");
  });

  it("uses a fallback name when lead name is null", async () => {
    const suggestion = await suggestFollowUp({
      accountId: "a",
      agentId: null,
      leadId: "l",
      leadName: null,
      daysSinceContact: 7,
    });
    expect(suggestion.title).toContain("lead");
  });
});

describe("task type catalog", () => {
  it("has a human label for every supported task type", () => {
    for (const t of TASK_TYPES) {
      expect(TASK_TYPE_LABELS[t]).toBeTruthy();
    }
  });

  it("covers the pipeline-driven follow-up types", () => {
    expect(TASK_TYPES).toContain("confirm_viewing");
    expect(TASK_TYPES).toContain("post_viewing_follow_up");
    expect(TASK_TYPES).toContain("negotiation_follow_up");
  });
});
