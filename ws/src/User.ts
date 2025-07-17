import { WebSocket } from "ws";

export class User {
  private id: string;
  private ws: WebSocket;
  private subscriptions: string[] = [];

  constructor(id: string, ws: WebSocket) {
    this.id = id;
    this.ws = ws;
  }

  private addSubscriptions(subcription: string) {
    this.subscriptions.push(subcription);
  }

  private removeSubcriptions(subcription: string) {
    this.subscriptions.filter((sub) => sub !== subcription);
  }

  private addUserEventListener(ws: WebSocket) {}
}
