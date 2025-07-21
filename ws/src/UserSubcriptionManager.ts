import { createClient, RedisClientType } from "redis";
import { UserManager } from "./UserManager";

export class UserSubscriptionManager {
  private static instance: UserSubscriptionManager;
  // user -> subscriptions[] map
  private userSubscriptions: Map<string, string[]> = new Map();
  // subscription -> subscribedUsers[]
  private subscriptionToUsers: Map<string, string[]> = new Map();
  private redisClient: RedisClientType;

  private constructor() {
    this.redisClient = createClient();
    this.redisClient.connect();
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new UserSubscriptionManager();
    }
    return this.instance;
  }

  private redisCallbackForIncomingMsgs(message: string, channel: string) {
    const parsedMessage = JSON.parse(message);
    this.subscriptionToUsers
      .get(channel)
      ?.forEach((user) =>
        UserManager.getInstance().getUser(user)?.streamMsgsToUser(parsedMessage)
      );
  }

  public subscribe(userId: string, subscription: string) {
    if (this.userSubscriptions.get(userId)?.includes(subscription)) {
      return;
    }
    this.userSubscriptions.set(
      userId,
      (this.userSubscriptions.get(userId) || []).concat(subscription)
    );
    this.subscriptionToUsers.set(
      subscription,
      (this.subscriptionToUsers.get(subscription) || []).concat(userId)
    );
    if (this.subscriptionToUsers.get(subscription)?.length === 1) {
      this.redisClient.subscribe(
        subscription,
        this.redisCallbackForIncomingMsgs
      );
    }
  }

  public unsubscribe(userId: string, subscription: string) {
    const subscriptionsofAUser = this.userSubscriptions.get(userId);
    if (subscriptionsofAUser) {
      this.userSubscriptions.set(
        userId,
        subscriptionsofAUser.filter((sub) => sub !== subscription)
      );
    }

    const reverseSubscriptions = this.subscriptionToUsers.get(subscription);
    if (reverseSubscriptions) {
      this.subscriptionToUsers.set(
        subscription,
        reverseSubscriptions.filter((user) => user !== userId)
      );
      if (this.subscriptionToUsers.get(subscription)?.length === 0) {
        this.redisClient.unsubscribe(subscription);
      }
    }
  }

  public userLeft(userId: string) {
    this.userSubscriptions
      .get(userId)
      ?.forEach((sub) => this.unsubscribe(userId, sub));
  }

  public getSubscriptions(userId: string) {
    return this.userSubscriptions.get(userId) || [];
  }
}
