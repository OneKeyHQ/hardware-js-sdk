import { ERRORS } from '@onekeyfe/hd-core';
import * as iframe from './iframe/builder';

const init = (settings: any) => {
  if (iframe.instance) {
    throw ERRORS.TypedError('Init_AlreadyInitialized');
  }

  window.addEventListener('message', message => {
    console.log(message);
  });
  window.addEventListener('unload', () => {});

  iframe.init(settings);
};

const HardwareWebSdk = {
  init,
};

export default HardwareWebSdk;
