import { RedisManager } from "../RedisManager";
import { MessageFromApi } from "../types/fromApi";
import { Fill, Order, Orderbook } from "./Orderbook";

export const BASE_CURRENCY = "INR";

// INR: {
//     available: 1000,
//     locked: 200
//   }

interface UserBalance {
  [key: string]: {
    // this funds will be apart from funds which are getting used for ongoing trnasactions
    available: number;
    // funds are being used in current ongoing transactions
    locked: number;
  };
}

export class Engine {
  private orderBooks: Orderbook[] = [];
  // syntax means that the one user can have multiple objects of userBalances where key will be assets
  private balances: Map<string, UserBalance> = new Map();

  constructor() {
    this.orderBooks = [new Orderbook(`TATA`, [], [], 0, 0)];
    this.initializeBalances();
  }

  process({
    message,
    clientId,
  }: {
    message: MessageFromApi;
    clientId: string;
  }) {
    switch (message.type) {
      case "CREATE_ORDER":
        try {
          const { market, price, quantity, side, userId } = message.data;
          const { orderId, executedQuantity, fills } = this.createOrder(
            market,
            quantity,
            price,
            side,
            userId
          );
          //publishing to the redis pubsub to which api server is subscribed for this clientId
          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_PLACED",
            payload: {
              orderId,
              executedQuantity,
              fills,
            },
          });
        } catch (e) {
          console.error(e);
          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_CANCELLED",
            payload: {
              orderId: "",
              executedQty: 0,
              remainingQty: 0,
            },
          });
        }

        break;

      default:
        break;
    }
  }

  createOrder(
    market: string,
    quantity: string,
    price: string,
    side: "buy" | "sell",
    userId: string
  ) {
    // get the orderbook and assets
    const orderbook = this.orderBooks.find(
      (order) => order.getMarket() === market
    );
    const baseAsset = market.split("_")[0];
    const quoteAsset = market.split("_")[1];

    if (!orderbook) {
      throw new Error("No Orderbook found");
    }

    // lock funds before making an order
    this.lockAndValidateFunds(
      baseAsset,
      quoteAsset,
      userId,
      price,
      quantity,
      side
    );

    // create order object
    const order: Order = {
      userId: userId,
      filled: 0,
      price: Number(price),
      quantity: Number(quantity),
      side,
      orderId:
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
    };
    // add this order to the orderbook
    const { executedQuantity, fills } = orderbook.addOrder(order);

    // after completing the order, update the user's balances
    this.updateUserBalance(userId, fills, baseAsset, quoteAsset, side);
    // publishing to ws the updated depth only for this order price
    // this.sendUpdatedDepthForThisOrderPrice(price, market);
    // send recent trades to ws
    this.publishRecentTradesToWs(fills, userId, market);
    //publishing updated depth to users using ws
    this.publishWsUpdatedDepthAfterCurrentOrder(fills, price, market, side);
    return {
      executedQuantity,
      fills,
      orderId: order.orderId,
    };
  }

  publishWsUpdatedDepthAfterCurrentOrder(
    fills: Fill[],
    price: string,
    market: string,
    side: "buy" | "sell"
  ) {
    const orderbook = this.orderBooks.find((ord) => ord.getMarket() === market);
    if (!orderbook) {
      throw new Error("Orderbook doesn't exists!");
    }
    const depth = orderbook.getOrderbookDepth();
    if (side == "buy") {
      const updatedAsks = depth.asks.filter((x) =>
        fills.map((f) => f.price).includes(x[0])
      );
      const updatedBids = depth.bids.filter((x) => x[0] === price);
      RedisManager.getInstance().publishWsMessage(`depth-${market}`, {
        stream: `depth-${market}`,
        data: {
          a: updatedAsks,
          b: updatedBids.length ? updatedBids : [],
          e: "depth",
        },
      });
    } else {
      const updatedAsks = depth.asks.filter((x) => x[0] === price);
      const updateBids = depth.bids.filter((x) =>
        fills.map((f) => f.price).includes(x[0])
      );
      RedisManager.getInstance().publishWsMessage(`depth-${market}`, {
        stream: `depth-${market}`,
        data: {
          a: updatedAsks.length ? updatedAsks : [],
          b: updateBids,
          e: "depth",
        },
      });
    }
  }

  publishRecentTradesToWs(fills: Fill[], userId: string, market: string) {
    fills.forEach((fill) => {
      RedisManager.getInstance().publishWsMessage(`trade-${market}`, {
        stream: `trade-${market}`,
        data: {
          e: "trade",
          t: fill.tradeId,
          p: fill.price,
          q: fill.quantity.toString(),
          s: market,
          u: fill.otherUserId === userId,
        },
      });
    });
  }

  sendUpdatedDepthAfterCancellationForthePrice(price: string, market: string) {
    const orderbook = this.orderBooks.find(
      (orderbk) => orderbk.getMarket() === market
    );
    if (!orderbook) {
      throw new Error("No Orderbook found");
    }
    const depth = orderbook.getOrderbookDepth();
    const updatedBids = depth.bids.filter((x) => x[0] === price);
    const updatedAsks = depth.asks.filter((x) => x[0] === price);

    RedisManager.getInstance().publishWsMessage(`depth-${market}`, {
      stream: `depth-${market}`,
      data: {
        a: updatedAsks.length ? updatedAsks : [[price, "0"]],
        b: updatedBids.length ? updatedBids : [[price, "0"]],
        s: market,
        e: "depth",
      },
    });
  }

  // it is required to prevent usage of the existing funds which is currently being processed for earlier transaction
  lockAndValidateFunds(
    baseAsset: string,
    quoteAsset: string,
    userId: string,
    price: string,
    quantity: string,
    side: "buy" | "sell"
  ) {
    const userBalance = this.balances.get(userId);
    if (!userBalance) {
      throw new Error("User balance not found");
    }

    if (side === "buy") {
      // Check if sufficient quote asset
      const requiredFunds = Number(price) * Number(quantity);
      if ((userBalance[quoteAsset]?.available || 0) < requiredFunds) {
        throw new Error(`Insufficient ${quoteAsset} funds`);
      }

      userBalance[quoteAsset] = {
        // deducting from available assets
        available: userBalance[quoteAsset].available - requiredFunds,
        // incrementing to locked assets for trnasaction
        locked: userBalance[quoteAsset].locked + requiredFunds,
      };

      this.balances.set(userId, userBalance);
    } else if (side === "sell") {
      // Check if sufficient base asset
      const requiredQuantity = Number(quantity);
      if ((userBalance[baseAsset]?.available || 0) < requiredQuantity) {
        throw new Error(`Insufficient ${baseAsset} funds`);
      }

      userBalance[baseAsset] = {
        available: userBalance[baseAsset].available - requiredQuantity,
        locked: userBalance[baseAsset].locked + requiredQuantity,
      };
      this.balances.set(userId, userBalance);
    }
  }

  updateUserBalance(
    userId: string,
    fills: Fill[],
    baseAsset: string,
    quoteAsset: string,
    side: "buy" | "sell"
  ) {
    const takerBalance = this.balances.get(userId) as UserBalance;
    // Note: maker can be different in the orderbook for the different fills
    // here will be updating the available and locked balances of the taker and markerOrder
    // if the user is in buy side meaning he is buying the stock implying that his quoteAsset was locked and will be deducted and baseAsset which is available will be incremeneted and vice verse for makerOrder
    if (side == "buy") {
      fills.forEach((fill) => {
        // updating quoteAsset meaning his locked amount will be deducted
        takerBalance[quoteAsset].locked =
          takerBalance[quoteAsset].locked - Number(fill.price) * fill.quantity;

        // updating baseAsset meaning his availabe amount will be incremented
        takerBalance[baseAsset].available =
          takerBalance[baseAsset].available +
          Number(fill.price) * fill.quantity;

        // maker will be sellig the baseAsset meaning baseAsset lock amount will be deducted and quoteAsset available amount will be incremeneted
        const makerBalance = this.balances.get(
          fill.makerOrderId
        ) as UserBalance;
        // quoteAsset
        makerBalance[quoteAsset].available =
          makerBalance[quoteAsset].available +
          Number(fill.price) * fill.quantity;
        // baseAsset
        makerBalance[baseAsset].locked =
          makerBalance[baseAsset].locked - Number(fill.price) * fill.quantity;
      });
    }
    // if user is in sell side meaning he is selling the stock -> base assets was locked and will be deducted and available quote assets will be incremented and vice versa for markerOrder
    else {
      fills.forEach((fill) => {
        // updating userId
        // quoteAsset, will be incremented in available section
        takerBalance[quoteAsset].available =
          takerBalance[quoteAsset].available +
          Number(fill.price) * fill.quantity;
        // baseAsset, will be deducted in locked
        takerBalance[baseAsset].locked =
          takerBalance[baseAsset].locked - Number(fill.price) * fill.quantity;

        // udpating maker balance
        const makerBalance = this.balances.get(
          fill.makerOrderId
        ) as UserBalance;
        // quoteAsset, will be deducted in locked
        makerBalance[quoteAsset].locked =
          makerBalance[quoteAsset].locked - Number(fill.price) * fill.quantity;
        //baseAsset
        makerBalance[baseAsset].available =
          makerBalance[baseAsset].available +
          Number(fill.price) * fill.quantity;
      });
    }
  }

  AddBaseFunds(userId: string, amount: number) {
    const userBalance = this.balances.get(userId);
    if (!userBalance) {
      // create new balance for the base asset
      this.balances.set(userId, {
        [BASE_CURRENCY]: {
          available: amount,
          locked: 0,
        },
      });
    } else {
      userBalance[BASE_CURRENCY].available += amount;
    }
  }

  addOrderBook(orderbook: Orderbook) {
    this.orderBooks.push(orderbook);
  }

  initializeBalances() {
    this.balances.set("1", {
      [BASE_CURRENCY]: {
        available: 10000000,
        locked: 0,
      },
      TATA: {
        available: 10000000,
        locked: 0,
      },
    });

    this.balances.set("2", {
      [BASE_CURRENCY]: {
        available: 10000000,
        locked: 0,
      },
      TATA: {
        available: 10000000,
        locked: 0,
      },
    });

    this.balances.set("5", {
      [BASE_CURRENCY]: {
        available: 10000000,
        locked: 0,
      },
      TATA: {
        available: 10000000,
        locked: 0,
      },
    });
  }
}
