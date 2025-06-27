/* eslint-disable @typescript-eslint/no-explicit-any */
import { UI_RESPONSE, Success, Unsuccessful, CoreApi } from '@onekeyfe/hd-core';
import { logError, logRequest, logResponse, logInfo } from '../utils/logger';
import {
  getCurrentSDKInstance,
  clearSDKInstanceCache,
  TransportType,
} from '../utils/hardwareInstance';
import { useHardwareStore, CommonParametersState } from '../store/hardwareStore';

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
    // 使用统一的TransportManager进行切换
    const { TransportManager } = await import('../utils/hardwareInstance');

    // 清除旧的SDK实例缓存
    clearSDKInstanceCache();

    // 使用统一的transport管理器更新状态
    TransportManager.setTransport(transport);

    // 获取新的SDK实例（会根据新的transport类型初始化）
    const sdkInstance = await getSDKInstance();

    // 切换transport
    if (transport === 'emulator') {
      await sdkInstance.switchTransport('emulator');
    } else {
      const envParam = transport === 'webusb' ? 'webusb' : 'web';
      await sdkInstance.switchTransport(envParam);
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
    await sdkInstance.uiResponse({
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

// 需要passphrase检查的方法列表
const METHODS_REQUIRING_PASSPHRASE_CHECK = [
  'evmGetAddress',
  'evmGetPublicKey',
  'evmSignMessage',
  'evmSignTransaction',
  'evmSignTypedData',
  'btcGetAddress',
  'btcGetPublicKey',
  'btcSignMessage',
  'btcSignTransaction',
  'cosmosGetAddress',
  'cosmosGetPublicKey',
  'starcoinGetAddress',
  'starcoinGetPublicKey',
  'cardanoGetAddress',
  'cardanoGetPublicKey',
  'solGetAddress',
  'aptosGetAddress',
  'aptosGetPublicKey',
  'nearGetAddress',
  'polkadotGetAddress',
  'stellarGetAddress',
  'xrpGetAddress',
  'tronGetAddress',
  'tonGetAddress',
  'suiGetAddress',
  'suiGetPublicKey',
  'filecoinGetAddress',
  'confluxGetAddress',
  'kaspaGetAddress',
  'nervosGetAddress',
  'nemGetAddress',
  'nexaGetAddress',
  'algoGetAddress',
  'dnxGetAddress',
  'scdoGetAddress',
  'alephiumGetAddress',
  // 以及其他签名方法
  'cosmosSignTransaction',
  'starcoinSignMessage',
  'starcoinSignTransaction',
  'cardanoSignMessage',
  'cardanoSignTransaction',
  'solSignTransaction',
  'aptosSignMessage',
  'aptosSignTransaction',
  'nearSignTransaction',
  'polkadotSignTransaction',
  'stellarSignTransaction',
  'xrpSignTransaction',
  'tronSignMessage',
  'tronSignTransaction',
  'tonSignMessage',
  'tonSignProof',
  'suiSignMessage',
  'suiSignTransaction',
  'filecoinSignTransaction',
  'confluxSignMessage',
  'confluxSignTransaction',
  'kaspaSignTransaction',
  'nervosSignTransaction',
  'nemSignTransaction',
  'nexaSignTransaction',
  'algoSignTransaction',
  'dnxSignTransaction',
  'scdoSignMessage',
  'scdoSignTransaction',
  'alephiumSignMessage',
  'alephiumSignTransaction',
  'nostrGetPublicKey',
  'nostrSignEvent',
  'nostrSignSchnorr',
  'nostrEncryptMessage',
  'nostrDecryptMessage',
];

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
    if (connectId && METHODS_REQUIRING_PASSPHRASE_CHECK.includes(method)) {
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
export async function searchDevices(): Promise<ApiResponse> {
  logRequest('Searching for devices');

  // 使用统一的TransportManager获取当前transport类型
  const { TransportManager } = await import('../utils/hardwareInstance');
  const currentTransport = TransportManager.getCurrentTransport();
  logInfo(`Using transport type: ${currentTransport}`);

  // WebUSB 特殊处理 - 使用更可靠的 promptWebDeviceAccess 方法
  if (currentTransport === 'webusb') {
    try {
      logInfo('Using promptWebDeviceAccess for WebUSB');
      const sdkInstance = await getSDKInstance();
      const promptResponse = await sdkInstance.promptWebDeviceAccess();

      logInfo('promptWebDeviceAccess completed', {
        success: promptResponse.success,
        hasDevice: promptResponse.success ? !!promptResponse.payload.device : false,
      });

      if (promptResponse.success && promptResponse.payload.device) {
        return {
          success: true,
          payload: [promptResponse.payload.device],
        } as Success<any>;
      } else {
        return {
          success: false,
          payload: { error: 'No device selected or permission denied' },
        } as Unsuccessful;
      }
    } catch (webUsbError) {
      if (
        webUsbError instanceof Error &&
        (webUsbError.name === 'NotFoundError' || webUsbError.message.includes('No device selected'))
      ) {
        const error = '用户取消选择设备';
        logInfo('User canceled device selection');
        return {
          success: false,
          payload: { error },
        } as Unsuccessful;
      }
      logError('WebUSB promptWebDeviceAccess failed', {
        webUsbError,
      });
      return {
        success: false,
        payload: { error: `WebUSB access failed: ${webUsbError}` },
      } as Unsuccessful;
    }
  }

  // 对于其他transport类型，使用标准的searchDevices
  return callHardwareAPI('searchDevices', {});
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
