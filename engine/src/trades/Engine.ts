import {
  CANCEL_ORDER,
  CREATE_ORDER,
  GET_DEPTH,
  GET_OPEN_ORDERS,
  MessageFromApi,
  ON_RAMP,
} from "../types/fromApi";
import { TRADE_ADDED } from "../types/db";
import { Fill, Order, Orderbook } from "./Orderbook";
import { RedisManager } from "../RedisManager";

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
    this.orderBooks = [new Orderbook(`LADDOO`, [], [], 0, 0)];
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
      case CREATE_ORDER:
        try {
          const { market, price, quantity, side, userId } = message.data;
          const { orderId, executedQuantity, fills, ResMessage } =
            this.createOrder(market, quantity, price, side, userId);
          //publishing to the redis pubsub to which api server is subscribed for this clientId
          RedisManager.getInstance().sendToApi(clientId, {
            type: "ORDER_PLACED",
            payload: {
              orderId,
              executedQuantity,
              fills,
              ResMessage,
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

      case GET_DEPTH:
        try {
          const market = message.data.market;
          const orderbook = this.orderBooks.find(
            (o) => o.getMarket() === market
          );
          if (!orderbook) {
            throw new Error("Orderbook doesn't exists");
          }
          RedisManager.getInstance().sendToApi(clientId, {
            type: "DEPTH",
            payload: orderbook.getOrderbookDepth(),
          });
        } catch (error) {
          RedisManager.getInstance().sendToApi(clientId, {
            type: "DEPTH",
            payload: {
              asks: [],
              bids: [],
            },
          });
        }
        break;

      case ON_RAMP:
        const userId = message.data.userId;
        const amount = Number(message.data.amount);
        this.AddBaseFunds(userId, amount);
        break;

      case GET_OPEN_ORDERS:
        try {
          const { market, userId } = message.data;
          const orderbook = this.orderBooks.find(
            (o) => o.getMarket() === market
          );
          if (!orderbook) {
            throw new Error("orderbook doesn't exists");
          }
          const openOrders = orderbook.getUserOrderfromOrderBook(userId);
          RedisManager.getInstance().sendToApi(clientId, {
            type: "OPEN_ORDERS",
            payload: openOrders,
          });
        } catch (error) {
          {
            RedisManager.getInstance().sendToApi(clientId, {
              type: "OPEN_ORDERS",
              payload: [],
            });
          }
        }
        break;
      case CANCEL_ORDER:
        try {
          const { market, orderId } = message.data;
          const quoteAsset = market.split("_")[1];
          const orderbook = this.orderBooks.find(
            (o) => o.getMarket() === market
          );
          if (!orderbook) {
            throw new Error("Orderbook doesn't exists");
          }
          const order =
            orderbook.asks.find((ord) => ord.orderId === orderId) ||
            orderbook.bids.find((ord) => ord.orderId === orderId);
          if (!order) {
            throw new Error("Order doesn't exists");
          }
          // cancelling order from orderbook
          if (order.side === "buy") {
            const price = orderbook.cancelBid(order);
            const totalAmount = (order.quantity - order.filled) * order.price;
            // updating users balances
            const buyerBalance = this.balances.get(order.userId);
            if (!buyerBalance) {
              throw new Error("User balances doesn't exists");
            }
            buyerBalance[BASE_CURRENCY].available += totalAmount;
            buyerBalance[BASE_CURRENCY].locked -= totalAmount;
            if (price) {
              this.sendUpdatedDepthAfterCancellationForthePrice(
                price?.toString(),
                market
              );
            }
          } else {
            const price = orderbook.cancelAsk(order);
            const totalAmount = order.quantity - order.filled;
            const sellerBalance = this.balances.get(order.userId);
            if (!sellerBalance) {
              throw new Error("user balances doesn't exists");
            }
            sellerBalance[quoteAsset].available += totalAmount;
            sellerBalance[quoteAsset].locked -= totalAmount;
            if (price) {
              this.sendUpdatedDepthAfterCancellationForthePrice(
                price.toString(),
                market
              );
            }
            RedisManager.getInstance().sendToApi(clientId, {
              type: CANCEL_ORDER,
              payload: {
                orderId,
                executedQuantity: 0,
                remaininQuantity: 0,
              },
            });
          }
        } catch (error) {
          console.log("Error hwile cancelling order");
          console.log(error);
        }
        break;
    }
  }

  createDbTrades(fills: Fill[], market: string, side: "buy" | "sell") {
    fills.forEach((fill) => {
      RedisManager.getInstance().publishDbMessage({
        type: TRADE_ADDED,
        data: {
          market: market,
          id: fill.tradeId.toString(),
          price: fill.price,
          quantity: fill.quantity.toString(),
          // quoteQuantity: (fill.quantity * Number(fill.price)).toString(),
          timestamp: Date.now(),
          isBuyerMaker: side === "sell",
        },
      });
    });
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
    if (!orderbook) {
      throw new Error("No Orderbook found");
    }

    const [baseAsset, quoteAsset] = market.split("_");
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
    const { executedQuantity, fills, message } = orderbook.addOrder(order);
    // after completing the order, update the user's balances
    this.updateUserBalance(userId, fills, baseAsset, quoteAsset, side);
    // publishing to ws the updated depth only for this order price
    // this.sendUpdatedDepthForThisOrderPrice(price, market);
    // send recent trades to ws
    this.publishRecentTradesToWs(fills, market, side);
    //publishing updated depth to users using ws
    this.publishWsUpdatedDepthAfterCurrentOrder(fills, price, market, side);
    // messages to db
    this.createDbTrades(fills, market, side);
    return {
      executedQuantity,
      fills,
      orderId: order.orderId,
      ResMessage: message,
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
      const updatedAsks = depth.asks.filter(
        (x) => fills.length > 0 && fills.map((f) => f.price).includes(x[0])
      );
      const updatedBids = depth.bids.filter((x) => x[0] === price);
      RedisManager.getInstance().publishWsMessage(`depth.${market}`, {
        stream: `depth.${market}`,
        data: {
          a: updatedAsks.length
            ? updatedAsks
            : fills.length > 0
            ? [[price, "0"]]
            : [],
          b: updatedBids.length ? updatedBids : [],
          e: "depth",
        },
      });
    } else {
      const updatedAsks = depth.asks.filter((x) => x[0] === price);
      const updateBids = depth.bids.filter(
        (x) => fills.length > 0 && fills.map((f) => f.price).includes(x[0])
      );
      RedisManager.getInstance().publishWsMessage(`depth.${market}`, {
        stream: `depth.${market}`,
        data: {
          a: updatedAsks.length ? updatedAsks : [],
          b: updateBids.length
            ? updateBids
            : fills.length > 0
            ? [[price, "0"]]
            : [],
          e: "depth",
        },
      });
    }
  }

  publishRecentTradesToWs(fills: Fill[], market: string, side: "buy" | "sell") {
    fills.forEach((fill) => {
      RedisManager.getInstance().publishWsMessage(`trade.${market}`, {
        stream: `trade.${market}`,
        data: {
          e: "trade",
          t: fill.tradeId,
          p: fill.price,
          q: fill.quantity.toString(),
          s: market,
          m: side === "sell",
          T: Date.now(),
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

    RedisManager.getInstance().publishWsMessage(`depth.${market}`, {
      stream: `depth.${market}`,
      data: {
        a: updatedAsks.length ? updatedAsks : [[price, "0"]],
        b: updatedBids.length ? updatedBids : [[price, "0"]],
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
        const makerBalance = this.balances.get(fill.makerUserId) as UserBalance;
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
        const makerBalance = this.balances.get(fill.makerUserId) as UserBalance;
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
      LADDOO: {
        available: 10000000,
        locked: 0,
      },
    });

    this.balances.set("2", {
      [BASE_CURRENCY]: {
        available: 10000000,
        locked: 0,
      },
      LADDOO: {
        available: 10000000,
        locked: 0,
      },
    });

    this.balances.set("5", {
      [BASE_CURRENCY]: {
        available: 10000000,
        locked: 0,
      },
      LADDOO: {
        available: 10000000,
        locked: 0,
      },
    });
  }
}
