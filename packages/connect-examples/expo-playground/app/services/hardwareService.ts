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
import { methodSupportsCommonParameters } from '../utils/constants';
import { previewHardwareParams } from './previewHardwareParams';
import type { HardwareConnectProtocol } from '@onekeyfe/hd-shared';
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
    sdkInstance.uiResponse({
      type: UI_RESPONSE.RECEIVE_PIN,
      payload: pin || '@@ONEKEY_INPUT_PIN_IN_DEVICE',
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
  save = false
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
    });
    logResponse('Passphrase response submitted successfully');
  } catch (error) {
    logError('Failed to submit passphrase response', { error });
    throw error;
  }
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

    // FOR EXAMPLE APP: 如果参数中没有 passphraseState (或者为空)，则尝试从设备获取
    // app-monorepo 的逻辑更复杂，这里简化以满足 example 的需求
    if (connectId && methodSupportsCommonParameters(method)) {
      // 只有当 params.passphraseState 是空字符串、undefined 或 null 时才尝试获取
      if (
        params.passphraseState === '' ||
        params.passphraseState === undefined ||
        params.passphraseState === null
      ) {
        logInfo(
          `PassphraseState is empty in params for method: ${method}, attempting to fetch from device.`
        );
        try {
          const passphraseResult = await getPassphraseState(connectId as string);
          if (passphraseResult.success && typeof passphraseResult.payload === 'string') {
            logInfo(`Passphrase state obtained from device: ${passphraseResult.payload}`);
            params.passphraseState = passphraseResult.payload;
            // IMPORTANT: Update the store's commonParameter so the UI reflects the fetched value
            useHardwareStore
              .getState()
              .setCommonParameter('passphraseState', passphraseResult.payload);
          } else {
            logInfo('Device passphrase protection not enabled or failed to get state from device.');
            // Ensure passphraseState is explicitly an empty string if not enabled/fetched
            params.passphraseState = '';
            useHardwareStore.getState().setCommonParameter('passphraseState', '');
          }
        } catch (passphraseError) {
          logError('Failed to get passphrase state from device', { passphraseError });
          // In case of error, ensure it's an empty string to avoid unexpected behavior
          params.passphraseState = '';
          useHardwareStore.getState().setCommonParameter('passphraseState', '');
        }
      } else {
        logInfo(`Using existing passphrase state from params: ${params.passphraseState}`);
      }
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

    // 根据参数中是否包含 deviceId 来决定调用方式
    if (deviceId) {
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
