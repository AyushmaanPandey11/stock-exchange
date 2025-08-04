import { Request, Response } from "express";
import { pgClient } from "../db/db";
import { Ticker } from "../types/types";

export const getTickers = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        (SELECT price FROM laddoo_prices WHERE time >= NOW() - INTERVAL '24 hours' ORDER BY time ASC LIMIT 1) AS first_price,
        MAX(price) AS high,
        MIN(price) AS low,
        (SELECT price FROM laddoo_prices WHERE time >= NOW() - INTERVAL '24 hours' ORDER BY time DESC LIMIT 1) AS last_price,
        COUNT(*) AS trade_count,
        SUM(volume) AS total_volume,
        SUM(price * volume) AS total_quote_volume
      FROM laddoo_prices
      WHERE time >= NOW() - INTERVAL '24 hours';
    `;
    const result = await pgClient.query(query);

    // Initialize ticker with default values in case no data is available
    let ticker: Ticker = {
      firstPrice: "0.00",
      high: "0.00",
      lastPrice: "0.00",
      low: "0.00",
      priceChange: "0.00",
      priceChangePercent: "0.00",
      quoteVolume: "0.00",
      symbol: "LADDO_INR",
      trades: "0",
      volume: "0.00",
    };

    if (result.rows.length > 0 && result.rows[0].first_price) {
      const {
        first_price,
        high,
        low,
        last_price,
        trade_count,
        total_volume,
        total_quote_volume,
      } = result.rows[0];

      // Calculate price change and percentage
      const firstPriceNum = parseFloat(first_price);
      const lastPriceNum = parseFloat(last_price);
      const priceChange = (lastPriceNum - firstPriceNum).toFixed(2);
      const priceChangePercent =
        firstPriceNum !== 0
          ? (((lastPriceNum - firstPriceNum) / firstPriceNum) * 100).toFixed(2)
          : "0.00";

      ticker = {
        ...ticker,
        firstPrice: first_price,
        high: high.toString(),
        lastPrice: last_price,
        low: low.toString(),
        priceChange,
        priceChangePercent,
        quoteVolume: total_quote_volume.toFixed(2),
        trades: trade_count.toString(),
        volume: total_volume.toFixed(2),
      };
    }

    return res.json({
      data: ticker,
    });
  } catch (error) {
    console.error("Error fetching tickers:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
