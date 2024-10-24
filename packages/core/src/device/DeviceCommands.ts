import type { Transport, Messages, FailureType } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';
import TransportManager from '../data-manager/TransportManager';
import DataManager from '../data-manager/DataManager';
import { patchFeatures, getLogger, LoggerNames } from '../utils';
import type { Device } from './Device';
import { DEVICE } from '../events';

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
      HardwareErrorCode.ResponseUnexpectTypeError,
      `assertType: Response of unexpected type: ${res.type}. Should be ${resType as string}`
    );
  }
};

const Log = getLogger(LoggerNames.DeviceCommands);

export class DeviceCommands {
  device: Device;

  transport: Transport;

  mainId: string;

  disposed: boolean;

  callPromise?: Promise<DefaultMessageResponse>;

  _cancelableRequest?: (error?: any) => void;

  constructor(device: Device, mainId: string) {
    this.device = device;
    this.mainId = mainId;
    this.transport = TransportManager.getTransport();
    this.disposed = false;
  }

  async dispose(cancelRequest: boolean) {
    this.disposed = true;
    if (cancelRequest && this._cancelableRequest) {
      this._cancelableRequest();
    }
    this._cancelableRequest = undefined;
    await this.transport.cancel?.();
  }

  // Sends an async message to the opened device.
  async call(
    type: MessageKey,
    msg: DefaultMessageResponse['message'] = {}
  ): Promise<DefaultMessageResponse> {
    Log.debug('[DeviceCommands] [call] Sending', type);

    try {
      const promise = this.transport.call(this.mainId, type, msg) as any;
      this.callPromise = promise;
      const res = await promise;
      Log.debug('[DeviceCommands] [call] Received', res.type);
      console.log('[DeviceCommands] [call] Received', res.type);
      return res;
    } catch (error) {
      Log.debug('[DeviceCommands] [call] Received error', error);
      if (error.errorCode === HardwareErrorCode.BleDeviceBondError) {
        return {
          type: 'BleDeviceBondError',
          message: {
            error: error?.message,
          },
        } as any;
      }

      const responseData = error?.response?.data;
      let responseError = responseData?.error;
      if (!responseError && responseData && typeof responseData === 'string') {
        try {
          const parsedData = JSON.parse(responseData);
          responseError = parsedData?.error;
        } catch (error) {
          // ignore
        }
      }

      if (responseData) {
        Log.debug('error response', responseData);
      }
      if (responseError === 'device disconnected during action') {
        return { type: 'BridgeDeviceDisconnected', message: { error: responseError } } as any;
      }

      // undefined.indexOf('...') !== -1 Always true
      if (responseError && responseError.indexOf('Request failed with status code') !== -1) {
        return {
          type: 'CallMethodError',
          message: {
            error: responseData ?? '',
          },
        } as any;
      }
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
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'typedCall: DeviceCommands already disposed'
      );
    }

    const response = await this._commonCall(type, msg);
    try {
      assertType(response, resType);
    } catch (error) {
      // handle possible race condition
      // Bridge may have some unread message in buffer, read it
      // await this.transport.read?.(this.mainId);

      Log.debug('DeviceCommands typedcall error: ', error);

      // throw bridge network error
      if (error instanceof HardwareError) {
        if (error.errorCode === HardwareErrorCode.ResponseUnexpectTypeError) {
          // Do not intercept CallMethodError
          // Do not intercept “assertType: Response of unexpected type” error
          // Blocking the above two messages will not know what the specific error message is, and the specific error should be handled by the subsequent business logic.

          if (error.message.indexOf('BridgeNetworkError') > -1) {
            throw ERRORS.TypedError(HardwareErrorCode.BridgeNetworkError);
          }
          if (error.message.indexOf('BleDeviceBondError') > -1) {
            throw ERRORS.TypedError(HardwareErrorCode.BleDeviceBondError);
          }
          if (error.message.indexOf('BridgeDeviceDisconnected') > -1) {
            throw ERRORS.TypedError(HardwareErrorCode.BridgeDeviceDisconnected);
          }
        }
      } else {
        // throw error anyway, next call should be resolved properly// throw error anyway, next call should be resolved properly
        throw error;
      }
    }
    return response;
  }

  async _commonCall(type: MessageKey, msg?: DefaultMessageResponse['message']) {
    const resp = await this.call(type, msg);
    return this._filterCommonTypes(resp, type);
  }

  _filterCommonTypes(
    res: DefaultMessageResponse,
    callType: MessageKey
  ): Promise<DefaultMessageResponse> {
    try {
      if (DataManager.getSettings('env') === 'react-native') {
        Log.debug('_filterCommonTypes: ', JSON.stringify(res));
      } else {
        Log.debug('_filterCommonTypes: ', res);
      }
    } catch (error) {
      // ignore
    }

    if (res.type === 'Failure') {
      const { code, message } = res.message as {
        code?: string | FailureType;
        message?: string;
      };
      let error: HardwareError | null = null;
      // Model One does not send any message in firmware update
      if (code === 'Failure_FirmwareError' && !message) {
        error = ERRORS.TypedError(HardwareErrorCode.FirmwareError);
      }
      // Failure_ActionCancelled message could be also missing
      if (code === 'Failure_ActionCancelled') {
        error = ERRORS.TypedError(HardwareErrorCode.ActionCancelled);
      }

      if (code === 'Failure_PinInvalid') {
        error = ERRORS.TypedError(HardwareErrorCode.PinInvalid, message);
      }

      if (code === 'Failure_PinCancelled') {
        error = ERRORS.TypedError(HardwareErrorCode.PinCancelled);
      }

      if (code === 'Failure_DataError') {
        if (message === 'Please confirm the BlindSign enabled') {
          error = ERRORS.TypedError(HardwareErrorCode.BlindSignDisabled);
        }
        if (message === 'File already exists') {
          error = ERRORS.TypedError(HardwareErrorCode.FileAlreadyExists);
        }
        if (message?.includes('bytes overflow')) {
          error = ERRORS.TypedError(HardwareErrorCode.DataOverload);
        }
      }

      if (code === 'Failure_UnexpectedMessage') {
        if (callType === 'PassphraseAck') {
          error = ERRORS.TypedError(HardwareErrorCode.UnexpectPassphrase);
        }
        if (message === 'Not in Signing mode') {
          error = ERRORS.TypedError(HardwareErrorCode.NotInSigningMode);
        }
      }

      if (error) {
        return Promise.reject(error);
      }

      return Promise.reject(
        ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `${(code as any) || 'Failure_UnknownCode'},${message || 'Failure_UnknownMessage'}`
        )
      );
    }

    if (res.type === 'Features') {
      return Promise.resolve(patchFeatures(res));
    }

    if (res.type === 'ButtonRequest') {
      if (res.message.code === 'ButtonRequest_PassphraseEntry') {
        this.device.emit(DEVICE.PASSPHRASE_ON_DEVICE, this.device);
      } else {
        this.device.emit(DEVICE.BUTTON, this.device, res.message);
      }
      return this._commonCall('ButtonAck', {});
    }

    if (res.type === 'EntropyRequest') {
      // TODO: EntropyRequest
    }

    const isWebusbEnv = DataManager.getSettings('env') === 'webusb';

    if (res.type === 'PinMatrixRequest') {
      if (isWebusbEnv) {
        return Promise.reject(
          ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Please unlock your device')
        );
      }
      return this._promptPin(res.message.type).then(
        pin => {
          if (pin === '@@ONEKEY_INPUT_PIN_IN_DEVICE') {
            return this._commonCall('BixinPinInputOnDevice');
          }
          return this._commonCall('PinMatrixAck', { pin });
        },
        () => this._commonCall('Cancel', {})
      );
    }

    if (res.type === 'PassphraseRequest') {
      return this._promptPassphrase().then(response => {
        const { passphrase, passphraseOnDevice } = response;
        return !passphraseOnDevice
          ? this._commonCall('PassphraseAck', { passphrase })
          : this._commonCall('PassphraseAck', { on_device: true });
      });
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

  _promptPin(type?: Messages.PinMatrixRequestType) {
    return new Promise<string>((resolve, reject) => {
      if (this.device.listenerCount(DEVICE.PIN) > 0) {
        this._cancelableRequest = reject;
        this.device.emit(DEVICE.PIN, this.device, type, (err, pin) => {
          this._cancelableRequest = undefined;
          if (err) {
            reject(err);
          } else {
            resolve(pin);
          }
        });
      } else {
        console.warn('[DeviceCommands] [call] PIN callback not configured, cancelling request');
        reject(
          ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            '_promptPin: PIN callback not configured'
          )
        );
      }
    });
  }

  _promptPassphrase() {
    return new Promise<PassphrasePromptResponse>((resolve, reject) => {
      if (this.device.listenerCount(DEVICE.PASSPHRASE) > 0) {
        this._cancelableRequest = reject;
        this.device.emit(
          DEVICE.PASSPHRASE,
          this.device,
          (response: PassphrasePromptResponse, error?: Error) => {
            this._cancelableRequest = undefined;
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          }
        );
      } else {
        Log.error('[DeviceCommands] [call] Passphrase callback not configured, cancelling request');
        reject(
          ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            '_promptPassphrase: Passphrase callback not configured'
          )
        );
      }
    });
  }
}

export type TypedCall = DeviceCommands['typedCall'];
