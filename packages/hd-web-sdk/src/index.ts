import EventEmitter from 'events';
import { JsBridgeIframe } from '@onekeyfe/cross-inpage-provider-core';
import { ERRORS, parseConnectSettings, initLog, PostMessageEvent } from '@onekeyfe/hd-core';
import * as iframe from './iframe/builder';
import JSBridgeConfig from './iframe/bridge-config';

const eventEmitter = new EventEmitter();
const Log = initLog('@onekey/connect');

let _settings = parseConnectSettings();

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
  window.hostBridge = new JsBridgeIframe({
    remoteFrame: iframe.instance?.contentWindow as Window,
    remoteFrameName: JSBridgeConfig.iframeName,
    selfFrameName: JSBridgeConfig.hostName,
    channel: JSBridgeConfig.channel,
    targetOrigin: '*',
    receiveHandler: payload => {
      console.log('window hostBridge: ', payload);
    },
  });
};

const init = (settings: any) => {
  if (iframe.instance) {
    throw ERRORS.TypedError('Init_AlreadyInitialized');
  }

  _settings = parseConnectSettings({ ..._settings, ...settings });

  if (_settings.lazyLoad) {
    _settings.lazyLoad = false;
    return;
  }

  Log.enabled = !!_settings.debug;

  Log.debug('init');

  window.addEventListener('message', createJSBridge);
  window.addEventListener('unload', dispose);

  iframe.init(_settings);
};

const HardwareWebSdk = {
  eventEmitter,
  init,
  dispose,
};

export default HardwareWebSdk;
