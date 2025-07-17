export const SUBSCRIBE = "SUBSCRIBE";
export const UNSUBSCRIBE = "UNSUBSCRIBE";

export type SubscribeMessage = {
  method: typeof SUBSCRIBE;
  params: [];
};

export type UnsubscribeMessage = {
  method: typeof UNSUBSCRIBE;
  params: [];
};

export type IncomingMessages = SubscribeMessage | UnsubscribeMessage;
