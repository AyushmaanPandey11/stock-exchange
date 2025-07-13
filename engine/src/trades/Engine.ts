import { Orderbook } from "./Orderbook";

export const BASE_CURRENCY = "INR";

// INR: {
//     available: 1000,
//     locked: 200
//   }

interface UserBalance {
  [key: string]: {
    available: number;
    locked: number;
  };
}

export class Engine {
  private orderBooks: Orderbook[] = [];
  private balances: Map<string, UserBalance> = new Map();

  private constructor() {}
}
