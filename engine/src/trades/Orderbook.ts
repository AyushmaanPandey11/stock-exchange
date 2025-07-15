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
  price: string;
  quantity: number;
  tradeId: number;
  // id of the user who was in the orderbook
  otherUserId: string;
  // id of the order from orderbook
  makerOrderId: string;
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
    this.asks = asks.sort((a, b) => a.price - b.price); // ascending order
    this.bids = bids.sort((a, b) => b.price - a.price); // descending order
    this.baseAsset = baseAsset;
    this.currentPrice = currentPrice;
    this.lastTradeId = lastTradeId;
  }

  addOrder(order: Order): { executedQuantity: number; fills: Fill[] } {
    if (order.side == "buy") {
      // match orders in the sell asks table
      const { executedQuantity, fills } = this.matchAskForBid(order);
      if (order.quantity === executedQuantity) {
        return {
          executedQuantity,
          fills,
        };
      }

      // adding the order in descending order
      let insertIdx = 0;
      while (
        insertIdx < this.bids.length &&
        this.bids[insertIdx].price > order.price
      ) {
        insertIdx++;
      }
      this.bids.splice(insertIdx, 0, order);
      return {
        executedQuantity,
        fills,
      };
    } else {
      const { executedQuantity, fills } = this.matchBidsForAsk(order);
      if (order.quantity === executedQuantity) {
        return {
          executedQuantity,
          fills,
        };
      }

      // inserting order in ascending order
      let insertIdx = 0;
      while (
        insertIdx < this.asks.length &&
        this.asks[insertIdx].price < order.price
      ) {
        insertIdx++;
      }
      this.asks.splice(insertIdx, 0, order);

      return {
        executedQuantity,
        fills,
      };
    }
  }

  matchAskForBid(order: Order): { fills: Fill[]; executedQuantity: number } {
    const fills: Fill[] = [];
    let executedQuantity: number = 0;

    // need to make the asks and bids array as sorted for the price
    for (let idx = 0; idx < this.asks.length; idx++) {
      if (
        this.asks[idx].price <= order.price &&
        executedQuantity < order.quantity - order.filled
      ) {
        const filledQty = Math.min(
          order.quantity - order.filled - executedQuantity,
          this.asks[idx].quantity - this.asks[idx].filled
        );
        executedQuantity += filledQty;
        this.asks[idx].filled += filledQty;
        order.filled += filledQty;
        fills.push({
          price: this.asks[idx].price.toString(),
          quantity: filledQty,
          tradeId: this.lastTradeId++,
          makerOrderId: this.asks[idx].orderId,
          otherUserId: this.asks[idx].userId,
        });
      }
    }

    // checking if any orderbook order has a zero quantity
    for (let idx = 0; idx < this.asks.length; idx++) {
      if (this.asks[idx].quantity === this.asks[idx].filled) {
        this.asks.splice(idx, 1);
        idx--;
      }
    }

    return {
      fills,
      executedQuantity,
    };
  }

  matchBidsForAsk(order: Order): { executedQuantity: number; fills: Fill[] } {
    const fills: Fill[] = [];
    let executedQuantity = 0;

    for (let idx = 0; idx < this.bids.length; idx++) {
      if (
        this.bids[idx].price >= order.price &&
        executedQuantity < order.quantity - order.filled
      ) {
        const filledQty = Math.min(
          this.bids[idx].quantity - this.bids[idx].filled,
          order.quantity - order.filled - executedQuantity
        );
        executedQuantity += filledQty;
        this.bids[idx].filled += filledQty;
        order.filled += filledQty;
        fills.push({
          price: this.bids[idx].price.toString(),
          makerOrderId: this.bids[idx].orderId,
          quantity: filledQty,
          otherUserId: this.bids[idx].userId,
          tradeId: this.lastTradeId++,
        });
      }
    }

    for (let idx = 0; idx < this.bids.length; idx++) {
      if (this.bids[idx].quantity === this.bids[idx].filled) {
        this.bids.splice(idx, 1);
        idx--;
      }
    }

    return {
      fills,
      executedQuantity,
    };
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
