"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { getDepth, getTicker, getTrades } from "../../utils/httpClient";
import { BidTable } from "./BidTable";
import { AskTable } from "./AskTable";
import { WsManager } from "@/app/utils/WsManager";
import { Ticker, Trade } from "@/app/utils/types";
import { TradeTable } from "./TradeTable";

export function Depth({ market }: { market: string }) {
  const [bids, setBids] = useState<[string, string][]>();
  const [asks, setAsks] = useState<[string, string][]>();
  const [price, setPrice] = useState<string>();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isSelected, setIsSelected] = useState<"Depth" | "Trades">("Depth");

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

    WsManager.getInstance().sendMessage({
      method: "SUBSCRIBE",
      params: [`trade.${market}`],
    });

    getDepth(market).then((d) => {
      setBids(d.bids.reverse());
      setAsks(d.asks);
    });

    // Fetch latest price from trades
    getTicker(market).then((t) => setPrice(t.lastPrice));
    getTrades(market).then((t) => {
      console.log("api clg: ", t);
      setTrades(t.slice(0, 25));
      setPrice(t[0].price);
    });

    WsManager.getInstance().registerCallback(
      "bookTicker",
      (data: Partial<Ticker>) =>
        setPrice((prevTicker) => data?.lastPrice ?? prevTicker ?? ""),
      `bookTicker-${market}`
    );

    WsManager.getInstance().registerCallback(
      "trade",
      (data: Trade) => {
        setTrades((prev) => {
          if (!prev) {
            return [data];
          } else {
            return [data, ...prev];
          }
        });
      },
      `trade-${market}`
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
      WsManager.getInstance().deregisterCallback("trade", `trade-${market}`);
    };
  }, [market]);

  return (
    <div>
      <TableHeader setIsSelected={setIsSelected} isSelected={isSelected} />
      {isSelected === "Depth" ? (
        <div
          style={{
            maxHeight: "580px", // Set a fixed height to enable scrolling
            overflowY: "auto", // Enable vertical scrolling
            scrollbarWidth: "none", // Hide scrollbar in Firefox
          }}
          className="hide-scrollbar"
        >
          {asks && <AskTable asks={asks} />}
          {price && <div>{price}</div>}
          {bids && <BidTable bids={bids} />}
        </div>
      ) : (
        <div>
          <TradeTable trades={trades} />
        </div>
      )}
    </div>
  );
}

function TableHeader({
  setIsSelected,
  isSelected,
}: {
  setIsSelected: Dispatch<SetStateAction<"Depth" | "Trades">>;
  isSelected: "Depth" | "Trades";
}) {
  return (
    <div>
      <div className="flex justify-evenly text-xs p-1">
        <div
          className={`${
            isSelected === "Depth" ? "text-white" : "text-slate-500"
          } hover:cursor-pointer`}
          onClick={() => {
            setIsSelected("Depth");
          }}
        >
          Depth
        </div>
        <div
          className={`${
            isSelected === "Trades" ? "text-white" : "text-slate-500"
          } hover:cursor-pointer`}
          onClick={() => {
            setIsSelected("Trades");
          }}
        >
          Trades
        </div>
      </div>
      <div className="flex justify-between text-xs p-0.5">
        <div className="text-white">Price</div>
        <div className="text-white">
          {isSelected === "Depth" ? "Size" : "Qty"}
        </div>
        <div className="text-white">
          {isSelected === "Depth" ? "Total" : "Time"}
        </div>
      </div>
    </div>
  );
}
