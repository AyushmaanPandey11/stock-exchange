import { StreamData, WsSendMessageType } from "./types";

export const BASE_URL = "wss://ws.backpack.exchange/";
// export const BASE_URL = "ws://localhost:8080";

//Singleton concept of creating one instance of the class and using it all over the project
export class WsManager {
  private ws: WebSocket;
  private static instance: WsManager;
  // all the message are stored which are not sent during ws connection
  private bufferedMessages: WsSendMessageType[] = [];
  private id: number;
  // callback function which will be triggered when receives onmesage from wss
  private callbacks: {
    [K in keyof StreamData]: {
      callback: (data: StreamData[K]) => void;
      id: string;
    }[];
  };
  // to check if ws connection is established or not
  private isInitialized: boolean = false;

  private constructor() {
    this.ws = new WebSocket(BASE_URL);
    this.bufferedMessages = [];
    this.callbacks = {
      bookTicker: [],
      depth: [],
      trade: [],
    };
    this.id = 1;
    this.init();
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new WsManager();
    }
    return this.instance;
  }

  init() {
    this.ws.onopen = () => {
      this.isInitialized = true;
      // once connection is established first all the queued msgs are sent and reset the array
      this.bufferedMessages.forEach((msg) => {
        this.ws.send(JSON.stringify(msg));
      });
      this.bufferedMessages = [];
    };
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const stream = message.data?.e as keyof StreamData | undefined;

      if (!stream || !this.callbacks[stream]) return;

      switch (stream) {
        case "bookTicker":
          if (!message.data) return;
          const newTicker: StreamData["bookTicker"] = {
            lastPrice: message.data.b,
            high: message.data.h,
            low: message.data.l,
            volume: message.data.v,
            quoteVolume: message.data.V,
            symbol: message.data.s,
          };
          this.callbacks[stream].forEach(({ callback }) => {
            callback(newTicker);
          });
          break;

        case "depth":
          const body: StreamData["depth"] = {
            bids: message.data?.b || [],
            asks: message.data?.a || [],
          };
          this.callbacks[stream].forEach(({ callback }) => {
            callback(body);
          });
          break;

        case "trade":
          if (!message.data) return;
          const { t, q, p, m, T } = message.data;
          const newTrade: StreamData["trade"] = {
            id: t || "",
            isBuyerMaker: m ?? false,
            price: p ? p : "",
            quantity: q ? q : "",
            timestamp: T ?? 0,
          };
          this.callbacks[stream].forEach(({ callback }) => {
            callback(newTrade);
          });
          break;

        default:
          break;
      }
    };
  }
  sendMessage(msg: WsSendMessageType) {
    const messageBody = {
      ...msg,
      id: this.id++,
    };
    if (!this.isInitialized) {
      this.bufferedMessages.push(messageBody);
      return;
    }
    this.ws.send(JSON.stringify(messageBody));
  }
  // adding the callbacks to the class
  registerCallback<K extends keyof StreamData>(
    type: K,
    callback: (data: StreamData[K]) => void,
    id: string
  ) {
    this.callbacks[type] = this.callbacks[type] || [];
    this.callbacks[type].push({ callback, id });
  }
  // removing hte callbacks from the class
  deregisterCallback(type: keyof StreamData, id: string) {
    if (this.callbacks[type]) {
      const index = this.callbacks[type].findIndex((cb) => cb.id === id);
      if (index !== -1) {
        this.callbacks[type].splice(index, 1);
      }
    }
  }
}
