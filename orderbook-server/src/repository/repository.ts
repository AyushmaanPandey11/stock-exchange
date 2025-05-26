import { bookWithQuantity, Fill, orderbook } from "../orderbook";

let GLOBAL_TRADE_ID = 0;
const getOrderId = (): string => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

const insertSorted = (
  orderList: typeof orderbook.asks | typeof orderbook.bids,
  order: {
    price: number;
    quantity: number;
    side: "ask" | "bid";
    orderId: string;
  },
  isBuy: boolean
) => {
  let left = 0;
  let right = orderList.length;
  while (left < right) {
    const mid = Math.floor(left + (right - left) / 2);
    const midPrice = orderList[mid].price;
    if (isBuy) {
      // it is bids where highest bid will be a top
      if (midPrice < order.price) right = mid;
      else left = mid + 1;
    } else {
      // it is asks where the smallest price for 1 stock to be at first
      if (midPrice > order.price) right = mid;
      else left = mid + 1;
    }
  }
  if (isBuy) {
    orderList.splice(left, 0, {
      price: order.price,
      quantity: order.quantity,
      side: "bid",
      orderId: order.orderId,
    });
  } else {
    orderList.splice(left, 0, {
      price: order.price,
      quantity: order.quantity,
      side: "ask",
      orderId: order.orderId,
    });
  }
};

const fillOrder = (
  orderId: string,
  price: number,
  quantity: number,
  side: "buy" | "sell",
  kind?: "ioc"
): { status: "rejected" | "accepted"; executedQty: number; fills: Fill[] } => {
  const fills: Fill[] = [];
  const isBuy = side === "buy";
  // checking for total stocks available for the price
  const maxFillQuantity = getFillAmount(price, quantity, side);
  let executedQty = 0;

  // checking for the  immediate or cancel request where either all req fullfilled or nono
  if (kind === "ioc" && maxFillQuantity < quantity) {
    return { status: "rejected", executedQty: 0, fills: [] };
  }

  // logic for the buy order
  if (side === "buy") {
    // go to the orderbook's ask side for stock exchanges
    for (let idx = 0; idx < orderbook.asks.length && quantity > 0; ) {
      const ask = orderbook.asks[idx];
      if (ask.price > price) break;

      const filledQuantity = Math.min(ask.quantity, quantity);
      ask.quantity -= filledQuantity;
      bookWithQuantity.asks[ask.price] -= filledQuantity;

      fills.push({
        price: ask.price,
        qty: filledQuantity,
        tradeId: GLOBAL_TRADE_ID++,
      });
      executedQty += filledQuantity;
      quantity -= filledQuantity;

      if (ask.quantity === 0) {
        orderbook.asks.splice(idx, 1);
        if (bookWithQuantity.asks[ask.price] === 0) {
          delete bookWithQuantity.asks[ask.price];
        }
      } else {
        idx++;
      }
    }

    // if still the request order quantity is left add it to the orderbooks bids side
    if (quantity > 0 && kind !== "ioc") {
      insertSorted(
        orderbook.bids,
        {
          price: price,
          quantity: quantity,
          side: "bid",
          orderId,
        },
        true
      );
      bookWithQuantity.bids[price] =
        (bookWithQuantity.bids[price] || 0) + quantity;
    }
    // this is for the order of selling
  } else {
    for (let idx = 0; idx < orderbook.bids.length && quantity > 0; ) {
      const bid = orderbook.bids[idx];
      if (bid.price < price) break;

      const filledQuantity = Math.min(quantity, bid.quantity);
      // updating orderbook
      bid.quantity -= filledQuantity;
      bookWithQuantity.bids[bid.price] -= filledQuantity;

      fills.push({
        price: bid.price,
        qty: filledQuantity,
        tradeId: GLOBAL_TRADE_ID++,
      });

      // checking and removing export empty bids from books
      executedQty += filledQuantity;
      quantity -= filledQuantity;
      if (bid.quantity === 0) {
        orderbook.bids.splice(idx, 1);
        if (bookWithQuantity.bids[bid.price] === 0) {
          delete bookWithQuantity.bids[bid.price];
        }
      } else {
        idx++;
      }
    }
    // updating the order book with user order remaning bids on the orderbook and bookwithQty
    if (quantity > 0 && kind !== "ioc") {
      insertSorted(
        orderbook.asks,
        {
          price: price,
          quantity: quantity,
          side: "ask",
          orderId,
        },
        false
      );
      bookWithQuantity.asks[price] =
        (bookWithQuantity.asks[price] || 0) + quantity;
    }
  }
  return {
    status: "accepted",
    executedQty: executedQty,
    fills: fills,
  };
};

function getFillAmount(
  price: number,
  quantity: number,
  side: "buy" | "sell"
): number {
  let filled = 0;
  if (side === "buy") {
    for (const ask of orderbook.asks) {
      if (ask.price > price) break;
      filled += Math.min(quantity - filled, ask.quantity);
      if (filled >= quantity) break;
    }
  } else {
    for (const bid of orderbook.bids) {
      if (bid.price < price) break;
      filled += Math.min(bid.quantity, quantity - filled);
      if (filled >= quantity) break;
    }
  }
  return filled;
}

export { getOrderId, fillOrder };
