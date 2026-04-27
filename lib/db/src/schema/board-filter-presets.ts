import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { membersTable } from "./members";

export interface BoardFilterPresetPayload {
  assigneeIds: number[];
  priorities: string[];
  overdueOnly: boolean;
}

export const boardFilterPresetsTable = pgTable(
  "board_filter_presets",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    payload: jsonb("payload").$type<BoardFilterPresetPayload>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    uniqueNamePerProjectMember: uniqueIndex(
      "board_filter_presets_project_member_name_idx",
    ).on(table.projectId, table.memberId, table.name),
  }),
);

export type BoardFilterPreset = typeof boardFilterPresetsTable.$inferSelect;
export type InsertBoardFilterPreset =
  typeof boardFilterPresetsTable.$inferInsert;
