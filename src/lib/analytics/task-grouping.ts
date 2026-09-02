export interface TaskLike {
  status: string;
  due_at: string | null;
}

export interface Section<T extends TaskLike = TaskLike> {
  key: string;
  label: string;
  tasks: T[];
}

export interface TaskCounts {
  overdue: number;
  today: number;
  upcoming: number;
  inProgress: number;
  completed: number;
}

export function buildCounts(tasks: TaskLike[]): TaskCounts {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000;
  const due = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  return {
    overdue: due.filter((t) => t.due_at && new Date(t.due_at).getTime() < startOfToday).length,
    today: due.filter(
      (t) =>
        t.due_at &&
        new Date(t.due_at).getTime() >= startOfToday &&
        new Date(t.due_at).getTime() < endOfToday
    ).length,
    upcoming: due.filter((t) => t.due_at && new Date(t.due_at).getTime() >= endOfToday).length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };
}

export function buildSections<T extends TaskLike>(tasks: T[]): Section<T>[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000;

  const sections: Section<T>[] = [
    { key: "overdue", label: "Overdue", tasks: [] },
    { key: "today", label: "Due Today", tasks: [] },
    { key: "upcoming", label: "Upcoming", tasks: [] },
    { key: "unscheduled", label: "No Due Date", tasks: [] },
    { key: "completed", label: "Completed", tasks: [] },
    { key: "cancelled", label: "Cancelled", tasks: [] },
  ];
  const byKey = new Map(sections.map((s) => [s.key, s]));

  for (const t of tasks) {
    if (t.status === "completed") {
      byKey.get("completed")!.tasks.push(t);
    } else if (t.status === "cancelled") {
      byKey.get("cancelled")!.tasks.push(t);
    } else if (!t.due_at) {
      byKey.get("unscheduled")!.tasks.push(t);
    } else {
      const due = new Date(t.due_at).getTime();
      const key = due < startOfToday ? "overdue" : due < endOfToday ? "today" : "upcoming";
      byKey.get(key)!.tasks.push(t);
    }
  }

  for (const s of sections) {
    s.tasks.sort((a, b) => {
      const av = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const bv = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return av - bv;
    });
  }

  return sections;
}