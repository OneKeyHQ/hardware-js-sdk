import type { Transport, Messages } from '@onekeyfe/hd-transport';
import TransportManager from '../data-manager/TransportManager';
import { ERRORS } from '../constants';
import { Device } from './Device';

type MessageType = Messages.MessageType;
type MessageKey = keyof MessageType;
export type TypedResponseMessage<T extends MessageKey> = {
  type: T;
  message: MessageType[T];
};
type TypedCallResponseMap = {
  [K in keyof MessageType]: TypedResponseMessage<K>;
};
export type DefaultMessageResponse = TypedCallResponseMap[keyof MessageType];

export type PassphrasePromptResponse = {
  passphrase?: string;
  passphraseOnDevice?: boolean;
  cache?: boolean;
};

const assertType = (res: DefaultMessageResponse, resType: string | string[]) => {
  const splitResTypes = Array.isArray(resType) ? resType : resType.split('|');
  if (!splitResTypes.includes(res.type)) {
    throw ERRORS.TypedError(
      'Runtime',
      `assertType: Response of unexpected type: ${res.type}. Should be ${resType as string}`
    );
  }
};

export class DeviceCommands {
  device: Device;

  transport: Transport;

  sessionId: string;

  disposed: boolean;

  callPromise?: Promise<DefaultMessageResponse>;

  constructor(device: Device, sessionId: string) {
    this.device = device;
    this.sessionId = sessionId;
    this.transport = TransportManager.getTransport();
    this.disposed = false;
  }

  // Sends an async message to the opened device.
  async call(
    type: MessageKey,
    msg: DefaultMessageResponse['message'] = {}
  ): Promise<DefaultMessageResponse> {
    console.log('[DeviceCommands] [call] Sending', type, this.transport);

    try {
      const promise = this.transport.call(this.sessionId, type, msg, false) as any;
      this.callPromise = promise;
      const res = await promise;
      this.callPromise = promise;
      console.log('[DeviceCommands] [call] Received', res.type);
      return res;
    } catch (error) {
      console.warn('[DeviceCommands] [call] Received error', error);
      throw error;
    }
  }

  typedCall<T extends MessageKey, R extends MessageKey[]>(
    type: T,
    resType: R,
    msg?: MessageType[T]
  ): Promise<TypedCallResponseMap[R[number]]>;

  typedCall<T extends MessageKey, R extends MessageKey>(
    type: T,
    resType: R,
    msg?: MessageType[T]
  ): Promise<TypedResponseMessage<R>>;

  async typedCall(
    type: MessageKey,
    resType: MessageKey | MessageKey[],
    msg?: DefaultMessageResponse['message']
  ) {
    if (this.disposed) {
      throw ERRORS.TypedError('Runtime', 'typedCall: DeviceCommands already disposed');
    }

    const response = await this._commonCall(type, msg);
    try {
      assertType(response, resType);
    } catch (error) {
      // handle possible race condition
      // Bridge may have some unread message in buffer, read it
      await this.transport.read(this.sessionId, false);
      // throw error anyway, next call should be resolved properly
      throw error;
    }
    return response;
  }

  async _commonCall(type: MessageKey, msg?: DefaultMessageResponse['message']) {
    const resp = await this.call(type, msg);
    return this._filterCommonTypes(resp);
  }

  // @ts-ignore
  // eslint-disable-next-line class-methods-use-this
  _filterCommonTypes(res: DefaultMessageResponse): Promise<DefaultMessageResponse> {
    console.log(res);
  }
}
