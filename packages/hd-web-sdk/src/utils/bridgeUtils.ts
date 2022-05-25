import { CoreMessage } from '@onekeyfe/hd-core';
import JSBridgeConfig from '../iframe/bridge-config';

export const sendMessage = async (messages: CoreMessage, isHost = true): Promise<any> => {
  const bridge = isHost ? window.hostBridge : window.frameBridge;

  try {
    const result = await bridge?.request({
      scope: JSBridgeConfig.scope,
      data: { ...messages },
    });

    return result;
  } catch (error) {
    throw new Error(error);
  }
};
