// Client-safe constants for the agent task model (Prompt.md section 23).
// Intentionally isolated so browser components never import the DB layer.

export const TASK_TYPES = [
  "lead_follow_up",
  "call_customer",
  "send_property_options",
  "confirm_viewing",
  "post_viewing_follow_up",
  "request_documents",
  "negotiation_follow_up",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  lead_follow_up: "Lead follow-up",
  call_customer: "Call customer",
  send_property_options: "Send property options",
  confirm_viewing: "Confirm viewing",
  post_viewing_follow_up: "Post-viewing follow-up",
  request_documents: "Request documents",
  negotiation_follow_up: "Negotiation follow-up",
};

export const VALID_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export type TaskStatus = (typeof VALID_STATUSES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const VALID_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof VALID_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};