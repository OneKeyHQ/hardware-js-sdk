import { EFirmwareType, HardwareErrorCode } from '@onekeyfe/hd-shared';
import {
  DeviceRebootType,
  DeviceSessionPinType,
  DeviceSettingsPage,
  DeviceType,
} from '@onekeyfe/hd-transport';

import * as firmwareBinaryApi from '../src/api/firmware/getBinary';
import DnxGetAddress from '../src/api/dynex/DnxGetAddress';
import DnxSignTransaction from '../src/api/dynex/DnxSignTransaction';
import DirList from '../src/api/DirList';
import FileRead from '../src/api/FileRead';
import FileWrite from '../src/api/FileWrite';
import UploadPortfolio from '../src/api/UploadPortfolio';
import DeviceFactoryInfoGet from '../src/api/protocol-v2/DeviceFactoryInfoGet';
import DeviceFactoryInfoSet from '../src/api/protocol-v2/DeviceFactoryInfoSet';
import DeviceFirmwareUpdate from '../src/api/protocol-v2/DeviceFirmwareUpdate';
import DeviceGetFirmwareUpdateStatus from '../src/api/protocol-v2/DeviceGetFirmwareUpdateStatus';
import DeviceGetOnboardingStatus from '../src/api/protocol-v2/DeviceGetOnboardingStatus';
import DeviceInfoGet from '../src/api/protocol-v2/DeviceInfoGet';
import DeviceReboot from '../src/api/protocol-v2/DeviceReboot';
import DeviceCancel from '../src/api/device/DeviceCancel';
import DeviceChangePin from '../src/api/device/DeviceChangePin';
import DeviceLock from '../src/api/device/DeviceLock';
import DeviceSettings from '../src/api/device/DeviceSettings';
import DeviceUnlock from '../src/api/device/DeviceUnlock';
import DeviceWipe from '../src/api/device/DeviceWipe';
import DeviceUploadWallpaper from '../src/api/protocol-v2/DeviceUploadWallpaper';
import DeviceStatusGet from '../src/api/protocol-v2/DeviceStatusGet';
import FilesystemFormat from '../src/api/protocol-v2/FilesystemFormat';
import FilesystemPermissionFix from '../src/api/protocol-v2/FilesystemPermissionFix';
import ProtocolInfoRequest from '../src/api/protocol-v2/ProtocolInfoRequest';
import EVMSignTypedData from '../src/api/evm/EVMSignTypedData';
import EVMSignMessageEIP712 from '../src/api/evm/EVMSignMessageEIP712';
import FirmwareUpdateV3 from '../src/api/FirmwareUpdateV3';
import FirmwareUpdateV4, { assertProtocolV2ReconnectIdentity } from '../src/api/FirmwareUpdateV4';
import GetPassphraseState from '../src/api/GetPassphraseState';
import GetOnekeyFeatures from '../src/api/GetOnekeyFeatures';
import { batchGetPublickeys } from '../src/api/helpers/batchGetPublickeys';
import LnurlAuth from '../src/api/lightning/LnurlAuth';
import PolkadotGetAddress from '../src/api/polkadot/PolkadotGetAddress';
import SuiGetAddress from '../src/api/sui/SuiGetAddress';
import SuiGetPublicKey from '../src/api/sui/SuiGetPublicKey';
import SuiSignMessage from '../src/api/sui/SuiSignMessage';
import SuiSignTransaction from '../src/api/sui/SuiSignTransaction';
import SolGetAddress from '../src/api/solana/SolGetAddress';
import SolSignMessage from '../src/api/solana/SolSignMessage';
import SolSignOffchainMessage from '../src/api/solana/SolSignOffchainMessage';
import SolSignTransaction from '../src/api/solana/SolSignTransaction';
import TonGetAddress from '../src/api/ton/TonGetAddress';
import TonSignData from '../src/api/ton/TonSignData';
import TonSignMessage from '../src/api/ton/TonSignMessage';
import TonSignProof from '../src/api/ton/TonSignProof';
import TronGetAddress from '../src/api/tron/TronGetAddress';
import StellarGetAddress from '../src/api/stellar/StellarGetAddress';
import BenfenSignMessage from '../src/api/benfen/BenfenSignMessage';
import { getBitcoinForkSupportedProtocols } from '../src/api/btc/helpers/versionLimit';
import { DataManager } from '../src/data-manager';
import { createCoreApi } from '../src/inject';
import { Device, preloadSessionCache } from '../src/device/Device';
import { deviceWalletSessionStore } from '../src/device/DeviceWalletSessionStore';
import { DevicePool } from '../src/device/DevicePool';
import { DEVICE } from '../src/events';
import { UI_REQUEST } from '../src/events/ui-request';
import {
  PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS,
  PROTOCOL_V2_DEVICE_STATUS_GET_MESSAGE_TYPE,
  type ProtocolV2DeviceInfo,
  type ProtocolV2RuntimeMode,
  getProtocolV2RuntimeMode,
  parseProtocolV2BuildFingerprint,
  requestProtocolV2DeviceInfo,
  requestProtocolV2DeviceStatus,
  requestProtocolV2ProtocolInfo,
  supportsProtocolV2Message,
} from '../src/protocols/protocol-v2/features';
import {
  getProtocolV2WalletSession,
  refreshProtocolV2DeviceStatus,
} from '../src/protocols/protocol-v2/walletSession';
import {
  createProtocolV2UnlockContext,
  runMethodWithUnlockPolicy,
} from '../src/protocols/protocol-v2/unlockPolicyRunner';
import { BaseMethod } from '../src/api/BaseMethod';
import {
  buildProtocolV1FeaturesPayload,
  buildProtocolV2FeaturesPayload,
} from '../src/deviceProfile';
import {
  getDeviceType,
  getFirmwareType,
  getFirmwareUpdateField,
  getFirmwareUpdateFieldArray,
  getMethodVersionRange,
} from '../src/utils';
import { getDeviceFirmwareVersion } from '../src/utils/deviceVersionUtils';
import {
  getPassphraseState,
  getPassphraseStateWithRefreshDeviceInfo,
} from '../src/utils/deviceFeaturesUtils';

import type { DeviceCommands } from '../src/device/DeviceCommands';
import type { Features } from '../src/types';
import type { DeviceStatus, ProtocolInfo } from '@onekeyfe/hd-transport';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createWalletSessionTypedCall = (
  implementation = jest.fn(),
  status: Partial<DeviceStatus> = { passphrase_enabled: true }
) =>
  jest.fn((request: string, ...args: unknown[]) => {
    if (request === 'ProtocolInfoRequest') {
      return Promise.resolve({ message: { version: 2 } });
    }
    if (request === 'DeviceStatusGet') {
      return Promise.resolve({
        message: { unlocked: true, unlocked_attach_pin: false, ...status },
      });
    }
    return implementation(request, ...args);
  });

describe('DeviceUploadWallpaper', () => {
  test('encodes, uploads and applies a Pro2 wallpaper', async () => {
    const rgba = new Uint8Array(604 * 1024 * 4).fill(255);
    const typedCall = jest.fn().mockImplementation((request, _response, params) => {
      if (request === 'FilesystemDirMake') return { message: { message: 'directory ready' } };
      if (request === 'FilesystemFileWrite') {
        const file = params.file as { data: Uint8Array; offset: number };
        return { message: { processed_byte: file.offset + file.data.byteLength } };
      }
      if (request === 'DeviceSettingsSet') {
        return { message: { message: 'wallpaper applied' } };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    const method = new DeviceUploadWallpaper({
      id: 1,
      payload: { method: 'deviceUploadWallpaper', width: 604, height: 1024, rgba },
    });
    (method as any).device = stubDevice({ commands: { typedCall } });
    method.postMessage = jest.fn();

    method.init();
    const result = await method.run();

    expect(method.getSupportedProtocols()).toEqual(['V2']);
    expect(method.unlockPolicy).toBe('none');
    expect(typedCall).toHaveBeenNthCalledWith(1, 'FilesystemDirMake', 'Success', {
      path: 'vol1:/wallpapers',
    });
    const fileWriteCall = typedCall.mock.calls.find(call => call[0] === 'FilesystemFileWrite');
    expect(fileWriteCall?.[2]).toMatchObject({
      file: { path: expect.stringMatching(/^vol1:\/wallpapers\/wallpaper-[a-f0-9]+\.bin$/) },
      overwrite: true,
      append: false,
    });
    expect(typedCall).toHaveBeenLastCalledWith('DeviceSettingsSet', 'Success', {
      settings: { wallpaper_path: result.path },
    });
    expect(typedCall.mock.calls.some(call => call[0] === 'SetWallpaper')).toBe(false);
    expect(result).toMatchObject({ colorFormat: 'RGB565', message: 'wallpaper applied' });
    const fileWriteCallCount = typedCall.mock.calls.filter(
      call => call[0] === 'FilesystemFileWrite'
    ).length;
    expect(method.postMessage).toHaveBeenCalledTimes(fileWriteCallCount);
    expect(method.postMessage).toHaveBeenLastCalledWith({
      event: 'UI_EVENT',
      type: UI_REQUEST.DEVICE_PROGRESS,
      payload: expect.objectContaining({
        progress: 100,
        transferredBytes: result.size,
        totalBytes: result.size,
        elapsedMs: expect.any(Number),
      }),
    });
  });

  test('文件上传失败时不修改 wallpaper_path', async () => {
    const typedCall = jest.fn().mockImplementation(request => {
      if (request === 'FilesystemDirMake') return { message: {} };
      if (request === 'FilesystemFileWrite') throw new Error('write failed');
      return { message: {} };
    });
    const method = new DeviceUploadWallpaper({
      id: 1,
      payload: {
        method: 'deviceUploadWallpaper',
        width: 604,
        height: 1024,
        rgba: new Uint8Array(604 * 1024 * 4),
      },
    });
    (method as any).device = stubDevice({ commands: { typedCall } });
    method.init();

    await expect(method.run()).rejects.toThrow('write failed');
    expect(typedCall.mock.calls.some(call => call[0] === 'DeviceSettingsSet')).toBe(false);
  });

  test('rejects unsafe filenames before device communication', () => {
    const method = new DeviceUploadWallpaper({
      id: 1,
      payload: {
        method: 'deviceUploadWallpaper',
        width: 604,
        height: 1024,
        rgba: new Uint8Array(604 * 1024 * 4),
        fileName: '../wallpaper.bin',
      },
    });

    expect(() => method.init()).toThrow('fileName');
  });
});

describe('UploadPortfolio', () => {
  test('writes and applies the portfolio while the device is locked without unlocking', async () => {
    const packageBytes = new Uint8Array([1, 2, 3]);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { processed_byte: 3 } })
      .mockResolvedValueOnce({ message: { message: 'Portfolio updated' } });
    const unlockDevice = jest.fn().mockResolvedValue(undefined);
    const device = stubDevice({
      features: { unlocked: false },
      commands: { typedCall },
      isProtocolV2: () => true,
      unlockDevice,
    });
    const method = new UploadPortfolio({
      id: 1,
      payload: {
        method: 'uploadPortfolio',
        packageBytes,
      },
    });
    (method as any).device = device;

    method.init();
    await runMethodWithUnlockPolicy(method, device as any);

    expect(unlockDevice).not.toHaveBeenCalled();
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'FilesystemFileWrite',
      'FilesystemFile',
      expect.any(Object),
      { timeoutMs: undefined }
    );
    expect(typedCall).toHaveBeenNthCalledWith(2, 'PortfolioUpdate', 'Success', {});
  });

  test('stages the complete package before applying PortfolioUpdate', async () => {
    const packageBytes = new Uint8Array([1, 2, 3]);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { processed_byte: 3 } })
      .mockResolvedValueOnce({ message: { message: 'Portfolio updated' } });
    const method = new UploadPortfolio({
      id: 1,
      payload: {
        method: 'uploadPortfolio',
        packageBytes,
      },
    });
    (method as any).device = stubDevice({ commands: { typedCall } });
    method.postMessage = jest.fn();

    method.init();
    const result = await method.run();

    expect(method.unlockPolicy).toBe('none');
    expect(method.protocolV2UiMode).toBe('none');
    expect(method.protocolV2UiInteraction).toBeUndefined();
    expect(method.payload.emitProgress).toBe(false);
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'FilesystemFileWrite',
      'FilesystemFile',
      {
        file: {
          path: 'vol1:/portfolio/portfolio.okpkg.pending',
          offset: 0,
          total_size: 3,
          data: packageBytes,
        },
        overwrite: true,
        append: false,
        ui_percentage: 100,
      },
      { timeoutMs: undefined }
    );
    expect(typedCall).toHaveBeenNthCalledWith(2, 'PortfolioUpdate', 'Success', {});
    expect(method.postMessage).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      path: 'vol1:/portfolio/portfolio.okpkg.pending',
      processed_byte: 3,
      portfolioUpdated: true,
    });
  });

  test('does not apply PortfolioUpdate when staging fails', async () => {
    const typedCall = jest.fn().mockRejectedValue(new Error('write failed'));
    const method = new UploadPortfolio({
      id: 1,
      payload: {
        method: 'uploadPortfolio',
        packageBytes: new Uint8Array([1]),
      },
    });
    (method as any).device = stubDevice({ commands: { typedCall } });

    method.init();

    await expect(method.run()).rejects.toThrow('write failed');
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('stops after the acknowledged chunk when the operation is aborted', async () => {
    const packageBytes = new Uint8Array(4001);
    const abortController = new AbortController();
    const typedCall = jest.fn().mockImplementationOnce(() => {
      abortController.abort();
      return Promise.resolve({ message: { processed_byte: 2048 } });
    });
    const method = new UploadPortfolio({
      id: 1,
      payload: {
        method: 'uploadPortfolio',
        packageBytes,
      },
    });
    method.abortSignal = abortController.signal;
    (method as any).device = stubDevice({ commands: { typedCall } });

    method.init();

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallQueueActionCancelled,
    });
    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall).not.toHaveBeenCalledWith('PortfolioUpdate', 'Success', {});
  });
});

const descriptor = {
  id: 'ble-id',
  path: 'usb-path',
};

const protocolV2ApplicationInfo = {
  version: 1,
  build_fingerprint: 'application__1.2.3__abcdef0__PROD__RELEASE',
  supported_messages: [PROTOCOL_V2_DEVICE_STATUS_GET_MESSAGE_TYPE],
};

const protocolV2BootloaderInfo = {
  version: 1,
  build_fingerprint: 'bootloader__0.2.0__abcdef0__PROD__RELEASE',
  supported_messages: [],
};

const protocolV2RomloaderInfo = {
  version: 1,
  build_fingerprint: 'romloader__1.0.0__abcdef0__PROD__RELEASE',
  supported_messages: [],
};

/**
 * Add Device protocol and getCurrent* accessors to plain-object stubs.
 * Defaults match Device.ts and never replace an existing member such as jest.fn().
 */
function stubDevice<T extends Record<string, any>>(device: T): T {
  const d = device as any;
  d.updateState ??= jest.fn();
  d.markProtocolV2Reboot ??= jest.fn();
  d.isProtocolV2 ??= () => d.originalDescriptor?.protocolType === 'V2';
  d.isBootloader ??= () => d.features?.mode === 'bootloader';
  d.isRomloader ??= () => d.features?.mode === 'romloader';
  d.getProtocol ??= () => (d.isProtocolV2() ? 'V2' : 'V1');
  d.getCurrentDeviceType ??= () => getDeviceType(d.features);
  d.getCurrentFirmwareType ??= () => getFirmwareType(d.features);
  d.getCurrentFirmwareVersionString ??= () =>
    d.features ? getDeviceFirmwareVersion(d.features).join('.') : undefined;
  d.getCurrentBLEFirmwareVersionString ??= () => d.features?.bleVersion;
  d.getCurrentSafetyChecks ??= () => d.features?.safetyChecks;
  d.getCurrentDeviceId ??= () => d.features?.deviceId || undefined;
  d.getCurrentSerialNo ??= () => d.features?.serialNo || '';
  d.getCurrentPassphraseProtection ??= () => d.features?.passphraseProtection;
  d.getCurrentMethodVersionRange ??= (fn: (model: any) => any) => {
    const deviceType = d.getCurrentDeviceType();
    const range = fn(deviceType);
    if (range) return range;
    return getMethodVersionRange(d.features, fn);
  };
  d.updateProtocolV2Features ??= (
    deviceInfo?: ProtocolV2DeviceInfo,
    deviceStatus?: DeviceStatus,
    runtimeMode?: ProtocolV2RuntimeMode,
    protocolInfo?: ProtocolInfo
  ) => {
    d.features = buildProtocolV2FeaturesPayload({
      deviceInfo,
      deviceStatus: deviceStatus ?? deviceInfo?.status,
      previous: d.features,
      runtimeMode: runtimeMode ?? (deviceStatus ? 'normal' : undefined),
    });
    if (protocolInfo) {
      d.features.raw = {
        ...d.features.raw,
        protocolV2ProtocolInfo: protocolInfo,
      };
    }
    return d.features;
  };
  d.ensureProtocolV2RuntimeContext ??= (timeoutMs?: number) =>
    requestProtocolV2ProtocolInfo({
      commands: d.getCommands?.() ?? d.commands,
      timeoutMs,
    });
  d.probeProtocolV2RuntimeState ??= async (
    deviceInfo: ProtocolV2DeviceInfo,
    timeoutMs?: number
  ) => {
    const protocolInfo = await d.ensureProtocolV2RuntimeContext(timeoutMs);
    const runtimeMode = getProtocolV2RuntimeMode(protocolInfo);
    if (runtimeMode === 'bootloader' || runtimeMode === 'romloader') {
      return d.updateProtocolV2Features(deviceInfo, null, runtimeMode, protocolInfo);
    }
    if (!supportsProtocolV2Message(protocolInfo, PROTOCOL_V2_DEVICE_STATUS_GET_MESSAGE_TYPE)) {
      if (!runtimeMode) throw new Error('Unknown Protocol V2 runtime mode');
      return d.updateProtocolV2Features(deviceInfo, null, runtimeMode, protocolInfo);
    }
    const deviceStatus = await requestProtocolV2DeviceStatus({
      commands: d.getCommands(),
      timeoutMs,
    });
    return d.updateProtocolV2Features(deviceInfo, deviceStatus, 'normal', protocolInfo);
  };
  d.updateProtocolV2Status ??= (deviceStatus: DeviceStatus) => {
    d.features = buildProtocolV2FeaturesPayload({
      deviceInfo: d.features?.raw?.protocolV2DeviceInfo,
      deviceStatus,
      previous: d.features,
    });
    return d.features;
  };
  d.updateFeaturesPatch ??= (patch: Record<string, unknown>) => {
    d.features = {
      ...d.features,
      ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
    };
    return d.features;
  };
  return device;
}

// 直接复用生产映射函数，避免测试内副本与实现漂移（之前的手抄副本已缺失 se boot 字段）
function normalizeProtocolV2Features(
  _descriptor: unknown,
  deviceInfo?: ProtocolV2DeviceInfo,
  runtimeMode: ProtocolV2RuntimeMode = 'normal'
) {
  return buildProtocolV2FeaturesPayload({
    deviceInfo,
    deviceStatus: deviceInfo?.status,
    runtimeMode,
  });
}

const protocolV2BootloaderDeviceInfo: ProtocolV2DeviceInfo = {
  protocol_version: 1,
  hw: {
    serial_no: 'PR9999999999',
  },
  fw: {
    bootloader: {
      version: '0.0.1',
    },
  },
  se1: {},
};

async function requestProtocolV2Features({
  commands,
  descriptor: inputDescriptor,
}: {
  commands: DeviceCommands;
  descriptor?: unknown;
}) {
  const deviceInfo = await requestProtocolV2DeviceInfo({ commands });
  return buildProtocolV2FeaturesPayload({ deviceInfo });
}

describe('Protocol V2 feature adapter', () => {
  beforeEach(() => {
    deviceWalletSessionStore.clear();
  });

  test('treats passphrase status as unknown until the Protocol V2 device is unlocked', () => {
    const features = buildProtocolV2FeaturesPayload({
      deviceInfo: {
        hw: { serial_no: 'P2-LOCKED' },
      },
      deviceStatus: {
        unlocked: false,
        passphrase_enabled: true,
      },
    });

    expect(features.unlocked).toBe(false);
    expect(features.passphraseProtection).toBeNull();
    expect(features.passphrase_protection).toBeUndefined();
  });

  test('preserves the last trusted passphrase setting while the device is locked', () => {
    const features = buildProtocolV2FeaturesPayload({
      deviceInfo: {
        hw: { serial_no: 'P2-LOCKED' },
      },
      deviceStatus: {
        unlocked: false,
        passphrase_enabled: false,
      },
      previous: {
        ...buildProtocolV2FeaturesPayload({
          deviceInfo: { hw: { serial_no: 'P2-LOCKED' } },
        }),
        passphraseProtection: true,
      },
    });

    expect(features.passphraseProtection).toBe(true);
  });

  test('builds dynamic features from DeviceStatus when DeviceInfo has no nested status', () => {
    const deviceInfo: ProtocolV2DeviceInfo = {
      protocol_version: 1,
      hw: { serial_no: 'P2-STATIC' },
      fw: { application: { version: '1.0.0' } },
      coprocessor: { bt_adv_name: 'Pro2 STATIC' },
    };
    const deviceStatus: DeviceStatus = {
      device_id: 'P2-DYNAMIC',
      unlocked: true,
      init_states: true,
      backup_required: false,
      passphrase_enabled: true,
      attach_to_pin_enabled: true,
      unlocked_by_attach_to_pin: true,
    };

    const features = buildProtocolV2FeaturesPayload({
      deviceInfo,
      deviceStatus,
    });

    expect(features).toMatchObject({
      deviceId: 'P2-DYNAMIC',
      serialNo: 'P2-STATIC',
      bleName: 'Pro2 STATIC',
      initialized: true,
      unlocked: true,
      passphraseProtection: true,
      attachToPinEnabled: true,
      unlockedAttachPin: true,
    });
    expect(features.raw?.protocolV2DeviceInfo).toEqual(deviceInfo);
    expect(features.raw?.protocolV2DeviceStatus).toEqual(deviceStatus);
    expect(features.raw?.protocolV2DeviceInfo?.status).toBeUndefined();
  });

  test('keeps legacy snake_case feature fields for existing SDK consumers', () => {
    const protocolV1 = buildProtocolV1FeaturesPayload({
      device_id: 'v1-device',
      session_id: 'v1-session',
      ble_name: 'Classic BLE',
      passphrase_protection: true,
      unlocked: true,
    } as any);
    const protocolV2 = buildProtocolV2FeaturesPayload({
      deviceInfo: {
        hw: { serial_no: 'P2-001' },
        coprocessor: { bt_adv_name: 'Pro 2 BLE' },
      },
      deviceStatus: {
        device_id: 'v2-device',
        unlocked: true,
        passphrase_enabled: true,
      },
    });

    expect(protocolV1).toMatchObject({
      device_id: 'v1-device',
      session_id: 'v1-session',
      ble_name: 'Classic BLE',
      passphrase_protection: true,
    });
    expect(protocolV2).toMatchObject({
      device_id: 'v2-device',
      ble_name: 'Pro 2 BLE',
      onekey_device_type: 'PRO2',
      passphrase_protection: true,
    });
  });

  test('normalizes Protocol V2 DeviceInfo into existing Features fields', () => {
    const features = normalizeProtocolV2Features(descriptor as any, {
      protocol_version: 1,
      hw: {
        Device_type: DeviceType.PRO2,
        serial_no: 'PR2SERIAL',
      },
      fw: {
        romloader: {
          version: '0.1.0',
          build_id: 'rom-build',
          hash: [1, 2, 255],
        },
        application_data: {
          version: '9.8.7',
          build_id: 'app-data-build',
          hash: [9, 8, 7],
        },
        bootloader: {
          version: '0.2.0',
          build_id: 'boot-build',
          hash: new Uint8Array([10, 11]),
        },
        application: {
          version: '1.2.3',
          build_id: 'app-build',
          hash: 'abc123',
        },
      },
      coprocessor: {
        application: {
          version: '4.5.6',
          build_id: 'bt-build',
          hash: [12, 13],
        },
        bt_adv_name: 'Pro2 BLE',
      },
      se1: {
        application: {
          version: '7.8.9',
          build_id: 'se-build',
          hash: [14, 15],
        },
        state: 85,
      },
      se2: {
        application: {
          version: '8.0.0',
        },
        state: 0,
      },
      status: {
        device_id: 'PRO2-DEVICE-ID',
        unlocked: true,
        init_states: false,
        backup_required: true,
        passphrase_enabled: true,
        attach_to_pin_enabled: true,
        unlocked_by_attach_to_pin: true,
      },
    });

    expect(features.deviceId).toBe('PRO2-DEVICE-ID');
    expect(features.serialNo).toBe('PR2SERIAL');
    expect(features.deviceType).toBe('pro2');
    expect(features.protocolVersion).toBe(1);
    expect(features.firmwareVersion).toBe('1.2.3');
    expect(features.verify?.firmwareBuildId).toBe('app-build');
    expect(features.verify?.firmwareHash).toBe('abc123');
    expect(features.bootloaderVersion).toBe('0.2.0');
    expect(features.verify?.bootloaderBuildId).toBe('boot-build');
    expect(features.verify?.bootloaderHash).toBe('0a0b');
    expect(features.boardVersion).toBe('0.1.0');
    expect(features.verify?.boardBuildId).toBe('rom-build');
    expect(features.verify?.boardHash).toBe('0102ff');
    expect(features.bleName).toBe('Pro2 BLE');
    expect(features.bleVersion).toBe('4.5.6');
    expect(features.verify?.bleHash).toBe('0c0d');
    expect(features.se01Version).toBe('7.8.9');
    expect(features.verify?.se01Hash).toBe('0e0f');
    expect(features.label).toBeNull();
    expect(features.language).toBeNull();
    expect(features.initialized).toBe(false);
    expect(features.unlocked).toBe(true);
    expect(features.backupRequired).toBe(true);
    expect(features.passphraseProtection).toBe(true);
    expect(features.attachToPinEnabled).toBe(true);
    expect(features.unlockedAttachPin).toBe(true);
    expect(features.bleEnabled).toBeNull();
  });

  test('parses bootloader runtime mode from ProtocolInfo build fingerprint', () => {
    const deviceInfo = {
      protocol_version: 1,
      hw: {
        serial_no: 'PR2BOOT',
      },
      fw: {
        bootloader: {
          version: '0.2.0',
        },
      },
      se1: {},
    };
    const runtimeMode = getProtocolV2RuntimeMode(protocolV2BootloaderInfo);
    const features = normalizeProtocolV2Features(
      descriptor as any,
      deviceInfo as ProtocolV2DeviceInfo,
      runtimeMode
    );
    expect(features.mode).toBe('bootloader');
    expect(features.bootloaderMode).toBe(true);
    expect(features.initialized).toBeNull();
  });

  test('keeps normal mode when DeviceStatusGet succeeds even if application metadata is absent', () => {
    const features = normalizeProtocolV2Features(descriptor as any, {
      protocol_version: 1,
      hw: { serial_no: 'PR2NORMAL' },
      fw: { bootloader: { version: '0.2.0' } },
    });

    expect(features.mode).toBe('normal');
    expect(features.bootloaderMode).toBe(false);
  });

  test('keeps romloader distinct from bootloader using ProtocolInfo build fingerprint', () => {
    const deviceInfo = {
      protocol_version: 1,
      hw: {
        serial_no: 'PR2ROM',
      },
      fw: {
        romloader: {
          version: '1.0.0',
        },
        bootloader: {
          version: '2.0.0',
        },
      },
    };
    const runtimeMode = getProtocolV2RuntimeMode(protocolV2RomloaderInfo);
    const features = normalizeProtocolV2Features(
      descriptor as any,
      deviceInfo as ProtocolV2DeviceInfo,
      runtimeMode
    );
    expect(features.mode).toBe('romloader');
    expect(features.bootloaderMode).toBe(true);
    expect(features.boardVersion).toBe('1.0.0');
  });

  test('rejects malformed Protocol V2 build fingerprints', () => {
    expect(parseProtocolV2BuildFingerprint('application__1.2.3')).toBeNull();
    expect(
      getProtocolV2RuntimeMode({
        version: 1,
        build_fingerprint: 'unknown__1.2.3__abcdef0__PROD__RELEASE',
        supported_messages: [],
      })
    ).toBeUndefined();
  });

  test('keeps the Protocol V2 main wallet on the default empty-passphrase context', async () => {
    const features = normalizeProtocolV2Features(descriptor as any);
    features.firmwareVersion = '1.2.3';
    features.passphraseProtection = true;
    const typedCall = createWalletSessionTypedCall(
      jest.fn((request: string) => {
        if (request === 'DeviceSessionAskPin') {
          return { type: 'Success', message: { message: 'PIN verified' } };
        }
        if (request === 'DeviceStatusGet') {
          return { type: 'DeviceStatus', message: { unlocked: true } };
        }
        if (request === 'DeviceSessionGet') {
          return {
            type: 'DeviceSession',
            message: {
              btc_test_address: 'state-1',
              session_id: 'session-1',
            },
          };
        }
        throw new Error(`Unexpected request: ${request}`);
      })
    );
    const commands = { typedCall } as unknown as DeviceCommands;
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = features;
    (device as any).commands = commands;

    await expect(
      getPassphraseState(device, {
        onlyMainPin: true,
      })
    ).resolves.toEqual({
      passphraseState: 'state-1',
      newSession: 'session-1',
      unlockedAttachPin: false,
      resumed: false,
    });
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPin', 'Success', {
      type: DeviceSessionPinType.Main,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
    device.passphraseState = 'state-1';
    expect(device.getInternalState()).toBe('session-1');
  });

  test('reuses the cached Protocol V2 standard wallet instead of asking Main PIN again', async () => {
    const deviceId = 'standard-reuse-device';
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: deviceId,
          unlocked: true,
          passphrase_enabled: true,
        },
      }
    );

    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') return { message: { version: 2 } };
      if (request === 'DeviceSessionAskPin') {
        return { type: 'Success', message: { message: 'PIN verified' } };
      }
      if (request === 'DeviceStatusGet') {
        return {
          message: {
            device_id: deviceId,
            unlocked: true,
            passphrase_enabled: true,
          },
        };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'standard-state',
            session_id: 'standard-session',
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    (device as any).commands = { typedCall };

    await getProtocolV2WalletSession(device, { onlyMainPin: true });
    await getProtocolV2WalletSession(device, { onlyMainPin: true });

    expect(typedCall.mock.calls.filter(call => call[0] === 'DeviceSessionAskPin')).toHaveLength(1);
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
      session_id: 'standard-session',
    });
    expect(deviceWalletSessionStore.getStandard(deviceId)).toEqual({
      passphraseState: 'standard-state',
      sessionId: 'standard-session',
    });
  });

  test('reopens the Protocol V2 standard wallet when the cached session resolves to another wallet', async () => {
    const deviceId = 'standard-invalid-device';
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: deviceId,
          unlocked: true,
          passphrase_enabled: true,
        },
      }
    );
    deviceWalletSessionStore.set(deviceId, 'hidden-state', 'hidden-session');
    deviceWalletSessionStore.setStandard(deviceId, 'old-standard-state', 'old-standard-session');

    const typedCall = jest.fn((request: string, _response: string, params: any) => {
      if (request === 'ProtocolInfoRequest') return { message: { version: 2 } };
      if (request === 'DeviceSessionGet' && params.session_id) {
        return {
          message: {
            btc_test_address: 'hidden-state',
            session_id: 'hidden-session',
          },
        };
      }
      if (request === 'DeviceSessionGet') {
        return {
          message: {
            btc_test_address: 'old-standard-state',
            session_id: 'new-standard-session',
          },
        };
      }
      if (request === 'DeviceSessionAskPin') {
        return { type: 'Success', message: { message: 'PIN verified' } };
      }
      if (request === 'DeviceStatusGet') {
        return { message: { device_id: deviceId, unlocked: true, passphrase_enabled: true } };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    (device as any).commands = { typedCall };

    await expect(getProtocolV2WalletSession(device, { onlyMainPin: true })).resolves.toMatchObject({
      passphraseState: 'old-standard-state',
      newSession: 'new-standard-session',
      resumed: false,
    });
    expect(typedCall.mock.calls.filter(call => call[0] === 'DeviceSessionAskPin')).toHaveLength(1);
    expect(deviceWalletSessionStore.getStandard(deviceId)).toEqual({
      passphraseState: 'old-standard-state',
      sessionId: 'new-standard-session',
    });
    expect(deviceWalletSessionStore.get(deviceId, 'hidden-state')).toBe('hidden-session');
  });

  test('propagates DeviceLocked instead of retrying a cached standard session', async () => {
    const deviceId = 'standard-locked-device';
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: deviceId,
          unlocked: false,
          passphrase_enabled: true,
        },
      }
    );
    deviceWalletSessionStore.setStandard(deviceId, 'standard-state', 'cached-standard-session');

    let sessionGetCalls = 0;
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') return { message: { version: 2 } };
      if (request === 'DeviceSessionAskPin') {
        return { type: 'Success', message: { message: 'PIN verified' } };
      }
      if (request === 'DeviceStatusGet') {
        return { message: { device_id: deviceId, unlocked: true, passphrase_enabled: true } };
      }
      if (request === 'DeviceSessionGet') {
        sessionGetCalls += 1;
        if (sessionGetCalls === 1) {
          throw Object.assign(new Error('Device is locked'), {
            errorCode: HardwareErrorCode.DeviceLocked,
          });
        }
        return {
          message: {
            btc_test_address: 'standard-state',
            session_id: 'cached-standard-session',
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    (device as any).commands = { typedCall };

    await expect(getProtocolV2WalletSession(device, { onlyMainPin: true })).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceLocked,
    });
    expect(typedCall.mock.calls.filter(call => call[0] === 'DeviceSessionGet')).toHaveLength(1);
    expect(deviceWalletSessionStore.getStandard(deviceId)).toBeUndefined();
  });

  test('recovers a mismatched cached standard wallet without deleting hidden sessions', async () => {
    const deviceId = 'standard-mismatch-device';
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: deviceId,
          unlocked: true,
          passphrase_enabled: true,
        },
      }
    );
    deviceWalletSessionStore.set(deviceId, 'hidden-state', 'hidden-session');
    deviceWalletSessionStore.setStandard(deviceId, 'standard-state', 'standard-session');
    let sessionGetCalls = 0;
    const typedCall = jest.fn((request: string) => {
      if (request === 'ProtocolInfoRequest') return { message: { version: 2 } };
      if (request === 'DeviceSessionAskPin') return { message: { message: 'PIN verified' } };
      if (request === 'DeviceStatusGet') {
        return { message: { device_id: deviceId, unlocked: true, passphrase_enabled: true } };
      }
      if (request === 'DeviceSessionGet') {
        sessionGetCalls += 1;
        return {
          message: {
            btc_test_address: sessionGetCalls === 1 ? 'unexpected-wallet-state' : 'standard-state',
            session_id: sessionGetCalls === 1 ? 'unexpected-session' : 'renewed-standard-session',
          },
        };
      }
      throw new Error(`Unexpected request: ${request}`);
    });
    (device as any).commands = { typedCall };

    await expect(getProtocolV2WalletSession(device, { onlyMainPin: true })).resolves.toMatchObject({
      passphraseState: 'standard-state',
      newSession: 'renewed-standard-session',
      resumed: false,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPin', 'Success', {
      type: DeviceSessionPinType.Main,
    });
    expect(deviceWalletSessionStore.getStandard(deviceId)).toEqual({
      passphraseState: 'standard-state',
      sessionId: 'renewed-standard-session',
    });
    expect(deviceWalletSessionStore.get(deviceId, 'hidden-state')).toBe('hidden-session');
  });

  test('selects a Protocol V2 wallet explicitly even when passphrase protection was disabled', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      { status: { passphrase_enabled: false, unlocked: true } }
    );
    const typedCall = createWalletSessionTypedCall(
      jest.fn().mockResolvedValue({
        type: 'DeviceSession',
        message: {
          btc_test_address: 'main-wallet-state',
          session_id: 'main-wallet-session',
        },
      })
    );
    const promptPassphrase = jest
      .fn()
      .mockResolvedValue({ passphrase: 'hidden-wallet-with-disabled-flag' });
    (device as any).commands = { typedCall, promptPassphrase };

    await expect(getProtocolV2WalletSession(device)).resolves.toEqual({
      passphraseState: 'main-wallet-state',
      newSession: 'main-wallet-session',
      unlockedAttachPin: undefined,
      resumed: false,
    });

    expect(promptPassphrase).toHaveBeenCalled();
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
  });

  test('preserves cached settings only while Protocol V2 physical identity stays the same', () => {
    const previous = {
      ...normalizeProtocolV2Features(descriptor as any, {
        hw: { serial_no: 'PR2-SAME' },
      }),
      deviceId: 'wallet-device-id',
      label: 'Renamed Pro 2',
      autoLockDelayMs: 60_000,
      experimentalFeatures: true,
      passphraseProtection: true,
      attachToPinEnabled: true,
    };

    const refreshed = buildProtocolV2FeaturesPayload({
      deviceInfo: { hw: { serial_no: 'PR2-SAME' } },
      previous,
    });
    expect(refreshed).toMatchObject({
      deviceId: 'wallet-device-id',
      label: 'Renamed Pro 2',
      autoLockDelayMs: 60_000,
      experimentalFeatures: true,
      passphraseProtection: true,
      attachToPinEnabled: true,
    });

    const replacedDevice = buildProtocolV2FeaturesPayload({
      deviceInfo: { hw: { serial_no: 'PR2-OTHER' } },
      previous,
    });
    expect(replacedDevice).toMatchObject({
      deviceId: null,
      label: null,
      autoLockDelayMs: null,
      experimentalFeatures: null,
      passphraseProtection: null,
      attachToPinEnabled: null,
    });
  });

  test('does not implicitly unlock inside the Protocol V2 wallet-session coordinator', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          unlocked: false,
          passphrase_enabled: true,
        },
      }
    );
    const typedCall = createWalletSessionTypedCall(
      jest
        .fn()
        .mockResolvedValueOnce({ message: { message: 'Passphrase prepared' } })
        .mockResolvedValueOnce({
          message: {
            btc_test_address: 'hidden-after-unlock-state',
            session_id: 'hidden-after-unlock-session',
          },
        })
    );
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'hidden-after-unlock' });
    const unlockDevice = jest.spyOn(device, 'unlockDevice').mockImplementation(() => {
      (device as any).features = {
        ...(device as any).features,
        unlocked: true,
        passphraseProtection: false,
      };
      return (device as any).features;
    });
    (device as any).commands = { typedCall, promptPassphrase };

    await expect(getProtocolV2WalletSession(device)).resolves.toEqual({
      passphraseState: 'hidden-after-unlock-state',
      newSession: 'hidden-after-unlock-session',
      unlockedAttachPin: undefined,
      resumed: false,
    });

    expect(unlockDevice).not.toHaveBeenCalled();
    expect(promptPassphrase).toHaveBeenCalled();
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
  });

  test('onlyMainPin takes precedence over a cached hidden-wallet state', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      { status: { device_id: 'main-wallet-device', passphrase_enabled: true, unlocked: true } }
    );
    device.passphraseState = 'hidden-state';
    preloadSessionCache('main-wallet-device', 'hidden-state', 'hidden-session');
    const typedCall = createWalletSessionTypedCall(
      jest.fn().mockResolvedValue({
        type: 'DeviceSession',
        message: {
          btc_test_address: 'main-wallet-state',
          session_id: 'main-wallet-session',
        },
      })
    );
    (device as any).commands = { typedCall };

    await expect(
      getPassphraseState(device, {
        onlyMainPin: true,
      })
    ).resolves.toMatchObject({
      passphraseState: 'main-wallet-state',
      newSession: 'main-wallet-session',
    });
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    expect(device.passphraseState).toBeUndefined();
    expect(device.getInternalState()).toBeUndefined();
  });

  test('gets the wallet session selected by the Protocol V2 device', async () => {
    const device = Device.fromDescriptor({
      id: 'select-device',
      path: 'select-path',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: 'select-device-id',
          unlocked: true,
          passphrase_enabled: true,
          attach_to_pin_enabled: true,
        },
      }
    );
    const typedCall = createWalletSessionTypedCall(
      jest.fn((request: string) => {
        if (request === 'DeviceSessionAskPassphrase') {
          return { type: 'Success', message: { message: 'Passphrase prepared' } };
        }
        if (request === 'DeviceSessionGet') {
          return {
            type: 'DeviceSession',
            message: { session_id: 'hidden-session', btc_test_address: 'hidden-state' },
          };
        }
        throw new Error(`Unexpected request: ${request}`);
      })
    );
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    (device as any).commands = { typedCall, promptPassphrase };

    await expect(getProtocolV2WalletSession(device)).resolves.toMatchObject({
      newSession: 'hidden-session',
      passphraseState: 'hidden-state',
    });

    expect(promptPassphrase).toHaveBeenCalled();
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
  });

  test('deviceStatusGet returns raw DeviceStatus and updates dynamic features', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceStatus',
      message: { device_id: 'device-1', unlocked: true },
    });
    const updateProtocolV2Status = jest.fn();
    const method = new DeviceStatusGet({
      payload: { method: 'deviceStatusGet', connectId: 'connect-id' },
    });
    method.init();
    method.device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      commands: { typedCall },
      updateProtocolV2Status,
    }) as any;

    await expect(method.run()).resolves.toEqual({ device_id: 'device-1', unlocked: true });
    expect(typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    expect(updateProtocolV2Status).toHaveBeenCalledWith({
      device_id: 'device-1',
      unlocked: true,
    });
  });

  test('deviceGetOnboardingStatus returns the current Protocol V2 onboarding status', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      type: 'OnboardingStatus',
      message: {
        step: 4,
        phase: 4,
        setup: { kind: 1, method: 0 },
        pin_set: true,
        wallet_initialized: false,
      },
    });
    const method = new DeviceGetOnboardingStatus({
      payload: {
        method: 'deviceGetOnboardingStatus',
        connectId: 'connect-id',
      },
    });
    method.init();
    method.device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      commands: { typedCall },
    }) as any;

    await expect(method.run()).resolves.toEqual({
      step: 4,
      phase: 4,
      setup: { kind: 1, method: 0 },
      pin_set: true,
      wallet_initialized: false,
    });
    expect(typedCall).toHaveBeenCalledWith('OnboardingStatusGet', 'OnboardingStatus', {});
    expect(method.getSupportedProtocols()).toEqual(['V2']);
  });

  test('routes onboarding without exposing the raw session command through CoreApi', async () => {
    const call = jest.fn().mockResolvedValue({ success: true, payload: {} });
    const api = createCoreApi(call as any);

    await api.deviceGetOnboardingStatus('connect-id', { retryCount: 1 });

    expect(call).toHaveBeenCalledWith({
      method: 'deviceGetOnboardingStatus',
      connectId: 'connect-id',
      retryCount: 1,
    });
    expect(api).not.toHaveProperty('deviceSessionOpen');
  });

  test('reuses the cached session id for the selected Pro2 wallet', async () => {
    const device = Device.fromDescriptor({
      id: 'cache-device-1',
      path: 'cache-path-1',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: 'stable-device-1',
          unlocked: true,
          passphrase_enabled: true,
        },
      }
    );
    device.passphraseState = 'state-a';
    preloadSessionCache('stable-device-1', 'state-a', 'session-a');
    const typedCall = createWalletSessionTypedCall(
      jest.fn().mockResolvedValue({
        type: 'DeviceSession',
        message: { session_id: 'session-b', btc_test_address: 'state-a' },
      })
    );
    (device as any).commands = { typedCall };

    await expect(getProtocolV2WalletSession(device)).resolves.toMatchObject({
      passphraseState: 'state-a',
      newSession: 'session-b',
    });

    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
      session_id: 'session-a',
    });
    expect(device.getInternalState()).toBe('session-b');
  });

  test('does not reuse another Pro2 wallet session without passphraseState', async () => {
    const device = Device.fromDescriptor({
      id: 'cache-device-2',
      path: 'cache-path-2',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      { status: { device_id: 'stable-device-2', unlocked: true } }
    );
    preloadSessionCache('stable-device-2', 'state-a', 'session-a');
    const typedCall = createWalletSessionTypedCall(
      jest.fn().mockResolvedValue({
        type: 'DeviceSession',
        message: {
          session_id: 'main-session',
          btc_test_address: 'main-wallet-state',
        },
      })
    );
    (device as any).commands = { typedCall };

    await getProtocolV2WalletSession(device, { onlyMainPin: true });

    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    expect(device.getInternalState()).toBeUndefined();
  });

  test('clears the selected Pro2 cache entry after session rejection', async () => {
    const device = Device.fromDescriptor({
      id: 'cache-device-3',
      path: 'cache-path-3',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: 'stable-device-3',
          unlocked: true,
          passphrase_enabled: true,
        },
      }
    );
    device.passphraseState = 'state-a';
    preloadSessionCache('stable-device-3', 'state-a', 'session-a');
    const typedCall = createWalletSessionTypedCall(
      jest.fn().mockRejectedValue(
        Object.assign(new Error('SE request failed'), {
          errorCode: HardwareErrorCode.RuntimeError,
        })
      )
    );
    const promptPassphrase = jest.fn();
    (device as any).commands = { typedCall, promptPassphrase };

    await expect(getProtocolV2WalletSession(device)).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
    });
    expect(typedCall.mock.calls).toEqual([
      ['ProtocolInfoRequest', 'ProtocolInfo', { eventless_wallet_session: true }],
      ['DeviceSessionGet', 'DeviceSession', { session_id: 'session-a' }],
    ]);
    expect(promptPassphrase).not.toHaveBeenCalled();
    expect(device.getInternalState()).toBeUndefined();
  });

  test('does not retry an invalid Pro2 session when no cached session was sent', async () => {
    const device = Device.fromDescriptor({
      id: 'cache-device-no-session',
      path: 'cache-path-no-session',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: 'stable-device-no-session',
          unlocked: true,
          passphrase_enabled: true,
        },
      }
    );
    const typedCall = createWalletSessionTypedCall(
      jest
        .fn()
        .mockResolvedValueOnce({ message: { message: 'Passphrase prepared' } })
        .mockRejectedValueOnce(
          Object.assign(new Error('Invalid session'), {
            errorCode: HardwareErrorCode.WalletSessionInvalid,
          })
        )
    );
    (device as any).commands = {
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
    };

    await expect(getProtocolV2WalletSession(device)).rejects.toMatchObject({
      errorCode: HardwareErrorCode.WalletSessionInvalid,
    });
    expect(typedCall.mock.calls).toEqual([
      ['ProtocolInfoRequest', 'ProtocolInfo', { eventless_wallet_session: true }],
      [
        'DeviceSessionAskPassphrase',
        'Success',
        { passphrase: 'host hidden wallet', on_device: false },
      ],
      ['DeviceStatusGet', 'DeviceStatus', {}],
      ['DeviceSessionGet', 'DeviceSession', {}],
    ]);
  });

  test('reselects a hidden wallet when the cached Pro2 session resolves to another wallet', async () => {
    const device = Device.fromDescriptor({
      id: 'cache-device-mismatch',
      path: 'cache-path-mismatch',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: 'stable-device-mismatch',
          unlocked: true,
          passphrase_enabled: true,
        },
      }
    );
    device.passphraseState = 'state-a';
    preloadSessionCache('stable-device-mismatch', 'state-a', 'session-a');
    let sessionGetCalls = 0;
    const typedCall = createWalletSessionTypedCall(
      jest.fn((request: string) => {
        if (request === 'DeviceSessionAskPassphrase') return { message: { message: 'prepared' } };
        if (request === 'DeviceSessionGet') {
          sessionGetCalls += 1;
          return {
            type: 'DeviceSession',
            message:
              sessionGetCalls === 1
                ? { session_id: 'session-b', btc_test_address: 'state-b' }
                : { session_id: 'session-a-new', btc_test_address: 'state-a' },
          };
        }
        throw new Error(`Unexpected request: ${request}`);
      })
    );
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    (device as any).commands = { typedCall, promptPassphrase };

    await expect(
      getPassphraseStateWithRefreshDeviceInfo(device, { expectPassphraseState: 'state-a' })
    ).resolves.toMatchObject({
      passphraseState: 'state-a',
      newSession: 'session-a-new',
      resumed: false,
    });
    expect(promptPassphrase).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'wallet-session-coordinator',
        reason: 'session-recovery',
        expectedPassphraseState: 'state-a',
      }),
      { cancelDeviceOnReject: false }
    );
    expect(device.getInternalState()).toBe('session-a-new');
  });

  test('rejects a hidden wallet when one recovery still returns the wrong state', async () => {
    const device = Device.fromDescriptor({
      id: 'cache-device-final-mismatch',
      path: 'cache-path-final-mismatch',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: 'stable-device-final-mismatch',
          unlocked: true,
          passphrase_enabled: true,
        },
      }
    );
    device.passphraseState = 'state-a';
    preloadSessionCache('stable-device-final-mismatch', 'state-a', 'session-a');
    const typedCall = createWalletSessionTypedCall(
      jest.fn((request: string) => {
        if (request === 'DeviceSessionAskPassphrase') return { message: { message: 'prepared' } };
        if (request === 'DeviceSessionGet') {
          return {
            type: 'DeviceSession',
            message: { session_id: 'wrong-session', btc_test_address: 'wrong-state' },
          };
        }
        throw new Error(`Unexpected request: ${request}`);
      })
    );
    (device as any).commands = {
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
    };

    await expect(
      getPassphraseStateWithRefreshDeviceInfo(device, { expectPassphraseState: 'state-a' })
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceCheckPassphraseStateError,
    });
    expect(device.getInternalState()).toBeUndefined();
  });

  test.each([false, true])(
    'rejects a different Attach PIN wallet when Pro2 lock failure is %s',
    async lockFails => {
      const deviceId = 'attach-mismatch-device';
      const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
      (device as any).features = normalizeProtocolV2Features(
        { ...descriptor, protocolType: 'V2' } as any,
        {
          status: {
            device_id: deviceId,
            unlocked: true,
            passphrase_enabled: true,
            attach_to_pin_enabled: true,
            unlocked_by_attach_to_pin: false,
          },
        }
      );
      device.passphraseState = 'expected-state';

      const typedCall = jest.fn((request: string) => {
        if (request === 'ProtocolInfoRequest') return { message: { version: 2 } };
        if (request === 'DeviceSessionAskPin') return { message: { message: 'PIN verified' } };
        if (request === 'DeviceStatusGet') {
          return {
            message: {
              device_id: deviceId,
              unlocked: true,
              passphrase_enabled: true,
              attach_to_pin_enabled: true,
              unlocked_by_attach_to_pin: true,
            },
          };
        }
        if (request === 'DeviceSessionGet') {
          return {
            message: {
              btc_test_address: 'wrong-attach-state',
              session_id: 'wrong-attach-session',
            },
          };
        }
        if (request === 'LockDevice') {
          if (lockFails) throw new Error('Lock unsupported');
          return { message: { message: 'Device locked' } };
        }
        throw new Error(`Unexpected request: ${request}`);
      });
      const promptPassphrase = jest.fn().mockResolvedValue({ attachPinOnDevice: true });
      (device as any).commands = { typedCall, promptPassphrase };

      await expect(
        getProtocolV2WalletSession(device, { expectedPassphraseState: 'expected-state' })
      ).rejects.toMatchObject({
        errorCode: HardwareErrorCode.DeviceCheckUnlockTypeError,
      });

      expect(promptPassphrase).not.toHaveBeenCalled();
      expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
      expect(typedCall).toHaveBeenCalledWith('LockDevice', 'Success', {});
      expect(typedCall.mock.calls.filter(call => call[0] === 'DeviceSessionGet')).toHaveLength(1);
      expect(device.getInternalState()).toBeUndefined();
    }
  );

  test('recovers an expired Attach PIN wallet through the unified wallet selector', async () => {
    const device = Device.fromDescriptor({
      id: 'cache-device-attach-recovery',
      path: 'cache-path-attach-recovery',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: 'stable-device-attach-recovery',
          unlocked: true,
          passphrase_enabled: true,
          attach_to_pin_enabled: true,
        },
      }
    );
    device.passphraseState = 'attach-state';
    preloadSessionCache('stable-device-attach-recovery', 'attach-state', 'expired-attach-session');
    let sessionGetCalls = 0;
    const typedCall = createWalletSessionTypedCall(
      jest.fn((request: string) => {
        if (request === 'DeviceSessionGet') {
          sessionGetCalls += 1;
          return {
            type: 'DeviceSession',
            message:
              sessionGetCalls === 1
                ? { session_id: 'current-standard-session', btc_test_address: 'standard-state' }
                : { session_id: 'new-attach-session', btc_test_address: 'attach-state' },
          };
        }
        throw new Error(`Unexpected request: ${request}`);
      })
    );
    const promptPassphrase = jest.fn().mockResolvedValue({ attachPinOnDevice: true });
    (device as any).commands = { typedCall, promptPassphrase };
    const unlockDevice = jest
      .spyOn(device, 'unlockDevice')
      .mockResolvedValue(device.features as any);

    await expect(
      getProtocolV2WalletSession(device, { expectedPassphraseState: 'attach-state' })
    ).resolves.toMatchObject({
      passphraseState: 'attach-state',
      newSession: 'new-attach-session',
      resumed: false,
    });
    expect(promptPassphrase).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'session-recovery',
        expectedPassphraseState: 'attach-state',
        existsAttachPinUser: true,
      }),
      { cancelDeviceOnReject: false }
    );
    expect(unlockDevice).toHaveBeenCalledWith(
      DeviceSessionPinType.AttachToPin,
      expect.objectContaining({
        emitUiEvent: false,
        interaction: expect.objectContaining({
          phase: 'pin',
          transition: 'start',
          protocol: 'V2',
        }),
      })
    );
    expect(device.getInternalState()).toBe('new-attach-session');
  });

  test('propagates DeviceLocked without retrying DeviceSessionAskPassphrase', async () => {
    const device = Device.fromDescriptor({
      id: 'cache-device-4',
      path: 'cache-path-4',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      { status: { device_id: 'stable-device-4', unlocked: true, passphrase_enabled: true } }
    );
    const lockedError = Object.assign(new Error('Device is locked'), {
      errorCode: HardwareErrorCode.DeviceLocked,
    });
    const typedCall = createWalletSessionTypedCall(
      jest
        .fn()
        .mockRejectedValueOnce(lockedError)
        .mockResolvedValueOnce({ message: { message: 'Passphrase prepared' } })
        .mockResolvedValueOnce({
          message: {
            session_id: 'session-after-unlock',
            btc_test_address: 'state-after-unlock',
          },
        })
    );
    (device as any).commands = {
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
    };
    const unlockDevice = jest.spyOn(device, 'unlockDevice').mockResolvedValue(undefined as any);

    await expect(getProtocolV2WalletSession(device)).rejects.toBe(lockedError);
    expect(unlockDevice).not.toHaveBeenCalled();
    expect(
      typedCall.mock.calls.filter(call => call[0] === 'DeviceSessionAskPassphrase')
    ).toHaveLength(1);
  });

  test('does not act on cached lock state inside the wallet-session coordinator', async () => {
    const calls: string[] = [];
    const device = Device.fromDescriptor({
      id: 'cache-device-pre-unlock',
      path: 'cache-path-pre-unlock',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      { status: { device_id: 'stable-device-pre-unlock', unlocked: false } }
    );
    const typedCall = createWalletSessionTypedCall(
      jest.fn((request: string) => {
        if (request === 'DeviceSessionAskPassphrase') {
          calls.push('ask-passphrase');
          return Promise.resolve({ message: { message: 'Passphrase prepared' } });
        }
        if (request === 'DeviceSessionGet') {
          calls.push('get-session');
          return Promise.resolve({
            message: {
              session_id: 'session-after-pre-unlock',
              btc_test_address: 'state-after-pre-unlock',
            },
          });
        }
        throw new Error(`Unexpected request: ${request}`);
      })
    );
    (device as any).commands = {
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphraseOnDevice: true }),
    };
    const unlockDevice = jest.spyOn(device, 'unlockDevice');

    await expect(getProtocolV2WalletSession(device)).resolves.toMatchObject({
      newSession: 'session-after-pre-unlock',
      passphraseState: 'state-after-pre-unlock',
    });
    expect(unlockDevice).not.toHaveBeenCalled();
    expect(
      typedCall.mock.calls.filter(call => call[0] === 'DeviceSessionAskPassphrase')
    ).toHaveLength(1);
    expect(calls).toEqual(['ask-passphrase', 'get-session']);
  });

  test('does not request a Pro2 wallet session before features are initialized', async () => {
    const device = Device.fromDescriptor({
      id: 'cache-device-5',
      path: 'cache-path-5',
      protocolType: 'V2',
    } as any);
    const typedCall = jest.fn();
    (device as any).commands = { typedCall };

    await expect(getPassphraseStateWithRefreshDeviceInfo(device)).resolves.toEqual({
      passphraseState: undefined,
      newSession: undefined,
      unlockedAttachPin: undefined,
    });
    expect(typedCall).not.toHaveBeenCalled();
  });

  test('merges DeviceStatus into existing Protocol V2 features', async () => {
    const device = Device.fromDescriptor({
      id: 'status-device',
      path: 'status-path',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        protocol_version: 2,
        fw: { application: { version: '1.2.3' } },
        se1: { application: { version: '4.5.6' } },
        status: { unlocked: false, passphrase_enabled: false },
      }
    );
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceStatus',
      message: {
        device_id: 'stable-status-device',
        unlocked: true,
        passphrase_enabled: true,
      },
    });
    (device as any).commands = { typedCall };

    const features = await refreshProtocolV2DeviceStatus(device);

    expect(features).toMatchObject({
      deviceId: 'stable-status-device',
      unlocked: true,
      passphraseProtection: true,
      firmwareVersion: '1.2.3',
      se01Version: '4.5.6',
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
  });

  test('drops stale normal status when firmware reconnect supplies bootloader DeviceInfo', () => {
    const device = Device.fromDescriptor({
      id: 'firmware-reconnect-device',
      path: 'firmware-reconnect-path',
      protocolType: 'V2',
    } as any);
    (device as any).features = buildProtocolV2FeaturesPayload({
      deviceInfo: {
        protocol_version: 1,
        hw: { serial_no: 'PR9999999999' },
        fw: { application: { version: '1.0.0' } },
      },
      deviceStatus: {
        device_id: 'firmware-reconnect-id',
        init_states: true,
        unlocked: false,
      } as any,
    });

    (device as any).updateProtocolV2Features(protocolV2BootloaderDeviceInfo, null, 'bootloader');

    expect(device.features?.mode).toBe('bootloader');
    expect(device.features?.bootloaderMode).toBe(true);
    expect(device.features?.initialized).toBeNull();
    expect(device.features?.unlocked).toBeNull();
    expect(device.features?.raw?.protocolV2DeviceStatus).toBeUndefined();
  });

  test('returns passphrase state string for existing Pro devices', async () => {
    const features = {
      deviceId: 'pro-device-id',
      deviceType: 'pro',
      firmwareVersion: '4.15.0',
      passphraseProtection: true,
      sessionId: 'feature-session',
      unlockedAttachPin: true,
    };
    const typedCall = jest.fn().mockResolvedValue({
      type: 'PassphraseState',
      message: {
        passphrase_state: 'state-pro',
        session_id: 'session-pro',
        unlocked_attach_pin: false,
      },
    });
    const updateInternalState = jest.fn();
    const method = new GetPassphraseState({
      payload: {
        method: 'getPassphraseState',
        connectId: 'connect-id',
      },
    });
    method.device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V1' },
      features,
      commands: {
        typedCall,
        promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'state-pro2-secret' }),
      },
      updateInternalState,
      getInternalState: () => 'feature-session',
      getCurrentDeviceId: () => 'pro-device-id',
      getCurrentPassphraseProtection: () => true,
    }) as any;

    await expect(method.run()).resolves.toBe('state-pro');
    expect(updateInternalState).toHaveBeenCalledWith(
      true,
      'state-pro',
      'pro-device-id',
      'session-pro',
      'feature-session'
    );
  });

  test('maps the legacy getPassphraseState App flow to the Pro2 wallet session protocol', async () => {
    const features = {
      deviceId: 'pro2-device-id',
      deviceType: 'pro2',
      firmwareVersion: '4.15.0',
      passphraseProtection: true,
      sessionId: 'feature-session',
      unlockedAttachPin: true,
    };
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { unlocked: true, unlocked_attach_pin: false } })
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: { message: 'Passphrase prepared' } })
      .mockResolvedValueOnce({ message: { unlocked: true, unlocked_attach_pin: false } })
      .mockResolvedValueOnce({
        type: 'DeviceSession',
        message: {
          btc_test_address: 'state-pro2',
          session_id: 'session-pro2',
        },
      });
    const updateInternalState = jest.fn();
    const getFeatures = jest.fn().mockResolvedValue(features);
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const method = new GetPassphraseState({
      payload: {
        method: 'getPassphraseState',
        connectId: 'connect-id',
      },
    });
    method.device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features,
      commands: {
        typedCall,
        promptPassphrase,
      },
      emit: jest.fn(),
      updateInternalState,
      getFeatures,
      getCurrentDeviceType: () => 'pro2',
      getCurrentDeviceId: () => 'pro2-device-id',
      getCurrentPassphraseProtection: () => true,
    }) as any;

    await expect(method.run()).resolves.toBe('state-pro2');
    expect(promptPassphrase).toHaveBeenCalledWith(
      {
        existsAttachPinUser: false,
        deviceOnly: false,
        source: 'wallet-session-coordinator',
        reason: 'open-wallet',
      },
      { cancelDeviceOnReject: false }
    );
    expect(updateInternalState).toHaveBeenCalledWith(
      true,
      'state-pro2',
      'pro2-device-id',
      'session-pro2',
      null
    );
    expect(JSON.stringify(typedCall.mock.calls)).not.toContain('legacy app secret');
    expect(getFeatures).not.toHaveBeenCalled();
  });

  test('uses the cached wallet address when the local session is missing', async () => {
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({
        message: {
          btc_test_address: 'expected-state',
          session_id: 'recovered-session',
        },
      });
    const promptPassphrase = jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' });
    const device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      passphraseState: 'expected-state',
      features: {
        unlocked: true,
        passphraseProtection: true,
        attachToPinEnabled: false,
      },
      commands: { typedCall, promptPassphrase },
      getInternalState: jest.fn().mockReturnValue(undefined),
      getCurrentDeviceId: () => 'pro2-device-id',
      getCurrentPassphraseProtection: () => true,
      updateInternalState: jest.fn(),
      clearInternalState: jest.fn(),
      emit: jest.fn(),
    }) as any;

    await expect(
      getProtocolV2WalletSession(device, { expectedPassphraseState: 'expected-state' })
    ).resolves.toMatchObject({ passphraseState: 'expected-state' });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
    expect(promptPassphrase).not.toHaveBeenCalled();
  });

  test('reuses the Pro2 session opened by legacy getPassphraseState on the next App call', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = jest.fn().mockImplementation((request: string) => {
      if (request === 'ProtocolInfoRequest') {
        return Promise.resolve({ message: { version: 2 } });
      }
      if (request === 'DeviceSessionAskPassphrase') {
        return Promise.resolve({
          type: 'Success',
          message: { message: 'Passphrase prepared' },
        });
      }
      if (request === 'DeviceStatusGet') {
        return Promise.resolve({
          type: 'DeviceStatus',
          message: { unlocked: true, unlocked_attach_pin: false, passphrase_enabled: true },
        });
      }
      if (request === 'DeviceSessionGet') {
        return Promise.resolve({
          type: 'DeviceSession',
          message: {
            btc_test_address: 'state-pro2-app',
            session_id: 'session-pro2-app',
          },
        });
      }
      throw new Error(`Unexpected request: ${request}`);
    });

    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: 'pro2-app-device-id',
          unlocked: true,
          passphrase_enabled: true,
        },
      }
    );
    (device as any).commands = {
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
    };

    const method = new GetPassphraseState({
      payload: {
        method: 'getPassphraseState',
        connectId: 'connect-id',
        initSession: true,
      },
    });
    method.device = device;

    await expect(method.run()).resolves.toBe('state-pro2-app');

    await device.initialize({ passphraseState: 'state-pro2-app' });
    typedCall.mockClear();

    await expect(device.checkPassphraseStateSafety('state-pro2-app', false, false)).resolves.toBe(
      true
    );
    expect(typedCall.mock.calls).toEqual([
      ['DeviceSessionGet', 'DeviceSession', { session_id: 'session-pro2-app' }],
    ]);
  });

  test('returns the Pro2 standard-wallet passphraseState when passphrase is disabled', async () => {
    const features = {
      deviceId: 'pro2-device-id',
      deviceType: 'pro2',
      firmwareVersion: '9.9.9',
      passphraseProtection: false,
      unlocked: true,
    };
    const typedCall = createWalletSessionTypedCall(
      jest.fn().mockResolvedValue({
        type: 'DeviceSession',
        message: {
          btc_test_address: 'main-wallet-state',
          session_id: 'main-wallet-session',
        },
      })
    );
    const updateInternalState = jest.fn();
    const method = new GetPassphraseState({
      payload: {
        method: 'getPassphraseState',
        connectId: 'connect-id',
        useEmptyPassphrase: true,
      },
    });
    const device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features,
      commands: {
        typedCall,
        promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
      },
      updateInternalState,
      getCurrentDeviceType: () => 'pro2',
      getCurrentDeviceId: () => 'pro2-device-id',
      getCurrentPassphraseProtection: () => false,
    }) as any;
    device.unlockDevice = jest.fn().mockResolvedValue(features);
    method.device = device;

    await expect(method.run()).resolves.toBe('main-wallet-state');
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    expect(updateInternalState).toHaveBeenCalled();
  });

  test('honors initSession when getting Pro2 passphrase state', async () => {
    const features = {
      deviceId: 'pro2-device-id',
      deviceType: 'pro2',
      firmwareVersion: '9.9.9',
      passphraseProtection: true,
      sessionId: 'old-feature-session',
      unlockedAttachPin: false,
    };
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { unlocked: true, unlocked_attach_pin: false } })
      .mockResolvedValueOnce({ message: { version: 2 } })
      .mockResolvedValueOnce({ message: { message: 'Passphrase prepared' } })
      .mockResolvedValueOnce({ message: { unlocked: true, unlocked_attach_pin: false } })
      .mockResolvedValueOnce({
        type: 'DeviceSession',
        message: {
          btc_test_address: 'state-pro2-new',
          session_id: 'session-pro2-new',
        },
      });
    const clearInternalState = jest.fn();
    const updateInternalState = jest.fn();
    const method = new GetPassphraseState({
      payload: {
        method: 'getPassphraseState',
        connectId: 'connect-id',
        initSession: true,
      },
    });
    method.device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features,
      passphraseState: 'state-pro2-old',
      commands: {
        typedCall,
        promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
      },
      emit: jest.fn(),
      clearInternalState,
      updateInternalState,
      getCurrentDeviceId: () => 'pro2-device-id',
      getCurrentPassphraseProtection: () => true,
    }) as any;

    await expect(method.run()).resolves.toBe('state-pro2-new');
    expect(clearInternalState).toHaveBeenCalledTimes(1);
    expect((method.device as any).passphraseState).toBeUndefined();
    expect(updateInternalState).toHaveBeenCalledWith(
      true,
      'state-pro2-new',
      'pro2-device-id',
      'session-pro2-new',
      null
    );
  });

  test('stores Pro2 passphrase session cache without synthetic device id', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = createWalletSessionTypedCall(
      jest.fn().mockResolvedValue({
        type: 'DeviceSession',
        message: {
          btc_test_address: 'state-profile',
          session_id: 'session-profile',
        },
      })
    );

    (device as any).features = {
      ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any, {
        hw: { serial_no: 'PR2SERIAL' },
        fw: { application: { version: '4.15.0' } },
        status: { passphrase_enabled: true },
      }),
      unlocked: true,
    };
    (device as any).commands = {
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
    };

    await getPassphraseStateWithRefreshDeviceInfo(device);

    device.passphraseState = 'state-profile';
    expect(device.getInternalState()).toBe('session-profile');
    expect(device.getInternalState('CACHED-ID')).toBeUndefined();
  });

  test('stores Pro2 passphrase sessions without selecting them implicitly', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = createWalletSessionTypedCall(
      jest.fn().mockResolvedValue({
        type: 'DeviceSession',
        message: {
          btc_test_address: 'state-auto',
          session_id: 'session-auto',
        },
      })
    );

    (device as any).features = normalizeProtocolV2Features(
      {
        ...descriptor,
        protocolType: 'V2',
      } as any,
      {
        hw: { serial_no: 'PR2SERIAL' },
      }
    );
    device.updateState(
      {
        versions: { firmware: '4.15.0' },
        status: { passphraseProtection: true, unlocked: true },
      },
      'compatibility'
    );
    (device as any).commands = {
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
    };

    await expect(getPassphraseStateWithRefreshDeviceInfo(device)).resolves.toMatchObject({
      passphraseState: 'state-auto',
      newSession: 'session-auto',
    });

    expect(device.passphraseState).toBeUndefined();
    expect(device.features?.passphraseProtection).toBe(true);
    expect(device.features?.sessionId).toBeNull();
    expect(device.getInternalState()).toBeUndefined();
    device.passphraseState = 'state-auto';
    expect(device.getInternalState()).toBe('session-auto');
    expect(typedCall).toHaveBeenNthCalledWith(2, 'DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
    });
    expect(typedCall).toHaveBeenLastCalledWith('DeviceSessionGet', 'DeviceSession', {});
  });

  test('does not mark Pro2 passphrase enabled from a main PIN session alone', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = createWalletSessionTypedCall(
      jest.fn().mockResolvedValue({
        type: 'DeviceSession',
        message: {
          session_id: 'main-pin-session',
          btc_test_address: 'main-wallet-state',
        },
      }),
      { passphrase_enabled: false }
    );

    (device as any).features = normalizeProtocolV2Features(
      {
        ...descriptor,
        protocolType: 'V2',
      } as any,
      {
        status: {
          unlocked: true,
          passphrase_enabled: false,
        },
      }
    );
    (device as any).features.firmwareVersion = '4.15.0';
    (device as any).features.unlocked = true;
    (device as any).commands = { typedCall };

    await expect(
      getPassphraseStateWithRefreshDeviceInfo(device, { onlyMainPin: true })
    ).resolves.toMatchObject({
      passphraseState: 'main-wallet-state',
      newSession: 'main-pin-session',
    });

    expect(device.features?.passphraseProtection).toBe(false);
    expect(device.features?.sessionId).toBeNull();
    expect(device.getInternalState()).toBeUndefined();
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
  });

  test('does not let skipPassphraseCheck hide Pro2 passphrase state mismatch', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = createWalletSessionTypedCall(
      jest.fn().mockResolvedValue({
        type: 'DeviceSession',
        message: {
          btc_test_address: 'wrong-state',
          session_id: 'wrong-session',
        },
      })
    );

    (device as any).features = normalizeProtocolV2Features({
      ...descriptor,
      protocolType: 'V2',
    } as any);
    (device as any).features.firmwareVersion = '4.15.0';
    (device as any).features.passphraseProtection = true;
    (device as any).features.unlocked = true;
    (device as any).commands = {
      typedCall,
      promptPassphrase: jest.fn().mockResolvedValue({ passphrase: 'host hidden wallet' }),
    };

    await expect(device.checkPassphraseStateSafety('expected-state', false, true)).rejects.toEqual(
      expect.objectContaining({
        errorCode: HardwareErrorCode.DeviceCheckPassphraseStateError,
      })
    );

    expect(device.getInternalState()).toBeUndefined();
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPassphrase', 'Success', {
      passphrase: 'host hidden wallet',
      on_device: false,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
  });

  test('useEmptyPassphrase ignores a stale hidden-wallet state during Protocol V2 safety check', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = createWalletSessionTypedCall(
      jest.fn().mockResolvedValue({
        type: 'DeviceSession',
        message: {
          session_id: 'main-wallet-session',
          btc_test_address: 'main-wallet-state',
        },
      })
    );

    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        status: {
          device_id: 'main-wallet-device',
          unlocked: true,
          passphrase_enabled: true,
          unlocked_by_attach_to_pin: false,
        },
      }
    );
    (device as any).features.firmwareVersion = '4.15.0';
    (device as any).commands = { typedCall };
    device.passphraseState = 'stale-hidden-state';

    await expect(
      device.checkPassphraseStateSafety('stale-hidden-state', true, false)
    ).resolves.toBe(true);
    expect(typedCall).toHaveBeenCalledTimes(4);
    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionAskPin', 'Success', {
      type: DeviceSessionPinType.Main,
    });
  });

  test('marks fallback features as unavailable when DeviceInfo is missing', () => {
    const features = normalizeProtocolV2Features(descriptor as any);

    expect(features.deviceId).toBeNull();
    expect(features.serialNo).toBe('');
    expect(features.initialized).toBeNull();
    expect(features.unlocked).toBeNull();
    expect(features.firmwarePresent).toBeNull();
  });

  test('uses Protocol V2 status.device_id and does not fall back to serial_no', () => {
    const features = normalizeProtocolV2Features(
      {
        id: 'PR2000000000',
        path: 'PR2000000000',
        protocolType: 'V2',
      } as any,
      {
        hw: {
          serial_no: 'PR9999999999',
        },
        status: {
          device_id: 'DEVICE-ID-9999',
        },
      }
    );

    expect(features.deviceId).toBe('DEVICE-ID-9999');
    expect(features.serialNo).toBe('PR9999999999');
  });

  test('does not use Protocol V2 serial_no as deviceId when hw.device_id is absent', () => {
    const features = normalizeProtocolV2Features(
      {
        id: 'PR2000000000',
        path: 'PR2000000000',
        protocolType: 'V2',
      } as any,
      {
        hw: {
          serial_no: 'PR9999999999',
        },
      }
    );

    expect(features.deviceId).toBeNull();
    expect(features.serialNo).toBe('PR9999999999');
  });

  test('uses Protocol V2 features directly when profile is absent', () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = {
      ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any, {
        hw: { Device_type: DeviceType.PRO2 },
      }),
      serialNo: 'CACHED-SERIAL',
      label: 'Cached Label',
      bleName: 'Cached BLE',
      passphraseProtection: true,
    };

    const message = device.toMessageObject();
    expect(message).toMatchObject({
      connectProtocol: 'V2',
      serialNo: 'CACHED-SERIAL',
      uuid: 'CACHED-SERIAL',
      deviceId: null,
      bleName: 'Cached BLE',
      name: 'Cached Label',
      label: 'Cached Label',
      deviceType: 'pro2',
    });
    expect(message).not.toHaveProperty('sessionId');
    expect(device.getCurrentPassphraseProtection()).toBe(true);
    expect(device.hasUsePassphrase()).toBe(true);
  });

  test('uses the BLE name as the Protocol V2 display label while preserving the raw label', () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = {
      ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
      serialNo: 'PR9999999999',
      label: null,
      bleName: 'Pro2 6136',
    };

    expect(device.toMessageObject()).toMatchObject({
      serialNo: 'PR9999999999',
      bleName: 'Pro2 6136',
      name: 'Pro2 6136',
      label: 'Pro2 6136',
    });
    expect(device.features?.label).toBeNull();
  });

  test('prefers the real Protocol V2 label over the BLE name for display', () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = {
      ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
      label: 'My Pro 2',
      bleName: 'Pro2 6136',
    };

    expect(device.toMessageObject()).toMatchObject({
      bleName: 'Pro2 6136',
      name: 'My Pro 2',
      label: 'My Pro 2',
    });
  });

  test('syncs Protocol V2 cached features without cached profile', () => {
    const cached = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (cached as any).features = {
      ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
      deviceId: null,
      serialNo: 'CACHED-SERIAL',
    };

    const current = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    current.updateFromCache(cached);

    expect(current.getCurrentDeviceId()).toBeUndefined();
    expect(current.getCurrentSerialNo()).toBe('CACHED-SERIAL');
    expect(current.toMessageObject()).toMatchObject({
      serialNo: 'CACHED-SERIAL',
      uuid: 'CACHED-SERIAL',
      deviceId: null,
    });
  });

  test('initializes Protocol V2 features from lightweight DeviceInfoGet', async () => {
    const commands = {
      typedCall: jest.fn().mockResolvedValueOnce({
        type: 'DeviceInfo',
        message: {
          hw: { Device_type: DeviceType.PRO2, serial_no: 'PR2SERIAL' },
          fw: { application: { version: '1.2.3' } },
        },
      }),
    };

    const features = await requestProtocolV2Features({
      commands: commands as unknown as DeviceCommands,
      descriptor: descriptor as any,
    });

    expect(features.deviceId).toBeNull();
    expect(features.initialized).toBeNull();
    expect(features.passphraseProtection).toBeNull();
    expect(features.bootloaderMode).toBe(false);
    expect(commands.typedCall).toHaveBeenCalledTimes(1);
    expect(commands.typedCall).toHaveBeenCalledWith(
      'DeviceInfoGet',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          coprocessor: true,
          se1: true,
          se2: true,
          se3: true,
          se4: true,
        },
        types: {
          version: true,
          specific: true,
        },
      },
      { timeoutMs: PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS }
    );
  });

  test('fails initialization when Protocol V2 DeviceInfoGet fails', async () => {
    const commands = {
      typedCall: jest.fn().mockRejectedValueOnce(new Error('DeviceInfo not supported')),
    };

    await expect(
      requestProtocolV2Features({
        commands: commands as unknown as DeviceCommands,
        descriptor: descriptor as any,
      })
    ).rejects.toThrow('DeviceInfo not supported');
  });

  test('does not inherit Pro or Pro model fallback ranges for Protocol V2 devices', () => {
    const features = normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any);
    const checkedTypes: string[] = [];

    const versionRange = getMethodVersionRange(features, type => {
      checkedTypes.push(type);
      if (type === 'pro' || type === 'model_touch') {
        return { min: '4.10.0' };
      }
      return undefined;
    });

    expect(versionRange).toBeUndefined();
    expect(checkedTypes).toEqual(['pro2']);
  });

  test('uses firmware-v1 as the Pro2 remote firmware config field', () => {
    const features = normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any);

    expect(
      getFirmwareUpdateField({
        features,
        updateType: 'firmware',
        firmwareType: 'universal',
      })
    ).toBe('firmware-v1');
    expect(getFirmwareUpdateFieldArray(features, 'firmware')).toEqual(['firmware-v1']);
  });

  test('marks known unsupported public-chain methods as unsupported on Protocol V2', () => {
    const stellar = new StellarGetAddress({
      id: 1,
      payload: {
        method: 'stellarGetAddress',
        path: "m/44'/148'/0'",
      },
    });
    const benfen = new BenfenSignMessage({
      id: 1,
      payload: {
        method: 'benfenSignMessage',
        path: "m/44'/728'/0'/0'/0'",
        messageHex: '0x1234',
      },
    });
    const lnurlAuth = new LnurlAuth({
      id: 1,
      payload: {
        method: 'lnurlAuth',
        domain: 'example.com',
        k1: '1234',
      },
    });

    stellar.init();
    benfen.init();
    lnurlAuth.init();

    expect(stellar.supportsProtocol('V2')).toBe(false);
    expect(benfen.supportsProtocol('V2')).toBe(false);
    expect(lnurlAuth.supportsProtocol('V2')).toBe(false);
    expect(getBitcoinForkSupportedProtocols(['Neurai'])).toEqual(['V1']);
  });

  test('does not block batch public key support checks on Protocol V2', async () => {
    const paths = [{ address_n: [0x8000002c, 0x80000000, 0x80000000] }] as any;
    const typedCall = jest.fn().mockResolvedValue({
      type: 'EcdsaPublicKeys',
      message: {
        root_fingerprint: 123,
        public_keys: [],
        hd_nodes: [{}],
      },
    });
    const device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      features: normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any, {
        fw: {
          application: {
            version: '4.14.0',
          },
        },
      }),
      commands: { typedCall },
      getCurrentDeviceType: () => 'pro2',
    });

    await expect(
      batchGetPublickeys(device as any, paths, 'secp256k1', 0, { includeNode: true })
    ).resolves.toMatchObject({
      root_fingerprint: 123,
      hd_nodes: [{}],
    });
    expect(typedCall).toHaveBeenCalledWith('BatchGetPublickeys', 'EcdsaPublicKeys', {
      paths,
      ecdsa_curve_name: 'secp256k1',
      include_node: true,
    });
  });

  test('declares legacy getOnekeyFeatures unsupported on Protocol V2', () => {
    const method = new GetOnekeyFeatures({
      id: 1,
      payload: {
        method: 'getOnekeyFeatures',
      },
    });
    const typedCall = jest.fn();

    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      commands: { typedCall },
    });

    expect(() => method.assertProtocolSupported('V2', EFirmwareType.Universal)).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.DeviceNotSupportMethod })
    );
    expect(typedCall).not.toHaveBeenCalled();
  });

  test('initializes and reuses Protocol V2 features after DeviceStatusGet succeeds', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({
        type: 'DeviceInfo',
        message: {
          hw: { Device_type: DeviceType.PRO2, serial_no: 'PR2SERIAL' },
          fw: { application: { version: '1.2.3' } },
        },
      })
      .mockResolvedValueOnce({
        type: 'ProtocolInfo',
        message: protocolV2ApplicationInfo,
      })
      .mockResolvedValueOnce({
        type: 'DeviceStatus',
        message: { init_states: true, unlocked: true },
      });

    (device as any).commands = { typedCall };

    await device.initialize();
    await device.initialize();

    expect(device.features).toMatchObject({
      deviceId: null,
      firmwareVersion: '1.2.3',
      passphraseProtection: null,
      label: null,
    });
    expect((device as any).profile).toBeUndefined();
    expect(device.features?.passphraseProtection).toBeNull();
    expect(device.features?.label).toBeNull();
    expect(device.features?.firmwareVersion).toBe('1.2.3');
    expect(typedCall).toHaveBeenCalledTimes(3);
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'DeviceInfoGet',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          coprocessor: true,
          se1: true,
          se2: true,
          se3: true,
          se4: true,
        },
        types: {
          version: true,
          specific: true,
        },
      },
      {
        timeoutMs: PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS,
      }
    );
    expect(typedCall).toHaveBeenNthCalledWith(2, 'ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    expect(typedCall).toHaveBeenNthCalledWith(3, 'DeviceStatusGet', 'DeviceStatus', {});
  });

  test('recognizes bootloader from ProtocolInfo without calling DeviceStatusGet', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({
        type: 'DeviceInfo',
        message: {
          hw: { serial_no: 'PR2SERIAL' },
          fw: { bootloader: { version: '0.2.0' } },
          se1: {},
        },
      })
      .mockResolvedValueOnce({
        type: 'ProtocolInfo',
        message: protocolV2BootloaderInfo,
      });

    (device as any).commands = { typedCall };

    await device.initialize();

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'DeviceInfoGet',
      'DeviceInfo',
      expect.not.objectContaining({
        targets: expect.objectContaining({ status: true }),
      }),
      expect.anything()
    );
    expect(typedCall).toHaveBeenNthCalledWith(2, 'ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    expect(typedCall).not.toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    expect(device.features).toMatchObject({
      deviceId: null,
      bootloaderMode: true,
      mode: 'bootloader',
      initialized: null,
    });
    expect(device.isBootloader()).toBe(true);
    expect(device.isRomloader()).toBe(false);
  });

  test('recognizes romloader from ProtocolInfo without calling DeviceStatusGet', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'ProtocolInfo',
      message: protocolV2RomloaderInfo,
    });
    (device as any).commands = { typedCall };

    await device.probeProtocolV2RuntimeState({
      hw: { Device_type: DeviceType.PRO2, serial_no: 'PR2SERIAL' },
      fw: { romloader: { version: '1.0.0' } },
    });

    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall).not.toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    expect(device.features).toMatchObject({
      mode: 'romloader',
      bootloaderMode: true,
      initialized: null,
    });
    expect(device.isBootloader()).toBe(false);
    expect(device.isRomloader()).toBe(true);
  });

  test('rejects Protocol V2 romloader mode for non-Pro2 devices', async () => {
    const device = Device.fromDescriptor({
      path: 'pro-v2-path',
      protocolType: 'V2',
    } as any);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'ProtocolInfo',
      message: protocolV2RomloaderInfo,
    });
    (device as any).commands = { typedCall };

    await expect(
      device.probeProtocolV2RuntimeState({
        hw: { Device_type: DeviceType.PRO, serial_no: 'PRO-SERIAL' },
        fw: { romloader: { version: '1.0.0' } },
      })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.DeviceInitializeFailed });

    expect(device.isRomloader()).not.toBe(true);
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('keeps application mode without calling an unadvertised DeviceStatusGet', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const protocolInfo = {
      ...protocolV2ApplicationInfo,
      supported_messages: [],
    };
    const typedCall = jest.fn().mockResolvedValue({
      type: 'ProtocolInfo',
      message: protocolInfo,
    });
    (device as any).commands = { typedCall };

    await device.probeProtocolV2RuntimeState({
      hw: { serial_no: 'PR2SERIAL' },
      fw: { application: { version: '1.2.3' } },
    });

    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall).not.toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    expect(device.features).toMatchObject({
      mode: 'normal',
      bootloaderMode: false,
      initialized: null,
    });
  });

  test('uses advertised DeviceStatusGet as compatibility fallback for an unknown fingerprint', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const protocolInfo = {
      ...protocolV2ApplicationInfo,
      build_fingerprint: 'legacy-fingerprint',
    };
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'ProtocolInfo', message: protocolInfo })
      .mockResolvedValueOnce({
        type: 'DeviceStatus',
        message: { init_states: true, unlocked: true },
      });
    (device as any).commands = { typedCall };

    await device.probeProtocolV2RuntimeState({
      hw: { serial_no: 'PR2SERIAL' },
      fw: { application: { version: '1.2.3' } },
    });

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(device.features).toMatchObject({
      mode: 'normal',
      initialized: true,
      unlocked: true,
    });
  });

  test('maps an explicit unsupported DeviceStatusGet response to bootloader for an unknown fingerprint', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const protocolInfo = {
      ...protocolV2ApplicationInfo,
      build_fingerprint: 'legacy-fingerprint',
    };
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'ProtocolInfo', message: protocolInfo })
      .mockRejectedValueOnce(new Error('Failure_UnexpectedMessage,Unknown message'));
    (device as any).commands = { typedCall };

    await device.probeProtocolV2RuntimeState({
      hw: { Device_type: DeviceType.PRO2, serial_no: 'PR2SERIAL' },
      fw: { bootloader: { version: '0.2.0' } },
    });

    expect(device.features).toMatchObject({
      mode: 'bootloader',
      bootloaderMode: true,
      initialized: null,
    });
  });

  test('propagates DeviceStatusGet link failures instead of mapping them to bootloader', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const protocolInfo = {
      ...protocolV2ApplicationInfo,
      build_fingerprint: 'legacy-fingerprint',
    };
    const linkError = new Error('Protocol V2 CRC mismatch');
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ type: 'ProtocolInfo', message: protocolInfo })
      .mockRejectedValueOnce(linkError);
    (device as any).commands = { typedCall };

    await expect(
      device.probeProtocolV2RuntimeState({
        hw: { Device_type: DeviceType.PRO2, serial_no: 'PR2SERIAL' },
        fw: { application: { version: '1.2.3' } },
      })
    ).rejects.toBe(linkError);

    expect(device.features).toBeUndefined();
  });

  test('fails safely when runtime fingerprint and capabilities are both unknown', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'ProtocolInfo',
      message: {
        version: 1,
        build_fingerprint: 'legacy-fingerprint',
        supported_messages: [],
      },
    });
    (device as any).commands = { typedCall };

    await expect(
      device.probeProtocolV2RuntimeState({
        hw: { serial_no: 'PR2SERIAL' },
        fw: { application: { version: '1.2.3' } },
      })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.DeviceInitializeFailed });
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('does not reinterpret a state update error as runtime detection failure', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({
        type: 'ProtocolInfo',
        message: protocolV2ApplicationInfo,
      })
      .mockResolvedValueOnce({
        type: 'DeviceStatus',
        message: { init_states: true, unlocked: true },
      });
    const updateProtocolV2Features = jest
      .spyOn(device, 'updateProtocolV2Features')
      .mockImplementation(() => {
        throw new Error('state update failed');
      });
    (device as any).commands = { typedCall };

    await expect(
      device.probeProtocolV2RuntimeState({
        hw: { serial_no: 'PR2SERIAL' },
        fw: { application: { version: '1.0.0' } },
      })
    ).rejects.toThrow('state update failed');

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(updateProtocolV2Features).toHaveBeenCalledTimes(1);
    expect(updateProtocolV2Features).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ init_states: true }),
      'normal',
      protocolV2ApplicationInfo
    );
  });

  test('refreshes Protocol V2 features without falling back to V1 GetFeatures', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({
        type: 'DeviceInfo',
        message: {
          hw: { Device_type: DeviceType.PRO2, serial_no: 'PR2SERIAL' },
          fw: { application: { version: '1.2.3' } },
        },
      })
      .mockResolvedValueOnce({
        type: 'ProtocolInfo',
        message: protocolV2ApplicationInfo,
      })
      .mockResolvedValueOnce({
        type: 'DeviceStatus',
        message: { init_states: true, unlocked: true },
      })
      .mockResolvedValueOnce({
        type: 'DeviceInfo',
        message: {
          hw: { Device_type: DeviceType.PRO2, serial_no: 'PR2SERIAL' },
          fw: { application: { version: '1.2.4' } },
        },
      })
      .mockResolvedValueOnce({
        type: 'DeviceStatus',
        message: { init_states: true, unlocked: true },
      });

    (device as any).commands = { typedCall };

    await device.initialize();
    const features = await device.getFeatures();

    expect(device.features).toMatchObject({
      deviceId: null,
      firmwareVersion: '1.2.4',
      passphraseProtection: null,
    });
    expect(features).toMatchObject({
      deviceType: 'pro2',
      serialNo: 'PR2SERIAL',
      firmwareVersion: '1.2.4',
      passphraseProtection: null,
    });
    expect(typedCall).toHaveBeenCalledTimes(5);
    expect(typedCall).toHaveBeenNthCalledWith(
      4,
      'DeviceInfoGet',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          coprocessor: true,
          se1: true,
          se2: true,
          se3: true,
          se4: true,
        },
        types: {
          version: true,
          specific: true,
        },
      },
      { timeoutMs: PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS }
    );
    expect(typedCall).not.toHaveBeenCalledWith('GetFeatures', 'Features', {});
  });

  test('keeps Protocol V2 features available for method internals such as evmSignTypedData', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({
        type: 'DeviceInfo',
        message: {
          hw: { serial_no: 'PR2SERIAL' },
          fw: { application: { version: '1.2.4' } },
        },
      })
      .mockResolvedValueOnce({
        type: 'ProtocolInfo',
        message: protocolV2ApplicationInfo,
      })
      .mockResolvedValueOnce({
        type: 'DeviceStatus',
        message: { init_states: true, passphrase_enabled: true },
      });
    (device as any).commands = { typedCall };

    await device.initialize();
    expect(device.features).toBeDefined();

    const method = new EVMSignTypedData({
      id: 1,
      payload: {
        method: 'evmSignTypedData',
        path: "m/44'/60'/0'/0/0",
        metamaskV4Compat: true,
        data: {
          types: {
            EIP712Domain: [],
            Mail: [{ name: 'contents', type: 'string' }],
          },
          primaryType: 'Mail',
          domain: {},
          message: { contents: 'hello' },
        },
      },
    });
    method.init();
    (method as any).device = stubDevice({
      features: device.features,
      commands: { typedCall: jest.fn() },
    });
    (method as any).signTypedData = jest
      .fn()
      .mockResolvedValue({ address: '0x0', signature: '0x1' });

    await expect(method.run()).resolves.toEqual({ address: '0x0', signature: '0x1' });
  });

  test('unlocks Protocol V2 devices with the main PIN regardless of Pro-series version gates', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const typedCall = jest.fn().mockImplementation(requestType => {
      if (requestType === 'DeviceSessionAskPin') {
        return {
          type: 'Success',
          message: { message: 'PIN verified' },
        };
      }
      if (requestType === 'DeviceStatusGet') {
        return {
          type: 'DeviceStatus',
          message: {
            init_states: true,
            unlocked: true,
            passphrase_enabled: false,
          },
        };
      }
      throw new Error(`Unexpected request: ${requestType}`);
    });

    (device as any).commands = { typedCall };
    // Pro2 uses an independent version line and dedicated device-side PIN flow,
    // without the Pro version threshold or GetAddress probe fallback.
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        hw: { Device_type: DeviceType.PRO2, serial_no: 'PR2SERIAL' },
        fw: { application: { version: '1.2.3' } },
        status: { init_states: true },
      }
    );
    const pinOnDevice = jest.fn();
    device.on(DEVICE.PIN_ON_DEVICE, pinOnDevice);

    const features = await device.unlockDevice();

    expect(pinOnDevice).toHaveBeenCalledWith(
      device,
      DeviceSessionPinType.Main,
      expect.objectContaining({
        source: 'unlock-coordinator',
        reason: 'device-unlock',
        deviceOnly: true,
      })
    );
    expect(pinOnDevice.mock.invocationCallOrder[0]).toBeLessThan(
      typedCall.mock.invocationCallOrder[0]
    );
    expect(typedCall.mock.calls).toEqual([
      ['DeviceSessionAskPin', 'Success', { type: DeviceSessionPinType.Main }],
      ['DeviceStatusGet', 'DeviceStatus', {}],
    ]);
    expect(typedCall).not.toHaveBeenCalledWith('GetAddress', 'Address', expect.anything());
    expect(typedCall).not.toHaveBeenCalledWith('GetFeatures', 'Features', {});
    expect(features).toMatchObject({
      deviceType: 'pro2',
      firmwareVersion: '1.2.3',
      unlocked: true,
    });
  });

  test('refreshes Protocol V2 passphrase and attach-PIN status after unlock', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        hw: { serial_no: 'PR2SERIAL' },
        fw: { application: { version: '4.15.0' } },
        status: { passphrase_enabled: false },
      }
    );
    const typedCall = jest.fn().mockImplementation(requestType => {
      if (requestType === 'DeviceSessionAskPin') {
        return {
          type: 'Success',
          message: { message: 'PIN verified' },
        };
      }
      if (requestType === 'DeviceStatusGet') {
        return {
          type: 'DeviceStatus',
          message: {
            init_states: true,
            unlocked: true,
            passphrase_enabled: true,
            attach_to_pin_enabled: true,
            unlocked_by_attach_to_pin: true,
          },
        };
      }
      throw new Error(`Unexpected request: ${requestType}`);
    });
    (device as any).commands = { typedCall };
    const pinOnDevice = jest.fn();
    device.on(DEVICE.PIN_ON_DEVICE, pinOnDevice);

    await device.unlockDevice(DeviceSessionPinType.Main, { emitUiEvent: false });

    expect(pinOnDevice).not.toHaveBeenCalled();
    expect(typedCall.mock.calls).toEqual([
      ['DeviceSessionAskPin', 'Success', { type: DeviceSessionPinType.Main }],
      ['DeviceStatusGet', 'DeviceStatus', {}],
    ]);
    expect((device as any).profile).toBeUndefined();
    expect(device.features?.unlocked).toBe(true);
    expect(device.features?.passphraseProtection).toBe(true);
    expect(device.features?.unlockedAttachPin).toBe(true);
  });

  test('maps unsupported Protocol V2 DeviceSessionAskPin to DeviceNotSupportMethod', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        fw: { application: { version: '1.2.3' } },
        status: { unlocked: false },
      }
    );
    const typedCall = jest
      .fn()
      .mockRejectedValue(new Error('Failure_UnexpectedMessage,Unknown message'));
    (device as any).commands = { typedCall };

    await expect(device.unlockDevice()).rejects.toEqual(
      expect.objectContaining({
        errorCode: HardwareErrorCode.DeviceNotSupportMethod,
      })
    );
    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall.mock.calls).toEqual([
      ['DeviceSessionAskPin', 'Success', { type: DeviceSessionPinType.Main }],
    ]);
    expect(typedCall).not.toHaveBeenCalledWith(
      'DeviceSessionGet',
      'DeviceSession',
      expect.anything()
    );
  });

  test('keeps Protocol V1 unlock response handling unchanged', async () => {
    const device = Device.fromDescriptor({ path: 'v1-path', protocolType: 'V1' } as any);
    (device as any).features = {
      deviceType: 'pro',
      firmwareVersion: '4.15.0',
      capabilities: [],
      unlocked: false,
      passphraseProtection: false,
    } as Features;
    const typedCall = jest.fn().mockResolvedValue({
      type: 'UnLockDeviceResponse',
      message: {
        unlocked: true,
        unlocked_attach_pin: true,
        passphrase_protection: true,
      },
    });
    (device as any).commands = { typedCall };

    await expect(device.unlockDevice()).resolves.toMatchObject({
      unlocked: true,
      unlockedAttachPin: true,
      passphraseProtection: true,
    });
    expect(typedCall.mock.calls).toEqual([['UnLockDevice', 'UnLockDeviceResponse']]);
  });
});

describe('API compatibility handling', () => {
  test('returns a typed unsupported error for deprecated EIP712 message signing on Protocol V2', async () => {
    const method = new EVMSignMessageEIP712({
      id: 1,
      payload: {
        method: 'evmSignMessageEIP712',
        path: "m/44'/60'/0'/0/0",
        domainHash: '0x'.concat('11'.repeat(32)),
        messageHash: '0x'.concat('22'.repeat(32)),
      },
    });

    method.init();
    (method as any).device = stubDevice({
      features: {
        deviceType: 'pro2',
      },
      originalDescriptor: {
        protocolType: 'V2',
      },
      getCurrentFirmwareVersionString: () => '4.15.0',
      getCurrentMethodVersionRange: (selectRange: (deviceType: string) => unknown) =>
        selectRange('pro2'),
      getCurrentFirmwareType: () => 'universal',
    });

    await expect(method.run()).rejects.toEqual(
      expect.objectContaining({
        errorCode: HardwareErrorCode.DeviceNotSupportMethod,
      })
    );
  });

  test('does not mark supported Pro2 Tron, Solana, TON, SUI and Polkadot methods as unsupported', () => {
    const features = {
      deviceType: 'pro2',
    } as Features;

    const tronMethod = new TronGetAddress({
      id: 1,
      payload: {
        method: 'tronGetAddress',
        path: "m/44'/195'/0'/0/0",
        showOnOneKey: false,
      },
    });
    const solMethod = new SolGetAddress({
      id: 2,
      payload: {
        method: 'solGetAddress',
        path: "m/44'/501'/0'/0'",
        showOnOneKey: false,
      },
    });
    const tonGetAddressMethod = new TonGetAddress({
      id: 3,
      payload: {
        method: 'tonGetAddress',
        path: "m/44'/607'/0'",
        showOnOneKey: false,
      },
    });
    const tonSignMessageMethod = new TonSignMessage({
      id: 4,
      payload: {
        method: 'tonSignMessage',
        path: "m/44'/607'/0'",
      },
    });
    const tonSignProofMethod = new TonSignProof({
      id: 5,
      payload: {
        method: 'tonSignProof',
        path: "m/44'/607'/0'",
      },
    });
    const tonSignDataMethod = new TonSignData({
      id: 6,
      payload: {
        method: 'tonSignData',
        path: "m/44'/607'/0'",
      },
    });
    const suiGetAddressMethod = new SuiGetAddress({
      id: 7,
      payload: {
        method: 'suiGetAddress',
        path: "m/44'/784'/0'/0'/0'",
        showOnOneKey: false,
      },
    });
    const suiGetPublicKeyMethod = new SuiGetPublicKey({
      id: 8,
      payload: {
        method: 'suiGetPublicKey',
        path: "m/44'/784'/0'/0'/0'",
      },
    });
    const suiSignMessageMethod = new SuiSignMessage({
      id: 9,
      payload: {
        method: 'suiSignMessage',
        path: "m/44'/784'/0'/0'/0'",
        messageHex: '0x1234',
      },
    });
    const suiSignTransactionMethod = new SuiSignTransaction({
      id: 10,
      payload: {
        method: 'suiSignTransaction',
        path: "m/44'/784'/0'/0'/0'",
        rawTx: '0x1234',
      },
    });
    const polkadotGetAddressMethod = new PolkadotGetAddress({
      id: 11,
      payload: {
        method: 'polkadotGetAddress',
        path: "m/44'/354'/0'/0'/0'",
        prefix: 0,
        network: 'polkadot',
        showOnOneKey: false,
      },
    });

    polkadotGetAddressMethod.init();

    expect(tronMethod.supportsProtocol('V2')).toBe(true);
    expect(solMethod.supportsProtocol('V2')).toBe(true);
    expect(
      getMethodVersionRange(features, type => tonGetAddressMethod.getVersionRange()[type])
    ).toEqual({
      min: '0.0.0',
    });
    expect(
      getMethodVersionRange(features, type => tonSignMessageMethod.getVersionRange()[type])
    ).toEqual({
      min: '0.0.0',
    });
    expect(
      getMethodVersionRange(features, type => tonSignProofMethod.getVersionRange()[type])
    ).toEqual({
      min: '0.0.0',
    });
    expect(
      getMethodVersionRange(features, type => tonSignDataMethod.getVersionRange()[type])
    ).toBeUndefined();
    expect(
      getMethodVersionRange(features, type => suiGetAddressMethod.getVersionRange()[type])
    ).toEqual({
      min: '0.0.0',
    });
    expect(
      getMethodVersionRange(features, type => suiGetPublicKeyMethod.getVersionRange()[type])
    ).toEqual({
      min: '0.0.0',
    });
    expect(
      getMethodVersionRange(features, type => suiSignMessageMethod.getVersionRange()[type])
    ).toEqual({
      min: '0.0.0',
    });
    expect(
      getMethodVersionRange(features, type => suiSignTransactionMethod.getVersionRange()[type])
    ).toEqual({
      min: '0.0.0',
    });
    expect(
      getMethodVersionRange(features, type => polkadotGetAddressMethod.getVersionRange()[type])
    ).toEqual({
      min: '0.0.0',
    });
  });

  test('allows Pro2 Solana signing methods through Protocol V2 version checks', () => {
    const features = {
      deviceType: 'pro2',
    } as Features;

    const solSignMessageMethod = new SolSignMessage({
      id: 1,
      payload: {
        method: 'solSignMessage',
        path: "m/44'/501'/0'/0'",
        messageHex: '48656c6c6f',
      },
    });
    const solSignOffchainMessageMethod = new SolSignOffchainMessage({
      id: 2,
      payload: {
        method: 'solSignOffchainMessage',
        path: "m/44'/501'/0'/0'",
        messageHex: '48656c6c6f',
      },
    });
    const solSignTransactionMethod = new SolSignTransaction({
      id: 3,
      payload: {
        method: 'solSignTransaction',
        path: "m/44'/501'/0'/0'",
        rawTx: '00',
      },
    });
    const solSignVersionedTransactionMethod = new SolSignTransaction({
      id: 4,
      payload: {
        method: 'solSignTransaction',
        path: "m/44'/501'/0'/0'",
        rawTx: '80',
      },
    });

    solSignTransactionMethod.init();
    solSignVersionedTransactionMethod.init();

    expect(
      getMethodVersionRange(features, type => solSignMessageMethod.getVersionRange()[type])
    ).toEqual({
      min: '0.0.0',
    });
    expect(
      getMethodVersionRange(features, type => solSignOffchainMessageMethod.getVersionRange()[type])
    ).toEqual({
      min: '0.0.0',
    });
    expect(
      getMethodVersionRange(features, type => solSignTransactionMethod.getVersionRange()[type])
    ).toEqual({
      min: '0.0.0',
    });
    expect(
      getMethodVersionRange(
        features,
        type => solSignVersionedTransactionMethod.getVersionRange()[type]
      )
    ).toEqual({
      min: '0.0.0',
    });
  });

  test('uses chunk transfer for large Sui transactions on Protocol V2', async () => {
    const rawTx = '0x'.concat('ab'.repeat(5000));
    const typedCall = jest.fn(() => ({
      type: 'SuiSignedTx',
      message: {
        public_key: '',
        signature: '',
      },
    }));
    const method = new SuiSignTransaction({
      id: 1,
      payload: {
        method: 'suiSignTransaction',
        path: "m/44'/784'/0'/0'/0'",
        rawTx,
      },
    });

    method.init();
    (method as any).device = stubDevice({
      features: {
        deviceType: 'pro2',
      },
      originalDescriptor: {
        protocolType: 'V2',
      },
      getCommands: () => ({
        typedCall,
      }),
    });

    await method.run();

    expect(typedCall).toHaveBeenCalledTimes(1);
    const [, , params] = typedCall.mock.calls[0];
    expect(params).toEqual(
      expect.objectContaining({
        raw_tx: '',
        data_length: 5000,
      })
    );
    expect(params.data_initial_chunk).toHaveLength(2048);
  });

  test('declares Dynex signing unsupported on Protocol V2', () => {
    const method = new DnxSignTransaction({
      id: 1,
      payload: {
        method: 'dnxSignTransaction',
        path: "m/44'/29538'/0'/0/0",
        inputs: [
          {
            prevIndex: 1,
            globalIndex: 1,
            txPubkey: '00',
            prevOutPubkey: '00',
            amount: '1',
          },
        ],
        toAddress: 'dnx-address',
        amount: '1',
        fee: '1',
      },
    });

    method.init();
    expect(() => method.assertProtocolSupported('V2', EFirmwareType.Universal)).toThrow(
      expect.objectContaining({
        errorCode: HardwareErrorCode.DeviceNotSupportMethod,
      })
    );
  });

  test('declares Dynex address unsupported on Protocol V2', () => {
    const method = new DnxGetAddress({
      id: 1,
      payload: {
        method: 'dnxGetAddress',
        path: "m/44'/29538'/0'/0/0",
        showOnOneKey: false,
      },
    });

    method.init();
    expect(() => method.assertProtocolSupported('V2', EFirmwareType.Universal)).toThrow(
      expect.objectContaining({
        errorCode: HardwareErrorCode.DeviceNotSupportMethod,
      })
    );
  });
});

describe('Protocol V2 firmware update targets', () => {
  const OKPP_HEADER_SIZE = 0x52a0;
  let forceReloadDataSpy: jest.SpyInstance<Promise<void>, []>;

  beforeEach(() => {
    forceReloadDataSpy = jest.spyOn(DataManager, 'forceReloadData').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildOkppHeader = ({
    type = 'RESC',
    version = [1, 0, 0],
    payloadHash = 'ab'.repeat(64),
    headerHash = 'cd'.repeat(64),
  }: {
    type?: string;
    version?: [number, number, number];
    payloadHash?: string;
    headerHash?: string;
  } = {}) => {
    const header = new Uint8Array(OKPP_HEADER_SIZE);
    const view = new DataView(header.buffer);
    'OKPP'.split('').forEach((char, index) => {
      header[index] = char.charCodeAt(0);
    });
    view.setUint32(0x04, 1, true);
    type.split('').forEach((char, index) => {
      header[0x08 + index] = char.charCodeAt(0);
    });
    view.setUint32(0x0c, OKPP_HEADER_SIZE, true);
    view.setUint32(0x10, version[0] * 0x10000 + version[1] * 0x100 + version[2], true);
    const writeHex = (offset: number, hex: string) => {
      for (let i = 0; i < hex.length / 2; i++) {
        header[offset + i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
    };
    writeHex(0x200, payloadHash);
    writeHex(0x240, headerHash);
    return header;
  };

  test('keeps Protocol V2 firmware updates off the firmwareUpdateV3 path', () => {
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
      },
    });
    expect(() => method.assertProtocolSupported('V2', EFirmwareType.Universal)).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.DeviceNotSupportMethod })
    );
  });

  test('uses Protocol V2 features after BLE final reconnect without V1 Initialize', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        coprocessorBinary: new Uint8Array([1, 2, 3]).buffer,
      },
    });
    const acquire = jest.fn().mockResolvedValue({ uuid: 'ble-session' });
    const typedCall = jest.fn().mockImplementation((name: string) => {
      if (name === 'DeviceInfoGet') {
        return Promise.resolve({
          type: 'DeviceInfo',
          message: {
            hw: { serial_no: 'BLE-PRO2-SERIAL' },
            fw: {
              bootloader: { version: '0.0.0' },
              application: { version: '0.0.0' },
            },
            coprocessor: {
              application: { version: '0.0.0' },
            },
          },
        });
      }
      if (name === 'DeviceStatusGet') {
        return Promise.resolve({
          type: 'DeviceStatus',
          message: { init_states: true, unlocked: true },
        });
      }
      if (name === 'ProtocolInfoRequest') {
        return Promise.resolve({
          type: 'ProtocolInfo',
          message: protocolV2ApplicationInfo,
        });
      }
      return Promise.reject(new Error(`unexpected call ${name}`));
    });
    const commands = { typedCall };

    (method as any).protocolV2ExpectedSerialNumber = 'BLE-PRO2-SERIAL';
    (method as any).isBleReconnect = jest.fn(() => true);
    (method as any).device = stubDevice({
      originalDescriptor: { id: 'ble-id', path: 'ble-path', protocolType: 'V2' },
      deviceConnector: { acquire },
      getCommands: () => commands,
      updateProtocolV2Features: jest.fn(() => ({
        bootloaderMode: false,
        mode: 'normal',
        firmwareVersion: '0.0.0',
        bootloaderVersion: '0.0.0',
        bleVersion: '0.0.0',
      })),
    });

    const versions = await (method as any).waitForProtocolV2FinalFeatures();

    expect(acquire).toHaveBeenCalledWith('ble-id', null, true, 'V2');
    // Completion uses the VERSIONS request, including SE targets, with matching scope.
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'DeviceInfoGet',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          coprocessor: true,
          se1: true,
          se2: true,
          se3: true,
          se4: true,
        },
        types: {
          version: true,
          specific: true,
        },
      },
      { timeoutMs: 5000 }
    );
    expect(typedCall).toHaveBeenCalledTimes(3);
    expect(typedCall.mock.calls.map(call => call[0])).toEqual([
      'DeviceInfoGet',
      'ProtocolInfoRequest',
      'DeviceStatusGet',
    ]);
    expect(typedCall).not.toHaveBeenCalledWith('Initialize', 'Features', {});
    expect(versions).toEqual({
      bootloaderVersion: '0.0.0',
      bleVersion: '0.0.0',
      firmwareVersion: '0.0.0',
    });
  });

  test('enters Protocol V2 bootloader before upload', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    method.init();

    (method as any).device = stubDevice({
      originalDescriptor: { id: 'ble-id', path: 'ble-path', protocolType: 'V2' },
      features: { capabilities: [] },
    });
    (method as any).captureProtocolV2PhysicalIdentity = jest.fn().mockResolvedValue(undefined);
    (method as any).prepareBootloaderBinary = jest.fn().mockReturnValue(null);
    (method as any).collectExplicitTargetBinaries = jest.fn().mockReturnValue([
      {
        fileName: 'coprocessor.bin',
        binary: new Uint8Array([1, 2, 3]).buffer,
        targetId: 5,
      },
    ]);
    (method as any).executeProtocolV2Update = jest.fn().mockResolvedValue(undefined);
    (method as any).exitProtocolV2BootloaderToNormal = jest.fn().mockResolvedValue(undefined);
    (method as any).waitForProtocolV2FinalFeatures = jest.fn().mockResolvedValue({
      bootloaderVersion: '0.2.0',
      bleVersion: '4.5.6',
      firmwareVersion: '1.2.3',
    });
    (method as any).protocolV2Reboot = jest.fn();
    (method as any).enterProtocolV2BootloaderMode = jest.fn().mockResolvedValue(true);
    method.postTipMessage = jest.fn();

    await method.run();

    expect((method as any).enterProtocolV2BootloaderMode).toHaveBeenCalledTimes(1);
    expect((method as any).executeProtocolV2Update).toHaveBeenCalledWith({
      fwBinaryMap: [
        {
          fileName: 'coprocessor.bin',
          binary: expect.any(ArrayBuffer),
          targetId: 5,
        },
      ],
      bootloaderBinary: null,
    });
  });

  test('reboots Protocol V2 normal-mode device to bootloader before transfer', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    (method as any).device = stubDevice({
      originalDescriptor: { id: 'usb-id', path: 'usb-path', protocolType: 'V2' },
      features: { bootloader_mode: false, capabilities: [] },
      isBootloader: () => false,
    });
    (method as any).protocolV2Reboot = jest.fn().mockResolvedValue({
      message: 'Device rebooted successfully',
    });
    (method as any).checkDeviceToBootloader = jest.fn();
    const typedCall = jest.fn().mockImplementation((requestType: string) => {
      if (requestType === 'DeviceInfoGet') {
        return Promise.resolve({
          type: 'DeviceInfo',
          message: protocolV2BootloaderDeviceInfo,
        });
      }
      if (requestType === 'ProtocolInfoRequest') {
        return Promise.resolve({
          type: 'ProtocolInfo',
          message: protocolV2BootloaderInfo,
        });
      }
      return Promise.reject(new Error(`unexpected call ${requestType}`));
    });
    const reconnectProtocolV2Device = jest.fn().mockImplementation(() => {
      (method as any).device.isBootloader = () => true;
      return Promise.resolve();
    });
    (method as any).reconnectProtocolV2Device = reconnectProtocolV2Device;
    (method as any).device.getCommands = () => ({ typedCall });
    (method as any).protocolV2ExpectedSerialNumber = 'PR9999999999';
    method.postTipMessage = jest.fn();

    await (method as any).enterProtocolV2BootloaderMode();

    expect(method.postTipMessage).toHaveBeenCalledWith('AutoRebootToBootloader');
    expect((method as any).protocolV2Reboot).toHaveBeenCalledWith(DeviceRebootType.Bootloader);
    expect(method.postTipMessage).toHaveBeenCalledWith('GoToBootloaderSuccess');
    expect((method as any).checkDeviceToBootloader).not.toHaveBeenCalled();
    expect(reconnectProtocolV2Device).toHaveBeenCalledTimes(1);
  });

  test('keeps Protocol V2 romloader active before firmware transfer', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const isRomloader = jest.fn(() => true);
    (method as any).device = stubDevice({
      originalDescriptor: { id: 'usb-id', path: 'romloader-path', protocolType: 'V2' },
      features: {
        deviceType: 'pro2',
        mode: 'romloader',
        bootloaderMode: false,
        capabilities: [],
      },
      isBootloader: () => false,
      isRomloader,
    });
    (method as any).protocolV2Reboot = jest
      .fn()
      .mockRejectedValue(new Error('romloader rejected Bootloader reboot type'));
    method.postTipMessage = jest.fn();

    await expect((method as any).enterProtocolV2BootloaderMode()).resolves.toBe(false);

    expect(isRomloader).toHaveBeenCalledTimes(1);
    expect((method as any).protocolV2Reboot).not.toHaveBeenCalled();
    expect(method.postTipMessage).not.toHaveBeenCalledWith('AutoRebootToBootloader');
  });

  test('starts Protocol V2 firmware transfer directly from romloader mode', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
        coprocessorBinary: new Uint8Array([1]).buffer,
      },
    });
    method.init();
    (method as any).device = stubDevice({
      originalDescriptor: { id: 'usb-id', path: 'romloader-path', protocolType: 'V2' },
      features: {
        deviceType: 'pro2',
        firmwareVersion: '0.0.0',
        mode: 'romloader',
        bootloaderMode: true,
        capabilities: [],
      },
    });
    (method as any).captureProtocolV2PhysicalIdentity = jest.fn().mockResolvedValue(undefined);
    const prepareResourceBundles = jest
      .spyOn(method as any, 'prepareProtocolV2ResourceBundles')
      .mockResolvedValue(undefined);
    (method as any).protocolV2Reboot = jest.fn();
    (method as any).executeProtocolV2Update = jest.fn().mockResolvedValue(undefined);
    (method as any).exitProtocolV2BootloaderToNormal = jest.fn().mockResolvedValue(undefined);
    (method as any).waitForProtocolV2FinalFeatures = jest.fn().mockResolvedValue({
      bootloaderVersion: '1.0.0',
      bleVersion: '0.0.0',
      firmwareVersion: '1.0.0',
    });
    method.postTipMessage = jest.fn();

    await method.run();

    expect(prepareResourceBundles).toHaveBeenCalledWith(true);
    expect((method as any).protocolV2Reboot).not.toHaveBeenCalled();
    expect((method as any).executeProtocolV2Update).toHaveBeenCalledWith({
      bootloaderBinary: null,
      fwBinaryMap: [{ fileName: 'coprocessor.bin', binary: expect.anything(), targetId: 6 }],
    });
    expect(method.postTipMessage).not.toHaveBeenCalledWith('AutoRebootToBootloader');
  });

  test('polls until Protocol V2 bootloader descriptor is ready after reboot', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    (method as any).device = stubDevice({
      originalDescriptor: { id: 'usb-id', path: 'app-path', protocolType: 'V2' },
      features: { bootloader_mode: false, capabilities: [] },
      isBootloader: () => false,
    });
    const typedCall = jest.fn().mockImplementation((requestType: string) => {
      if (requestType === 'DeviceInfoGet') {
        return Promise.resolve({
          type: 'DeviceInfo',
          message: protocolV2BootloaderDeviceInfo,
        });
      }
      if (requestType === 'ProtocolInfoRequest') {
        return Promise.resolve({
          type: 'ProtocolInfo',
          message: protocolV2BootloaderInfo,
        });
      }
      return Promise.reject(new Error(`unexpected call ${requestType}`));
    });
    const reconnectProtocolV2Device = jest
      .fn()
      .mockRejectedValueOnce(new Error('Device not found'))
      .mockRejectedValueOnce(new Error('Device not found'))
      .mockImplementation(() => {
        (method as any).device.isBootloader = () => true;
        return Promise.resolve();
      });
    (method as any).reconnectProtocolV2Device = reconnectProtocolV2Device;
    (method as any).device.getCommands = () => ({ typedCall });
    (method as any).protocolV2ExpectedSerialNumber = 'PR9999999999';

    await (method as any).waitForProtocolV2BootloaderMode(60 * 1000, 0);

    expect(reconnectProtocolV2Device).toHaveBeenCalledTimes(3);
    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall.mock.calls.map(call => call[0])).toEqual([
      'DeviceInfoGet',
      'ProtocolInfoRequest',
    ]);
  });

  test('does not run generic initialize during Protocol V2 USB firmware reconnect', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const commands = { disposed: true, mainId: '' };
    const initialize = jest.fn().mockResolvedValue(undefined);
    const device = stubDevice({
      originalDescriptor: { id: 'usb-id', path: 'usb-path', protocolType: 'V2' },
      features: { bootloaderMode: false, capabilities: [] },
      deviceConnector: {
        enumerate: jest.fn().mockResolvedValue({
          descriptors: [{ id: 'usb-id', path: 'usb-path', protocolType: 'V2' }],
        }),
      },
      updateFromCache: jest.fn(),
      hasDeviceAcquire: jest.fn(() => false),
      acquire: jest.fn().mockResolvedValue(undefined),
      initialize,
      commands,
      getCommands: () => commands,
      mainId: 'usb-path',
    });
    const cachedDevice = { getConnectId: () => 'usb-path' };
    const getDevices = jest.spyOn(DevicePool, 'getDevices').mockResolvedValue({
      devices: {},
      deviceList: [cachedDevice],
    } as any);
    (method as any).device = device;

    try {
      await (method as any).reconnectProtocolV2Device();
    } finally {
      getDevices.mockRestore();
    }

    expect(device.acquire).toHaveBeenCalledWith('V2', { throwOnRunPromiseError: true });
    expect(initialize).not.toHaveBeenCalled();
  });

  test('reuses an acquired Protocol V2 USB session while polling reconnect readiness', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const commands = { disposed: false, mainId: 'usb-session' };
    const acquire = jest.fn().mockResolvedValue(undefined);
    const device = stubDevice({
      originalDescriptor: {
        id: 'usb-id',
        path: 'usb-path',
        session: 'usb-session',
        protocolType: 'V2',
      },
      deviceConnector: {
        enumerate: jest.fn().mockResolvedValue({
          descriptors: [
            {
              id: 'usb-id',
              path: 'usb-path',
              session: 'usb-session',
              protocolType: 'V2',
            },
          ],
        }),
      },
      updateDescriptor: jest.fn(),
      updateFromCache: jest.fn(),
      hasDeviceAcquire: jest.fn(() => true),
      acquire,
      commands,
      getCommands: () => commands,
      mainId: 'usb-session',
    });
    const getDevices = jest.spyOn(DevicePool, 'getDevices').mockResolvedValue({
      devices: {},
      deviceList: [{ getConnectId: () => 'usb-path' }],
    } as any);
    (method as any).device = device;

    try {
      await (method as any).reconnectProtocolV2Device();
      await (method as any).reconnectProtocolV2Device();
    } finally {
      getDevices.mockRestore();
    }

    expect(acquire).not.toHaveBeenCalled();
    expect(device.hasDeviceAcquire).toHaveBeenCalledTimes(2);
  });

  test('stops final reconnect polling immediately when firmware changes device identity', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceInfo',
      message: {
        hw: { serial_no: 'PR2SERIAL' },
        fw: { application: { version: '1.0.0' } },
      },
    });
    (method as any).protocolV2ExpectedSerialNumber = 'expected-serial';
    (method as any).reconnectProtocolV2Device = reconnectProtocolV2Device;
    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
      probeProtocolV2RuntimeState: jest.fn().mockResolvedValue({
        deviceId: 'changed-device',
        mode: 'normal',
        bootloaderMode: false,
      }),
    });

    await expect((method as any).waitForProtocolV2ReconnectAndFeatures(60_000)).rejects.toThrow(
      'identity mismatch'
    );
    expect(reconnectProtocolV2Device).toHaveBeenCalledTimes(1);
  });

  test('reboots Protocol V2 firmware flow back to normal without legacy switch-firmware prompt', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    method.postTipMessage = jest.fn();
    (method as any).reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
    (method as any).verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue(undefined);
    (method as any).protocolV2Reboot = jest.fn().mockResolvedValue({
      message: 'Device rebooted successfully',
    });

    await (method as any).exitProtocolV2BootloaderToNormal();

    expect(method.postTipMessage).not.toHaveBeenCalledWith('SwitchFirmwareReconnectDevice');
    expect((method as any).reconnectProtocolV2Device).toHaveBeenCalledTimes(1);
    expect((method as any).protocolV2Reboot).toHaveBeenCalledWith(DeviceRebootType.Normal);
  });

  test('treats iOS BLE RxError 6 during Protocol V2 reboot as expected disconnect', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest
      .fn()
      .mockRejectedValue(
        new Error("The operation couldn't be completed. (MultiplatformBleAdapter.RxError error 6.)")
      );

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });

    await expect((method as any).protocolV2Reboot(DeviceRebootType.Normal)).resolves.toEqual({
      message: 'Device rebooted successfully',
    });
  });

  test('treats direct disconnect during Protocol V2 normal reboot as expected', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest
      .fn()
      .mockRejectedValue(new Error('Connection error has occured: Device disconnected'));

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });

    await expect((method as any).protocolV2Reboot(DeviceRebootType.Normal)).resolves.toEqual({
      message: 'Device rebooted successfully',
    });
  });

  test('requires an explicit Protocol V2 update ACK before entering install state', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest
      .fn()
      .mockRejectedValue(
        new DOMException(
          "Failed to execute 'open' on 'USBDevice': The device was disconnected",
          'NotFoundError'
        )
      );

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    method.postTipMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    await expect(
      (method as any).protocolV2StartFirmwareUpdate({
        targets: [{ target_id: 4, path: 'vol1:firmware.bin' }],
      })
    ).rejects.toThrow();

    expect(method.postTipMessage).not.toHaveBeenCalled();
    expect(method.postProgressMessage).not.toHaveBeenCalled();
  });

  test('does not poll Protocol V2 install status when the update ACK times out', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockRejectedValue(new Error('LIBUSB_TRANSFER_TIMED_OUT'));

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    method.postTipMessage = jest.fn();
    method.postProgressMessage = jest.fn();

    await expect(
      (method as any).protocolV2StartFirmwareUpdate({
        targets: [{ target_id: 4, path: 'vol1:application_p1.bin' }],
      })
    ).rejects.toThrow('LIBUSB_TRANSFER_TIMED_OUT');

    expect(method.postTipMessage).not.toHaveBeenCalled();
    expect(method.postProgressMessage).not.toHaveBeenCalled();
  });

  test('polls only firmware status while Protocol V2 bootloader is installing', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({
        type: 'DeviceFirmwareUpdateStatus',
        message: { records: [{ target_id: 4, status: 1 }] },
      })
      .mockResolvedValueOnce({
        type: 'DeviceFirmwareUpdateStatus',
        message: { records: [{ target_id: 4, status: 2 }] },
      });
    const reconnectProtocolV2Device = jest
      .fn()
      .mockRejectedValueOnce(new Error('Device rebooting'))
      .mockResolvedValue(undefined);

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    (method as any).reconnectProtocolV2Device = reconnectProtocolV2Device;
    (method as any).verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue(undefined);
    method.postProgressMessage = jest.fn();

    await (method as any).waitForProtocolV2FirmwareUpdateComplete([
      { target_id: 4, path: 'vol0:/application_p1.bin' },
    ]);

    expect(reconnectProtocolV2Device).toHaveBeenCalledTimes(3);
    expect(typedCall.mock.calls.map(call => call[0])).toEqual([
      'DeviceFirmwareUpdateStatusGet',
      'DeviceFirmwareUpdateStatusGet',
    ]);
    expect(typedCall.mock.calls.map(call => call[0])).not.toContain('DeviceStatusGet');
    expect(method.postProgressMessage).toHaveBeenCalledWith(1, 'installingFirmware');
    expect(method.postProgressMessage).toHaveBeenCalledWith(100, 'installingFirmware');
  });

  test('accepts a missing firmware status handler only after confirming normal mode', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest
      .fn()
      .mockRejectedValue(new Error('Failure: Handler not registered for this message'));
    const reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    (method as any).reconnectProtocolV2Device = reconnectProtocolV2Device;
    const deviceInfo = { hw: { serial_no: 'PRO2-PHYSICAL-1' } };
    (method as any).verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue(deviceInfo);
    (method as any).probeProtocolV2NormalMode = jest.fn().mockResolvedValue(true);
    method.postProgressMessage = jest.fn();

    await (method as any).waitForProtocolV2FirmwareUpdateComplete([
      { target_id: 4, path: 'vol0:/application_p1.bin' },
    ]);

    expect(reconnectProtocolV2Device).toHaveBeenCalledTimes(1);
    expect(typedCall.mock.calls.map(call => call[0])).toEqual(['DeviceFirmwareUpdateStatusGet']);
    expect((method as any).probeProtocolV2NormalMode).toHaveBeenCalledWith(deviceInfo);
  });

  test.each([
    [{ mode: 'normal', bootloaderMode: false }, true],
    [{ mode: 'bootloader', bootloaderMode: true }, false],
  ])('derives firmware completion from the runtime-state probe: %o', async (features, expected) => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const deviceInfo = { hw: { serial_no: 'PRO2-PHYSICAL-1' } };
    const probeProtocolV2RuntimeState = jest.fn().mockResolvedValue(features);
    (method as any).device = stubDevice({ probeProtocolV2RuntimeState });

    await expect((method as any).probeProtocolV2NormalMode(deviceInfo)).resolves.toBe(expected);
    expect(probeProtocolV2RuntimeState).toHaveBeenCalledWith(deviceInfo, 5000);
  });

  test('keeps polling when the firmware status handler is missing in loader mode', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest
      .fn()
      .mockRejectedValueOnce(new Error('Failure: Handler not registered for this message'))
      .mockResolvedValueOnce({
        type: 'DeviceFirmwareUpdateStatus',
        message: { records: [{ target_id: 4, status: 2 }] },
      });
    const deviceInfo = { hw: { serial_no: 'PRO2-PHYSICAL-1' } };
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((
      callback: () => void
    ) => {
      callback();
      return 0 as any;
    }) as typeof setTimeout);

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    (method as any).reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
    (method as any).verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue(deviceInfo);
    (method as any).probeProtocolV2NormalMode = jest.fn().mockResolvedValue(false);
    method.postProgressMessage = jest.fn();

    try {
      await (method as any).waitForProtocolV2FirmwareUpdateComplete([
        { target_id: 4, path: 'vol0:/application_p1.bin' },
      ]);
    } finally {
      setTimeoutSpy.mockRestore();
    }

    expect(typedCall.mock.calls.map(call => call[0])).toEqual([
      'DeviceFirmwareUpdateStatusGet',
      'DeviceFirmwareUpdateStatusGet',
    ]);
    expect((method as any).probeProtocolV2NormalMode).toHaveBeenCalledWith(deviceInfo);
  });

  test('polls target status after update ACK and finishes when all targets complete', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceFirmwareUpdateStatus',
      message: {
        records: [
          { target_id: 3, status: 2 },
          { target_id: 4, status: 2 },
        ],
      },
    });
    const reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    (method as any).reconnectProtocolV2Device = reconnectProtocolV2Device;
    (method as any).verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue(undefined);
    method.postProgressMessage = jest.fn();

    await expect(
      (method as any).waitForProtocolV2FirmwareUpdateComplete([
        { target_id: 3, path: 'vol1:bootloader.bin' },
        { target_id: 4, path: 'vol1:application_p1.bin' },
      ])
    ).resolves.toBeUndefined();

    expect(reconnectProtocolV2Device).toHaveBeenCalledTimes(1);
    expect(typedCall).toHaveBeenCalledWith(
      'DeviceFirmwareUpdateStatusGet',
      'DeviceFirmwareUpdateStatus',
      expect.anything(),
      expect.anything()
    );
    expect(method.postProgressMessage).toHaveBeenCalledWith(100, 'installingFirmware');
  });

  test('uses SDK decoded enum names for Protocol V2 install polling', () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    method.postProgressMessage = jest.fn();

    const expectedTargetIds = new Set([4]);

    expect(
      (method as any).assertProtocolV2TargetStatus([{ target_id: 4, status: 2 }], expectedTargetIds)
    ).toBe(true);
    expect(
      (method as any).assertProtocolV2TargetStatus(
        [{ target_id: 4, status: 'FW_MGMT_UPDATER_TASK_STATUS_FINISHED' }],
        expectedTargetIds
      )
    ).toBe(true);
    expect(
      (method as any).assertProtocolV2TargetStatus(
        [
          {
            target_id: 'FW_MGMT_TARGET_APPLICATION_P1',
            status: 'FW_MGMT_UPDATER_TASK_STATUS_FINISHED',
          },
          { target_id: 'FW_MGMT_TARGET_SE04', status: 'FW_MGMT_UPDATER_TASK_STATUS_FINISHED' },
        ],
        new Set([4, 10])
      )
    ).toBe(true);

    (method.postProgressMessage as jest.Mock).mockClear();
    expect(
      (method as any).assertProtocolV2TargetStatus(
        [
          { target_id: 4, status: 'FW_MGMT_UPDATER_TASK_STATUS_FINISHED' },
          { target_id: 4, status: 'FW_MGMT_UPDATER_TASK_STATUS_FINISHED' },
        ],
        new Set([4, 10])
      )
    ).toBe(false);
    expect(method.postProgressMessage).toHaveBeenCalledWith(50, 'installingFirmware');
    expect(method.postProgressMessage).not.toHaveBeenCalledWith(100, 'installingFirmware');

    expect(
      (method as any).assertProtocolV2TargetStatus([{ target_id: 4, status: 1 }], expectedTargetIds)
    ).toBe(false);
    expect(
      (method as any).assertProtocolV2TargetStatus(
        [{ target_id: 4, status: 'FW_MGMT_UPDATER_TASK_STATUS_IN_PROGRESS' }],
        expectedTargetIds
      )
    ).toBe(false);
    expect(method.postProgressMessage).toHaveBeenCalledWith(1, 'installingFirmware');

    try {
      (method as any).assertProtocolV2TargetStatus(
        [{ target_id: 4, status: 3 }],
        expectedTargetIds
      );
      throw new Error('Expected Protocol V2 failed firmware status to throw');
    } catch (error: any) {
      expect(error.errorCode).toBe(HardwareErrorCode.FirmwareError);
    }

    try {
      (method as any).assertProtocolV2TargetStatus(
        [
          {
            target_id: 4,
            status: 'FW_MGMT_UPDATER_TASK_STATUS_FAILED_VERIFY',
            payload_version: 0x010000,
            path: 'vol0:/application_p1.bin',
          },
        ],
        expectedTargetIds
      );
      throw new Error('Expected Protocol V2 failed firmware status to throw');
    } catch (error: any) {
      expect(error.errorCode).toBe(HardwareErrorCode.FirmwareError);
      expect(error.message).toContain('FW_MGMT_UPDATER_TASK_STATUS_FAILED_VERIFY');
      expect(error.message).toContain('vol0:/application_p1.bin');
    }
  });

  test('reports failed Protocol V2 install status before the normal-mode timeout', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceFirmwareUpdateStatus',
      message: {
        records: [
          {
            target_id: 4,
            status: 'FW_MGMT_UPDATER_TASK_STATUS_FAILED_VERIFY',
            payload_version: 0x010000,
            path: 'vol0:/application_p1.bin',
          },
        ],
      },
    });
    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    (method as any).reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
    (method as any).verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue(undefined);
    (method as any).probeProtocolV2NormalMode = jest.fn().mockResolvedValue(false);

    await expect(
      (method as any).waitForProtocolV2FirmwareUpdateComplete([
        { target_id: 4, path: 'vol0:/application_p1.bin' },
      ])
    ).rejects.toMatchObject({
      errorCode: HardwareErrorCode.FirmwareError,
      message: expect.stringContaining('vol0:/application_p1.bin'),
    });
    expect(typedCall).toHaveBeenCalledWith(
      'DeviceFirmwareUpdateStatusGet',
      'DeviceFirmwareUpdateStatus',
      {
        fields: {
          status: true,
          payload_version: true,
          path: true,
        },
      },
      { timeoutMs: 5000 }
    );
  });

  test('passes bootloader, coprocessor, SE and app files to DeviceFirmwareUpdate targets', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });

    const writtenPaths: string[] = [];
    method.postTipMessage = jest.fn();
    method.postProgressMessage = jest.fn();
    (method as any).protocolV2CommonUpdateProcess = jest.fn().mockImplementation(params => {
      writtenPaths.push(params.filePath);
      return Number(params.processedSize ?? 0) + Number(params.payload.byteLength);
    });
    (method as any).verifyProtocolV2StagedFile = jest.fn().mockResolvedValue(undefined);
    (method as any).protocolV2StartFirmwareUpdate = jest.fn().mockResolvedValue(undefined);
    (method as any).waitForProtocolV2FirmwareUpdateComplete = jest
      .fn()
      .mockResolvedValue(undefined);

    await (method as any).executeProtocolV2Update({
      bootloaderBinary: new Uint8Array([4, 5]).buffer,
      fwBinaryMap: [
        {
          fileName: 'coprocessor.bin',
          binary: new Uint8Array([6]).buffer,
          targetId: 6,
        },
        {
          fileName: 'se01.bin',
          binary: new Uint8Array([7]).buffer,
          targetId: 7,
        },
        {
          fileName: 'application_p1.bin',
          binary: new Uint8Array([8]).buffer,
          targetId: 4,
        },
      ],
    });

    expect(writtenPaths).toEqual([
      'vol0:/bootloader.bin',
      'vol0:/coprocessor.bin',
      'vol0:/se01.bin',
      'vol0:/application_p1.bin',
    ]);
    expect((method as any).verifyProtocolV2StagedFile).toHaveBeenCalledTimes(4);
    expect((method as any).verifyProtocolV2StagedFile).toHaveBeenNthCalledWith(
      2,
      'vol0:/coprocessor.bin',
      1
    );
    expect((method as any).protocolV2StartFirmwareUpdate).toHaveBeenCalledTimes(1);
    expect((method as any).protocolV2StartFirmwareUpdate).toHaveBeenCalledWith({
      targets: [
        { target_id: 3, path: 'vol0:/bootloader.bin' },
        { target_id: 6, path: 'vol0:/coprocessor.bin' },
        { target_id: 7, path: 'vol0:/se01.bin' },
        { target_id: 4, path: 'vol0:/application_p1.bin' },
      ],
    });
    expect(method.postProgressMessage).toHaveBeenCalledWith(100, 'transferData');
    expect((method as any).waitForProtocolV2FirmwareUpdateComplete).toHaveBeenCalled();
  });

  test('announces one transfer when syncing resource bundles and staging firmware', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });

    method.postTipMessage = jest.fn();
    method.postProgressMessage = jest.fn();
    (method as any).protocolV2CommonUpdateProcess = jest
      .fn()
      .mockImplementation(params =>
        Promise.resolve(Number(params.processedSize ?? 0) + Number(params.payload.byteLength))
      );
    (method as any).verifyProtocolV2StagedFile = jest.fn().mockResolvedValue(undefined);
    (method as any).protocolV2StartFirmwareUpdate = jest.fn().mockResolvedValue(undefined);
    (method as any).waitForProtocolV2FirmwareUpdateComplete = jest
      .fn()
      .mockResolvedValue(undefined);

    await (method as any).executeProtocolV2Update({
      resourceBundles: [
        {
          name: 'images.okpkg',
          binary: new Uint8Array([1, 2]).buffer,
          devicePath: 'vol0:/bundles/images/images.okpkg',
        },
      ],
      bootloaderBinary: null,
      fwBinaryMap: [
        {
          fileName: 'application_p1.bin',
          binary: new Uint8Array([3]).buffer,
          targetId: 3,
        },
      ],
    });

    expect(method.postTipMessage).toHaveBeenCalledTimes(2);
    expect(method.postTipMessage).toHaveBeenNthCalledWith(1, 'StartTransferData');
    expect(method.postTipMessage).toHaveBeenNthCalledWith(2, 'ConfirmOnDevice');
    expect((method as any).protocolV2CommonUpdateProcess).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ processedSize: 0, totalSize: 3 })
    );
    expect((method as any).protocolV2CommonUpdateProcess).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ processedSize: 2, totalSize: 3 })
    );
  });

  test('does not request installation when the staged file size does not match', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });

    method.postTipMessage = jest.fn();
    method.postProgressMessage = jest.fn();
    (method as any).protocolV2CommonUpdateProcess = jest.fn().mockResolvedValue(3);
    (method as any).device = stubDevice({
      getCommands: () => ({
        typedCall: jest.fn().mockResolvedValue({
          type: 'FilesystemPathInfo',
          message: { exist: true, directory: false, size: 2 },
        }),
      }),
    });
    (method as any).protocolV2StartFirmwareUpdate = jest.fn();

    await expect(
      (method as any).executeProtocolV2Update({
        bootloaderBinary: null,
        fwBinaryMap: [
          {
            fileName: 'coprocessor.bin',
            binary: new Uint8Array([1, 2, 3]).buffer,
            targetId: 5,
          },
        ],
      })
    ).rejects.toThrow(/staged file verification failed/);
    expect((method as any).protocolV2StartFirmwareUpdate).not.toHaveBeenCalled();
  });

  test('passes explicit per-target binaries through without file name heuristics', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
        applicationP2Binary: new Uint8Array([2]).buffer,
        se04Binary: new Uint8Array([3]).buffer,
      },
    });
    method.init();

    const explicit = (method as any).collectExplicitTargetBinaries();
    expect(explicit).toEqual([
      { fileName: 'application_p2.bin', binary: expect.anything(), targetId: 5 },
      { fileName: 'se04.bin', binary: expect.anything(), targetId: 10 },
    ]);

    method.postTipMessage = jest.fn();
    method.postProgressMessage = jest.fn();
    (method as any).protocolV2CommonUpdateProcess = jest
      .fn()
      .mockImplementation(params =>
        Promise.resolve(Number(params.processedSize ?? 0) + Number(params.payload.byteLength))
      );
    (method as any).verifyProtocolV2StagedFile = jest.fn().mockResolvedValue(undefined);
    (method as any).protocolV2StartFirmwareUpdate = jest.fn().mockResolvedValue(undefined);
    (method as any).waitForProtocolV2FirmwareUpdateComplete = jest
      .fn()
      .mockResolvedValue(undefined);

    await (method as any).executeProtocolV2Update({
      bootloaderBinary: null,
      fwBinaryMap: explicit,
    });

    expect((method as any).protocolV2StartFirmwareUpdate).toHaveBeenCalledWith({
      targets: [
        { target_id: 5, path: 'vol0:/application_p2.bin' },
        { target_id: 10, path: 'vol0:/se04.bin' },
      ],
    });
  });

  test('rejects romloaderBinary before sending a Protocol V2 update request', () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
        romloaderBinary: new Uint8Array([1]).buffer,
      },
    });
    method.init();

    expect(() => (method as any).collectExplicitTargetBinaries()).toThrow(
      'FW_MGMT_TARGET_ROMLOADER is not accepted'
    );
  });

  test('maps Pro2 remote firmware-v1 components to Protocol V2 targets in installOrder', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
        targetsToUpdate: [
          'boot',
          'app_v1',
          'app_v2',
          'coprocessor',
          'se01',
          'se02',
          'se03',
          'se04',
        ],
      },
    });
    method.init();

    const binaries = new Map(
      [
        'bootloader',
        'applicationP1',
        'applicationP2',
        'coprocessor',
        'se01',
        'se02',
        'se03',
        'se04',
      ].map((key, index) => [
        `https://example.com/${key}.pp.bin`,
        new Uint8Array([index + 1]).buffer,
      ])
    );
    const getSysResourceBinarySpy = jest
      .spyOn(firmwareBinaryApi, 'getSysResourceBinary')
      .mockImplementation(url =>
        Promise.resolve({
          binary: binaries.get(url) ?? new Uint8Array([0]).buffer,
        })
      );
    const getFirmwareLatestReleaseSpy = jest
      .spyOn(DataManager, 'getFirmwareLatestRelease')
      .mockReturnValue({
        required: false,
        version: [1, 0, 0],
        url: 'https://example.com/applicationP1.pp.bin',
        bootloaderResource: 'https://example.com/bootloader.pp.bin',
        bootloaderVersion: [1, 0, 0],
        displayBootloaderVersion: [1, 0, 0],
        upgradeType: 'payload-package-set',
        installOrder: [
          'bootloader',
          'applicationP1',
          'applicationP2',
          'coprocessor',
          'se01',
          'se02',
          'se03',
          'se04',
        ],
        components: {
          bootloader: {
            target: 'BOOTLOADER',
            url: 'https://example.com/bootloader.pp.bin',
          },
          applicationP1: {
            target: 'APPLICATION_P1',
            url: 'https://example.com/applicationP1.pp.bin',
          },
          applicationP2: {
            target: 'APPLICATION_P2',
            url: 'https://example.com/applicationP2.pp.bin',
          },
          coprocessor: {
            target: 'COPROCESSOR',
            url: 'https://example.com/coprocessor.pp.bin',
          },
          se01: { target: 'SE01', url: 'https://example.com/se01.pp.bin' },
          se02: { target: 'SE02', url: 'https://example.com/se02.pp.bin' },
          se03: { target: 'SE03', url: 'https://example.com/se03.pp.bin' },
          se04: { target: 'SE04', url: 'https://example.com/se04.pp.bin' },
        },
        fingerprint: '',
        changelog: {
          'zh-CN': '',
          'en-US': '',
        },
      });

    const remoteBinaries = await (method as any).prepareRemoteProtocolV2Binaries('universal', {
      deviceType: 'pro2',
      firmwareVersion: '0.0.0',
    });

    expect(remoteBinaries.bootloaderBinary).toBe(
      binaries.get('https://example.com/bootloader.pp.bin')
    );
    expect(remoteBinaries.fwBinaryMap).toEqual([
      { fileName: 'application_p1.bin', binary: expect.anything(), targetId: 4 },
      { fileName: 'application_p2.bin', binary: expect.anything(), targetId: 5 },
      { fileName: 'coprocessor.bin', binary: expect.anything(), targetId: 6 },
      { fileName: 'se01.bin', binary: expect.anything(), targetId: 7 },
      { fileName: 'se02.bin', binary: expect.anything(), targetId: 8 },
      { fileName: 'se03.bin', binary: expect.anything(), targetId: 9 },
      { fileName: 'se04.bin', binary: expect.anything(), targetId: 10 },
    ]);
    expect(getSysResourceBinarySpy.mock.calls.map(call => call[0])).toEqual([
      'https://example.com/bootloader.pp.bin',
      'https://example.com/applicationP1.pp.bin',
      'https://example.com/applicationP2.pp.bin',
      'https://example.com/coprocessor.pp.bin',
      'https://example.com/se01.pp.bin',
      'https://example.com/se02.pp.bin',
      'https://example.com/se03.pp.bin',
      'https://example.com/se04.pp.bin',
    ]);

    getSysResourceBinarySpy.mockRestore();
    getFirmwareLatestReleaseSpy.mockRestore();
  });

  test('ignores an unsupported remote ROMLOADER component when installing selected targets', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
        targetsToUpdate: ['app_v1'],
      },
    });
    method.init();
    const applicationBinary = new Uint8Array([1]).buffer;
    const downloadRemoteComponent = jest.fn().mockResolvedValue({
      fileName: 'application_p1.bin',
      binary: applicationBinary,
      targetId: 4,
      kind: 'firmware',
    });
    (method as any).downloadRemoteProtocolV2Component = downloadRemoteComponent;
    const getFirmwareLatestReleaseSpy = jest
      .spyOn(DataManager, 'getFirmwareLatestRelease')
      .mockReturnValue({
        required: false,
        version: [1, 0, 0],
        url: '',
        installOrder: ['romloader', 'applicationP1'],
        components: {
          romloader: {
            target: 'ROMLOADER',
            url: 'https://example.com/romloader.bin',
          },
          applicationP1: {
            target: 'APPLICATION_P1',
            url: 'https://example.com/application-p1.bin',
          },
        },
        fingerprint: '',
        changelog: { 'zh-CN': '', 'en-US': '' },
      });

    const remoteBinaries = await (method as any).prepareRemoteProtocolV2Binaries('universal', {
      deviceType: 'pro2',
      firmwareVersion: '0.0.0',
    });

    expect(downloadRemoteComponent).toHaveBeenCalledTimes(1);
    expect(downloadRemoteComponent).toHaveBeenCalledWith(
      'applicationP1',
      expect.objectContaining({ target: 'APPLICATION_P1' })
    );
    expect(remoteBinaries.fwBinaryMap).toEqual([
      { fileName: 'application_p1.bin', binary: applicationBinary, targetId: 4 },
    ]);

    getFirmwareLatestReleaseSpy.mockRestore();
  });

  test('does not download Pro2 firmware components that App did not select', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
      },
    });
    method.init();

    const getSysResourceBinarySpy = jest
      .spyOn(firmwareBinaryApi, 'getSysResourceBinary')
      .mockResolvedValue({ binary: new Uint8Array([1]).buffer });
    const getFirmwareLatestReleaseSpy = jest
      .spyOn(DataManager, 'getFirmwareLatestRelease')
      .mockReturnValue({
        required: false,
        version: [1, 0, 0],
        url: 'https://example.com/applicationP1.pp.bin',
        bootloaderVersion: [1, 0, 0],
        upgradeType: 'payload-package-set',
        installOrder: ['bootloader', 'applicationP1', 'applicationP2'],
        components: {
          bootloader: {
            target: 'BOOTLOADER',
            url: 'https://example.com/bootloader.pp.bin',
          },
          applicationP1: {
            target: 'APPLICATION_P1',
            url: 'https://example.com/applicationP1.pp.bin',
          },
          applicationP2: {
            target: 'APPLICATION_P2',
            url: 'https://example.com/applicationP2.pp.bin',
          },
        },
        fingerprint: '',
        changelog: {
          'zh-CN': '',
          'en-US': '',
        },
      });

    const remoteBinaries = await (method as any).prepareRemoteProtocolV2Binaries('universal', {
      deviceType: 'pro2',
      firmwareVersion: '1.0.0',
      bootloaderVersion: '1.0.0',
      capabilities: [],
    });

    expect(remoteBinaries).toEqual({
      bootloaderBinary: null,
      fwBinaryMap: [],
      installItems: [],
    });
    expect(getSysResourceBinarySpy).not.toHaveBeenCalled();

    getSysResourceBinarySpy.mockRestore();
    getFirmwareLatestReleaseSpy.mockRestore();
  });

  test('uses Pro2 remote components when firmwareUpdateV4 has no explicit binaries', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
      },
    });
    method.init();
    (method as any).captureProtocolV2PhysicalIdentity = jest.fn().mockResolvedValue(undefined);

    const remoteBinaries = {
      bootloaderBinary: new Uint8Array([1]).buffer,
      fwBinaryMap: [
        {
          fileName: 'application_p1.bin',
          binary: new Uint8Array([2]).buffer,
          targetId: 3,
        },
      ],
    };

    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      features: { deviceType: 'pro2', firmwareVersion: '0.0.0', capabilities: [] },
    });
    (method as any).prepareRemoteProtocolV2Binaries = jest.fn().mockResolvedValue(remoteBinaries);
    (method as any).enterProtocolV2BootloaderMode = jest.fn().mockResolvedValue(true);
    (method as any).executeProtocolV2Update = jest.fn().mockResolvedValue(undefined);
    (method as any).exitProtocolV2BootloaderToNormal = jest.fn().mockResolvedValue(undefined);
    (method as any).waitForProtocolV2FinalFeatures = jest.fn().mockResolvedValue({
      bootloaderVersion: '1.0.0',
      bleVersion: '0.0.0',
      firmwareVersion: '1.0.0',
    });
    method.postTipMessage = jest.fn();

    await method.run();

    expect(forceReloadDataSpy).toHaveBeenCalledTimes(1);
    expect((method as any).prepareRemoteProtocolV2Binaries).toHaveBeenCalledTimes(1);
    expect((method as any).executeProtocolV2Update).toHaveBeenCalledWith({
      bootloaderBinary: remoteBinaries.bootloaderBinary,
      fwBinaryMap: remoteBinaries.fwBinaryMap,
    });
  });

  test('stops a remote update before reboot when the latest config cannot be refreshed', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
      },
    });
    method.init();
    (method as any).captureProtocolV2PhysicalIdentity = jest.fn().mockResolvedValue(undefined);
    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      features: { deviceType: 'pro2', firmwareVersion: '0.0.0', capabilities: [] },
    });
    forceReloadDataSpy.mockRejectedValue(new Error('latest config unavailable'));
    (method as any).prepareRemoteProtocolV2Binaries = jest.fn();
    (method as any).enterProtocolV2BootloaderMode = jest.fn();
    method.postTipMessage = jest.fn();

    await expect(method.run()).rejects.toThrow('latest config unavailable');

    expect((method as any).prepareRemoteProtocolV2Binaries).not.toHaveBeenCalled();
    expect((method as any).enterProtocolV2BootloaderMode).not.toHaveBeenCalled();
  });

  test('keeps explicit Protocol V2 binaries isolated from remote component auto-fill', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
        coprocessorBinary: new Uint8Array([1]).buffer,
      },
    });
    method.init();
    (method as any).captureProtocolV2PhysicalIdentity = jest.fn().mockResolvedValue(undefined);

    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      features: { deviceType: 'pro2', firmwareVersion: '0.0.0', capabilities: [] },
    });
    (method as any).prepareRemoteProtocolV2Binaries = jest.fn();
    (method as any).enterProtocolV2BootloaderMode = jest.fn().mockResolvedValue(true);
    (method as any).executeProtocolV2Update = jest.fn().mockResolvedValue(undefined);
    (method as any).exitProtocolV2BootloaderToNormal = jest.fn().mockResolvedValue(undefined);
    (method as any).waitForProtocolV2FinalFeatures = jest.fn().mockResolvedValue({
      bootloaderVersion: '1.0.0',
      bleVersion: '0.0.0',
      firmwareVersion: '1.0.0',
    });
    method.postTipMessage = jest.fn();

    await method.run();

    expect((method as any).prepareRemoteProtocolV2Binaries).not.toHaveBeenCalled();
    expect((method as any).executeProtocolV2Update).toHaveBeenCalledWith({
      bootloaderBinary: null,
      fwBinaryMap: [{ fileName: 'coprocessor.bin', binary: expect.anything(), targetId: 6 }],
    });
  });

  test('treats manual resource bundles as explicit payload without remote firmware auto-fill', async () => {
    const resourceBundle = new Uint8Array([1, 2, 3]).buffer;
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
        resourceBundleFiles: [
          {
            binary: resourceBundle,
            devicePath: '  VOL0:/resource/images/images.okpkg  ',
          },
        ],
      },
    });
    method.init();
    (method as any).captureProtocolV2PhysicalIdentity = jest.fn().mockResolvedValue(undefined);

    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      features: { deviceType: 'pro2', firmwareVersion: '0.0.0', capabilities: [] },
    });
    (method as any).prepareRemoteProtocolV2Binaries = jest.fn();
    (method as any).enterProtocolV2BootloaderMode = jest.fn().mockResolvedValue(true);
    (method as any).executeProtocolV2Update = jest.fn().mockResolvedValue(undefined);
    (method as any).exitProtocolV2BootloaderToNormal = jest.fn().mockResolvedValue(undefined);
    (method as any).waitForProtocolV2FinalFeatures = jest.fn().mockResolvedValue({
      bootloaderVersion: '1.0.0',
      bleVersion: '0.0.0',
      firmwareVersion: '1.0.0',
    });
    method.postTipMessage = jest.fn();

    await method.run();

    expect((method as any).prepareRemoteProtocolV2Binaries).not.toHaveBeenCalled();
    expect((method as any).executeProtocolV2Update).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceBundles: [
          {
            name: 'images.okpkg',
            binary: resourceBundle,
            devicePath: 'vol0:/resource/images/images.okpkg',
          },
        ],
      })
    );
  });

  test('rejects manual RESC bundle paths before bootloader entry', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
        resourceBundleFiles: [
          {
            binary: new Uint8Array([1, 2, 3]).buffer,
            devicePath: 'vol2:/resource/images/images.okpkg',
          },
        ],
      },
    });
    method.init();
    (method as any).captureProtocolV2PhysicalIdentity = jest.fn().mockResolvedValue(undefined);

    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      features: { deviceType: 'pro2', firmwareVersion: '0.0.0', capabilities: [] },
    });
    (method as any).prepareRemoteProtocolV2Binaries = jest.fn();
    (method as any).enterProtocolV2BootloaderMode = jest.fn();
    method.postTipMessage = jest.fn();

    await expect(method.run()).rejects.toThrow('resourceBundleFiles[0].devicePath');
    expect((method as any).prepareRemoteProtocolV2Binaries).not.toHaveBeenCalled();
    expect((method as any).enterProtocolV2BootloaderMode).not.toHaveBeenCalled();
  });

  test('syncs resource bundles without sending a firmware install request', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });

    method.postTipMessage = jest.fn();
    method.postProgressMessage = jest.fn();
    (method as any).protocolV2CommonUpdateProcess = jest.fn().mockResolvedValue(3);
    (method as any).protocolV2StartFirmwareUpdate = jest.fn();
    (method as any).waitForProtocolV2FirmwareUpdateComplete = jest.fn();

    await (method as any).executeProtocolV2Update({
      resourceBundles: [
        {
          name: 'images.okpkg',
          binary: new Uint8Array([1, 2, 3]).buffer,
          devicePath: 'vol0:/resource/images/images.okpkg',
        },
      ],
      bootloaderBinary: null,
      fwBinaryMap: [],
    });

    expect((method as any).protocolV2CommonUpdateProcess).toHaveBeenCalledTimes(1);
    expect((method as any).protocolV2StartFirmwareUpdate).not.toHaveBeenCalled();
    expect((method as any).waitForProtocolV2FirmwareUpdateComplete).not.toHaveBeenCalled();
  });

  test('uses absolute processed_byte offsets and disables append for firmware file writes', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn(
      (
        _name: string,
        _resType: string,
        params: { file: { offset: number; data: { byteLength: number } } }
      ) =>
        Promise.resolve({
          type: 'FilesystemFile',
          message: {
            processed_byte: params.file.offset + params.file.data.byteLength,
          },
        })
    );

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    method.postProgressMessage = jest.fn();

    await (method as any).protocolV2CommonUpdateProcess({
      payload: new Uint8Array(4097).buffer,
      filePath: 'vol1:firmware.bin',
      processedSize: 0,
      totalSize: 4097,
    });

    const writePayloads = typedCall.mock.calls.map(call => call[2]);
    expect(writePayloads.map(payload => payload.file.offset)).toEqual([0, 4000]);
    expect(writePayloads.map(payload => payload.file.data.byteLength)).toEqual([4000, 97]);
    expect(writePayloads.map(payload => payload.overwrite)).toEqual([true, false]);
    expect(writePayloads.every(payload => payload.append === false)).toBe(true);
    expect(writePayloads.map(payload => payload.ui_percentage)).toEqual([0, 100]);
  });

  test('restarts the whole file from offset zero after an ambiguous chunk write failure', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const writeOffsets: number[] = [];
    let failedSecondChunk = false;
    const typedCall = jest.fn(
      (
        _name: string,
        _resType: string,
        params: { file: { offset: number; data: { byteLength: number } } }
      ) => {
        writeOffsets.push(params.file.offset);
        if (params.file.offset === 4000 && !failedSecondChunk) {
          failedSecondChunk = true;
          return Promise.reject(new Error('response lost after device write'));
        }
        return Promise.resolve({
          type: 'FilesystemFile',
          message: {
            processed_byte: params.file.offset + params.file.data.byteLength,
          },
        });
      }
    );
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((
      callback: (...args: any[]) => void
    ) => {
      callback();
      return 0 as any;
    }) as typeof setTimeout);

    const initialize = jest.fn().mockResolvedValue(undefined);
    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
      initialize,
    });
    (method as any).reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
    (method as any).verifyProtocolV2ReconnectIdentity = jest.fn().mockResolvedValue({
      hw: { serial_no: 'PRO2-PHYSICAL-1' },
    });
    method.postProgressMessage = jest.fn();

    try {
      await (method as any).protocolV2CommonUpdateProcess({
        payload: new Uint8Array(8001).buffer,
        filePath: 'vol0:/firmware.bin',
        processedSize: 0,
        totalSize: 8001,
      });
    } finally {
      setTimeoutSpy.mockRestore();
    }

    expect(writeOffsets).toEqual([0, 4000, 0, 4000, 8000]);
    expect((method as any).reconnectProtocolV2Device).toHaveBeenCalledTimes(1);
    expect((method as any).verifyProtocolV2ReconnectIdentity).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  test('rejects a chunk-relative processed_byte during firmware staging', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn((name: string, _resType: string | string[], params: any) => {
      if (name === 'FilesystemFileWrite') {
        return Promise.resolve({
          type: 'FilesystemFile',
          message: {
            processed_byte: params.file.data.byteLength,
          },
        });
      }
      return Promise.reject(new Error(`unexpected call ${name}`));
    });

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    method.postProgressMessage = jest.fn();
    method.postTipMessage = jest.fn();

    await expect(
      (method as any).protocolV2WriteWholeFile({
        payload: new Uint8Array(4097).buffer,
        filePath: 'vol0:/firmware.bin',
        processedSize: 0,
        totalSize: 4097,
      })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.EmmcFileWriteFirmwareError });
    expect(typedCall).toHaveBeenCalledTimes(2);
  });

  test('caps native BLE firmware upload chunks below the WebUSB limit', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn(
      (
        _name: string,
        _resType: string,
        params: { file: { offset: number; data: { byteLength: number } } }
      ) =>
        Promise.resolve({
          type: 'FilesystemFile',
          message: {
            processed_byte: params.file.offset + params.file.data.byteLength,
          },
        })
    );

    (method as any).params = {
      platform: 'native',
      chunkSize: 4096,
    };
    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    method.postProgressMessage = jest.fn();

    await (method as any).protocolV2CommonUpdateProcess({
      payload: new Uint8Array(1801).buffer,
      filePath: 'vol1:ble-firmware.bin',
      processedSize: 0,
      totalSize: 1801,
    });

    const writePayloads = typedCall.mock.calls.map(call => call[2]);
    expect(writePayloads.map(payload => payload.file.offset)).toEqual([0, 1800]);
    expect(writePayloads.map(payload => payload.file.data.byteLength)).toEqual([1800, 1]);
    expect(writePayloads.map(payload => payload.ui_percentage)).toEqual([0, 100]);
  });

  test('ends device confirmation and starts install progress only after Protocol V2 ACK', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    let resolveRequest: ((value: unknown) => void) | undefined;
    const typedCall = jest.fn().mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRequest = resolve;
        })
    );

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    method.postProgressMessage = jest.fn();
    method.postTipMessage = jest.fn();

    const startPromise = (method as any).protocolV2StartFirmwareUpdate({
      targets: [{ target_id: 4, path: 'vol1:firmware.bin' }],
    });
    await Promise.resolve();

    expect(typedCall.mock.calls[0][1]).toBe('Success');
    expect(typedCall.mock.calls[0][3]).toEqual(expect.objectContaining({ timeoutMs: 180_000 }));
    expect(method.postTipMessage).not.toHaveBeenCalled();
    expect(method.postProgressMessage).not.toHaveBeenCalled();

    resolveRequest?.({ type: 'Success', message: { message: 'ok' } });
    await startPromise;
    expect(method.postTipMessage).toHaveBeenCalledWith('FirmwareUpdating');
    expect(method.postProgressMessage).toHaveBeenCalledWith(0, 'installingFirmware');
    expect(method.postTipMessage).toHaveBeenCalledTimes(1);
  });

  test('requests only a Success ACK for Protocol V2 firmware install', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockResolvedValue({
      type: 'Success',
      message: { message: 'accepted' },
    });

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    method.postProgressMessage = jest.fn();
    method.postTipMessage = jest.fn();

    await (method as any).protocolV2StartFirmwareUpdate({
      targets: [{ target_id: 4, path: 'vol1:firmware.bin' }],
    });

    expect(typedCall.mock.calls[0][1]).toBe('Success');
    expect(method.postTipMessage).toHaveBeenCalledWith('FirmwareUpdating');
  });
});

describe('Protocol V2 firmware update method', () => {
  test('returns DeviceFirmwareUpdateStatus from low-level update trigger', async () => {
    const method = new DeviceFirmwareUpdate({
      id: 1,
      payload: {
        method: 'deviceFirmwareUpdate',
        targetId: 4,
        path: 'vol0:firmware.bin',
      },
    });
    method.init();

    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceFirmwareUpdateStatus',
      message: { records: [{ target_id: 4, status: 1 }] },
    });

    (method as any).device = stubDevice({
      commands: { typedCall },
    });

    await expect(method.run()).resolves.toEqual({
      records: [{ target_id: 4, status: 1 }],
    });
    expect(typedCall.mock.calls[0][1]).toEqual(['Success', 'DeviceFirmwareUpdateStatus']);
    expect(typedCall.mock.calls[0][2]).toEqual({
      targets: [{ target_id: 4, path: 'vol0:firmware.bin' }],
    });
  });

  test('treats WebUSB open NotFoundError from low-level update trigger as expected disconnect', async () => {
    const method = new DeviceFirmwareUpdate({
      id: 1,
      payload: {
        method: 'deviceFirmwareUpdate',
        targetId: 4,
        path: 'vol0:firmware.bin',
      },
    });
    method.init();

    const typedCall = jest
      .fn()
      .mockRejectedValue(
        new DOMException(
          "Failed to execute 'open' on 'USBDevice': The device was disconnected",
          'NotFoundError'
        )
      );

    (method as any).device = stubDevice({
      commands: { typedCall },
    });

    await expect(method.run()).resolves.toEqual({
      message: 'Device firmware update started',
    });
  });

  test('does not report a generic USB transfer failure as a started firmware update', async () => {
    const method = new DeviceFirmwareUpdate({
      id: 1,
      payload: {
        method: 'deviceFirmwareUpdate',
        targetId: 4,
        path: 'vol0:firmware.bin',
      },
    });
    method.init();
    const error = new Error(
      "Failed to execute 'transferOut' on 'USBDevice': A transfer error has occurred"
    );
    (method as any).device = stubDevice({
      commands: { typedCall: jest.fn().mockRejectedValue(error) },
    });

    await expect(method.run()).rejects.toBe(error);
  });

  test('rejects missing or invalid firmware targets before transport call', async () => {
    const typedCall = jest.fn();
    const method = new DeviceFirmwareUpdate({
      id: 1,
      payload: {
        method: 'deviceFirmwareUpdate',
        target_id: -1,
        path: 'vol0:firmware.bin',
      },
    });
    method.init();
    (method as any).device = stubDevice({
      commands: { typedCall },
    });

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });
    expect(typedCall).not.toHaveBeenCalled();
  });

  test.each([0, 2])(
    'rejects firmware target %s because the Pro2 bootloader cannot install it',
    async targetId => {
      const typedCall = jest.fn();
      const method = new DeviceFirmwareUpdate({
        id: 1,
        payload: {
          method: 'deviceFirmwareUpdate',
          targetId,
          path: 'vol0:firmware.bin',
        },
      });
      method.init();
      (method as any).device = stubDevice({
        commands: { typedCall },
      });

      await expect(method.run()).rejects.toMatchObject({
        errorCode: HardwareErrorCode.CallMethodInvalidParameter,
      });
      expect(typedCall).not.toHaveBeenCalled();
    }
  );

  test('accepts targetId alias inside firmware targets', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const method = new DeviceFirmwareUpdate({
      id: 1,
      payload: {
        method: 'deviceFirmwareUpdate',
        targets: [
          {
            target_id: undefined,
            targetId: 1,
            path: 'vol0:resource.crate.okpkg',
          },
        ],
      } as any,
    });
    method.init();
    (method as any).device = stubDevice({
      commands: { typedCall },
    });

    await method.run();
    expect(typedCall.mock.calls[0][2]).toEqual({
      targets: [{ target_id: 1, path: 'vol0:resource.crate.okpkg' }],
    });
  });

  test('accepts firmware target enum names from low-level update params', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const method = new DeviceFirmwareUpdate({
      id: 1,
      payload: {
        method: 'deviceFirmwareUpdate',
        targetId: 'FW_MGMT_TARGET_APPLICATION_P1',
        path: 'vol0:application_p1.bin',
      },
    });
    method.init();
    (method as any).device = stubDevice({
      commands: { typedCall },
    });

    await method.run();
    expect(typedCall.mock.calls[0][2]).toEqual({
      targets: [{ target_id: 4, path: 'vol0:application_p1.bin' }],
    });
  });

  test('passes firmware update status fields through to Protocol V2', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        records: [{ target_id: 4, status: 2, payload_version: 1, path: 'vol1:application_p1.bin' }],
      },
    });
    const method = new DeviceGetFirmwareUpdateStatus({
      id: 1,
      payload: {
        method: 'deviceGetFirmwareUpdateStatus',
        fields: {
          status: true,
          payload_version: true,
          path: true,
        },
      },
    });
    method.init();
    (method as any).device = stubDevice({
      commands: { typedCall },
    });

    await expect(method.run()).resolves.toEqual({
      records: [{ target_id: 4, status: 2, payload_version: 1, path: 'vol1:application_p1.bin' }],
    });
    expect(typedCall).toHaveBeenCalledWith(
      'DeviceFirmwareUpdateStatusGet',
      'DeviceFirmwareUpdateStatus',
      {
        fields: {
          status: true,
          payload_version: true,
          path: true,
        },
      }
    );
  });
});

describe('Protocol V2 firmware reconnect identity', () => {
  test('rejects a different physical serial before firmware transfer resumes', () => {
    expect(() => assertProtocolV2ReconnectIdentity('expected-serial', 'other-serial')).toThrow(
      'identity mismatch'
    );
    expect(() =>
      assertProtocolV2ReconnectIdentity('expected-serial', 'expected-serial')
    ).not.toThrow();
  });

  test('fails closed when the physical serial is unavailable', () => {
    expect(() => assertProtocolV2ReconnectIdentity('expected-serial', undefined)).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.DeviceNotFound })
    );
    expect(() => assertProtocolV2ReconnectIdentity(undefined, 'actual-serial')).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.DeviceNotFound })
    );
    expect(() => assertProtocolV2ReconnectIdentity(undefined, undefined)).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.DeviceNotFound })
    );
  });

  test('captures physical identity from active DeviceInfo instead of wallet deviceId', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceInfo',
      message: {
        protocol_version: 1,
        hw: { serial_no: 'PRO2-PHYSICAL-1' },
      },
    });
    (method as any).device = stubDevice({
      features: { deviceId: 'wallet-derived-id' },
      getCommands: () => ({ typedCall }),
    });

    await (method as any).captureProtocolV2PhysicalIdentity();

    expect((method as any).protocolV2ExpectedSerialNumber).toBe('PRO2-PHYSICAL-1');
    expect(typedCall).toHaveBeenCalledWith(
      'DeviceInfoGet',
      'DeviceInfo',
      expect.objectContaining({ targets: expect.objectContaining({ hw: true }) }),
      { timeoutMs: 5000 }
    );
  });

  test('rejects firmware update startup when DeviceInfo has no physical serial', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: { method: 'firmwareUpdateV4' },
    });
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceInfo',
      message: { protocol_version: 1, hw: {} },
    });
    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });

    await expect((method as any).captureProtocolV2PhysicalIdentity()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotFound,
    });
  });

  test('uses ResourceInventory instead of host-side FileRead for resource comparison', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
        targetsToUpdate: ['resource'],
      },
    });
    method.init();
    const stable = ['images', 'animation', 'wallpaper', 'translations', 'roobert', 'noto'].map(
      (type, index) => ({
        type,
        url: `https://example.com/${type}.okpkg`,
        size: index + 1,
        fileHash: 'a'.repeat(64),
        headerHash: index.toString(16).padStart(128, '0'),
      })
    );
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        items: stable.map(item => ({
          type: item.type.toUpperCase(),
          size: item.size,
          header_hash: item.headerHash,
        })),
      },
    });
    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    const resourcesSpy = jest
      .spyOn(DataManager, 'getProtocolV2Resources')
      .mockReturnValue(stable as any);
    (method as any).downloadProtocolV2Resource = jest.fn();

    await expect((method as any).prepareProtocolV2ResourceBundles(false)).resolves.toEqual([]);
    expect(typedCall).toHaveBeenCalledWith(
      'ResourceInventoryGet',
      'ResourceInventory',
      {},
      { timeoutMs: 5000 }
    );
    expect(typedCall.mock.calls.some(call => call[0] === 'FilesystemFileRead')).toBe(false);
    expect((method as any).downloadProtocolV2Resource).not.toHaveBeenCalled();
    resourcesSpy.mockRestore();
  });

  test('downloads only changed resources in Application mode', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: { method: 'firmwareUpdateV4', platform: 'web', targetsToUpdate: ['resource'] },
    });
    method.init();
    const stable = ['images', 'animation', 'wallpaper', 'translations', 'roobert', 'noto'].map(
      (type, index) => ({
        type,
        url: `https://example.com/${type}.okpkg`,
        size: index + 1,
        fileHash: 'a'.repeat(64),
        headerHash: index.toString(16).padStart(128, '0'),
      })
    );
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        items: stable.slice(1).map(item => ({
          type: item.type.toUpperCase(),
          size: item.size,
          header_hash: item.headerHash,
        })),
      },
    });
    (method as any).device = stubDevice({ getCommands: () => ({ typedCall }) });
    const resourcesSpy = jest
      .spyOn(DataManager, 'getProtocolV2Resources')
      .mockReturnValue(stable as any);
    (method as any).downloadProtocolV2Resource = jest.fn(resource =>
      Promise.resolve({
        name: `${resource.type}.okpkg`,
        binary: new ArrayBuffer(resource.size),
        devicePath: `vol0:/${resource.type}.okpkg`,
      })
    );

    const bundles = await (method as any).prepareProtocolV2ResourceBundles(false);

    expect(bundles).toHaveLength(1);
    expect((method as any).downloadProtocolV2Resource).toHaveBeenCalledWith(stable[0]);
    resourcesSpy.mockRestore();
  });

  test('downloads all six resources in Bootloader recovery without inventory RPC', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: { method: 'firmwareUpdateV4', platform: 'web', targetsToUpdate: ['resource'] },
    });
    method.init();
    const stable = ['images', 'animation', 'wallpaper', 'translations', 'roobert', 'noto'].map(
      (type, index) => ({
        type,
        url: `https://example.com/${type}.okpkg`,
        size: index + 1,
        fileHash: 'a'.repeat(64),
        headerHash: index.toString(16).padStart(128, '0'),
      })
    );
    const typedCall = jest.fn();
    (method as any).device = stubDevice({ getCommands: () => ({ typedCall }) });
    const resourcesSpy = jest
      .spyOn(DataManager, 'getProtocolV2Resources')
      .mockReturnValue(stable as any);
    (method as any).downloadProtocolV2Resource = jest.fn(resource =>
      Promise.resolve({
        name: `${resource.type}.okpkg`,
        binary: new ArrayBuffer(resource.size),
        devicePath: `vol0:/${resource.type}.okpkg`,
      })
    );

    const bundles = await (method as any).prepareProtocolV2ResourceBundles(true);

    expect(bundles).toHaveLength(6);
    expect(typedCall).not.toHaveBeenCalled();
    expect((method as any).downloadProtocolV2Resource).toHaveBeenCalledTimes(6);
    resourcesSpy.mockRestore();
  });
});

describe('Protocol V2 explicit USB device selection', () => {
  beforeEach(() => {
    DevicePool.resetState();
    jest.restoreAllMocks();
  });

  test('only initializes the descriptor matching an explicit connectId', async () => {
    const zeroDescriptor = {
      path: '000000000000000000000000',
      id: '000000000000000000000000',
    } as any;
    const pro2Descriptor = {
      path: 'PR9999999999',
      id: 'PR9999999999',
    } as any;
    const pro2Device = {
      getConnectId: () => 'PR9999999999',
      originalDescriptor: pro2Descriptor,
      updateDescriptor: jest.fn(),
    } as any;
    const zeroDevice = {
      getConnectId: () => '000000000000000000000000',
      originalDescriptor: zeroDescriptor,
      updateDescriptor: jest.fn(),
    } as any;

    const createDevice = jest
      .spyOn(DevicePool as any, '_createDevice')
      .mockImplementation((descriptor: { path: string }) =>
        Promise.resolve(descriptor.path === pro2Descriptor.path ? pro2Device : zeroDevice)
      );
    const checkDevicePool = jest
      .spyOn(DevicePool as any, '_checkDevicePool')
      .mockResolvedValue(undefined);

    const result = await DevicePool.getDevices([zeroDescriptor, pro2Descriptor], 'PR9999999999');

    expect(createDevice).toHaveBeenCalledTimes(1);
    expect(createDevice).toHaveBeenCalledWith(pro2Descriptor, undefined);
    expect(checkDevicePool).toHaveBeenCalledWith(undefined, 'PR9999999999');
    expect(result.deviceList).toEqual([pro2Device]);
    expect(result.devices).toEqual({ PR9999999999: pro2Device });
  });
});

describe('Protocol V2 reboot methods', () => {
  test('sends DeviceReboot from deviceReboot', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: { message: 'ok' } });
    const method = new DeviceReboot({
      id: 1,
      payload: {
        method: 'deviceReboot',
        rebootType: 2,
      },
    });
    method.init();
    const device = stubDevice({ commands: { typedCall } });
    (method as any).device = device;

    await method.run();

    expect(typedCall).toHaveBeenCalledWith('DeviceReboot', 'Success', {
      reboot_type: 2,
    });
    expect(device.markProtocolV2Reboot).toHaveBeenCalledWith(DeviceRebootType.Bootloader);
  });
});

describe('Protocol V2 protected method execution', () => {
  const deviceLockedError = () =>
    Object.assign(new Error('Device locked'), {
      errorCode: HardwareErrorCode.DeviceLocked,
    });

  test('does not replay SDK methods unless they are explicitly classified as retry-safe', () => {
    class TestBusinessMethod extends BaseMethod {
      init() {}

      run() {
        return Promise.resolve({});
      }
    }

    const method = new TestBusinessMethod({
      id: 1,
      payload: { method: 'testBusinessMethod' },
    } as any);

    expect(method.unlockPolicy).toBe('none');
  });

  test.each([
    ['deviceLock', DeviceLock],
    ['deviceUnlock', DeviceUnlock],
    ['deviceCancel', DeviceCancel],
  ])('does not auto-retry the %s control method', (_name, MethodClass) => {
    const method = new MethodClass({
      id: 1,
      payload: { method: _name },
    } as any);
    method.init();

    expect(method.unlockPolicy).toBe('none');
  });

  test('uses the same label interaction for the compatible deviceSettings entry point', () => {
    const method = new DeviceSettings({
      id: 2,
      payload: { method: 'deviceSettings', label: 'My Pro 2' },
    });

    method.init();

    expect(method.protocolV2UiInteraction).toEqual({
      request: 'button',
      source: 'method-lifecycle',
      reason: 'device-management',
      completion: 'operation-completed',
      deviceOnly: true,
      operation: 'change-label',
    });
  });

  test.each([
    ['deviceInfoGet', DeviceInfoGet],
    ['deviceStatusGet', DeviceStatusGet],
  ])('does not auto-unlock the read-only %s method', (_name, MethodClass) => {
    const method = new MethodClass({
      id: 1,
      payload: { method: _name },
    } as any);
    method.init();

    expect(method.unlockPolicy).toBe('none');
  });

  test('checks fresh status for a wallet business method without a name allowlist', async () => {
    const calls: string[] = [];
    const features = { unlocked: true };
    const method = {
      name: 'confluxSignMessageCIP23',
      unlockPolicy: 'none',
      useDevicePassphraseState: true,
      protocolV2UiInteraction: { reason: 'address-confirmation' },
      run: jest.fn(() => {
        calls.push('run');
        return Promise.resolve({ address: '0x1' });
      }),
    };
    const device = {
      features,
      commands: {
        typedCall: jest.fn(() => {
          calls.push('status');
          return Promise.resolve({ message: { unlocked: true } });
        }),
      },
      isProtocolV2: () => true,
      isBootloader: () => false,
      isRomloader: () => false,
      updateProtocolV2Status: jest.fn((status: { unlocked?: boolean }) => {
        features.unlocked = status.unlocked === true;
        return features;
      }),
      unlockDevice: jest.fn(),
    };
    const uiCoordinator = {
      enterMethodInteraction: jest.fn(() => calls.push('method-prompt')),
      enterUnlockInteraction: jest.fn(),
    };

    await expect(
      runMethodWithUnlockPolicy(method as any, device as any, {
        uiCoordinator: uiCoordinator as any,
      })
    ).resolves.toEqual({ address: '0x1' });

    expect(calls).toEqual(['status', 'method-prompt', 'run']);
    expect(device.commands.typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(method.run).toHaveBeenCalledTimes(1);
  });

  test('validates the fresh device identity before starting unlock', async () => {
    const calls: string[] = [];
    const identityError = new Error('Unexpected device');
    const method = {
      name: 'evmSignMessage',
      unlockPolicy: 'none',
      useDevicePassphraseState: true,
      run: jest.fn(),
    };
    const features = { unlocked: false };
    const device = {
      features,
      commands: {
        typedCall: jest.fn(() => {
          calls.push('status');
          return Promise.resolve({ message: { unlocked: false } });
        }),
      },
      isProtocolV2: () => true,
      isBootloader: () => false,
      isRomloader: () => false,
      updateProtocolV2Status: jest.fn(() => features),
      unlockDevice: jest.fn(),
    };

    await expect(
      runMethodWithUnlockPolicy(method as any, device as any, {
        afterStatusBeforeUnlock: () => {
          calls.push('identity');
          throw identityError;
        },
      })
    ).rejects.toBe(identityError);

    expect(calls).toEqual(['status', 'identity']);
    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(method.run).not.toHaveBeenCalled();
  });

  test('unlocks before business and never replays the callback', async () => {
    const calls: string[] = [];
    const features = { unlocked: true };
    const method = {
      name: 'evmSignMessage',
      unlockPolicy: 'unlock-before-run',
      protocolV2UiInteraction: { reason: 'signing-confirmation' },
      run: jest.fn(() => {
        calls.push('run');
        return Promise.resolve({ signature: 'signed' });
      }),
    };
    const device = {
      features,
      commands: {
        typedCall: jest.fn(() => {
          calls.push('status');
          return Promise.resolve({ message: { unlocked: false } });
        }),
      },
      isProtocolV2: () => true,
      isBootloader: () => false,
      isRomloader: () => false,
      updateProtocolV2Status: jest.fn((status: { unlocked?: boolean }) => {
        features.unlocked = status.unlocked === true;
        return features;
      }),
      unlockDevice: jest.fn(() => {
        calls.push('unlock');
        features.unlocked = true;
        return Promise.resolve(features);
      }),
    };
    const uiCoordinator = {
      enterMethodInteraction: jest.fn(() => calls.push('method-prompt')),
      enterUnlockInteraction: jest.fn(() => {
        calls.push('unlock-prompt');
        return undefined;
      }),
    };

    await expect(
      runMethodWithUnlockPolicy(method as any, device as any, {
        uiCoordinator: uiCoordinator as any,
        prepare: () => {
          calls.push('wallet-session');
          return Promise.resolve();
        },
      })
    ).resolves.toEqual({ signature: 'signed' });

    expect(calls).toEqual([
      'status',
      'unlock-prompt',
      'unlock',
      'wallet-session',
      'method-prompt',
      'run',
    ]);
    expect(device.unlockDevice).toHaveBeenCalledTimes(1);
    expect(method.run).toHaveBeenCalledTimes(1);
  });

  test('fails closed when fresh status does not explicitly report unlocked state', async () => {
    const method = {
      name: 'evmGetAddress',
      unlockPolicy: 'unlock-before-run',
      run: jest.fn(),
    };
    const device = {
      features: { unlocked: undefined },
      commands: { typedCall: jest.fn().mockResolvedValue({ message: {} }) },
      isProtocolV2: () => true,
      isBootloader: () => false,
      isRomloader: () => false,
      updateProtocolV2Status: jest.fn(() => ({ unlocked: undefined })),
      unlockDevice: jest.fn(),
    };

    await expect(runMethodWithUnlockPolicy(method as any, device as any)).rejects.toMatchObject({
      errorCode: HardwareErrorCode.RuntimeError,
    });
    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(method.run).not.toHaveBeenCalled();
  });

  test('returns a business DeviceLocked error without unlocking or replaying', async () => {
    const error = deviceLockedError();
    const method = {
      name: 'evmSignMessage',
      unlockPolicy: 'unlock-before-run',
      run: jest.fn().mockRejectedValue(error),
    };
    const features = { unlocked: true };
    const device = {
      features,
      commands: { typedCall: jest.fn().mockResolvedValue({ message: { unlocked: true } }) },
      isProtocolV2: () => true,
      isBootloader: () => false,
      isRomloader: () => false,
      updateProtocolV2Status: jest.fn(() => features),
      unlockDevice: jest.fn(),
    };

    await expect(runMethodWithUnlockPolicy(method as any, device as any)).rejects.toBe(error);
    expect(device.unlockDevice).not.toHaveBeenCalled();
    expect(method.run).toHaveBeenCalledTimes(1);
  });

  test('reuses one lightweight preflight context across nested protected methods', async () => {
    const features = { unlocked: true };
    const context = createProtocolV2UnlockContext();
    const firstMethod = {
      name: 'allNetworkGetAddress',
      unlockPolicy: 'unlock-before-run',
      run: jest.fn().mockResolvedValue({ root: true }),
    };
    const nestedMethod = {
      name: 'evmGetAddress',
      unlockPolicy: 'unlock-before-run',
      run: jest.fn().mockResolvedValue({ address: '0x1' }),
    };
    const device = {
      features,
      commands: { typedCall: jest.fn().mockResolvedValue({ message: { unlocked: true } }) },
      isProtocolV2: () => true,
      isBootloader: () => false,
      isRomloader: () => false,
      updateProtocolV2Status: jest.fn(() => features),
      unlockDevice: jest.fn(),
    };

    await runMethodWithUnlockPolicy(firstMethod as any, device as any, { context });
    await runMethodWithUnlockPolicy(nestedMethod as any, device as any, { context });

    expect(device.commands.typedCall).toHaveBeenCalledTimes(1);
    expect(firstMethod.run).toHaveBeenCalledTimes(1);
    expect(nestedMethod.run).toHaveBeenCalledTimes(1);
  });

  test.each(['bootloader', 'romloader'] as const)(
    'skips DeviceStatus and unlock in Protocol V2 %s mode',
    async mode => {
      const method = {
        name: 'firmwareUpdateV4',
        unlockPolicy: 'unlock-before-run',
        run: jest.fn().mockResolvedValue({ message: 'updating' }),
      };
      const device = {
        features: { unlocked: false },
        commands: { typedCall: jest.fn() },
        isProtocolV2: () => true,
        isBootloader: () => mode === 'bootloader',
        isRomloader: () => mode === 'romloader',
        unlockDevice: jest.fn(),
      };

      await expect(runMethodWithUnlockPolicy(method as any, device as any)).resolves.toEqual({
        message: 'updating',
      });
      expect(device.commands.typedCall).not.toHaveBeenCalled();
      expect(device.unlockDevice).not.toHaveBeenCalled();
      expect(method.run).toHaveBeenCalledTimes(1);
    }
  );

  test('keeps Protocol V1 and lock-free methods outside the preflight path', async () => {
    for (const [isProtocolV2, unlockPolicy] of [
      [false, 'unlock-before-run'],
      [true, 'none'],
    ] as const) {
      const method = {
        unlockPolicy,
        useDevicePassphraseState: false,
        run: jest.fn().mockResolvedValue({ message: 'ok' }),
      };
      const device = {
        commands: { typedCall: jest.fn() },
        isProtocolV2: () => isProtocolV2,
        unlockDevice: jest.fn(),
      };

      await expect(runMethodWithUnlockPolicy(method as any, device as any)).resolves.toEqual({
        message: 'ok',
      });
      expect(device.commands.typedCall).not.toHaveBeenCalled();
      expect(device.unlockDevice).not.toHaveBeenCalled();
      expect(method.run).toHaveBeenCalledTimes(1);
    }
  });
});

describe('Protocol V2 current low-level methods', () => {
  test('routes device wipe to the Pro2 reset page until the operation completes', async () => {
    const v1TypedCall = jest.fn().mockResolvedValue({ message: { message: 'wiped' } });
    const v1InvalidateAfterWipe = jest.fn();
    const v1Method = new DeviceWipe({ id: 1, payload: { method: 'deviceWipe' } });
    v1Method.init();
    (v1Method as any).device = stubDevice({
      isProtocolV2: () => false,
      commands: { typedCall: v1TypedCall },
      invalidateAfterWipe: v1InvalidateAfterWipe,
    });

    await v1Method.run();
    expect(v1TypedCall).toHaveBeenCalledWith('WipeDevice', 'Success');
    expect(v1InvalidateAfterWipe).toHaveBeenCalledTimes(1);

    const v2TypedCall = jest.fn().mockResolvedValue({ message: { message: 'accepted' } });
    const v2InvalidateAfterWipe = jest.fn();
    const v2Method = new DeviceWipe({ id: 2, payload: { method: 'deviceWipe' } });
    v2Method.init();
    (v2Method as any).device = stubDevice({
      isProtocolV2: () => true,
      commands: { typedCall: v2TypedCall },
      invalidateAfterWipe: v2InvalidateAfterWipe,
    });

    await expect(v2Method.run()).resolves.toEqual({ message: 'accepted' });
    expect(v2Method.unlockPolicy).toBe('unlock-before-run');
    expect(v2TypedCall).toHaveBeenCalledWith('DeviceSettingsPageShow', 'Success', {
      page: DeviceSettingsPage.DeviceReset,
    });
    expect(v2InvalidateAfterWipe).toHaveBeenCalledTimes(1);
    expect(v2Method.protocolV2UiInteraction).toEqual({
      request: 'button',
      source: 'method-lifecycle',
      reason: 'device-management',
      completion: 'operation-completed',
      deviceOnly: true,
      page: DeviceSettingsPage.DeviceReset,
      operation: 'wipe-device',
    });
  });

  test('keeps the existing identity cache when device wipe fails', async () => {
    const wipeError = new Error('wipe failed');
    const invalidateAfterWipe = jest.fn();
    const method = new DeviceWipe({ id: 1, payload: { method: 'deviceWipe' } });
    method.init();
    (method as any).device = stubDevice({
      isProtocolV2: () => true,
      commands: { typedCall: jest.fn().mockRejectedValue(wipeError) },
      invalidateAfterWipe,
    });

    await expect(method.run()).rejects.toBe(wipeError);
    expect(invalidateAfterWipe).not.toHaveBeenCalled();
  });

  test('routes Change PIN by protocol and waits for the Pro2 operation result', async () => {
    const v1TypedCall = jest.fn().mockResolvedValue({ message: { message: 'ok' } });
    const v1Method = new DeviceChangePin({
      id: 1,
      payload: { method: 'deviceChangePin', remove: false },
    });
    v1Method.init();
    (v1Method as any).device = stubDevice({
      isProtocolV2: () => false,
      commands: { typedCall: v1TypedCall },
    });

    await v1Method.run();

    expect(v1TypedCall).toHaveBeenCalledWith('ChangePin', 'Success', { remove: false });

    const v2TypedCall = jest.fn().mockResolvedValue({ message: { message: 'accepted' } });
    const v2Method = new DeviceChangePin({
      id: 2,
      payload: { method: 'deviceChangePin', remove: false },
    });
    v2Method.init();
    (v2Method as any).device = stubDevice({
      isProtocolV2: () => true,
      commands: { typedCall: v2TypedCall },
    });

    await expect(v2Method.run()).resolves.toEqual({ message: 'accepted' });
    expect(v2Method.unlockPolicy).toBe('unlock-before-run');
    expect(v2TypedCall).toHaveBeenCalledWith('DeviceSettingsPageShow', 'Success', {
      page: DeviceSettingsPage.DevicePinChange,
    });
    expect(v2Method.protocolV2UiInteraction).toEqual({
      request: 'button',
      source: 'method-lifecycle',
      reason: 'change-pin',
      completion: 'operation-completed',
      deviceOnly: true,
      page: DeviceSettingsPage.DevicePinChange,
    });
  });

  test('rejects removing a PIN through the Pro2 page-only Change PIN flow', async () => {
    const typedCall = jest.fn();
    const method = new DeviceChangePin({
      id: 1,
      payload: { method: 'deviceChangePin', remove: true },
    });
    method.init();
    (method as any).device = stubDevice({
      isProtocolV2: () => true,
      commands: { typedCall },
    });

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });
    expect(typedCall).not.toHaveBeenCalled();
  });

  test('sends ProtocolInfoRequest from protocolInfoRequest', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: { version: 1 } });
    const method = new ProtocolInfoRequest({
      id: 1,
      payload: { method: 'protocolInfoRequest' },
    });
    method.init();
    (method as any).device = stubDevice({ commands: { typedCall } });

    await method.run();

    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
  });

  test('sends DeviceFactoryInfoSet and DeviceFactoryInfoGet', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const setMethod = new DeviceFactoryInfoSet({
      id: 1,
      payload: {
        method: 'deviceFactoryInfoSet',
        serial_number: 'PR2SERIAL',
        burn_in_completed: true,
      },
    });
    setMethod.init();
    (setMethod as any).device = stubDevice({ commands: { typedCall } });

    await setMethod.run();

    expect(typedCall).toHaveBeenCalledWith('DeviceFactoryInfoSet', 'Success', {
      info: {
        version: undefined,
        serial_number: 'PR2SERIAL',
        burn_in_completed: true,
        factory_test_completed: undefined,
        manufacture_time: undefined,
      },
    });

    typedCall.mockResolvedValueOnce({ message: { serial_number: 'PR2SERIAL' } });
    const getMethod = new DeviceFactoryInfoGet({
      id: 2,
      payload: { method: 'deviceFactoryInfoGet' },
    });
    getMethod.init();
    (getMethod as any).device = stubDevice({ commands: { typedCall } });

    await getMethod.run();

    expect(typedCall).toHaveBeenLastCalledWith('DeviceFactoryInfoGet', 'DeviceFactoryInfo', {});
  });

  test('marks explicit Protocol V2 unlock as an on-device PIN interaction', () => {
    const method = new DeviceUnlock({
      id: 1,
      payload: { method: 'deviceUnlock' },
    });
    method.init();

    expect(method.protocolV2UiInteraction).toEqual({
      request: 'pin',
      source: 'method-lifecycle',
      reason: 'device-unlock',
      completion: 'operation-completed',
      deviceOnly: true,
      operation: 'unlock-device',
    });
  });

  test('preserves the legacy Features response after explicit device unlock', async () => {
    const method = new DeviceUnlock({
      id: 1,
      payload: { method: 'deviceUnlock' },
    });
    method.init();

    const features = {
      protocol: 'V2',
      unlocked: true,
      sessionId: null,
      session_id: null,
    };
    const unlockDevice = jest.fn().mockResolvedValue(features);
    (method as any).device = { unlockDevice };

    await expect(method.run()).resolves.toBe(features);
    expect(unlockDevice).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['language', { language: 'ja' }],
    ['brightness', { brightness: 80 }],
    ['haptic feedback', { hapticFeedback: true }],
    [
      'combined lock-free settings',
      {
        language: 'ja',
        brightness: 80,
        hapticFeedback: true,
      },
    ],
  ])('does not unlock before changing unified Protocol V2 %s', (_name, settings) => {
    const method = new DeviceSettings({
      id: 2,
      payload: { method: 'deviceSettings', ...settings },
    });

    method.init();

    expect(method.unlockPolicy).toBe('none');
  });

  test.each([
    ['label', { label: 'My Pro 2' }],
    ['auto lock', { autoLockDelayMs: 60_000 }],
    ['auto shutdown', { autoShutdownDelayMs: 120_000 }],
    ['label mixed with lock-free settings', { label: 'My Pro 2', brightness: 80 }],
    ['mixed protected settings', { brightness: 80, autoLockDelayMs: 60_000 }],
    ['other protected settings', { usbLockEnabled: true }],
  ])('unlocks before changing unified Protocol V2 %s', (_name, settings) => {
    const method = new DeviceSettings({
      id: 2,
      payload: { method: 'deviceSettings', ...settings },
    });

    method.init();

    expect(method.unlockPolicy).toBe('unlock-before-run');
  });

  test('unlocks before opening Protocol V2 settings pages through the unified method', () => {
    const method = new DeviceSettings({
      id: 3,
      payload: { method: 'deviceSettings', usePassphrase: true },
    });

    method.init();

    expect(method.unlockPolicy).toBe('unlock-before-run');
  });

  test('keeps firmwareUpdateV4 unlock-before-reboot behavior explicit', () => {
    const method = new FirmwareUpdateV4({
      id: 4,
      payload: { method: 'firmwareUpdateV4' },
    });

    method.init();

    expect(method.unlockPolicy).toBe('unlock-before-run');
  });

  test('sends FilesystemPermissionFix from filesystemPermissionFix', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const method = new FilesystemPermissionFix({
      id: 1,
      payload: { method: 'filesystemPermissionFix' },
    });
    method.init();
    (method as any).device = stubDevice({ commands: { typedCall } });

    await method.run();

    expect(typedCall).toHaveBeenCalledWith('FilesystemPermissionFix', 'Success', {});
  });

  test('sends required FilesystemFormat partition flags', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const method = new FilesystemFormat({
      id: 1,
      payload: { method: 'filesystemFormat' },
    });
    method.init();
    (method as any).device = stubDevice({ commands: { typedCall } });

    await method.run();

    expect(typedCall).toHaveBeenCalledWith('FilesystemFormat', 'Success', {
      data: true,
      user: true,
    });
  });
});

describe('Protocol V2 raw device info method', () => {
  const buildMethod = (payload: Record<string, unknown> = {}) => {
    const method = new DeviceInfoGet({
      id: 1,
      payload: {
        method: 'deviceInfoGet',
        ...payload,
      },
    });
    method.init();
    return method;
  };

  test('passes requested targets/types through and returns the raw DeviceInfo message', async () => {
    const method = buildMethod({
      targets: { hw: true, se1: true },
      types: { version: true, hash: true },
    });
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceInfo',
      message: { protocol_version: 1, hw: { serial_no: 'PR2SERIAL' } },
    });
    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      commands: { typedCall },
    });

    await expect(method.run()).resolves.toEqual({
      protocol_version: 1,
      hw: { serial_no: 'PR2SERIAL' },
    });
    expect(typedCall).toHaveBeenCalledWith(
      'DeviceInfoGet',
      'DeviceInfo',
      {
        targets: { hw: true, se1: true },
        types: { version: true, hash: true },
      },
      { timeoutMs: PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS }
    );
  });

  test('rejects removed target/type names before transport call', () => {
    expect(() =>
      buildMethod({
        targets: { hw: true, status: true },
      })
    ).toThrow('targets');

    expect(() =>
      buildMethod({
        targets: { hw: true, bt: true },
      })
    ).toThrow('targets');

    expect(() =>
      buildMethod({
        types: { version: true, digest: true },
      })
    ).toThrow('types');
  });

  test('defaults to the basic targets/types when none are given', async () => {
    const method = buildMethod();
    const typedCall = jest.fn().mockResolvedValue({ type: 'DeviceInfo', message: {} });
    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      commands: { typedCall },
    });

    await method.run();

    expect(typedCall).toHaveBeenCalledWith(
      'DeviceInfoGet',
      'DeviceInfo',
      {
        targets: { hw: true, fw: true, coprocessor: true },
        types: { version: true, specific: true },
      },
      { timeoutMs: PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS }
    );
  });

  test('rejects on Protocol V1 devices instead of sending an unknown message', () => {
    const method = buildMethod();
    const typedCall = jest.fn();
    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V1' },
      commands: { typedCall },
    });

    expect(() => method.assertProtocolSupported('V1', EFirmwareType.Universal)).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.DeviceNotSupportMethod })
    );
    expect(typedCall).not.toHaveBeenCalled();
  });
});

describe('Protocol V2 file write method', () => {
  test('rejects invalid write parameters before transport call', () => {
    expect(() => {
      const method = new FileWrite({
        id: 1,
        payload: {
          method: 'fileWrite',
          path: 'vol1:test.bin',
          offset: -1,
          data: new Uint8Array([1]),
        },
      });
      method.init();
    }).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.CallMethodInvalidParameter })
    );

    expect(() => {
      const method = new FileWrite({
        id: 1,
        payload: {
          method: 'fileWrite',
          path: 'vol1:test.bin',
        } as any,
      });
      method.init();
    }).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.CallMethodInvalidParameter })
    );
  });

  test('uses demo-aligned overwrite and append defaults', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: { processed_byte: 2 } });
    const method = new FileWrite({
      id: 1,
      payload: {
        method: 'fileWrite',
        path: 'vol1:test.bin',
        offset: 1,
        totalSize: 2,
        data: new Uint8Array([1]),
      },
    });
    (method as any).device = stubDevice({ commands: { typedCall } });
    method.postMessage = jest.fn();

    method.init();
    await method.run();

    expect(typedCall).toHaveBeenCalledWith(
      'FilesystemFileWrite',
      'FilesystemFile',
      {
        file: {
          path: 'vol1:test.bin',
          offset: 1,
          total_size: 2,
          data: new Uint8Array([1]),
        },
        overwrite: false,
        append: false,
        ui_percentage: 100,
      },
      { timeoutMs: undefined }
    );
    expect(method.postMessage).toHaveBeenCalledWith({
      event: 'UI_EVENT',
      type: UI_REQUEST.DEVICE_PROGRESS,
      payload: expect.objectContaining({
        progress: 100,
        transferredBytes: 1,
        totalBytes: 1,
        elapsedMs: expect.any(Number),
      }),
    });
  });

  test('splits data larger than the Protocol V2 file payload limit', async () => {
    const data = new Uint8Array(4097);
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const method = new FileWrite({
      id: 1,
      payload: {
        method: 'fileWrite',
        path: 'vol1:test.bin',
        offset: 0,
        totalSize: 4097,
        data,
      },
    });
    (method as any).device = stubDevice({ commands: { typedCall } });
    method.postMessage = jest.fn();

    method.init();
    const result = await method.run();

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'FilesystemFileWrite',
      'FilesystemFile',
      {
        file: {
          path: 'vol1:test.bin',
          offset: 0,
          total_size: 4097,
          data: data.slice(0, 4000),
        },
        overwrite: true,
        append: false,
        ui_percentage: 0,
      },
      { timeoutMs: undefined }
    );
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'FilesystemFileWrite',
      'FilesystemFile',
      {
        file: {
          path: 'vol1:test.bin',
          offset: 4000,
          total_size: 4097,
          data: data.slice(4000),
        },
        overwrite: false,
        append: false,
        ui_percentage: 100,
      },
      { timeoutMs: undefined }
    );
    expect(result).toMatchObject({
      path: 'vol1:test.bin',
      processed_byte: 4097,
      chunks: 2,
    });
    expect(method.postMessage).toHaveBeenNthCalledWith(1, {
      event: 'UI_EVENT',
      type: UI_REQUEST.DEVICE_PROGRESS,
      payload: expect.objectContaining({
        progress: 97,
        transferredBytes: 4000,
        totalBytes: 4097,
        elapsedMs: expect.any(Number),
      }),
    });
    expect(method.postMessage).toHaveBeenNthCalledWith(2, {
      event: 'UI_EVENT',
      type: UI_REQUEST.DEVICE_PROGRESS,
      payload: expect.objectContaining({
        progress: 100,
        transferredBytes: 4097,
        totalBytes: 4097,
        elapsedMs: expect.any(Number),
      }),
    });
  });

  test('uses the BLE chunk limit by default in BLE environments', async () => {
    const getSettingsSpy = jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native');
    const data = new Uint8Array(1801);
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const method = new FileWrite({
      id: 1,
      payload: {
        method: 'fileWrite',
        path: 'vol1:test.bin',
        offset: 0,
        totalSize: 1801,
        data,
      },
    });
    (method as any).device = stubDevice({ commands: { typedCall } });
    method.postMessage = jest.fn();

    try {
      method.init();
      await method.run();
    } finally {
      getSettingsSpy.mockRestore();
    }

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall.mock.calls[0][2].file.data.byteLength).toBe(1800);
    expect(typedCall.mock.calls[1][2].file.offset).toBe(1800);
    expect(typedCall.mock.calls[1][2].file.data.byteLength).toBe(1);
  });
});

describe('Protocol V2 file read method', () => {
  test('uses a 900-byte chunk limit by default in BLE environments', async () => {
    const getSettingsSpy = jest.spyOn(DataManager, 'getSettings').mockReturnValue('react-native');
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { data: new Uint8Array(900) } })
      .mockResolvedValueOnce({ message: { data: new Uint8Array(1) } });
    const method = new FileRead({
      id: 1,
      payload: {
        method: 'fileRead',
        path: 'vol1:test.bin',
        offset: 0,
        totalSize: 901,
      },
    });
    (method as any).device = stubDevice({ commands: { typedCall } });

    try {
      method.init();
      await method.run();
    } finally {
      getSettingsSpy.mockRestore();
    }

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall.mock.calls[0][2].chunk_len).toBe(900);
    expect(typedCall.mock.calls[1][2].file.offset).toBe(900);
    expect(typedCall.mock.calls[1][2].chunk_len).toBe(1);
  });

  test('rejects invalid read and directory parameters before transport call', () => {
    expect(() => {
      const method = new FileRead({
        id: 1,
        payload: {
          method: 'fileRead',
          path: '',
          offset: 0,
        },
      });
      method.init();
    }).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.CallMethodInvalidParameter })
    );

    expect(() => {
      const method = new FileRead({
        id: 1,
        payload: {
          method: 'fileRead',
          path: 'vol1:test.bin',
          totalSize: -1,
        },
      });
      method.init();
    }).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.CallMethodInvalidParameter })
    );

    expect(() => {
      const method = new DirList({
        id: 1,
        payload: {
          method: 'dirList',
          path: 'vol1:',
          depth: -1,
        },
      });
      method.init();
    }).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.CallMethodInvalidParameter })
    );
  });

  test('reads full file in chunks when read length is 0', async () => {
    const firstChunk = new Uint8Array(64).fill(1);
    const typedCall = jest
      .fn()
      .mockResolvedValueOnce({ message: { exist: true, size: 65, directory: false } })
      .mockResolvedValueOnce({ message: { data: firstChunk } })
      .mockResolvedValueOnce({ message: { data: new Uint8Array([2]) } });
    const method = new FileRead({
      id: 1,
      payload: {
        method: 'fileRead',
        path: 'vol1:test.bin',
        offset: 0,
        totalSize: 0,
        chunkLen: 64,
      },
    });
    (method as any).device = stubDevice({ commands: { typedCall } });

    method.init();
    const result = await method.run();

    expect(typedCall).toHaveBeenNthCalledWith(1, 'FilesystemPathInfoQuery', 'FilesystemPathInfo', {
      path: 'vol1:test.bin',
    });
    expect(typedCall).toHaveBeenNthCalledWith(2, 'FilesystemFileRead', 'FilesystemFile', {
      file: {
        path: 'vol1:test.bin',
        offset: 0,
        total_size: 0,
      },
      chunk_len: 64,
      ui_percentage: 0,
    });
    expect(typedCall).toHaveBeenNthCalledWith(3, 'FilesystemFileRead', 'FilesystemFile', {
      file: {
        path: 'vol1:test.bin',
        offset: 64,
        total_size: 0,
      },
      chunk_len: 1,
      ui_percentage: 100,
    });
    expect(result.data.byteLength).toBe(65);
    expect(result.data[0]).toBe(1);
    expect(result.data[64]).toBe(2);
    expect(result).toMatchObject({
      path: 'vol1:test.bin',
      offset: 0,
      total_size: 65,
      chunks: 2,
    });
  });

  test('decodes protobuf bytes hex string returned by transport', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      message: {
        data: '0102ff',
      },
    });
    const method = new FileRead({
      id: 1,
      payload: {
        method: 'fileRead',
        path: 'vol0:test.bin',
        offset: 0,
        totalSize: 3,
        chunkLen: 512,
      },
    });
    (method as any).device = stubDevice({ commands: { typedCall } });

    method.init();
    const result = await method.run();

    expect(result.data).toEqual(new Uint8Array([1, 2, 255]));
  });
});
