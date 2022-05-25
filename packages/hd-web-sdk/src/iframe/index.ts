import { JsBridgeIframe } from '@onekeyfe/cross-inpage-provider-core';
import { PostMessageEvent, IFRAME, initLog, ConnectSettings } from '@onekeyfe/hd-core';
import { getOrigin } from '../utils/urlUtils';

import JSBridgeConfig from './bridge-config';

const Log = initLog('IFrame');

const handleMessage = (event: PostMessageEvent) => {
  if (event.source === window || !event.data) return;
  const { data } = event;

  if (data.type === IFRAME.INIT) {
    init(event.data.payload?.settings ?? {});
  }
};

export async function init(settings: ConnectSettings) {
  Log.enabled = !!settings.debug;

  window.frameBridge = new JsBridgeIframe({
    remoteFrame: window.parent,
    remoteFrameName: JSBridgeConfig.hostName,
    selfFrameName: JSBridgeConfig.iframeName,
    channel: JSBridgeConfig.channel,
    targetOrigin: getOrigin(settings.parentOrigin as string),
    receiveHandler: payload => {
      console.log('window frameBridge: ', payload);
    },
  });
  Log.debug('request');

  await window.frameBridge.request({
    scope: JSBridgeConfig.scope,
    data: {
      type: IFRAME.INIT_BRIDGE,
      params: { settings: {} },
    },
  });
}

window.addEventListener('message', handleMessage, false);
