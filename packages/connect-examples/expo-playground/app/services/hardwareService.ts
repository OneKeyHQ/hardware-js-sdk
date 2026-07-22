/* eslint-disable @typescript-eslint/no-explicit-any */
import { UI_RESPONSE, Success, Unsuccessful, CoreApi } from '@onekeyfe/hd-core';
import { logError, logRequest, logResponse, logInfo } from '../utils/logger';
import { ONEKEY_WEBUSB_FILTER } from '@onekeyfe/hd-shared';
import {
  getCurrentSDKInstance,
  clearSDKInstanceCache,
  TransportType,
  TransportManager,
} from '../utils/hardwareInstance';
import { useHardwareStore } from '../store/hardwareStore';
import { useDeviceStore } from '../store/deviceStore';
import { methodSupportsCommonParameters } from '../utils/constants';
import { previewHardwareParams } from './previewHardwareParams';
import { PLAYGROUND_MOCK_HIDDEN_WALLET } from '../utils/passphraseMock';
import type { HardwareConnectProtocol } from '@onekeyfe/hd-shared';
import type { Features, IDeviceType } from '@onekeyfe/hd-core';
import type { DeviceInfo } from '../types/hardware';
// 使用 hd-core 的标准类型
export type ApiResponse<T = any> = Success<T> | Unsuccessful;
export type HardwareApiMethod = keyof CoreApi;

type PassphraseStateMetadata = {
  passphraseState?: string;
  passphraseProtection?: boolean | null;
};

const getFeaturePassphraseProtection = (features?: Features | null): boolean | undefined => {
  return typeof features?.passphraseProtection === 'boolean'
    ? features.passphraseProtection
    : undefined;
};

const extractPassphraseStateMetadata = (payload: unknown): PassphraseStateMetadata => {
  if (typeof payload === 'string') return { passphraseState: payload };
  if (!payload || typeof payload !== 'object') return {};

  const maybeState = (payload as { passphraseState?: unknown }).passphraseState;
  const maybePassphraseProtection = (payload as { passphraseProtection?: unknown })
    .passphraseProtection;

  return {
    passphraseState: typeof maybeState === 'string' ? maybeState : undefined,
    passphraseProtection:
      typeof maybePassphraseProtection === 'boolean' ? maybePassphraseProtection : undefined,
  };
};

const clearPassphraseState = (params: Record<string, unknown>) => {
  delete params.passphraseState;
  useHardwareStore.getState().setCommonParameter('passphraseState', '');
};

const updateCachedDeviceFeatures = (connectId: string, features: Features) => {
  const deviceState = useDeviceStore.getState();
  deviceState.setDeviceFeatures(features);

  if (deviceState.currentDevice?.connectId === connectId) {
    deviceState.setCurrentDevice({
      ...deviceState.currentDevice,
      features,
    });
  }
};

const firstNonEmptyString = (...values: unknown[]) =>
  values.find((value): value is string => typeof value === 'string' && value.length > 0);

const getDeviceTypeFromProfile = (value: unknown): IDeviceType | undefined =>
  typeof value === 'string' && value.length > 0 ? (value as IDeviceType) : undefined;

export async function hydrateConnectedDeviceInfo(device: DeviceInfo): Promise<DeviceInfo> {
  if (!device.connectId) return device;

  // WebUSB 搜索结果已经由 DevicePool 初始化并携带完整 features，直接复用即可。
  // BLE 扫描为避免配对不会读取 features，因此仅在缺失时补一次。
  if (device.features) {
    updateCachedDeviceFeatures(device.connectId, device.features);
    return device;
  }

  const sdk = await getSDKInstance();
  let hydratedDevice = { ...device };

  try {
    // 旧 Playground 暂时通过 getFeatures 适配展示结构；正式业务统一使用 getDeviceState。
    const featuresResult = await sdk.getFeatures(device.connectId);

    if (featuresResult.success && featuresResult.payload) {
      const features = featuresResult.payload;
      const serialNo = firstNonEmptyString(features.serialNo, hydratedDevice.uuid);
      const deviceId = firstNonEmptyString(features.deviceId, hydratedDevice.deviceId);
      const label = firstNonEmptyString(features.label, hydratedDevice.label);
      const bleName = firstNonEmptyString(features.bleName);
      const deviceType = getDeviceTypeFromProfile(features.deviceType);

      hydratedDevice = {
        ...hydratedDevice,
        ...(serialNo ? { uuid: serialNo } : {}),
        ...(deviceId ? { deviceId } : {}),
        ...(deviceType ? { deviceType } : {}),
        ...(label ? { label } : {}),
        name: firstNonEmptyString(bleName, label, hydratedDevice.name) ?? hydratedDevice.name,
        features,
      };
      updateCachedDeviceFeatures(device.connectId, features);

      logResponse('Connected device hydrated via getFeatures', {
        connectId: device.connectId,
        serialNo,
        deviceId,
        label,
      });
    } else {
      logError('getFeatures failed while hydrating connected device', featuresResult.payload);
    }
  } catch (error) {
    logError('getFeatures exception while hydrating connected device', { error });
  }

  return hydratedDevice;
}

const resolvePassphraseProtection = async (
  sdk: CoreApi,
  connectId: string
): Promise<boolean | undefined> => {
  const deviceState = useDeviceStore.getState();
  const cachedFeatures =
    deviceState.currentDevice?.connectId === connectId
      ? deviceState.currentDevice.features ?? deviceState.deviceFeatures
      : undefined;
  const cachedPassphraseProtection = getFeaturePassphraseProtection(cachedFeatures);

  // 已有缓存但值为 null/unknown 时，通常表示 Pro2 尚未解锁；不要为了猜测该值
  // 再发起一轮 getFeatures，钱包会话流程会在解锁后刷新真实状态。
  if (cachedFeatures) {
    return cachedPassphraseProtection;
  }

  const featuresResult = await sdk.getFeatures(connectId);
  if (!featuresResult.success || !featuresResult.payload) {
    return undefined;
  }

  updateCachedDeviceFeatures(connectId, featuresResult.payload);
  return getFeaturePassphraseProtection(featuresResult.payload);
};

const preparePassphraseParams = async (
  sdk: CoreApi,
  method: HardwareApiMethod,
  params: Record<string, unknown>,
  connectId: string
) => {
  if (!methodSupportsCommonParameters(method)) return;

  if (PLAYGROUND_MOCK_HIDDEN_WALLET) {
    // 临时联调策略：即使页面参数选择了 useEmptyPassphrase，也不允许走标准钱包。
    params.useEmptyPassphrase = false;
    if (useHardwareStore.getState().commonParameters.useEmptyPassphrase) {
      useHardwareStore.getState().setCommonParameter('useEmptyPassphrase', false);
    }
  }

  if (params.useEmptyPassphrase === true) {
    clearPassphraseState(params);
    return;
  }

  const passphraseProtection = await resolvePassphraseProtection(sdk, connectId);

  if (passphraseProtection === false) {
    if (params.passphraseState) {
      logInfo('Device passphrase protection is disabled. Clearing stale passphraseState.');
    }
    clearPassphraseState(params);
    return;
  }

  if (
    params.passphraseState !== '' &&
    params.passphraseState !== undefined &&
    params.passphraseState !== null
  ) {
    logInfo(`Using existing passphrase state from params: ${params.passphraseState}`);
    return;
  }

  logInfo(
    `PassphraseState is empty in params for method: ${method}, attempting to open the wallet session.`
  );

  try {
    const passphraseResult = await getPassphraseState(connectId);
    const passphraseMetadata = passphraseResult.success
      ? extractPassphraseStateMetadata(passphraseResult.payload)
      : {};

    if (passphraseMetadata.passphraseProtection === false) {
      logInfo('Device passphrase protection not enabled. Clearing passphraseState.');
      clearPassphraseState(params);
      return;
    }

    if (passphraseMetadata.passphraseState) {
      logInfo(`Passphrase state obtained from device: ${passphraseMetadata.passphraseState}`);
      params.passphraseState = passphraseMetadata.passphraseState;
      useHardwareStore
        .getState()
        .setCommonParameter('passphraseState', passphraseMetadata.passphraseState);
    } else {
      logInfo('Device passphrase protection enabled but no passphraseState was returned.');
      clearPassphraseState(params);
    }
  } catch (passphraseError) {
    logError('Failed to get passphrase state from device', { passphraseError });
    clearPassphraseState(params);
  }
};

// 获取SDK实例的简化函数
async function getSDKInstance(): Promise<CoreApi> {
  return getCurrentSDKInstance();
}

// 获取SDK实例状态（用于调试）
export function getSDKInstanceStatus(): {
  hasCachedInstance: boolean;
  hasInitPromise: boolean;
  hasGetter: boolean;
} {
  return {
    hasCachedInstance: true,
    hasInitPromise: false,
    hasGetter: true,
  };
}

// 切换传输方式
export async function switchTransport(transport: TransportType): Promise<ApiResponse> {
  logRequest(`Switching transport to ${transport}`);

  if (typeof window === 'undefined') {
    const error = 'Browser environment required';
    logError('Transport switch failed', { error });
    return {
      success: false,
      payload: { error },
    } as Unsuccessful;
  }

  try {
    // 清除旧的SDK实例缓存
    clearSDKInstanceCache();

    // 使用统一的transport管理器更新状态
    TransportManager.setTransport(transport);

    // 获取新的SDK实例（会根据新的transport类型初始化）
    const sdkInstance = await getSDKInstance();

    // 根据不同的transport类型调用不同的切换方法
    if (transport === 'emulator') {
      // 模拟器模式
      await sdkInstance.switchTransport('emulator');
    } else if (transport === 'webusb') {
      // WebUSB模式
      await sdkInstance.switchTransport('webusb');
    } else {
      // JSBridge模式
      await sdkInstance.switchTransport('web');
    }

    logResponse(`Transport switched successfully to ${transport}`);
    return { success: true, payload: { transport } } as Success<any>;
  } catch (error) {
    const errorMsg = `Transport switch error: ${error}`;
    logError(errorMsg, { transport, error });
    return {
      success: false,
      payload: { error: errorMsg },
    } as Unsuccessful;
  }
}

// UI响应函数
export async function submitPin(pin: string | null): Promise<void> {
  logRequest('Submitting PIN response');
  if (typeof window === 'undefined') return;

  try {
    const sdkInstance = await getSDKInstance();
    const response = {
      type: UI_RESPONSE.RECEIVE_PIN,
      payload: pin || '@@ONEKEY_INPUT_PIN_IN_DEVICE',
    };
    sdkInstance.uiResponse(response);
    logResponse('PIN response submitted successfully');
  } catch (error) {
    logError('Failed to submit PIN response', { error });
    throw error;
  }
}

export async function submitPassphrase(
  passphrase: string,
  onDevice = false,
  save = false
): Promise<void> {
  logRequest('Submitting passphrase response', { onDevice, save });
  if (typeof window === 'undefined') return;

  try {
    const sdkInstance = await getSDKInstance();
    const response = {
      type: UI_RESPONSE.RECEIVE_PASSPHRASE,
      payload: {
        value: passphrase || '',
        passphraseOnDevice: onDevice,
        save: save,
      },
    };
    sdkInstance.uiResponse(response);
    logResponse('Passphrase response submitted successfully');
  } catch (error) {
    logError('Failed to submit passphrase response', { error });
    throw error;
  }
}

// 获取设备的passphraseState
export async function getPassphraseState(connectId: string): Promise<ApiResponse> {
  if (typeof window === 'undefined') {
    return {
      success: false,
      payload: { error: 'Browser environment required' },
    } as Unsuccessful;
  }

  try {
    const sdk = await getSDKInstance();
    const result = await sdk.getPassphraseState(connectId);
    return result;
  } catch (error) {
    return {
      success: false,
      payload: {
        error: `Error getting passphrase state: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
    } as Unsuccessful;
  }
}

// 统一的 SDK 方法调用抽象
export async function callHardwareAPI(
  method: HardwareApiMethod,
  params: Record<string, unknown>
): Promise<ApiResponse> {
  logRequest(`Calling hardware API method: ${method}`, params);

  if (typeof window === 'undefined') {
    const error = 'Browser environment required';
    logError(`Hardware API call failed: ${method}`, { error });
    return {
      success: false,
      payload: { error },
    } as Unsuccessful;
  }

  try {
    // 获取 SDK 实例
    const sdk = await getSDKInstance();

    // 检查方法是否存在
    if (typeof sdk[method] !== 'function') {
      const error = `Method ${method} not found`;
      logError(`Hardware API call failed: ${method}`, { error });
      return {
        success: false,
        payload: { error },
      } as Unsuccessful;
    }

    const { connectId, deviceId } = params;

    if (connectId && typeof connectId === 'string') {
      await preparePassphraseParams(sdk, method, params, connectId);
    }

    // 打印最终传入硬件的关键参数（尽量不变形，保持与 hd-core 接口一致）
    try {
      // 使用通用预览函数
      previewHardwareParams(method as string, params as Record<string, unknown>);
    } catch (e) {
      // 仅日志失败时忽略
      logError('Failed to preview hardware params', { error: e });
    }

    logInfo(`Executing method ${method}`, {
      connectId,
      deviceId,
      hasPassphraseState: !!params.passphraseState,
      useEmptyPassphrase: params.useEmptyPassphrase, // Log this for debugging
    });

    const methodFunc = sdk[method] as (...args: any[]) => Promise<ApiResponse>;
    let result: ApiResponse;

    // 链方法即使暂时没有解析出 deviceId，也必须保留三参数签名；
    // 否则 params 会被错放到 deviceId 位置，SDK 收到的实际 payload 将变成 undefined。
    const hasDeviceIdParameter = Object.prototype.hasOwnProperty.call(params, 'deviceId');
    if (hasDeviceIdParameter) {
      // 三参数调用：connectId, deviceId, params
      result = await methodFunc(connectId, deviceId, params);
    } else {
      // 二参数调用：connectId, params
      result = await methodFunc(connectId, params);
    }

    if (result.success) {
      logResponse(`Hardware API call successful: ${method}`, result.payload);
    } else {
      logError(`Hardware API call failed: ${method}`, result.payload);
    }

    return result;
  } catch (error) {
    const errorMsg = `Error calling ${method}: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`;
    logError(`Hardware API call exception: ${method}`, {
      error: errorMsg,
      originalError: error,
    });
    return {
      success: false,
      payload: {
        error: errorMsg,
      },
    } as Unsuccessful;
  }
}
// 搜索设备
export async function searchDevices(params?: {
  connectProtocol?: HardwareConnectProtocol;
}): Promise<ApiResponse> {
  logRequest('Searching for devices');

  const currentTransport = TransportManager.getCurrentTransport();
  logInfo(`Using transport type: ${currentTransport}`);

  try {
    const sdkInstance = await getSDKInstance();

    // 先切换到对应的transport
    if (currentTransport === 'emulator') {
      await sdkInstance.switchTransport('emulator');
    } else if (currentTransport === 'webusb') {
      await sdkInstance.switchTransport('webusb');
    } else {
      await sdkInstance.switchTransport('web');
    }

    // For WebUSB, ensure device is authorized in the browser before searching
    if (currentTransport === 'webusb') {
      try {
        if (!navigator?.usb) {
          throw new Error('WebUSB not supported by this browser');
        }
        const authorized = (await navigator.usb.getDevices?.()) ?? [];
        if (!authorized.length) {
          logInfo('No authorized WebUSB devices yet. Prompting user for device access...');
          await navigator.usb.requestDevice({ filters: ONEKEY_WEBUSB_FILTER });
        }
      } catch (e) {
        const msg = `WebUSB authorization cancelled or failed: ${
          e instanceof Error ? e.message : String(e)
        }`;
        logError(msg);
        return {
          success: false,
          payload: { error: msg },
        } as Unsuccessful;
      }
    }

    // 对于所有transport类型，使用标准的searchDevices
    const response = await sdkInstance.searchDevices(params);

    if (response.success && response.payload) {
      logResponse('Devices found', {
        count: Array.isArray(response.payload) ? response.payload.length : 1,
        devices: Array.isArray(response.payload)
          ? response.payload.map(d => d.connectId || 'unknown')
          : ['single device'],
      });
      return response;
    } else {
      const errorPayload = response.payload as any;
      return {
        success: false,
        payload: {
          error: errorPayload?.error || 'No devices found',
        },
      } as Unsuccessful;
    }
  } catch (error) {
    const errorMsg = `Device search error: ${error}`;
    logError(errorMsg, { currentTransport, error });
    return {
      success: false,
      payload: { error: errorMsg },
    } as Unsuccessful;
  }
}

// 导出 hd-core 的标准类型和常量
export { UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';

// 取消当前硬件操作
export async function cancelHardwareOperation(connectId?: string): Promise<ApiResponse> {
  logRequest('Cancelling hardware operation', { connectId });

  if (typeof window === 'undefined') {
    const error = 'Browser environment required';
    logError('Cancel operation failed', { error });
    return {
      success: false,
      payload: { error },
    } as Unsuccessful;
  }

  try {
    const sdkInstance = await getSDKInstance();

    // 调用SDK的cancel方法
    sdkInstance.cancel(connectId);

    logResponse('Hardware operation cancelled successfully', { connectId });
    return {
      success: true,
      payload: { message: 'Operation cancelled', connectId },
    } as Success<any>;
  } catch (error) {
    const errorMsg = `Cancel operation error: ${error}`;
    logError(errorMsg, { connectId, error });
    return {
      success: false,
      payload: { error: errorMsg },
    } as Unsuccessful;
  }
}
