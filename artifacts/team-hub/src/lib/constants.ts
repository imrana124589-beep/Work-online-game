export const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export const STATUS_ORDER = ["todo", "in_progress", "in_review", "done"] as const;
export type TaskStatus = (typeof STATUS_ORDER)[number];

export const PRIORITY_ORDER = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof PRIORITY_ORDER)[number];

export const PRIORITY_TONE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary text-secondary-foreground",
  high: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  urgent: "bg-destructive text-destructive-foreground",
};

export const PROJECT_COLORS = [
  "#7C5CFF",
  "#37A8A0",
  "#E5704B",
  "#E5B83B",
  "#5C8DFF",
  "#D6589F",
  "#5BA86C",
  "#9B6BC4",
];

export const AVATAR_COLORS = [
  "#7C5CFF",
  "#37A8A0",
  "#E5704B",
  "#E5B83B",
  "#5C8DFF",
  "#D6589F",
  "#5BA86C",
  "#9B6BC4",
  "#3B7FB8",
  "#C24A6B",
];

export const PROJECT_STATUSES = ["active", "archived"] as const;
