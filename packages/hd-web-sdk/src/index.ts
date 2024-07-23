import EventEmitter from 'events';
import HardwareSdk, {
  HardwareSDKLowLevel as HardwareLowLevelSdk,
  HardwareTopLevelSdk,
  parseConnectSettings,
  enableLog,
  PostMessageEvent,
  IFRAME,
  createErrorMessage,
  parseMessage,
  UI_EVENT,
  CoreMessage,
  ConnectSettings,
  UiResponseEvent,
  LOG_EVENT,
  setLoggerPostMessage,
  getLogger,
  LoggerNames,
  FIRMWARE_EVENT,
  DEVICE_EVENT,
  DEVICE,
  UI_REQUEST,
  whitelist,
} from '@onekeyfe/hd-core';
import { ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';
import * as iframe from './iframe/builder';
import JSBridgeConfig from './iframe/bridge-config';
import { sendMessage, createJsBridge, hostBridge, resetListenerFlag } from './utils/bridgeUtils';
import { getHost } from './utils/urlUtils';

const eventEmitter = new EventEmitter();
const Log = getLogger(LoggerNames.Connect);

let _settings = parseConnectSettings();

export const isOriginWhitelisted = (origin: string) => {
  const host = getHost(origin);

  return whitelist.find(item => item.origin === origin || item.origin === host);
};

// easy to test and then open
export const isExtensionWhitelisted = (origin: string) => true;
// whitelistExtension.find(item => item === origin);

const handleMessage = async (message: CoreMessage) => {
  switch (message.event) {
    case UI_EVENT:
      if (message.type === IFRAME.INIT_BRIDGE) {
        iframe.initPromise.resolve();
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
          [DEVICE.CONNECT, DEVICE.DISCONNECT, DEVICE.FEATURES, DEVICE.SUPPORT_FEATURES] as string[]
        ).includes(message.type)
      ) {
        eventEmitter.emit(message.type, message.payload);
      }
      break;

    default:
      Log.log('No need to be captured message', message.event);
  }
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

let prevFrameInstance: Window | null | undefined = null;
const createJSBridge = (messageEvent: PostMessageEvent) => {
  if (messageEvent.origin !== iframe.origin) {
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
      targetOrigin: iframe.origin,

      receiveHandler: async messageEvent => {
        const message = parseMessage(messageEvent);
        if (message.event !== 'LOG_EVENT') {
          if (['DEVICE_EVENT', 'FIRMWARE_EVENT'].includes(message.event)) {
            Log.debug('Host Bridge Receive message: ', message);
          } else {
            Log.log('Host Bridge Receive message: ', message);
          }
        }
        const response = await handleMessage(message);
        if (message.event !== 'LOG_EVENT') {
          if (['DEVICE_EVENT', 'FIRMWARE_EVENT'].includes(message.event)) {
            Log.debug('Host Bridge response: ', message);
          } else {
            Log.log('Host Bridge response: ', message);
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
  Log.log('call : ', params);
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

const addHardwareGlobalEventListener = (listener: (message: CoreMessage) => void) => {
  [
    UI_EVENT,
    LOG_EVENT,
    FIRMWARE_EVENT,
    DEVICE.CONNECT,
    DEVICE.DISCONNECT,
    DEVICE.FEATURES,
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
  dispose,
  addHardwareGlobalEventListener,
  uiResponse,
  updateSettings,
});

const HardwareSDKTopLevel = HardwareTopLevelSdk();

const HardwareWebSdk = HardwareSdk({
  eventEmitter,
  init,
  call,
  cancel,
  dispose,
  uiResponse,
  updateSettings,
});

export default { HardwareSDKLowLevel, HardwareSDKTopLevel, HardwareWebSdk };
