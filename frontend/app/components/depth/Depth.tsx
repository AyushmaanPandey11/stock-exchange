"use client";

import { useEffect, useState } from "react";
import {
  getDepth,
  // getKlines,
  getTicker,
  // getTrades,
} from "../../utils/httpClient";
import { BidTable } from "./BidTable";
import { AskTable } from "./AskTable";
import { WsManager } from "@/app/utils/WsManager";

export function Depth({ market }: { market: string }) {
  const [bids, setBids] = useState<[string, string][]>();
  const [asks, setAsks] = useState<[string, string][]>();
  const [price, setPrice] = useState<string>();

  useEffect(() => {
    WsManager.getInstance().registerCallback(
      "depth",
      (data: { bids: string[]; asks: string[] }) => {
        setBids((originalBid) => {
          const bidsAfterUpdate = [...(originalBid || [])];
          for (let idx = 0; idx < bidsAfterUpdate.length; idx++) {
            for (let idy = 0; idy < data.bids.length; idy++) {
              if (bidsAfterUpdate[idx][0] === data.bids[idy][0]) {
                bidsAfterUpdate[idx][1] = data.bids[idy][1];
                break;
              }
            }
          }
          return bidsAfterUpdate;
        });
        setAsks((originalAsk) => {
          const asksAfterUpdate = [...(originalAsk || [])];
          for (let idx = 0; idx < asksAfterUpdate.length; idx++) {
            for (let idy = 0; idy < data.asks.length; idy++) {
              if (asksAfterUpdate[idx][0] === data.asks[idy][0]) {
                asksAfterUpdate[idx][1] = data.asks[idy][1];
                break;
              }
            }
          }
          return asksAfterUpdate;
        });
      },
      `depth-${market}`
    );

    WsManager.getInstance().sendMessage({
      method: "SUBSCRIBE",
      params: [`depth.200ms.${market}`],
    });
    getDepth(market).then((d) => {
      setBids(d.bids.reverse());
      setAsks(d.asks);
    });

    getTicker(market).then((t) => setPrice(t.lastPrice));
    // getTrades(market).then((t) => setPrice(t[0].price));
    // getKlines(market, "1h", 1640099200, 1640100800).then((t) =>
    //   setPrice(t[0].close)
    // );
    return () => {
      WsManager.getInstance().sendMessage({
        method: "UNSUBSCRIBE",
        params: [`depth.200ms.${market}`],
      });
      WsManager.getInstance().deregisterCallback("depth", `depth-${market}`);
    };
  }, [market]);

  return (
    <div>
      <TableHeader />
      {asks && <AskTable asks={asks} />}
      {price && <div>{price}</div>}
      {bids && <BidTable bids={bids} />}
    </div>
  );
}

function TableHeader() {
  return (
    <div className="flex justify-between text-xs">
      <div className="text-white">Price</div>
      <div className="text-slate-500">Size</div>
      <div className="text-slate-500">Total</div>
    </div>
  );
}
