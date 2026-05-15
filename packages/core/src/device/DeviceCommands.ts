import { ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';

import TransportManager from '../data-manager/TransportManager';
import DataManager from '../data-manager/DataManager';
import { LoggerNames, getDeviceType, getLogger, patchFeatures } from '../utils';
import { DEVICE, type PassphraseRequestPayload } from '../events';
import { DeviceModelToTypes } from '../types';
import {
  formatRequestContext,
  generateInstanceId,
  getActiveRequestsByDeviceInstance,
} from '../utils/tracing';

import type { Device } from './Device';
import type {
  FailureType,
  Messages,
  Transport,
  TransportCallOptions,
} from '@onekeyfe/hd-transport';

export type PassphrasePromptResponse = {
  passphrase?: string;
  passphraseOnDevice?: boolean;
  attachPinOnDevice?: boolean;
  cache?: boolean;
};

type MessageType = Messages.MessageType;
type MessageKey = Extract<keyof MessageType, string>;
export type TypedResponseMessage<T extends MessageKey> = {
  type: T;
  message: MessageType[T];
};
type TypedCallResponseMap = {
  [K in MessageKey]: TypedResponseMessage<K>;
};
export type DefaultMessageResponse = TypedCallResponseMap[keyof MessageType];

const MAX_DEBUG_ARRAY_ITEMS = 20;
const MAX_DEBUG_OBJECT_KEYS = 40;
const MAX_DEBUG_STRING_LENGTH = 512;
const MAX_DEBUG_DEPTH = 4;
const HIGH_VOLUME_DEBUG_CALLS = new Set([
  'FilesystemFileRead',
  'FilesystemFileWrite',
  'FileRead',
  'FileWrite',
  'EmmcFileRead',
  'EmmcFileWrite',
  'FirmwareUpload',
  'ResourceAck',
]);

function shouldReduceDebugForCall(type: string) {
  return HIGH_VOLUME_DEBUG_CALLS.has(type);
}

function getBinaryByteLength(value: unknown): number | undefined {
  if (value instanceof ArrayBuffer) {
    return value.byteLength;
  }

  if (ArrayBuffer.isView(value)) {
    return value.byteLength;
  }

  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return value.size;
  }

  return undefined;
}

function summarizeRedactedData(value: unknown): string {
  const byteLength = getBinaryByteLength(value);
  if (byteLength !== undefined) {
    return `[redacted data: ${byteLength} bytes]`;
  }

  if (typeof value === 'string') {
    return `[redacted data: string length=${value.length}]`;
  }

  if (Array.isArray(value)) {
    return `[redacted data: array length=${value.length}]`;
  }

  if (value && typeof value === 'object') {
    return `[redacted data: object keys=${Object.keys(value).length}]`;
  }

  return `[redacted data: ${typeof value}]`;
}

function sanitizeDebugPayload(value: unknown, key = '', depth = 0): unknown {
  if (key === 'data' && value !== null && value !== undefined) {
    return summarizeRedactedData(value);
  }

  const byteLength = getBinaryByteLength(value);
  if (byteLength !== undefined) {
    return `[binary: ${byteLength} bytes]`;
  }

  if (typeof value === 'string') {
    return value.length > MAX_DEBUG_STRING_LENGTH
      ? `${value.slice(0, MAX_DEBUG_STRING_LENGTH)}... (len=${value.length})`
      : value;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (depth >= MAX_DEBUG_DEPTH) {
    return Array.isArray(value)
      ? `[array length=${value.length}]`
      : `[object keys=${Object.keys(value).length}]`;
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_DEBUG_ARRAY_ITEMS)
      .map(item => sanitizeDebugPayload(item, key, depth + 1));
    if (value.length > MAX_DEBUG_ARRAY_ITEMS) {
      items.push(`... (${value.length - MAX_DEBUG_ARRAY_ITEMS} more)`);
    }
    return items;
  }

  const entries = Object.entries(value).slice(0, MAX_DEBUG_OBJECT_KEYS);
  const sanitized: Record<string, unknown> = {};
  entries.forEach(([entryKey, entryValue]) => {
    sanitized[entryKey] = sanitizeDebugPayload(entryValue, entryKey, depth + 1);
  });
  if (Object.keys(value).length > MAX_DEBUG_OBJECT_KEYS) {
    sanitized.__truncated__ = `${Object.keys(value).length - MAX_DEBUG_OBJECT_KEYS} more keys`;
  }
  return sanitized;
}

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
const LogCore = getLogger(LoggerNames.Core);

/**
 * The life cycle begins with the acquisition of the device and ends with the disposal device commands
 * acquire device -> create DeviceCommands -> release device -> dispose DeviceCommands
 */
export class DeviceCommands {
  instanceId: string;

  currentResponseID?: number;

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
    this.instanceId = generateInstanceId('DeviceCommands', device.sdkInstanceId);

    Log.debug(`[DeviceCommands] Created: ${this.instanceId}, device: ${this.device.instanceId}`);
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
    msg?: DefaultMessageResponse['message'],
    options?: TransportCallOptions
  ): Promise<DefaultMessageResponse> {
    const shouldReduceDebug = shouldReduceDebugForCall(type);
    if (!shouldReduceDebug) {
      Log.debug('[DeviceCommands] [call] Sending', type);
    }

    try {
      const promise = this.transport.call(this.mainId, type, msg ?? {}, options) as any;
      this.callPromise = promise;
      const res = await promise;
      if (res.type === 'Failure') {
        LogCore.debug('[DeviceCommands] [call] Received', res.type, res.message);
      } else if (!shouldReduceDebug) {
        LogCore.debug('[DeviceCommands] [call] Received', res.type);
      }
      return res;
    } catch (error) {
      LogCore.debug('[DeviceCommands] [call] Received error', error);
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
    msg?: MessageType[T],
    options?: TransportCallOptions
  ): Promise<TypedCallResponseMap[R[number]]>;

  typedCall<T extends MessageKey, R extends MessageKey>(
    type: T,
    resType: R,
    msg?: MessageType[T],
    options?: TransportCallOptions
  ): Promise<TypedResponseMessage<R>>;

  async typedCall(
    type: MessageKey,
    resType: MessageKey | MessageKey[],
    msg?: DefaultMessageResponse['message'],
    options?: TransportCallOptions
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
        'FilesystemFileRead',
        'FilesystemFileWrite',
        'FileRead',
        'FileWrite',
        'EmmcFileRead',
        'EmmcFileWrite',
        'FirmwareUpload',
        'ResourceAck',
      ] as any;
      if (!skipTypes.includes(type) && msg) {
        // Use debug channel to avoid noise escalation
        Log.debug('[DeviceCommands] [typedCall] Sending payload', type, sanitizeDebugPayload(msg));
      }
    } catch (e) {
      // ignore logging errors
    }

    const response = await this._commonCall(type, msg, options);
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
          Log.debug('[DeviceCommands] [typedCall] Unexpected response type', {
            request: type,
            expected: resType,
            received: response.type,
            response: sanitizeDebugPayload(response.message),
          });
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
          throw error;
        }
      } else {
        // throw error anyway, next call should be resolved properly// throw error anyway, next call should be resolved properly
        throw error;
      }
    }
    return response;
  }

  async _commonCall(
    type: MessageKey,
    msg?: DefaultMessageResponse['message'],
    options?: TransportCallOptions
  ) {
    const resp = await this.call(type, msg, options);
    return this._filterCommonTypes(resp, type, options);
  }

  _filterCommonTypes(
    res: DefaultMessageResponse,
    callType: MessageKey,
    options?: TransportCallOptions
  ): Promise<DefaultMessageResponse> {
    try {
      if (shouldReduceDebugForCall(callType)) {
        // 高频文件写入每个 chunk 都会经过这里，避免 debug log 反向拖慢传输。
      } else if (DataManager.getSettings('env') === 'react-native') {
        Log.debug('_filterCommonTypes: ', JSON.stringify(sanitizeDebugPayload(res)));
      } else {
        Log.debug('_filterCommonTypes: ', sanitizeDebugPayload(res));
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

      if (code === 'Failure_PinMismatch') {
        error = ERRORS.TypedError(HardwareErrorCode.PinMismatch, message);
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
        if (message?.includes('Too many inputs')) {
          const detailMatch = message.match(/\((.+?)\)/);
          error = ERRORS.TypedError(HardwareErrorCode.TooManyInputs, undefined, {
            count: detailMatch?.[1],
          });
        }
      }

      if (code === 'Failure_ProcessError') {
        // Handle firmware verification failures
        if (
          message?.includes('Bootloader file verify failed') ||
          message?.includes('verify failed')
        ) {
          error = ERRORS.TypedError(HardwareErrorCode.FirmwareVerificationFailed, message);
        } else if (message?.includes('Firmware downgrade not allowed')) {
          // Check firmware check failed
          error = ERRORS.TypedError(HardwareErrorCode.FirmwareDowngradeNotAllowed, message);
        }
      }

      if (code === 'Failure_UnexpectedMessage') {
        if (callType === 'PassphraseAck') {
          error = ERRORS.TypedError(HardwareErrorCode.UnexpectPassphrase);
        } else if (message === 'Not in Signing mode') {
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
          `${(code as any) || 'Failure_UnknownCode'},${message || 'no error message'}`
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
      return this._commonCall('ButtonAck', {}, options);
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
            return this._commonCall('BixinPinInputOnDevice', {}, options).finally(() => {
              this.device.clearCancelableAction();
            });
          }
          return this._commonCall('PinMatrixAck', { pin }, options);
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
          return this._commonCall('PassphraseAck', { on_device_attach_pin: true }, options);
        }

        return !passphraseOnDevice
          ? this._commonCall('PassphraseAck', { passphrase }, options)
          : this._commonCall('PassphraseAck', { on_device: true }, options);
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
              HardwareErrorCode.CallQueueActionCancelled,
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

      const listenerCount = this.device.listenerCount(DEVICE.PIN);

      Log.debug(`[${this.instanceId}] _promptPin called`, {
        responseID: this.currentResponseID,
        deviceInstanceId: this.device.instanceId,
        listenerCount,
      });

      if (listenerCount > 0) {
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
        const activeRequests = getActiveRequestsByDeviceInstance(this.device.instanceId);
        const errorInfo = {
          commandsInstanceId: this.instanceId,
          deviceInstanceId: this.device.instanceId,
          currentResponseID: this.currentResponseID,
          listenerCount,
          activeRequests: activeRequests.map(formatRequestContext),
        };

        LogCore.error('[DeviceCommands] [call] PIN callback not configured, cancelling request', {
          ...errorInfo,
        });
        reject(
          ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            `_promptPin: PIN callback not configured: ${JSON.stringify(errorInfo)}`
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
              HardwareErrorCode.CallQueueActionCancelled,
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
        LogCore.error(
          '[DeviceCommands] [call] Passphrase callback not configured, cancelling request'
        );
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
