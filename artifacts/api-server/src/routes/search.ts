import { Router, type IRouter } from "express";
import { ilike, desc, eq } from "drizzle-orm";
import { db, commentsTable, tasksTable } from "@workspace/db";
import { SearchQueryParams, SearchResponse } from "@workspace/api-zod";

const SNIPPET_RADIUS = 60;
const MAX_SNIPPET_LEN = SNIPPET_RADIUS * 2 + 40;

function makeSnippet(content: string, query: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) {
    return content.length > MAX_SNIPPET_LEN
      ? content.slice(0, MAX_SNIPPET_LEN).trimEnd() + "…"
      : content;
  }
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(content.length, idx + query.length + SNIPPET_RADIUS);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < content.length) snippet = snippet + "…";
  return snippet;
}

function escapeLike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const q = parsed.data.q.trim();
  if (q.length === 0) {
    res.json(SearchResponse.parse({ comments: [] }));
    return;
  }
  const limit = parsed.data.limit ?? 20;

  const rows = await db
    .select({
      commentId: commentsTable.id,
      content: commentsTable.content,
      memberId: commentsTable.memberId,
      createdAt: commentsTable.createdAt,
      taskId: tasksTable.id,
      taskTitle: tasksTable.title,
      projectId: tasksTable.projectId,
    })
    .from(commentsTable)
    .innerJoin(tasksTable, eq(commentsTable.taskId, tasksTable.id))
    .where(ilike(commentsTable.content, `%${escapeLike(q)}%`))
    .orderBy(desc(commentsTable.createdAt))
    .limit(limit);

  const comments = rows.map((r) => ({
    commentId: r.commentId,
    taskId: r.taskId,
    taskTitle: r.taskTitle,
    projectId: r.projectId,
    memberId: r.memberId,
    snippet: makeSnippet(r.content, q),
    createdAt: r.createdAt.toISOString(),
  }));

  res.json(SearchResponse.parse({ comments }));
});

export default router;
