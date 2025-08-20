"use client";
import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import { createOrder, getTicker } from "../utils/httpClient";

export const SwapUI = React.memo(({ market }: { market: string }) => {
  const [amount, setAmount] = useState("5");
  const [price, setPrice] = useState(0);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"limit" | "market">("limit");

  useEffect(() => {
    getTicker(market).then((t) => setPrice(Number(t.lastPrice)));
  });

  const handleOrder = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const response = createOrder(market, price, Number(amount), activeTab, 1);
      console.log(response);
    },
    [market, activeTab, amount, price]
  );

  return (
    <div>
      <div className="flex flex-col">
        <div className="flex flex-row h-[60px]">
          <BuyButton
            activeTab={activeTab}
            setActiveTab={() => setActiveTab("buy")}
          />
          <SellButton
            activeTab={activeTab}
            setActiveTab={() => setActiveTab("sell")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="px-3">
            <div className="flex flex-row flex-0 gap-5 undefined">
              <LimitButton type={type} setType={() => setType("limit")} />
              <MarketButton type={type} setType={() => setType("market")} />
            </div>
          </div>
          <div className="flex flex-col px-3">
            <div className="flex flex-col flex-1 gap-3 text-baseTextHighEmphasis">
              <div className="flex flex-col gap-3">
                {/* <div className="flex items-center justify-between flex-row">
                  <p className="text-xs font-normal text-baseTextMedEmphasis">
                    Available Balance
                  </p>
                  <p className="font-medium text-xs text-baseTextHighEmphasis">
                    36.94 USDC
                  </p>
                </div> */}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-normal text-baseTextMedEmphasis">
                  Price
                </p>
                <div className="flex flex-col relative">
                  <input
                    step="0.01"
                    placeholder="0"
                    className="h-14 rounded-lg border-2 border-solid border-baseBorderLight bg-[var(--background)] pr-12 text-right text-2xl leading-9 text-[$text] placeholder-baseTextMedEmphasis ring-0 transition focus:border-accentBlue focus:ring-0"
                    type="text"
                    value={price ?? "0"}
                    onChange={(e) => {
                      setPrice(Number(e.target.value));
                    }}
                  />
                  <div className="flex flex-row absolute right-1 top-1 p-2">
                    <div className="relative">
                      <Image
                        src="/inr.jpeg"
                        alt="image"
                        className="w-8 h-8 object-contain"
                        width={32}
                        height={32}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <p className="text-xs font-normal text-baseTextMedEmphasis">
                Quantity
              </p>
              <div className="flex flex-col relative">
                <input
                  step="0.01"
                  placeholder="0"
                  className="h-14 rounded-lg border-2 border-solid border-baseBorderLight bg-[var(--background)] pr-12 text-right text-2xl leading-9 text-[$text] placeholder-baseTextMedEmphasis ring-0 transition focus:border-accentBlue focus:ring-0"
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                  }}
                />
                <div className="flex flex-row absolute right-1 top-1 p-2">
                  <div className="relative">
                    <Image
                      src="/laddoo.png"
                      alt="sol"
                      className="w-8 h-8"
                      width={32}
                      height={32}
                    />
                  </div>
                </div>
              </div>
              {/* <div className="flex justify-center flex-row mt-2 gap-3">
                <div className="flex items-center justify-center flex-row rounded-full px-[16px] py-[6px] text-xs cursor-pointer bg-baseBackgroundL2 hover:bg-baseBackgroundL3">
                  25%
                </div>
                <div className="flex items-center justify-center flex-row rounded-full px-[16px] py-[6px] text-xs cursor-pointer bg-baseBackgroundL2 hover:bg-baseBackgroundL3">
                  50%
                </div>
                <div className="flex items-center justify-center flex-row rounded-full px-[16px] py-[6px] text-xs cursor-pointer bg-baseBackgroundL2 hover:bg-baseBackgroundL3">
                  75%
                </div>
                <div className="flex items-center justify-center flex-row rounded-full px-[16px] py-[6px] text-xs cursor-pointer bg-baseBackgroundL2 hover:bg-baseBackgroundL3">
                  Max
                </div>
              </div> */}
            </div>
            <button
              type="button"
              className={`font-semibold  focus:ring-blue-200 focus:none focus:outline-none text-center h-12 rounded-xl text-black hover:cursor-pointer text-base px-4 py-2 my-4 mt-10 ${
                activeTab === "buy" ? "bg-green-500" : "bg-red-500"
              } bg-greenPrimaryButtonBackground text-greenPrimaryButtonText active:scale-98`}
              onClick={(e) => handleOrder(e)}
            >
              {activeTab === "buy" ? "Buy" : "Sell"}
            </button>
            <div className="flex justify-between flex-row mt-1">
              <div className="flex flex-row gap-2">
                <div className="flex items-center">
                  <input
                    className="form-checkbox rounded border border-solid border-baseBorderMed bg-base-950 font-light text-transparent shadow-none shadow-transparent outline-none ring-0 ring-transparent checked:border-baseBorderMed checked:bg-base-900 checked:hover:border-baseBorderMed focus:bg-base-900 focus:ring-0 focus:ring-offset-0 focus:checked:border-baseBorderMed cursor-pointer h-5 w-5"
                    id="postOnly"
                    type="checkbox"
                    data-rac=""
                  />
                  <label className="ml-2 text-xs">Post Only</label>
                </div>
                <div className="flex items-center">
                  <input
                    className="form-checkbox rounded border border-solid border-baseBorderMed bg-base-950 font-light text-transparent shadow-none shadow-transparent outline-none ring-0 ring-transparent checked:border-baseBorderMed checked:bg-base-900 checked:hover:border-baseBorderMed focus:bg-base-900 focus:ring-0 focus:ring-offset-0 focus:checked:border-baseBorderMed cursor-pointer h-5 w-5"
                    id="ioc"
                    type="checkbox"
                    data-rac=""
                  />
                  <label className="ml-2 text-xs">IOC</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
SwapUI.displayName = "SwapUI";

const LimitButton = React.memo(
  ({
    type,
    setType,
  }: {
    type: string;
    setType: React.Dispatch<React.SetStateAction<string>>;
  }) => {
    return (
      <div
        className="flex flex-col cursor-pointer justify-center py-2"
        onClick={() => setType("limit")}
      >
        <div
          className={`text-sm font-medium py-1 border-b-2 ${
            type === "limit"
              ? "border-blue-50 text-bold"
              : "border-transparent hover:border-2 hover:font-bold"
          }`}
        >
          Limit
        </div>
      </div>
    );
  }
);
LimitButton.displayName = "LimitButton";

const MarketButton = React.memo(
  ({
    type,
    setType,
  }: {
    type: string;
    setType: React.Dispatch<React.SetStateAction<string>>;
  }) => {
    return (
      <div
        className="flex flex-col cursor-pointer justify-center py-2"
        onClick={() => setType("market")}
      >
        <div
          className={`text-sm font-medium py-1 border-b-2 ${
            type === "market"
              ? "border-blue-50 font-bold"
              : "border-b-2 border-transparent hover:font-semibold hover:border-2"
          } `}
        >
          Market
        </div>
      </div>
    );
  }
);
MarketButton.displayName = "MarketButton";

const BuyButton = React.memo(
  ({
    activeTab,
    setActiveTab,
  }: {
    activeTab: string;
    setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  }) => {
    return (
      <div
        className={`flex flex-col flex-1 cursor-pointer justify-center border-b-2 p-4 ${
          activeTab === "buy"
            ? "border-b-green-500 bg-green-50"
            : "border-b-gray-300 hover:border-b-gray-400"
        }`}
        onClick={() => setActiveTab("buy")}
      >
        <p className="text-center text-sm font-semibold text-green-600">Buy</p>
      </div>
    );
  }
);
BuyButton.displayName = "BuyButton";

const SellButton = React.memo(
  ({
    activeTab,
    setActiveTab,
  }: {
    activeTab: string;
    setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  }) => {
    return (
      <div
        className={`flex flex-col flex-1 cursor-pointer justify-center border-b-2 p-4 ${
          activeTab === "sell"
            ? "border-b-red-300 bg-red-200"
            : "border-b-baseBorderMed hover:border-b-baseBorderFocus"
        }`}
        onClick={() => setActiveTab("sell")}
      >
        <p className="text-center text-sm font-semibold text-red-500">Sell</p>
      </div>
    );
  }
);

SellButton.displayName = "SellButton";
