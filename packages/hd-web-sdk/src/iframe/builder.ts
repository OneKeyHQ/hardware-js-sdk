import { ERRORS, Deferred, create as createDeferred } from '@onekeyfe/hd-core';
import css from './inlineStyles';

/* eslint-disable import/no-mutable-exports */
export let instance: HTMLIFrameElement | null;
export let initPromise: Deferred<void> = createDeferred();
export let timeout = 0;
/* eslint-disable import/no-mutable-exports */

const injectStyleSheet = () => {
  if (!instance) {
    throw ERRORS.TypedError('Init_IframeBlocked');
  }
  const doc = instance.ownerDocument;
  const head = doc.head || doc.getElementsByTagName('head')[0];
  const style = document.createElement('style');
  style.setAttribute('type', 'text/css');
  style.setAttribute('id', 'TrezorConnectStylesheet');

  // @ts-ignore
  if (style.styleSheet) {
    // @ts-ignore
    style.styleSheet.cssText = css;
    head.appendChild(style);
  } else {
    style.appendChild(document.createTextNode(css));
    head.append(style);
  }
};

export const init = (settings: any) => {
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
  }

  const manifestString = settings.manifest ? JSON.stringify(settings.manifest) : 'undefined'; // note: btoa(undefined) === btoa('undefined') === "dW5kZWZpbmVk"
  const manifest = `version=${settings.version as string}&manifest=${encodeURIComponent(
    btoa(JSON.stringify(manifestString))
  )}`;
  const src = `${settings.iframeSrc as string}?${manifest}`;

  timeout = window.setTimeout(() => {
    initPromise.reject(ERRORS.TypedError('Init_IframeTimeout'));
  }, 10000);

  instance.setAttribute('src', src);

  const onLoad = () => {
    if (!instance) {
      initPromise.reject(ERRORS.TypedError('Init_IframeBlocked'));
      return;
    }

    instance.onload = null;
    console.log('IFrame onload');
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
    // eslint-disable-next-line no-use-before-define
    injectStyleSheet();
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
