import { WebSocket } from "ws";
import { OutgoingMessage } from "./types/OutgoingMsgs";
import { IncomingMessages } from "./types/IncomingMsgs";
import { UserSubscriptionManager } from "./UserSubcriptionManager";

export class User {
  private id: string;
  private ws: WebSocket;
  private subscriptions: string[] = [];

  constructor(id: string, wsUser: WebSocket) {
    this.id = id;
    this.ws = wsUser;
    this.addUserEventListener();
  }

  public addSubscriptions(subcription: string) {
    this.subscriptions.push(subcription);
  }

  public removeSubcriptions(subcription: string) {
    this.subscriptions.filter((sub) => sub !== subcription);
  }

  public streamMsgsToUser(message: OutgoingMessage) {
    this.ws.send(JSON.stringify(message));
  }

  private addUserEventListener() {
    this.ws.on("message", (message: string) => {
      const parsedMessage: IncomingMessages = JSON.parse(message);
      if (parsedMessage.method === "SUBSCRIBE") {
        parsedMessage.params.forEach((param) =>
          UserSubscriptionManager.getInstance().subscribe(this.id, param)
        );
      }
      if (parsedMessage.method === "UNSUBSCRIBE") {
        parsedMessage.params.forEach((param) =>
          UserSubscriptionManager.getInstance().unsubscribe(this.id, param)
        );
      }
    });
  }
}
