import EventEmitter from 'events';
import HardwareSdk, {
  HardwareSDKLowLevel as HardwareLowLevelSdk,
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
  probeUsbDeviceIdentitiesWithTransport,
  setLoggerPostMessage,
  switchTransport as switchCoreTransport,
} from '@onekeyfe/hd-core';
import { ERRORS, HardwareErrorCode, createDeferred } from '@onekeyfe/hd-shared';
import HttpTransport from '@onekeyfe/hd-transport-http';
import { ElectronBleTransport, WebUsbTransport } from '@onekeyfe/hd-transport-web-device';
import LowlevelTransport from '@onekeyfe/hd-transport-lowlevel';
import EmulatorTransport from '@onekeyfe/hd-transport-emulator';

import type { Deferred } from '@onekeyfe/hd-shared';
import type {
  ConnectSettings,
  Core,
  CoreMessage,
  LowLevelCoreApi,
  UiResponseEvent,
  UsbDeviceIdentity,
} from '@onekeyfe/hd-core';
import type { LowlevelTransportSharedPlugin } from '@onekeyfe/hd-transport';

const eventEmitter = new EventEmitter();
const Log = getLogger(LoggerNames.HdCommonConnectSdk);

const getTransport = async (env: ConnectSettings['env']) => {
  if (env === 'react-native') {
    throw ERRORS.TypedError(
      HardwareErrorCode.TransportNotConfigured,
      'React Native transport is not supported by @onekeyfe/hd-common-connect-sdk'
    );
  }
  if (env === 'desktop-web-ble') {
    return ElectronBleTransport;
  }
  if (env === 'webusb' || env === 'desktop-webusb') return WebUsbTransport;
  if (env === 'lowlevel') return LowlevelTransport;
  if (env === 'node-usb') {
    const { default: NodeUsbTransport } = await import('@onekeyfe/hd-transport-usb');
    // Browser bundlers replace this Node-only package with an empty module.
    if (typeof NodeUsbTransport !== 'function') {
      throw ERRORS.TypedError(
        HardwareErrorCode.TransportNotConfigured,
        'Node USB requires Node.js'
      );
    }
    return NodeUsbTransport;
  }
  if (env === 'emulator') return EmulatorTransport;
  return HttpTransport;
};

let _core: Core | undefined;
let _plugin: LowlevelTransportSharedPlugin | undefined;
let _settings = parseConnectSettings();
let lifecycle = Promise.resolve<unknown>(undefined);
const pendingInitializations = new Set<AbortController>();

const usbIdentityProbeTransports: Partial<Record<UsbDeviceIdentity['commType'], WebUsbTransport>> =
  {};
const usbIdentityProbes: Partial<
  Record<UsbDeviceIdentity['commType'], Promise<UsbDeviceIdentity[]>>
> = {};

/** Identify WebUSB without disposing the current SDK, changing settings, or opening a wallet. */
export const probeUsbDeviceIdentities = ({
  commType,
}: {
  commType: UsbDeviceIdentity['commType'];
}): Promise<UsbDeviceIdentity[]> => {
  if (commType !== 'webusb') {
    return Promise.reject(ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter));
  }
  const pending = usbIdentityProbes[commType];
  if (pending) return pending;
  let transport = usbIdentityProbeTransports[commType];
  if (!transport) {
    transport = new WebUsbTransport(true);
    usbIdentityProbeTransports[commType] = transport;
  }
  const probe = probeUsbDeviceIdentitiesWithTransport(transport, commType, descriptor =>
    _core?.getOwnedUsbDeviceIdentity(descriptor)
  ).finally(() => {
    delete usbIdentityProbes[commType];
  });
  usbIdentityProbes[commType] = probe;
  return probe;
};

let _messageID = 0;
export const messagePromises: { [key: number]: Deferred<any> } = {};

const dispose = async () => {
  const core = _core;
  pendingInitializations.forEach(controller => controller.abort());
  pendingInitializations.clear();
  const pending = lifecycle.catch(() => undefined);
  _core = undefined;
  _plugin = undefined;
  eventEmitter.removeAllListeners();
  Object.keys(messagePromises).forEach(key => {
    delete messagePromises[Number(key)];
  });
  _settings = parseConnectSettings();
  const disposing = Promise.all([pending, core?.dispose()]);
  lifecycle = disposing;
  await disposing;
};

const uiResponse = (response: UiResponseEvent) => {
  if (!_core) {
    throw ERRORS.TypedError(HardwareErrorCode.NotInitialized);
  }
  _core
    .handleMessage({ ...response, event: UI_EVENT } as CoreMessage)
    .catch(error => Log.error(createErrorMessage(error)));
};

const cancel = (connectId?: string) => {
  if (_core === undefined) return;
  _core
    .handleMessage({ event: IFRAME.CANCEL, type: IFRAME.CANCEL, payload: { connectId } })
    .catch(error => Log.debug('cancel error: ', error));
};

function handleMessage(message: CoreMessage) {
  const { event } = message;
  if (!_core) {
    return;
  }

  switch (event) {
    case UI_EVENT:
      // pass UI event up
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
  if (!_core) {
    throw ERRORS.TypedError('postMessage: _core not found');
  }

  if (usePromise) {
    _messageID++;
    const messageId = _messageID;
    messagePromises[messageId] = createDeferred();
    try {
      return await _core.handleMessage({ ...message, id: `${messageId}` });
    } finally {
      delete messagePromises[messageId];
    }
  }

  _core.handleMessage(message);
}

const init = (
  settings: Partial<ConnectSettings>,
  _?: LowLevelCoreApi,
  plugin?: LowlevelTransportSharedPlugin
) => {
  _settings = { ..._settings, ...settings, env: settings.env ?? 'node' };
  const initSettings = _settings;
  const controller = new AbortController();
  const { signal } = controller;
  pendingInitializations.add(controller);

  const initialize = async () => {
    if (signal.aborted) return false;
    enableLog(!!settings.debug);
    Log.debug('init');

    try {
      const Transport = await getTransport(initSettings.env);
      if (signal.aborted) return false;

      const previous = _core;
      _core = undefined;
      _plugin = undefined;
      if (previous) await previous.dispose();
      if (signal.aborted) return false;
      const core = await initCore(initSettings, Transport, plugin, signal);
      if (!core) return false;
      if (signal.aborted) {
        await core.dispose();
        return false;
      }
      _core = core;
      _plugin = plugin;
      core.on(CORE_EVENT, handleMessage);
      setLoggerPostMessage(handleMessage);
      return true;
    } catch (error) {
      Log.error(createErrorMessage(error));
      return false;
    }
  };

  const initializing = lifecycle.then(initialize, initialize).finally(() => {
    pendingInitializations.delete(controller);
  });
  lifecycle = initializing;
  return initializing;
};

const call = async (params: any) => {
  const blockLog = getLogBlockLabel(params);
  Log.debug('call: ', blockLog ?? params);

  try {
    const response = await postMessage({ event: IFRAME.CALL, type: IFRAME.CALL, payload: params });
    if (response) {
      Log.debug('response: ', blockLog ? '[REDACTED]' : response);

      if (!response.success) {
        const emitBleUiWarning = (message: CoreMessage) => {
          postMessage(message, false).catch(error =>
            Log.debug('postMessage warning error: ', error)
          );
        };
        if (response.payload?.code === HardwareErrorCode.BleUnsupported) {
          emitBleUiWarning(createUiMessage(UI_REQUEST.BLUETOOTH_UNSUPPORTED));
        }
        if (response.payload?.code === HardwareErrorCode.BlePoweredOff) {
          emitBleUiWarning(createUiMessage(UI_REQUEST.BLUETOOTH_POWERED_OFF));
        }
        if (response.payload?.code === HardwareErrorCode.BlePermissionError) {
          emitBleUiWarning(createUiMessage(UI_REQUEST.BLUETOOTH_PERMISSION));
        }
        if (response.payload?.code === HardwareErrorCode.BleLocationError) {
          emitBleUiWarning(createUiMessage(UI_REQUEST.LOCATION_PERMISSION));
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

const addHardwareGlobalEventListener = (listener: (message: CoreMessage) => void) => {
  [
    UI_EVENT,
    LOG_EVENT,
    FIRMWARE_EVENT,
    DEVICE.CONNECT,
    DEVICE.DISCONNECT,
    DEVICE.FEATURES,
    DEVICE.STATE,
    DEVICE.SUPPORT_FEATURES,
  ].forEach(eventName => {
    eventEmitter.on(eventName, (message: CoreMessage) => {
      // Match the Web SDK envelope for device events emitted as payloads.
      const envelope = message as { event?: string; type?: string } | null | undefined;
      let emitMessage = message;
      if (envelope && typeof envelope === 'object' && !envelope.event && !envelope.type) {
        emitMessage = { ...message };
        Object.assign(emitMessage, { event: eventName, type: eventName });
      }
      listener(emitMessage);
    });
  });
};

export const HardwareSDKLowLevel = HardwareLowLevelSdk({
  eventEmitter,
  init: (settings, sdk, plugin) => init({ ..._settings, ...settings }, sdk, plugin),
  call,
  cancel,
  dispose,
  addHardwareGlobalEventListener,
  uiResponse,
  updateSettings: (settings: Partial<ConnectSettings>) => {
    if (_core || pendingInitializations.size > 0) {
      return Promise.reject(ERRORS.TypedError(HardwareErrorCode.IFrameAleradyInitialized));
    }
    _settings = parseConnectSettings({ ..._settings, ...settings });
    return Promise.resolve(true);
  },
  switchTransport: async (env: ConnectSettings['env']) => {
    const owner = _core;
    if (!owner) throw ERRORS.TypedError(HardwareErrorCode.NotInitialized);
    await switchCoreTransport({
      env,
      owner,
      loadTransport: () => getTransport(env),
      plugin: _plugin,
    });
    return { success: true, payload: {} };
  },
});

const HardwareCommonConnectSdk = HardwareSdk({
  eventEmitter,
  init,
  call,
  cancel,
  dispose,
  uiResponse,
  updateSettings,
  switchTransport,
});

export default HardwareCommonConnectSdk;
