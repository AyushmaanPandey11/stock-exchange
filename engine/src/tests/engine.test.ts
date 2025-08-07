import { vi, describe, it, expect } from "vitest";
import { Engine } from "../trades/Engine";
import { CREATE_ORDER } from "../types/fromApi";

// creating a fake modeules of redisManager, to prevent this testing execution to get process with real ones
vi.mock("../RedisManager", () => ({
  RedisManager: {
    getInstance: vi.fn().mockReturnValue({
      publishWsMessage: vi.fn(),
      sendToApi: vi.fn(),
      publishDbMessage: vi.fn(),
    }),
  },
}));

describe("Engine Testing", () => {
  it("Publishing Create Order Tests", () => {
    const engine = new Engine();
    const fakePublish = vi.spyOn(engine, "publishRecentTradesToWs");
    engine.process({
      clientId: "1",
      message: {
        type: CREATE_ORDER,
        data: {
          market: "LADDOO_INR",
          price: "250",
          quantity: "1",
          side: "buy",
          userId: "1",
        },
      },
    });

    // second order
    engine.process({
      clientId: "1",
      message: {
        type: CREATE_ORDER,
        data: {
          market: "LADDOO_INR",
          price: "260",
          quantity: "1",
          side: "sell",
          userId: "2",
        },
      },
    });

    expect(fakePublish).toHaveBeenCalledTimes(2);
  });
});
