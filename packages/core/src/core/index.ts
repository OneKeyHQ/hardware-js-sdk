import EventEmitter from 'events';
import { ERRORS } from '../constants';
import { DeviceList } from '../device/DeviceList';
import { initLog, create as createDeferred, Deferred } from '../utils';
import { findMethod } from '../api/utils';
import TransportManager from '../data-manager/TransportManager';
import type { Device } from '../device/Device';
import type { BaseMethod } from '../api/BaseMethod';
import { ConnectSettings, CommonParams } from '../types';
import { DataManager } from '../data-manager';
import { enableLog } from '../utils/logger';
import { CoreMessage, createResponseMessage, IFRAME, IFrameCallMessage, UI_EVENT } from '../events';
import DeviceConnector from '../device/DeviceConnector';

const Log = initLog('Core');

let _core: Core;
let _deviceList: DeviceList | undefined;
let _connector: DeviceConnector | undefined;
let _preferredDevice: CommonParams['device'];
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

  if (_preferredDevice && !message.payload.device) {
    message.payload.device = _preferredDevice;
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
    await initDeviceList();
  } catch (error) {
    return Promise.reject(error);
  }

  let device: Device;
  try {
    device = initDevice(method);
  } catch (error) {
    return Promise.reject(error);
  }

  Log.debug('Call API - setDevice: ', device);
  method.setDevice?.(device);

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
        return Promise.reject(error);
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
    // TODO: 方法执行后，检查队列内是否有等待调用的 API，依次调用
  }
};

async function initDeviceList() {
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

  if (method.devicePath) {
    device = _deviceList.getDevice(method.devicePath);
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

export default class Core extends EventEmitter {
  async handleMessage(message: CoreMessage) {
    switch (message.event) {
      case UI_EVENT:
        break;
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

export const init = async (settings: ConnectSettings) => {
  console.log('init');
  try {
    try {
      await DataManager.load(settings);
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
