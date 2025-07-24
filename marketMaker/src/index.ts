import axios from "axios";

const BASE_URL = "http://localhost:3000";
const totalBids = 20;
const totalAsks = 20;
const Market = "LADDOO_INR";
const userId = "5";

async function main() {
  const price = 100 + Math.random() * 10;
  const openOrder = await axios.get(
    `${BASE_URL}/api/v1/order/openOrders/${userId}/${Market}`
  );

  const totalBids = openOrder.data.filter((o: any) => o.side === "buy").length;
  const totalAsks = openOrder.data.filter((o: any) => o.side === "sell").length;
}
