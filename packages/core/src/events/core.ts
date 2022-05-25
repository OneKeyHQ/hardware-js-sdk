export const CORE_EVENT = 'CORE_EVENT';

export type CoreMessage = {
  channel: string;
  direction: string;
  frameName: string;
  payload: any;
};

export type PostMessageEvent = MessageEvent<CoreMessage>;
