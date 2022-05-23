import { ERRORS } from '../constants';
import { DeviceList } from '../device/DeviceList';
import { initLog } from '../utils';
import { findMethod } from '../api/utils';
import TransportManager from '../data-manager/TransportManager';
import type { Device } from '../device/Device';

const Log = initLog('Core');

interface CommonParams {
  device?: {
    path: string;
    state?: string;
    instance?: number;
  };
  useEmptyPassphrase?: boolean;
  useEventListener?: boolean; // this param is set automatically in factory
  allowSeedlessDevice?: boolean;
  keepSession?: boolean;
  skipFinalReload?: boolean;
  useCardanoDerivation?: boolean;
}

type CallAPIParams = {
  type: string;
  payload: CommonParams;
  id: string;
};

type Method = any;

let _deviceList: DeviceList | undefined;
let _preferredDevice: CommonParams['device'];
const callApiQueue = [];

export const callAPI = async (params: CallAPIParams) => {
  if (!params.id || !params.payload || !params.type) {
    return Promise.reject(
      ERRORS.TypedError(
        'Method_InvalidParameter',
        'onCall: message.id or message.payload is missing'
      )
    );
  }

  if (_preferredDevice && !params.payload.device) {
    params.payload.device = _preferredDevice;
  }

  // find api method
  let method: Method;
  try {
    method = findMethod(params.payload);
  } catch (error) {
    return Promise.reject(error);
  }

  // push method to queue
  callApiQueue.push(method);

  // init DeviceList and first configure transport messages
  if (!_deviceList) {
    try {
      await initDeviceList();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  let device: Device;
  try {
    device = initDevice(method);
  } catch (error) {
    return Promise.reject(error);
  }

  Log.debug('Call API - setDevice: ', device);
  method.setDevice?.(device);

  // TODO: connect device
};

async function initDeviceList() {
  _deviceList = new DeviceList();
  await TransportManager.configure();
  await _deviceList.getDeviceLists();
}

function initDevice(method: Method) {
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
  device.deviceConnector = _deviceList.connector;

  return device;
}

export default callAPI;
