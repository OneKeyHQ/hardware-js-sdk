import EventEmitter from 'events';
import HardwareSdk, {
  ConnectSettings,
  enableLog,
  initLog,
  parseConnectSettings,
} from '@onekeyfe/hd-core';

const eventEmitter = new EventEmitter();
const Log = initLog('@onekey/hd-ble-sdk');

let _settings = parseConnectSettings();

const dispose = () => {
  eventEmitter.removeAllListeners();
  _settings = parseConnectSettings();
};

const init = (settings: Partial<ConnectSettings>) => {
  _settings = { ..._settings, ...settings, env: 'react-native' };

  enableLog(!!settings.debug);
  Log.debug('init');
};

const call = (params: any) => {
  Log.debug('call: ', params);
  return Promise.resolve();
};

const HardwareBleSdk = HardwareSdk({
  eventEmitter,
  init,
  call,
  dispose,
});

export default HardwareBleSdk;
