import { Router } from "express";
import { getTrades } from "../controllers/trades.controller";

export const tradeRouter = Router();

tradeRouter.get("/", getTrades);
