import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  useListProjects,
  useListTasks,
  useListMembers,
  useSearch,
  getSearchQueryKey,
} from "@workspace/api-client-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MemberAvatar } from "@/components/member-avatar";
import { FolderKanban, CheckSquare, Users, MessageSquare } from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SearchPalette({ open, onOpenChange }: Props) {
  const [, setLocation] = useLocation();
  const { data: projects } = useListProjects();
  const { data: tasks } = useListTasks();
  const { data: members } = useListMembers();

  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      setDebouncedQuery("");
      return;
    }
    const id = setTimeout(() => setDebouncedQuery(trimmed), 200);
    return () => clearTimeout(id);
  }, [inputValue]);

  useEffect(() => {
    if (!open) setInputValue("");
  }, [open]);

  const searchParams = { q: debouncedQuery, limit: 20 };
  const { data: searchResults } = useSearch(searchParams, {
    query: {
      queryKey: getSearchQueryKey(searchParams),
      enabled: debouncedQuery.length >= 2,
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const projectById = useMemo(
    () => new Map((projects ?? []).map((p) => [p.id, p])),
    [projects],
  );

  const navigate = (path: string) => {
    onOpenChange(false);
    setLocation(path);
  };

  const commentMatches = searchResults?.comments ?? [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search projects, tasks, comments, and people..."
        value={inputValue}
        onValueChange={setInputValue}
        data-testid="input-search-palette"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {projects && projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((project) => (
              <CommandItem
                key={`project-${project.id}`}
                value={`project ${project.name} ${project.description ?? ""}`}
                onSelect={() => navigate(`/projects/${project.id}`)}
                data-testid={`palette-result-project-${project.id}`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.color || "#ccc" }}
                />
                <span className="flex-1 truncate">{project.name}</span>
                <FolderKanban className="w-3.5 h-3.5 opacity-50 shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {tasks && tasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {tasks.map((task) => {
              const project = projectById.get(task.projectId);
              return (
                <CommandItem
                  key={`task-${task.id}`}
                  value={`task ${task.title} ${project?.name ?? ""} ${task.description ?? ""}`}
                  onSelect={() => navigate(`/tasks/${task.id}`)}
                  data-testid={`palette-result-task-${task.id}`}
                >
                  <CheckSquare className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  <span className="flex-1 truncate">{task.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {project?.name ?? ""} · {STATUS_LABELS[task.status]}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {commentMatches.length > 0 && (
          <CommandGroup heading="Comments">
            {commentMatches.map((match) => {
              const project = projectById.get(match.projectId);
              return (
                <CommandItem
                  key={`comment-${match.commentId}`}
                  value={`comment ${match.taskTitle} ${match.snippet} ${debouncedQuery}`}
                  onSelect={() => navigate(`/tasks/${match.taskId}`)}
                  data-testid={`palette-result-comment-${match.commentId}`}
                >
                  <MessageSquare className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{match.taskTitle}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {match.snippet}
                    </div>
                  </div>
                  {project && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {project.name}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {members && members.length > 0 && (
          <CommandGroup heading="People">
            {members.map((member) => (
              <CommandItem
                key={`member-${member.id}`}
                value={`person ${member.name} ${member.role ?? ""} ${member.email ?? ""}`}
                onSelect={() => navigate(`/team/${member.id}`)}
                data-testid={`palette-result-member-${member.id}`}
              >
                <MemberAvatar member={member} size="sm" />
                <span className="flex-1 truncate">{member.name}</span>
                <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {member.role}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
