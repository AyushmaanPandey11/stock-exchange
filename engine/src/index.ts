import { createClient } from "redis";

const main = async () => {
  const redisClient = createClient();
  await redisClient.connect();
  while (true) {
    const messages = await redisClient.rPop("messages" as string);
    if (!messages) {
      continue;
    } else {
      console.log("incoming mssgs : ", JSON.parse(messages));
      // need to send message to engine for processsing
    }
  }
};

main();
