import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, membersTable, activitiesTable } from "@workspace/db";
import {
  CreateMemberBody,
  UpdateMemberBody,
  UpdateMemberParams,
  GetMemberParams,
  DeleteMemberParams,
  GetMemberResponse,
  ListMembersResponse,
  UpdateMemberResponse,
  GetMeResponse,
} from "@workspace/api-zod";
import { serializeMember } from "../lib/serializers";

const router: IRouter = Router();

const PALETTE = [
  "#7C5CFF",
  "#06B6D4",
  "#F97316",
  "#EC4899",
  "#10B981",
  "#F59E0B",
  "#3B82F6",
  "#EF4444",
];

router.get("/me", async (_req, res): Promise<void> => {
  const [me] = await db
    .select()
    .from(membersTable)
    .orderBy(asc(membersTable.id))
    .limit(1);
  if (!me) {
    res.status(404).json({ error: "No members exist yet" });
    return;
  }
  res.json(GetMeResponse.parse(serializeMember(me)));
});

router.get("/members", async (_req, res): Promise<void> => {
  const members = await db
    .select()
    .from(membersTable)
    .orderBy(asc(membersTable.id));
  res.json(ListMembersResponse.parse(members.map(serializeMember)));
});

router.post("/members", async (req, res): Promise<void> => {
  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const color =
    parsed.data.avatarColor ??
    PALETTE[Math.floor(Math.random() * PALETTE.length)]!;
  const [member] = await db
    .insert(membersTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      avatarColor: color,
    })
    .returning();
  if (!member) {
    res.status(500).json({ error: "Failed to create member" });
    return;
  }
  await db.insert(activitiesTable).values({
    type: "member_added",
    description: `${member.name} joined the team`,
    memberId: member.id,
  });
  res.status(201).json(GetMemberResponse.parse(serializeMember(member)));
});

router.get("/members/:id", async (req, res): Promise<void> => {
  const params = GetMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, params.data.id));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(GetMemberResponse.parse(serializeMember(member)));
});

router.patch("/members/:id", async (req, res): Promise<void> => {
  const params = UpdateMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db
    .update(membersTable)
    .set(parsed.data)
    .where(eq(membersTable.id, params.data.id))
    .returning();
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(UpdateMemberResponse.parse(serializeMember(member)));
});

router.delete("/members/:id", async (req, res): Promise<void> => {
  const params = DeleteMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(membersTable).where(eq(membersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
