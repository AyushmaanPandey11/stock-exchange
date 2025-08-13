import { Router } from "express";
import { getDepths } from "../controllers/depth.controller";

export const depthRouter = Router();

depthRouter.get("/", getDepths);
