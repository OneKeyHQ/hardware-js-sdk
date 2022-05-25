import { JsBridgeIframe } from '@onekeyfe/cross-inpage-provider-core';
import { PostMessageEvent, IFRAME } from '@onekeyfe/hd-core';
import JSBridgeConfig from './bridge-config';

const handleMessage = (event: PostMessageEvent) => {
  if (event.source === window || !event.data) return;
  const { data } = event;

  if (data.type === IFRAME.INIT) {
    init();
  }
};

export async function init() {
  window.frameBridge = new JsBridgeIframe({
    remoteFrame: window.parent,
    remoteFrameName: JSBridgeConfig.hostName,
    selfFrameName: JSBridgeConfig.iframeName,
    channel: JSBridgeConfig.channel,
    targetOrigin: '*',
    receiveHandler: payload => {
      console.log('window frameBridge: ', payload);
    },
  });

  const res = await window.frameBridge.request({
    scope: JSBridgeConfig.scope,
    data: {
      type: IFRAME.INIT,
      params: { settings: {} },
    },
  });
  console.log(res);
}

window.addEventListener('message', handleMessage, false);
