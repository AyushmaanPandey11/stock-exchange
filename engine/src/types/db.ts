export const TRADE_ADDED = "TRADE_ADDED";

export type DbMessage = {
  type: typeof TRADE_ADDED;
  data: {
    id: string;
    isBuyerMaker: boolean;
    price: string;
    quantity: string;
    // quoteQuantity: string;
    timestamp: number;
    market: string;
  };
};
