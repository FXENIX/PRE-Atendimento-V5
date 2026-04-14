import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import evolutionRouter from "./evolution";
import adminRouter from "./admin";
import evolutionConfigRouter from "./evolution-config";
import instancesRouter from "./instances";
import contactsRouter from "./contacts";
import evolutionServersRouter from "./evolution-servers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(evolutionConfigRouter);
router.use(instancesRouter);
router.use(contactsRouter);
router.use(evolutionRouter);
router.use(evolutionServersRouter);

export default router;
