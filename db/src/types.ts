export type DbMessage = {
  type: "TRADE_ADDED";
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
