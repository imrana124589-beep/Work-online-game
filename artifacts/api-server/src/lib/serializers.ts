import type { Member, Project, Task, Comment, Activity } from "@workspace/db";

export function serializeMember(m: Member) {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    avatarColor: m.avatarColor,
    createdAt: m.createdAt.toISOString(),
  };
}

export function serializeProject(
  p: Project,
  taskCount: number,
  completedCount: number,
) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    status: p.status,
    taskCount,
    completedCount,
    dueDate: p.dueDate ? p.dueDate.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeTask(t: Task) {
  return {
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId ?? null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    position: t.position,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function serializeComment(c: Comment) {
  return {
    id: c.id,
    taskId: c.taskId,
    memberId: c.memberId,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
  };
}

export function serializeActivity(a: Activity) {
  return {
    id: a.id,
    type: a.type,
    description: a.description,
    memberId: a.memberId,
    projectId: a.projectId ?? null,
    taskId: a.taskId ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}
