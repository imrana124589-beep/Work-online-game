import { Router, type IRouter } from "express";
import healthRouter from "./health";
import membersRouter from "./members";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import commentsRouter from "./comments";
import dashboardRouter from "./dashboard";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(membersRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(commentsRouter);
router.use(dashboardRouter);
router.use(searchRouter);

export default router;
