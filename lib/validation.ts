import type { TaskPriority, TaskStatus } from "@/types";

const validStatuses: TaskStatus[] = ["Pending", "In Progress", "Completed"];
const validPriorities: TaskPriority[] = ["Low", "Medium", "High"];

export function isValidStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && validStatuses.includes(value as TaskStatus);
}

export function isValidPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && validPriorities.includes(value as TaskPriority);
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function hasNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
