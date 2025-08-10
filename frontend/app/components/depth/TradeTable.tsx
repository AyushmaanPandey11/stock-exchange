import type { Trade } from "@/app/utils/types";

export const TradeTable = ({ trades }: { trades: Trade[] }) => {
  console.log(trades);
  //   const relevantTrades = trades.slice(0, 15);
  return (
    <div>
      {trades.map(([price, quantity, time]) => (
        <Trade key={price} price={price} quantity={quantity} time={time} />
      ))}
    </div>
  );
};

function Trade({
  price,
  quantity,
  time,
}: {
  price: string;
  quantity: string;
  time: number;
}) {
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
      <div className="flex justify-between text-xs w-full">
        <div>{price}</div>
        <div>{quantity}</div>
        <div>{time?.toFixed(2)}</div>
      </div>
    </div>
  );
}
