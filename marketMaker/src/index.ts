import axios from "axios";

const BASE_URL = "http://localhost:5000";
const TOTALBIDS = 20;
const TOTALASKS = 20;
const Market = "LADDOO_INR";
const userId = "5";

export interface Order {
  price: number;
  quantity: number;
  userId: string;
  orderId: string;
  filled: number;
  side: "buy" | "sell";
}

async function main() {
  // Modified to generate price between 95 and 115
  const price = 95 + Math.random() * 20; // Ensures price is between 95 and 115
  const openOrder = await axios.get(
    `${BASE_URL}/api/v1/order/openOrders?userId=${userId}&market=${Market}`
  );

  const totalBids = openOrder.data.filter((o: any) => o.side === "buy").length;
  const totalAsks = openOrder.data.filter((o: any) => o.side === "sell").length;

  const cancelledBids = await CancelBidOrdersMoreThanThePrice(
    openOrder.data,
    price
  );
  const cancelledAsks = await CancelAskOrdersLessThanThePrice(
    openOrder.data,
    price
  );

  let BidsToAdd = TOTALBIDS - cancelledBids - totalBids;
  let AsksToAdd = TOTALASKS - cancelledAsks - totalAsks;

  while (BidsToAdd > 0 || AsksToAdd > 0) {
    if (BidsToAdd > 0) {
      await axios.post(`${BASE_URL}/api/v1/order/createOrder`, {
        market: Market,
        // Ensure bid price is below 'price' but within 95–115
        price: Math.max(95, price - Math.random() * 20)
          .toFixed(1)
          .toString(),
        quantity: "1",
        side: "buy",
        userId: userId,
      });
      BidsToAdd--;
    }
    if (AsksToAdd > 0) {
      await axios.post(`${BASE_URL}/api/v1/order/createOrder`, {
        market: Market,
        // Ensure ask price is above 'price' but within 95–115
        price: Math.min(115, price + Math.random() * (115 - price))
          .toFixed(1)
          .toString(),
        quantity: "1",
        side: "sell",
        userId: userId,
      });
      AsksToAdd--;
    }
  }
}

const CancelBidOrdersMoreThanThePrice = async (
  order: Order[],
  price: number
) => {
  let promises: any[] = [];
  order.map((o) => {
    if (o.price > price && o.side === "buy") {
      promises.push(
        axios.delete(`${BASE_URL}/api/v1/order/deleteOrder`, {
          data: {
            userId: userId,
            market: Market,
            orderId: o.orderId,
          },
        })
      );
    }
  });
  await Promise.all(promises);
  return promises.length;
};

const CancelAskOrdersLessThanThePrice = async (
  order: Order[],
  price: number
) => {
  let promises: any[] = [];
  order.map((o) => {
    if (o.side === "sell" && o.price < price) {
      promises.push(
        axios.delete(`${BASE_URL}/api/v1/order/deleteOrder`, {
          data: {
            userId: userId,
            market: Market,
            orderId: o.orderId,
          },
        })
      );
    }
  });

  await Promise.all(promises);
  return promises.length;
};

main().then(() => {
  console.log(`orders added to engine`);
});
