import type { Transport, Messages, FailureType } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';
import TransportManager from '../data-manager/TransportManager';
import DataManager from '../data-manager/DataManager';
import { patchFeatures, getLogger, LoggerNames, getDeviceType } from '../utils';
import type { Device } from './Device';
import { DEVICE, type PassphraseRequestPayload } from '../events';
import { DeviceModelToTypes } from '../types';

export type PassphrasePromptResponse = {
  passphrase?: string;
  passphraseOnDevice?: boolean;
  attachPinOnDevice?: boolean;
  cache?: boolean;
};

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

const assertType = (res: DefaultMessageResponse, resType: string | string[]) => {
  const splitResTypes = Array.isArray(resType) ? resType : resType.split('|');
  if (!splitResTypes.includes(res.type)) {
    throw ERRORS.TypedError(
      HardwareErrorCode.ResponseUnexpectTypeError,
      `assertType: Response of unexpected type: ${res.type}. Should be ${resType as string}`
    );
  }
};

export const cancelDeviceInPrompt = (device: Device, expectResponse = true) => {
  const session = device.hasDeviceAcquire() ? device.mainId : undefined;

  if (!session) {
    // device disconnected or acquired by someone else
    return Promise.resolve({
      success: false,
      error: HardwareErrorCode.RuntimeError,
      payload: {
        message: 'Device disconnected or acquired by someone else',
      },
    } as const);
  }

  const transport = device.commands?.transport;

  if (expectResponse) {
    return transport
      ?.call(session, 'Cancel', {})
      .then(() => ({
        success: true,
        error: null,
        payload: {
          message: 'Cancel request sent',
        },
      }))
      .catch((error: HardwareError) => ({
        success: false,
        error: error.errorCode,
        payload: {
          message: error.message,
        },
      }));
  }

  return transport?.post(session, 'Cancel', {}).then(() => ({
    success: true,
    error: HardwareErrorCode.RuntimeError,
    payload: {
      message: 'Cancel request sent',
    },
  }));
};

export const cancelDeviceWithInitialize = (device: Device) => {
  const session = device.hasDeviceAcquire() ? device.mainId : undefined;

  if (!session) {
    // device disconnected or acquired by someone else
    return Promise.resolve({
      success: false,
      error: HardwareErrorCode.RuntimeError,
      payload: {
        message: 'Device disconnected or acquired by someone else',
      },
    } as const);
  }

  const transport = device.commands?.transport;

  return transport
    ?.call(session, 'Initialize', {})
    .then(() => ({
      success: true,
      error: null,
      payload: {
        message: 'Cancel request sent',
      },
    }))
    .catch((error: HardwareError) => ({
      success: false,
      error: error.errorCode,
      payload: {
        message: error.message,
      },
    }));
};

const Log = getLogger(LoggerNames.DeviceCommands);

/**
 * The life cycle begins with the acquisition of the device and ends with the disposal device commands
 * acquire device -> create DeviceCommands -> release device -> dispose DeviceCommands
 */
export class DeviceCommands {
  device: Device;

  transport: Transport;

  mainId: string;

  disposed: boolean;

  callPromise?: Promise<DefaultMessageResponse>;

  constructor(device: Device, mainId: string) {
    this.device = device;
    this.mainId = mainId;
    this.transport = TransportManager.getTransport();
    this.disposed = false;
  }

  async dispose(_cancelRequest: boolean) {
    this.disposed = true;
    await this.transport.cancel?.();
  }

  checkDisposed() {
    if (this.disposed) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'DeviceCommands already disposed');
    }
  }

  // on device input pin or passphrase, cancel the request with initialize
  async cancelDeviceOnOneKeyDevice() {
    const { name } = this.transport;
    if (name === 'HttpTransport') {
      /**
       * Bridge throws "other call in progress" error.
       * as workaround takeover transportSession (acquire) before sending Cancel, this will resolve previous pending call.
       */
      try {
        await this.device.acquire();
        await cancelDeviceWithInitialize(this.device);
      } catch {
        // ignore whatever happens
      }
    } else {
      return cancelDeviceWithInitialize(this.device);
    }
  }

  async cancelDevice() {
    const { name } = this.transport;
    if (name === 'HttpTransport') {
      /**
       * Bridge throws "other call in progress" error.
       * as workaround takeover transportSession (acquire) before sending Cancel, this will resolve previous pending call.
       */
      try {
        await this.device.acquire();
        await cancelDeviceInPrompt(this.device, false);
      } catch {
        // ignore whatever happens
      }
    } else {
      return cancelDeviceInPrompt(this.device, false);
    }
  }

  async cancel() {
    if (this.disposed) {
      return;
    }
    this.dispose(true);
    if (this.callPromise) {
      try {
        await Promise.all([
          new Promise((_resolve, reject) =>
            // eslint-disable-next-line no-promise-executor-return
            setTimeout(() => reject(new Error('cancel timeout')), 10 * 1000)
          ),
          await this.callPromise,
        ]);
      } catch {
        // device error
        this.callPromise = undefined;
      }
    }
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

    // Structured log of actual outgoing payloads (skip acks)
    try {
      const skipTypes: MessageKey[] = [
        'ButtonAck',
        'PinMatrixAck',
        'PassphraseAck',
        'Cancel',
        'BixinPinInputOnDevice',
      ] as any;
      if (!skipTypes.includes(type) && msg) {
        // Use debug channel to avoid noise escalation
        Log.debug('[DeviceCommands] [typedCall] Sending payload', type, msg);
      }
    } catch (e) {
      // ignore logging errors
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
          throw ERRORS.TypedError(HardwareErrorCode.ResponseUnexpectTypeError);
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

    this.device.clearCancelableAction();
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
      const deviceType = getDeviceType(this.device.features);
      if (DeviceModelToTypes.model_mini.includes(deviceType)) {
        this.device.setCancelableAction(() => this.cancelDeviceOnOneKeyDevice());
      } else {
        this.device.setCancelableAction(() => this.cancelDevice());
      }
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

    if (res.type === 'PinMatrixRequest') {
      return this._promptPin(res.message.type).then(
        pin => {
          if (pin === '@@ONEKEY_INPUT_PIN_IN_DEVICE') {
            // only classic\1s\mini\pure
            this.device.setCancelableAction(() => this.cancelDeviceOnOneKeyDevice());
            return this._commonCall('BixinPinInputOnDevice').finally(() => {
              this.device.clearCancelableAction();
            });
          }
          return this._commonCall('PinMatrixAck', { pin });
        },
        error => Promise.reject(error)
      );
    }

    if (res.type === 'PassphraseRequest') {
      const existsAttachPinUser = res.message.exists_attach_pin_user;
      return this._promptPassphrase({
        existsAttachPinUser,
      }).then(response => {
        const { passphrase, passphraseOnDevice, attachPinOnDevice } = response;

        // Attach PIN on device
        if (attachPinOnDevice && existsAttachPinUser) {
          return this._commonCall('PassphraseAck', { on_device_attach_pin: true });
        }

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
      const cancelAndReject = (_error?: Error) =>
        cancelDeviceInPrompt(this.device, false)
          .then(onCancel => {
            const error = ERRORS.TypedError(
              HardwareErrorCode.ActionCancelled,
              `${DEVICE.PIN} canceled`
            );
            // onCancel not void
            if (onCancel) {
              const { payload } = onCancel || {};
              reject(error || new Error(payload?.message));
            } else {
              reject(error);
            }
          })
          .catch(error => {
            reject(error);
          });

      if (this.device.listenerCount(DEVICE.PIN) > 0) {
        this.device.setCancelableAction(cancelAndReject);
        this.device.emit(DEVICE.PIN, this.device, type, (err, pin) => {
          this.device.clearCancelableAction();
          if (err) {
            cancelAndReject(err);
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

  _promptPassphrase(options: PassphraseRequestPayload) {
    return new Promise<PassphrasePromptResponse>((resolve, reject) => {
      const cancelAndReject = (_error?: Error) =>
        cancelDeviceInPrompt(this.device, false)
          .then(onCancel => {
            const error = ERRORS.TypedError(
              HardwareErrorCode.ActionCancelled,
              `${DEVICE.PASSPHRASE} canceled`
            );
            // onCancel not void
            if (onCancel) {
              const { payload } = onCancel || {};
              reject(error || new Error(payload?.message));
            } else {
              reject(error);
            }
          })
          .catch(error => {
            reject(error);
          });

      if (this.device.listenerCount(DEVICE.PASSPHRASE) > 0) {
        this.device.setCancelableAction(cancelAndReject);
        this.device.emit(
          DEVICE.PASSPHRASE,
          this.device,
          options,
          (response: PassphrasePromptResponse, error?: Error) => {
            this.device.clearCancelableAction();
            if (error) {
              cancelAndReject(error);
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
