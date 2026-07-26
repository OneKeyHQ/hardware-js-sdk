import EventEmitter from 'events';
import HardwareSdk, {
  DEVICE,
  DEVICE_EVENT,
  FIRMWARE_EVENT,
  HardwareSDKLowLevel as HardwareLowLevelSdk,
  HardwareTopLevelSdk,
  IFRAME,
  LOG_EVENT,
  LoggerNames,
  UI_EVENT,
  UI_REQUEST,
  createErrorMessage,
  enableLog,
  executeCallback,
  getLogBlockLabel,
  getLogger,
  parseConnectSettings,
  parseMessage,
  setLoggerPostMessage,
  whitelist,
} from '@onekeyfe/hd-core';
import { ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';

import * as iframe from './iframe/builder';
import { FirmwareHostChannel } from './firmware/FirmwareHostChannel';
import {
  getFirmwareHostChannelTargetOrigin,
  normalizeFirmwareHostChannelEventOrigin,
} from './firmware/FirmwareHostChannelProtocol';
import JSBridgeConfig from './iframe/bridge-config';
import {
  createJsBridge,
  getJsBridgeGeneration,
  hostBridge,
  resetListenerFlag,
  sendMessage,
} from './utils/bridgeUtils';
import { getHost } from './utils/urlUtils';

import type {
  ConnectSettings,
  CoreMessage,
  FirmwareUpdateHostBinding,
  PostMessageEvent,
  UiResponseEvent,
} from '@onekeyfe/hd-core';

export * from './firmware/FirmwareHostChannel';
export * from './firmware/FirmwareHostChannelProtocol';

const eventEmitter = new EventEmitter();
const Log = getLogger(LoggerNames.Connect);

let _settings = parseConnectSettings();
let firmwareHostChannelBinding: FirmwareUpdateHostBinding | undefined;
let firmwareHostChannel: FirmwareHostChannel | undefined;

export const isOriginWhitelisted = (origin: string) => {
  const host = getHost(origin);

  return whitelist.find(item => item.origin === origin || item.origin === host);
};

// easy to test and then open
// @ts-expect-error
export const isExtensionWhitelisted = (origin: string) => true;
// whitelistExtension.find(item => item === origin);

const handleMessage = async (message: CoreMessage) => {
  switch (message.event) {
    case UI_EVENT:
      if (message.type === IFRAME.INIT_BRIDGE) {
        iframe.initPromise.resolve();
        if (firmwareHostChannelBinding) {
          connectFirmwareHostChannel().catch(error => {
            Log.error('Firmware host channel handshake failed', error);
          });
        }
        return Promise.resolve({ success: true, payload: 'JSBridge Handshake Success' });
      }

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
      Log.warn('No need to be captured message', message.event);
  }
};

const createFirmwareHostChannelSessionId = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `firmware-${Array.from(bytes)
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')}`;
};

const connectFirmwareHostChannel = async () => {
  const binding = firmwareHostChannelBinding;
  const targetWindow = iframe.instance?.contentWindow;
  const generation = getJsBridgeGeneration(true);
  if (!binding || !targetWindow || !hostBridge || generation <= 0) {
    throw ERRORS.TypedError(HardwareErrorCode.IFrameNotInitialized);
  }
  const previousChannel = firmwareHostChannel;
  firmwareHostChannel = undefined;
  await previousChannel?.dispose();
  if (
    binding !== firmwareHostChannelBinding ||
    targetWindow !== iframe.instance?.contentWindow ||
    generation !== getJsBridgeGeneration(true)
  ) {
    throw ERRORS.TypedError(HardwareErrorCode.IFrameNotInitialized);
  }
  const channel = new FirmwareHostChannel({
    binding,
    targetWindow,
    targetOrigin: getFirmwareHostChannelTargetOrigin(iframe.origin),
    sessionId: createFirmwareHostChannelSessionId(),
    generation,
  });
  firmwareHostChannel = channel;
  try {
    return await channel.connect();
  } catch (error) {
    if (firmwareHostChannel === channel) {
      firmwareHostChannel = undefined;
    }
    await channel.dispose();
    throw error;
  }
};

export const registerFirmwareHostChannelBinding = async (binding: FirmwareUpdateHostBinding) => {
  firmwareHostChannelBinding = binding;
  return connectFirmwareHostChannel();
};

export const unregisterFirmwareHostChannelBinding = async () => {
  firmwareHostChannelBinding = undefined;
  const channel = firmwareHostChannel;
  firmwareHostChannel = undefined;
  await channel?.dispose();
};

function checkTrust(settings: ConnectSettings) {
  const hasTrust =
    isOriginWhitelisted(settings.parentOrigin ?? '') ||
    isExtensionWhitelisted(settings.extension ?? '');

  if (!hasTrust) {
    throw ERRORS.TypedError(HardwareErrorCode.IframeDistrust, JSON.stringify(settings));
  }
}

const dispose = () => {
  checkTrust(_settings);
  eventEmitter.removeAllListeners();
  firmwareHostChannelBinding = undefined;
  const activeFirmwareHostChannel = firmwareHostChannel;
  firmwareHostChannel = undefined;
  activeFirmwareHostChannel?.dispose().catch(() => undefined);
  iframe.dispose();
  _settings = parseConnectSettings();
  window.removeEventListener('message', createJSBridge);
};

const uiResponse = (response: UiResponseEvent) => {
  if (!iframe.instance) {
    throw ERRORS.TypedError(HardwareErrorCode.IFrameNotInitialized);
  }
  const { type, payload } = response;
  sendMessage({ event: UI_EVENT, type, payload } as CoreMessage);
};

const cancel = (connectId?: string) => {
  sendMessage({ event: IFRAME.CANCEL, type: IFRAME.CANCEL, payload: { connectId } });
};

const cancelOperation = (operationId: string) => {
  sendMessage({
    event: IFRAME.CANCEL_OPERATION,
    type: IFRAME.CANCEL_OPERATION,
    payload: { operationId },
  } as CoreMessage);
};

let prevFrameInstance: Window | null | undefined = null;
const createJSBridge = (messageEvent: PostMessageEvent) => {
  if (
    messageEvent.source !== iframe.instance?.contentWindow ||
    normalizeFirmwareHostChannelEventOrigin(messageEvent.origin) !==
      normalizeFirmwareHostChannelEventOrigin(iframe.origin)
  ) {
    return;
  }
  if (!hostBridge || prevFrameInstance !== iframe.instance?.contentWindow) {
    resetListenerFlag();
    createJsBridge({
      isHost: true,
      remoteFrame: iframe.instance?.contentWindow as Window,
      remoteFrameName: JSBridgeConfig.iframeName,
      selfFrameName: JSBridgeConfig.hostName,
      channel: JSBridgeConfig.channel,
      targetOrigin: getFirmwareHostChannelTargetOrigin(iframe.origin),

      receiveHandler: async messageEvent => {
        const message = parseMessage(messageEvent);
        const blockLog = getLogBlockLabel(message);
        if (message.event !== 'LOG_EVENT') {
          if (['DEVICE_EVENT', 'FIRMWARE_EVENT'].includes(message.event)) {
            // Log.debug('Host Bridge Receive message: ', message);
          } else if (blockLog) {
            Log.debug('Host Bridge Receive message: ', blockLog);
          } else {
            Log.debug('Host Bridge Receive message: ', message);
          }
        }
        const response = await handleMessage(message);
        if (message.event !== 'LOG_EVENT') {
          if (['DEVICE_EVENT', 'FIRMWARE_EVENT'].includes(message.event)) {
            // Log.debug('Host Bridge response: ', message);
          } else if (blockLog) {
            Log.debug('Host Bridge response: ', blockLog);
          } else {
            Log.debug('Host Bridge response: ', message);
          }
        }
        return response;
      },
    });

    prevFrameInstance = iframe.instance?.contentWindow;
  }
};

const init = async (settings: Partial<ConnectSettings>) => {
  if (iframe.instance) {
    throw ERRORS.TypedError(HardwareErrorCode.IFrameAleradyInitialized);
  }

  _settings = parseConnectSettings({ ..._settings, ...settings });
  checkTrust(_settings);

  enableLog(!!settings.debug);
  setLoggerPostMessage(handleMessage);

  Log.debug('init');

  window.addEventListener('message', createJSBridge);
  window.addEventListener('unload', dispose);

  try {
    await iframe.init({ ..._settings, version: process.env.VERSION });
    return true;
  } catch (e) {
    console.log('init error: ', e);
    return false;
  }
};

const call = async (params: any) => {
  const blockLog = getLogBlockLabel(params);
  Log.debug('call : ', blockLog ?? params);
  /**
   * Try to recreate iframe if it's initialize failed
   */
  if (!iframe.instance && !iframe.timeout) {
    _settings = parseConnectSettings(_settings);
    checkTrust(_settings);
    Log.debug("Try to recreate iframe if it's initialize failed: ", _settings);
    try {
      const initResult = await init(_settings);
      if (!initResult) {
        Log.debug('Recreate iframe failed');
        return createErrorMessage(ERRORS.TypedError(HardwareErrorCode.IFrameLoadFail));
      }
      Log.debug('Recreate iframe success');
    } catch (error) {
      Log.debug('Recreate iframe failed: ', error);
      return createErrorMessage(error);
    }
  }

  if (iframe.timeout) {
    return createErrorMessage(ERRORS.TypedError(HardwareErrorCode.IFrameLoadFail));
  }

  try {
    const response = await sendMessage({ event: IFRAME.CALL, type: IFRAME.CALL, payload: params });
    if (response) {
      return response;
    }

    return createErrorMessage(ERRORS.TypedError(HardwareErrorCode.CallMethodNotResponse));
  } catch (error) {
    Log.error('__call error: ', error);
    let err = error;
    if (!(err instanceof HardwareError)) {
      err = ERRORS.CreateErrorByMessage(error.message);
    }
    return createErrorMessage(err);
  }
};

const updateSettings = async (settings: Partial<ConnectSettings>) => {
  if (iframe.instance) {
    throw ERRORS.TypedError(HardwareErrorCode.IFrameAleradyInitialized);
  }

  checkTrust(_settings);
  Log.debug('updateSettings API Called =>: old settings: ', _settings);
  _settings = parseConnectSettings({ ..._settings, ...settings });
  Log.debug('updateSettings API Called =>: new settings: ', _settings);
  return Promise.resolve(true);
};

const switchTransport = async (env: ConnectSettings['env']) => {
  if (iframe.instance) {
    const response = await sendMessage({
      event: IFRAME.SWITCH_TRANSPORT,
      type: IFRAME.SWITCH_TRANSPORT,
      payload: { env },
    });
    return response;
  }
  throw ERRORS.TypedError(HardwareErrorCode.IFrameNotInitialized);
};

const addHardwareGlobalEventListener = (listener: (message: CoreMessage) => void) => {
  [
    UI_EVENT,
    LOG_EVENT,
    FIRMWARE_EVENT,
    DEVICE.CONNECT,
    DEVICE.DISCONNECT,
    DEVICE.FEATURES,
    DEVICE.STATE,
    DEVICE.SUPPORT_FEATURES,
    UI_REQUEST.FIRMWARE_PROGRESS,
    UI_REQUEST.FIRMWARE_TIP,
    UI_REQUEST.PREVIOUS_ADDRESS_RESULT,
  ].forEach(eventName => {
    eventEmitter.on(eventName, (message: CoreMessage) => {
      let emitMessage = message;
      if (!message.event && !(message as CoreMessage).type) {
        emitMessage = {
          // @ts-expect-error
          ...message,
          event: eventName,
          type: eventName,
        };
      }
      listener?.(emitMessage);
    });
  });
};

const HardwareSDKLowLevel = HardwareLowLevelSdk({
  eventEmitter,
  init,
  call,
  cancel,
  cancelOperation,
  dispose,
  addHardwareGlobalEventListener,
  uiResponse,
  updateSettings,
  switchTransport,
});

const HardwareSDKTopLevel = HardwareTopLevelSdk();

const HardwareWebSdk = HardwareSdk({
  eventEmitter,
  init,
  call,
  cancel,
  cancelOperation,
  dispose,
  uiResponse,
  updateSettings,
  switchTransport,
});

export default {
  HardwareSDKLowLevel,
  HardwareSDKTopLevel,
  HardwareWebSdk,
  registerFirmwareHostChannelBinding,
  unregisterFirmwareHostChannelBinding,
};
