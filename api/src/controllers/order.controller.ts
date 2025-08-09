import { Request, Response } from "express";
import { RedisManager } from "../RedisManager";
import {
  CANCEL_ORDER,
  CREATE_ORDER,
  GET_OPEN_ORDERS,
  MessageFromOrderbook,
} from "../types";

export const createOrder = async (req: Request, res: Response) => {
  const { market, price, quantity, side, userId } = req.body;
  const response: MessageFromOrderbook =
    await RedisManager.getInstance().sendAndAwait({
      type: CREATE_ORDER,
      data: {
        market,
        price,
        quantity,
        side,
        userId,
      },
    });
  return res.json(response.payload);
};

export const deleteOrder = async (req: Request, res: Response) => {
  const { orderId, market } = req.body;
  const response: MessageFromOrderbook =
    await RedisManager.getInstance().sendAndAwait({
      type: CANCEL_ORDER,
      data: {
        orderId,
        market,
      },
    });
  return res.json(response.payload);
};

export const getOpenOrders = async (req: Request, res: Response) => {
  try {
    const { market, userId } = req.query;
    const response: MessageFromOrderbook =
      await RedisManager.getInstance().sendAndAwait({
        type: GET_OPEN_ORDERS,
        data: {
          market: market as string,
          userId: userId as string,
        },
      });
    return res.json(response.payload);
  } catch (error) {
    res.status(500).json({ message: "issue from server side" });
  }
};
