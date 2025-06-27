import axios from "axios";
import { Depth, KLine, Ticker, Trade } from "./types";

const BASE_URL = "https://exchange-proxy.100xdevs.com/api/v1";

export async function getTicker(market: string): Promise<Ticker> {
  const tickers = await getTickers();
  const ticker = tickers.find((t) => t.symbol === market);
  if (!ticker) {
    throw new Error(`No ticker found for ${market}`);
  }
  return ticker;
}

export async function getTickers(): Promise<Ticker[]> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return [
    {
      firstPrice: "130.00",
      high: "140.00",
      lastPrice: "134.38",
      low: "128.00",
      priceChange: "4.38",
      priceChangePercent: "3.37",
      quoteVolume: "5000000",
      symbol: "SOL/USDC",
      trades: "1500",
      volume: "37250",
    },
    {
      firstPrice: "2450.00",
      high: "2600.00",
      lastPrice: "2500.00",
      low: "2400.00",
      priceChange: "50.00",
      priceChangePercent: "2.04",
      quoteVolume: "10000000",
      symbol: "ETH/USDC",
      trades: "3200",
      volume: "4000",
    },
  ];
}

export async function getDepth(market: string): Promise<Depth> {
  const response = await axios.get(`${BASE_URL}/depth?symbol=${market}`);
  return response.data;
}
export async function getTrades(market: string): Promise<Trade[]> {
  const response = await axios.get(`${BASE_URL}/trades?symbol=${market}`);
  return response.data;
}

export async function getKlines(
  market: string,
  interval: string,
  startTime: number,
  endTime: number
): Promise<KLine[]> {
  const response = await axios.get(
    `${BASE_URL}/klines?symbol=${market}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`
  );
  const data: KLine[] = response.data;
  return data.sort((x, y) => (Number(x.end) < Number(y.end) ? -1 : 1));
}

export async function getMarkets(): Promise<string[]> {
  const response = await axios.get(`${BASE_URL}/markets`);
  return response.data;
}
