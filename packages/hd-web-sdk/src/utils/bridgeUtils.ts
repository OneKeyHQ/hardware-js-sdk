import {
  JsBridgeIframe,
  appDebugLogger,
  fakeDebugLogger,
  setPostMessageListenerFlag,
} from '@onekeyfe/cross-inpage-provider-core';
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

// Keep sensitive SDK payloads (e.g. Starknet viewing keys, signing calldata)
// out of cross-inpage-provider-core's jsBridge diagnostics by logging metadata only.
const createMetadataOnlyBridgeDebugLogger = (): IJsBridgeIframeConfig['debugLogger'] => {
  const logger = Object.create(fakeDebugLogger) as NonNullable<
    IJsBridgeIframeConfig['debugLogger']
  >;
  logger.jsBridge = (...args: unknown[]) => {
    const target = appDebugLogger.jsBridge as
      | (((...logArgs: unknown[]) => void) & { enabled?: boolean })
      | undefined;
    if (!target?.enabled) {
      return;
    }
    const [direction, payload] = args;
    const meta =
      payload && typeof payload === 'object'
        ? {
            id: (payload as { id?: unknown }).id,
            type: (payload as { type?: unknown }).type,
            scope: (payload as { scope?: unknown }).scope,
          }
        : undefined;
    target(direction, meta);
  };
  return logger;
};

export const resetListenerFlag = () => setPostMessageListenerFlag(false);

export const createJsBridge = (params: IJsBridgeIframeConfig & { isHost: boolean }) => {
  const bridge = new JsBridgeIframe({
    ...params,
    debugLogger: createMetadataOnlyBridgeDebugLogger(),
  });
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
