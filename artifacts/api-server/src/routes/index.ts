import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import logsRouter from "./logs";
import labsRouter from "./labs";
import measurementsRouter from "./measurements";
import foodsRouter from "./foods";
import analysisRouter from "./analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(logsRouter);
router.use(labsRouter);
router.use(measurementsRouter);
router.use(foodsRouter);
router.use(analysisRouter);

export default router;
