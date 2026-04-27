import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import {
  db,
  projectsTable,
  membersTable,
  boardFilterPresetsTable,
} from "@workspace/db";
import {
  ListProjectFilterPresetsParams,
  ListProjectFilterPresetsResponse,
  CreateProjectFilterPresetParams,
  CreateProjectFilterPresetBody,
  DeleteProjectFilterPresetParams,
} from "@workspace/api-zod";
import { serializeBoardFilterPreset } from "../lib/serializers";

const router: IRouter = Router();

async function getCurrentMemberId(): Promise<number | null> {
  const [me] = await db
    .select()
    .from(membersTable)
    .orderBy(asc(membersTable.id))
    .limit(1);
  return me?.id ?? null;
}

async function projectExists(id: number): Promise<boolean> {
  const [row] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, id));
  return Boolean(row);
}

router.get(
  "/projects/:id/filter-presets",
  async (req, res): Promise<void> => {
    const params = ListProjectFilterPresetsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!(await projectExists(params.data.id))) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const meId = await getCurrentMemberId();
    if (meId == null) {
      res.json([]);
      return;
    }
    const rows = await db
      .select()
      .from(boardFilterPresetsTable)
      .where(
        and(
          eq(boardFilterPresetsTable.projectId, params.data.id),
          eq(boardFilterPresetsTable.memberId, meId),
        ),
      )
      .orderBy(asc(boardFilterPresetsTable.createdAt));
    res.json(
      ListProjectFilterPresetsResponse.parse(
        rows.map(serializeBoardFilterPreset),
      ),
    );
  },
);

router.post(
  "/projects/:id/filter-presets",
  async (req, res): Promise<void> => {
    const params = CreateProjectFilterPresetParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = CreateProjectFilterPresetBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (!(await projectExists(params.data.id))) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const meId = await getCurrentMemberId();
    if (meId == null) {
      res.status(404).json({ error: "No members exist yet" });
      return;
    }
    const trimmedName = parsed.data.name.trim();
    if (!trimmedName) {
      res.status(400).json({ error: "Preset name cannot be empty" });
      return;
    }
    const [existing] = await db
      .select({ id: boardFilterPresetsTable.id })
      .from(boardFilterPresetsTable)
      .where(
        and(
          eq(boardFilterPresetsTable.projectId, params.data.id),
          eq(boardFilterPresetsTable.memberId, meId),
          eq(boardFilterPresetsTable.name, trimmedName),
        ),
      );
    if (existing) {
      res
        .status(409)
        .json({ error: "A preset with this name already exists" });
      return;
    }
    const [preset] = await db
      .insert(boardFilterPresetsTable)
      .values({
        projectId: params.data.id,
        memberId: meId,
        name: trimmedName,
        payload: {
          assigneeIds: parsed.data.payload.assigneeIds,
          priorities: parsed.data.payload.priorities,
          overdueOnly: parsed.data.payload.overdueOnly,
        },
      })
      .returning();
    if (!preset) {
      res.status(500).json({ error: "Failed to create preset" });
      return;
    }
    res.status(201).json(serializeBoardFilterPreset(preset));
  },
);

router.delete(
  "/projects/:projectId/filter-presets/:presetId",
  async (req, res): Promise<void> => {
    const params = DeleteProjectFilterPresetParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const meId = await getCurrentMemberId();
    if (meId == null) {
      res.status(404).json({ error: "Preset not found" });
      return;
    }
    const result = await db
      .delete(boardFilterPresetsTable)
      .where(
        and(
          eq(boardFilterPresetsTable.id, params.data.presetId),
          eq(boardFilterPresetsTable.projectId, params.data.projectId),
          eq(boardFilterPresetsTable.memberId, meId),
        ),
      )
      .returning({ id: boardFilterPresetsTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: "Preset not found" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
