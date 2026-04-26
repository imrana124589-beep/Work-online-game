import { Router, type IRouter } from "express";
import { sql, eq, and, asc, desc, ne, lt, gte } from "drizzle-orm";
import {
  db,
  tasksTable,
  projectsTable,
  membersTable,
  activitiesTable,
} from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityQueryParams,
  GetRecentActivityResponse,
  GetMyTasksResponse,
  GetWorkloadResponse,
} from "@workspace/api-zod";
import { serializeTask, serializeActivity } from "../lib/serializers";

const router: IRouter = Router();

async function getCurrentMemberId(): Promise<number | null> {
  const [me] = await db
    .select()
    .from(membersTable)
    .orderBy(asc(membersTable.id))
    .limit(1);
  return me?.id ?? null;
}

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const meId = await getCurrentMemberId();

  const [activeProjectsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectsTable)
    .where(eq(projectsTable.status, "active"));

  const [statusCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      todo: sql<number>`sum(case when ${tasksTable.status} = 'todo' then 1 else 0 end)::int`,
      inProgress: sql<number>`sum(case when ${tasksTable.status} = 'in_progress' then 1 else 0 end)::int`,
      inReview: sql<number>`sum(case when ${tasksTable.status} = 'in_review' then 1 else 0 end)::int`,
      done: sql<number>`sum(case when ${tasksTable.status} = 'done' then 1 else 0 end)::int`,
    })
    .from(tasksTable);

  const [overdueRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(
      and(ne(tasksTable.status, "done"), lt(tasksTable.dueDate, new Date())),
    );

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [completedThisWeekRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(
      and(eq(tasksTable.status, "done"), gte(tasksTable.updatedAt, weekAgo)),
    );

  let myOpenTasks = 0;
  if (meId != null) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasksTable)
      .where(
        and(eq(tasksTable.assigneeId, meId), ne(tasksTable.status, "done")),
      );
    myOpenTasks = row?.count ?? 0;
  }

  const total = statusCounts?.total ?? 0;
  const done = statusCounts?.done ?? 0;

  res.json(
    GetDashboardSummaryResponse.parse({
      activeProjects: activeProjectsRow?.count ?? 0,
      totalTasks: total,
      openTasks: total - done,
      completedThisWeek: completedThisWeekRow?.count ?? 0,
      overdueTasks: overdueRow?.count ?? 0,
      myOpenTasks,
      byStatus: {
        todo: statusCounts?.todo ?? 0,
        inProgress: statusCounts?.inProgress ?? 0,
        inReview: statusCounts?.inReview ?? 0,
        done,
      },
    }),
  );
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const limit = parsed.data.limit ?? 20;
  const rows = await db
    .select()
    .from(activitiesTable)
    .orderBy(desc(activitiesTable.createdAt))
    .limit(limit);
  res.json(GetRecentActivityResponse.parse(rows.map(serializeActivity)));
});

router.get("/dashboard/my-tasks", async (_req, res): Promise<void> => {
  const meId = await getCurrentMemberId();
  if (meId == null) {
    res.json([]);
    return;
  }
  const rows = await db
    .select()
    .from(tasksTable)
    .where(
      and(eq(tasksTable.assigneeId, meId), ne(tasksTable.status, "done")),
    )
    .orderBy(asc(tasksTable.dueDate));
  res.json(GetMyTasksResponse.parse(rows.map(serializeTask)));
});

router.get("/dashboard/workload", async (_req, res): Promise<void> => {
  const members = await db
    .select()
    .from(membersTable)
    .orderBy(asc(membersTable.id));
  const taskCounts = await db
    .select({
      assigneeId: tasksTable.assigneeId,
      total: sql<number>`count(*)::int`,
      todo: sql<number>`sum(case when ${tasksTable.status} = 'todo' then 1 else 0 end)::int`,
      inProgress: sql<number>`sum(case when ${tasksTable.status} = 'in_progress' then 1 else 0 end)::int`,
      inReview: sql<number>`sum(case when ${tasksTable.status} = 'in_review' then 1 else 0 end)::int`,
      done: sql<number>`sum(case when ${tasksTable.status} = 'done' then 1 else 0 end)::int`,
    })
    .from(tasksTable)
    .groupBy(tasksTable.assigneeId);
  const map = new Map(taskCounts.map((c) => [c.assigneeId, c]));

  const out = members.map((m) => {
    const c = map.get(m.id);
    const todo = c?.todo ?? 0;
    const inProgress = c?.inProgress ?? 0;
    const inReview = c?.inReview ?? 0;
    const done = c?.done ?? 0;
    return {
      memberId: m.id,
      memberName: m.name,
      avatarColor: m.avatarColor,
      role: m.role,
      openTasks: todo + inProgress + inReview,
      todo,
      inProgress,
      inReview,
      done,
    };
  });
  res.json(GetWorkloadResponse.parse(out));
});

export default router;
