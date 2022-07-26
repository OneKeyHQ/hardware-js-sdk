import semver from 'semver';
import EventEmitter from 'events';
import { OneKeyDeviceInfo } from '@onekeyfe/hd-transport';
import { createDeferred, Deferred, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Device, DeviceEvents } from '../device/Device';
import { DeviceList } from '../device/DeviceList';
import { findMethod } from '../api/utils';
import { DataManager } from '../data-manager';
import { enableLog, getLogger, LoggerNames, setLoggerPostMessage } from '../utils';
import {
  CoreMessage,
  createResponseMessage,
  DEVICE,
  IFRAME,
  IFrameCallMessage,
  CORE_EVENT,
  UI_REQUEST,
  UI_RESPONSE,
  UiPromise,
  UiPromiseResponse,
  createUiMessage,
  createDeviceMessage,
} from '../events';
import type { BaseMethod } from '../api/BaseMethod';
import type { ConnectSettings, KnownDevice } from '../types';
import TransportManager from '../data-manager/TransportManager';
import DeviceConnector from '../device/DeviceConnector';
import {
  getDeviceFirmwareVersion,
  getDeviceModel,
  getDeviceType,
} from '../utils/deviceFeaturesUtils';

const Log = getLogger(LoggerNames.Core);

let _core: Core;
let _deviceList: DeviceList | undefined;
let _connector: DeviceConnector | undefined;
let _uiPromises: UiPromise<UiPromiseResponse['type']>[] = []; // Waiting for ui response
let _callPromise: Deferred<any> | undefined;
const callApiQueue: BaseMethod[] = [];

const deviceCacheMap = new Map<string, Device>();
let pollingId = 1;
const pollingState: Record<number, boolean> = {};

export const callAPI = async (message: CoreMessage) => {
  if (!message.id || !message.payload || message.type !== IFRAME.CALL) {
    return Promise.reject(ERRORS.TypedError('on call: message.id or message.payload is missing'));
  }

  // find api method
  let method: BaseMethod;
  let messageResponse: any;
  try {
    method = findMethod(message as IFrameCallMessage);
    method.connector = _connector;
    method.postMessage = postMessage;
    method.init();
  } catch (error) {
    return Promise.reject(error);
  }

  if (!method.useDevice) {
    try {
      const response = await method.run();
      return createResponseMessage(method.responseID, true, response);
    } catch (error) {
      return createResponseMessage(method.responseID, false, { error });
    }
  }

  // push method to queue
  callApiQueue.push(method);

  if (callApiQueue.length > 1) {
    Log.debug('should cancel the previous method execution: ', callApiQueue);
  }

  /**
   * Polling to ensure successful connection
   */
  if (pollingState[pollingId]) {
    pollingState[pollingId] = false;
  }
  pollingId += 1;
  let device: Device;
  try {
    device = await ensureConnected(method, pollingId);
  } catch (e) {
    return createResponseMessage(method.responseID, false, { error: e });
  }

  Log.debug('Call API - setDevice: ', device.mainId);
  method.setDevice?.(device);

  device.on(DEVICE.PIN, onDevicePinHandler);
  device.on(DEVICE.BUTTON, (d, code) => {
    onDeviceButtonHandler(d, code);
  });

  try {
    const inner = async (): Promise<void> => {
      // check firmware version
      const deviceType = getDeviceType(device.features);
      const deviceModel = getDeviceModel(device.features);
      const versionRangeType = method.getVersionRange()[deviceType];
      const versionRangeModel = method.getVersionRange()[deviceModel];

      // Type has a higher priority than Model
      const versionRange = versionRangeType ?? versionRangeModel;

      if (versionRange && device.features) {
        const currentVersion = getDeviceFirmwareVersion(device.features).join('.');
        if (semver.valid(versionRange.min) && semver.lt(currentVersion, versionRange.min)) {
          return Promise.reject(
            ERRORS.TypedError(
              HardwareErrorCode.DeviceFwException,
              `Device firmware version is too low, please update to ${versionRange.min}`
            )
          );
        }
        if (
          versionRange.max &&
          semver.valid(versionRange.max) &&
          semver.gt(currentVersion, versionRange.max)
        ) {
          return Promise.reject(
            ERRORS.TypedError(
              HardwareErrorCode.DeviceFwException,
              `Device firmware version is too high, this method has been deprecated in ${versionRange.max}`
            )
          );
        }
      }

      // check call method mode
      const unexpectedMode = device.hasUnexpectedMode(
        method.allowDeviceMode,
        method.requireDeviceMode
      );
      if (unexpectedMode) {
        if (unexpectedMode === UI_REQUEST.NOT_IN_BOOTLOADER) {
          return Promise.reject(
            ERRORS.TypedError(HardwareErrorCode.DeviceUnexpectedBootloaderMode)
          );
        }
        return Promise.reject(
          ERRORS.TypedError(HardwareErrorCode.DeviceUnexpectedMode, unexpectedMode)
        );
      }

      if (method.deviceId && method.checkDeviceId) {
        const isSameDeviceID = device.checkDeviceId(method.deviceId);
        if (!isSameDeviceID) {
          return Promise.reject(ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError));
        }
      }

      // reconfigure messages
      if (_deviceList) {
        await TransportManager.reconfigure(device.getFirmwareVersion());
      }

      try {
        const response: object = await method.run();
        Log.debug('Call API - Inner Method Run: ');
        messageResponse = createResponseMessage(method.responseID, true, response);
        _callPromise?.resolve(messageResponse);
      } catch (error) {
        Log.debug('Call API - Inner Method Run Error: ', error);
        messageResponse = createResponseMessage(method.responseID, false, { error });
        _callPromise?.resolve(messageResponse);
      }
    };
    Log.debug('Call API - Device Run: ', device.mainId);
    const deviceRun = () => device.run(inner);
    _callPromise = createDeferred(deviceRun);

    try {
      return await _callPromise.promise;
    } catch (e) {
      Log.debug('Device Run Error: ', e);
      return createResponseMessage(method.responseID, false, { error: e });
    }
  } catch (error) {
    messageResponse = createResponseMessage(method.responseID, false, { error });
    _callPromise?.reject(ERRORS.TypedError(HardwareErrorCode.CallMethodError, error.message));
    Log.debug('Call API - Run Error: ', error);
  } finally {
    const response = messageResponse;

    if (response) {
      if (method) {
        method.dispose();
      }
    }

    // remove method from queue
    const index =
      messageResponse && messageResponse.id
        ? callApiQueue.findIndex(m => m.responseID === messageResponse.id)
        : -1;
    if (index > -1) {
      callApiQueue.splice(index, 1);
      Log.debug('Remove the finished method from the queue： ', callApiQueue);
    }

    closePopup();

    cleanup();
    // TODO: 方法执行后，检查队列内是否有等待调用的 API，依次调用
  }
};

async function initDeviceList(method: BaseMethod) {
  const env = DataManager.getSettings('env');
  if (env === 'react-native' && method.connectId) {
    await TransportManager.configure();
    return;
  }

  if (!_deviceList) {
    _deviceList = new DeviceList();
    await TransportManager.configure();
    _deviceList.connector = _connector;
  }

  await _deviceList.getDeviceLists(method.connectId);
}

function initDevice(method: BaseMethod) {
  if (!_deviceList) {
    throw ERRORS.TypedError(HardwareErrorCode.DeviceListNotInitialized);
  }

  let device: Device | typeof undefined;
  const allDevices = _deviceList.allDevices();

  if (method.connectId) {
    device = _deviceList.getDevice(method.connectId);
  } else if (allDevices.length === 1) {
    [device] = allDevices;
  } else if (allDevices.length > 1) {
    throw ERRORS.TypedError(HardwareErrorCode.SelectDevice);
  }

  if (!device) {
    throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
  }

  // inject properties
  device.deviceConnector = _connector;

  return device;
}

function initDeviceForBle(method: BaseMethod) {
  if (!method.connectId && !_deviceList) {
    throw ERRORS.TypedError(HardwareErrorCode.DeviceListNotInitialized);
  }

  if (!method.connectId) {
    return initDevice(method);
  }

  let device: Device;
  if (deviceCacheMap.has(method.connectId)) {
    device = deviceCacheMap.get(method.connectId) as Device;
  } else {
    device = Device.fromDescriptor({ id: method.connectId } as OneKeyDeviceInfo);
    deviceCacheMap.set(method.connectId, device);
  }
  device.deviceConnector = _connector;
  return device;
}

type IPollFn<T> = (time?: number) => T;
// eslint-disable-next-line @typescript-eslint/require-await
const ensureConnected = async (method: BaseMethod, pollingId: number) => {
  let tryCount = 0;
  const MAX_RETRY_COUNT = (method.payload && method.payload.retryCount) || 5;
  const POLL_INTERVAL_TIME = (method.payload && method.payload.pollIntervalTime) || 1000;
  const TIME_OUT = (method.payload && method.payload.timeout) || 10000;
  let timer: ReturnType<typeof setTimeout> | null = null;

  Log.debug(
    `EnsureConnected function start, MAX_RETRY_COUNT=${MAX_RETRY_COUNT}, POLL_INTERVAL_TIME=${POLL_INTERVAL_TIME}  `
  );

  const poll: IPollFn<Promise<Device>> = async (time = POLL_INTERVAL_TIME) =>
    // eslint-disable-next-line no-async-promise-executor
    new Promise(async (resolve, reject) => {
      if (!pollingState[pollingId]) {
        Log.debug('EnsureConnected function stop, polling id: ', pollingId);
        reject(ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Polling stop'));
        return;
      }

      // 单次连接确保不超时
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        reject(ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Polling timeout'));
      }, TIME_OUT);

      tryCount += 1;
      Log.debug('EnsureConnected function try count: ', tryCount, ' poll interval time: ', time);
      try {
        await initDeviceList(method);
      } catch (error) {
        console.log('device list error: ', error);
        if (error.errorCode === HardwareErrorCode.BridgeNotInstalled) {
          reject(error);
          return;
        }
        if (error.errorCode === HardwareErrorCode.TransportNotConfigured) {
          await TransportManager.configure();
        }
      }

      const env = DataManager.getSettings('env');
      let device: Device;
      try {
        if (env === 'react-native') {
          device = initDeviceForBle(method);
        } else {
          device = initDevice(method);
        }

        if (device) {
          if (timer) {
            clearTimeout(timer);
          }
          /**
           * Bluetooth should call initialize here
           */
          if (env === 'react-native') {
            await device.acquire();
            await device.initialize();
          }
          resolve(device);
          return;
        }
      } catch (error) {
        console.log('device error: ', error);
      }

      if (tryCount > 5) {
        if (timer) {
          clearTimeout(timer);
        }
        Log.debug('EnsureConnected get to max try count, will return: ', tryCount);
        reject(ERRORS.TypedError(HardwareErrorCode.DeviceNotFound));
        return;
      }
      // eslint-disable-next-line no-promise-executor-return
      return setTimeout(() => resolve(poll(time * 1.5)), time);
    });
  pollingState[pollingId] = true;
  return poll();
};

export const cancel = (connectId?: string) => {
  const env = DataManager.getSettings('env');
  try {
    if (connectId) {
      let device;
      if (env === 'react-native') {
        device = initDeviceForBle({ connectId } as BaseMethod);
      } else {
        device = initDevice({ connectId } as BaseMethod);
      }
      device?.interruptionFromUser();
    }
  } catch (e) {
    // Empty
    Log.error('Cancel API Error: ', e);
  }
  cleanup();
  closePopup();
};

const cleanup = () => {
  _uiPromises = [];
  Log.debug('Cleanup...');
};

/**
 * Force close popup
 */
const closePopup = () => {
  postMessage(createUiMessage(UI_REQUEST.CLOSE_UI_WINDOW));
};

const onDevicePinHandler = async (...[device, type, callback]: DeviceEvents['pin']) => {
  Log.debug('onDevicePinHandler');
  // create ui promise
  const uiPromise = createUiPromise(UI_RESPONSE.RECEIVE_PIN, device);
  // request pin view
  postMessage(
    createUiMessage(UI_REQUEST.REQUEST_PIN, {
      device: device.toMessageObject() as unknown as KnownDevice,
      type,
    })
  );
  // wait for pin
  const uiResp = await uiPromise.promise;
  // callback.apply(null, [null, pin]);
  callback(null, uiResp.payload);
};

const onDeviceButtonHandler = (...[device, request]: [...DeviceEvents['button']]) => {
  postMessage(createDeviceMessage(DEVICE.BUTTON, { ...request, device: device.toMessageObject() }));

  if (request.code === 'ButtonRequest_PinEntry') {
    postMessage(
      createUiMessage(UI_REQUEST.REQUEST_PIN, {
        device: device.toMessageObject() as KnownDevice,
        type: 'ButtonRequest_PinEntry',
      })
    );
  } else {
    postMessage(createUiMessage(UI_REQUEST.REQUEST_BUTTON, { device: device.toMessageObject() }));
  }
};

/**
 * Emit message to listener (parent).
 * Clear method reference from _callMethods
 * @param {CoreMessage} message
 * @returns {void}
 * @memberof Core
 */
const postMessage = (message: CoreMessage) => {
  _core.emit(CORE_EVENT, message);
};

const createUiPromise = <T extends UiPromiseResponse['type']>(promiseEvent: T, device?: Device) => {
  const uiPromise: UiPromise<T> = createDeferred(promiseEvent, device);
  _uiPromises.push(uiPromise as any);

  return uiPromise;
};

const findUiPromise = <T extends UiPromiseResponse['type']>(promiseEvent: T) =>
  _uiPromises.find(p => p.id === promiseEvent) as UiPromise<T> | undefined;

const removeUiPromise = (promise: Deferred<any>) => {
  _uiPromises = _uiPromises.filter(p => p !== promise);
};

export default class Core extends EventEmitter {
  async handleMessage(message: CoreMessage) {
    switch (message.type) {
      case UI_RESPONSE.RECEIVE_PIN: {
        const uiPromise = findUiPromise(message.type);
        if (uiPromise) {
          uiPromise.resolve(message);
          removeUiPromise(uiPromise);
        }
        break;
      }

      case UI_REQUEST.BLUETOOTH_PERMISSION:
      case UI_REQUEST.LOCATION_PERMISSION: {
        postMessage(message);
        break;
      }

      case IFRAME.CALL: {
        const response = await callAPI(message);
        return response;
      }
      case IFRAME.CANCEL: {
        cancel(message.payload.connectId);
        break;
      }
      default:
        break;
    }
    return Promise.resolve(message);
  }

  dispose() {
    // empty
  }
}

export const initCore = () => {
  _core = new Core();
  return _core;
};

export const initConnector = () => {
  _connector = new DeviceConnector();
  return _connector;
};

const initTransport = (Transport: any) => {
  TransportManager.setTransport(Transport);
};

export const init = async (settings: ConnectSettings, Transport: any) => {
  try {
    try {
      await DataManager.load(settings);
      initTransport(Transport);
    } catch {
      Log.error('DataManager.load error');
    }
    enableLog(DataManager.getSettings('debug'));
    if (DataManager.getSettings('env') !== 'react-native') {
      setLoggerPostMessage(postMessage);
    }
    initCore();
    initConnector();

    return _core;
  } catch (error) {
    Log.error('core init', error);
  }
};
