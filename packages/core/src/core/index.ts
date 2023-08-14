import semver from 'semver';
import EventEmitter from 'events';
import { Features, LowlevelTransportSharedPlugin, OneKeyDeviceInfo } from '@onekeyfe/hd-transport';
import {
  createDeferred,
  Deferred,
  ERRORS,
  HardwareError,
  HardwareErrorCode,
} from '@onekeyfe/hd-shared';
import {
  getDeviceFirmwareVersion,
  getDeviceModel,
  getDeviceType,
  supportNewPassphrase,
} from '../utils/deviceFeaturesUtils';
import { Device, DeviceEvents, InitOptions, RunOptions } from '../device/Device';
import { DeviceList } from '../device/DeviceList';
import { DevicePool } from '../device/DevicePool';
import { findMethod } from '../api/utils';
import { DataManager } from '../data-manager';
import { enableLog, getLogger, LoggerNames, setLoggerPostMessage, wait } from '../utils';
import {
  CORE_EVENT,
  CoreMessage,
  createDeviceMessage,
  createResponseMessage,
  createUiMessage,
  DEVICE,
  IFRAME,
  IFrameCallMessage,
  UI_REQUEST,
  UI_RESPONSE,
  UiPromise,
  UiPromiseResponse,
} from '../events';
import type { BaseMethod } from '../api/BaseMethod';
import type { ConnectSettings, KnownDevice } from '../types';
import TransportManager from '../data-manager/TransportManager';
import DeviceConnector from '../device/DeviceConnector';

const Log = getLogger(LoggerNames.Core);

const parseInitOptions = (method?: BaseMethod): InitOptions => ({
  initSession: method?.payload.initSession,
  passphraseState: method?.payload.passphraseState,
  deviceId: method?.payload.deviceId,
  deriveCardano: method?.name.startsWith('cardano') || method?.payload?.deriveCardano,
});

let _core: Core;
let _deviceList: DeviceList | undefined;
let _connector: DeviceConnector | undefined;
let _uiPromises: UiPromise<UiPromiseResponse['type']>[] = []; // Waiting for ui response
let _callPromise: Deferred<any> | undefined;
const callApiQueue: BaseMethod[] = [];

const deviceCacheMap = new Map<string, Device>();
let pollingId = 1;
const pollingState: Record<number, boolean> = {};

let preConnectCache: {
  passphraseState: string | undefined;
} = {
  passphraseState: undefined,
};

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

  DevicePool.emitter.on(DEVICE.CONNECT, onDeviceConnectHandler);

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
    Log.debug(
      'should cancel the previous method execution: ',
      callApiQueue.map(m => m.name)
    );
  }

  const connectStateChange = preConnectCache.passphraseState !== method.payload.passphraseState;

  preConnectCache = {
    passphraseState: method.payload.passphraseState,
  };

  if (connectStateChange || method.payload.initSession) {
    Log.debug('passphrase state change, clear device cache');
    DevicePool.clearDeviceCache(method.payload.connectId);
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
  device.on(DEVICE.BUTTON, onDeviceButtonHandler);
  device.on(
    DEVICE.PASSPHRASE,
    message.payload.useEmptyPassphrase ? onEmptyPassphraseHandler : onDevicePassphraseHandler
  );
  device.on(DEVICE.PASSPHRASE_ON_DEVICE, onEnterPassphraseOnDeviceHandler);
  device.on(DEVICE.FEATURES, onDeviceFeaturesHandler);

  try {
    const inner = async (): Promise<void> => {
      // check firmware version
      const deviceType = getDeviceType(device.features);
      const deviceModel = getDeviceModel(device.features);
      const versionRangeType = method.getVersionRange()[deviceType];
      const versionRangeModel = method.getVersionRange()[deviceModel];

      // Type has a higher priority than Model
      const versionRange = versionRangeType ?? versionRangeModel;

      if (device.features) {
        await DataManager.checkAndReloadData();
        const newVersionStatus = DataManager.getFirmwareStatus(device.features);
        const bleVersionStatus = DataManager.getBLEFirmwareStatus(device.features);
        if (
          (newVersionStatus === 'required' || bleVersionStatus === 'required') &&
          method.skipForceUpdateCheck === false
        ) {
          throw ERRORS.TypedError(
            HardwareErrorCode.NewFirmwareForceUpdate,
            'Device firmware version is too low, please update to the latest version',
            { connectId: method.connectId, deviceId: method.deviceId }
          );
        }

        if (versionRange) {
          const currentVersion = getDeviceFirmwareVersion(device.features).join('.');
          if (semver.valid(versionRange.min) && semver.lt(currentVersion, versionRange.min)) {
            if (newVersionStatus === 'none' || newVersionStatus === 'valid') {
              throw ERRORS.TypedError(HardwareErrorCode.NewFirmwareUnRelease);
            }

            return Promise.reject(
              ERRORS.TypedError(
                HardwareErrorCode.CallMethodNeedUpgradeFirmware,
                `Device firmware version is too low, please update to ${versionRange.min}`,
                { current: currentVersion, require: versionRange.min }
              )
            );
          }
          if (
            versionRange.max &&
            semver.valid(versionRange.max) &&
            semver.gte(currentVersion, versionRange.max)
          ) {
            return Promise.reject(
              ERRORS.TypedError(
                HardwareErrorCode.CallMethodDeprecated,
                `Device firmware version is too high, this method has been deprecated in ${versionRange.max}`,
                { current: currentVersion, deprecated: versionRange.max }
              )
            );
          }
        }
      }

      // check call method mode
      const unexpectedMode = device.hasUnexpectedMode(
        method.notAllowDeviceMode,
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

      /**
       * check firmware release info
       */
      method.checkFirmwareRelease();

      /**
       * check additional supported feature
       */
      method.checkDeviceSupportFeature();

      // reconfigure messages
      if (_deviceList) {
        await TransportManager.reconfigure(device.features);
      }

      // Check to see if it is safe to use Passphrase
      checkPassphraseSafety(method, device.features);

      if (device.hasUsePassphrase() && method.useDevicePassphraseState) {
        // check version
        const support = supportNewPassphrase(device.features);
        if (!support.support) {
          return Promise.reject(
            ERRORS.TypedError(
              HardwareErrorCode.DeviceNotSupportPassphrase,
              `Device not support passphrase, please update to ${support.require}`,
              {
                require: support.require,
              }
            )
          );
        }

        // Check Device passphrase State
        const passphraseState = await device.checkPassphraseState();

        // Double check, handles the special case of Touch/Pro
        checkPassphraseSafety(method, device.features);

        if (passphraseState) {
          DevicePool.clearDeviceCache(method.payload.connectId);
          return Promise.reject(
            ERRORS.TypedError(HardwareErrorCode.DeviceCheckPassphraseStateError)
          );
        }
      }

      // Automatic check safety_check level for Kovan, Ropsten, Rinkeby, Goerli test networks.
      try {
        await method.checkSafetyLevelOnTestNet();
      } catch (e) {
        const error =
          e instanceof HardwareError
            ? e
            : ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'open safety check failed.');
        messageResponse = createResponseMessage(method.responseID, false, { error });
        _callPromise?.resolve(messageResponse);
        return;
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

    const runOptions: RunOptions = {
      keepSession: method.payload.keepSession,
      ...parseInitOptions(method),
    };
    const deviceRun = () => device.run(inner, runOptions);
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
    const index = method.responseID
      ? callApiQueue.findIndex(m => m.responseID === method.responseID)
      : -1;
    if (index > -1) {
      callApiQueue.splice(index, 1);
      Log.debug(
        'Remove the finished method from the queue： ',
        callApiQueue.map(m => m.name)
      );
    }

    closePopup();

    cleanup();

    removeDeviceListener(device);
  }
};

async function initDeviceList(method: BaseMethod) {
  const env = DataManager.getSettings('env');
  if (DataManager.isBleConnect(env) && method.connectId) {
    await TransportManager.configure();
    return;
  }

  if (!_deviceList) {
    _deviceList = new DeviceList();
    await TransportManager.configure();
    _deviceList.connector = _connector;
  }

  await _deviceList.getDeviceLists(method.connectId, parseInitOptions(method));
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
    throw ERRORS.TypedError(
      method.name === 'firmwareUpdateV2'
        ? HardwareErrorCode.FirmwareUpdateLimitOneDevice
        : HardwareErrorCode.SelectDevice
    );
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

/**
 * If the Bluetooth connection times out, retry 6 times
 */
let bleTimeoutRetry = 0;

async function connectDeviceForBle(method: BaseMethod, device: Device) {
  try {
    await device.acquire();
    await device.initialize(parseInitOptions(method));
  } catch (err) {
    if (err.errorCode === HardwareErrorCode.BleTimeoutError && bleTimeoutRetry <= 5) {
      bleTimeoutRetry += 1;
      Log.debug(`Bletooth connect timeout and will retry, retry count: ${bleTimeoutRetry}`);
      await wait(3000);
      await connectDeviceForBle(method, device);
    } else {
      throw err;
    }
  }
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
        reject(ERRORS.TypedError(HardwareErrorCode.PollingStop));
        return;
      }

      // 单次连接确保不超时
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        reject(ERRORS.TypedError(HardwareErrorCode.PollingTimeout));
      }, TIME_OUT);

      tryCount += 1;
      Log.debug('EnsureConnected function try count: ', tryCount, ' poll interval time: ', time);
      try {
        await initDeviceList(method);
      } catch (error) {
        Log.debug('device list error: ', error);
        if (
          [HardwareErrorCode.BridgeNotInstalled, HardwareErrorCode.BridgeTimeoutError].includes(
            error.errorCode
          )
        ) {
          _deviceList = undefined;
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
        if (DataManager.isBleConnect(env)) {
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
          if (DataManager.isBleConnect(env)) {
            bleTimeoutRetry = 0;
            await connectDeviceForBle(method, device);
          }
          resolve(device);
          return;
        }
      } catch (error) {
        Log.debug('device error: ', error);
        if (
          [
            HardwareErrorCode.BlePermissionError,
            HardwareErrorCode.BleLocationError,
            HardwareErrorCode.BleLocationServicesDisabled,
            HardwareErrorCode.BleDeviceNotBonded,
            HardwareErrorCode.BleDeviceBondError,
            HardwareErrorCode.BleCharacteristicNotifyError,
            HardwareErrorCode.BleTimeoutError,
            HardwareErrorCode.BleWriteCharacteristicError,
            HardwareErrorCode.BleAlreadyConnected,
            HardwareErrorCode.FirmwareUpdateLimitOneDevice,
          ].includes(error.errorCode)
        ) {
          reject(error);
          return;
        }
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
      if (DataManager.isBleConnect(env)) {
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

const checkPassphraseSafety = (method: BaseMethod, features?: Features) => {
  if (!method.useDevicePassphraseState) return;

  if (
    features?.passphrase_protection === true &&
    (method.payload.passphraseState == null || method.payload.passphraseState === '') &&
    !method.payload.useEmptyPassphrase
  ) {
    DevicePool.clearDeviceCache(method.payload.connectId);
    throw ERRORS.TypedError(HardwareErrorCode.DeviceOpenedPassphrase);
  }

  if (features?.passphrase_protection === false && method.payload.passphraseState) {
    DevicePool.clearDeviceCache(method.payload.connectId);
    throw ERRORS.TypedError(HardwareErrorCode.DeviceNotOpenedPassphrase);
  }
};

const cleanup = () => {
  _uiPromises = [];
  Log.debug('Cleanup...');
};

const removeDeviceListener = (device: Device) => {
  device.removeAllListeners();
  DevicePool.emitter.removeAllListeners(DEVICE.CONNECT);
  // DevicePool.emitter.removeListener(DEVICE.DISCONNECT, onDeviceDisconnectHandler);
};

/**
 * Force close popup
 */
const closePopup = () => {
  postMessage(createUiMessage(UI_REQUEST.CLOSE_UI_WINDOW));
};

const onDeviceConnectHandler = (device: Device) => {
  const env = DataManager.getSettings('env');
  const deviceObject = DataManager.isBleConnect(env) ? device : device.toMessageObject();
  postMessage(createDeviceMessage(DEVICE.CONNECT, { device: deviceObject as KnownDevice }));
};

const onDeviceDisconnectHandler = (device: Device) => {
  const env = DataManager.getSettings('env');
  const deviceObject = DataManager.isBleConnect(env) ? device : device.toMessageObject();
  postMessage(createDeviceMessage(DEVICE.DISCONNECT, { device: deviceObject as KnownDevice }));
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

const onDeviceFeaturesHandler = (...[_, features]: [...DeviceEvents['features']]) => {
  postMessage(createDeviceMessage(DEVICE.FEATURES, { ...features }));
};

const onDevicePassphraseHandler = async (...[device, callback]: DeviceEvents['passphrase']) => {
  Log.debug('onDevicePassphraseHandler');
  const uiPromise = createUiPromise(UI_RESPONSE.RECEIVE_PASSPHRASE, device);
  postMessage(
    createUiMessage(UI_REQUEST.REQUEST_PASSPHRASE, {
      device: device.toMessageObject() as KnownDevice,
      passphraseState: device.passphraseState,
    })
  );
  // wait for passphrase
  const uiResp = await uiPromise.promise;
  const { value, passphraseOnDevice, save } = uiResp.payload;
  // send as PassphrasePromptResponse
  callback({
    passphrase: value.normalize('NFKD'),
    passphraseOnDevice,
    cache: save,
  });
};

const onEmptyPassphraseHandler = (...[_, callback]: DeviceEvents['passphrase']) => {
  Log.debug('onEmptyPassphraseHandler');
  // send as PassphrasePromptResponse
  callback({ passphrase: '' });
};

const onEnterPassphraseOnDeviceHandler = (
  ...[device]: [...DeviceEvents['passphrase_on_device']]
) => {
  postMessage(
    createUiMessage(UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE, {
      device: device.toMessageObject() as KnownDevice,
      passphraseState: device.passphraseState,
    })
  );
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
      case UI_RESPONSE.RECEIVE_PIN:
      case UI_RESPONSE.RECEIVE_PASSPHRASE: {
        const uiPromise = findUiPromise(message.type);
        if (uiPromise) {
          uiPromise.resolve(message);
          removeUiPromise(uiPromise);
        }
        break;
      }

      case UI_REQUEST.BLUETOOTH_PERMISSION:
      case UI_REQUEST.LOCATION_PERMISSION:
      case UI_REQUEST.LOCATION_SERVICE_PERMISSION: {
        postMessage(message);
        break;
      }

      case IFRAME.CALL: {
        const response = await callAPI(message);
        const { success, payload } = response;

        if (success) {
          return response;
        }

        return {
          ...response,
          payload: {
            ...payload,
            connectId: message.payload?.connectId ?? '',
            deviceId: message.payload?.deviceId ?? '',
          },
        };
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
  DevicePool.emitter.on(DEVICE.DISCONNECT, onDeviceDisconnectHandler);
  return _connector;
};

const initTransport = (Transport: any, plugin?: LowlevelTransportSharedPlugin) => {
  TransportManager.setTransport(Transport, plugin);
};

export const init = async (
  settings: ConnectSettings,
  Transport: any,
  plugin?: LowlevelTransportSharedPlugin
) => {
  try {
    try {
      await DataManager.load(settings);
      initTransport(Transport, plugin);
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
