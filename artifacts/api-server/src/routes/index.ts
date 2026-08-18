import { Router, type IRouter } from "express";
import healthRouter from "./health";
import relationshipsRouter from "./relationships";

const router: IRouter = Router();

router.use(healthRouter);
router.use(relationshipsRouter);

export default router;
