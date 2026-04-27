import { useCallback, useMemo } from "react";
import { useSearchParams } from "wouter";
import { PRIORITY_ORDER, type TaskPriority } from "@/lib/constants";

export interface BoardFilters {
  assigneeIds: number[];
  priorities: TaskPriority[];
  overdueOnly: boolean;
}

export const EMPTY_FILTERS: BoardFilters = {
  assigneeIds: [],
  priorities: [],
  overdueOnly: false,
};

const PRIORITY_SET = new Set<TaskPriority>(PRIORITY_ORDER);

function parseAssignees(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parsePriorities(raw: string | null | undefined): TaskPriority[] {
  if (!raw) return [];
  return raw
    .split(",")
    .filter((v): v is TaskPriority => PRIORITY_SET.has(v as TaskPriority));
}

function normalizePriorities(values: readonly string[]): TaskPriority[] {
  return values.filter((v): v is TaskPriority =>
    PRIORITY_SET.has(v as TaskPriority),
  );
}

function setEqual(a: readonly number[], b: readonly number[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  for (const v of b) if (!set.has(v)) return false;
  return true;
}

function priorityEqual(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  for (const v of b) if (!set.has(v)) return false;
  return true;
}

export function filtersAreEqual(a: BoardFilters, b: BoardFilters): boolean {
  return (
    a.overdueOnly === b.overdueOnly &&
    setEqual(a.assigneeIds, b.assigneeIds) &&
    priorityEqual(a.priorities, b.priorities)
  );
}

function buildParams(
  prev: URLSearchParams,
  merged: BoardFilters,
): URLSearchParams {
  const out = new URLSearchParams(prev);
  if (merged.assigneeIds.length)
    out.set("assignee", merged.assigneeIds.join(","));
  else out.delete("assignee");
  if (merged.priorities.length)
    out.set("priority", merged.priorities.join(","));
  else out.delete("priority");
  if (merged.overdueOnly) out.set("overdue", "1");
  else out.delete("overdue");
  return out;
}

export function useBoardFilters() {
  const [params, setParams] = useSearchParams();

  const filters: BoardFilters = useMemo(
    () => ({
      assigneeIds: parseAssignees(params.get("assignee")),
      priorities: parsePriorities(params.get("priority")),
      overdueOnly: params.get("overdue") === "1",
    }),
    [params],
  );

  const update = useCallback(
    (next: Partial<BoardFilters>) => {
      setParams(
        (prev) => {
          const merged: BoardFilters = {
            assigneeIds: parseAssignees(prev.get("assignee")),
            priorities: parsePriorities(prev.get("priority")),
            overdueOnly: prev.get("overdue") === "1",
            ...next,
          };
          return buildParams(prev, merged);
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const apply = useCallback(
    (next: BoardFilters) => {
      const normalized: BoardFilters = {
        assigneeIds: next.assigneeIds.filter(
          (n) => Number.isFinite(n) && n > 0,
        ),
        priorities: normalizePriorities(next.priorities),
        overdueOnly: Boolean(next.overdueOnly),
      };
      setParams((prev) => buildParams(prev, normalized), { replace: true });
    },
    [setParams],
  );

  const clear = useCallback(() => {
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        out.delete("assignee");
        out.delete("priority");
        out.delete("overdue");
        return out;
      },
      { replace: true },
    );
  }, [setParams]);

  const hasActiveFilters =
    filters.assigneeIds.length > 0 ||
    filters.priorities.length > 0 ||
    filters.overdueOnly;

  return { filters, update, apply, clear, hasActiveFilters };
}
