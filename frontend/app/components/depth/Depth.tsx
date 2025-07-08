"use client";

import { useEffect, useState } from "react";
import { getDepth, getTicker, getTrades } from "../../utils/httpClient";
import { BidTable } from "./BidTable";
import { AskTable } from "./AskTable";
import { WsManager } from "@/app/utils/WsManager";
import { Ticker } from "@/app/utils/types";

export function Depth({ market }: { market: string }) {
  const [bids, setBids] = useState<[string, string][]>();
  const [asks, setAsks] = useState<[string, string][]>();
  const [price, setPrice] = useState<string>();

  useEffect(() => {
    WsManager.getInstance().registerCallback(
      "depth",
      (data: { bids: string[]; asks: string[] }) => {
        // Update bids
        setTimeout(() => {
          setBids((originalBids) => {
            const bidsAfterUpdate = [...(originalBids || [])];

            // Update or remove existing bids
            for (let i = 0; i < bidsAfterUpdate.length; i++) {
              for (let j = 0; j < data.bids.length; j++) {
                if (bidsAfterUpdate[i][0] === data.bids[j][0]) {
                  bidsAfterUpdate[i][1] = data.bids[j][1];
                  if (Number(bidsAfterUpdate[i][1]) === 0) {
                    bidsAfterUpdate.splice(i, 1);
                    i--; // Adjust index after splice
                  }
                  break;
                }
              }
            }

            // Add new non-zero bids
            const bidPrices = new Set(bidsAfterUpdate.map((x) => x[0]));
            for (let j = 0; j < data.bids.length; j++) {
              if (
                Number(data.bids[j][1]) !== 0 &&
                !bidPrices.has(data.bids[j][0])
              ) {
                bidsAfterUpdate.push([data.bids[j][0], data.bids[j][1]]);
              }
            }

            // Sort in descending order (highest price first)
            bidsAfterUpdate.sort((x, y) =>
              Number(y[0]) > Number(x[0]) ? 1 : -1
            );
            return bidsAfterUpdate;
          });

          setAsks((originalAsks) => {
            const asksAfterUpdate = [...(originalAsks || [])];

            // Update or remove existing asks
            for (let i = 0; i < asksAfterUpdate.length; i++) {
              for (let j = 0; j < data.asks.length; j++) {
                if (asksAfterUpdate[i][0] === data.asks[j][0]) {
                  asksAfterUpdate[i][1] = data.asks[j][1];
                  if (Number(asksAfterUpdate[i][1]) === 0) {
                    asksAfterUpdate.splice(i, 1);
                    i--; // Adjust index after splice
                  }
                  break;
                }
              }
            }

            // Add new non-zero asks
            const askPrices = new Set(asksAfterUpdate.map((x) => x[0]));
            for (let j = 0; j < data.asks.length; j++) {
              if (
                Number(data.asks[j][1]) !== 0 &&
                !askPrices.has(data.asks[j][0])
              ) {
                asksAfterUpdate.push([data.asks[j][0], data.asks[j][1]]);
              }
            }

            // Sort in ascending order (lowest price first)
            asksAfterUpdate.sort((x, y) =>
              Number(y[0]) > Number(x[0]) ? -1 : 1
            );
            return asksAfterUpdate;
          });
        }, 2000);
      },
      `DEPTH-${market}`
    );

    WsManager.getInstance().sendMessage({
      method: "SUBSCRIBE",
      params: [`depth.${market}`],
    });

    getDepth(market).then((d) => {
      setBids(d.bids.reverse());
      setAsks(d.asks);
    });

    // Fetch latest price from trades
    getTicker(market).then((t) => setPrice(t.lastPrice));
    getTrades(market).then((t) => {
      console.log(t[0].price);
      setPrice(t[0].price);
    });

    WsManager.getInstance().registerCallback(
      "bookTicker",
      (data: Partial<Ticker>) =>
        setPrice((prevTicker) => data?.lastPrice ?? prevTicker ?? ""),
      `bookTicker-${market}`
    );

    // Cleanup on unmount
    return () => {
      WsManager.getInstance().sendMessage({
        method: "UNSUBSCRIBE",
        params: [`depth.${market}`],
      });
      WsManager.getInstance().deregisterCallback("depth", `DEPTH-${market}`);
      WsManager.getInstance().deregisterCallback(
        "bookTicker",
        `bookTicker-${market}`
      );
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
