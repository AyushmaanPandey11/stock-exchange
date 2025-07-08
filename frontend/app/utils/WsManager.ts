import { Ticker } from "./types";

export const BASE_URL = "wss://ws.backpack.exchange/";

//Singleton concept of creating one instance of the class and using it all over the project
export class WsManager {
  private ws: WebSocket;
  private static instance: WsManager;
  // all the message are stored which are not sent during ws connection
  private bufferedMessages: any[] = [];
  private id: number;
  // callback function which will be triggered when receives onmesage from wss
  private callbacks: { [type: string]: any[] } = {};
  // to check if ws connection is established or not
  private isInitialized: boolean = false;

  private constructor() {
    this.ws = new WebSocket(BASE_URL);
    this.bufferedMessages = [];
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
      const stream = message.data?.e;
      if (this.callbacks[stream]) {
        this.callbacks[stream].forEach(({ callback }) => {
          if (stream === "bookTicker") {
            const newTicker: Partial<Ticker> = {
              lastPrice: message.data.b,
              high: message.data.h,
              low: message.data.l,
              volume: message.data.v,
              quoteVolume: message.data.V,
              symbol: message.data.s,
            };
            callback(newTicker);
          } else if (stream === "depth") {
            const body = {
              bids: message.data?.b || [],
              asks: message.data?.a || [],
            };
            callback(body);
          }
        });
      }
    };
  }
  sendMessage(msg: any) {
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
  registerCallback(type: string, callback: any, id: string) {
    this.callbacks[type] = this.callbacks[type] || [];
    this.callbacks[type].push({ callback, id });
  }
  // removing hte callbacks from the class
  deregisterCallback(type: string, id: string) {
    if (this.callbacks[type]) {
      const index = this.callbacks[type].findIndex((cb) => cb.id === id);
      if (index !== -1) {
        this.callbacks[type].splice(index, 1);
      }
    }
  }
}
