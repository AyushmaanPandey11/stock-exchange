import { createClient, RedisClientType } from "redis";
import { DbMessage } from "./types/db";
import { WsMessage } from "./types/toWs";

export class RedisManager {
  private client: RedisClientType;
  private static instance: RedisManager;

  constructor() {
    this.client = createClient();
    this.client.connect();
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new RedisManager();
    }
    return this.instance;
  }

  public sendToApi(clientId: string, message: any) {
    this.client.publish(clientId, JSON.stringify(message));
  }

  public publishWsMessage(channel: string, message: WsMessage) {
    this.client.publish(channel, JSON.stringify(message));
  }

  public publishDbMessage(message: DbMessage) {
    this.client.lPush("db_processor", JSON.stringify(message));
  }
}
