import HttpTransport from '@onekeyfe/hd-transport-http';
import WebusbTransport from '@onekeyfe/hd-transport-webusb';
import {
  PostMessageEvent,
  IFRAME,
  parseMessage,
  DataManager,
  parseConnectSettings,
  IFrameInit,
  createIFrameMessage,
  createErrorMessage,
  initCore,
  Core,
  CORE_EVENT,
  getLogger,
  LoggerNames,
  LogBlockEvent,
} from '@onekeyfe/hd-core';
import { get } from 'lodash';
import { getOrigin } from '../utils/urlUtils';
import { sendMessage, createJsBridge } from '../utils/bridgeUtils';

import JSBridgeConfig from './bridge-config';
import { isExtensionWhitelisted, isOriginWhitelisted } from '..';

let _core: Core | undefined;
const Log = getLogger(LoggerNames.Iframe);

const handleMessage = (event: PostMessageEvent) => {
  if (event.source === window || !event.data) return;

  // is message from popup or extension
  const whitelist = isOriginWhitelisted(event.origin) || isExtensionWhitelisted(event.origin);
  const isTrustedDomain = event.origin === window.location.origin || !!whitelist;

  // ignore messages from domain other then parent.window or popup.window or chrome extension
  const eventOrigin = getOrigin(event.origin);

  if (
    !isTrustedDomain &&
    eventOrigin !== DataManager.getSettings('origin') &&
    eventOrigin !== getOrigin(document.referrer)
  ) {
    return;
  }

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
    const Transport = settings.env === 'webusb' ? WebusbTransport : HttpTransport;
    _core = await initCore(settings, Transport);
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
      const blockLog = LogBlockEvent.has(get(message, 'type')) ? message.type : undefined;
      if (blockLog) {
        Log.debug('Frame Bridge Receive message: ', blockLog);
      } else {
        Log.debug('Frame Bridge Receive message: ', message);
      }

      const response = await _core?.handleMessage(message);
      if (blockLog) {
        Log.debug('Frame Bridge response message: ', blockLog);
      } else {
        Log.debug('Frame Bridge response message: ', message);
      }
      return response;
    },
  });

  await sendMessage(createIFrameMessage(IFRAME.INIT_BRIDGE, {}), false);
}

window.addEventListener('message', handleMessage, false);
