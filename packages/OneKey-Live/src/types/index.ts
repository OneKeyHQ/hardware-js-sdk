export type MessageType = 'Receive' | 'Send';

export type ISendMessage = {
  id?: number;
  payload: any;
  messageType: MessageType;
};

export type IReceiveMessage = {
  id?: number;
  success?: true | false;
  event: string;
  type: string;
  payload: any;
  messageType: MessageType;
};
