import express from "express";
import cors from "cors";
import { orderRouter } from "./routes/order.routes";
import { depthRouter } from "./routes/depth.routes";
import { klinesRouter } from "./routes/klines.routes";

const app = express();
app.use(cors());
app.use(express.json());

// routes
app.use("api/v1/order", orderRouter);
app.use("api/v1/depth", depthRouter);
app.use("api/v1/tickers");
app.use("api/v1/klines", klinesRouter);
app.use("api/v1/trades");

app.listen(3000, () => {
  console.log("Server is running at port: 3000");
});
