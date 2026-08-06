/* eslint-disable @typescript-eslint/no-explicit-any */
import { UI_RESPONSE, Success, Unsuccessful, CoreApi } from '@onekeyfe/hd-core';
import { logError, logRequest, logResponse, logInfo } from '../utils/logger';
import {
  getCurrentSDKInstance,
  clearSDKInstanceCache,
  TransportType,
  TransportManager,
} from '../utils/hardwareInstance';
import { useHardwareStore } from '../store/hardwareStore';
import { useDeviceStore } from '../store/deviceStore';
import { METHODS_REQUIRING_PASSPHRASE_CHECK } from '../utils/constants';
import { previewHardwareParams } from './previewHardwareParams';
import { normalizeProtocolAwareParams } from './protocolAwareParams';
import type { DeviceState, UiResponseCorrelation } from '@onekeyfe/hd-core';
import type { DeviceInfo } from '../types/hardware';
import { applyDeviceStateToDevice } from './deviceStateAdapter';
import { getPassphraseProtectionFromDeviceState } from './deviceStateSelectors';
// 使用 hd-core 的标准类型
export type ApiResponse<T = any> = Success<T> | Unsuccessful;
export type HardwareApiMethod = keyof CoreApi;
export type HardwareApiCallMode = 'params' | 'connectId-params' | 'connectId-deviceId-params';

function getErrorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (error && typeof error === 'object') {
    const value = error as {
      error?: unknown;
      message?: unknown;
      payload?: { error?: unknown };
    };
    return [value.error, value.message, value.payload?.error]
      .filter(item => typeof item === 'string')
      .join(' ');
  }
  return '';
}

export function getDeviceSearchUserMessage(error: unknown): string {
  const normalized = getErrorText(error).toLowerCase();
  if (normalized.includes('not supported')) {
    return 'WebUSB is not supported in this browser.';
  }
  if (
    normalized.includes('permission') ||
    normalized.includes('securityerror') ||
    normalized.includes('notallowederror')
  ) {
    return 'Device permission is required. Reconnect the device and approve the browser prompt.';
  }
  if (
    normalized.includes('protocol') ||
    normalized.includes('did not respond') ||
    normalized.includes('timeout')
  ) {
    return 'The device did not respond. Reconnect it, unlock it if needed, and try again.';
  }
  if (
    normalized.includes('notfounderror') ||
    normalized.includes('no device') ||
    normalized.includes('not found')
  ) {
    return 'No compatible device was selected. Connect a OneKey device and try again.';
  }
  return 'Unable to connect to the device. Reconnect it and try again.';
}

type PassphraseStateMetadata = {
  passphraseState?: string;
};

function extractPassphraseStateMetadata(payload: unknown): PassphraseStateMetadata {
  if (typeof payload === 'string') return { passphraseState: payload };
  if (!payload || typeof payload !== 'object') return {};
  const value = (payload as { passphraseState?: unknown }).passphraseState;
  return typeof value === 'string' ? { passphraseState: value } : {};
}

function clearPassphraseState(params: Record<string, unknown>) {
  delete params.passphraseState;
  useHardwareStore.getState().setCommonParameter('passphraseState', '');
}

function updateCachedDeviceState(connectId: string, state: DeviceState) {
  const store = useDeviceStore.getState();
  if (store.currentDevice?.connectId === connectId) {
    store.setCurrentDevice(applyDeviceStateToDevice(store.currentDevice, state));
  }
  store.setDeviceState(state);
}

async function resolvePassphraseProtection(
  sdk: CoreApi,
  connectId: string
): Promise<boolean | undefined> {
  const store = useDeviceStore.getState();
  const cachedState = store.currentDevice?.connectId === connectId ? store.currentDevice.state : undefined;
  if (cachedState) return getPassphraseProtectionFromDeviceState(cachedState);

  const stateResult = await sdk.getDeviceState(connectId);
  if (!stateResult.success || !stateResult.payload) return undefined;
  updateCachedDeviceState(connectId, stateResult.payload);
  return getPassphraseProtectionFromDeviceState(stateResult.payload);
}

async function preparePassphraseParams(
  sdk: CoreApi,
  method: HardwareApiMethod,
  params: Record<string, unknown>,
  connectId: string
) {
  if (!METHODS_REQUIRING_PASSPHRASE_CHECK.includes(method)) return;

  if (params.useEmptyPassphrase === true) {
    clearPassphraseState(params);
    return;
  }

  const passphraseProtection = await resolvePassphraseProtection(sdk, connectId);
  if (passphraseProtection === false) {
    clearPassphraseState(params);
    return;
  }

  if (typeof params.passphraseState === 'string' && params.passphraseState) return;

  const walletResult = await sdk.openWalletSession(connectId, { mode: 'select-hidden' });
  if (!walletResult.success) {
    clearPassphraseState(params);
    throw new Error(String(walletResult.payload?.error || 'Failed to open wallet session.'));
  }

  const metadata = extractPassphraseStateMetadata(walletResult.payload);
  if (!metadata.passphraseState) {
    clearPassphraseState(params);
    return;
  }

  params.passphraseState = metadata.passphraseState;
  useHardwareStore.getState().setCommonParameter('passphraseState', metadata.passphraseState);
}

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
export async function submitPin(
  pin: string,
  responseCorrelation?: UiResponseCorrelation
): Promise<void> {
  logRequest('Submitting PIN response');
  if (typeof window === 'undefined') return;

  try {
    const sdkInstance = await getSDKInstance();
    sdkInstance.uiResponse({
      type: UI_RESPONSE.RECEIVE_PIN,
      payload: pin,
      ...(responseCorrelation ?? {}),
    });
    logResponse('PIN response submitted successfully');
  } catch (error) {
    logError('Failed to submit PIN response', { error });
    throw error;
  }
}

export async function submitPassphrase(
  passphrase: string,
  onDevice = false,
  save = false,
  responseCorrelation?: UiResponseCorrelation
): Promise<void> {
  logRequest('Submitting passphrase response', { onDevice, save });
  if (typeof window === 'undefined') return;

  try {
    const sdkInstance = await getSDKInstance();
    sdkInstance.uiResponse({
      type: UI_RESPONSE.RECEIVE_PASSPHRASE,
      payload: {
        value: passphrase || '',
        passphraseOnDevice: onDevice,
        save: save,
      },
      ...(responseCorrelation ?? {}),
    });
    logResponse('Passphrase response submitted successfully');
  } catch (error) {
    logError('Failed to submit passphrase response', { error });
    throw error;
  }
}

const getResponseError = (response: ApiResponse, fallback: string) => {
  if (response.success) return fallback;
  const payload = response.payload as { error?: string } | undefined;
  return payload?.error || fallback;
};

/**
 * Refreshes the public cross-protocol state and keeps the legacy Features projection for
 * existing playground panels. Protocol selection still comes from the SDK's active probe.
 */
export async function initializeDevice(device: DeviceInfo): Promise<DeviceInfo> {
  if (!device.connectId) {
    throw new Error('Device is missing connectId');
  }

  const sdk = await getSDKInstance();
  if (device.connectProtocol) {
    sdk.setDeviceConnectProtocol(device.connectId, device.connectProtocol);
  }

  const stateResult = await sdk.getDeviceState(device.connectId, { scope: 'firmware' });
  if (!stateResult.success) {
    throw new Error(getResponseError(stateResult, 'Failed to initialize device state'));
  }

  const state = stateResult.payload;
  const featuresResult = await sdk.getFeatures(device.connectId);
  const features = featuresResult.success ? featuresResult.payload : device.features;

  if (!featuresResult.success) {
    logInfo('Legacy Features projection is unavailable; using DeviceState only', {
      connectId: device.connectId,
      protocol: state.protocol,
    });
  }

  return {
    ...device,
    connectProtocol: state.protocol === 'unknown' ? device.connectProtocol : state.protocol,
    serialNo: state.identity.serialNo || device.serialNo,
    uuid: state.identity.serialNo || device.serialNo || device.uuid,
    deviceId: state.identity.deviceId,
    deviceType: state.identity.deviceType,
    label: state.identity.label ?? device.label,
    state,
    features,
  };
}

/** Hydrate discovered devices through the current public DeviceState API. */
export async function hydrateConnectedDeviceInfo(device: DeviceInfo): Promise<DeviceInfo> {
  return initializeDevice(device);
}

// 获取设备的passphraseState
export async function getPassphraseState(
  connectId: string
): Promise<ApiResponse<string | undefined>> {
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
  params: Record<string, unknown>,
  callMode?: HardwareApiCallMode
): Promise<ApiResponse> {
  logRequest(`Calling hardware API method: ${method}`, {
    parameterKeys: Object.keys(params).sort(),
  });

  if (typeof window === 'undefined') {
    const error = 'Browser environment required';
    logError(`Hardware API call failed: ${method}`, { error });
    return {
      success: false,
      payload: { error },
    } as Unsuccessful;
  }

  try {
    if (method === 'searchDevices') {
      return searchDevices({ promptWebUsbAccess: true });
    }

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

    let executionParams = { ...params };
    const { connectId, deviceId } = executionParams;

    if (typeof connectId === 'string' && connectId) {
      await preparePassphraseParams(sdk, method, executionParams, connectId);
    }

    executionParams = normalizeProtocolAwareParams(method, executionParams);

    // 打印最终传入硬件的关键参数（尽量不变形，保持与 hd-core 接口一致）
    try {
      // 使用通用预览函数
      previewHardwareParams(method as string, executionParams);
    } catch (e) {
      // 仅日志失败时忽略
      logError('Failed to preview hardware params', { error: e });
    }

    logInfo(`Executing method ${method}`, {
      connectId,
      deviceId,
      hasPassphraseState: !!executionParams.passphraseState,
      useEmptyPassphrase: executionParams.useEmptyPassphrase,
    });

    const methodFunc = sdk[method] as (...args: any[]) => Promise<ApiResponse>;
    let result: ApiResponse;

    const hasDeviceIdParameter = Object.prototype.hasOwnProperty.call(
      executionParams,
      'deviceId'
    );
    const hasConnectIdParameter = Object.prototype.hasOwnProperty.call(
      executionParams,
      'connectId'
    );
    const resolvedCallMode =
      callMode ??
      (hasDeviceIdParameter
        ? 'connectId-deviceId-params'
        : hasConnectIdParameter
        ? 'connectId-params'
        : 'params');

    if (resolvedCallMode === 'connectId-deviceId-params') {
      // 三参数调用：connectId, deviceId, params
      result = await methodFunc(connectId, deviceId, executionParams);
    } else if (resolvedCallMode === 'connectId-params') {
      // 二参数调用：connectId, params
      result = await methodFunc(connectId, executionParams);
    } else {
      // 无连接方法以 params 作为首个参数。
      result = await methodFunc(executionParams);
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
export type SearchDevicesOptions = {
  promptWebUsbAccess?: boolean;
};

export async function searchDevices({
  promptWebUsbAccess = false,
}: SearchDevicesOptions = {}): Promise<ApiResponse<DeviceInfo[]>> {
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
    }

    if (currentTransport === 'webusb' && promptWebUsbAccess) {
      const accessResponse = await sdkInstance.promptWebDeviceAccess();
      if (accessResponse.success && accessResponse.payload.device) {
        const selectedDevice = accessResponse.payload.device as unknown as DeviceInfo;
        logResponse('WebUSB device authorized', {
          connectId: selectedDevice.connectId,
          protocol: selectedDevice.connectProtocol,
        });
        return {
          success: true,
          payload: [selectedDevice],
        } as Success<DeviceInfo[]>;
      }

      // The browser may already have authorized devices even when the chooser is cancelled.
      logInfo('WebUSB chooser did not return a device; searching existing grants');
    }

    // 对于所有transport类型，使用标准的searchDevices
    const response = await sdkInstance.searchDevices();

    if (response.success && response.payload) {
      logResponse('Devices found', {
        count: Array.isArray(response.payload) ? response.payload.length : 1,
        devices: Array.isArray(response.payload)
          ? response.payload.map(d => d.connectId || 'unknown')
          : ['single device'],
      });
      return response as Success<DeviceInfo[]>;
    } else {
      const errorPayload = response.payload as any;
      return {
        success: false,
        payload: {
          error: getDeviceSearchUserMessage(errorPayload),
        },
      } as Unsuccessful;
    }
  } catch (error) {
    const errorMsg = getDeviceSearchUserMessage(error);
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
