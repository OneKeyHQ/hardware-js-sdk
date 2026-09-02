import { ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';
import {
  DeviceErrorCode,
  DeviceSessionErrorCode,
  type FailureType,
  type Messages,
  type Transport,
  type TransportCallOptions,
  getSafeTransportLogPayload,
  isProtocolV2LinkDisabledFailure,
} from '@onekeyfe/hd-transport';

import TransportManager from '../data-manager/TransportManager';
import { LoggerNames, getLogger, patchFeatures } from '../utils';
import { DEVICE, type PassphraseRequestPayload } from '../events';
import { DeviceModelToTypes } from '../types';
import {
  formatRequestContext,
  generateInstanceId,
  getActiveRequestsByDeviceInstance,
} from '../utils/tracing';

import type { Device } from './Device';

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
export type DefaultMessageResponse = TypedCallResponseMap[MessageKey];

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
const DEVICE_SESSION_CALLS = new Set([
  'DeviceSessionGet',
  'DeviceSessionAskPin',
  'DeviceSessionAskPassphrase',
]);
const DEVICE_CONTROL_CALLS = new Set([
  'DeviceReboot',
  'DeviceSettingsGet',
  'DeviceSettingsSet',
  'DeviceSettingsPageShow',
  'DeviceCertificateWrite',
  'DeviceCertificateRead',
  'DeviceCertificateSign',
  'DeviceMiscUsbMscControl',
]);

// Older Protocol V2 firmware may omit the cancellation subcode, so retain a
// narrow message fallback for compatibility.
const isProtocolV2ActionCancelledMessage = (message: string) =>
  /^(?:cancel(?:led|ed)(?: on device)?|confirm dismissed|update cancel(?:led|ed)|user cancel(?:led|ed)(?:\s+.*)?)$/i.test(
    message
  );

function shouldReduceDebugForCall(type: string) {
  return HIGH_VOLUME_DEBUG_CALLS.has(type);
}

/**
 * Interactive acknowledgements must not inherit timeoutMs from the original call.
 * User confirmation and PIN/passphrase entry have unbounded think time. Preserve only
 * response-related options such as expectedTypes and intermediateTypes.
 */
const stripInteractiveAckTimeout = (
  options?: TransportCallOptions
): TransportCallOptions | undefined => {
  if (!options) return options;
  const { timeoutMs: _timeoutMs, ...rest } = options;
  return rest;
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
    const activeCall = this.callPromise;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const cancellation = (async () => {
      await this.dispose(true);
      await activeCall?.catch(() => undefined);
    })();

    try {
      await Promise.race([
        cancellation,
        new Promise<void>(resolve => {
          timer = setTimeout(() => {
            timedOut = true;
            resolve();
          }, 10 * 1000);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
      if (
        timedOut &&
        this.transport.name === 'ReactNativeBleTransport' &&
        this.transport.disconnect
      ) {
        await this.transport.disconnect(this.mainId).catch(error => {
          Log.debug('BLE cancellation timeout disconnect error (ignored)', error);
        });
      }
      if (this.callPromise === activeCall) {
        this.callPromise = undefined;
      }
      // The cancellation work may finish after the bounded wait.
      cancellation.catch(() => undefined);
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
      Log.debug(
        '[DeviceCommands] [call] Sending',
        type,
        getSafeTransportLogPayload(msg ?? {}, type)
      );
    }

    try {
      const promise = this.transport.call(this.mainId, type, msg ?? {}, options) as any;
      this.callPromise = promise;
      const res = await promise;
      return res;
    } catch (error) {
      LogCore.debug('[DeviceCommands] [call] Received error', {
        request: type,
        errorCode: error?.errorCode,
        response: getSafeTransportLogPayload(error?.response?.data, type),
      });
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

    const expectedTypes = Array.isArray(resType) ? resType : resType.split('|');
    const response = await this._commonCall(type, msg, {
      ...options,
      expectedTypes: options?.expectedTypes ?? expectedTypes,
    });
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
      if (!shouldReduceDebugForCall(callType)) {
        Log.debug('_filterCommonTypes: ', {
          request: callType,
          response: {
            type: res.type,
            message: getSafeTransportLogPayload(res.message, res.type),
          },
        });
      }
    } catch (error) {
      // ignore
    }

    this.device.clearCancelableAction();
    if (res.type === 'Failure') {
      const { code, subcode, message } = res.message as {
        code?: string | FailureType;
        subcode?: number;
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
        if (message === 'File already exists' || message === 'NFT already exists') {
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

      if (isProtocolV2LinkDisabledFailure(code, message)) {
        error = ERRORS.TypedError(HardwareErrorCode.BleUnavailableWhileUsbConnected, undefined, {
          failureCode: code,
          firmwareMessage: message,
        });
      } else if (code === 'Failure_ProcessError') {
        const normalizedMessage = message?.trim() ?? '';
        const isProtocolV2ActionCancelledFailure =
          this.device.isProtocolV2() && isProtocolV2ActionCancelledMessage(normalizedMessage);
        const isProtocolV2DeviceBusyFailure =
          this.device.isProtocolV2() &&
          DEVICE_CONTROL_CALLS.has(callType) &&
          subcode === DeviceErrorCode.DeviceError_Busy;
        const isLegacyProtocolV2LockedFailure =
          this.device.isProtocolV2() && /^device (?:is )?locked$/i.test(normalizedMessage);
        if (
          DEVICE_SESSION_CALLS.has(callType) &&
          subcode === DeviceSessionErrorCode.DeviceSessionError_InvalidSession
        ) {
          error = ERRORS.TypedError(HardwareErrorCode.WalletSessionInvalid, message, {
            failureCode: code,
            subcode,
            firmwareMessage: message,
          });
        } else if (
          DEVICE_SESSION_CALLS.has(callType) &&
          subcode === DeviceSessionErrorCode.DeviceSessionError_UserCancelled
        ) {
          error = ERRORS.TypedError(HardwareErrorCode.ActionCancelled, message, {
            failureCode: code,
            subcode,
            firmwareMessage: message,
          });
        } else if (
          DEVICE_SESSION_CALLS.has(callType) &&
          subcode === DeviceSessionErrorCode.DeviceSessionError_AttachPinUnavailable
        ) {
          error = ERRORS.TypedError(HardwareErrorCode.DeviceCheckUnlockTypeError, message, {
            failureCode: code,
            subcode,
            firmwareMessage: message,
          });
        } else if (
          DEVICE_SESSION_CALLS.has(callType) &&
          subcode === DeviceSessionErrorCode.DeviceSessionError_PassphraseDisabled
        ) {
          error = ERRORS.TypedError(HardwareErrorCode.DeviceNotOpenedPassphrase, message, {
            failureCode: code,
            subcode,
            firmwareMessage: message,
          });
        } else if (
          DEVICE_SESSION_CALLS.has(callType) &&
          (subcode === DeviceSessionErrorCode.DeviceSessionError_Busy ||
            /^(?:busy|another flow in progress)$/i.test(normalizedMessage))
        ) {
          error = ERRORS.TypedError(HardwareErrorCode.DeviceBusy, message, {
            failureCode: code,
            subcode,
            firmwareMessage: message,
          });
        } else if (
          callType === 'DeviceSessionAskPin' &&
          /^passphrase disabled$/i.test(normalizedMessage)
        ) {
          error = ERRORS.TypedError(HardwareErrorCode.DeviceNotOpenedPassphrase, message, {
            failureCode: code,
            subcode,
            firmwareMessage: message,
          });
        } else if (isProtocolV2DeviceBusyFailure) {
          error = ERRORS.TypedError(HardwareErrorCode.DeviceBusy, message, {
            failureCode: code,
            subcode,
            firmwareMessage: message,
          });
        } else if (
          (DEVICE_CONTROL_CALLS.has(callType) &&
            subcode === DeviceErrorCode.DeviceError_ActionCancelled) ||
          isProtocolV2ActionCancelledFailure
        ) {
          error = ERRORS.TypedError(HardwareErrorCode.ActionCancelled, message, {
            failureCode: code,
            subcode,
            firmwareMessage: message,
          });
        } else if (
          subcode === DeviceErrorCode.DeviceError_DeviceLocked ||
          isLegacyProtocolV2LockedFailure
        ) {
          error = ERRORS.TypedError(HardwareErrorCode.DeviceLocked, message, {
            failureCode: code,
            subcode,
            firmwareMessage: message,
          });
        } else if (
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
      const deviceType = this.device.getCurrentDeviceType();
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
      return this._commonCall('ButtonAck', {}, stripInteractiveAckTimeout(options));
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
            return this._commonCall(
              'BixinPinInputOnDevice',
              {},
              stripInteractiveAckTimeout(options)
            ).finally(() => {
              this.device.clearCancelableAction();
            });
          }
          return this._commonCall('PinMatrixAck', { pin }, stripInteractiveAckTimeout(options));
        },
        error => Promise.reject(error)
      );
    }

    if (res.type === 'PassphraseRequest') {
      const existsAttachPinUser = res.message.exists_attach_pin_user;
      return this.promptPassphrase({
        existsAttachPinUser,
      }).then(response => {
        const { passphrase, passphraseOnDevice, attachPinOnDevice } = response;

        // Attach PIN on device
        if (attachPinOnDevice && existsAttachPinUser) {
          return this._commonCall(
            'PassphraseAck',
            { on_device_attach_pin: true },
            stripInteractiveAckTimeout(options)
          );
        }

        return !passphraseOnDevice
          ? this._commonCall('PassphraseAck', { passphrase }, stripInteractiveAckTimeout(options))
          : this._commonCall(
              'PassphraseAck',
              { on_device: true },
              stripInteractiveAckTimeout(options)
            );
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

  promptPassphrase(
    options: PassphraseRequestPayload,
    promptOptions: { cancelDeviceOnReject?: boolean } = {}
  ) {
    return new Promise<PassphrasePromptResponse>((resolve, reject) => {
      const cancelAndReject = (_error?: Error) => {
        const rejectWithCancelledError = () => {
          reject(
            ERRORS.TypedError(
              HardwareErrorCode.CallQueueActionCancelled,
              `${DEVICE.PASSPHRASE} canceled`
            )
          );
        };

        if (promptOptions.cancelDeviceOnReject === false) {
          rejectWithCancelledError();
          return Promise.resolve();
        }

        return cancelDeviceInPrompt(this.device, false)
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
      };

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
