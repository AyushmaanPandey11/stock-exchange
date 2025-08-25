import { useCallback, useEffect, useRef } from "react";
import { getKlines } from "../utils/httpClient";
import { KLine } from "../utils/types";
import { ChartManager } from "../utils/chartManager";

export function TradeView({ market }: { market: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<ChartManager | null>(null);

  const init = useCallback(async () => {
    let klineData: KLine[] = [];
    try {
      klineData = await getKlines(
        market,
        "1h",
        Math.floor((new Date().getTime() - 1000 * 60 * 60 * 24 * 7) / 1000),
        Math.floor(new Date().getTime() / 1000)
      );
    } catch (e) {
      console.error("error: ", e);
    }

    if (chartRef && chartRef.current) {
      if (chartManagerRef.current) {
        chartManagerRef.current.destroy();
      }
      const chartManager = new ChartManager(
        chartRef.current,
        [
          ...klineData?.map((x) => ({
            close: parseFloat(x.close),
            high: parseFloat(x.high),
            low: parseFloat(x.low),
            open: parseFloat(x.open),
            timestamp: new Date(x.end),
          })),
        ].sort((x, y) => (x.timestamp < y.timestamp ? -1 : 1)) || [],
        {
          background: "#0e0f14",
          color: "white",
        }
      );
      chartManagerRef.current = chartManager;
    }
  }, [market]);

  useEffect(() => {
    init();
  }, [market, chartRef, init]);

  return (
    <>
      <div
        ref={chartRef}
        style={{ height: "700px", width: "100%", marginTop: 4 }}
      ></div>
    </>
  );
}
