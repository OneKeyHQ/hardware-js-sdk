import { IJsBridgeIframeConfig, JsBridgeIframe } from '@onekeyfe/cross-inpage-provider-core';
import { CoreMessage } from '@onekeyfe/hd-core';
import { ERRORS, getLogger, LoggerNames } from '@onekeyfe/hd-shared';
import JSBridgeConfig from '../iframe/bridge-config';

// eslint-disable-next-line import/no-mutable-exports
let frameBridge: JsBridgeIframe;
// eslint-disable-next-line import/no-mutable-exports
let hostBridge: JsBridgeIframe;

const Log = getLogger(LoggerNames.SendMessage);

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
    Log.debug('request: ', messages);
    const result = await bridge?.request({
      scope: JSBridgeConfig.scope,
      data: { ...messages },
    });
    Log.debug('response: ', result);
    return result;
  } catch (error) {
    Log.error(error);
    throw ERRORS.CreateErrorByMessage(error.message);
  }
};

export { frameBridge, hostBridge };
