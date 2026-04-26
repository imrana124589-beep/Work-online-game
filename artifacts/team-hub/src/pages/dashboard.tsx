import { useGetDashboardSummary, useGetMyTasks, useGetRecentActivity, useGetWorkload } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { MemberAvatar } from "@/components/member-avatar";
import { STATUS_LABELS, PRIORITY_TONE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: myTasks, isLoading: loadingTasks } = useGetMyTasks();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity({ limit: 12 });
  const { data: workload, isLoading: loadingWorkload } = useGetWorkload();

  if (loadingSummary || loadingTasks || loadingActivity || loadingWorkload) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }

  const maxLoad = Math.max(1, ...(workload?.map((w) => w.openTasks) ?? [1]));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Here's what's happening across your workspace today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active projects" value={summary?.activeProjects ?? 0} />
        <StatCard label="My open tasks" value={summary?.myOpenTasks ?? 0} />
        <StatCard label="Completed this week" value={summary?.completedThisWeek ?? 0} />
        <StatCard label="Overdue" value={summary?.overdueTasks ?? 0} tone={(summary?.overdueTasks ?? 0) > 0 ? "destructive" : "default"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My open tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {myTasks?.length ? (
                <div className="space-y-2">
                  {myTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="block"
                      data-testid={`link-my-task-${task.id}`}
                    >
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 hover:border-primary/40 transition-colors cursor-pointer">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{task.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {STATUS_LABELS[task.status]}
                            {task.dueDate && ` · Due ${format(new Date(task.dueDate), "MMM d")}`}
                          </div>
                        </div>
                        <Badge className={cn("capitalize ml-3", PRIORITY_TONE[task.priority])} variant="outline">
                          {task.priority}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">All clear. No open tasks assigned to you.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team workload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workload?.map((member) => (
                  <Link
                    key={member.memberId}
                    href={`/team/${member.memberId}`}
                    className="block"
                    data-testid={`link-workload-${member.memberId}`}
                  >
                    <div className="flex items-center gap-4 hover:bg-muted/40 -mx-2 px-2 py-2 rounded-md transition-colors cursor-pointer">
                      <MemberAvatar member={{ name: member.memberName, avatarColor: member.avatarColor }} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-sm truncate">{member.memberName}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {member.openTasks} open
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{member.role}</div>
                        <Progress value={(member.openTasks / maxLoad) * 100} className="h-1.5 mt-2" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {activity?.length ? activity.map((act) => (
                  <div key={act.id} className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary/60 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">{act.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "destructive" }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold", tone === "destructive" && value > 0 && "text-destructive")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
