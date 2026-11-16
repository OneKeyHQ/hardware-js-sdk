import EventEmitter from 'events';
import HardwareSdk, {
  CORE_EVENT,
  DEVICE,
  DEVICE_EVENT,
  FIRMWARE_EVENT,
  IFRAME,
  LOG_EVENT,
  LoggerNames,
  UI_EVENT,
  UI_REQUEST,
  createErrorMessage,
  createUiMessage,
  enableLog,
  executeCallback,
  getLogBlockLabel,
  getLogger,
  getSafeLogPayload,
  initCore,
  parseConnectSettings,
  setLoggerPostMessage,
} from '@onekeyfe/hd-core';
import { ERRORS, HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';
import ReactNativeTransport from '@onekeyfe/hd-transport-react-native';
import ReactNativeUsbTransport, {
  setUsbPriorityMode,
} from '@onekeyfe/hd-transport-react-native-usb';

import ReactNativeCombinedTransport from './ReactNativeCombinedTransport';

import type { Deferred } from '@onekeyfe/hd-shared';
import type {
  ConnectSettings,
  Core,
  CoreApi,
  CoreMessage,
  UiResponseEvent,
} from '@onekeyfe/hd-core';

const eventEmitter = new EventEmitter();
const Log = getLogger(LoggerNames.HdBleSdk);
let _core: Core | undefined;
let _settings = parseConnectSettings();

let _messageID = 0;
export const messagePromises: { [key: number]: Deferred<any> } = {};

const dispose = async () => {
  const core = _core;
  const previousEnv = _settings.env;
  _core = undefined;
  eventEmitter.removeAllListeners();
  Object.keys(messagePromises).forEach(key => {
    delete messagePromises[Number(key)];
  });
  if (previousEnv === 'react-native-combined') {
    await ReactNativeCombinedTransport.setPriorityMode(false).catch(() => undefined);
  }
  _settings = parseConnectSettings();
  await core?.dispose?.();
};

const uiResponse = (response: UiResponseEvent) => {
  if (!_core) {
    throw ERRORS.TypedError(HardwareErrorCode.NotInitialized);
  }
  const { type, payload } = response;
  _core.handleMessage({ event: UI_EVENT, type, payload } as CoreMessage);
};

const cancel = (connectId?: string) => {
  if (_core === undefined) return;
  _core.handleMessage({ event: IFRAME.CANCEL, type: IFRAME.CANCEL, payload: { connectId } });
};

function handleMessage(message: CoreMessage) {
  const { event, type } = message;
  if (!_core) {
    return;
  }

  if (event !== LOG_EVENT) {
    try {
      if (type === UI_REQUEST.FIRMWARE_PROGRESS) {
        Log.debug('hd-ble-sdk handleMessage', {
          event,
          type,
          progress: message?.payload?.progress,
        });
      } else {
        const blockLog = getLogBlockLabel(message);
        Log.debug(
          'hd-ble-sdk handleMessage',
          blockLog ? { event, type, method: blockLog } : JSON.stringify(getSafeLogPayload(message))
        );
      }
    } catch (error) {
      // ignore
    }
  }
  switch (event) {
    case UI_EVENT:
      // pass UI event up
      eventEmitter.emit(message.event, message);
      eventEmitter.emit(message.type, message.payload);
      break;
    case LOG_EVENT:
    case FIRMWARE_EVENT:
      eventEmitter.emit(message.event, message);
      break;
    case DEVICE_EVENT:
      if (
        (
          [
            DEVICE.CONNECT,
            DEVICE.DISCONNECT,
            DEVICE.FEATURES,
            DEVICE.STATE,
            DEVICE.SUPPORT_FEATURES,
          ] as string[]
        ).includes(message.type)
      ) {
        eventEmitter.emit(message.type, message.payload);
      }
      break;
    case IFRAME.CALLBACK: {
      const { callbackId, data, error } = message.payload;
      executeCallback(callbackId, data, error);
      break;
    }
    default:
      Log.log('No need to be captured message', message.event);
  }
}

async function postMessage(message: CoreMessage, usePromise = true) {
  if (!_core) {
    throw ERRORS.TypedError('postMessage: _core not found');
  }

  if (usePromise) {
    _messageID++;
    const messageId = _messageID;
    messagePromises[messageId] = createDeferred();
    try {
      return await _core.handleMessage({ ...message, id: `${messageId}` });
    } finally {
      delete messagePromises[messageId];
    }
  }

  _core.handleMessage(message);
}

const init = async (settings: Partial<ConnectSettings>) => {
  const env =
    settings.env === 'react-native-usb' || settings.env === 'react-native-combined'
      ? settings.env
      : 'react-native';
  _settings = { ..._settings, ...settings, env };

  enableLog(!!settings.debug);

  Log.debug('init');

  try {
    let Transport:
      | typeof ReactNativeTransport
      | typeof ReactNativeUsbTransport
      | typeof ReactNativeCombinedTransport = ReactNativeTransport;
    if (env === 'react-native-usb') {
      Transport = ReactNativeUsbTransport;
    } else if (env === 'react-native-combined') {
      Transport = ReactNativeCombinedTransport;
    }
    _core = await initCore(_settings, Transport);
    _core?.on(CORE_EVENT, handleMessage);
    setLoggerPostMessage(handleMessage);

    return true;
  } catch (error) {
    Log.error(createErrorMessage(error));

    return false;
  }
};

const call = async (params: any) => {
  const blockLog = getLogBlockLabel(params);
  Log.debug('call: ', blockLog ?? params);

  try {
    const response = await postMessage({ event: IFRAME.CALL, type: IFRAME.CALL, payload: params });
    if (response) {
      Log.debug('response: ', blockLog ? '[REDACTED]' : response);

      if (!response.success) {
        if (response.payload?.code === HardwareErrorCode.BlePoweredOff) {
          postMessage(createUiMessage(UI_REQUEST.BLUETOOTH_POWERED_OFF), false);
        }
        if (response.payload?.code === HardwareErrorCode.BleUnsupported) {
          postMessage(createUiMessage(UI_REQUEST.BLUETOOTH_UNSUPPORTED), false);
        }
        if (response.payload?.code === HardwareErrorCode.BlePermissionError) {
          /**
           * Send message notification when there is no Bluetooth access permission
           */
          postMessage(createUiMessage(UI_REQUEST.BLUETOOTH_PERMISSION), false);
        }

        if (response.payload?.code === HardwareErrorCode.BleLocationError) {
          postMessage(createUiMessage(UI_REQUEST.LOCATION_PERMISSION), false);
        }
        if (response.payload?.code === HardwareErrorCode.BleLocationServicesDisabled) {
          postMessage(createUiMessage(UI_REQUEST.LOCATION_SERVICE_PERMISSION), false);
        }
      }

      return response;
    }

    return createErrorMessage(ERRORS.TypedError(HardwareErrorCode.CallMethodNotResponse));
  } catch (error) {
    Log.error('__call error: ', error);
    return createErrorMessage(error);
  }
};

const updateSettings = () => Promise.resolve(true);
const switchTransport = () => Promise.resolve({ success: true });

/**
 * Locks transport preference to USB when enabled (so temporary detach/bootloader
 * re-enumeration does not fall back to BLE) and forwards the flag to native OneKeyUsb.
 * Exposed on `@onekeyfe/hd-ble-sdk` rather than CoreApi so non-RN SDKs stay unaffected.
 */
export const setPriorityMode = async (enabled: boolean): Promise<void> => {
  if (_settings.env === 'react-native-combined') {
    await ReactNativeCombinedTransport.setPriorityMode(enabled);
    return;
  }
  if (typeof setUsbPriorityMode === 'function') {
    await setUsbPriorityMode(enabled).catch(error => {
      Log.debug('setPriorityMode native call failed:', error);
    });
  }
};

export type HardwareBleSdkApi = CoreApi & {
  setPriorityMode: (enabled: boolean) => Promise<void>;
};

const HardwareBleSdk: HardwareBleSdkApi = Object.assign(
  HardwareSdk({
    eventEmitter,
    init,
    call,
    cancel,
    dispose,
    uiResponse,
    updateSettings,
    switchTransport,
  }),
  {
    setPriorityMode,
  }
);

export { ReactNativeCombinedTransport };
export default HardwareBleSdk;
