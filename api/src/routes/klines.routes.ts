import { Router } from "express";
import { getKlines } from "../controllers/klines.controller";

const klinesRouter = Router();

klinesRouter.get("/getkLines", getKlines);

export { klinesRouter };
