import { Request, Response } from "express";
import { pgClient } from "../db/db";

export const getTrades = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.query;
    if (symbol !== "LADDOO_INR") {
      return res
        .status(404)
        .json({ message: "only doing LADDOO_INR exchanges" });
    }
    let query = `
      SELECT order_id,time, price, volume,is_buyer_maker FROM laddoo_prices ORDER BY time DESC LIMIT $1
    `;
    const result = await pgClient.query(query, [15]);
    // console.log("trade:", result);
    const tradesArray = result.rows.map((trade) => ({
      id: trade.order_id,
      isBuyerMaker: trade.is_buyer_maker,
      price: trade.price,
      quantity: trade.volume,
      quoteQuantity: 0,
      timestamp: trade.time,
    }));
    // console.log(tradesArray);
    return res.json(tradesArray);
  } catch (error) {
    console.error("Error fetching trades:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
