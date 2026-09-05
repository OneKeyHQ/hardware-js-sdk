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
  initCore,
  parseConnectSettings,
  setLoggerPostMessage,
} from '@onekeyfe/hd-core';
import { ERRORS, HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';
import HttpTransport from '@onekeyfe/hd-transport-http';
import { ElectronBleTransport, WebUsbTransport } from '@onekeyfe/hd-transport-web-device';
import LowlevelTransport from '@onekeyfe/hd-transport-lowlevel';
import EmulatorTransport from '@onekeyfe/hd-transport-emulator';

import type { Deferred } from '@onekeyfe/hd-shared';
import type {
  ConnectSettings,
  Core,
  CoreMessage,
  LowLevelCoreApi,
  UiResponseEvent,
} from '@onekeyfe/hd-core';
import type { LowlevelTransportSharedPlugin } from '@onekeyfe/hd-transport';

const eventEmitter = new EventEmitter();
const Log = getLogger(LoggerNames.HdCommonConnectSdk);

const getTransport = async (env: ConnectSettings['env']) => {
  if (env === 'desktop-web-ble') {
    return ElectronBleTransport;
  }
  if (env === 'webusb' || env === 'desktop-webusb') return WebUsbTransport;
  if (env === 'lowlevel') return LowlevelTransport;
  if (env === 'node-usb') {
    // Dynamic import — usb is a native Node.js module (libusb C++ bindings)
    // that cannot be resolved by browser/React Native bundlers
    const { default: NodeUsbTransport } = await import('@onekeyfe/hd-transport-usb');
    return NodeUsbTransport;
  }
  if (env === 'emulator') return EmulatorTransport;
  return HttpTransport;
};

let _core: Core | undefined;
let _settings = parseConnectSettings();

let _messageID = 0;
export const messagePromises: { [key: number]: Deferred<any> } = {};

const dispose = async () => {
  const core = _core;
  _core = undefined;
  eventEmitter.removeAllListeners();
  Object.keys(messagePromises).forEach(key => {
    delete messagePromises[Number(key)];
  });
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
  const { event } = message;
  if (!_core) {
    return;
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

const init = async (
  settings: Partial<ConnectSettings>,
  _?: LowLevelCoreApi,
  plugin?: LowlevelTransportSharedPlugin
) => {
  _settings = { ..._settings, ...settings, env: settings.env ?? 'node' };

  enableLog(!!settings.debug);

  Log.debug('init');

  try {
    const Transport = await getTransport(_settings.env);
    _core = await initCore(_settings, Transport, plugin);
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
        if (response.payload?.code === HardwareErrorCode.BleUnsupported) {
          postMessage(createUiMessage(UI_REQUEST.BLUETOOTH_UNSUPPORTED), false);
        }
        if (response.payload?.code === HardwareErrorCode.BlePoweredOff) {
          postMessage(createUiMessage(UI_REQUEST.BLUETOOTH_POWERED_OFF), false);
        }
        if (response.payload?.code === HardwareErrorCode.BlePermissionError) {
          postMessage(createUiMessage(UI_REQUEST.BLUETOOTH_PERMISSION), false);
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

const HardwareCommonConnectSdk = HardwareSdk({
  eventEmitter,
  init,
  call,
  cancel,
  dispose,
  uiResponse,
  updateSettings,
  switchTransport,
});

export default HardwareCommonConnectSdk;
