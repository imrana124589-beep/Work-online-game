import { Router, type IRouter } from "express";
import { eq, and, asc, desc } from "drizzle-orm";
import {
  db,
  tasksTable,
  activitiesTable,
  projectsTable,
  membersTable,
} from "@workspace/db";
import {
  CreateTaskBody,
  UpdateTaskBody,
  UpdateTaskParams,
  GetTaskParams,
  DeleteTaskParams,
  ListTasksQueryParams,
  ListTasksResponse,
  GetTaskResponse,
  UpdateTaskResponse,
} from "@workspace/api-zod";
import { serializeTask } from "../lib/serializers";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const conditions = [];
  if (parsed.data.projectId != null)
    conditions.push(eq(tasksTable.projectId, parsed.data.projectId));
  if (parsed.data.assigneeId != null)
    conditions.push(eq(tasksTable.assigneeId, parsed.data.assigneeId));
  if (parsed.data.status)
    conditions.push(eq(tasksTable.status, parsed.data.status));
  const rows = await db
    .select()
    .from(tasksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(tasksTable.id));
  res.json(ListTasksResponse.parse(rows.map(serializeTask)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [task] = await db
    .insert(tasksTable)
    .values({
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      status: parsed.data.status ?? "todo",
      priority: parsed.data.priority ?? "medium",
      assigneeId: parsed.data.assigneeId ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    })
    .returning();
  if (!task) {
    res.status(500).json({ error: "Failed to create task" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, task.projectId));
  await db.insert(activitiesTable).values({
    type: "task_created",
    description: `Added task "${task.title}"${project ? ` to ${project.name}` : ""}`,
    memberId: task.assigneeId ?? 1,
    projectId: task.projectId,
    taskId: task.id,
  });
  res.status(201).json(GetTaskResponse.parse(serializeTask(task)));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(GetTaskResponse.parse(serializeTask(task)));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [previous] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, params.data.id));
  if (!previous) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if ("dueDate" in parsed.data) {
    updates["dueDate"] = parsed.data.dueDate
      ? new Date(parsed.data.dueDate)
      : null;
  }

  const [task] = await db
    .update(tasksTable)
    .set(updates)
    .where(eq(tasksTable.id, params.data.id))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (parsed.data.status && parsed.data.status !== previous.status) {
    const memberId = task.assigneeId ?? 1;
    if (parsed.data.status === "done") {
      await db.insert(activitiesTable).values({
        type: "task_completed",
        description: `Completed "${task.title}"`,
        memberId,
        projectId: task.projectId,
        taskId: task.id,
      });
    } else {
      await db.insert(activitiesTable).values({
        type: "task_moved",
        description: `Moved "${task.title}" to ${parsed.data.status.replace("_", " ")}`,
        memberId,
        projectId: task.projectId,
        taskId: task.id,
      });
    }
  } else if (
    parsed.data.assigneeId !== undefined &&
    parsed.data.assigneeId !== previous.assigneeId
  ) {
    if (parsed.data.assigneeId) {
      const [assignee] = await db
        .select()
        .from(membersTable)
        .where(eq(membersTable.id, parsed.data.assigneeId));
      if (assignee) {
        await db.insert(activitiesTable).values({
          type: "task_assigned",
          description: `Assigned "${task.title}" to ${assignee.name}`,
          memberId: assignee.id,
          projectId: task.projectId,
          taskId: task.id,
        });
      }
    }
  }

  res.json(UpdateTaskResponse.parse(serializeTask(task)));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));
  res.sendStatus(204);
});

// suppress unused import warning
void desc;

export default router;
