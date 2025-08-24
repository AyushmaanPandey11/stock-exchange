import { WebSocket, WebSocketServer } from "ws";
import { UserManager } from "./UserManager";

const wss = new WebSocketServer({ port: 8080 });
console.log(`ws running at port : 8080`);

wss.on("connection", (ws: WebSocket) => {
  console.log("user connected");
  UserManager.getInstance().addUser(ws);
});
