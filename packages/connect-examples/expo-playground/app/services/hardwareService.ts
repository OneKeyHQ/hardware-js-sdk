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
import type { HardwareConnectProtocol } from '@onekeyfe/hd-shared';
import type { DeviceInfo } from '../types/hardware';
import { applyDeviceStateToDevice } from './deviceStateAdapter';
import { getPassphraseProtectionFromDeviceState } from './deviceStateSelectors';
import type { DeviceState } from '@onekeyfe/hd-core';
// 使用 hd-core 的标准类型
export type ApiResponse<T = any> = Success<T> | Unsuccessful;
export type HardwareApiMethod = keyof CoreApi;
export type HardwareDebugApiMethod =
  | 'deviceInfoGet'
  | 'deviceStatusGet'
  | 'deviceSettingsGet'
  | 'protocolInfoRequest'
  | 'ping'
  | 'deviceSessionOpen'
  | 'deviceFirmwareUpdate'
  | 'deviceGetFirmwareUpdateStatus'
  | 'deviceFactoryInfoSet'
  | 'deviceFactoryInfoGet'
  | 'deviceSettingsSet'
  | 'deviceSettingsPageShow'
  | 'filesystemPermissionFix'
  | 'filesystemFormat';
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
  deviceId?: string;
  passphraseState?: string;
  sessionId?: string;
  passphraseProtection?: boolean | null;
};

const extractPassphraseStateMetadata = (payload: unknown): PassphraseStateMetadata => {
  if (typeof payload === 'string') return { passphraseState: payload };
  if (!payload || typeof payload !== 'object') return {};

  const maybeState = (payload as { passphraseState?: unknown }).passphraseState;
  const maybeDeviceId = (payload as { deviceId?: unknown }).deviceId;
  const maybeSessionId = (payload as { sessionId?: unknown }).sessionId;
  const maybePassphraseProtection = (payload as { passphraseProtection?: unknown })
    .passphraseProtection;

  return {
    deviceId: typeof maybeDeviceId === 'string' ? maybeDeviceId : undefined,
    passphraseState: typeof maybeState === 'string' ? maybeState : undefined,
    sessionId: typeof maybeSessionId === 'string' ? maybeSessionId : undefined,
    passphraseProtection:
      typeof maybePassphraseProtection === 'boolean' ? maybePassphraseProtection : undefined,
  };
};

const clearPassphraseState = (params: Record<string, unknown>) => {
  delete params.passphraseState;
  useHardwareStore.getState().setCommonParameter('passphraseState', '');
};

const updateCachedDeviceState = (connectId: string, state: DeviceState) => {
  const store = useDeviceStore.getState();
  if (store.currentDevice?.connectId === connectId) {
    store.setCurrentDevice(applyDeviceStateToDevice(store.currentDevice, state));
  }
};

export async function hydrateConnectedDeviceInfo(device: DeviceInfo): Promise<DeviceInfo> {
  if (!device.connectId) return device;

  const sdk = await getSDKInstance();

  try {
    const stateResult = await sdk.getDeviceState(device.connectId);

    if (stateResult.success && stateResult.payload) {
      const state = stateResult.payload;
      const hydratedDevice = applyDeviceStateToDevice(device, state);
      updateCachedDeviceState(device.connectId, state);

      logResponse('Connected device hydrated via getDeviceState', {
        connectId: device.connectId,
        serialNo: state.identity.serialNo,
        deviceId: state.identity.deviceId,
        name: hydratedDevice.name,
      });
      return hydratedDevice;
    } else {
      const failurePayload = stateResult.payload as { code?: string | number };
      logInfo('Connected device state is temporarily unavailable', {
        connectId: device.connectId,
        code: failurePayload.code,
      });
    }
  } catch (error) {
    logInfo('Connected device state hydration was skipped', {
      connectId: device.connectId,
      errorType: error instanceof Error ? error.name : typeof error,
    });
  }

  return device;
}

const resolvePassphraseProtection = async (
  sdk: CoreApi,
  connectId: string
): Promise<boolean | undefined> => {
  const deviceState = useDeviceStore.getState();
  const cachedState =
    deviceState.currentDevice?.connectId === connectId
      ? deviceState.currentDevice.deviceState
      : undefined;

  if (cachedState) {
    return getPassphraseProtectionFromDeviceState(cachedState);
  }

  const stateResult = await sdk.getDeviceState(connectId);
  if (!stateResult.success || !stateResult.payload) {
    return undefined;
  }

  updateCachedDeviceState(connectId, stateResult.payload);
  return getPassphraseProtectionFromDeviceState(stateResult.payload);
};

const preparePassphraseParams = async (
  sdk: CoreApi,
  method: HardwareApiMethod,
  params: Record<string, unknown>,
  connectId: string
) => {
  if (!methodSupportsCommonParameters(method)) return;

  if (params.useEmptyPassphrase === true) {
    const result = await sdk.openWalletSession(connectId, { mode: 'standard' });
    if (!result.success) {
      throw new Error(String(result.payload?.error || 'Failed to open the standard wallet.'));
    }
    clearPassphraseState(params);
    useHardwareStore.getState().setWalletSession(null);
    return;
  }

  const passphraseProtection = await resolvePassphraseProtection(sdk, connectId);

  if (passphraseProtection === false) {
    if (params.passphraseState) {
      logInfo('Device passphrase protection is disabled. Clearing stale passphraseState.');
    }
    const result = await sdk.openWalletSession(connectId, { mode: 'standard' });
    if (!result.success) {
      throw new Error(String(result.payload?.error || 'Failed to open the standard wallet.'));
    }
    clearPassphraseState(params);
    useHardwareStore.getState().setWalletSession(null);
    return;
  }

  logInfo(`Preparing wallet session through openWalletSession for signer method: ${method}.`);

  try {
    const cachedSession = useHardwareStore.getState().walletSession;
    const requestedPassphraseState =
      typeof params.passphraseState === 'string' && params.passphraseState
        ? params.passphraseState
        : undefined;
    const canResume =
      cachedSession &&
      cachedSession.connectId === connectId &&
      (!requestedPassphraseState ||
        requestedPassphraseState === cachedSession.passphraseState);
    const passphraseResult = canResume
      ? await sdk.openWalletSession(connectId, {
          mode: 'resume-hidden',
          deviceId: cachedSession.deviceId,
          passphraseState: cachedSession.passphraseState,
          sessionId: cachedSession.sessionId,
        })
      : await sdk.openWalletSession(connectId, { mode: 'select-hidden' });

    if (!passphraseResult.success) {
      throw new Error(String(passphraseResult.payload?.error || 'Failed to open wallet session.'));
    }
    const passphraseMetadata = passphraseResult.success
      ? extractPassphraseStateMetadata(passphraseResult.payload)
      : {};

    if (passphraseMetadata.passphraseProtection === false) {
      logInfo('Device passphrase protection not enabled. Clearing passphraseState.');
      clearPassphraseState(params);
      useHardwareStore.getState().setWalletSession(null);
      return;
    }

    if (passphraseMetadata.passphraseState) {
      logInfo(`Passphrase state obtained from device: ${passphraseMetadata.passphraseState}`);
      params.passphraseState = passphraseMetadata.passphraseState;
      useHardwareStore
        .getState()
        .setCommonParameter('passphraseState', passphraseMetadata.passphraseState);
      if (
        passphraseMetadata.deviceId &&
        passphraseMetadata.sessionId
      ) {
        useHardwareStore.getState().setWalletSession({
          connectId,
          deviceId: passphraseMetadata.deviceId,
          passphraseState: passphraseMetadata.passphraseState,
          sessionId: passphraseMetadata.sessionId,
        });
      }
    } else {
      logInfo('Device passphrase protection enabled but no passphraseState was returned.');
      clearPassphraseState(params);
      useHardwareStore.getState().setWalletSession(null);
    }
  } catch (passphraseError) {
    logError('Failed to open wallet session', { passphraseError });
    clearPassphraseState(params);
    useHardwareStore.getState().setWalletSession(null);
    throw passphraseError;
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
  params: Record<string, unknown>,
  callMode?: HardwareApiCallMode
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

    // Preserve the three-argument signature before deviceId resolves; otherwise params
    // shifts into the deviceId slot and the SDK receives an undefined payload.
    const hasDeviceIdParameter = Object.prototype.hasOwnProperty.call(params, 'deviceId');
    const hasConnectIdParameter = Object.prototype.hasOwnProperty.call(params, 'connectId');
    const resolvedCallMode =
      callMode ??
      (hasDeviceIdParameter
        ? 'connectId-deviceId-params'
        : hasConnectIdParameter
        ? 'connectId-params'
        : 'params');

    if (resolvedCallMode === 'connectId-deviceId-params') {
      // 三参数调用：connectId, deviceId, params
      result = await methodFunc(connectId, deviceId, params);
    } else if (resolvedCallMode === 'connectId-params') {
      // 二参数调用：connectId, params
      result = await methodFunc(connectId, params);
    } else {
      // Connection-free methods receive params as their first argument.
      result = await methodFunc(params);
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

// 仅供 Pro2 Debug 页面调用 SDK 内部的原生 Protocol V2 命令。
// 这些命令不属于公共 CoreApi，外部业务应使用对应的语义化接口。
export async function callHardwareDebugAPI(
  method: HardwareDebugApiMethod,
  params: Record<string, unknown>
): Promise<ApiResponse> {
  logRequest(`Calling internal hardware debug method: ${method}`, params);

  if (typeof window === 'undefined') {
    return {
      success: false,
      payload: { error: 'Browser environment required' },
    } as Unsuccessful;
  }

  try {
    const sdk = await getSDKInstance();
    const result = (await sdk.call({ ...params, method })) as ApiResponse;

    if (result.success) {
      logResponse(`Internal hardware debug method successful: ${method}`, result.payload);
    } else {
      logError(`Internal hardware debug method failed: ${method}`, {
        code: result.payload?.code,
      });
    }
    return result;
  } catch (error) {
    const errorType = error instanceof Error ? error.name : typeof error;
    logError(`Internal hardware debug method exception: ${method}`, { errorType });
    return {
      success: false,
      payload: { error: `Internal debug method ${method} failed` },
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
        const msg = getDeviceSearchUserMessage(e);
        logInfo('WebUSB authorization was not completed', {
          errorType: e instanceof Error ? e.name : typeof e,
        });
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
      const errorPayload = response.payload;
      return {
        success: false,
        payload: {
          error: getDeviceSearchUserMessage(errorPayload),
        },
      } as Unsuccessful;
    }
  } catch (error) {
    const errorMsg = getDeviceSearchUserMessage(error);
    logInfo('Device search failed', {
      currentTransport,
      errorType: error instanceof Error ? error.name : typeof error,
      errorCode:
        error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined,
    });
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
