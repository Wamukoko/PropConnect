import { describe, it, expect } from "vitest";
import { createAiJob } from "@/lib/ai";

// createAiJob reaches the database; we only test its input guard logic by
// stubbing the env to reject sensitive content before any DB call.
describe("AI copilot safety guards", () => {
  it("rejects job types that are not supported", async () => {
    const result = await createAiJob({
      accountId: "a",
      agentId: "g",
      jobType: "not_a_real_type" as any,
      inputData: {},
    });
    expect(result.error).toContain("Unknown job type");
  });

  it("rejects sensitive material in extraction contexts", async () => {
    const result = await createAiJob({
      accountId: "a",
      agentId: "g",
      jobType: "field_extraction",
      inputData: { passport: "PA-123456" },
    });
    expect(result.error).toContain("cannot contain sensitive");
  });

  it("rejects sensitive material in prioritization contexts", async () => {
    const result = await createAiJob({
      accountId: "a",
      agentId: "g",
      jobType: "lead_prioritization",
      inputData: { proof_of_funds: "statement.pdf" },
    });
    expect(result.error).toContain("cannot contain sensitive");
  });
});
