import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkPlus, Check, X } from "lucide-react";
import {
  useListProjectFilterPresets,
  useCreateProjectFilterPreset,
  useDeleteProjectFilterPreset,
  getListProjectFilterPresetsQueryKey,
  type BoardFilterPreset,
} from "@workspace/api-client-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  type BoardFilters,
  filtersAreEqual,
  EMPTY_FILTERS,
} from "@/hooks/use-board-filters";

interface Props {
  projectId: number;
  filters: BoardFilters;
  onApply: (next: BoardFilters) => void;
  hasActiveFilters: boolean;
}

export function SavedFilterPresets({
  projectId,
  filters,
  onApply,
  hasActiveFilters,
}: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const { data: presets } = useListProjectFilterPresets(projectId);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: getListProjectFilterPresetsQueryKey(projectId),
    });
  };

  const create = useCreateProjectFilterPreset({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Preset saved" });
        setName("");
        setOpen(false);
      },
      onError: (err: unknown) => {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Could not save preset";
        toast({ title: message, variant: "destructive" });
      },
    },
  });

  const remove = useDeleteProjectFilterPreset({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Preset removed" });
      },
      onError: () =>
        toast({
          title: "Could not remove preset",
          variant: "destructive",
        }),
    },
  });

  const matchesPayload = (preset: BoardFilterPreset) =>
    filtersAreEqual(filters, {
      assigneeIds: preset.payload.assigneeIds,
      priorities: preset.payload.priorities,
      overdueOnly: preset.payload.overdueOnly,
    });

  const currentMatchesAny = (presets ?? []).some(matchesPayload);
  const canSave = hasActiveFilters && !currentMatchesAny;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate({
      id: projectId,
      data: {
        name: trimmed,
        payload: {
          assigneeIds: filters.assigneeIds,
          priorities: filters.priorities,
          overdueOnly: filters.overdueOnly,
        },
      },
    });
  };

  const handleApply = (preset: BoardFilterPreset) => {
    onApply({
      ...EMPTY_FILTERS,
      assigneeIds: preset.payload.assigneeIds,
      priorities: preset.payload.priorities,
      overdueOnly: preset.payload.overdueOnly,
    });
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      data-testid="saved-filter-presets"
    >
      {(presets ?? []).map((preset) => {
        const active = matchesPayload(preset);
        return (
          <div
            key={preset.id}
            className={cn(
              "group inline-flex items-center h-8 rounded-full border text-xs transition-colors",
              active
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-background border-border text-foreground hover:border-foreground/30",
            )}
            data-testid={`preset-chip-${preset.id}`}
          >
            <button
              type="button"
              onClick={() => handleApply(preset)}
              className="flex items-center gap-1.5 pl-3 pr-1.5 h-full"
              data-testid={`button-apply-preset-${preset.id}`}
              title={`Apply preset "${preset.name}"`}
            >
              {active ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              <span className="font-medium truncate max-w-[12rem]">
                {preset.name}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove.mutate({
                  projectId,
                  presetId: preset.id,
                });
              }}
              className={cn(
                "flex items-center justify-center h-6 w-6 mr-1 rounded-full opacity-60 hover:opacity-100",
                active
                  ? "hover:bg-primary-foreground/20"
                  : "hover:bg-muted",
              )}
              data-testid={`button-delete-preset-${preset.id}`}
              aria-label={`Delete preset ${preset.name}`}
              title="Delete preset"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={!canSave}
            data-testid="button-save-preset"
            title={
              !hasActiveFilters
                ? "Apply some filters to save them as a preset"
                : currentMatchesAny
                  ? "This combination is already saved"
                  : "Save current filters as preset"
            }
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span className="text-xs">Save preset</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <form onSubmit={handleSave} className="space-y-2">
            <Label htmlFor="preset-name" className="text-xs">
              Preset name
            </Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My urgent overdue work"
              maxLength={60}
              autoFocus
              data-testid="input-preset-name"
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setName("");
                }}
                data-testid="button-cancel-save-preset"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!name.trim() || create.isPending}
                data-testid="button-confirm-save-preset"
              >
                Save
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
