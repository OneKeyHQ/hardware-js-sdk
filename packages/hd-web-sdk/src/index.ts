import EventEmitter from 'events';
import { JsBridgeIframe } from '@onekeyfe/cross-inpage-provider-core';
import { ERRORS, parseConnectSettings, initLog } from '@onekeyfe/hd-core';
import * as iframe from './iframe/builder';

const eventEmitter = new EventEmitter();
const Log = initLog('HD-WEB-SDK');

let _settings = parseConnectSettings();

const dispose = () => {
  eventEmitter.removeAllListeners();
  iframe.dispose();
  _settings = parseConnectSettings();
  window.removeEventListener('message', createJSBridge);
};

const createJSBridge = () => {};

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
