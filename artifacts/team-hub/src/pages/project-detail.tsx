import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProject,
  useListTasks,
  useGetProjectStats,
  useListMembers,
  useDeleteProject,
  useUpdateTask,
  getListProjectsQueryKey,
  getGetProjectQueryKey,
  getListTasksQueryKey,
  getGetProjectStatsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetWorkloadQueryKey,
  getGetMyTasksQueryKey,
  getGetRecentActivityQueryKey,
  type Task,
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Loader2, ArrowLeft, MoreVertical, Trash2, CalendarDays } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateTaskDialog } from "@/components/dialogs/create-task-dialog";
import { MemberAvatar } from "@/components/member-avatar";
import { BoardFilters } from "@/components/board-filters";
import { useBoardFilters } from "@/hooks/use-board-filters";
import { STATUS_LABELS, STATUS_ORDER, PRIORITY_TONE, type TaskStatus } from "@/lib/constants";
import { format, isPast, isToday } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ProjectDetail() {
  const params = useParams();
  const projectId = Number(params.id);
  const [, setLocation] = useLocation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();

  const { data: project, isLoading: loadingProject } = useGetProject(projectId);
  const { data: stats } = useGetProjectStats(projectId);
  const { data: tasks, isLoading: loadingTasks } = useListTasks({ projectId });
  const { data: members } = useListMembers();
  const { filters, update: updateFilters, clear: clearFilters, hasActiveFilters } = useBoardFilters();

  const deleteProject = useDeleteProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        toast({ title: "Project deleted" });
        setLocation("/projects");
      },
      onError: () => toast({ title: "Could not delete project", variant: "destructive" }),
    },
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWorkloadQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
      },
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  // Prefer pointer-within for hits, fall back to rectIntersection so a drop
  // that overshoots a column edge still resolves to the nearest column.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  };

  const memberById = useMemo(
    () => new Map((members ?? []).map((m) => [m.id, m])),
    [members],
  );

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task) => {
      if (filters.assigneeIds.length > 0) {
        if (!task.assigneeId || !filters.assigneeIds.includes(task.assigneeId)) return false;
      }
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
        return false;
      }
      if (filters.overdueOnly) {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        if (!(isPast(due) && !isToday(due)) || task.status === "done") return false;
      }
      return true;
    });
  }, [tasks, filters]);

  if (loadingProject || loadingTasks) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }
  if (!project) return <div className="p-8">Project not found.</div>;

  const handleDragStart = (event: DragStartEvent) => {
    const task = (tasks ?? []).find((t) => t.id === Number(event.active.id));
    setActiveDragTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = Number(active.id);
    const newStatus = String(over.id) as TaskStatus;
    const task = (tasks ?? []).find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    const queryKey = getListTasksQueryKey({ projectId });
    const previous = queryClient.getQueryData<Task[]>(queryKey);
    if (previous) {
      queryClient.setQueryData<Task[]>(
        queryKey,
        previous.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      );
    }
    updateTask.mutate(
      { id: taskId, data: { status: newStatus } },
      {
        onError: () => {
          if (previous) queryClient.setQueryData(queryKey, previous);
          toast({ title: "Could not move task", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 flex-1 flex flex-col min-h-0">
      <div className="space-y-4">
        <Link
          href="/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground -ml-1"
          data-testid="link-back-projects"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: project.color || '#ccc' }} />
            <h1 className="text-3xl font-bold tracking-tight truncate">{project.name}</h1>
            <Badge variant="outline" className="capitalize shrink-0">{project.status.replace("_", " ")}</Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-project-menu">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive" data-testid="button-delete-project">
                <Trash2 className="w-4 h-4 mr-2" /> Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {project.description && (
          <p className="text-muted-foreground max-w-3xl">{project.description}</p>
        )}

        <div className="flex items-center gap-10 py-4 border-y">
          <div>
            <div className="text-sm text-muted-foreground">Completion</div>
            <div className="text-xl font-bold">{Math.round(stats?.completionPct || 0)}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
            <div className="text-xl font-bold">{stats?.totalTasks || 0}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">In Flight</div>
            <div className="text-xl font-bold">{(stats?.inProgress || 0) + (stats?.inReview || 0)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Overdue</div>
            <div className={cn("text-xl font-bold", (stats?.overdueCount || 0) > 0 && "text-destructive")}>{stats?.overdueCount || 0}</div>
          </div>
        </div>
      </div>

      <BoardFilters
        members={members ?? []}
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {STATUS_ORDER.map((status) => {
            const columnTasks = filteredTasks.filter((t) => t.status === status);
            return (
              <KanbanColumn key={status} status={status} count={columnTasks.length}>
                {columnTasks.map((task) => {
                  const assignee = task.assigneeId ? memberById.get(task.assigneeId) : null;
                  return (
                    <DraggableTaskCard
                      key={task.id}
                      task={task}
                      assignee={assignee ?? null}
                    />
                  );
                })}
                <CreateTaskDialog projectId={projectId} defaultStatus={status} />
              </KanbanColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeDragTask ? (
            <TaskCard
              task={activeDragTask}
              assignee={activeDragTask.assigneeId ? memberById.get(activeDragTask.assigneeId) ?? null : null}
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all of its tasks. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProject.mutate({ id: projectId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-project"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KanbanColumn({
  status,
  count,
  children,
}: {
  status: TaskStatus;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${status}`}
      className={cn(
        "flex flex-col bg-muted/30 rounded-xl p-3 min-w-[260px] transition-colors",
        isOver && "bg-primary/10 ring-2 ring-primary/40",
      )}
    >
      <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between px-1">
        <span>{STATUS_LABELS[status]}</span>
        <span
          className="bg-background border px-2 py-0.5 rounded-full text-xs font-medium"
          data-testid={`column-count-${status}`}
        >
          {count}
        </span>
      </h3>
      <div className="flex-1 space-y-2">{children}</div>
    </div>
  );
}

function DraggableTaskCard({
  task,
  assignee,
}: {
  task: Task;
  assignee: { id: number; name: string; avatarColor?: string | null } | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.4 : undefined }}
      data-testid={`draggable-task-${task.id}`}
    >
      <TaskCard task={task} assignee={assignee} />
    </div>
  );
}

function TaskCard({
  task,
  assignee,
  dragging = false,
}: {
  task: Task;
  assignee: { id: number; name: string; avatarColor?: string | null } | null;
  dragging?: boolean;
}) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due && isPast(due) && !isToday(due) && task.status !== "done";

  const inner = (
    <div
      className={cn(
        "p-3 bg-card rounded-lg border shadow-sm transition-all",
        dragging
          ? "shadow-xl ring-2 ring-primary/50 rotate-2 cursor-grabbing"
          : "hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="font-medium text-sm leading-snug mb-3">{task.title}</div>
      <div className="flex items-center justify-between">
        <Badge className={cn("capitalize text-[10px] py-0", PRIORITY_TONE[task.priority])} variant="outline">
          {task.priority}
        </Badge>
        <div className="flex items-center gap-2">
          {due && (
            <span className={cn("text-[11px] flex items-center gap-1", overdue ? "text-destructive" : "text-muted-foreground")}>
              <CalendarDays className="w-3 h-3" />
              {format(due, "MMM d")}
            </span>
          )}
          <MemberAvatar member={assignee} size="sm" />
        </div>
      </div>
    </div>
  );

  if (dragging) return inner;

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block"
      data-testid={`card-task-${task.id}`}
      onClick={(e) => {
        // Prevent navigation if a drag was initiated
        if ((e as React.MouseEvent).defaultPrevented) e.preventDefault();
      }}
    >
      {inner}
    </Link>
  );
}
