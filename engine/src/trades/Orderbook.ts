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
  // id of the user who matched with order from orderbook
  makerUserId: string;
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
        executedQuantity < order.quantity - order.filled &&
        this.asks[idx].userId !== order.userId
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
          makerUserId: this.asks[idx].userId,
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
        executedQuantity < order.quantity - order.filled &&
        this.bids[idx].orderId !== order.orderId
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
          makerUserId: this.bids[idx].userId,
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

  getOrderbookDepth() {
    const bids: [string, string][] = [];
    const asks: [string, string][] = [];

    const bidsObj: { [key: string]: number } = {};
    const asksObj: { [key: string]: number } = {};

    this.bids.forEach((bid) => {
      if (!bidsObj[bid.price]) {
        bidsObj[bid.price] = 0;
      }
      bidsObj[bid.price] += bid.quantity - bid.filled;
    });

    this.asks.forEach((ask) => {
      if (!asksObj[ask.price]) {
        asksObj[ask.price] = 0;
      }
      asksObj[ask.price] += ask.quantity - ask.filled;
    });

    for (const price in bidsObj) {
      bids.push([price, bidsObj[price].toString()]);
    }
    for (const price in asksObj) {
      asks.push([price, asksObj[price].toString()]);
    }

    return { bids, asks };
  }

  getUserOrderfromOrderBook(userId: string): Order[] {
    const asks = this.asks.filter((ord) => ord.userId === userId);
    const bids = this.bids.filter((ord) => ord.userId === userId);
    return [...asks, ...bids];
  }

  cancelBid(order: Order) {
    const index = this.bids.findIndex((ord) => ord.orderId === order.orderId);
    if (index !== -1) {
      const price = this.bids[index].price;
      this.bids.splice(index, 1);
      return price;
    }
  }

  cancelAsk(order: Order) {
    const index = this.asks.findIndex((ord) => ord.orderId === order.orderId);
    if (index !== -1) {
      const price = this.asks[index].price;
      this.asks.splice(index, 1);
      return price;
    }
  }
}
