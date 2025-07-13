import { Router } from "express";
import {
  createOrder,
  deleteOrder,
  getOpenOrders,
} from "../controllers/order.controller";

export const orderRouter = Router();

orderRouter.post("/createOrder", createOrder);
orderRouter.delete("/deleteOrder", deleteOrder);
orderRouter.get("/openOrders", getOpenOrders);
