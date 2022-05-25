export const CORE_EVENT = 'CORE_EVENT';

export type CoreMessage = {
  type: string; // type is used before the bridge is created
  channel: string;
  direction: string;
  frameName: string;
  payload: any;
};

export type PostMessageEvent = MessageEvent<CoreMessage>;
