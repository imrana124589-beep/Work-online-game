import {
  db,
  membersTable,
  projectsTable,
  tasksTable,
  commentsTable,
  activitiesTable,
} from "@workspace/db";

async function main() {
  console.log("Clearing existing data...");
  await db.delete(activitiesTable);
  await db.delete(commentsTable);
  await db.delete(tasksTable);
  await db.delete(projectsTable);
  await db.delete(membersTable);

  console.log("Seeding members...");
  const members = await db
    .insert(membersTable)
    .values([
      {
        name: "Ava Chen",
        email: "ava@teamhub.app",
        role: "Product Lead",
        avatarColor: "#7C5CFF",
      },
      {
        name: "Marcus Reid",
        email: "marcus@teamhub.app",
        role: "Engineering",
        avatarColor: "#06B6D4",
      },
      {
        name: "Priya Shah",
        email: "priya@teamhub.app",
        role: "Design",
        avatarColor: "#F97316",
      },
      {
        name: "Diego Alvarez",
        email: "diego@teamhub.app",
        role: "Engineering",
        avatarColor: "#10B981",
      },
      {
        name: "Sara Lindqvist",
        email: "sara@teamhub.app",
        role: "Operations",
        avatarColor: "#EC4899",
      },
      {
        name: "Theo Morgan",
        email: "theo@teamhub.app",
        role: "Marketing",
        avatarColor: "#F59E0B",
      },
    ])
    .returning();

  const [ava, marcus, priya, diego, sara, theo] = members;
  if (!ava || !marcus || !priya || !diego || !sara || !theo) {
    throw new Error("seed: missing members");
  }

  console.log("Seeding projects...");
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const projects = await db
    .insert(projectsTable)
    .values([
      {
        name: "Spring Product Launch",
        description:
          "Coordinated multi-channel rollout of the v2 release across web, mobile, and partner integrations.",
        color: "#7C5CFF",
        status: "active",
        dueDate: new Date(now + 21 * day),
      },
      {
        name: "Customer Onboarding Revamp",
        description:
          "Redesign the first-run experience to cut activation time in half.",
        color: "#06B6D4",
        status: "active",
        dueDate: new Date(now + 14 * day),
      },
      {
        name: "Q3 Marketing Site",
        description:
          "Refreshed marketing site with sharper positioning and a new pricing page.",
        color: "#F97316",
        status: "active",
        dueDate: new Date(now + 35 * day),
      },
      {
        name: "Internal Analytics Dashboard",
        description:
          "Self-serve dashboard for the operations team to track usage and retention.",
        color: "#10B981",
        status: "active",
        dueDate: new Date(now + 45 * day),
      },
      {
        name: "Q1 Brand Refresh",
        description:
          "Updated identity system, completed and shipped at the end of last quarter.",
        color: "#EC4899",
        status: "archived",
        dueDate: new Date(now - 30 * day),
      },
    ])
    .returning();

  const [launch, onboarding, marketing, analytics, brand] = projects;
  if (!launch || !onboarding || !marketing || !analytics || !brand) {
    throw new Error("seed: missing projects");
  }

  console.log("Seeding tasks...");
  type SeedTask = {
    projectId: number;
    title: string;
    description: string;
    status: "todo" | "in_progress" | "in_review" | "done";
    priority: "low" | "medium" | "high" | "urgent";
    assigneeId: number | null;
    dueDate: Date | null;
  };

  const taskSeeds: SeedTask[] = [
    // Launch
    {
      projectId: launch.id,
      title: "Finalize launch announcement copy",
      description:
        "Draft, review, and lock down the headline and supporting paragraphs for the launch post.",
      status: "in_progress",
      priority: "high",
      assigneeId: theo.id,
      dueDate: new Date(now + 3 * day),
    },
    {
      projectId: launch.id,
      title: "Cut release video",
      description:
        "60-second product video walking through the three flagship features.",
      status: "todo",
      priority: "high",
      assigneeId: priya.id,
      dueDate: new Date(now + 7 * day),
    },
    {
      projectId: launch.id,
      title: "Coordinate partner go-live",
      description: "Sync with three integration partners on simultaneous publish.",
      status: "in_review",
      priority: "urgent",
      assigneeId: ava.id,
      dueDate: new Date(now + 5 * day),
    },
    {
      projectId: launch.id,
      title: "Update mobile changelog",
      description: "Write app store release notes for iOS and Android.",
      status: "todo",
      priority: "medium",
      assigneeId: marcus.id,
      dueDate: new Date(now + 9 * day),
    },
    {
      projectId: launch.id,
      title: "Send out beta thank-you emails",
      description: "Personal note to the 40 beta testers ahead of GA.",
      status: "done",
      priority: "low",
      assigneeId: sara.id,
      dueDate: new Date(now - 2 * day),
    },

    // Onboarding revamp
    {
      projectId: onboarding.id,
      title: "Audit current onboarding funnel",
      description:
        "Pull drop-off numbers from the last 90 days and identify the worst step.",
      status: "done",
      priority: "high",
      assigneeId: ava.id,
      dueDate: new Date(now - 5 * day),
    },
    {
      projectId: onboarding.id,
      title: "Sketch new welcome flow",
      description:
        "Three concepts for the welcome screen — pick the strongest in a review.",
      status: "in_progress",
      priority: "high",
      assigneeId: priya.id,
      dueDate: new Date(now + 4 * day),
    },
    {
      projectId: onboarding.id,
      title: "Implement progressive setup checklist",
      description:
        "Persistent checklist that follows the user across the app until 100%.",
      status: "todo",
      priority: "medium",
      assigneeId: diego.id,
      dueDate: new Date(now + 12 * day),
    },
    {
      projectId: onboarding.id,
      title: "Write activation event taxonomy",
      description:
        "Define the canonical events we instrument to measure activation health.",
      status: "in_review",
      priority: "medium",
      assigneeId: marcus.id,
      dueDate: new Date(now + 6 * day),
    },
    {
      projectId: onboarding.id,
      title: "User test new flow with 5 customers",
      description: "Schedule and run moderated sessions, summarize findings.",
      status: "todo",
      priority: "low",
      assigneeId: ava.id,
      dueDate: new Date(now + 18 * day),
    },

    // Marketing site
    {
      projectId: marketing.id,
      title: "Define new pricing tiers",
      description: "Reconcile pricing with the latest packaging discussion.",
      status: "in_progress",
      priority: "high",
      assigneeId: ava.id,
      dueDate: new Date(now + 10 * day),
    },
    {
      projectId: marketing.id,
      title: "Refresh hero illustration",
      description: "Replace the current hero with the new brand-aligned artwork.",
      status: "todo",
      priority: "medium",
      assigneeId: priya.id,
      dueDate: new Date(now + 14 * day),
    },
    {
      projectId: marketing.id,
      title: "Set up CMS for case studies",
      description: "Markdown-based collection so non-engineers can publish.",
      status: "in_review",
      priority: "medium",
      assigneeId: diego.id,
      dueDate: new Date(now + 8 * day),
    },
    {
      projectId: marketing.id,
      title: "Schedule launch-week social posts",
      description:
        "Draft and schedule a week's worth of posts across LinkedIn and X.",
      status: "todo",
      priority: "low",
      assigneeId: theo.id,
      dueDate: new Date(now + 20 * day),
    },

    // Analytics dashboard
    {
      projectId: analytics.id,
      title: "Spec dashboard MVP",
      description:
        "List the ten metrics ops actually checks weekly and match them to data sources.",
      status: "in_progress",
      priority: "high",
      assigneeId: sara.id,
      dueDate: new Date(now + 7 * day),
    },
    {
      projectId: analytics.id,
      title: "Build retention chart",
      description: "30/60/90-day retention chart with cohort breakdown.",
      status: "todo",
      priority: "high",
      assigneeId: marcus.id,
      dueDate: new Date(now + 16 * day),
    },
    {
      projectId: analytics.id,
      title: "Wire up CSV export",
      description: "Let ops download any chart as a CSV.",
      status: "todo",
      priority: "low",
      assigneeId: diego.id,
      dueDate: new Date(now + 28 * day),
    },
    {
      projectId: analytics.id,
      title: "Pick a chart library",
      description: "Recharts vs Visx — write up the tradeoffs.",
      status: "done",
      priority: "low",
      assigneeId: marcus.id,
      dueDate: new Date(now - 3 * day),
    },
    // One overdue, urgent task assigned to me (ava)
    {
      projectId: launch.id,
      title: "Approve final launch checklist",
      description:
        "Owners have signed off; needs a final pass before Friday morning.",
      status: "in_progress",
      priority: "urgent",
      assigneeId: ava.id,
      dueDate: new Date(now - 1 * day),
    },
  ];

  const tasks = await db.insert(tasksTable).values(taskSeeds).returning();

  console.log("Seeding comments...");
  const t0 = tasks[0];
  const t2 = tasks[2];
  const t6 = tasks[6];
  if (t0 && t2 && t6) {
    await db.insert(commentsTable).values([
      {
        taskId: t0.id,
        memberId: ava.id,
        content:
          "Headline is feeling stronger — let's keep tightening the second paragraph.",
      },
      {
        taskId: t0.id,
        memberId: theo.id,
        content: "On it. Will share v3 by tomorrow morning.",
      },
      {
        taskId: t2.id,
        memberId: marcus.id,
        content:
          "Confirmed all three partners can publish at 9am PT on launch day.",
      },
      {
        taskId: t6.id,
        memberId: priya.id,
        content:
          "Concept B is winning the team review — moving forward unless I hear otherwise.",
      },
    ]);
  }

  console.log("Seeding activity feed...");
  const recent: { type: string; description: string; memberId: number; projectId?: number; taskId?: number; offset: number }[] = [
    {
      type: "task_completed",
      description: `Completed "Send out beta thank-you emails"`,
      memberId: sara.id,
      projectId: launch.id,
      offset: -2 * 60 * 60 * 1000,
    },
    {
      type: "task_moved",
      description: `Moved "Coordinate partner go-live" to in review`,
      memberId: ava.id,
      projectId: launch.id,
      offset: -4 * 60 * 60 * 1000,
    },
    {
      type: "comment_added",
      description: `Theo commented on "Finalize launch announcement copy"`,
      memberId: theo.id,
      projectId: launch.id,
      offset: -6 * 60 * 60 * 1000,
    },
    {
      type: "task_assigned",
      description: `Assigned "Cut release video" to Priya Shah`,
      memberId: priya.id,
      projectId: launch.id,
      offset: -10 * 60 * 60 * 1000,
    },
    {
      type: "task_created",
      description: `Added task "Build retention chart" to Internal Analytics Dashboard`,
      memberId: marcus.id,
      projectId: analytics.id,
      offset: -1 * day,
    },
    {
      type: "project_created",
      description: `Created project "Internal Analytics Dashboard"`,
      memberId: ava.id,
      projectId: analytics.id,
      offset: -2 * day,
    },
    {
      type: "task_completed",
      description: `Completed "Audit current onboarding funnel"`,
      memberId: ava.id,
      projectId: onboarding.id,
      offset: -3 * day,
    },
    {
      type: "member_added",
      description: `Diego Alvarez joined the team`,
      memberId: diego.id,
      offset: -4 * day,
    },
  ];

  for (const a of recent) {
    await db.insert(activitiesTable).values({
      type: a.type,
      description: a.description,
      memberId: a.memberId,
      projectId: a.projectId ?? null,
      taskId: a.taskId ?? null,
      createdAt: new Date(now + a.offset),
    });
  }

  console.log(
    `Seed complete: ${members.length} members, ${projects.length} projects, ${tasks.length} tasks.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
