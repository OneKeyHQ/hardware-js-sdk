import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DeviceRebootType } from '@onekeyfe/hd-transport';

import * as firmwareBinaryApi from '../src/api/firmware/getBinary';
import DnxGetAddress from '../src/api/dynex/DnxGetAddress';
import DnxSignTransaction from '../src/api/dynex/DnxSignTransaction';
import DirList from '../src/api/DirList';
import FileRead from '../src/api/FileRead';
import FileWrite from '../src/api/FileWrite';
import DeviceFactoryInfoGet from '../src/api/protocol-v2/DeviceFactoryInfoGet';
import DeviceFactoryInfoSet from '../src/api/protocol-v2/DeviceFactoryInfoSet';
import DeviceFirmwareUpdate from '../src/api/protocol-v2/DeviceFirmwareUpdate';
import DeviceGetFirmwareUpdateStatus from '../src/api/protocol-v2/DeviceGetFirmwareUpdateStatus';
import DeviceInfoGet from '../src/api/protocol-v2/DeviceInfoGet';
import DeviceReboot from '../src/api/protocol-v2/DeviceReboot';
import DeviceSessionGet from '../src/api/protocol-v2/DeviceSessionGet';
import DeviceStatusGet from '../src/api/protocol-v2/DeviceStatusGet';
import FilesystemFormat from '../src/api/protocol-v2/FilesystemFormat';
import FilesystemPermissionFix from '../src/api/protocol-v2/FilesystemPermissionFix';
import ProtocolInfoRequest from '../src/api/protocol-v2/ProtocolInfoRequest';
import EVMSignTypedData from '../src/api/evm/EVMSignTypedData';
import EVMSignMessageEIP712 from '../src/api/evm/EVMSignMessageEIP712';
import FirmwareUpdateV3 from '../src/api/FirmwareUpdateV3';
import FirmwareUpdateV4 from '../src/api/FirmwareUpdateV4';
import GetDeviceInfo from '../src/api/GetDeviceInfo';
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
import { getBitcoinForkVersionRange } from '../src/api/btc/helpers/versionLimit';
import { DataManager } from '../src/data-manager';
import { createCoreApi } from '../src/inject';
import { Device, preloadSessionCache } from '../src/device/Device';
import { UI_REQUEST } from '../src/events/ui-request';
import {
  PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS,
  requestProtocolV2DeviceInfo,
} from '../src/protocols/protocol-v2/features';
import {
  getProtocolV2WalletSession,
  refreshProtocolV2DeviceStatus,
} from '../src/protocols/protocol-v2/walletSession';
import { buildProfileFromProtocolV2, buildProtocolV2FeaturesPayload } from '../src/deviceProfile';
import {
  getDeviceType,
  getFirmwareType,
  getFirmwareUpdateField,
  getFirmwareUpdateFieldArray,
  getMethodVersionRange,
  isMethodVersionRangeUnsupported,
} from '../src/utils';
import { getDeviceFirmwareVersion } from '../src/utils/deviceVersionUtils';
import {
  getPassphraseState,
  getPassphraseStateWithRefreshDeviceInfo,
} from '../src/utils/deviceFeaturesUtils';

import type { DeviceCommands } from '../src/device/DeviceCommands';
import type { Features } from '../src/types';
import type { ProtocolV2DeviceInfo } from '../src/protocols/protocol-v2/features';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const descriptor = {
  id: 'ble-id',
  path: 'usb-path',
};

/**
 * 为纯对象 stub 设备补齐 Device 的协议判别与 getCurrent* accessor，
 * 缺省实现与 Device.ts 语义保持一致；已有同名字段（如 jest.fn()）不覆盖。
 */
function stubDevice<T extends Record<string, any>>(device: T): T {
  const d = device as any;
  d.isProtocolV2 ??= () => d.originalDescriptor?.protocolType === 'V2';
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
  d.updateProtocolV2Features ??= (deviceInfo?: ProtocolV2DeviceInfo) => {
    d.features = buildProtocolV2FeaturesPayload(deviceInfo, d.features);
    return d.features;
  };
  return device;
}

// 直接复用生产映射函数，避免测试内副本与实现漂移（之前的手抄副本已缺失 se boot 字段）
function normalizeProtocolV2Features(_descriptor: unknown, deviceInfo?: ProtocolV2DeviceInfo) {
  return buildProtocolV2FeaturesPayload(deviceInfo);
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
};

async function requestProtocolV2Features({
  commands,
  descriptor: inputDescriptor,
}: {
  commands: DeviceCommands;
  descriptor?: unknown;
}) {
  const deviceInfo = await requestProtocolV2DeviceInfo({ commands });
  return normalizeProtocolV2Features(inputDescriptor ?? descriptor, deviceInfo);
}

describe('Protocol V2 feature adapter', () => {
  test('normalizes Protocol V2 DeviceInfo into existing Features fields', () => {
    const features = normalizeProtocolV2Features(descriptor as any, {
      protocol_version: 1,
      hw: {
        serial_no: 'PR2SERIAL',
      },
      fw: {
        application_data: {
          version: '0.1.0',
          hash: [1, 2, 255],
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

  test('marks Protocol V2 DeviceInfo without status as bootloader mode', () => {
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
    };
    const features = normalizeProtocolV2Features(descriptor as any, deviceInfo);
    const profile = buildProfileFromProtocolV2({ deviceInfo });

    expect(features.mode).toBe('bootloader');
    expect(features.bootloaderMode).toBe(true);
    expect(features.initialized).toBeNull();
    expect(profile.status.mode).toBe('bootloader');
    expect(profile.status.bootloaderMode).toBe(true);
  });

  test('uses DeviceSessionGet for Protocol V2 passphrase sessions', async () => {
    const features = normalizeProtocolV2Features(descriptor as any);
    features.firmwareVersion = '1.2.3';
    features.passphraseProtection = true;
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceSession',
      message: {
        btc_test_address: 'state-1',
        session_id: 'session-1',
      },
    });
    const commands = { typedCall } as unknown as DeviceCommands;
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = features;
    (device as any).commands = commands;

    await getPassphraseState(device, {
      expectPassphraseState: 'state-1',
    });
    expect(typedCall).toHaveBeenLastCalledWith('DeviceSessionGet', 'DeviceSession', {});

    await expect(
      getPassphraseState(device, {
        expectPassphraseState: 'state-2',
        allowCreateAttachPin: true,
      })
    ).rejects.toEqual(
      expect.objectContaining({
        errorCode: HardwareErrorCode.DeviceCheckPassphraseStateError,
      })
    );
    expect(typedCall).toHaveBeenLastCalledWith('DeviceSessionGet', 'DeviceSession', {});

    await getPassphraseState(device, {
      onlyMainPin: true,
    });
    expect(typedCall).toHaveBeenLastCalledWith('DeviceSessionGet', 'DeviceSession', {});
  });

  test('deviceStatusGet returns raw DeviceStatus without updating features', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceStatus',
      message: { device_id: 'device-1', unlocked: true },
    });
    const updateProtocolV2Features = jest.fn();
    const method = new DeviceStatusGet({
      payload: { method: 'deviceStatusGet', connectId: 'connect-id' },
    });
    method.init();
    method.device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      commands: { typedCall },
      updateProtocolV2Features,
    }) as any;

    await expect(method.run()).resolves.toEqual({ device_id: 'device-1', unlocked: true });
    expect(typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
    expect(updateProtocolV2Features).not.toHaveBeenCalled();
  });

  test('deviceSessionGet maps sessionId and does not mutate wallet cache', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceSession',
      message: { session_id: 'new-session', btc_test_address: 'state-a' },
    });
    const updateInternalState = jest.fn();
    const method = new DeviceSessionGet({
      payload: {
        method: 'deviceSessionGet',
        connectId: 'connect-id',
        sessionId: 'cached-session',
      },
    });
    method.init();
    method.device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      commands: { typedCall },
      updateInternalState,
    }) as any;

    await expect(method.run()).resolves.toEqual({
      session_id: 'new-session',
      btc_test_address: 'state-a',
    });
    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
      session_id: 'cached-session',
    });
    expect(updateInternalState).not.toHaveBeenCalled();
  });

  test('routes raw status and session methods through CoreApi', async () => {
    const call = jest.fn().mockResolvedValue({ success: true, payload: {} });
    const api = createCoreApi(call as any);

    await api.deviceStatusGet('connect-id', { retryCount: 1 });
    await api.deviceSessionGet('connect-id', { sessionId: 'cached-session' });

    expect(call).toHaveBeenNthCalledWith(1, {
      method: 'deviceStatusGet',
      connectId: 'connect-id',
      retryCount: 1,
    });
    expect(call).toHaveBeenNthCalledWith(2, {
      method: 'deviceSessionGet',
      connectId: 'connect-id',
      sessionId: 'cached-session',
    });
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
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceSession',
      message: { session_id: 'session-b', btc_test_address: 'state-a' },
    });
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
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceSession',
      message: { session_id: 'main-session' },
    });
    (device as any).commands = { typedCall };

    await getProtocolV2WalletSession(device);

    expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
    expect(device.getInternalState()).toBeUndefined();
  });

  test('clears the selected Pro2 cache entry after invalid session rejection', async () => {
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
    (device as any).commands = {
      typedCall: jest.fn().mockRejectedValue(new Error('Failure_InvalidSession,no error message')),
    };

    await expect(getProtocolV2WalletSession(device)).rejects.toThrow('Failure_InvalidSession');
    expect(device.getInternalState()).toBeUndefined();
  });

  test('rejects a mismatched Pro2 wallet state and clears the selected cache entry', async () => {
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
    (device as any).commands = {
      typedCall: jest.fn().mockResolvedValue({
        type: 'DeviceSession',
        message: { session_id: 'session-b', btc_test_address: 'state-b' },
      }),
    };

    await expect(
      getPassphraseStateWithRefreshDeviceInfo(device, { expectPassphraseState: 'state-a' })
    ).rejects.toEqual(
      expect.objectContaining({
        errorCode: HardwareErrorCode.DeviceCheckPassphraseStateError,
      })
    );
    expect(device.getInternalState()).toBeUndefined();
  });

  test('rejects DeviceSessionGet while cached Pro2 status is locked', async () => {
    const device = Device.fromDescriptor({
      id: 'cache-device-4',
      path: 'cache-path-4',
      protocolType: 'V2',
    } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      { status: { device_id: 'stable-device-4', unlocked: false } }
    );
    const typedCall = jest.fn();
    (device as any).commands = { typedCall };

    await expect(getProtocolV2WalletSession(device)).rejects.toThrow('Device is locked');
    expect(typedCall).not.toHaveBeenCalled();
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

  test('returns unified GetPassphraseState object payload for existing Pro devices', async () => {
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
      commands: { typedCall },
      updateInternalState,
      getCurrentDeviceId: () => 'pro-device-id',
      getCurrentPassphraseProtection: () => true,
    }) as any;

    await expect(method.run()).resolves.toEqual({
      passphraseState: 'state-pro',
      sessionId: 'session-pro',
      unlockedAttachPin: false,
      passphraseProtection: true,
    });
    expect(updateInternalState).toHaveBeenCalledWith(
      true,
      'state-pro',
      'pro-device-id',
      'session-pro',
      'feature-session'
    );
  });

  test('uses features for GetPassphraseState response metadata', async () => {
    const features = {
      deviceId: null,
      deviceType: 'pro2',
      firmwareVersion: '4.15.0',
      passphraseProtection: true,
      sessionId: 'feature-session',
      unlockedAttachPin: true,
    };
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceSession',
      message: {
        btc_test_address: 'state-pro2',
        session_id: 'session-pro2',
      },
    });
    const updateInternalState = jest.fn();
    const getFeatures = jest.fn().mockResolvedValue(features);
    const method = new GetPassphraseState({
      payload: {
        method: 'getPassphraseState',
        connectId: 'connect-id',
      },
    });
    method.device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features,
      commands: { typedCall },
      updateInternalState,
      getFeatures,
      getCurrentDeviceType: () => 'pro2',
      getCurrentDeviceId: () => undefined,
      getCurrentPassphraseProtection: () => true,
    }) as any;

    await expect(method.run()).resolves.toEqual({
      passphraseState: 'state-pro2',
      sessionId: 'session-pro2',
      unlockedAttachPin: true,
      passphraseProtection: true,
    });
    expect(getFeatures).not.toHaveBeenCalled();
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
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceSession',
      message: {
        btc_test_address: 'state-pro2-new',
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
      commands: { typedCall },
      clearInternalState,
      updateInternalState,
      getCurrentDeviceId: () => 'pro2-device-id',
      getCurrentPassphraseProtection: () => true,
    }) as any;

    await expect(method.run()).resolves.toEqual({
      passphraseState: 'state-pro2-new',
      sessionId: undefined,
      unlockedAttachPin: false,
      passphraseProtection: true,
    });
    expect(clearInternalState).toHaveBeenCalledTimes(1);
    expect(updateInternalState).toHaveBeenCalledWith(
      true,
      'state-pro2-new',
      'pro2-device-id',
      undefined,
      null
    );
  });

  test('stores Pro2 passphrase session cache without synthetic device id', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceSession',
      message: {
        btc_test_address: 'state-profile',
        session_id: 'session-profile',
      },
    });

    (device as any).features = {
      ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any, {
        hw: { serial_no: 'PR2SERIAL' },
        fw: { application: { version: '4.15.0' } },
        status: { passphrase_enabled: true },
      }),
      unlocked: true,
    };
    (device as any).commands = { typedCall };

    await getPassphraseStateWithRefreshDeviceInfo(device);

    device.passphraseState = 'state-profile';
    expect(device.getInternalState()).toBe('session-profile');
    expect(device.getInternalState('CACHED-ID')).toBeUndefined();
  });

  test('stores Pro2 passphrase sessions without selecting them implicitly', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceSession',
      message: {
        btc_test_address: 'state-auto',
        session_id: 'session-auto',
      },
    });

    (device as any).features = normalizeProtocolV2Features(
      {
        ...descriptor,
        protocolType: 'V2',
      } as any,
      {
        hw: { serial_no: 'PR2SERIAL' },
      }
    );
    (device as any).features.firmwareVersion = '4.15.0';
    (device as any).features.passphraseProtection = true;
    (device as any).features.unlocked = true;
    (device as any).commands = { typedCall };

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
    expect(typedCall).toHaveBeenLastCalledWith('DeviceSessionGet', 'DeviceSession', {});
  });

  test('does not mark Pro2 passphrase enabled from a main PIN session alone', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceSession',
      message: {
        session_id: 'main-pin-session',
      },
    });

    (device as any).features = normalizeProtocolV2Features(
      {
        ...descriptor,
        protocolType: 'V2',
      } as any,
      {
        status: {
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
      passphraseState: undefined,
      newSession: 'main-pin-session',
    });

    expect(device.features?.passphraseProtection).toBe(false);
    expect(device.features?.sessionId).toBeNull();
    expect(device.getInternalState()).toBeUndefined();
    expect(typedCall).toHaveBeenLastCalledWith('DeviceSessionGet', 'DeviceSession', {});
  });

  test('does not let skipPassphraseCheck hide Pro2 passphrase state mismatch', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceSession',
      message: {
        btc_test_address: 'wrong-state',
        session_id: 'wrong-session',
      },
    });

    (device as any).features = normalizeProtocolV2Features({
      ...descriptor,
      protocolType: 'V2',
    } as any);
    (device as any).features.firmwareVersion = '4.15.0';
    (device as any).features.passphraseProtection = true;
    (device as any).commands = { typedCall };

    await expect(device.checkPassphraseStateSafety('expected-state', false, true)).rejects.toEqual(
      expect.objectContaining({
        errorCode: HardwareErrorCode.DeviceCheckPassphraseStateError,
      })
    );

    expect(device.getInternalState()).toBeUndefined();
    expect(typedCall).toHaveBeenNthCalledWith(1, 'DeviceSessionGet', 'DeviceSession', {});
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
      ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
      serialNo: 'CACHED-SERIAL',
      label: 'Cached Label',
      bleName: 'Cached BLE',
      passphraseProtection: true,
    };

    expect(device.toMessageObject()).toMatchObject({
      uuid: 'CACHED-SERIAL',
      deviceId: null,
      bleName: 'Cached BLE',
      label: 'Cached Label',
      deviceType: 'pro2',
    });
    expect(device.getCurrentPassphraseProtection()).toBe(true);
    expect(device.hasUsePassphrase()).toBe(true);
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
      uuid: 'CACHED-SERIAL',
      deviceId: null,
    });
  });

  test('initializes Protocol V2 features from lightweight DeviceInfoGet', async () => {
    const commands = {
      typedCall: jest.fn().mockResolvedValueOnce({
        type: 'DeviceInfo',
        message: {
          hw: { serial_no: 'PR2SERIAL' },
          status: {
            device_id: 'PRO2-STATUS-ID',
            init_states: true,
            passphrase_enabled: true,
          },
        },
      }),
    };

    const features = await requestProtocolV2Features({
      commands: commands as unknown as DeviceCommands,
      descriptor: descriptor as any,
    });

    expect(features.deviceId).toBe('PRO2-STATUS-ID');
    expect(features.initialized).toBe(true);
    expect(features.passphraseProtection).toBe(true);
    expect(commands.typedCall).toHaveBeenCalledTimes(1);
    expect(commands.typedCall).toHaveBeenNthCalledWith(
      1,
      'DeviceInfoGet',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          coprocessor: true,
          status: true,
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

  test('refreshes Protocol V2 basic device info with the lightweight request', async () => {
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'DeviceInfo',
      message: {
        hw: { serial_no: 'PR2SERIAL' },
        fw: {
          application: {
            version: '5.6.7',
          },
        },
        coprocessor: {
          application: {
            version: '8.9.10',
          },
          bt_adv_name: 'Raw Pro2 BLE',
        },
        status: {
          device_id: 'PRO2-BASIC-ID',
          unlocked_by_attach_to_pin: true,
          init_states: true,
          passphrase_enabled: true,
        },
      },
    });
    const method = new GetDeviceInfo({
      id: 1,
      payload: {
        method: 'getDeviceInfo',
        scope: 'basic',
        refresh: true,
      },
    });
    method.init();
    (method as any).device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features: {
        ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
        device_id: 'CACHED-ID',
        serial_no: 'CACHED-SERIAL',
        label: 'Cached Pro2',
        onekey_firmware_version: '1.2.3',
        onekey_ble_version: '2.3.4',
      },
      commands: { typedCall },
      _updateFeatures: jest.fn(),
    });

    const result = await method.run();

    expect(typedCall).toHaveBeenCalledWith(
      'DeviceInfoGet',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          coprocessor: true,
          status: true,
        },
        types: {
          version: true,
          specific: true,
        },
      },
      { timeoutMs: PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS }
    );
    expect(result).toMatchObject({
      protocol: 'V2',
      deviceType: 'pro2',
      deviceId: 'PRO2-BASIC-ID',
      serialNo: 'PR2SERIAL',
      label: null,
      bleName: 'Raw Pro2 BLE',
      status: {
        initialized: true,
        unlockedAttachPin: true,
        passphraseProtection: true,
      },
      versions: {
        firmware: '5.6.7',
        ble: '8.9.10',
      },
    });
  });

  test('does not fill Protocol V2 DeviceProfile from cached V1-shaped fields', async () => {
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'DeviceInfo',
      message: {
        status: {
          init_states: true,
        },
      },
    });
    const method = new GetDeviceInfo({
      id: 1,
      payload: {
        method: 'getDeviceInfo',
        scope: 'basic',
      },
    });
    method.init();
    (method as any).device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features: {
        ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
        device_id: 'STALE-ID',
        serial_no: 'STALE-SERIAL',
        label: 'Stale Pro2',
        ble_name: 'Stale BLE',
        passphrase_protection: true,
        onekey_firmware_version: '1.2.3',
        onekey_ble_version: '2.3.4',
      },
      commands: { typedCall },
    });

    const result = await method.run();

    expect(result).toMatchObject({
      protocol: 'V2',
      // 身份字段不得取自缓存的 V1-shaped features（STALE-ID / STALE-SERIAL），
      // hw.serial_no 缺失时也不回退 descriptor.path。
      deviceId: '',
      serialNo: '',
      label: null,
      bleName: null,
      status: {
        passphraseProtection: null,
        noBackup: null,
      },
      versions: {
        firmware: null,
        ble: null,
      },
    });
  });

  test('reads full Protocol V2 device info only for verify scope', async () => {
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'DeviceInfo',
      message: {
        hw: { serial_no: 'PR2SERIAL' },
        status: { init_states: true },
      },
    });
    const method = new GetDeviceInfo({
      id: 1,
      payload: {
        method: 'getDeviceInfo',
        scope: 'verify',
      },
    });
    method.init();
    (method as any).device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features: normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
      commands: { typedCall },
      _updateFeatures: jest.fn(),
    });

    await method.run();

    expect(typedCall).toHaveBeenCalledWith(
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
          status: true,
        },
        types: {
          version: true,
          build_id: true,
          hash: true,
          specific: true,
        },
      },
      { timeoutMs: PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS }
    );
  });

  test('reads Protocol V2 SE version fields for versions scope', async () => {
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'DeviceInfo',
      message: {
        hw: { serial_no: 'PR2SERIAL' },
        se1: {
          application: { version: '1.0.1' },
          bootloader: { version: '1.0.0' },
        },
        se2: {
          application: { version: '2.0.1' },
          bootloader: { version: '2.0.0' },
        },
        status: { init_states: true },
      },
    });
    const method = new GetDeviceInfo({
      id: 1,
      payload: {
        method: 'getDeviceInfo',
        scope: 'versions',
      },
    });
    method.init();
    (method as any).device = stubDevice({
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features: normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
      commands: { typedCall },
    });

    const result = await method.run();

    expect(typedCall).toHaveBeenCalledWith(
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
          status: true,
        },
        types: {
          version: true,
          specific: true,
        },
      },
      { timeoutMs: PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS }
    );
    expect(result.versions).toMatchObject({
      se01: '1.0.1',
      se01Boot: '1.0.0',
      se02: '2.0.1',
      se02Boot: '2.0.0',
    });
    expect(result).not.toHaveProperty('verify');
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
    const features = normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any, {
      fw: {
        application: {
          version: '9.9.9',
        },
      },
    });
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

    const stellarRange = getMethodVersionRange(features, type => stellar.getVersionRange()[type]);
    const benfenRange = getMethodVersionRange(features, type => benfen.getVersionRange()[type]);
    const lnurlAuthRange = getMethodVersionRange(
      features,
      type => lnurlAuth.getVersionRange()[type]
    );
    const neuraiRange = getMethodVersionRange(
      features,
      type => getBitcoinForkVersionRange(['Neurai'])[type]
    );

    expect(isMethodVersionRangeUnsupported(stellarRange)).toBe(true);
    expect(isMethodVersionRangeUnsupported(benfenRange)).toBe(true);
    expect(isMethodVersionRangeUnsupported(lnurlAuthRange)).toBe(true);
    expect(isMethodVersionRangeUnsupported(neuraiRange)).toBe(true);
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

  test('does not call V1 OnekeyGetFeatures for Protocol V2 devices', async () => {
    const method = new GetOnekeyFeatures({
      id: 1,
      payload: {
        method: 'getOnekeyFeatures',
      },
    });
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceInfo',
      message: {
        protocol_version: 1,
        hw: { serial_no: 'PR2SERIAL' },
        fw: { application: { version: '1.2.3', build_id: 'app-build' } },
        coprocessor: { bt_adv_name: 'Pro2 BLE' },
        status: { init_states: true },
      },
    });

    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      commands: { typedCall },
    });

    const message = await method.run();

    // V2 走 DeviceInfoGet 完整请求（含 SE 与 hash/build_id），而不是 V1 OnekeyGetFeatures
    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall).toHaveBeenCalledWith(
      'DeviceInfoGet',
      'DeviceInfo',
      expect.objectContaining({
        targets: expect.objectContaining({ se1: true, se2: true, se3: true, se4: true }),
        types: expect.objectContaining({ build_id: true, hash: true }),
      }),
      expect.anything()
    );
    expect(message).toEqual({});
    expect(message).not.toHaveProperty('label');
  });

  test('refreshes cached Protocol V2 features with a lightweight status request on later runs', async () => {
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
          fw: { application: { version: '1.2.3' } },
          status: {
            device_id: 'PRO2-REFRESH-ID',
            passphrase_enabled: true,
          },
        },
      })
      // 第二次 run 的轻量 status 刷新：设备端 label / init_states 等可能已变化
      .mockResolvedValueOnce({
        type: 'DeviceInfo',
        message: {
          hw: { serial_no: 'PR2SERIAL' },
          status: {
            device_id: 'PRO2-REFRESH-ID',
            passphrase_enabled: false,
          },
        },
      });

    (device as any).commands = { typedCall };

    await device.initialize();
    await device.initialize();

    expect(device.features).toMatchObject({
      deviceId: 'PRO2-REFRESH-ID',
      firmwareVersion: '1.2.3',
      passphraseProtection: false,
      label: null,
    });
    expect((device as any).profile).toBeUndefined();
    // status 字段被第二次刷新更新
    expect(device.features?.passphraseProtection).toBe(false);
    expect(device.features?.label).toBeNull();
    // 轻量刷新不含 fw target，已有版本信息按字段级合并保留
    expect(device.features?.firmwareVersion).toBe('1.2.3');
    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'DeviceInfoGet',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          coprocessor: true,
          status: true,
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
    // 第二次为 status-only 轻量请求（hw/coprocessor 仅用于身份字段，避免顶层覆盖清空）
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'DeviceInfoGet',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          coprocessor: true,
          status: true,
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
          hw: { serial_no: 'PR2SERIAL' },
          fw: { application: { version: '1.2.3' } },
          status: { init_states: true },
        },
      })
      .mockResolvedValueOnce({
        type: 'DeviceInfo',
        message: {
          hw: { serial_no: 'PR2SERIAL' },
          fw: { application: { version: '1.2.4' } },
          status: { init_states: true, passphrase_enabled: true },
        },
      });

    (device as any).commands = { typedCall };

    await device.initialize();
    const features = await device.getFeatures();

    expect(device.features).toMatchObject({
      deviceId: null,
      firmwareVersion: '1.2.4',
      passphraseProtection: true,
    });
    expect(features).toMatchObject({
      deviceType: 'pro2',
      serialNo: 'PR2SERIAL',
      firmwareVersion: '1.2.4',
      passphraseProtection: true,
    });
    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'DeviceInfoGet',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          coprocessor: true,
          status: true,
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
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'DeviceInfo',
      message: {
        hw: { serial_no: 'PR2SERIAL' },
        fw: { application: { version: '1.2.4' } },
        status: { init_states: true, passphrase_enabled: true },
      },
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

  test('unlocks Protocol V2 devices via DeviceSessionAskPin regardless of Pro-series version gates', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const typedCall = jest.fn().mockImplementation(requestType => {
      if (requestType === 'DeviceSessionAskPin') {
        return {
          type: 'DeviceSessionPinResult',
          message: { unlocked: false, passphrase_protection: false },
        };
      }
      if (requestType === 'DeviceStatusGet') {
        return {
          type: 'DeviceStatus',
          message: {
            device_id: 'PRO2-DEVICE-ID',
            unlocked: true,
            passphrase_enabled: true,
          },
        };
      }
      throw new Error(`Unexpected request: ${requestType}`);
    });

    (device as any).commands = { typedCall };
    // Pro2 版本线独立于 Pro（这里是 1.2.3，不满足 Pro 系列 4.15.0 门槛），
    // Protocol V2 走独立的设备端 PIN 解锁流程，不走 Pro 系列版本门槛或 GetAddress 探测回退。
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        hw: { serial_no: 'PR2SERIAL' },
        fw: { application: { version: '1.2.3' } },
        status: { init_states: true },
      }
    );

    const features = await device.unlockDevice();

    expect(typedCall.mock.calls).toEqual([
      ['DeviceSessionAskPin', 'DeviceSessionPinResult'],
      ['DeviceStatusGet', 'DeviceStatus', {}],
    ]);
    expect(typedCall).not.toHaveBeenCalledWith('GetAddress', 'Address', expect.anything());
    expect(typedCall).not.toHaveBeenCalledWith('GetFeatures', 'Features', {});
    expect(features).toMatchObject({
      deviceType: 'pro2',
      deviceId: 'PRO2-DEVICE-ID',
      firmwareVersion: '1.2.3',
      unlocked: true,
      passphraseProtection: true,
    });
  });

  test('syncs Protocol V2 features passphrase state from DeviceStatusGet after unlock', async () => {
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
          type: 'DeviceSessionPinResult',
          message: {
            unlocked: false,
            unlocked_attach_pin: false,
            passphrase_protection: false,
          },
        };
      }
      if (requestType === 'DeviceStatusGet') {
        return {
          type: 'DeviceStatus',
          message: {
            unlocked: true,
            unlocked_by_attach_to_pin: true,
            passphrase_enabled: true,
          },
        };
      }
      throw new Error(`Unexpected request: ${requestType}`);
    });
    (device as any).commands = { typedCall };

    await device.unlockDevice();

    expect((device as any).profile).toBeUndefined();
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
    expect(typedCall.mock.calls).toEqual([['DeviceSessionAskPin', 'DeviceSessionPinResult']]);
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

    expect(
      isMethodVersionRangeUnsupported(
        getMethodVersionRange(features, type => tronMethod.getVersionRange()[type])
      )
    ).toBe(false);
    expect(
      isMethodVersionRangeUnsupported(
        getMethodVersionRange(features, type => solMethod.getVersionRange()[type])
      )
    ).toBe(false);
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

  test('returns a typed unsupported error for Dynex signing on Protocol V2', async () => {
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
    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      features: normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
    });

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotSupportMethod,
    });
  });

  test('returns a typed unsupported error for Dynex address on Protocol V2', async () => {
    const method = new DnxGetAddress({
      id: 1,
      payload: {
        method: 'dnxGetAddress',
        path: "m/44'/29538'/0'/0/0",
        showOnOneKey: false,
      },
    });

    method.init();
    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
      features: normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
    });

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotSupportMethod,
    });
  });
});

describe('Protocol V2 firmware update targets', () => {
  const OKPP_HEADER_SIZE = 0x52a0;

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

  test('keeps Protocol V2 firmware updates off the firmwareUpdateV3 path', async () => {
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
      },
    });
    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V2' },
    });

    await expect(method.run()).rejects.toThrow('firmwareUpdateV4');
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
      return Promise.reject(new Error(`unexpected call ${name}`));
    });
    const commands = { typedCall };

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
    // 更新完成判定使用 VERSIONS 请求（含 SE targets），scope 与请求内容一致
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
          status: true,
        },
        types: {
          version: true,
          specific: true,
        },
      },
      { timeoutMs: 5000 }
    );
    expect(typedCall).toHaveBeenCalledTimes(1);
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
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceInfo',
      message: protocolV2BootloaderDeviceInfo,
    });
    const reconnectProtocolV2Device = jest.fn().mockImplementation(() => {
      (method as any).device.isBootloader = () => true;
      return Promise.resolve();
    });
    (method as any).reconnectProtocolV2Device = reconnectProtocolV2Device;
    (method as any).device.getCommands = () => ({ typedCall });
    method.postTipMessage = jest.fn();

    await (method as any).enterProtocolV2BootloaderMode();

    expect(method.postTipMessage).toHaveBeenCalledWith('AutoRebootToBootloader');
    expect((method as any).protocolV2Reboot).toHaveBeenCalledWith(DeviceRebootType.Bootloader);
    expect(method.postTipMessage).toHaveBeenCalledWith('GoToBootloaderSuccess');
    expect((method as any).checkDeviceToBootloader).not.toHaveBeenCalled();
    expect(reconnectProtocolV2Device).toHaveBeenCalledTimes(1);
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
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceInfo',
      message: protocolV2BootloaderDeviceInfo,
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

    await (method as any).waitForProtocolV2BootloaderMode(60 * 1000, 0);

    expect(reconnectProtocolV2Device).toHaveBeenCalledTimes(3);
    expect(typedCall).toHaveBeenCalledTimes(1);
  });

  test('reboots Protocol V2 firmware flow back to normal after install status is finished', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    method.postTipMessage = jest.fn();
    (method as any).protocolV2Reboot = jest.fn().mockResolvedValue({
      message: 'Device rebooted successfully',
    });

    await (method as any).exitProtocolV2BootloaderToNormal();

    expect(method.postTipMessage).toHaveBeenCalledWith('SwitchFirmwareReconnectDevice');
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

  test('treats WebUSB open NotFoundError during Protocol V2 firmware update as expected disconnect', async () => {
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

    await expect(
      (method as any).protocolV2StartFirmwareUpdate({
        targets: [{ target_id: 4, path: 'vol1:firmware.bin' }],
      })
    ).resolves.toBeUndefined();

    expect(method.postTipMessage).toHaveBeenCalledWith('FirmwareUpdating');
  });

  test('continues Protocol V2 install polling when update request transfer times out', async () => {
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

    await expect(
      (method as any).protocolV2StartFirmwareUpdate({
        targets: [{ target_id: 4, path: 'vol1:application_p1.bin' }],
      })
    ).resolves.toBeUndefined();

    expect(method.postTipMessage).toHaveBeenCalledWith('FirmwareUpdating');
  });

  test('continues Protocol V2 install polling through temporary expected V2 probe failures', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockImplementation((name: string) => {
      if (name === 'DeviceFirmwareUpdateStatusGet') {
        const callCount = typedCall.mock.calls.filter(call => call[0] === name).length;
        if (callCount === 1) {
          return Promise.reject(
            new Error(
              'Device protocol mismatch: expected V2, but device did not respond to expected protocol'
            )
          );
        }
        return Promise.resolve({
          type: 'DeviceFirmwareUpdateStatus',
          message: {
            records: [{ target_id: 6, status: 2 }],
          },
        });
      }
      if (name === 'DeviceInfoGet') {
        return Promise.reject(new Error('DeviceInfo not ready'));
      }
      if (name === 'Ping') {
        return Promise.resolve({ type: 'Success', message: { message: 'ready' } });
      }
      return Promise.reject(new Error(`unexpected call ${name}`));
    });
    const reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    (method as any).reconnectProtocolV2Device = reconnectProtocolV2Device;
    method.postProgressMessage = jest.fn();

    await (method as any).waitForProtocolV2FirmwareUpdateComplete([
      { target_id: 6, path: 'vol1:ble-firmware.bin' },
    ]);

    expect(reconnectProtocolV2Device).toHaveBeenCalledTimes(1);
    expect(typedCall.mock.calls.map(call => call[0])).toEqual([
      'DeviceFirmwareUpdateStatusGet',
      'DeviceInfoGet',
      'Ping',
      'DeviceFirmwareUpdateStatusGet',
    ]);
  });

  test('treats Protocol V2 normal mode after reconnect as firmware update complete', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockImplementation((name: string) => {
      if (name === 'DeviceFirmwareUpdateStatusGet') {
        return Promise.reject(new Error('Device disconnected'));
      }
      if (name === 'DeviceInfoGet') {
        return Promise.resolve({
          type: 'DeviceInfo',
          message: {
            hw: { serial_no: 'PR9999999999' },
            fw: {
              bootloader: { version: '9.9.9' },
              application: { version: '9.9.9' },
            },
            status: {
              device_id: 'PRO2-DEVICE-ID',
              init_states: true,
            },
          },
        });
      }
      return Promise.reject(new Error(`unexpected call ${name}`));
    });
    const reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);
    const updateProtocolV2Features = jest.fn((deviceInfo: ProtocolV2DeviceInfo) =>
      normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any, deviceInfo)
    );

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
      updateProtocolV2Features,
    });
    (method as any).reconnectProtocolV2Device = reconnectProtocolV2Device;
    method.postProgressMessage = jest.fn();

    await expect(
      (method as any).waitForProtocolV2FirmwareUpdateComplete([
        { target_id: 3, path: 'vol1:bootloader.bin' },
        { target_id: 4, path: 'vol1:application_p1.bin' },
      ])
    ).resolves.toBeUndefined();

    expect(reconnectProtocolV2Device).toHaveBeenCalledTimes(1);
    expect(updateProtocolV2Features).toHaveBeenCalledTimes(1);
    expect(typedCall.mock.calls.map(call => call[0])).toEqual([
      'DeviceFirmwareUpdateStatusGet',
      'DeviceInfoGet',
    ]);
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

    expect(
      (method as any).assertProtocolV2TargetStatus([{ target_id: 4, status: 1 }], expectedTargetIds)
    ).toBe(false);
    expect(
      (method as any).assertProtocolV2TargetStatus(
        [{ target_id: 4, status: 'FW_MGMT_UPDATER_TASK_STATUS_IN_PROGRESS' }],
        expectedTargetIds
      )
    ).toBe(false);
    expect(method.postProgressMessage).toHaveBeenCalledWith(99, 'installingFirmware');

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
        [{ target_id: 4, status: 'FW_MGMT_UPDATER_TASK_STATUS_FAILED_VERIFY' }],
        expectedTargetIds
      );
      throw new Error('Expected Protocol V2 failed firmware status to throw');
    } catch (error: any) {
      expect(error.errorCode).toBe(HardwareErrorCode.FirmwareError);
    }
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

  test('maps remote Pro2 resource bundles to direct-write descriptors', () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
        platform: 'web',
      },
    });
    method.init();

    const getFirmwareLatestReleaseSpy = jest
      .spyOn(DataManager, 'getFirmwareLatestRelease')
      .mockReturnValue({
        required: false,
        version: [1, 0, 0],
        url: '',
        resourceBundles: [
          {
            name: 'images',
            url: 'https://example.com/images.okpkg',
            devicePath: 'vol0:/resource/images/images.okpkg',
            version: [2, 0, 0],
            payloadHash: 'ab'.repeat(64),
            headerHash: 'cd'.repeat(64),
          },
        ],
        fingerprint: '',
        changelog: {
          'zh-CN': '',
          'en-US': '',
        },
      });

    const bundles = (method as any).prepareProtocolV2ResourceBundles('universal', {
      deviceType: 'pro2',
      firmwareVersion: '1.0.0',
      capabilities: [],
    });

    expect(bundles).toEqual([
      {
        name: 'images',
        binary: expect.any(ArrayBuffer),
        devicePath: 'vol0:/resource/images/images.okpkg',
        url: 'https://example.com/images.okpkg',
        version: [2, 0, 0],
        payloadHash: 'ab'.repeat(64),
        headerHash: 'cd'.repeat(64),
      },
    ]);
    expect(bundles[0].binary.byteLength).toBe(0);

    getFirmwareLatestReleaseSpy.mockRestore();
  });

  test('skips Pro2 firmware components when configured versions are already installed', async () => {
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

    expect((method as any).prepareRemoteProtocolV2Binaries).toHaveBeenCalledTimes(1);
    expect((method as any).executeProtocolV2Update).toHaveBeenCalledWith({
      bootloaderBinary: remoteBinaries.bootloaderBinary,
      fwBinaryMap: remoteBinaries.fwBinaryMap,
    });
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
            devicePath: 'vol0:/resource/images/images.okpkg',
          },
        ],
      },
    });
    method.init();

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

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
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
  });

  test('continues to DeviceFirmwareUpdate when FilesystemFileWrite returns processed chunk length', async () => {
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
      if (name === 'FilesystemPathInfoQuery') {
        return Promise.resolve({
          type: 'FilesystemPathInfo',
          message: { exist: true, directory: false, size: 4097 },
        });
      }
      if (name === 'DeviceFirmwareUpdateRequest') {
        return Promise.resolve({ type: 'Success', message: { message: 'ok' } });
      }
      if (name === 'DeviceFirmwareUpdateStatusGet') {
        return Promise.resolve({
          type: 'DeviceFirmwareUpdateStatus',
          message: {
            records: [{ target_id: 4, status: 2 }],
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

    await (method as any).executeProtocolV2Update({
      bootloaderBinary: null,
      fwBinaryMap: [
        {
          fileName: 'firmware.bin',
          binary: new Uint8Array(4097).buffer,
          targetId: 4,
        },
      ],
    });

    expect(typedCall).toHaveBeenCalledWith(
      'DeviceFirmwareUpdateRequest',
      ['Success', 'DeviceFirmwareUpdateStatus'],
      {
        targets: [{ target_id: 4, path: 'vol0:/firmware.bin' }],
      },
      expect.objectContaining({
        timeoutMs: 3 * 60 * 1000,
      })
    );
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

  test('consumes Protocol V2 install progress before final update success', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockResolvedValue({ type: 'Success', message: { message: 'ok' } });

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    method.postProgressMessage = jest.fn();
    method.postTipMessage = jest.fn();

    await (method as any).protocolV2StartFirmwareUpdate({
      targets: [{ target_id: 4, path: 'vol1:firmware.bin' }],
    });

    const callOptions = typedCall.mock.calls[0][3];
    expect(typedCall.mock.calls[0][1]).toEqual(['Success', 'DeviceFirmwareUpdateStatus']);
    expect(callOptions.intermediateTypes).toEqual(['DeviceFirmwareUpdateStatus']);
    callOptions.onIntermediateResponse({
      type: 'DeviceFirmwareUpdateStatus',
      message: { records: [{ target_id: 4, status: 1 }] },
    });

    expect(method.postProgressMessage).toHaveBeenCalledWith(99, 'installingFirmware');
  });

  test('accepts Protocol V2 firmware update status as start response', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DeviceFirmwareUpdateStatus',
      message: { records: [{ target_id: 4, status: 1 }] },
    });

    (method as any).device = stubDevice({
      getCommands: () => ({ typedCall }),
    });
    method.postProgressMessage = jest.fn();
    method.postTipMessage = jest.fn();

    await (method as any).protocolV2StartFirmwareUpdate({
      targets: [{ target_id: 4, path: 'vol1:firmware.bin' }],
    });

    expect(typedCall.mock.calls[0][1]).toEqual(['Success', 'DeviceFirmwareUpdateStatus']);
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
    (method as any).device = stubDevice({ commands: { typedCall } });

    await method.run();

    expect(typedCall).toHaveBeenCalledWith('DeviceReboot', 'Success', {
      reboot_type: 2,
    });
  });
});

describe('Protocol V2 current low-level methods', () => {
  test('sends ProtocolInfoRequest from protocolInfoRequest', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: { version: 1 } });
    const method = new ProtocolInfoRequest({
      id: 1,
      payload: { method: 'protocolInfoRequest' },
    });
    method.init();
    (method as any).device = stubDevice({ commands: { typedCall } });

    await method.run();

    expect(typedCall).toHaveBeenCalledWith('ProtocolInfoRequest', 'ProtocolInfo', {});
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
        targets: { hw: true, fw: true, coprocessor: true, status: true },
        types: { version: true, specific: true },
      },
      { timeoutMs: PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS }
    );
  });

  test('rejects on Protocol V1 devices instead of sending an unknown message', async () => {
    const method = buildMethod();
    const typedCall = jest.fn();
    (method as any).device = stubDevice({
      originalDescriptor: { protocolType: 'V1' },
      commands: { typedCall },
    });

    await expect(method.run()).rejects.toThrow();
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
    const typedCall = jest.fn().mockResolvedValue({ message: { processed_byte: 1 } });
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
