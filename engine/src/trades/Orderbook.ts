import { BASE_CURRENCY } from "./Engine";

export interface Order {
  price: number;
  quantity: number;
  userId: string;
  orderId: string;
  filled: number;
  side: "buy" | "sell";
}

export interface Fill {
  price: number;
  quantity: number;
  tradeId: number;
  // id of the user who send the new transaction order
  takerId: string;
  // id of the user whose ask was already on the orderbook
  markerOrderId: string;
}

export class Orderbook {
  bids: Order[];
  asks: Order[];
  baseAsset: string;
  quoteAsset: string = BASE_CURRENCY;
  currentPrice: number;
  lastTradeId: number;

  constructor(
    baseAsset: string,
    bids: Order[],
    asks: Order[],
    currentPrice: number,
    lastTradeId: number
  ) {
    this.asks = asks;
    this.bids = bids;
    this.baseAsset = baseAsset;
    this.currentPrice = currentPrice;
    this.lastTradeId = lastTradeId;
  }

  getMarket() {
    return `${this.baseAsset}_${this.quoteAsset}`;
  }

  getSnapShot() {
    return {
      baseAsset: this.baseAsset,
      bids: this.bids,
      asks: this.asks,
      currentPrice: this.currentPrice,
      lastTradeId: this.lastTradeId,
    };
  }
}
