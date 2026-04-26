import { useMemo } from "react";
import { Check, ChevronDown, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { MemberAvatar } from "@/components/member-avatar";
import { PRIORITY_ORDER, PRIORITY_TONE, type TaskPriority } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Member } from "@workspace/api-client-react";
import type { BoardFilters as Filters } from "@/hooks/use-board-filters";

interface Props {
  members: Member[];
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function BoardFilters({ members, filters, onChange, onClear, hasActiveFilters }: Props) {
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const selectedAssignees = filters.assigneeIds
    .map((id) => memberById.get(id))
    .filter((m): m is Member => Boolean(m));

  const toggleAssignee = (id: number) => {
    const next = filters.assigneeIds.includes(id)
      ? filters.assigneeIds.filter((x) => x !== id)
      : [...filters.assigneeIds, id];
    onChange({ assigneeIds: next });
  };

  const togglePriority = (p: TaskPriority) => {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p];
    onChange({ priorities: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="board-filters">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            data-testid="button-filter-assignee"
          >
            <span className="text-xs font-medium">Assignee</span>
            {selectedAssignees.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {selectedAssignees.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="max-h-64 overflow-y-auto">
            {members.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">No members yet.</div>
            ) : (
              members.map((m) => {
                const checked = filters.assigneeIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer"
                    data-testid={`option-filter-assignee-${m.id}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleAssignee(m.id)}
                    />
                    <MemberAvatar member={m} size="sm" />
                    <span className="text-sm flex-1 truncate">{m.name}</span>
                    {checked && <Check className="w-3.5 h-3.5 text-primary" />}
                  </label>
                );
              })
            )}
          </div>
          {filters.assigneeIds.length > 0 && (
            <>
              <div className="h-px bg-border my-1" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center h-8 text-xs"
                onClick={() => onChange({ assigneeIds: [] })}
                data-testid="button-clear-assignee-filter"
              >
                Clear assignees
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-1 px-1">
        {PRIORITY_ORDER.map((p) => {
          const active = filters.priorities.includes(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => togglePriority(p)}
              data-testid={`button-filter-priority-${p}`}
              className={cn(
                "h-7 px-2.5 rounded-full text-xs capitalize border transition-colors",
                active
                  ? cn(PRIORITY_TONE[p], "border-transparent ring-1 ring-primary/40")
                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
              )}
            >
              {p}
            </button>
          );
        })}
      </div>

      <Button
        variant={filters.overdueOnly ? "default" : "outline"}
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => onChange({ overdueOnly: !filters.overdueOnly })}
        data-testid="button-filter-overdue"
      >
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="text-xs">Overdue only</span>
      </Button>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onClear}
          data-testid="button-clear-all-filters"
        >
          <X className="w-3.5 h-3.5" />
          <span className="text-xs">Clear all</span>
        </Button>
      )}
    </div>
  );
}
