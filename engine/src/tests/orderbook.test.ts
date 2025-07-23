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

  it("handling partial order testing", () => {
    const orderbook = new Orderbook(
      "LADDOO",
      [
        {
          filled: 0,
          orderId: "1",
          price: 200,
          quantity: 1,
          side: "buy",
          userId: "1",
        },
      ],
      [],
      0,
      0
    );

    const order: Order = {
      price: 200,
      quantity: 2,
      orderId: "2",
      filled: 0,
      side: "sell",
      userId: "2",
    };
    const { executedQuantity, fills } = orderbook.addOrder(order);
    expect(fills.length).toBe(1);
    expect(executedQuantity).toBe(1);
  });
});

describe("Self trade prevention", () => {
  it("User cannot self-trade", () => {
    const orderbook = new Orderbook(
      "LADDOO",
      [
        {
          price: 100,
          quantity: 1,
          orderId: "1",
          userId: "1",
          filled: 0,
          side: "buy" as "buy" | "sell",
        },
      ],
      [],
      0,
      0
    );
    const order: Order = {
      price: 100,
      filled: 0,
      orderId: "2",
      quantity: 1,
      side: "sell" as "buy" | "sell",
      userId: "1",
    };
    const { executedQuantity, fills } = orderbook.addOrder(order);
    expect(executedQuantity).toBe(0);
    expect(fills.length).toBe(0);

    expect(orderbook.asks).toContainEqual(expect.objectContaining(order));
  });
});

describe("quantity precision errors", () => {
  it("handles decimal quantities without residual bids", () => {
    const orderbook = new Orderbook(
      "TATA",
      [
        {
          price: 99,
          quantity: 0.351123,
          orderId: "1",
          filled: 0,
          side: "buy" as "buy" | "sell",
          userId: "1",
        },
      ],
      [
        {
          price: 101,
          quantity: 0.351,
          orderId: "2",
          filled: 0,
          side: "sell" as "buy" | "sell",
          userId: "2",
        },
      ],
      0,
      0
    );

    const order: Order = {
      filled: 0,
      orderId: "2",
      price: 99,
      side: "sell" as "buy" | "sell",
      quantity: 0.351123,
      userId: "3",
    };

    const { executedQuantity, fills } = orderbook.addOrder(order);
    expect(fills.length).toBe(1);
    expect(executedQuantity).toBe(0.351123);
    expect(orderbook.bids.length).toBe(0);
    expect(orderbook.asks.length).toBe(1);
  });
});
