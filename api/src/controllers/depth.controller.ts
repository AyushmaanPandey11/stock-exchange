import { Request, Response } from "express";
import { GET_DEPTH, MessageFromOrderbook } from "../types";
import { RedisManager } from "../RedisManager";

export const getDepths = async (req: Request, res: Response) => {
  const { symbol } = req.query;
  const response: MessageFromOrderbook =
    await RedisManager.getInstance().sendAndAwait({
      type: GET_DEPTH,
      data: {
        market: symbol as string,
      },
    });
  return res.json(response.payload);
};
