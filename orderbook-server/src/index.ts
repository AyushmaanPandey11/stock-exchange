import express from "express";
import { OrderInputSchema } from "./types";
import { fillOrder, getOrderId } from "./repository/repository";

const BASE_ASSET = "BTC";
const QUOTE_ASSET = "USD";

const app = express();
app.use(express.json());

app.post("/api/v1/order", (req: any, res: any) => {
  const order = OrderInputSchema.safeParse(req.body);
  if (!order.success) {
    return res.status(400).json({
      message: order.error.message,
    });
  }

  const { baseAsset, price, quantity, quoteAsset, side, kind } = order.data;

  if (baseAsset !== BASE_ASSET || quoteAsset !== QUOTE_ASSET) {
    return res.status(400).json({
      message: "invalid  base or quote asset",
    });
  }

  const orderId = getOrderId();

  const { executedQty, fills } = fillOrder(
    orderId,
    price,
    quantity,
    side,
    kind
  );
  return res.status(200).json({
    executedQty,
    fills,
    orderId,
  });
});
