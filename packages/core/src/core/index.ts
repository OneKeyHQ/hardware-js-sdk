import EventEmitter from 'events';
import { OneKeyDeviceInfo } from '@onekeyfe/hd-transport';
import { ERRORS } from '../constants';
import { Device, DeviceEvents } from '../device/Device';
import { DeviceList } from '../device/DeviceList';
import { findMethod } from '../api/utils';
import { DataManager } from '../data-manager';
import { enableLog } from '../utils/logger';
import { initLog, create as createDeferred, Deferred } from '../utils';
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

const Log = initLog('Core');

let _core: Core;
let _deviceList: DeviceList | undefined;
let _connector: DeviceConnector | undefined;
let _uiPromises: UiPromise<UiPromiseResponse['type']>[] = []; // Waiting for ui response
let _callPromise: Deferred<any> | undefined;
const callApiQueue = [];

export const callAPI = async (message: CoreMessage) => {
  if (!message.id || !message.payload || message.type !== IFRAME.CALL) {
    return Promise.reject(
      ERRORS.TypedError(
        'Method_InvalidParameter',
        'onCall: message.id or message.payload is missing'
      )
    );
  }

  // find api method
  let method: BaseMethod;
  let messageResponse: any;
  try {
    method = findMethod(message as IFrameCallMessage);
    method.connector = _connector;
    method.init();
  } catch (error) {
    return Promise.reject(error);
  }

  if (!method.useDevice) {
    try {
      const response = await method.run();
      return createResponseMessage(method.responseID, true, response);
    } catch (error) {
      return createResponseMessage(method.responseID, false, error);
    }
  }

  // push method to queue
  callApiQueue.push(method);

  // update DeviceList every call and first configure transport messages
  try {
    await initDeviceList(method);
  } catch (error) {
    return Promise.reject(error);
  }

  const env = DataManager.getSettings('env');
  let device: Device;
  try {
    if (env === 'react-native') {
      device = initDeviceForBle(method);
    } else {
      device = initDevice(method);
    }
  } catch (error) {
    return Promise.reject(error);
  }

  Log.debug('Call API - setDevice: ', device);
  method.setDevice?.(device);

  device.on(DEVICE.PIN, onDevicePinHandler);
  device.on(DEVICE.BUTTON, (d, code) => {
    onDeviceButtonHandler(d, code);
  });

  try {
    const inner = async (): Promise<void> => {
      // check firmware status
      // const firmwareException = method.checkFirmwareRange();
      // if (firmwareException) {
      //   return Promise.reject(ERRORS.TypedError('Device_FwException', firmwareException));
      // }

      // check call method mode
      const unexpectedMode = device.hasUnexpectedMode(
        method.allowDeviceMode,
        method.requireDeviceMode
      );
      if (unexpectedMode) {
        return Promise.reject(ERRORS.TypedError('Device_UnexpectedMode', unexpectedMode));
      }

      // const deviceTypeException = method.checkDeviceType();
      // if (deviceTypeException) {
      //   return Promise.reject(ERRORS.TypedError('Not_Use_Onekey_Device'));
      // }

      // reconfigure messages
      if (_deviceList) {
        await TransportManager.reconfigure(device.getFirmwareVersion());
      }

      try {
        const response: object = await method.run();
        Log.debug('Call API - Inner Method Run: ', device);
        messageResponse = createResponseMessage(method.responseID, true, response);
        _callPromise?.resolve(messageResponse);
      } catch (error) {
        Log.debug('Call API - Inner Method Run Error: ', error);
        messageResponse = createResponseMessage(method.responseID, false, error.message);
        _callPromise?.resolve(messageResponse);
      }
    };
    Log.debug('Call API - Device Run: ', device);
    const deviceRun = () => device.run(inner);
    _callPromise = createDeferred(deviceRun);
    return await _callPromise.promise;
  } catch (error) {
    messageResponse = createResponseMessage(method.responseID, false, error);
    _callPromise?.reject(ERRORS.TypedError('Call_API', error));
  } finally {
    const response = messageResponse;

    if (response) {
      if (method) {
        method.dispose();
      }
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
  await _deviceList.getDeviceLists();
}

function initDevice(method: BaseMethod) {
  if (!_deviceList) {
    throw ERRORS.TypedError('Call_API', 'DeviceList is not initialized');
  }

  let device: Device | typeof undefined;
  const allDevices = _deviceList.allDevices();

  if (method.connectId) {
    device = _deviceList.getDevice(method.connectId);
  } else if (allDevices.length === 1) {
    [device] = allDevices;
  } else if (allDevices.length > 1) {
    throw ERRORS.TypedError('Call_API', '请选择连接设备');
  }

  if (!device) {
    throw ERRORS.TypedError('Call_API', 'Device Not Found');
  }

  // inject properties
  device.deviceConnector = _connector;

  return device;
}

function initDeviceForBle(method: BaseMethod) {
  if (!method.connectId && !_deviceList) {
    throw ERRORS.TypedError('Call_API', 'DeviceList is not initialized');
  }

  if (!method.connectId) {
    return initDevice(method);
  }

  const device = Device.fromDescriptor({ id: method.connectId } as OneKeyDeviceInfo);
  device.deviceConnector = _connector;
  return device;
}

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
  console.log('onDevicePinHandler');
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
  postMessage(createUiMessage(UI_REQUEST.REQUEST_BUTTON, { device: device.toMessageObject() }));
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

      case IFRAME.CALL: {
        const response = await callAPI(message);
        return response;
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
    initCore();
    initConnector();

    return _core;
  } catch (error) {
    Log.error('core init', error);
  }
};
