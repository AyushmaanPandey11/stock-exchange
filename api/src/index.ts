import express from "express";
import cors from "cors";
import { orderRouter } from "./routes/order.routes";

const app = express();
app.use(cors());
app.use(express.json());

// routes
app.use("api/v1/order", orderRouter);
app.use("api/v1/depth");
app.use("api/v1/tickers");
app.use("api/v1/klines");
app.use("api/v1/trades");

app.listen(3000, () => {
  console.log("Server is running at port: 3000");
});
