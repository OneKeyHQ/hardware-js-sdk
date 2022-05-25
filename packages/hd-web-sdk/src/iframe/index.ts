import { JsBridgeIframe } from '@onekeyfe/cross-inpage-provider-core';
import {
  PostMessageEvent,
  IFRAME,
  initLog,
  parseMessage,
  DataManager,
  parseConnectSettings,
  IFrameInit,
  createIFrameMessage,
  createErrorMessage,
} from '@onekeyfe/hd-core';
import { getOrigin } from '../utils/urlUtils';
import { sendMessage } from '../utils/bridgeUtils';

import JSBridgeConfig from './bridge-config';

const Log = initLog('IFrame');

const handleMessage = (event: PostMessageEvent) => {
  if (event.source === window || !event.data) return;

  const message = parseMessage(event);

  if (message.type === IFRAME.INIT) {
    init(message.payload ?? {});
  }
};

export async function init(payload: IFrameInit['payload']) {
  if (DataManager.getSettings('origin')) return;

  console.log(1);
  const settings = parseConnectSettings({
    ...(payload.settings ?? {}),
    isFrame: true,
  });
  // set origin manually
  settings.origin = !origin || origin === 'null' ? payload.settings.origin : origin;

  Log.enabled = !!settings.debug;

  try {
    // TODO: add some init flow
  } catch (error) {
    return createErrorMessage(error);
  }

  window.frameBridge = new JsBridgeIframe({
    remoteFrame: window.parent,
    remoteFrameName: JSBridgeConfig.hostName,
    selfFrameName: JSBridgeConfig.iframeName,
    channel: JSBridgeConfig.channel,
    targetOrigin: getOrigin(settings.parentOrigin as string),
    receiveHandler: messageEvent => {
      const message = parseMessage(messageEvent);
      console.log('Frame Bridge Receive message: ', message);
      // Log.debug('Host Bridge receive data: ', receive);
    },
  });

  await sendMessage(createIFrameMessage(IFRAME.INIT_BRIDGE, {}), false);
}

window.addEventListener('message', handleMessage, false);
