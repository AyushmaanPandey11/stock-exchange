import { createClient, RedisClientType } from "redis";
import { MessageToEngine } from "./types/types";
import { MessageFromOrderbook } from "./types/index";

export class RedisManager {
  private pubSubClient: RedisClientType;
  private queuePublisher: RedisClientType;
  private static instance: RedisManager;

  private constructor() {
    this.pubSubClient = createClient();
    this.pubSubClient.connect();
    this.queuePublisher = createClient();
    this.queuePublisher.connect();
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager();
    }
    return this.instance;
  }

  public sendAndAwait(message: MessageToEngine) {
    // async functions always returns a promise when then will be resolve and parsed
    return new Promise<MessageFromOrderbook>((resolve) => {
      // created randomId for recieving processed order coming from pubsub
      const id = this.getRandomClientId();
      // first the api server subscribes to the pubsub with a clientId and this request is sent to
      // the queue with the clientId which is used to get the process from pubsub from engine
      this.pubSubClient.subscribe(id, (message) => {
        this.pubSubClient.unsubscribe(id);
        resolve(JSON.parse(message));
      });
      // request is sent to the queue with the clientId
      this.queuePublisher.lPush(
        "messages",
        JSON.stringify({ clientId: id, message })
      );
    });
  }

  public getRandomClientId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
