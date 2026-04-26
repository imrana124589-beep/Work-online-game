import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db,
  commentsTable,
  tasksTable,
  membersTable,
  activitiesTable,
} from "@workspace/db";
import {
  ListTaskCommentsParams,
  ListTaskCommentsResponse,
  CreateTaskCommentParams,
  CreateTaskCommentBody,
} from "@workspace/api-zod";
import { serializeComment } from "../lib/serializers";

const router: IRouter = Router();

router.get("/tasks/:id/comments", async (req, res): Promise<void> => {
  const params = ListTaskCommentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.taskId, params.data.id))
    .orderBy(asc(commentsTable.createdAt));
  res.json(ListTaskCommentsResponse.parse(rows.map(serializeComment)));
});

router.post("/tasks/:id/comments", async (req, res): Promise<void> => {
  const params = CreateTaskCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateTaskCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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
  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, parsed.data.memberId));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  const [comment] = await db
    .insert(commentsTable)
    .values({
      taskId: task.id,
      memberId: member.id,
      content: parsed.data.content,
    })
    .returning();
  if (!comment) {
    res.status(500).json({ error: "Failed to create comment" });
    return;
  }
  await db.insert(activitiesTable).values({
    type: "comment_added",
    description: `${member.name} commented on "${task.title}"`,
    memberId: member.id,
    projectId: task.projectId,
    taskId: task.id,
  });
  res.status(201).json(serializeComment(comment));
});

export default router;
