import HttpTransport from '@onekeyfe/hd-transport-http';
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
  CORE_EVENT,
} from '@onekeyfe/hd-core';
import { getOrigin } from '../utils/urlUtils';
import { sendMessage, createJsBridge } from '../utils/bridgeUtils';

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
    _core = await initCore(settings, HttpTransport);
    _core?.on(CORE_EVENT, messages => sendMessage(messages, false));
  } catch (error) {
    return createErrorMessage(error);
  }

  createJsBridge({
    isHost: false,
    remoteFrame: window.parent,
    remoteFrameName: JSBridgeConfig.hostName,
    selfFrameName: JSBridgeConfig.iframeName,
    channel: JSBridgeConfig.channel,
    targetOrigin: getOrigin(settings.parentOrigin as string),
    receiveHandler: async messageEvent => {
      const message = parseMessage(messageEvent);
      Log.debug('Frame Bridge Receive message: ', message);

      const response = await _core?.handleMessage(message);
      Log.debug('Frame Bridge response data: ', response);
      return response;
    },
  });

  await sendMessage(createIFrameMessage(IFRAME.INIT_BRIDGE, {}), false);
}

window.addEventListener('message', handleMessage, false);
