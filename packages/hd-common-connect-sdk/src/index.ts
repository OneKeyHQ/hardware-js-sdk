import { EventEmitter } from 'events';
import HardwareSdk, {
  CORE_EVENT,
  DEVICE,
  DEVICE_EVENT,
  FIRMWARE_EVENT,
  IFRAME,
  LOG_EVENT,
  LoggerNames,
  UI_EVENT,
  UI_REQUEST,
  createErrorMessage,
  createUiMessage,
  enableLog,
  executeCallback,
  getLogBlockLabel,
  getLogger,
  initCore,
  parseConnectSettings,
  setLoggerPostMessage,
} from '@onekeyfe/hd-core';
import { ERRORS, HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';
import EmulatorTransport from '@onekeyfe/hd-transport-emulator';
import HttpTransport from '@onekeyfe/hd-transport-http';
import LowlevelTransport from '@onekeyfe/hd-transport-lowlevel';
import { ElectronBleTransport, WebUsbTransport } from '@onekeyfe/hd-transport-web-device';

import type {
  ConnectSettings,
  Core,
  CoreApi,
  CoreMessage,
  CoreMethodExtension,
  LowLevelCoreApi,
  UiResponseEvent,
} from '@onekeyfe/hd-core';
import type { Deferred } from '@onekeyfe/hd-shared';
import type { LowlevelTransportSharedPlugin } from '@onekeyfe/hd-transport';

const Log = getLogger(LoggerNames.HdCommonConnectSdk);

const getTransport = async (env: ConnectSettings['env']) => {
  if (env === 'desktop-web-ble') {
    return ElectronBleTransport;
  }
  if (env === 'webusb' || env === 'desktop-webusb') return WebUsbTransport;
  if (env === 'lowlevel') return LowlevelTransport;
  if (env === 'node-usb') {
    // Keep the native libusb binding out of browser and React Native bundles.
    const { default: NodeUsbTransport } = await import('@onekeyfe/hd-transport-usb');
    return NodeUsbTransport;
  }
  if (env === 'emulator') return EmulatorTransport;
  return HttpTransport;
};

export type HardwareCommonConnectSdkExtension<TExtensionApi extends object> = {
  methodExtensions: readonly CoreMethodExtension[];
  createApi: (call: CoreApi['call']) => TExtensionApi;
};

export type HardwareCommonConnectSdkOptions<TExtensionApi extends object> = {
  extension?: HardwareCommonConnectSdkExtension<TExtensionApi>;
  allowDestructiveOperations?: boolean;
};

type SdkInstance<TExtensionApi extends object> = {
  sdk: CoreApi & TExtensionApi;
  messagePromises: { [key: number]: Deferred<any> };
};

const createSdkInstance = <TExtensionApi extends object>(
  options: HardwareCommonConnectSdkOptions<TExtensionApi> = {}
): SdkInstance<TExtensionApi> => {
  const eventEmitter = new EventEmitter();
  let core: Core | undefined;
  let settings = parseConnectSettings();
  let messageID = 0;
  const instanceMessagePromises: { [key: number]: Deferred<any> } = {};

  const dispose = async () => {
    const currentCore = core;
    core = undefined;
    eventEmitter.removeAllListeners();
    Object.keys(instanceMessagePromises).forEach(key => {
      delete instanceMessagePromises[Number(key)];
    });
    settings = parseConnectSettings();
    await currentCore?.dispose?.();
  };

  const uiResponse = (response: UiResponseEvent) => {
    if (!core) {
      throw ERRORS.TypedError(HardwareErrorCode.NotInitialized);
    }
    const { type, payload } = response;
    core
      .handleMessage({ event: UI_EVENT, type, payload } as CoreMessage)
      .catch(error => Log.error(createErrorMessage(error)));
  };

  const cancel = (connectId?: string) => {
    if (!core) return;
    core
      .handleMessage({
        event: IFRAME.CANCEL,
        type: IFRAME.CANCEL,
        payload: { connectId },
      })
      .catch(error => Log.error(createErrorMessage(error)));
  };

  function handleMessage(message: CoreMessage) {
    const { event } = message;
    if (!core) {
      return;
    }

    const blockLog = getLogBlockLabel(message);
    if (event !== LOG_EVENT) {
      Log.debug('hd-common-connect-sdk handleMessage', blockLog ?? message);
    }
    switch (event) {
      case UI_EVENT:
        eventEmitter.emit(message.event, message);
        eventEmitter.emit(message.type, message.payload);
        break;
      case LOG_EVENT:
      case FIRMWARE_EVENT:
        eventEmitter.emit(message.event, message);
        break;
      case DEVICE_EVENT:
        if (
          (
            [
              DEVICE.CONNECT,
              DEVICE.DISCONNECT,
              DEVICE.FEATURES,
              DEVICE.STATE,
              DEVICE.SUPPORT_FEATURES,
            ] as string[]
          ).includes(message.type)
        ) {
          eventEmitter.emit(message.type, message.payload);
        }
        break;
      case IFRAME.CALLBACK: {
        const { callbackId, data, error } = message.payload;
        executeCallback(callbackId, data, error);
        break;
      }
      default:
        Log.log('No need to be captured message', message.event);
    }
  }

  async function postMessage(message: CoreMessage, usePromise = true) {
    if (!core) {
      throw ERRORS.TypedError('postMessage: _core not found');
    }

    if (usePromise) {
      messageID += 1;
      instanceMessagePromises[messageID] = createDeferred();
      return core.handleMessage({ ...message, id: `${messageID}` });
    }

    await core.handleMessage(message);
  }

  const init = async (
    partialSettings: Partial<ConnectSettings>,
    _?: LowLevelCoreApi,
    plugin?: LowlevelTransportSharedPlugin
  ) => {
    settings = { ...settings, ...partialSettings, env: partialSettings.env ?? 'node' };

    enableLog(!!partialSettings.debug);
    Log.debug('init');

    try {
      const Transport = await getTransport(settings.env);
      if (options.extension) {
        core = await initCore(settings, Transport, plugin, {
          methodExtensions: options.extension.methodExtensions,
          allowDestructiveOperations: options.allowDestructiveOperations === true,
        });
      } else {
        core = await initCore(settings, Transport, plugin);
      }
      core?.on(CORE_EVENT, handleMessage);
      setLoggerPostMessage(handleMessage);

      return true;
    } catch (error) {
      Log.error(createErrorMessage(error));
      return false;
    }
  };

  const call: CoreApi['call'] = async params => {
    const blockLog = getLogBlockLabel(params);
    Log.debug('call: ', blockLog ?? params);

    try {
      const response = await postMessage({
        event: IFRAME.CALL,
        type: IFRAME.CALL,
        payload: params,
      });
      if (response) {
        Log.debug('response: ', blockLog ? '[REDACTED]' : response);

        if (!response.success) {
          if (response.payload?.code === HardwareErrorCode.BleUnsupported) {
            postMessage(createUiMessage(UI_REQUEST.BLUETOOTH_UNSUPPORTED), false).catch(error =>
              Log.error(createErrorMessage(error))
            );
          }
          if (response.payload?.code === HardwareErrorCode.BlePoweredOff) {
            postMessage(createUiMessage(UI_REQUEST.BLUETOOTH_POWERED_OFF), false).catch(error =>
              Log.error(createErrorMessage(error))
            );
          }
          if (response.payload?.code === HardwareErrorCode.BlePermissionError) {
            postMessage(createUiMessage(UI_REQUEST.BLUETOOTH_PERMISSION), false).catch(error =>
              Log.error(createErrorMessage(error))
            );
          }
        }

        return response;
      }

      return createErrorMessage(ERRORS.TypedError(HardwareErrorCode.CallMethodNotResponse));
    } catch (error) {
      Log.error('__call error: ', error);
      return createErrorMessage(error);
    }
  };

  const updateSettings = () => Promise.resolve(true);
  const switchTransport = () => Promise.resolve({ success: true });

  const sdk = HardwareSdk({
    eventEmitter,
    init,
    call,
    cancel,
    dispose,
    uiResponse,
    updateSettings,
    switchTransport,
  });
  const extensionApi = options.extension?.createApi(sdk.call) ?? ({} as TExtensionApi);

  return {
    sdk: Object.assign(sdk, extensionApi),
    messagePromises: instanceMessagePromises,
  };
};

export const createHardwareCommonConnectSdk = <TExtensionApi extends object = Record<never, never>>(
  options: HardwareCommonConnectSdkOptions<TExtensionApi> = {}
): CoreApi & TExtensionApi => createSdkInstance(options).sdk;

const { sdk: HardwareCommonConnectSdk, messagePromises } = createSdkInstance();

export { messagePromises };

export default HardwareCommonConnectSdk;
