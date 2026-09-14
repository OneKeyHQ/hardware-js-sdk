import { getDeviceUUID } from '@onekeyfe/hd-core';

import { getProtocolAwareFeatures } from '../../../utils/protocolAwareFeatures';

import type { TestCaseDataWithKey } from '../../../components/BaseTestRunner/types';
import type { TestCaseDataType } from './types';
import type { CoreApi, Features } from '@onekeyfe/hd-core';

type ConnectProtocol = 'V1' | 'V2';

type BootloaderPollingOptions = {
  sdk: CoreApi;
  connectId: string;
  expectedSerialNo: string;
  protocolHint?: ConnectProtocol;
  attempts?: number;
  initialDelayMs?: number;
  pollIntervalMs?: number;
};

const delay = (durationMs: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, durationMs);
  });

const normalizeSerialNo = (serialNo?: string | null) => serialNo?.trim() ?? '';

export function createBootloaderDeviceTestCase(
  features: Features
): TestCaseDataWithKey<TestCaseDataType> {
  return {
    $key: 'test-bootloader',
    id: 'test-bootloader',
    title: '检测 Boot Device Info',
    method: 'deviceRebootToBootloader',
    params: {
      expectedSerialNo: getDeviceUUID(features),
      protocolHint: features.protocol,
    },
    type: 'bootloader',
    expect: true,
  };
}

export function isBootloaderDevice(features: Features) {
  return features.protocol === 'V2'
    ? features.mode === 'bootloader'
    : features.bootloader_mode === true;
}

export function validateDeviceState(
  features: Features,
  state: 'uninitialized' | TestCaseDataType['type']
): string {
  const isV2 = features.protocol === 'V2';
  if (state === 'uninitialized') {
    if (features.initialized !== false) {
      return `actual: ${features.initialized}, 预期: 设备未初始化`;
    }
    // V2 onboarding may remain locked and does not expose legacy PIN protection.
    if (isV2) {
      return features.mode === 'notInitialized'
        ? ''
        : `actual: ${features.mode}, 预期: notInitialized 模式`;
    }
    if (features.unlocked !== true) {
      return `actual: ${features.unlocked}, 预期: 设备已解锁`;
    }
    if (features.passphrase_protection !== false) {
      return `actual: ${features.passphrase_protection}, 预期: Passphrase 未启用`;
    }
    if (features.pin_protection !== false) {
      return `actual: ${features.pin_protection}, 预期: pin 未设置`;
    }
  } else if (state === 'lock') {
    if (features.unlocked !== false) {
      return `actual: ${features.unlocked}, 预期: 设备未解锁`;
    }
  } else if (state === 'unlock') {
    if (features.unlocked !== true) {
      return `actual: ${features.unlocked}, 预期: 设备已解锁`;
    }
    if (features.initialized !== true) {
      return `actual: ${features.initialized}, 预期: 设备已初始化`;
    }
    if (isV2 ? features.mode !== 'normal' : features.bootloader_mode !== false) {
      return `actual: ${isV2 ? features.mode : features.bootloader_mode}, 预期: 正常固件模式`;
    }
    if (!isV2 && features.pin_protection !== true) {
      return `actual: ${features.pin_protection}, 预期: pin 已设置`;
    }
  } else if (state === 'passphraseOpened' || state === 'passphraseClosed') {
    const protection = isV2 ? features.passphraseProtection : features.passphrase_protection;
    const expected = state === 'passphraseOpened';
    if (protection !== expected) {
      return `actual: ${protection}, 预期: Passphrase ${expected ? '启用' : '未启用'}`;
    }
  }
  return '';
}

/**
 * 重启进入 Bootloader 后，原连接可能暂时不可用，也可能以新的传输 ID 重新枚举。
 * 轮询时优先复用原连接，并把搜索到的同一物理设备加入候选连接。
 */
export async function waitForBootloaderFeatures({
  sdk,
  connectId,
  expectedSerialNo,
  protocolHint,
  attempts = 10,
  initialDelayMs = 3000,
  pollIntervalMs = 1000,
}: BootloaderPollingOptions) {
  const expectedSerial = normalizeSerialNo(expectedSerialNo);
  const candidates = new Map<string, ConnectProtocol | undefined>([[connectId, protocolHint]]);
  let lastError = '';

  if (!expectedSerial) {
    throw new Error('无法确认目标设备序列号，已停止 Bootloader 重连检测');
  }

  if (initialDelayMs > 0) {
    await delay(initialDelayMs);
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let foundExpectedDevice = false;

    for (const [candidateConnectId, candidateProtocol] of candidates) {
      try {
        const response = await getProtocolAwareFeatures(
          sdk,
          candidateConnectId,
          {
            retryCount: 0,
            timeout: 3000,
            protocolV2DeviceInfoTimeoutMs: 3000,
          },
          candidateProtocol
        );
        if (!response.success) {
          lastError = response.payload?.error ?? '读取设备状态失败';
        } else {
          const actualSerial = normalizeSerialNo(getDeviceUUID(response.payload));
          const isExpectedDevice = actualSerial === expectedSerial;
          foundExpectedDevice ||= isExpectedDevice;

          if (isExpectedDevice && isBootloaderDevice(response.payload)) {
            return response;
          }

          if (isExpectedDevice) {
            const legacyMode = response.payload.bootloader_mode ? 'Bootloader' : 'Normal';
            lastError = `设备仍处于 ${
              response.payload.protocol === 'V2' ? response.payload.mode : legacyMode
            } 模式`;
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    // Pro2/Neo 切换 Bootloader 时 PID 不变，原连接可读时无需重复枚举设备。
    // 只有原连接失效时才搜索，以兼容会产生新 connectId 的其他设备。
    if (!foundExpectedDevice) {
      try {
        const searchResponse = await sdk.searchDevices();
        if (searchResponse.success) {
          searchResponse.payload.forEach(device => {
            const candidateConnectId = device.connectId;
            if (!candidateConnectId) return;

            const candidateSerial = normalizeSerialNo(device.serialNo ?? device.uuid);
            if (candidateSerial !== expectedSerial) return;

            const candidateProtocol =
              device.connectProtocol === 'V1' || device.connectProtocol === 'V2'
                ? device.connectProtocol
                : undefined;
            candidates.clear();
            candidates.set(candidateConnectId, candidateProtocol);
          });
        } else {
          lastError = searchResponse.payload?.error ?? lastError;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    if (attempt < attempts - 1 && pollIntervalMs > 0) {
      await delay(pollIntervalMs);
    }
  }

  throw new Error(
    `等待 Bootloader 设备超时（尝试 ${attempts} 次）${lastError ? `：${lastError}` : ''}`
  );
}
