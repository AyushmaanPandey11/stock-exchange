import { Router } from "express";
import { getTickers } from "../controllers/tickers.controller";

export const tickersRouter = Router();

tickersRouter.get("/", getTickers);
