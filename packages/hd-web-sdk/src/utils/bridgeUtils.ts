import { JsBridgeIframe, setPostMessageListenerFlag } from '@onekeyfe/cross-inpage-provider-core';
import { LoggerNames, getLogBlockLabel, getLogger } from '@onekeyfe/hd-core';
import { ERRORS } from '@onekeyfe/hd-shared';

import JSBridgeConfig from '../iframe/bridge-config';

import type { CoreMessage } from '@onekeyfe/hd-core';
import type { IJsBridgeIframeConfig } from '@onekeyfe/cross-inpage-provider-core';

// eslint-disable-next-line import/no-mutable-exports
let frameBridge: JsBridgeIframe;
// eslint-disable-next-line import/no-mutable-exports
let hostBridge: JsBridgeIframe;

const Log = getLogger(LoggerNames.SendMessage);

export const resetListenerFlag = () => setPostMessageListenerFlag(false);

export const createJsBridge = (params: IJsBridgeIframeConfig & { isHost: boolean }) => {
  const bridge = new JsBridgeIframe(params);
  if (params.isHost) {
    hostBridge = bridge;
  } else {
    frameBridge = bridge;
  }
};

export const sendMessage = async (messages: CoreMessage, isHost = true): Promise<any> => {
  const bridge = isHost ? hostBridge : frameBridge;

  try {
    const blockLog = getLogBlockLabel(messages);
    if (messages.event !== 'LOG_EVENT') {
      if (blockLog) {
        Log.debug('request: ', blockLog);
      } else {
        Log.debug('request: ', messages);
      }
    }
    const result = await bridge?.request({
      scope: JSBridgeConfig.scope,
      data: { ...messages },
    });
    if (messages.event !== 'LOG_EVENT') {
      if (blockLog) {
        Log.debug('request result: ', blockLog);
      } else {
        Log.debug('request result: ', result);
      }
    }
    return result;
  } catch (error) {
    Log.error(error);
    throw ERRORS.CreateErrorByMessage(error.message);
  }
};

export { frameBridge, hostBridge };
