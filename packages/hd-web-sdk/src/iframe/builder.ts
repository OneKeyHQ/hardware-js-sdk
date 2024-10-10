import { Deferred, createDeferred, HardwareErrorCode, ERRORS } from '@onekeyfe/hd-shared';
import { getOrigin } from '../utils/urlUtils';

/* eslint-disable import/no-mutable-exports */
export let instance: HTMLIFrameElement | null;
export let origin: string;
export let initPromise: Deferred<void> = createDeferred();
export let timeout = 0;
/* eslint-disable import/no-mutable-exports */

export const init = async (settings: any) => {
  initPromise = createDeferred();
  const existedFrame = document.getElementById('onekey-connect') as HTMLIFrameElement;
  if (existedFrame) {
    instance = existedFrame;
  } else {
    instance = document.createElement('iframe');
    instance.frameBorder = '0';
    instance.width = '0px';
    instance.height = '0px';
    instance.style.position = 'absolute';
    instance.style.display = 'none';
    instance.style.border = '0px';
    instance.style.width = '0px';
    instance.style.height = '0px';
    instance.id = 'onekey-connect';
    if (settings.env === 'webusb') {
      instance.allow = 'usb';
    }
  }

  // const manifest = `version=${settings.version as string}`;
  const src = `${settings.iframeSrc as string}`;

  instance.setAttribute('src', src);

  origin = getOrigin(instance.src);
  timeout = window.setTimeout(() => {
    initPromise.reject(ERRORS.TypedError(HardwareErrorCode.IframeTimeout));
  }, 10000);

  const onLoad = () => {
    if (!instance) {
      initPromise.reject(ERRORS.TypedError(HardwareErrorCode.IframeBlocked));
      return;
    }

    instance.contentWindow?.postMessage(
      {
        type: 'iframe-init',
        payload: {
          settings: { ...settings },
        },
      },
      origin
    );

    instance.onload = null;
  };

  // IE hack
  // @ts-ignore
  if (instance.attachEvent) {
    // @ts-ignore
    instance.attachEvent('onload', onLoad);
  } else {
    instance.onload = onLoad;
  }
  // inject iframe into host document body
  if (document.body) {
    document.body.appendChild(instance);
  }

  try {
    await initPromise.promise;
  } catch (e) {
    if (instance) {
      if (instance.parentNode) {
        instance.parentNode.removeChild(instance);
      }
      instance = null;
    }
    throw e;
  } finally {
    window.clearTimeout(timeout);
    timeout = 0;
  }
};

export const dispose = () => {
  if (instance && instance.parentNode) {
    try {
      instance.parentNode.removeChild(instance);
    } catch (e) {
      // do nothing
    }
  }
  instance = null;
  timeout = 0;
};
