import { JsBridgeIframe } from '@onekeyfe/cross-inpage-provider-core';
import {
  PostMessageEvent,
  IFRAME,
  initLog,
  ConnectSettings,
  parseMessage,
} from '@onekeyfe/hd-core';
import { getOrigin } from '../utils/urlUtils';
import { sendMessage } from '../utils/bridgeUtils';

import JSBridgeConfig from './bridge-config';

const Log = initLog('IFrame');

const handleMessage = (event: PostMessageEvent) => {
  if (event.source === window || !event.data) return;

  const message = parseMessage(event);

  if (message.type === IFRAME.INIT) {
    init(message.payload.settings ?? {});
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

  await sendMessage(
    {
      event: 'UI_EVENT',
      type: IFRAME.INIT_BRIDGE,
      payload: {},
    },
    false
  );
}

window.addEventListener('message', handleMessage, false);
