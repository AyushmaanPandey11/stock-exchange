import { Request, Response } from "express";
import { pgClient } from "../db/db";

export const getTrades = async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;

    let query = `
      SELECT time, price, volume,is_buyer_maker FROM laddoo_prices ORDER BY time DESC LIMIT $1
    `;

    if (limit) {
      const limitValue = parseInt(limit as string);
      if (isNaN(limitValue) || limitValue < 1 || limitValue > 15) {
        return res.status(400).json({
          error: "Invalid limit. Must be a number between 1 and 15.",
        });
      }
    }

    const result = await pgClient.query(query, [parseInt(limit as string)]);

    return res.json({
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching trades:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
