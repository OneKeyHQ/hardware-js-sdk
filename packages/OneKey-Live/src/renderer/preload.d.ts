import { HardwareChannel } from 'main/preload';
import { IReceiveMessage, ISendMessage } from 'types';

declare global {
  interface Window {
    hardwareSDK: {
      ipcRenderer: {
        sendMessage(channel: HardwareChannel, message: ISendMessage): void;
        on(channel: string, func: (message: ISendMessage) => void): (() => void) | undefined;
        once(channel: string, func: (...args: unknown[]) => void): void;
        invoke(channel: HardwareChannel, message: IReceiveMessage): void;
      };
    };
  }
}

export {};
