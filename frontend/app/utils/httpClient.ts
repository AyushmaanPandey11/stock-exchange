import axios from "axios";
import { Depth, KLine, OrderResponse, Ticker, Trade } from "./types";

const BASE_URL = "https://api.backpack.exchange/api/v1";
// const BASE_URL = "http://localhost:5000/api/v1";

export async function getTicker(market: string): Promise<Ticker> {
  const tickers = await getTickers();
  const ticker = tickers.find((t) => t.symbol === market);
  if (!ticker) {
    throw new Error(`No ticker found for ${market}`);
  }
  return ticker;
}

export async function getTickers(): Promise<Ticker[]> {
  const response = await axios.get(`${BASE_URL}/tickers`);
  return response.data;
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
  console.log("respone klines: ", response.data);
  const data: KLine[] = response.data;
  return data.sort((x, y) => (Number(x.end) < Number(y.end) ? -1 : 1));
}

// required while adding multiple markets
export async function getMarkets(): Promise<string[]> {
  const response = await axios.get(`${BASE_URL}/markets`);
  return response.data;
}

export const createOrder = async (
  market: string,
  price: number,
  quantity: number,
  side: "buy" | "sell",
  userId: number
): Promise<OrderResponse> => {
  const response = await axios.post(`${BASE_URL}/api/v1/order/createOrder`, {
    market,
    price,
    quantity,
    side,
    userId,
  });
  return response.data;
};
