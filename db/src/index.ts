import { Client } from "pg";
import { createClient } from "redis";
import { DbMessage } from "./types";

const pgClient = new Client({
  user: "user",
  host: "localhost",
  database: "my_db",
  password: "password123",
  port: 5433,
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
        const volume = parseFloat(data.data.quantity);
        if (isNaN(price)) {
          console.error(`Invalid price for trade ${data.data.id}`);
          continue;
        }
        const timestamp = new Date(data.data.timestamp);
        const isBuyerMaker: boolean = data.data.isBuyerMaker;
        const query = `INSERT INTO laddoo_prices(order_id, time, price, volume,is_buyer_maker) VALUES ($1, $2, $3, $4, $5)`;
        const values = [data.data.id, timestamp, price, volume, isBuyerMaker];
        await pgClient.query(query, values);
      }
    } catch (error) {
      console.error(`Error processing message: ${response}`, error);
    }
  }
};

main();
