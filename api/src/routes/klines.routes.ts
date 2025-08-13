import { Router } from "express";
import { getKlines } from "../controllers/klines.controller";

const klinesRouter = Router();

klinesRouter.get("/", getKlines);

export { klinesRouter };
