import { vi, it, describe, expect } from "vitest";
import { Order, Orderbook } from "../trades/Orderbook";

describe("Simple Orderbook Methods Testing", () => {
  it("handling adding order in the empty orderbook", () => {
    const orderbook = new Orderbook("LADDOO", [], [], 0, 0);
    const order: Order = {
      price: 200,
      quantity: 1,
      orderId: "1",
      filled: 0,
      side: "buy" as "buy" | "sell",
      userId: "1",
    };
    const { executedQuantity, fills } = orderbook.addOrder(order);
    expect(fills.length).toBe(0);
    expect(executedQuantity).toBe(0);
  });
});
