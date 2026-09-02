import { describe, it, expect } from "vitest";
import { buildCounts, buildSections } from "@/lib/analytics/task-grouping";

function iso(daysFromNow: number, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function task(status: string, dueAt: string | null) {
  return { status, due_at: dueAt };
}

describe("buildCounts", () => {
  it("buckets overdue, today, upcoming by due date", () => {
    const counts = buildCounts([
      task("pending", iso(-2)),
      task("pending", iso(0)),
      task("in_progress", iso(3)),
      task("completed", iso(-10)),
      task("cancelled", iso(1)),
      task("pending", null),
    ]);
    expect(counts.overdue).toBe(1);
    expect(counts.today).toBe(1);
    expect(counts.upcoming).toBe(1);
    expect(counts.inProgress).toBe(1);
    expect(counts.completed).toBe(1);
  });

  it("excludes completed and cancelled from due counts", () => {
    const counts = buildCounts([
      task("completed", iso(-1)),
      task("cancelled", iso(-1)),
    ]);
    expect(counts.overdue).toBe(0);
    expect(counts.completed).toBe(1);
  });
});

describe("buildSections", () => {
  it("groups tasks into the expected sections in order", () => {
    const sections = buildSections([
      task("pending", null),
      task("cancelled", iso(1)),
      task("pending", iso(-1)),
      task("completed", iso(-2)),
      task("pending", iso(0)),
      task("pending", iso(5)),
    ]);
    const byKey = Object.fromEntries(sections.map((s) => [s.key, s.tasks]));
    expect(byKey.overdue).toHaveLength(1);
    expect(byKey.today).toHaveLength(1);
    expect(byKey.upcoming).toHaveLength(1);
    expect(byKey.unscheduled).toHaveLength(1);
    expect(byKey.completed).toHaveLength(1);
    expect(byKey.cancelled).toHaveLength(1);
  });

  it("sorts overdue tasks earliest-first", () => {
    const sections = buildSections([
      task("pending", iso(-1)),
      task("pending", iso(-5)),
    ]);
    const overdue = sections.find((s) => s.key === "overdue")!;
    expect(overdue.tasks.map((t) => t.due_at)).toEqual([iso(-5), iso(-1)]);
  });

  it("sorts unscheduled tasks after completing none of them early", () => {
    const sections = buildSections([task("pending", null), task("pending", null)]);
    expect(sections.find((s) => s.key === "unscheduled")!.tasks).toHaveLength(2);
  });
});