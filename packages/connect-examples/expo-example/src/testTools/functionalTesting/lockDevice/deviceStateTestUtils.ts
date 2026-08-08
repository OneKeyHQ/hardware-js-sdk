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

          if (isExpectedDevice && response.payload.bootloader_mode === true) {
            return response;
          }

          if (isExpectedDevice) {
            lastError = `设备仍处于 ${
              response.payload.bootloader_mode ? 'Bootloader' : 'Normal'
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
