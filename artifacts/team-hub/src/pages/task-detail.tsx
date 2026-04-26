import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTask,
  useUpdateTask,
  useDeleteTask,
  useListMembers,
  useGetProject,
  useGetMe,
  useListTaskComments,
  useCreateTaskComment,
  getGetTaskQueryKey,
  getListTasksQueryKey,
  getGetProjectStatsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetWorkloadQueryKey,
  getGetMyTasksQueryKey,
  getGetRecentActivityQueryKey,
  getListTaskCommentsQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Loader2, ArrowLeft, MoreVertical, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { MemberAvatar } from "@/components/member-avatar";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  PRIORITY_ORDER,
  PRIORITY_TONE,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/constants";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function TaskDetail() {
  const params = useParams();
  const taskId = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");

  const { data: task, isLoading } = useGetTask(taskId);
  const { data: members } = useListMembers();
  const { data: project } = useGetProject(task?.projectId ?? 0);
  const { data: me } = useGetMe();
  const { data: comments } = useListTaskComments(taskId);

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title);
      setDescriptionDraft(task.description ?? "");
    }
  }, [task]);

  const invalidateAfterUpdate = () => {
    queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    if (task?.projectId) {
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId: task.projectId }) });
      queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(task.projectId) });
    }
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetWorkloadQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
  };

  const update = useUpdateTask({
    mutation: {
      onSuccess: () => invalidateAfterUpdate(),
      onError: () => toast({ title: "Could not update task", variant: "destructive" }),
    },
  });

  const remove = useDeleteTask({
    mutation: {
      onSuccess: () => {
        invalidateAfterUpdate();
        toast({ title: "Task deleted" });
        setLocation(task?.projectId ? `/projects/${task.projectId}` : "/projects");
      },
      onError: () => toast({ title: "Could not delete task", variant: "destructive" }),
    },
  });

  const createComment = useCreateTaskComment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTaskCommentsQueryKey(taskId) });
        queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
        setCommentDraft("");
      },
      onError: () => toast({ title: "Could not post comment", variant: "destructive" }),
    },
  });

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
  }
  if (!task) return <div className="p-8">Task not found.</div>;

  const memberById = new Map(members?.map((m) => [m.id, m]) ?? []);
  const assignee = task.assigneeId ? memberById.get(task.assigneeId) : null;

  const saveTitle = () => {
    const next = titleDraft.trim();
    if (!next) {
      setTitleDraft(task.title);
      setEditingTitle(false);
      return;
    }
    if (next !== task.title) update.mutate({ id: taskId, data: { title: next } });
    setEditingTitle(false);
  };

  const saveDescription = () => {
    const next = descriptionDraft;
    if (next !== (task.description ?? "")) {
      update.mutate({ id: taskId, data: { description: next } });
    }
    setEditingDescription(false);
  };

  const handleStatus = (v: string) => update.mutate({ id: taskId, data: { status: v as TaskStatus } });
  const handlePriority = (v: string) => update.mutate({ id: taskId, data: { priority: v as TaskPriority } });
  const handleAssignee = (v: string) =>
    update.mutate({ id: taskId, data: { assigneeId: v === "none" ? null : Number(v) } });
  const handleDueDate = (v: string) => update.mutate({ id: taskId, data: { dueDate: v || null } });

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentDraft.trim() || !me) return;
    createComment.mutate({ id: taskId, data: { memberId: me.id, content: commentDraft.trim() } });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${task.projectId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground -ml-1"
          data-testid="link-back-project"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {project?.name ?? "Project"}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-task-menu"><MoreVertical className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive" data-testid="button-delete-task">
              <Trash2 className="w-4 h-4 mr-2" /> Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6">
          <div>
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="text-2xl font-bold h-12"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); }
                  }}
                  data-testid="input-edit-title"
                />
                <Button size="icon" variant="ghost" onClick={saveTitle}><Check className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setTitleDraft(task.title); setEditingTitle(false); }}><X className="w-4 h-4" /></Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="group text-left w-full"
                data-testid="button-edit-title"
              >
                <h1 className="text-3xl font-bold tracking-tight inline-flex items-center gap-3">
                  {task.title}
                  <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </h1>
              </button>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {editingDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={descriptionDraft}
                    onChange={(e) => setDescriptionDraft(e.target.value)}
                    rows={6}
                    autoFocus
                    data-testid="input-edit-description"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveDescription} data-testid="button-save-description">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDescriptionDraft(task.description ?? ""); setEditingDescription(false); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDescription(true)}
                  className="text-left w-full text-sm leading-relaxed whitespace-pre-wrap min-h-[60px] hover:bg-muted/30 -m-2 p-2 rounded"
                  data-testid="button-edit-description"
                >
                  {task.description || <span className="text-muted-foreground italic">No description yet. Click to add one.</span>}
                </button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Comments {comments && comments.length > 0 ? `(${comments.length})` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((c) => {
                    const author = memberById.get(c.memberId);
                    return (
                      <div key={c.id} className="flex gap-3" data-testid={`comment-${c.id}`}>
                        <MemberAvatar member={author} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-sm">{author?.name ?? "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{c.content}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No comments yet. Start the conversation.</p>
              )}

              <form onSubmit={submitComment} className="flex gap-3 pt-2 border-t mt-4">
                <MemberAvatar member={me} size="md" />
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Write a comment..."
                    rows={2}
                    data-testid="input-comment"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!commentDraft.trim() || createComment.isPending}
                      data-testid="button-submit-comment"
                    >
                      {createComment.isPending ? "Posting..." : "Comment"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-5">
              <Field label="Status">
                <Select value={task.status} onValueChange={handleStatus}>
                  <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Priority">
                <Select value={task.priority} onValueChange={handlePriority}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue>
                      <Badge className={cn("capitalize", PRIORITY_TONE[task.priority])} variant="outline">
                        {task.priority}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_ORDER.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Assignee">
                <Select value={task.assigneeId ? String(task.assigneeId) : "none"} onValueChange={handleAssignee}>
                  <SelectTrigger data-testid="select-assignee">
                    <SelectValue>
                      {assignee ? (
                        <span className="flex items-center gap-2">
                          <MemberAvatar member={assignee} size="sm" />
                          <span className="text-sm">{assignee.name}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Due date">
                <Input
                  type="date"
                  value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                  onChange={(e) => handleDueDate(e.target.value)}
                  data-testid="input-due-date"
                />
              </Field>

              {project && (
                <Field label="Project">
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                    data-testid="link-task-project"
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color || "#999" }} />
                    {project.name}
                  </Link>
                </Field>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Created {format(new Date(task.createdAt), "MMM d, yyyy")}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => remove.mutate({ id: taskId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-task"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
