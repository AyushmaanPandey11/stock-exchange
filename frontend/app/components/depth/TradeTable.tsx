import type { Trade } from "@/app/utils/types";

export const TradeTable = ({ trades }: { trades: Trade[] }) => {
  return (
    <div
      style={{
        maxHeight: "660px", // Set a fixed height to enable scrolling
        overflowY: "auto", // Enable vertical scrolling
        scrollbarWidth: "none", // Hide scrollbar in Firefox
      }}
      className="hide-scrollbar"
    >
      {trades.length > 0 ? (
        trades.map((trade) => (
          <Trade
            key={trade.id}
            price={trade.price}
            quantity={trade.quantity}
            time={trade.timestamp}
            isBuy={!trade.isBuyerMaker}
          />
        ))
      ) : (
        <div className="text-xs text-gray-500 text-center p-2">
          No trades available
        </div>
      )}
    </div>
  );
};

function Trade({
  price,
  quantity,
  time,
  isBuy,
}: {
  price: string;
  quantity: string;
  time: number;
  isBuy: boolean;
}) {
  const formattedTime = time
    ? new Date(time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "N/A";
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
        }}
      ></div>
      <div className="flex justify-between text-md my-0.5 w-full">
        <div className={`${isBuy ? "text-green-500" : "text-red-500"}`}>
          {price}
        </div>
        <div>{quantity}</div>
        <div>{formattedTime}</div>
      </div>
    </div>
  );
}
