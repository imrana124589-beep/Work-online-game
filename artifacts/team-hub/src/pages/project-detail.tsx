import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProject,
  useListTasks,
  useGetProjectStats,
  useListMembers,
  useDeleteProject,
  getListProjectsQueryKey,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Loader2, ArrowLeft, MoreVertical, Trash2, CalendarDays } from "lucide-react";
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
import { STATUS_LABELS, STATUS_ORDER, PRIORITY_TONE } from "@/lib/constants";
import { format, isPast, isToday } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ProjectDetail() {
  const params = useParams();
  const projectId = Number(params.id);
  const [, setLocation] = useLocation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: project, isLoading: loadingProject } = useGetProject(projectId);
  const { data: stats } = useGetProjectStats(projectId);
  const { data: tasks, isLoading: loadingTasks } = useListTasks({ projectId });
  const { data: members } = useListMembers();

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

  if (loadingProject || loadingTasks) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }
  if (!project) return <div className="p-8">Project not found.</div>;

  const memberById = new Map(members?.map((m) => [m.id, m]) ?? []);

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

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {STATUS_ORDER.map((status) => {
          const columnTasks = tasks?.filter((t) => t.status === status) ?? [];
          return (
            <div key={status} className="flex flex-col bg-muted/30 rounded-xl p-3 min-w-[260px]">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between px-1">
                <span>{STATUS_LABELS[status]}</span>
                <span className="bg-background border px-2 py-0.5 rounded-full text-xs font-medium">
                  {columnTasks.length}
                </span>
              </h3>
              <div className="flex-1 space-y-2">
                {columnTasks.map((task) => {
                  const assignee = task.assigneeId ? memberById.get(task.assigneeId) : null;
                  const due = task.dueDate ? new Date(task.dueDate) : null;
                  const overdue = due && isPast(due) && !isToday(due) && status !== "done";
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="block"
                      data-testid={`card-task-${task.id}`}
                    >
                      <div className="p-3 bg-card rounded-lg border shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
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
                    </Link>
                  );
                })}
                <CreateTaskDialog projectId={projectId} defaultStatus={status} />
              </div>
            </div>
          );
        })}
      </div>

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
