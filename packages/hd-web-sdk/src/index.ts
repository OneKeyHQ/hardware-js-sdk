import EventEmitter from 'events';
import HardwareSdk, {
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
} from '@onekeyfe/hd-core';
import { ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';
import * as iframe from './iframe/builder';
import JSBridgeConfig from './iframe/bridge-config';
import { sendMessage, createJsBridge, hostBridge } from './utils/bridgeUtils';

const eventEmitter = new EventEmitter();
const Log = getLogger(LoggerNames.Connect);

let _settings = parseConnectSettings();

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
      if (message.type === DEVICE.FEATURES) {
        eventEmitter.emit(message.type, message.payload);
      }
      break;

    default:
      Log.log('No need to be captured message', message.event);
  }
};

const dispose = () => {
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
  sendMessage({ event: UI_EVENT, type, payload });
};

const cancel = (connectId?: string) => {
  sendMessage({ event: IFRAME.CANCEL, type: IFRAME.CANCEL, payload: { connectId } });
};

const createJSBridge = (messageEvent: PostMessageEvent) => {
  if (messageEvent.origin !== iframe.origin) {
    return;
  }
  if (!hostBridge) {
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
          Log.debug('Host Bridge Receive message: ', message);
        }
        const response = await handleMessage(message);
        if (message.event !== 'LOG_EVENT') {
          Log.debug('Host Bridge response: ', response);
        }
        return response;
      },
    });
  }
};

const init = async (settings: Partial<ConnectSettings>) => {
  if (iframe.instance) {
    throw ERRORS.TypedError(HardwareErrorCode.IFrameAleradyInitialized);
  }

  _settings = parseConnectSettings({ ..._settings, ...settings });

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
  Log.debug('call : ', params);
  // lazy load
  if (!iframe.instance && !iframe.timeout) {
    _settings = parseConnectSettings(_settings);
    try {
      init(_settings);
    } catch (error) {
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

const HardwareWebSdk = HardwareSdk({
  eventEmitter,
  init,
  call,
  cancel,
  dispose,
  uiResponse,
});

export default HardwareWebSdk;
