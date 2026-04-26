import { useGetMember, useListTasks, useListProjects } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MemberAvatar } from "@/components/member-avatar";
import { STATUS_LABELS, STATUS_ORDER, PRIORITY_TONE } from "@/lib/constants";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function TeamMemberDetail() {
  const params = useParams();
  const memberId = Number(params.id);
  const { data: member, isLoading } = useGetMember(memberId);
  const { data: tasks } = useListTasks({ assigneeId: memberId });
  const { data: projects } = useListProjects();

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  if (!member) return <div className="p-8">Member not found.</div>;

  const projectById = new Map(projects?.map((p) => [p.id, p]) ?? []);
  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: tasks?.filter((t) => t.status === status) ?? [],
  }));
  const openCount = tasks?.filter((t) => t.status !== "done").length ?? 0;
  const doneCount = tasks?.filter((t) => t.status === "done").length ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      <Link
        href="/team"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground -ml-1"
        data-testid="link-back-team"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Team
      </Link>

      <div className="flex items-center gap-6">
        <MemberAvatar member={member} size="xl" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{member.name}</h1>
          <p className="text-xl text-muted-foreground mt-1">{member.role}</p>
          <p className="text-sm text-muted-foreground mt-2">{member.email}</p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm text-muted-foreground">Workload</div>
          <div className="text-2xl font-bold">{openCount}</div>
          <div className="text-xs text-muted-foreground">{doneCount} completed</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {(tasks?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-6">
              {grouped.map(({ status, items }) =>
                items.length === 0 ? null : (
                  <div key={status} className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{STATUS_LABELS[status]}</h3>
                    <div className="space-y-2">
                      {items.map((task) => {
                        const project = projectById.get(task.projectId);
                        return (
                          <Link
                            key={task.id}
                            href={`/tasks/${task.id}`}
                            className="block"
                            data-testid={`link-task-${task.id}`}
                          >
                            <div className="flex items-center justify-between p-3 rounded-md border hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm truncate">{task.title}</div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  {project && (
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || "#999" }} />
                                      {project.name}
                                    </span>
                                  )}
                                  {task.dueDate && <span>· Due {format(new Date(task.dueDate), "MMM d")}</span>}
                                </div>
                              </div>
                              <Badge className={cn("capitalize ml-3", PRIORITY_TONE[task.priority])} variant="outline">{task.priority}</Badge>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
