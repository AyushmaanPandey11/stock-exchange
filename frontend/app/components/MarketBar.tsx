"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import type { Ticker, Trade } from "../utils/types";
import { getTicker } from "../utils/httpClient";
import { WsManager } from "../utils/WsManager";

export const MarketBar = React.memo(({ market }: { market: string }) => {
  const [ticker, setTicker] = useState<Ticker | null>(null);

  useEffect(() => {
    getTicker(market).then((t) => setTicker(t));
    // using ws instance to get the ticker data.
    WsManager.getInstance().registerCallback(
      "trade",
      (data: Trade) => {
        setTicker((prev) => ({
          ...prev,
          lastPrice: data.price,
          isBuyerMaker: data.isBuyerMaker,
        }));
      },
      `trade-${market}`
    );
    // subscribing to the ws for the ticker data
    WsManager.getInstance().sendMessage({
      method: "SUBSCRIBE",
      params: [`trade.${market}`],
    });

    // during unmounting
    return () => {
      WsManager.getInstance().sendMessage({
        method: "UNSUBSCRIBE",
        params: [`trade.${market}`],
      });
      WsManager.getInstance().deregisterCallback("trade", `trade-${market}`);
    };
  }, [market]);

  return (
    <div>
      <div className="flex items-center flex-row relative w-full overflow-hidden border-b border-slate-800">
        <div className="flex items-center justify-between flex-row no-scrollbar overflow-auto pr-4">
          <Ticker market={market} />
          <div className="flex items-center flex-row space-x-8 pl-4">
            <div className="flex flex-col h-full justify-center">
              <p
                className={`${
                  ticker?.isBuyerMaker ? "text-red-600" : "text-green-600"
                } font-medium tabular-nums text-greenText text-2xl text-green-500`}
              >
                ${ticker?.lastPrice}
              </p>
              <p className="font-medium text-md tabular-nums">
                ${ticker?.lastPrice}
              </p>
            </div>
            <div className="flex flex-col">
              <p className={`font-medium  text-slate-400 text-lg`}>
                24H Change
              </p>
              <p
                className={`font-medium tabular-nums leading-5 text-lg text-greenText ${
                  Number(ticker?.priceChange) > 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {Number(ticker?.priceChange) > 0 ? "+" : ""}{" "}
                {ticker?.priceChange}{" "}
                {Number(ticker?.priceChangePercent) > 0 ? "+" : ""}{" "}
                {(Number(ticker?.priceChangePercent) * 100)?.toFixed(2)}%
              </p>
            </div>
            <div className="flex flex-col">
              <p className="font-medium  text-slate-400 text-lg">24H High</p>
              <p className=" font-medium tabular-nums leading-5 text-lg ">
                {ticker?.high}
              </p>
            </div>
            <div className="flex flex-col">
              <p className="font-medium  text-slate-400 text-lg">24H Low</p>
              <p className=" font-medium tabular-nums leading-5 text-lg ">
                {ticker?.low}
              </p>
            </div>
            <button
              type="button"
              className="font-medium transition-opacity hover:opacity-80 hover:cursor-pointer text-base text-left"
              data-rac=""
            >
              <div className="flex flex-col">
                <p className="font-medium  text-slate-400 text-lg">
                  24H Volume
                </p>
                <p className="mt-1  font-medium tabular-nums leading-5 text-lg ">
                  {ticker?.volume}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
MarketBar.displayName = "MarketBar";

const Ticker = React.memo(({ market }: { market: string }) => {
  return (
    <div className="flex h-[65px] shrink-0 space-x-4">
      <div className="flex flex-row relative ml-2 -mr-2">
        <Image
          alt="SOL Logo"
          loading="lazy"
          decoding="async"
          data-nimg="1"
          className="z-10 rounded-full h-6 w-6 mt-4 outline-baseBackgroundL1"
          src="/laddoo.png"
          width={24}
          height={24}
        />
        <Image
          alt="USDC Logo"
          loading="lazy"
          decoding="async"
          data-nimg="1"
          className="h-6 w-6 -ml-1 mt-4 rounded-full"
          src="/inr.jpeg"
          width={24}
          height={24}
        />
      </div>
      <button type="button" className="react-aria-Button" data-rac="">
        <div className="flex items-center justify-between flex-row cursor-pointer rounded-lg p-3 hover:opacity-80">
          <div className="flex items-center flex-row gap-2 undefined">
            <div className="flex flex-row relative">
              <p className="font-medium text-;g undefined ml-4">
                {market.replace("_", " / ")}
              </p>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
});

Ticker.displayName = "Ticker";
