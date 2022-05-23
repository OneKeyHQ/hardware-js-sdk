import type { Transport, Messages } from '@onekeyfe/hd-transport';
import TransportManager from '../data-manager/TransportManager';
import { ERRORS } from '../constants';
import { initLog } from '../utils';
import type { Device } from './Device';

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

const Log = initLog('DeviceCommands');

export class DeviceCommands {
  device: Device;

  transport: Transport;

  sessionId: string;

  disposed: boolean;

  callPromise?: Promise<DefaultMessageResponse>;

  _cancelableRequest?: (error?: any) => void;

  constructor(device: Device, sessionId: string) {
    this.device = device;
    this.sessionId = sessionId;
    this.transport = TransportManager.getTransport();
    this.disposed = false;
  }

  dispose() {
    this.disposed = true;
    this._cancelableRequest = undefined;
  }

  // Sends an async message to the opened device.
  async call(
    type: MessageKey,
    msg: DefaultMessageResponse['message'] = {}
  ): Promise<DefaultMessageResponse> {
    console.log('[DeviceCommands] [call] Sending', type, this.transport);

    try {
      const promise = this.transport.call(this.sessionId, type, msg) as any;
      this.callPromise = promise;
      const res = await promise;
      Log.debug('[DeviceCommands] [call] Received', res.type);
      return res;
    } catch (error) {
      Log.debug('[DeviceCommands] [call] Received error', error);
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
      await this.transport.read(this.sessionId);
      // throw error anyway, next call should be resolved properly
      throw error;
    }
    return response;
  }

  async _commonCall(type: MessageKey, msg?: DefaultMessageResponse['message']) {
    const resp = await this.call(type, msg);
    return this._filterCommonTypes(resp);
  }

  // eslint-disable-next-line class-methods-use-this
  _filterCommonTypes(res: DefaultMessageResponse): Promise<DefaultMessageResponse> {
    if (res.type === 'Failure') {
      const { code } = res.message;
      let { message } = res.message;
      // Model One does not send any message in firmware update
      if (code === 'Failure_FirmwareError' && !message) {
        message = 'Firmware installation failed';
      }
      // Failure_ActionCancelled message could be also missing
      if (code === 'Failure_ActionCancelled' && !message) {
        message = 'Action cancelled by user';
      }
      // pass code and message from firmware error
      return Promise.reject(
        new ERRORS.OnekeyError(
          (code as any) || 'Failure_UnknownCode',
          message || 'Failure_UnknownMessage'
        )
      );
    }

    if (res.type === 'Features') {
      return Promise.resolve(res);
    }

    if (res.type === 'ButtonRequest') {
      // TODO: ButtonRequest
    }

    if (res.type === 'EntropyRequest') {
      // TODO: EntropyRequest
    }

    if (res.type === 'PinMatrixRequest') {
      // TODO: PinMatrixRequest
    }

    if (res.type === 'PassphraseRequest') {
      // TODO: PassphraseRequest
    }

    // TT fw lower than 2.3.0, device send his current state
    // new passphrase design set this value from `features.session_id`
    if (res.type === 'Deprecated_PassphraseStateRequest') {
      // TODO: Deprecated_PassphraseStateRequest
    }

    if (res.type === 'WordRequest') {
      // TODO: WordRequest
    }
    return Promise.resolve(res);
  }
}
