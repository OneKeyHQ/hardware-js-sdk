import semver from 'semver';
import EventEmitter from 'events';
import {
  ERRORS,
  ERROR_CODES_REQUIRE_RELEASE,
  HardwareError,
  HardwareErrorCode,
  createDefectiveFirmwareError,
  createDeferred,
  createDeprecatedHardwareError,
  createDeviceNotSupportMethodError,
  createNeedUpgradeFirmwareHardwareError,
  createNewFirmwareForceUpdateHardwareError,
  createNewFirmwareUnReleaseHardwareError,
} from '@onekeyfe/hd-shared';

import {
  LoggerNames,
  enableLog,
  getLogger,
  isMethodVersionRangeUnsupported,
  setLoggerPostMessage,
  wait,
} from '../utils';
import {
  findDefectiveBatchDevice,
  getDefectiveDeviceInfo,
} from '../utils/findDefectiveBatchDevice';
import {
  cleanupSdkInstance,
  completeRequestContext,
  createRequestContext,
  createSdkTracingContext,
  formatRequestContext,
  getActiveRequestsByDeviceInstance,
  updateRequestContext,
} from '../utils/tracing';
import { Device } from '../device/Device';
import { checkLiveDeviceId } from '../device/deviceIdentity';
import { DeviceList } from '../device/DeviceList';
import { DevicePool } from '../device/DevicePool';
import { PollingStateManager } from './PollingStateManager';
import { findMethod } from '../api/utils';
import { DataManager } from '../data-manager';
import { UI_REQUEST as UI_REQUEST_CONST } from '../constants/ui-request';
import {
  CORE_EVENT,
  DEVICE,
  IFRAME,
  UI_REQUEST,
  UI_RESPONSE,
  createDeviceMessage,
  createResponseMessage,
  createUiMessage,
  getLogBlockLabel,
} from '../events';
import TransportManager from '../data-manager/TransportManager';
import DeviceConnector from '../device/DeviceConnector';
import RequestQueue from './RequestQueue';
import { registerHardwareUiEventListeners } from './deviceEventRegistration';
import { getSynchronize } from '../utils/getSynchronize';
import { runMethodWithUnlockRetry } from '../protocols/protocol-v2/unlockRetry';
import {
  ProtocolV2UiInteractionCoordinator,
  isProtocolV2UiEnabled,
} from '../protocols/protocol-v2/uiInteraction';

import type { ConnectSettings, Features, KnownDevice } from '../types';
import type { CoreMessage, IFrameCallMessage, UiPromise, UiPromiseResponse } from '../events';
import type { DeviceEvents, InitOptions, RunOptions } from '../device/Device';
import type { SdkTracingContext } from '../utils/tracing';
import type { Deferred } from '@onekeyfe/hd-shared';
import type { LowlevelTransportSharedPlugin, OneKeyDeviceInfo } from '@onekeyfe/hd-transport';
import type { BaseMethod } from '../api/BaseMethod';

const Log = getLogger(LoggerNames.Core);
const PRE_INITIALIZE_TTL_MS = 60 * 1000;

// Dedup/coalesce state for "pre-warm signal" methods (isPreWarmSignal),
// keyed by getPreWarmKey(): coalesce in-flight, skip if warmed within TTL.
const preWarmInflight = new Map<string, Promise<any>>();
const preWarmDoneAt = new Map<string, number>();

export type CoreContext = ReturnType<Core['getCoreContext']>;

function hasDeriveCardano(method: BaseMethod): boolean {
  if (
    method.name.startsWith('allNetworkGetAddress') &&
    method.payload &&
    method.payload.bundle &&
    // @ts-expect-error
    method.payload.bundle.some(net => net && net.network === 'ada')
  ) {
    return true;
  }

  return method.name.startsWith('cardano') || method.payload?.deriveCardano;
}

const parseInitOptions = (method?: BaseMethod): InitOptions => ({
  initSession: method?.payload.initSession,
  passphraseState: method?.payload.useEmptyPassphrase ? undefined : method?.payload.passphraseState,
  deviceId: method?.payload.deviceId,
  deriveCardano: method && hasDeriveCardano(method),
  connectProtocol: method?.payload.connectProtocol,
  protocolV2DeviceInfoTimeoutMs: method?.payload.protocolV2DeviceInfoTimeoutMs,
});

let _core: Core | undefined;
let _deviceList: DeviceList | undefined;
let _connector: DeviceConnector | undefined;
let _uiPromises: UiPromise<UiPromiseResponse['type']>[] = []; // Waiting for ui response

const deviceCacheMap = new Map<string, Device>();
const pollingManager = new PollingStateManager();

let preConnectCache: {
  passphraseState: string | undefined;
} = {
  passphraseState: undefined,
};

const toError = (error: unknown): Error | undefined => {
  if (error instanceof Error) return error;
  if (error == null) return undefined;
  if (typeof error === 'string') return new Error(error);
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(String(error));
  }
};

const updateMethodRequestContext = (method: BaseMethod, updates: any) => {
  if (method.requestContext) {
    updateRequestContext(method.requestContext.responseID, updates);
  }
};

const completeMethodRequestContext = (method: BaseMethod, error?: unknown) => {
  if (!method.requestContext) {
    return;
  }
  completeRequestContext(method.requestContext.responseID, toError(error));
};

export const callAPI = async (context: CoreContext, message: CoreMessage) => {
  if (!message.id || !message.payload || message.type !== IFRAME.CALL) {
    return Promise.reject(ERRORS.TypedError('on call: message.id or message.payload is missing'));
  }

  // find api method
  let method!: BaseMethod;
  try {
    method = findMethod(message as IFrameCallMessage);
    method.connector = _connector;
    method.postMessage = postMessage;
    method.setContext?.(context);

    method.requestContext = createRequestContext(method.responseID, method.name, {
      sdkInstanceId: context.sdkInstanceId,
      connectId: method.connectId,
    });

    Log.debug(`[${context.sdkInstanceId}] callAPI: ${formatRequestContext(method.requestContext)}`);

    method.init();
  } catch (error) {
    if (method) {
      completeMethodRequestContext(method, error);
      method.dispose();
    }
    return Promise.reject(error);
  }

  DevicePool.emitter.on(DEVICE.CONNECT, onDeviceConnectHandler);

  if (!method.useDevice) {
    updateMethodRequestContext(method, { status: 'running' });
    try {
      const response = await method.run();
      completeMethodRequestContext(method);
      return createResponseMessage(method.responseID, true, response);
    } catch (error) {
      completeMethodRequestContext(method, error);
      return createResponseMessage(method.responseID, false, { error });
    }
  }
  // push method to queue
  // callApiQueue.push(method);

  // if (callApiQueue.length > 1) {
  //   Log.debug(
  //     'should cancel the previous method execution: ',
  //     callApiQueue.map(m => m.name)
  //   );
  // }

  // only the pre-warm signal (PreInitialize) forks here; normal methods fall
  // through to onCallDevice below, so the pre-warm dedup/guards never touch them
  if (method.isPreWarmSignal) {
    return handlePreWarmSignal(context, message, method);
  }

  const { requestQueue, methodSynchronize } = context;
  const admission = await methodSynchronize(
    () => requestQueue.admitTask(method),
    method.connectId ?? method.deviceId ?? 'unknown-device'
  );
  if (admission.status === 'busy') {
    const error = ERRORS.TypedError(HardwareErrorCode.DeviceBusy);
    DevicePool.emitter.removeListener(DEVICE.CONNECT, onDeviceConnectHandler);
    completeMethodRequestContext(method, error);
    method.dispose();
    return createResponseMessage(method.responseID, false, { error });
  }

  return onCallDevice(context, message, method);
};

// Wrapper for "pre-warm signal" methods: coalesce in-flight same-key pre-warm,
// skip if warmed within TTL, else run + track. The "hang up so the next real
// call waits" part lives in onCallDevice (setPrePendingCallPromise).
const handlePreWarmSignal = async (
  context: CoreContext,
  message: CoreMessage,
  method: BaseMethod
): Promise<any> => {
  const createAckResponse = () => {
    DevicePool.emitter.removeListener(DEVICE.CONNECT, onDeviceConnectHandler);
    completeMethodRequestContext(method);
    method.dispose();
    return createResponseMessage(method.responseID, true, true);
  };

  // no connectId: can't target a device safely, skip pre-warm (ack only)
  if (!method.connectId) {
    return createAckResponse();
  }

  const key = method.getPreWarmKey();

  const inflight = preWarmInflight.get(key);
  if (inflight) {
    // reply with THIS call's responseID (not the other call's response object)
    try {
      await inflight;
    } catch {
      // pre-warm is best-effort; ignore its failure for the coalesced caller
    }
    return createAckResponse();
  }

  const doneAt = preWarmDoneAt.get(key);
  if (typeof doneAt === 'number' && Date.now() - doneAt <= method.preWarmTtl) {
    return createAckResponse();
  }

  const run = onCallDevice(context, message, method);
  preWarmInflight.set(key, run);
  try {
    const result = await run;
    // Only remember the warm if it actually succeeded — a failed pre-warm must
    // not suppress the next pre-warm within the TTL.
    if (result?.success === true && result?.payload === true) {
      preWarmDoneAt.set(key, Date.now());
    }
    return result;
  } finally {
    if (preWarmInflight.get(key) === run) {
      preWarmInflight.delete(key);
    }
  }
};

const waitWithTimeout = async (promise: Promise<any>, timeout: number) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeout);
  });
  return Promise.race([promise, timeoutPromise]);
};

const waitForPendingPromise = async (
  getPrePendingCallPromise: () => Promise<void> | undefined,
  removePrePendingCallPromise?: (promise: Promise<void> | undefined) => void
) => {
  const pendingPromise = getPrePendingCallPromise();
  if (pendingPromise) {
    Log.debug('pre pending call promise before call method, wait for it');
    try {
      await waitWithTimeout(pendingPromise, 5 * 1000);
    } catch (error) {
      // ignore timeout error
    }
    removePrePendingCallPromise?.(pendingPromise);
    Log.debug('pre pending call promise before call method done');
  }
};

const onCallDevice = async (
  context: CoreContext,
  message: CoreMessage,
  method: BaseMethod
): Promise<any> => {
  let messageResponse: any;

  const { requestQueue, getPrePendingCallPromise, setPrePendingCallPromise } = context;

  updateMethodRequestContext(method, { status: 'running' });

  // Normalize undefined / null / '' to '' — they all mean "main wallet, no
  // passphrase". Without this, the first call (preConnectCache starts undefined)
  // or any '' call after a non-'' one is wrongly treated as a passphrase switch
  // and needlessly clears the device cache -> forces a re-enumeration Initialize.
  // A real switch ('' <-> 'stateX', or 'stateX' <-> 'stateY') still differs.
  const normalizePassphraseState = (s?: string | null) => s || '';
  const connectStateChange =
    normalizePassphraseState(preConnectCache.passphraseState) !==
    normalizePassphraseState(method.payload.passphraseState);

  preConnectCache = {
    passphraseState: method.payload.passphraseState,
  };

  if (connectStateChange || method.payload.initSession) {
    Log.debug('passphrase state change, clear device cache');
    DevicePool.clearDeviceCache(method.payload.connectId);
  }

  // wait for previous callback tasks to complete (ensure device does not call concurrently)
  if (method.connectId) {
    await context.waitForCallbackTasks(method.connectId);
  }

  await waitForPendingPromise(getPrePendingCallPromise, setPrePendingCallPromise);

  const task = requestQueue.getTask(method.responseID) ?? requestQueue.createTask(method);

  // Pre-warm holds the device as a per-connectId callback task so a concurrent
  // real call waits (before ensureConnected) instead of racing its Initialize.
  // Only covers pre-warm -> real-call ordering; the reverse is fail-closed.
  let preWarmCallbackTask: Deferred<void> | undefined;
  if (method.isPreWarmSignal && method.connectId) {
    preWarmCallbackTask = createDeferred<void>();
    context.registerCallbackTask(method.connectId, preWarmCallbackTask);
  }

  let device: Device;
  try {
    /**
     * Polling to ensure successful connection
     */
    const connectId = method.connectId ?? '';
    const pollingId = pollingManager.start(connectId);
    device = await ensureConnected(
      context,
      method,
      connectId,
      pollingId,
      task.abortController?.signal
    );
  } catch (e) {
    preWarmCallbackTask?.resolve();
    Log.debug('ensureConnected error: ', e);

    completeMethodRequestContext(method, e);

    if (e.name === 'AbortError' || e.message === 'Request aborted') {
      requestQueue.releaseTask(method.responseID);
      return createResponseMessage(method.responseID, false, {
        error: ERRORS.TypedError(HardwareErrorCode.ActionCancelled, 'Request cancelled by user'),
      });
    }
    requestQueue.releaseTask(method.responseID);
    return createResponseMessage(method.responseID, false, { error: e });
  }

  if (method.payload?.onlyConnectBleDevice) {
    preWarmCallbackTask?.resolve();
    Log.debug('Call API - only connect ble device: ', device?.mainId);
    DevicePool.emitter.removeListener(DEVICE.CONNECT, onDeviceConnectHandler);
    requestQueue.releaseTask(method.responseID);
    completeMethodRequestContext(method);
    method.dispose();
    return createResponseMessage(method.responseID, true, null);
  }

  Log.debug('Call API - setDevice: ', device.mainId);
  method.setDevice?.(device);
  method.context = context;

  updateMethodRequestContext(method, {
    deviceInstanceId: device.instanceId,
    commandsInstanceId: device.commands?.instanceId,
  });

  const activeRequests = getActiveRequestsByDeviceInstance(device.instanceId);
  if (activeRequests.length > 0) {
    Log.warn(
      `[${method.instanceId}] Device ${device.instanceId} has ${activeRequests.length} active requests:`,
      activeRequests.map(formatRequestContext)
    );
  }

  registerHardwareUiEventListeners(device, {
    pin: onDevicePinHandler,
    button: onDeviceButtonHandler,
    passphrase: message.payload.useEmptyPassphrase
      ? onEmptyPassphraseHandler
      : onDevicePassphraseHandler,
    passphraseOnDevice: onEnterPassphraseOnDeviceHandler,
    attachPinOnDevice: onEnterAttachPinOnDeviceHandler,
  });
  device.on(DEVICE.FEATURES, onDeviceFeaturesHandler);
  device.on(DEVICE.STATE, onDeviceStateHandler);
  device.on(
    DEVICE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE,
    onSelectDeviceInBootloaderForWebDeviceHandler
  );

  const protocolV2UiCoordinator = new ProtocolV2UiInteractionCoordinator(device, postMessage);
  device.on(
    DEVICE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE,
    onSelectDeviceForSwitchFirmwareWebDeviceHandler
  );

  try {
    // Wait for any pending task except our own (self-wait would deadlock).
    if (method.connectId) {
      await context.waitForCallbackTasks(method.connectId, preWarmCallbackTask);
    }

    await waitForPendingPromise(getPrePendingCallPromise, setPrePendingCallPromise);

    const inner = async (): Promise<void> => {
      // The protocol is established after acquire/initialize. Reject Protocol V2-only
      // methods on other devices through BaseMethod.requireProtocolV2.
      if (method.requireProtocolV2 && !device.isProtocolV2()) {
        throw createDeviceNotSupportMethodError(method.name, device.getCurrentFirmwareType());
      }

      // check firmware version
      const versionRange = device.getCurrentMethodVersionRange(
        type => method.getVersionRange()[type]
      );
      const currentFirmwareVersion = device.getCurrentFirmwareVersionString() ?? '0.0.0';
      const currentBleVersion = device.getCurrentBLEFirmwareVersionString() ?? '0.0.0';
      const deviceFirmwareType = device.getCurrentFirmwareType();
      let newVersionStatus: ReturnType<typeof DataManager.getFirmwareStatus> | undefined;

      // Defective-batch and forced-update gates depend on V1 features/remote config.
      // Pro2 joins after DataManager supports its profile firmwareStatus.
      if (device.features && !device.isProtocolV2()) {
        DataManager.checkAndReloadData();

        // 检测故障固件设备
        if (findDefectiveBatchDevice(device.features)) {
          const defectiveInfo = getDefectiveDeviceInfo(device.features);
          if (defectiveInfo) {
            throw createDefectiveFirmwareError(
              defectiveInfo.serialNo,
              defectiveInfo.seVersion || 'Unknown',
              defectiveInfo.deviceType,
              method.connectId,
              method.deviceId
            );
          }
        }

        newVersionStatus = DataManager.getFirmwareStatus(device.features, deviceFirmwareType);
        const bleVersionStatus = DataManager.getBLEFirmwareStatus(device.features);

        if (
          (newVersionStatus === 'required' || bleVersionStatus === 'required') &&
          method.skipForceUpdateCheck === false
        ) {
          // Get current version information for error reporting
          const currentVersions = {
            firmware: currentFirmwareVersion,
            ble: currentBleVersion,
          };

          // Provide more specific error message based on which version check failed
          const requiredUpdates: ('firmware' | 'ble')[] = [];
          if (newVersionStatus === 'required') {
            requiredUpdates.push('firmware');
          }
          if (bleVersionStatus === 'required') {
            requiredUpdates.push('ble');
          }
          throw createNewFirmwareForceUpdateHardwareError(
            method.connectId,
            method.deviceId,
            requiredUpdates,
            currentVersions
          );
        }
      }

      if (isMethodVersionRangeUnsupported(versionRange)) {
        throw createDeviceNotSupportMethodError(method.name, deviceFirmwareType);
      }

      if (versionRange) {
        if (semver.valid(versionRange.min) && semver.lt(currentFirmwareVersion, versionRange.min)) {
          if (newVersionStatus === 'none' || newVersionStatus === 'valid') {
            throw createNewFirmwareUnReleaseHardwareError({
              currentVersion: currentFirmwareVersion,
              requireVersion: versionRange.min,
              methodName: method.name,
              firmwareType: deviceFirmwareType,
            });
          }

          return Promise.reject(
            createNeedUpgradeFirmwareHardwareError({
              currentVersion: currentFirmwareVersion,
              requireVersion: versionRange.min,
              methodName: method.name,
              firmwareType: deviceFirmwareType,
            })
          );
        }
        if (
          versionRange.max &&
          semver.valid(versionRange.max) &&
          semver.gte(currentFirmwareVersion, versionRange.max)
        ) {
          return Promise.reject(
            createDeprecatedHardwareError(currentFirmwareVersion, versionRange.max, method.name)
          );
        }
      } else if (method.strictCheckDeviceSupport) {
        throw createDeviceNotSupportMethodError(method.name, deviceFirmwareType);
      }

      // check call method mode
      const unexpectedMode = device.hasUnexpectedMode(
        method.allowDeviceMode,
        method.requireDeviceMode
      );
      if (unexpectedMode) {
        if (unexpectedMode === UI_REQUEST_CONST.NOT_IN_BOOTLOADER) {
          return Promise.reject(ERRORS.TypedError(HardwareErrorCode.RequiredButInBootloaderMode));
        }
        if (unexpectedMode === UI_REQUEST_CONST.BOOTLOADER) {
          return Promise.reject(ERRORS.TypedError(HardwareErrorCode.NotAllowInBootloaderMode));
        }
        return Promise.reject(
          ERRORS.TypedError(HardwareErrorCode.DeviceUnexpectedMode, unexpectedMode)
        );
      }

      if (method.deviceId && method.checkDeviceId) {
        const isSameDeviceID = await checkLiveDeviceId(device, method.deviceId);
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
      if (_deviceList && device.features && !device.isProtocolV2()) {
        await TransportManager.reconfigure(device.features);
      }

      // Check to see if it is safe to use Passphrase
      checkPassphraseEnableState(method, device.features);

      if (shouldCheckPassphraseState(method, device)) {
        // check version
        const support = device.supportNewPassphrase();
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
        const passphraseStateSafety = await device.checkPassphraseStateSafety(
          method.payload?.passphraseState,
          method.payload?.useEmptyPassphrase,
          method.payload?.skipPassphraseCheck
        );

        // Double check, handles the special case of Touch/Pro
        checkPassphraseEnableState(method, device.features);

        if (!passphraseStateSafety) {
          DevicePool.clearDeviceCache(method.payload.connectId);
          return Promise.reject(
            ERRORS.TypedError(HardwareErrorCode.DeviceCheckPassphraseStateError)
          );
        }

        // close pin popup window
        postMessage(createUiMessage(UI_REQUEST.CLOSE_UI_PIN_WINDOW));
      }

      // Automatic check safety_check level for Kovan, Ropsten, Rinkeby, Goerli test networks.
      try {
        await method.checkSafetyLevelOnTestNet();
      } catch (e) {
        const error =
          e instanceof HardwareError
            ? e
            : ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'open safety check failed.');
        // messageResponse = createResponseMessage(method.responseID, false, { error });
        // requestQueue.resolveRequest(method.responseID, messageResponse);
        // return;
        throw error;
      }

      method.device?.commands?.checkDisposed();

      try {
        const response: object = await runMethodWithUnlockRetry(
          method,
          device,
          protocolV2UiCoordinator
        );
        messageResponse = createResponseMessage(method.responseID, true, response);
        requestQueue.resolveRequest(method.responseID, messageResponse);
        completeMethodRequestContext(method);
      } catch (error) {
        Log.debug(`Call API - Inner Method Run Error`, error);
        messageResponse = createResponseMessage(method.responseID, false, { error });
        requestQueue.resolveRequest(method.responseID, messageResponse);
        completeMethodRequestContext(method, error);

        // Re-throw errors that need to trigger device release/disconnect in Device._runInner
        if (
          error instanceof HardwareError &&
          ERROR_CODES_REQUIRE_RELEASE.includes(error.errorCode as any)
        ) {
          throw error;
        }
      } finally {
        protocolV2UiCoordinator.close();
      }
    };
    Log.debug('Call API - Device Run: ', device.mainId);

    const runOptions: RunOptions = {
      keepSession: method.payload.keepSession,
      skipInitialize: canSkipInitialize(method, device),
      ...parseInitOptions(method),
    };
    const deviceRunPromise = device.run(inner, runOptions);
    task.callPromise = createDeferred<any>();
    deviceRunPromise.catch(error => task.callPromise?.reject(error));

    try {
      return await task.callPromise.promise;
    } catch (e) {
      Log.debug('Device Run Error: ', e);
      completeMethodRequestContext(method, e);
      return createResponseMessage(method.responseID, false, { error: e });
    } finally {
      await deviceRunPromise.catch(() => undefined);
    }
  } catch (error) {
    messageResponse = createResponseMessage(method.responseID, false, { error });
    requestQueue.rejectRequest(
      method.responseID,
      ERRORS.TypedError(HardwareErrorCode.CallMethodError, error.message)
    );
    Log.debug('Call API - Run Error: ', error);
    completeMethodRequestContext(method, error);
  } finally {
    // Release the pre-warm callback task so the next real call can proceed.
    preWarmCallbackTask?.resolve();

    const response = messageResponse;

    if (response) {
      if (method) {
        method.dispose();
      }
    }

    // remove method from queue
    // const index = method.responseID
    //   ? callApiQueue.findIndex(m => m.responseID === method.responseID)
    //   : -1;
    // if (index > -1) {
    //   callApiQueue.splice(index, 1);
    //   Log.debug(
    //     'Remove the finished method from the queue： ',
    //     callApiQueue.map(m => m.name)
    //   );
    // }

    requestQueue.releaseTask(method.responseID);

    if (isProtocolV2UiEnabled(method)) {
      closePopup();
    }

    cleanup();

    if (device) {
      const stillActive = getActiveRequestsByDeviceInstance(device.instanceId);
      if (stillActive.length > 1) {
        Log.warn(
          `[${method.instanceId}] Removing listeners while ${stillActive.length} requests are active!`,
          {
            deviceInstanceId: device.instanceId,
            activeRequests: stillActive.map(formatRequestContext),
            pinListeners: device.listenerCount(DEVICE.PIN),
          }
        );
      } else {
        removeDeviceListener(device);
      }
    }
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

  if (method.payload?.detectBootloaderDevice && allDevices.some(d => d.isBootloader())) {
    throw ERRORS.TypedError(HardwareErrorCode.DeviceDetectInBootloaderMode);
  }

  if (method.connectId) {
    device = _deviceList.getDevice(method.connectId);
    if (!device && method.name === 'firmwareUpdateV4' && allDevices.length === 1) {
      const [singleDevice] = allDevices;
      if (singleDevice.isBootloader()) {
        Log.debug(
          'firmwareUpdateV4 uses the only bootloader device when connectId changed after reboot'
        );
        device = singleDevice;
      }
    }
  } else if (allDevices.length === 1) {
    [device] = allDevices;
  } else if (allDevices.length > 1) {
    throw ERRORS.TypedError(
      [
        'firmwareUpdateV4',
        'firmwareUpdateV3',
        'firmwareUpdateV2',
        'checkFirmwareRelease',
        'checkBootloaderRelease',
        'checkBLEFirmwareRelease',
      ].includes(method.name)
        ? HardwareErrorCode.FirmwareUpdateLimitOneDevice
        : HardwareErrorCode.SelectDevice
    );
  }

  if (!device) {
    const env = DataManager.getSettings('env');
    // Browser WebUSB needs permission prompt, desktop WebUSB doesn't
    if (DataManager.isBrowserWebUsb(env)) {
      throw ERRORS.TypedError(HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission);
    }
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
    device = Device.fromDescriptor(
      { id: method.connectId } as OneKeyDeviceInfo,
      method.sdkInstanceId
    );
    deviceCacheMap.set(method.connectId, device);
  }
  device.deviceConnector = _connector;
  return device;
}

/**
 * Check if we can skip initialize for this method
 */
function canSkipInitialize(method: BaseMethod, device: Device): boolean {
  const reasons: string[] = [];
  // only sign-style methods opt in; getAddress/getPublicKey never do
  if (!method.allowUsePreInitialize) reasons.push('method.disallow');
  // caller must opt in per call
  if (!method.payload?.usePreInitialize) reasons.push('payload.usePreInitialize=false');
  // no connectId: can't pin the target device, never skip
  if (!method.connectId) reasons.push('connectId.missing');
  // passphrase state must match the pre-initialize
  if (!device.isPreInitializeMetaMatch(method.payload)) reasons.push('meta.mismatch');
  // device must have been initialized before.
  if (device.isUnacquired()) reasons.push('deviceInfo.missing');
  // within pre-initialize TTL
  if (!device.isPreInitializedValid(PRE_INITIALIZE_TTL_MS)) reasons.push('ttl.expired');

  if (reasons.length) {
    Log.debug(`[PRE-INIT][MISS] method=${method.name} ${reasons.join(',')}`);
    return false;
  }

  const savedMs = device.getLastInitializeDuration();
  const saved = typeof savedMs === 'number' ? `saved ${savedMs}ms` : 'within TTL + meta match';
  Log.debug(`[PRE-INIT][HIT] method=${method.name} skip Initialize (${saved})`);

  return true;
}

function isRetryableBleProtocolV2ProbeError(method: BaseMethod, error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    method.payload.connectProtocol === 'V2' &&
    message.includes('Device protocol mismatch') &&
    message.includes('expected V2') &&
    message.includes('did not respond to expected protocol')
  );
}

/**
 * If the Bluetooth connection times out, retry up to 6 times
 * @param retryCount - Current retry count (default 0)
 */
async function connectDeviceForBle(method: BaseMethod, device: Device, retryCount = 0) {
  try {
    await device.acquire(method.payload.connectProtocol);
    if (method.payload?.onlyConnectBleDevice) {
      return;
    }
    // Skip initialize if conditions are met
    if (!canSkipInitialize(method, device)) {
      const initOptions = parseInitOptions(method);
      await device.initialize(initOptions);
      device.markPreInitialized({
        passphraseState: initOptions.passphraseState,
      });
    }
  } catch (err) {
    if (
      (err.errorCode === HardwareErrorCode.BleTimeoutError ||
        err.errorCode === HardwareErrorCode.BleConnectedError ||
        isRetryableBleProtocolV2ProbeError(method, err)) &&
      retryCount < 6
    ) {
      const nextRetry = retryCount + 1;
      Log.debug(`Bluetooth connect timeout and will retry, retry count: ${nextRetry}`);
      await wait(3000);
      await connectDeviceForBle(method, device, nextRetry);
    } else {
      throw err;
    }
  }
}

type IPollFn<T> = (time?: number) => T;
// eslint-disable-next-line @typescript-eslint/require-await
const ensureConnected = async (
  _context: CoreContext,
  method: BaseMethod,
  connectId: string,
  pollingId: number,
  abortSignal?: AbortSignal
) => {
  let tryCount = 0;
  const MAX_RETRY_COUNT =
    method.payload && typeof method.payload.retryCount === 'number' ? method.payload.retryCount : 5;
  const POLL_INTERVAL_TIME = (method.payload && method.payload.pollIntervalTime) || 1000;
  const TIME_OUT = (method.payload && method.payload.timeout) || 10000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  Log.debug(
    `EnsureConnected function start, MAX_RETRY_COUNT=${MAX_RETRY_COUNT}, POLL_INTERVAL_TIME=${POLL_INTERVAL_TIME}  `
  );

  const poll: IPollFn<Promise<Device>> = async (time = POLL_INTERVAL_TIME) =>
    // eslint-disable-next-line no-async-promise-executor
    new Promise(async (resolve, reject) => {
      const abort = () => {
        if (abortSignal && abortSignal.aborted) {
          if (timer) {
            clearTimeout(timer);
          }
          reject(ERRORS.TypedError(HardwareErrorCode.CallQueueActionCancelled));
          return true;
        }
        return false;
      };

      if (abort()) {
        return;
      }

      if (!pollingManager.isActive(connectId, pollingId)) {
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
          [
            HardwareErrorCode.BridgeNotInstalled,
            HardwareErrorCode.BridgeTimeoutError,
            HardwareErrorCode.BridgeNeedsPermission,
          ].includes(error.errorCode)
        ) {
          _deviceList = undefined;
          reject(error);
          return;
        }
        if (error.errorCode === HardwareErrorCode.TransportNotConfigured) {
          await TransportManager.configure();
        }
      }

      if (abort()) {
        return;
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
            if (abort()) {
              return;
            }
            await connectDeviceForBle(method, device);
          }
          resolve(device);
          return;
        }
      } catch (error) {
        Log.debug('device error: ', error);
        if ([HardwareErrorCode.BleCharacteristicNotifyChangeFailure].includes(error.errorCode)) {
          postMessage(createUiMessage(UI_REQUEST.BLUETOOTH_CHARACTERISTIC_NOTIFY_CHANGE_FAILURE));
        }
        if (
          [
            HardwareErrorCode.BlePoweredOff,
            HardwareErrorCode.BleUnsupported,
            HardwareErrorCode.BlePermissionError,
            HardwareErrorCode.BleLocationError,
            HardwareErrorCode.BleLocationServicesDisabled,
            HardwareErrorCode.BleDeviceNotBonded,
            HardwareErrorCode.BleDeviceBondError,
            HardwareErrorCode.BleDeviceBondedCanceled,
            HardwareErrorCode.BleCharacteristicNotifyError,
            HardwareErrorCode.BleTimeoutError,
            HardwareErrorCode.BleWriteCharacteristicError,
            HardwareErrorCode.BleAlreadyConnected,
            HardwareErrorCode.FirmwareUpdateLimitOneDevice,
            HardwareErrorCode.SelectDevice,
            HardwareErrorCode.DeviceDetectInBootloaderMode,
            HardwareErrorCode.BleCharacteristicNotifyChangeFailure,
            HardwareErrorCode.BridgeNeedsPermission,
          ].includes(error.errorCode)
        ) {
          reject(error);
          return;
        }
      }

      if (tryCount > MAX_RETRY_COUNT) {
        if (timer) {
          clearTimeout(timer);
        }
        Log.debug('EnsureConnected get to max try count, will return: ', tryCount);
        // Browser WebUSB needs permission prompt, desktop WebUSB doesn't
        // skipWebDevicePrompt can override this behavior for special cases
        if (DataManager.isBrowserWebUsb(env) && !method.payload?.skipWebDevicePrompt) {
          postMessage(createUiMessage(UI_REQUEST.WEB_DEVICE_PROMPT_ACCESS_PERMISSION));
          reject(ERRORS.TypedError(HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission));
        } else {
          reject(ERRORS.TypedError(HardwareErrorCode.DeviceNotFound));
        }
        return;
      }

      if (abort()) {
        return;
      }

      // eslint-disable-next-line no-promise-executor-return
      return setTimeout(() => resolve(poll(time * 1.5)), time);
    });
  // pollingManager.start(connectId) already registered this pollingId as active
  return poll();
};

export const cancel = (context: CoreContext, connectId?: string) => {
  const { requestQueue, setPrePendingCallPromise } = context;
  if (connectId) {
    try {
      // let device;
      // if (DataManager.isBleConnect(env)) {
      //   device = initDeviceForBle({ connectId } as BaseMethod);
      // } else {
      //   device = initDevice({ connectId } as BaseMethod);
      // }
      // setPrePendingCallPromise(device?.interruptionFromUser());
      // requestQueue.abortRequestsByConnectId(connectId);

      // cancel callback tasks
      requestQueue.cancelCallbackTasks(connectId);

      const requestIds = requestQueue.getRequestTasksId();
      Log.debug(
        `Cancel Api connect requestQueues: length:${requestIds.length} requestIds:${requestIds.join(
          ','
        )}`
      );
      const canceledDevices: Device[] = [];
      for (const requestId of requestIds) {
        const task = requestQueue.getTask(requestId);
        Log.debug('Cancel Api connect task: ', task);
        if (task && task.method?.device) {
          if (!canceledDevices.includes(task.method.device)) {
            const { device } = task.method;
            setPrePendingCallPromise(device?.interruptionFromUser());
            canceledDevices.push(device);
          }
          requestQueue.rejectRequest(
            requestId,
            ERRORS.TypedError(HardwareErrorCode.CallQueueActionCancelled)
          );
        }
      }
      requestQueue.abortRequestsByConnectId(connectId);
    } catch (e) {
      Log.error('Cancel API Error: ', e);
    }
  } else {
    const env = DataManager.getSettings('env');
    if (DataManager.isBleConnect(env)) {
      Log.debug('Cancel Api all _deviceList: ');
      const canceledDevices: Device[] = [];
      for (const requestId of requestQueue.getRequestTasksId()) {
        const task = requestQueue.getTask(requestId);
        Log.debug('Cancel Api connect task: ', task);
        if (task && task.method?.device) {
          if (!canceledDevices.includes(task.method.device)) {
            const { device } = task.method;
            device?.interruptionFromUser();
            canceledDevices.push(device);
          }

          requestQueue.rejectRequest(
            requestId,
            ERRORS.TypedError(HardwareErrorCode.CallQueueActionCancelled)
          );
        }
      }
    } else {
      _deviceList?.allDevices().forEach(device => {
        Log.debug('device: ', device, ' device.hasDeviceAcquire: ', device.hasDeviceAcquire());
        if (device.hasDeviceAcquire()) {
          device?.interruptionFromUser();
        }
      });

      requestQueue.getRequestTasksId().forEach(requestId => {
        requestQueue.rejectRequest(
          requestId,
          ERRORS.TypedError(HardwareErrorCode.CallQueueActionCancelled)
        );
      });
    }
  }

  cleanup();
  closePopup();
};

const checkPassphraseEnableState = (method: BaseMethod, features?: Features) => {
  if (!method.useDevicePassphraseState) return;

  const passphraseProtection = method.device
    ? method.device.getCurrentPassphraseProtection()
    : features?.passphraseProtection;

  if (passphraseProtection === true) {
    const hasNoPassphraseState =
      method.payload.passphraseState == null || method.payload.passphraseState === '';
    const shouldRequirePassphrase =
      !method.payload.useEmptyPassphrase && !method.payload.skipPassphraseCheck;

    if (hasNoPassphraseState && shouldRequirePassphrase) {
      DevicePool.clearDeviceCache(method.payload.connectId);
      throw ERRORS.TypedError(HardwareErrorCode.DeviceOpenedPassphrase);
    }
  }

  if (passphraseProtection === false && method.payload.passphraseState) {
    DevicePool.clearDeviceCache(method.payload.connectId);
    throw ERRORS.TypedError(HardwareErrorCode.DeviceNotOpenedPassphrase);
  }
};

const shouldCheckPassphraseState = (method: BaseMethod, device: Device) => {
  if (!method.useDevicePassphraseState) return false;

  return device.hasUsePassphrase();
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
  device.clearPreInitialized();
  const env = DataManager.getSettings('env');
  const deviceObject = DataManager.isBleConnect(env) ? device : device.toMessageObject();
  postMessage(createDeviceMessage(DEVICE.DISCONNECT, { device: deviceObject as KnownDevice }));
};

const onDevicePinHandler = async (...[device, type, callback]: DeviceEvents['pin']) => {
  Log.log('request Input PIN');
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

export const onDeviceButtonHandler = (...[device, request]: [...DeviceEvents['button']]) => {
  postMessage(createDeviceMessage(DEVICE.BUTTON, { ...request, device: device.toMessageObject() }));

  if (request.code === 'ButtonRequest_PinEntry' || request.code === 'ButtonRequest_AttachPin') {
    Log.log('request Confirm Input PIN or Attach PIN');
    postMessage(
      createUiMessage(UI_REQUEST.REQUEST_PIN, {
        device: device.toMessageObject() as KnownDevice,
        type: request.code,
      })
    );
  } else {
    Log.log('request Confirm Button');
    postMessage(createUiMessage(UI_REQUEST.REQUEST_BUTTON, { device: device.toMessageObject() }));
  }
};

const onDeviceFeaturesHandler = (...[_, features]: [...DeviceEvents['features']]) => {
  postMessage(createDeviceMessage(DEVICE.FEATURES, { ...features }));
};

const onDeviceStateHandler = (...[_, stateEvent]: [...DeviceEvents['state']]) => {
  postMessage(createDeviceMessage(DEVICE.STATE, stateEvent));
};

const onDevicePassphraseHandler = async (
  ...[device, requestPayload, callback]: DeviceEvents['passphrase']
) => {
  Log.debug('onDevicePassphraseHandler');
  const uiPromise = createUiPromise(UI_RESPONSE.RECEIVE_PASSPHRASE, device);
  postMessage(
    createUiMessage(UI_REQUEST.REQUEST_PASSPHRASE, {
      device: device.toMessageObject() as KnownDevice,
      passphraseState: device.passphraseState,
      existsAttachPinUser: requestPayload.existsAttachPinUser,
      source: requestPayload.source,
      reason: requestPayload.reason,
      expectedPassphraseState: requestPayload.expectedPassphraseState,
    })
  );
  // wait for passphrase
  const uiResp = await uiPromise.promise;
  const { value, passphraseOnDevice, save, attachPinOnDevice } = uiResp.payload;
  // send as PassphrasePromptResponse
  callback({
    passphrase: value.normalize('NFKD'),
    passphraseOnDevice,
    attachPinOnDevice,
    cache: save,
  });
};

const onEmptyPassphraseHandler = (...[_, , callback]: DeviceEvents['passphrase']) => {
  Log.debug('onEmptyPassphraseHandler');
  // send as PassphrasePromptResponse
  callback({ passphrase: '' });
};

const onEnterPassphraseOnDeviceHandler = (
  ...[device, requestPayload]: [...DeviceEvents['passphrase_on_device']]
) => {
  postMessage(
    createUiMessage(UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE, {
      device: device.toMessageObject() as KnownDevice,
      passphraseState: device.passphraseState,
      source: requestPayload?.source,
      reason: requestPayload?.reason,
    })
  );
};

const onEnterAttachPinOnDeviceHandler = (
  ...[device, requestPayload]: [...DeviceEvents['attach_pin_on_device']]
) => {
  postMessage(
    createUiMessage(UI_REQUEST.REQUEST_PIN, {
      device: device.toMessageObject() as KnownDevice,
      type: 'ButtonRequest_AttachPin',
      source: requestPayload?.source,
      reason: requestPayload?.reason,
    })
  );
};

const onSelectDeviceInBootloaderForWebDeviceHandler = async (
  ...[device, callback]: [...DeviceEvents['select_device_in_bootloader_for_web_device']]
) => {
  Log.debug('onSelectDeviceInBootloaderForWebDeviceHandler');
  const uiPromise = createUiPromise(UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE, device);
  postMessage(
    createUiMessage(UI_REQUEST.REQUEST_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE, {
      device: device.toMessageObject() as KnownDevice,
    })
  );
  const uiResp = await uiPromise.promise;
  callback(null, uiResp.payload.deviceId);
};

const onSelectDeviceForSwitchFirmwareWebDeviceHandler = async (
  ...[device, callback]: [...DeviceEvents['select_device_for_switch_firmware_web_device']]
) => {
  Log.debug('onSelectDeviceForSwitchFirmwareWebDeviceHandler');
  const uiPromise = createUiPromise(
    UI_RESPONSE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE,
    device
  );
  postMessage(
    createUiMessage(UI_REQUEST.REQUEST_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE, {
      device: device.toMessageObject() as KnownDevice,
    })
  );
  const uiResp = await uiPromise.promise;
  callback(null, uiResp.payload.deviceId);
};

/**
 * Emit message to listener (parent).
 * Clear method reference from _callMethods
 * @param {CoreMessage} message
 * @returns {void}
 * @memberof Core
 */
const postMessage = (message: CoreMessage) => {
  if (!_core) {
    return;
  }
  _core.emit(CORE_EVENT, message);
};

const createUiPromise = <T extends UiPromiseResponse['type']>(promiseEvent: T, device?: Device) => {
  const uiPromise: UiPromise<T> = createDeferred(promiseEvent, device);
  _uiPromises.push(uiPromise as any);

  return uiPromise;
};

const findUiPromise = <T extends UiPromiseResponse['type']>(promiseEvent: T) =>
  _uiPromises.find(p => p.id === promiseEvent);

const removeUiPromise = (promise: Deferred<any>) => {
  _uiPromises = _uiPromises.filter(p => p !== promise);
};

export default class Core extends EventEmitter {
  private tracingContext: SdkTracingContext;

  public readonly sdkInstanceId: string;

  private requestQueue = new RequestQueue();

  private disposePromise?: Promise<void>;

  // background task
  private prePendingCallPromise: Promise<void> | undefined;

  private methodSynchronize = getSynchronize();

  constructor() {
    super();
    this.tracingContext = createSdkTracingContext();
    this.sdkInstanceId = this.tracingContext.sdkInstanceId;
    Log.debug(`[Core] Created SDK instance: ${this.sdkInstanceId}`);
  }

  cancelOperation(operationId: string) {
    this.requestQueue.abortOperation(operationId);
  }

  private getCoreContext() {
    return {
      sdkInstanceId: this.sdkInstanceId,
      tracingContext: this.tracingContext,
      requestQueue: this.requestQueue,
      methodSynchronize: this.methodSynchronize,
      getPrePendingCallPromise: () => this.prePendingCallPromise,
      setPrePendingCallPromise: (promise: Promise<void> | undefined) => {
        this.prePendingCallPromise = promise;
      },
      // callback 任务管理
      registerCallbackTask: (connectId: string, callbackPromise: Deferred<any>) => {
        this.requestQueue.registerPendingCallbackTask(connectId, callbackPromise);
      },
      waitForCallbackTasks: (connectId: string, exceptTask?: Deferred<void>) =>
        this.requestQueue.waitForPendingCallbackTasks(connectId, exceptTask),
      cancelCallbackTasks: (connectId: string) => this.requestQueue.cancelCallbackTasks(connectId),
    };
  }

  async handleMessage(message: CoreMessage) {
    switch (message.type) {
      case UI_RESPONSE.RECEIVE_PIN:
      case UI_RESPONSE.RECEIVE_PASSPHRASE:
      case UI_RESPONSE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE:
      case UI_RESPONSE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE: {
        const uiPromise = findUiPromise(message.type);
        if (uiPromise) {
          Log.log('receive UI Response: ', message.type);
          uiPromise.resolve(message);
          removeUiPromise(uiPromise);
        }
        break;
      }

      case UI_REQUEST.BLUETOOTH_UNSUPPORTED:
      case UI_REQUEST.BLUETOOTH_POWERED_OFF:
      case UI_REQUEST.BLUETOOTH_PERMISSION:
      case UI_REQUEST.BLUETOOTH_CHARACTERISTIC_NOTIFY_CHANGE_FAILURE:
      case UI_REQUEST.LOCATION_PERMISSION:
      case UI_REQUEST.LOCATION_SERVICE_PERMISSION: {
        postMessage(message);
        break;
      }

      case IFRAME.CALL: {
        const logBlockLabel = getLogBlockLabel(message);
        Log.log(
          `[${Date.now()}][CALL_API]`,
          logBlockLabel ? { method: logBlockLabel, payload: '[REDACTED]' } : message
        );
        const response = await callAPI(this.getCoreContext(), message);
        const { success, payload } = response;
        Log.log(
          `[${Date.now()}][CALL_API_RESPONSE]`,
          logBlockLabel ? { method: logBlockLabel, payload: '[REDACTED]' } : response
        );
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
        Log.log('cancel API: ', message);
        cancel(this.getCoreContext(), message.payload.connectId);
        break;
      }
      case IFRAME.CANCEL_OPERATION: {
        this.cancelOperation(message.payload.operationId);
        break;
      }
      case IFRAME.CALLBACK: {
        Log.log('callback message: ', message);
        postMessage(message);
        break;
      }
      default:
        break;
    }
    return Promise.resolve(message);
  }

  dispose(): Promise<void> {
    if (!this.disposePromise) {
      this.disposePromise = this.disposeResources();
    }
    return this.disposePromise;
  }

  private async disposeResources(): Promise<void> {
    Log.debug(`[Core] Disposing SDK instance: ${this.sdkInstanceId}`);
    pollingManager.stopAll();
    this.requestQueue.abortAllRequests();
    cleanup();

    _connector?.stop();
    let transportCleanup: Promise<void>;
    try {
      transportCleanup = Promise.resolve(TransportManager.getTransport()?.stop?.()).catch(error => {
        Log.warn('[Core] Transport cleanup failed:', error);
      });
    } catch (error) {
      Log.warn('[Core] Transport cleanup failed:', error);
      transportCleanup = Promise.resolve();
    }

    // Preserve synchronous dispose semantics for in-memory state and listeners.
    _deviceList = undefined;
    _connector = undefined;
    DevicePool.resetState();
    deviceCacheMap.clear();
    preWarmInflight.clear();
    preWarmDoneAt.clear();
    preConnectCache = { passphraseState: undefined };
    this.prePendingCallPromise = undefined;
    this.removeAllListeners();
    cleanupSdkInstance(this.sdkInstanceId);
    if (_core === this) _core = undefined;

    // Transports, especially Node USB, may release native handles asynchronously.
    await transportCleanup;
  }
}

export const initCore = () => {
  const core = new Core();
  _core = core;
  return core;
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

export const switchTransport = ({
  env,
  Transport,
  plugin,
}: {
  env: ConnectSettings['env'];
  Transport: any;
  plugin?: LowlevelTransportSharedPlugin;
}) => {
  DataManager.updateEnv(env);
  TransportManager.setTransport(Transport, plugin);
  _deviceList = undefined;
  DevicePool.resetState();
  _connector = undefined;
  initConnector();
};
