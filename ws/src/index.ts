import { WebSocket, WebSocketServer } from "ws";
import { UserManager } from "./UserManager";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws: WebSocket) => {
  console.log("user connected", ws);
  UserManager.getInstance().addUser(ws);
});
