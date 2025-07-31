import { Client } from "pg";
import { createClient } from "redis";
import { DbMessage } from "./types";

const pgClient = new Client({
  user: "user",
  host: "localhost",
  database: "my_db",
  password: "password123",
  port: 5432,
});

pgClient.connect();

const main = async () => {
  const redisClient = createClient();
  await redisClient.connect();
  console.log("db connected, ready to use");

  while (true) {
    const response = await redisClient.rPop("db_processor");
    if (!response) {
      continue;
    }

    try {
      const data: DbMessage = JSON.parse(response);

      if (data.type === "TRADE_ADDED") {
        console.log(`trade being added ${JSON.stringify(data)}`);
        const price = parseFloat(data.data.price);
        if (isNaN(price)) {
          console.error(`Invalid price for trade ${data.data.id}`);
          continue;
        }
        const timestamp = new Date(data.data.timestamp);
        const query = `INSERT INTO laddoo_price (id, time, price) VALUES ($1, $2, $3)`;
        const values = [data.data.id, timestamp, price];
        await pgClient.query(query, values);
      } else if (data.type === "ORDER_UPDATE") {
        console.log(`trade being updated ${JSON.stringify(data)}`);
        if (!data.data.price) {
          console.error(`Price missing for order update ${data.data.orderId}`);
          continue;
        }
        const price = parseFloat(data.data.price);
        if (isNaN(price)) {
          console.error(`Invalid price for order ${data.data.orderId}`);
          continue;
        }
        const orderId = data.data.orderId;
        const query = `UPDATE laddoo_price SET price = $1 WHERE id = $2`; // Fixed syntax
        const values = [price, orderId];
        await pgClient.query(query, values);
      }
    } catch (error) {
      console.error(`Error processing message: ${response}`, error);
    }
  }
};
