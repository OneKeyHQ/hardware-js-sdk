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
  initCore,
  Core,
} from '@onekeyfe/hd-core';
import { getOrigin } from '../utils/urlUtils';
import { sendMessage } from '../utils/bridgeUtils';

import JSBridgeConfig from './bridge-config';

let _core: Core | undefined;
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

  const settings = parseConnectSettings({
    ...(payload.settings ?? {}),
    isFrame: true,
  });
  // set origin manually
  settings.origin = !origin || origin === 'null' ? payload.settings.origin : origin;

  Log.enabled = !!settings.debug;

  try {
    _core = await initCore(settings);
  } catch (error) {
    return createErrorMessage(error);
  }

  window.frameBridge = new JsBridgeIframe({
    remoteFrame: window.parent,
    remoteFrameName: JSBridgeConfig.hostName,
    selfFrameName: JSBridgeConfig.iframeName,
    channel: JSBridgeConfig.channel,
    targetOrigin: getOrigin(settings.parentOrigin as string),
    receiveHandler: async messageEvent => {
      const message = parseMessage(messageEvent);
      console.log('Frame Bridge Receive message: ', message);

      const response = await _core?.handleMessage(message);
      Log.debug('Frame Bridge response data: ', response);
      return response;
    },
  });

  await sendMessage(createIFrameMessage(IFRAME.INIT_BRIDGE, {}), false);
}

window.addEventListener('message', handleMessage, false);