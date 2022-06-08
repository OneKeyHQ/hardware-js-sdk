import EventEmitter from 'events';
import HardwareSdk, {
  ERRORS,
  parseConnectSettings,
  initLog,
  enableLog,
  PostMessageEvent,
  IFRAME,
  createErrorMessage,
  parseMessage,
  UI_EVENT,
  CoreMessage,
  ConnectSettings,
} from '@onekeyfe/hd-core';
import * as iframe from './iframe/builder';
import JSBridgeConfig from './iframe/bridge-config';
import { sendMessage, createJsBridge, hostBridge } from './utils/bridgeUtils';

const eventEmitter = new EventEmitter();
const Log = initLog('@onekey/connect');

let _settings = parseConnectSettings();

const handleMessage = async (message: CoreMessage) => {
  switch (message.event) {
    case UI_EVENT:
      if (message.type === IFRAME.INIT_BRIDGE) {
        iframe.initPromise.resolve();
        return Promise.resolve({ success: true, payload: 'JSBridge Handshake Success' });
      }

      // pass UI event up
      console.log('pass UI event up');
      eventEmitter.emit(message.event, message);
      eventEmitter.emit(message.type, message.payload);
      break;

    default:
      Log.log('Undefined message', message.event);
  }
};

const dispose = () => {
  eventEmitter.removeAllListeners();
  iframe.dispose();
  _settings = parseConnectSettings();
  window.removeEventListener('message', createJSBridge);
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
        console.log('Host Bridge Receive message: ', message);
        const response = await handleMessage(message);
        Log.debug('Host Bridge response: ', response);
        return response;
      },
    });
  }
};

const init = (settings: Partial<ConnectSettings>) => {
  if (iframe.instance) {
    throw ERRORS.TypedError('Init_AlreadyInitialized');
  }

  _settings = parseConnectSettings({ ..._settings, ...settings });

  if (_settings.lazyLoad) {
    _settings.lazyLoad = false;
    return;
  }

  enableLog(!!settings.debug);

  Log.debug('init');

  window.addEventListener('message', createJSBridge);
  window.addEventListener('unload', dispose);

  iframe.init(_settings);
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
    return createErrorMessage(ERRORS.TypedError('Init_IframeLoadFail'));
  }

  try {
    const response = await sendMessage({ event: IFRAME.CALL, type: IFRAME.CALL, payload: params });
    if (response) {
      return response;
    }

    return createErrorMessage(ERRORS.TypedError('Call_NotResponse'));
  } catch (error) {
    Log.error('__call error: ', error);
    return createErrorMessage(error);
  }
};

const HardwareWebSdk = HardwareSdk({
  eventEmitter,
  init,
  call,
  dispose,
});

export default HardwareWebSdk;
