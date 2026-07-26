import HttpTransport from '@onekeyfe/hd-transport-http';
import EmulatorTransport from '@onekeyfe/hd-transport-emulator';
import { WebUsbTransport } from '@onekeyfe/hd-transport-web-device';
import {
  CORE_EVENT,
  DataManager,
  IFRAME,
  LoggerNames,
  createErrorMessage,
  createIFrameMessage,
  getLogBlockLabel,
  getLogger,
  initCore,
  parseConnectSettings,
  parseMessage,
  switchTransport,
} from '@onekeyfe/hd-core';

import { getOrigin } from '../utils/urlUtils';
import { createJsBridge, sendMessage } from '../utils/bridgeUtils';
import { FirmwareIframeChannel } from '../firmware/FirmwareIframeChannel';
import { getFirmwareHostChannelTargetOrigin } from '../firmware/FirmwareHostChannelProtocol';
import JSBridgeConfig from './bridge-config';
import { isExtensionWhitelisted, isOriginWhitelisted } from '..';

import type { ConnectSettings, Core, IFrameInit, PostMessageEvent } from '@onekeyfe/hd-core';

let _core: Core | undefined;
let firmwareIframeChannel: FirmwareIframeChannel | undefined;
const Log = getLogger(LoggerNames.Iframe);

const getTransport = (env: ConnectSettings['env']) => {
  if (env === 'webusb' || env === 'desktop-webusb') return WebUsbTransport;
  if (env === 'emulator') return EmulatorTransport;
  return HttpTransport;
};

const handleMessage = (event: PostMessageEvent) => {
  if (event.source === window || !event.data) return;

  // is message from popup or extension
  const whitelist = isOriginWhitelisted(event.origin) || isExtensionWhitelisted(event.origin);
  const isTrustedDomain = event.origin === window.location.origin || !!whitelist;
  const isFileParent =
    event.source === window.parent &&
    event.origin === 'null' &&
    window.location.protocol === 'file:';

  // ignore messages from domain other then parent.window or popup.window or chrome extension
  const eventOrigin = getOrigin(event.origin);

  if (
    !isTrustedDomain &&
    !isFileParent &&
    eventOrigin !== DataManager.getSettings('origin') &&
    eventOrigin !== getOrigin(document.referrer)
  ) {
    return;
  }

  const message = parseMessage(event);

  if (message.type === IFRAME.INIT) {
    if (event.source !== window.parent) return;
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
  firmwareIframeChannel?.dispose();
  firmwareIframeChannel = new FirmwareIframeChannel({
    messageTarget: window,
    hostWindow: window.parent,
    expectedOrigin: settings.parentOrigin ?? payload.settings.origin ?? 'null',
  });
  firmwareIframeChannel.start();

  Log.enabled = !!settings.debug;

  try {
    const Transport = getTransport(settings.env);
    _core = await initCore(settings, Transport);
    _core?.on(CORE_EVENT, messages => sendMessage(messages, false));
  } catch (error) {
    firmwareIframeChannel.dispose();
    firmwareIframeChannel = undefined;
    return createErrorMessage(error);
  }

  createJsBridge({
    isHost: false,
    remoteFrame: window.parent,
    remoteFrameName: JSBridgeConfig.hostName,
    selfFrameName: JSBridgeConfig.iframeName,
    channel: JSBridgeConfig.channel,
    targetOrigin: getFirmwareHostChannelTargetOrigin(settings.parentOrigin as string),
    receiveHandler: async messageEvent => {
      const message = parseMessage(messageEvent);
      const blockLog = getLogBlockLabel(message);
      if (blockLog) {
        Log.debug('Frame Bridge Receive message: ', blockLog);
      } else {
        Log.debug('Frame Bridge Receive message: ', message);
      }

      if (message.event === IFRAME.SWITCH_TRANSPORT) {
        Log.debug('switchCoreTransport', message.payload.env);
        switchCoreTransport(message.payload.env);
        return { success: true, payload: {} };
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

export const switchCoreTransport = (env: ConnectSettings['env']) => {
  if (_core) {
    const Transport = getTransport(env);
    switchTransport({
      env,
      Transport,
    });
  }
};

window.addEventListener('unload', () => {
  firmwareIframeChannel?.dispose();
});
window.addEventListener('message', handleMessage, false);
