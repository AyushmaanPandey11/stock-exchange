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

  private constructor() {
    this.orderBooks = [new Orderbook(`TATA`, [], [], 0, 0)];
    this.initializeBalances();
  }

  // it is required to prevent usage of the existing funds which is currently being processed for earlier transaction
  lockAndValidateFunds(
    baseAsset: string,
    quoteAsset: string,
    userId: string,
    price: number,
    quantity: number,
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
          takerBalance[quoteAsset].locked - fill.price * fill.quantity;

        // updating baseAsset meaning his availabe amount will be incremented
        takerBalance[baseAsset].available =
          takerBalance[baseAsset].available + fill.price * fill.quantity;

        // maker will be sellig the baseAsset meaning baseAsset lock amount will be deducted and quoteAsset available amount will be incremeneted
        const makerBalance = this.balances.get(
          fill.markerOrderId
        ) as UserBalance;
        // quoteAsset
        makerBalance[quoteAsset].available =
          makerBalance[quoteAsset].available + fill.price * fill.quantity;
        // baseAsset
        makerBalance[baseAsset].locked =
          makerBalance[baseAsset].locked - fill.price * fill.quantity;
      });
    }
    // if user is in sell side meaning he is selling the stock -> base assets was locked and will be deducted and available quote assets will be incremented and vice versa for markerOrder
    else {
      fills.forEach((fill) => {
        // updating userId
        // quoteAsset, will be incremented in available section
        takerBalance[quoteAsset].available =
          takerBalance[quoteAsset].available + fill.price * fill.quantity;
        // baseAsset, will be deducted in locked
        takerBalance[baseAsset].locked =
          takerBalance[baseAsset].locked - fill.price * fill.quantity;

        // udpating maker balance
        const makerBalance = this.balances.get(
          fill.markerOrderId
        ) as UserBalance;
        // quoteAsset, will be deducted in locked
        makerBalance[quoteAsset].locked =
          makerBalance[quoteAsset].locked - fill.price * fill.quantity;
        //baseAsset
        makerBalance[baseAsset].available =
          makerBalance[baseAsset].available + fill.price * fill.quantity;
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
