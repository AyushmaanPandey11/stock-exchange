import { Request, Response } from "express";
import { GET_DEPTH, MessageFromOrderbook } from "../types";
import { RedisManager } from "../RedisManager";

export const getDepths = async (req: Request, res: Response) => {
  const { market } = req.query;
  const response: MessageFromOrderbook =
    await RedisManager.getInstance().sendAndAwait({
      type: GET_DEPTH,
      data: {
        market: market as string,
      },
    });
  return res.json(response.payload);
};
