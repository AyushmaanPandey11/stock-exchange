import { WebSocket } from "ws";
import { User } from "./User";
import { UserSubscriptionManager } from "./UserSubcriptionManager";

export class UserManager {
  private static instance: UserManager;
  private users: Map<string, User>;

  private constructor() {
    this.users = new Map();
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new UserManager();
    }
    return this.instance;
  }

  getRandomId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  public addUser(ws: WebSocket) {
    const id = this.getRandomId();
    const newUser = new User(id, ws);
    this.users.set(id, newUser);
    this.deregisterUserOnClose(id, ws);
    return newUser;
  }

  private deregisterUserOnClose(id: string, ws: WebSocket) {
    ws.on("close", () => {
      this.users.delete(id);
      UserSubscriptionManager.getInstance().userLeft(id);
    });
  }
  public getUser(id: string) {
    return this.users.get(id);
  }
}
