import { init } from './init';
import { on, off, removeAllListeners } from './event';

export interface CoreApi {
  init: typeof init;
  on: typeof on;
  off: typeof off;
  removeAllListeners: typeof removeAllListeners;
  call: (params: any) => Promise<any>;
  dispose: () => void;
}
