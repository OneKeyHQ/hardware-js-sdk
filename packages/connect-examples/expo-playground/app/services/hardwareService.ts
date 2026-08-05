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
import { METHODS_REQUIRING_PASSPHRASE_CHECK } from '../utils/constants';
import { previewHardwareParams } from './previewHardwareParams';
import { normalizeProtocolAwareParams } from './protocolAwareParams';
import type { UiResponseCorrelation } from '@onekeyfe/hd-core';
import type { DeviceInfo } from '../types/hardware';
// 使用 hd-core 的标准类型
export type ApiResponse<T = any> = Success<T> | Unsuccessful;
export type HardwareApiMethod = keyof CoreApi;

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
  params: Record<string, unknown>
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

    // FOR EXAMPLE APP: 如果参数中没有 passphraseState (或者为空)，则尝试从设备获取
    // app-monorepo 的逻辑更复杂，这里简化以满足 example 的需求
    if (connectId && METHODS_REQUIRING_PASSPHRASE_CHECK.includes(method)) {
      // 只有当 params.passphraseState 是空字符串、undefined 或 null 时才尝试获取
      if (
        executionParams.passphraseState === '' ||
        executionParams.passphraseState === undefined ||
        executionParams.passphraseState === null
      ) {
        logInfo(
          `PassphraseState is empty in params for method: ${method}, attempting to fetch from device.`
        );
        try {
          const passphraseResult = await getPassphraseState(connectId as string);
          if (passphraseResult.success && typeof passphraseResult.payload === 'string') {
            logInfo('Passphrase state obtained from device');
            executionParams.passphraseState = passphraseResult.payload;
            // IMPORTANT: Update the store's commonParameter so the UI reflects the fetched value
            useHardwareStore
              .getState()
              .setCommonParameter('passphraseState', passphraseResult.payload);
          } else {
            logInfo('Device passphrase protection not enabled or failed to get state from device.');
            // Ensure passphraseState is explicitly an empty string if not enabled/fetched
            executionParams.passphraseState = '';
            useHardwareStore.getState().setCommonParameter('passphraseState', '');
          }
        } catch (passphraseError) {
          logError('Failed to get passphrase state from device', { passphraseError });
          // In case of error, ensure it's an empty string to avoid unexpected behavior
          executionParams.passphraseState = '';
          useHardwareStore.getState().setCommonParameter('passphraseState', '');
        }
      } else {
        logInfo('Using the existing passphrase state from parameters');
      }
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

    if (method === 'openWalletSession') {
      result = await methodFunc(connectId, executionParams);
    } else if (deviceId) {
      // 三参数调用：connectId, deviceId, params
      result = await methodFunc(connectId, deviceId, executionParams);
    } else {
      // 二参数调用：connectId, params
      result = await methodFunc(connectId, executionParams);
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
