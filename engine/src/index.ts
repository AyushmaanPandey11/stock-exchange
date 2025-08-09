import { createClient } from "redis";
import { Engine } from "./trades/Engine";

const main = async () => {
  const engine = new Engine();
  const redisClient = createClient();
  await redisClient.connect();
  if (engine && redisClient) {
    console.log(`engine and ws are working`);
  }
  while (true) {
    const messages = await redisClient.rPop("messages" as string);
    if (!messages) {
      continue;
    } else {
      console.log("incoming mssgs : ", JSON.parse(messages));
      // need to send message to engine for processsing
      engine.process(JSON.parse(messages));
    }
  }
};

main();
