# Team Hub

A calm, modern team workspace web app for distributed teams (8-20 people) to manage projects, tasks, and people.

## What's in here

This is a pnpm monorepo with three artifacts:

- `artifacts/team-hub` — React + Vite frontend (the Team Hub web app)
- `artifacts/api-server` — Express 5 API server backed by Postgres + Drizzle
- `artifacts/mockup-sandbox` — design sandbox (scaffolding only)

Plus shared libraries in `lib/`:

- `lib/api-spec` — OpenAPI 3.1 spec (`openapi.yaml`) — single source of truth
- `lib/api-client-react` — generated TanStack Query hooks (Orval)
- `lib/api-zod` — generated Zod schemas (Orval)
- `lib/db` — Drizzle schema + Postgres client

And one runner package:

- `scripts` — `pnpm --filter @workspace/scripts run seed` to (re)seed the DB

## Domain model

- **Member** — name, email, role, avatarColor. Member with id `1` (Ava Chen) is the implicit "current user".
- **Project** — name, description, color, status (`active` | `archived`), dueDate, taskCount, completedCount.
- **Task** — projectId, title, description, status (`todo` | `in_progress` | `in_review` | `done`), priority (`low` | `medium` | `high` | `urgent`), assigneeId, dueDate, position (double — sort order within a status column; midpoint inserts on drag-reorder).
- **Comment** — taskId, memberId, content.
- **Activity** — append-only feed of human-readable events. The API auto-logs activity on task create, status change, assignee change, completion, project create, and comment add.

All IDs are integers.

## Pages

- `/` — Dashboard (KPI cards, my open tasks, team workload, recent activity)
- `/projects` — Projects list with progress bars and a New Project dialog
- `/projects/:id` — Kanban board for a project, per-column "Add task", project menu (delete)
- `/tasks/:id` — Task detail with inline editable title/description, status/priority/assignee/due date selects, and a comments thread
- `/team` — Team directory with Invite member dialog
- `/team/:id` — Member detail showing all tasks assigned to that person, grouped by status

## API

REST, JSON, defined in `lib/api-spec/openapi.yaml`. Frontend talks to the API exclusively through generated hooks from `@workspace/api-client-react` (e.g. `useListProjects`, `useCreateTask`, `useUpdateTask`, `useGetDashboardSummary`, `useGetWorkload`, `useGetRecentActivity`, `useGetMyTasks`, `useGetProjectStats`).

Whenever the OpenAPI spec changes, run `pnpm run codegen` to regenerate clients.

## Conventions

- `data-testid` attributes are present on every interactive element.
- Mutations invalidate query keys explicitly using the generated `getXxxQueryKey()` helpers.
- Toasts (`@/hooks/use-toast`) confirm successful mutations and surface errors.
- No emojis anywhere in the UI.
- The visual identity is a calm teal primary on a warm off-white background; sidebar nav on the left.

## Common commands

```bash
pnpm install                                    # install all deps
pnpm run codegen                                # regen API client + zod + types
pnpm --filter @workspace/db run db:push         # apply schema changes to DB
pnpm --filter @workspace/scripts run seed       # reseed the DB (clears + re-inserts)
pnpm --filter team-hub run typecheck            # typecheck the web app
pnpm --filter @workspace/api-server run typecheck
```

Workflows (managed by Replit):
- `artifacts/api-server: API Server` — Express server
- `artifacts/team-hub: web` — Vite dev server
- `artifacts/mockup-sandbox: Component Preview Server`
