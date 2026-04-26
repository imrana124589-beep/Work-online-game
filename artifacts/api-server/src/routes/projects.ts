import { Router, type IRouter } from "express";
import { eq, and, sql, asc, lt, ne, inArray } from "drizzle-orm";
import {
  db,
  projectsTable,
  tasksTable,
  activitiesTable,
} from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  UpdateProjectParams,
  GetProjectParams,
  GetProjectStatsParams,
  DeleteProjectParams,
  ListProjectsQueryParams,
  ListProjectsResponse,
  GetProjectResponse,
  UpdateProjectResponse,
  GetProjectStatsResponse,
} from "@workspace/api-zod";
import { serializeProject } from "../lib/serializers";

const router: IRouter = Router();

const COLORS = [
  "#7C5CFF",
  "#06B6D4",
  "#F97316",
  "#EC4899",
  "#10B981",
  "#F59E0B",
  "#3B82F6",
];

async function buildProjectListWithCounts(rows: (typeof projectsTable.$inferSelect)[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const counts = await db
    .select({
      projectId: tasksTable.projectId,
      total: sql<number>`count(*)::int`,
      completed: sql<number>`sum(case when ${tasksTable.status} = 'done' then 1 else 0 end)::int`,
    })
    .from(tasksTable)
    .where(inArray(tasksTable.projectId, ids))
    .groupBy(tasksTable.projectId);
  const map = new Map(counts.map((c) => [c.projectId, c]));
  return rows.map((p) => {
    const c = map.get(p.id);
    return serializeProject(p, c?.total ?? 0, c?.completed ?? 0);
  });
}

router.get("/projects", async (req, res): Promise<void> => {
  const parsed = ListProjectsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const where = parsed.data.status
    ? eq(projectsTable.status, parsed.data.status)
    : undefined;
  const rows = await db
    .select()
    .from(projectsTable)
    .where(where as any)
    .orderBy(asc(projectsTable.id));
  res.json(ListProjectsResponse.parse(await buildProjectListWithCounts(rows)));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const color =
    parsed.data.color ?? COLORS[Math.floor(Math.random() * COLORS.length)]!;
  const [project] = await db
    .insert(projectsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      color,
      status: parsed.data.status ?? "active",
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    })
    .returning();
  if (!project) {
    res.status(500).json({ error: "Failed to create project" });
    return;
  }
  await db.insert(activitiesTable).values({
    type: "project_created",
    description: `Created project "${project.name}"`,
    memberId: 1,
    projectId: project.id,
  });
  res.status(201).json(GetProjectResponse.parse(serializeProject(project, 0, 0)));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`sum(case when ${tasksTable.status} = 'done' then 1 else 0 end)::int`,
    })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, project.id));
  res.json(
    GetProjectResponse.parse(
      serializeProject(project, counts?.total ?? 0, counts?.completed ?? 0),
    ),
  );
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = { ...parsed.data };
  if ("dueDate" in parsed.data) {
    updates["dueDate"] = parsed.data.dueDate
      ? new Date(parsed.data.dueDate)
      : null;
  }
  const [project] = await db
    .update(projectsTable)
    .set(updates)
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`sum(case when ${tasksTable.status} = 'done' then 1 else 0 end)::int`,
    })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, project.id));
  res.json(
    UpdateProjectResponse.parse(
      serializeProject(project, counts?.total ?? 0, counts?.completed ?? 0),
    ),
  );
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/projects/:id/stats", async (req, res): Promise<void> => {
  const params = GetProjectStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [statusCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      todo: sql<number>`sum(case when ${tasksTable.status} = 'todo' then 1 else 0 end)::int`,
      inProgress: sql<number>`sum(case when ${tasksTable.status} = 'in_progress' then 1 else 0 end)::int`,
      inReview: sql<number>`sum(case when ${tasksTable.status} = 'in_review' then 1 else 0 end)::int`,
      done: sql<number>`sum(case when ${tasksTable.status} = 'done' then 1 else 0 end)::int`,
    })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, project.id));

  const memberCountRow = await db
    .selectDistinct({ assigneeId: tasksTable.assigneeId })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, project.id));
  const memberCount = memberCountRow.filter((r) => r.assigneeId != null).length;

  const [overdueRow] = await db
    .select({ overdue: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.projectId, project.id),
        ne(tasksTable.status, "done"),
        lt(tasksTable.dueDate, new Date()),
      ),
    );

  const total = statusCounts?.total ?? 0;
  const done = statusCounts?.done ?? 0;
  const completionPct = total === 0 ? 0 : Math.round((done / total) * 100);

  res.json(
    GetProjectStatsResponse.parse({
      projectId: project.id,
      totalTasks: total,
      todo: statusCounts?.todo ?? 0,
      inProgress: statusCounts?.inProgress ?? 0,
      inReview: statusCounts?.inReview ?? 0,
      done,
      completionPct,
      memberCount,
      overdueCount: overdueRow?.overdue ?? 0,
    }),
  );
});

export default router;
