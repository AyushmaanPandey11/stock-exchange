import { Client } from "pg";
import { createClient } from "redis";
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
  console.log("db connected, ready to user");

  while (true) {
    const response = await redisClient.rPop("db_processor" as string);
    if (!response) {
      continue;
    } else {
    }
  }
};
