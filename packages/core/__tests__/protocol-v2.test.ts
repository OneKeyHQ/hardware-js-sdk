import JSZip from 'jszip';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import { DevRebootType } from '@onekeyfe/hd-transport';

import ConfluxSignTransaction from '../src/api/conflux/ConfluxSignTransaction';
import DnxGetAddress from '../src/api/dynex/DnxGetAddress';
import DnxSignTransaction from '../src/api/dynex/DnxSignTransaction';
import DirList from '../src/api/DirList';
import FileRead from '../src/api/FileRead';
import FileWrite from '../src/api/FileWrite';
import DeviceFirmwareUpdate from '../src/api/protocol-v2/DeviceFirmwareUpdate';
import DeviceGetOnboardingStatus from '../src/api/protocol-v2/DeviceGetOnboardingStatus';
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
import TronSignMessage from '../src/api/tron/TronSignMessage';
import XrpSignTransaction from '../src/api/xrp/XrpSignTransaction';
import StellarGetAddress from '../src/api/stellar/StellarGetAddress';
import BenfenSignMessage from '../src/api/benfen/BenfenSignMessage';
import { getBitcoinForkVersionRange } from '../src/api/btc/helpers/versionLimit';
import { DataManager } from '../src/data-manager';
import { Device } from '../src/device/Device';
import { UI_REQUEST } from '../src/events/ui-request';
import {
  PROTOCOL_V2_DEVICE_INFO_TIMEOUT_MS,
  buildProtocolV2FeaturesFromProfile,
  requestProtocolV2LegacyFeatures,
} from '../src/protocols/protocol-v2/features';
import { buildProfileFromProtocolV2 } from '../src/deviceProfile';
import { getMethodVersionRange, isMethodVersionRangeUnsupported } from '../src/utils';
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

function normalizeProtocolV2Features(_descriptor: unknown, deviceInfo?: ProtocolV2DeviceInfo) {
  const profile = buildProfileFromProtocolV2({
    deviceInfo,
    sources: ['deviceInfo'],
    scope: 'verify',
  });
  return buildProtocolV2FeaturesFromProfile(profile, deviceInfo);
}

describe('Protocol V2 feature adapter', () => {
  test('normalizes Protocol V2 DeviceInfo into existing Features fields', () => {
    const features = normalizeProtocolV2Features(descriptor as any, {
      protocol_version: 1,
      hw: {
        serial_no: 'PR2SERIAL',
      },
      fw: {
        board: {
          version: '0.1.0',
          hash: [1, 2, 255],
        },
        boot: {
          version: '0.2.0',
          build_id: 'boot-build',
          hash: new Uint8Array([10, 11]),
        },
        app: {
          version: '1.2.3',
          build_id: 'app-build',
          hash: 'abc123',
        },
      },
      bt: {
        app: {
          version: '4.5.6',
          build_id: 'bt-build',
          hash: [12, 13],
        },
        adv_name: 'Pro2 BLE',
      },
      se1: {
        app: {
          version: '7.8.9',
          build_id: 'se-build',
          hash: [14, 15],
        },
        state: 85,
      },
      se2: {
        app: {
          version: '8.0.0',
        },
        state: 0,
      },
      status: {
        label: 'My Pro2',
        language: 'en-US',
        bt_enable: true,
        init_states: false,
        backup_required: true,
        passphrase_protection: true,
      },
    });

    expect(features.device_id).toBe('PR2SERIAL');
    expect(features.serial_no).toBe('PR2SERIAL');
    expect(features.onekey_serial_no).toBe('PR2SERIAL');
    expect(features.onekey_device_type).toBe('pro2');
    expect(features.protocol_version).toBe(1);
    expect(features.major_version).toBe(1);
    expect(features.minor_version).toBe(2);
    expect(features.patch_version).toBe(3);
    expect(features.onekey_firmware_version).toBe('1.2.3');
    expect(features.onekey_firmware_build_id).toBe('app-build');
    expect(features.onekey_firmware_hash).toBe('abc123');
    expect(features.bootloader_version).toBe('0.2.0');
    expect(features.onekey_boot_build_id).toBe('boot-build');
    expect(features.onekey_boot_hash).toBe('0a0b');
    expect(features.onekey_board_hash).toBe('0102ff');
    expect(features.ble_name).toBe('Pro2 BLE');
    expect(features.onekey_ble_version).toBe('4.5.6');
    expect(features.onekey_ble_hash).toBe('0c0d');
    expect(features.onekey_se01_version).toBe('7.8.9');
    expect(features.onekey_se01_hash).toBe('0e0f');
    expect(features.onekey_se01_state).toBe('APP');
    expect(features.onekey_se02_state).toBe('BOOT');
    expect(features.label).toBe('My Pro2');
    expect(features.language).toBe('en-US');
    expect(features.initialized).toBe(false);
    expect(features.needs_backup).toBe(true);
    expect(features.passphrase_protection).toBe(true);
    expect(features.ble_enable).toBe(true);
  });

  test('uses GetPassphraseState payloads compatible with Pro series passphrase flow', async () => {
    const features = normalizeProtocolV2Features(descriptor as any);
    features.onekey_firmware_version = '4.15.0';
    const typedCall = jest.fn().mockResolvedValue({
      type: 'PassphraseState',
      message: {
        passphrase_state: 'state-1',
        session_id: 'session-1',
        unlocked_attach_pin: false,
      },
    });
    const commands = { typedCall } as unknown as DeviceCommands;

    await getPassphraseState(features, commands, {
      expectPassphraseState: 'state-1',
    });
    expect(typedCall).toHaveBeenLastCalledWith('GetPassphraseState', 'PassphraseState', {
      passphrase_state: 'state-1',
    });

    await getPassphraseState(features, commands, {
      expectPassphraseState: 'state-2',
      allowCreateAttachPin: true,
    });
    expect(typedCall).toHaveBeenLastCalledWith('GetPassphraseState', 'PassphraseState', {
      passphrase_state: 'state-2',
      allow_create_attach_pin: true,
    });

    await getPassphraseState(features, commands, {
      onlyMainPin: true,
    });
    expect(typedCall).toHaveBeenLastCalledWith('GetPassphraseState', 'PassphraseState', {
      _only_main_pin: true,
    });
  });

  test('returns unified GetPassphraseState object payload for existing Pro devices', async () => {
    const features = {
      device_id: 'pro-device-id',
      onekey_device_type: 'PRO',
      onekey_firmware_version: '4.15.0',
      passphrase_protection: true,
      session_id: 'feature-session',
      unlocked_attach_pin: true,
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
    method.device = {
      features,
      commands: { typedCall },
      updateInternalState,
      getCurrentDeviceType: () => 'PRO',
      getCurrentDeviceId: () => 'pro-device-id',
      getCurrentPassphraseProtection: () => true,
    } as any;

    await expect(method.run()).resolves.toEqual({
      passphrase_state: 'state-pro',
      session_id: 'session-pro',
      unlocked_attach_pin: false,
      passphrase_protection: true,
    });
    expect(updateInternalState).toHaveBeenCalledWith(
      true,
      'state-pro',
      'pro-device-id',
      'session-pro',
      'feature-session'
    );
  });

  test('prefers DeviceProfile for GetPassphraseState response metadata', async () => {
    const features = {
      device_id: 'legacy-pro-device-id',
      onekey_device_type: 'PRO',
      onekey_firmware_version: '4.15.0',
      passphrase_protection: false,
      session_id: 'feature-session',
      unlocked_attach_pin: true,
    };
    const typedCall = jest.fn().mockResolvedValue({
      type: 'PassphraseState',
      message: {
        passphrase_state: 'state-pro2',
        session_id: 'session-pro2',
        unlocked_attach_pin: false,
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
    method.device = {
      features,
      profile: {
        protocol: 'V2',
        sources: ['deviceInfo'],
        deviceType: 'pro2',
        firmwareType: 'universal',
        deviceId: 'PR2SERIAL',
        serialNo: 'PR2SERIAL',
        label: null,
        bleName: null,
        status: {
          mode: 'normal',
          initialized: true,
          bootloaderMode: false,
          unlocked: null,
          passphraseProtection: true,
          backupRequired: false,
          noBackup: null,
          language: null,
        },
        versions: {
          firmware: '4.15.0',
          bootloader: null,
          board: null,
          ble: null,
        },
      },
      commands: { typedCall },
      updateInternalState,
      getFeatures,
      getCurrentDeviceType: () => 'pro2',
      getCurrentDeviceId: () => 'PR2SERIAL',
      getCurrentPassphraseProtection: () => true,
    } as any;

    await expect(method.run()).resolves.toEqual({
      passphrase_state: 'state-pro2',
      session_id: 'session-pro2',
      unlocked_attach_pin: false,
      passphrase_protection: true,
    });
    expect(getFeatures).not.toHaveBeenCalled();
  });

  test('uses DeviceProfile identity for Pro2 passphrase session cache', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'PassphraseState',
      message: {
        passphrase_state: 'state-profile',
        session_id: 'session-profile',
        unlocked_attach_pin: false,
      },
    });

    (device as any).features = {
      ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any, {
        fw: { app: { version: '4.15.0' } },
        status: { passphrase_protection: true },
      }),
      device_id: 'LEGACY-ID',
      unlocked: true,
    };
    device.updateProfile({
      protocol: 'V2',
      sources: ['deviceInfo'],
      deviceType: 'pro2',
      firmwareType: 'universal',
      deviceId: 'PR2SERIAL',
      serialNo: 'PR2SERIAL',
      label: null,
      bleName: null,
      status: {
        mode: 'normal',
        initialized: true,
        bootloaderMode: false,
        unlocked: null,
        passphraseProtection: true,
        backupRequired: false,
        noBackup: null,
        language: null,
      },
      versions: {
        firmware: '4.15.0',
        bootloader: null,
        board: null,
        ble: null,
      },
    });
    (device as any).commands = { typedCall };

    await getPassphraseStateWithRefreshDeviceInfo(device);

    device.passphraseState = 'state-profile';
    expect(device.getInternalState()).toBe('session-profile');
    expect(device.getInternalState('LEGACY-ID')).toBeUndefined();
  });

  test('stores Pro2 passphrase sessions without selecting them implicitly', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'PassphraseState',
      message: {
        passphrase_state: 'state-auto',
        session_id: 'session-auto',
        unlocked_attach_pin: false,
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
    (device as any).features.onekey_firmware_version = '4.15.0';
    (device as any).features.passphrase_protection = true;
    (device as any).features.unlocked = true;
    (device as any).commands = { typedCall };

    await expect(getPassphraseStateWithRefreshDeviceInfo(device)).resolves.toMatchObject({
      passphraseState: 'state-auto',
      newSession: 'session-auto',
    });

    expect(device.passphraseState).toBeUndefined();
    expect(device.features?.passphrase_protection).toBe(true);
    expect(device.features?.session_id).toBeNull();
    expect(device.getInternalState()).toBeUndefined();
    device.passphraseState = 'state-auto';
    expect(device.getInternalState()).toBe('session-auto');
    expect(typedCall).toHaveBeenLastCalledWith('GetPassphraseState', 'PassphraseState', {
      passphrase_state: undefined,
    });
  });

  test('does not mark Pro2 passphrase enabled from a main PIN session alone', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'PassphraseState',
      message: {
        session_id: 'main-pin-session',
        unlocked_attach_pin: false,
      },
    });

    (device as any).features = normalizeProtocolV2Features(
      {
        ...descriptor,
        protocolType: 'V2',
      } as any,
      {
        status: {
          passphrase_protection: false,
        },
      }
    );
    (device as any).features.onekey_firmware_version = '4.15.0';
    (device as any).features.unlocked = true;
    (device as any).commands = { typedCall };

    await expect(
      getPassphraseStateWithRefreshDeviceInfo(device, { onlyMainPin: true })
    ).resolves.toMatchObject({
      passphraseState: undefined,
      newSession: 'main-pin-session',
    });

    expect(device.features?.passphrase_protection).toBe(false);
    expect(device.features?.session_id).toBeNull();
    expect(device.getInternalState()).toBeUndefined();
    expect(typedCall).toHaveBeenLastCalledWith('GetPassphraseState', 'PassphraseState', {
      _only_main_pin: true,
    });
  });

  test('does not let skipPassphraseCheck hide Pro2 passphrase state mismatch', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    const typedCall = jest.fn().mockResolvedValue({
      type: 'PassphraseState',
      message: {
        passphrase_state: 'wrong-state',
        session_id: 'wrong-session',
        unlocked_attach_pin: false,
      },
    });

    (device as any).features = normalizeProtocolV2Features({
      ...descriptor,
      protocolType: 'V2',
    } as any);
    (device as any).features.onekey_firmware_version = '4.15.0';
    (device as any).features.passphrase_protection = true;
    (device as any).commands = { typedCall };

    await expect(device.checkPassphraseStateSafety('expected-state', false, true)).resolves.toBe(
      false
    );

    expect(device.getInternalState()).toBeUndefined();
    expect(typedCall).toHaveBeenNthCalledWith(1, 'GetPassphraseState', 'PassphraseState', {
      passphrase_state: 'expected-state',
    });
  });

  test('marks fallback features as unavailable when DeviceInfo is missing', () => {
    const features = normalizeProtocolV2Features(descriptor as any);

    expect(features.device_id).toBe('');
    expect(features.serial_no).toBe('');
    expect(features.onekey_serial_no).toBe('');
    expect(features.initialized).toBe(false);
    expect(features.unlocked).toBe(false);
    expect(features.firmware_present).toBe(false);
  });

  test('uses Protocol V2 DeviceInfo serial_no as device_id instead of descriptor id', () => {
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

    expect(features.device_id).toBe('PR9999999999');
    expect(features.onekey_serial_no).toBe('PR9999999999');
    expect(features.serial_no).toBe('PR9999999999');
  });

  test('does not expose legacy feature ids when Protocol V2 profile is incomplete', () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = {
      ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
      device_id: 'LEGACY-ID',
      serial_no: 'LEGACY-SERIAL',
      label: 'Legacy Label',
      ble_name: 'Legacy BLE',
      passphrase_protection: true,
    };
    device.updateProfile({
      protocol: 'V2',
      sources: ['deviceInfo'],
      deviceType: 'pro2',
      firmwareType: 'universal',
      deviceId: '',
      serialNo: '',
      label: null,
      bleName: null,
      status: {
        mode: 'normal',
        initialized: true,
        bootloaderMode: false,
        unlocked: null,
        passphraseProtection: null,
        backupRequired: false,
        noBackup: null,
        language: null,
      },
      versions: {
        firmware: null,
        bootloader: null,
        board: null,
        ble: null,
      },
    });

    expect(device.toMessageObject()).toMatchObject({
      uuid: '',
      deviceId: null,
      bleName: null,
      label: 'OneKey',
      deviceType: 'pro2',
    });
    expect(device.getCurrentPassphraseProtection()).toBeNull();
    expect(device.hasUsePassphrase()).toBe(false);
    expect(device.isInitialized()).toBe(true);
    expect(device.getMode()).toBe('normal');
    expect(device.getFirmwareVersion()).toBeNull();
  });

  test('keeps Protocol V2 cached profile as identity source when syncing legacy features', () => {
    const cached = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (cached as any).features = {
      ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
      device_id: 'LEGACY-ID',
      serial_no: 'LEGACY-SERIAL',
      onekey_serial_no: 'LEGACY-SERIAL',
    };
    cached.updateProfile({
      protocol: 'V2',
      sources: ['deviceInfo'],
      deviceType: 'pro2',
      firmwareType: 'universal',
      deviceId: '',
      serialNo: '',
      label: null,
      bleName: null,
      status: {
        mode: 'normal',
        initialized: true,
        bootloaderMode: false,
        unlocked: null,
        passphraseProtection: null,
        backupRequired: false,
        noBackup: null,
        language: null,
      },
      versions: {
        firmware: null,
        bootloader: null,
        board: null,
        ble: null,
      },
    });

    const current = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    current.updateFromCache(cached);

    expect(current.getCurrentDeviceId()).toBeUndefined();
    expect(current.getCurrentSerialNo()).toBe('');
    expect(current.toMessageObject()).toMatchObject({
      uuid: '',
      deviceId: null,
    });
  });

  test('initializes Protocol V2 features from lightweight DevGetDeviceInfo', async () => {
    const commands = {
      typedCall: jest.fn().mockResolvedValueOnce({
        type: 'DeviceInfo',
        message: {
          hw: { serial_no: 'PR2SERIAL' },
          status: {
            init_states: true,
            passphrase_protection: true,
          },
        },
      }),
    };

    const features = await requestProtocolV2LegacyFeatures({
      commands: commands as unknown as DeviceCommands,
      descriptor: descriptor as any,
    });

    expect(features.device_id).toBe('PR2SERIAL');
    expect(features.initialized).toBe(true);
    expect(features.passphrase_protection).toBe(true);
    expect(commands.typedCall).toHaveBeenCalledTimes(1);
    expect(commands.typedCall).toHaveBeenNthCalledWith(
      1,
      'DevGetDeviceInfo',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          bt: true,
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

  test('fails initialization when Protocol V2 DevGetDeviceInfo fails', async () => {
    const commands = {
      typedCall: jest.fn().mockRejectedValueOnce(new Error('DeviceInfo not supported')),
    };

    await expect(
      requestProtocolV2LegacyFeatures({
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
          app: {
            version: '5.6.7',
          },
        },
        bt: {
          app: {
            version: '8.9.10',
          },
          adv_name: 'Raw Pro2 BLE',
        },
        status: {
          init_states: true,
          label: 'Raw Pro2',
          passphrase_protection: true,
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
    (method as any).device = {
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features: {
        ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
        device_id: 'LEGACY-ID',
        serial_no: 'LEGACY-SERIAL',
        label: 'Legacy Pro2',
        onekey_firmware_version: '1.2.3',
        onekey_ble_version: '2.3.4',
      },
      commands: { typedCall },
      _updateFeatures: jest.fn(),
      updateProfile: jest.fn(),
    };

    const result = await method.run();

    expect(typedCall).toHaveBeenCalledWith(
      'DevGetDeviceInfo',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          bt: true,
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
      deviceId: 'PR2SERIAL',
      serialNo: 'PR2SERIAL',
      label: 'Raw Pro2',
      bleName: 'Raw Pro2 BLE',
      status: {
        initialized: true,
        passphraseProtection: true,
      },
      versions: {
        firmware: '5.6.7',
        ble: '8.9.10',
      },
    });
  });

  test('does not fill Protocol V2 DeviceProfile from legacy features', async () => {
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
    (method as any).device = {
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features: {
        ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
        device_id: 'LEGACY-ID',
        serial_no: 'LEGACY-SERIAL',
        label: 'Legacy Pro2',
        ble_name: 'Legacy BLE',
        passphrase_protection: true,
        onekey_firmware_version: '1.2.3',
        onekey_ble_version: '2.3.4',
      },
      commands: { typedCall },
      updateProfile: jest.fn(),
    };

    const result = await method.run();

    expect(result).toMatchObject({
      protocol: 'V2',
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
    (method as any).device = {
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features: normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
      commands: { typedCall },
      _updateFeatures: jest.fn(),
    };

    await method.run();

    expect(typedCall).toHaveBeenCalledWith(
      'DevGetDeviceInfo',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          bt: true,
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
          app: { version: '1.0.1' },
          boot: { version: '1.0.0' },
        },
        se2: {
          app: { version: '2.0.1' },
          boot: { version: '2.0.0' },
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
    (method as any).device = {
      originalDescriptor: { ...descriptor, protocolType: 'V2' },
      features: normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
      commands: { typedCall },
      updateProfile: jest.fn(),
    };

    const result = await method.run();

    expect(typedCall).toHaveBeenCalledWith(
      'DevGetDeviceInfo',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          bt: true,
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

  test('marks known unsupported public-chain methods as unsupported on Protocol V2', () => {
    const features = normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any, {
      fw: {
        app: {
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

  test('does not block legacy batch public key support checks on Protocol V2', async () => {
    const paths = [{ address_n: [0x8000002c, 0x80000000, 0x80000000] }] as any;
    const typedCall = jest.fn().mockResolvedValue({
      type: 'EcdsaPublicKeys',
      message: {
        root_fingerprint: 123,
        public_keys: [],
        hd_nodes: [{}],
      },
    });
    const device = {
      originalDescriptor: { protocolType: 'V2' },
      features: normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any, {
        fw: {
          app: {
            version: '4.14.0',
          },
        },
      }),
      commands: { typedCall },
      getCurrentDeviceType: () => 'pro2',
    };

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

  test('returns Protocol V2 oneKey fields without calling legacy OnekeyGetFeatures', async () => {
    const method = new GetOnekeyFeatures({
      id: 1,
      payload: {
        method: 'getOnekeyFeatures',
      },
    });
    const typedCall = jest.fn();

    (method as any).device = {
      originalDescriptor: { protocolType: 'V2' },
      commands: { typedCall },
      features: {
        label: 'ignored label',
        onekey_device_type: 'pro2',
        onekey_firmware_version: '1.2.3',
        onekey_firmware_build_id: 'app-build',
        onekey_serial_no: 'PR2SERIAL',
        onekey_ble_name: 'Pro2 BLE',
      },
    };

    const message = await method.run();

    expect(typedCall).not.toHaveBeenCalled();
    expect(message).toMatchObject({
      onekey_device_type: 'pro2',
      onekey_firmware_version: '1.2.3',
      onekey_firmware_build_id: 'app-build',
      onekey_serial_no: 'PR2SERIAL',
      onekey_ble_name: 'Pro2 BLE',
    });
    expect(message).not.toHaveProperty('label');
  });

  test('reuses cached Protocol V2 features after the first initialization', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const typedCall = jest.fn().mockResolvedValueOnce({
      type: 'DeviceInfo',
      message: {
        hw: { serial_no: 'PR2SERIAL' },
        status: {
          passphrase_protection: true,
        },
      },
    });

    (device as any).commands = { typedCall };

    await device.initialize();
    await device.initialize();

    expect(device.features?.device_id).toBe('PR2SERIAL');
    expect(device.features?.passphrase_protection).toBe(true);
    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'DevGetDeviceInfo',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          bt: true,
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

  test('refreshes Protocol V2 features without falling back to legacy GetFeatures', async () => {
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
          fw: { app: { version: '1.2.3' } },
          status: { init_states: true },
        },
      })
      .mockResolvedValueOnce({
        type: 'DeviceInfo',
        message: {
          hw: { serial_no: 'PR2SERIAL' },
          fw: { app: { version: '1.2.4' } },
          status: { init_states: true, passphrase_protection: true },
        },
      });

    (device as any).commands = { typedCall };

    await device.initialize();
    await device.getFeatures();

    expect(device.features).toMatchObject({
      onekey_device_type: 'pro2',
      onekey_serial_no: 'PR2SERIAL',
      onekey_firmware_version: '1.2.4',
      passphrase_protection: true,
    });
    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall).toHaveBeenNthCalledWith(
      2,
      'DevGetDeviceInfo',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          bt: true,
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

  test('keeps Protocol V2 unlock fallback from overwriting Pro2 features with legacy features', async () => {
    const device = Device.fromDescriptor({
      path: 'usb-path',
      protocolType: 'V2',
    } as any);
    const typedCall = jest.fn().mockImplementation((type: string) => {
      if (type === 'GetAddress') {
        return Promise.resolve({
          type: 'Address',
          message: { address: 'test-address' },
        });
      }
      if (type === 'DevGetDeviceInfo') {
        return Promise.resolve({
          type: 'DeviceInfo',
          message: {
            hw: { serial_no: 'PR2SERIAL' },
            fw: { app: { version: '1.2.3' } },
            status: { init_states: true },
          },
        });
      }
      return Promise.resolve({
        type: 'Features',
        message: {
          device_id: 'LEGACY-PRO',
          onekey_device_type: 'PRO',
        },
      });
    });

    (device as any).commands = { typedCall };
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        hw: { serial_no: 'PR2SERIAL' },
        fw: { app: { version: '1.2.3' } },
        status: { init_states: true },
      }
    );

    await device.unlockDevice();

    expect(device.features).toMatchObject({
      onekey_device_type: 'pro2',
      device_id: 'PR2SERIAL',
      onekey_firmware_version: '1.2.3',
    });
    expect(typedCall).toHaveBeenCalledWith('GetAddress', 'Address', {
      address_n: [2147483692, 2147483649, 2147483648, 0, 0],
      coin_name: 'Testnet',
      script_type: 'SPENDADDRESS',
      show_display: false,
    });
    expect(typedCall).toHaveBeenCalledWith(
      'DevGetDeviceInfo',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          bt: true,
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

  test('syncs Protocol V2 profile passphrase state after unlock response', async () => {
    const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
    (device as any).features = normalizeProtocolV2Features(
      { ...descriptor, protocolType: 'V2' } as any,
      {
        hw: { serial_no: 'PR2SERIAL' },
        fw: { app: { version: '4.15.0' } },
        status: { passphrase_protection: false },
      }
    );
    device.updateProfile({
      protocol: 'V2',
      sources: ['deviceInfo'],
      deviceType: 'pro2',
      firmwareType: 'universal',
      deviceId: 'PR2SERIAL',
      serialNo: 'PR2SERIAL',
      label: null,
      bleName: null,
      status: {
        mode: 'normal',
        initialized: true,
        bootloaderMode: false,
        unlocked: null,
        passphraseProtection: false,
        backupRequired: false,
        noBackup: null,
        language: null,
      },
      versions: {
        firmware: '4.15.0',
        bootloader: null,
        board: null,
        ble: null,
      },
    });
    const typedCall = jest.fn().mockResolvedValue({
      type: 'UnLockDeviceResponse',
      message: {
        unlocked: true,
        passphrase_protection: true,
      },
    });
    (device as any).commands = { typedCall };

    await device.unlockDevice();

    expect(device.profile?.status.passphraseProtection).toBe(true);
    expect(device.features?.passphrase_protection).toBe(true);
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
    (method as any).device = {
      features: {
        onekey_device_type: 'pro2',
      },
      originalDescriptor: {
        protocolType: 'V2',
      },
    };

    await expect(method.run()).rejects.toEqual(
      expect.objectContaining({
        errorCode: HardwareErrorCode.DeviceNotSupportMethod,
      })
    );
  });

  test('returns a typed unsupported error for Tron sign message V1 before device binding', () => {
    const method = new TronSignMessage({
      id: 1,
      payload: {
        method: 'tronSignMessage',
        path: "m/44'/195'/0'/0/0",
        messageHex: '0x1234',
        messageType: 'V1',
      },
    });

    expect(() => method.init()).toThrow(
      expect.objectContaining({
        errorCode: HardwareErrorCode.DeviceNotSupportMethod,
      })
    );
  });

  test('does not mark Pro2 Tron, Solana, TON, SUI and Polkadot methods as unsupported', () => {
    const features = {
      onekey_device_type: 'pro2',
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
    ).toEqual({
      min: '0.0.0',
    });
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
      onekey_device_type: 'pro2',
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

  test('includes TON signData in the Protocol V2 protobuf schema', () => {
    const protocolV2Messages = DataManager.getProtobufMessages('v2Schema') as any;

    expect(protocolV2Messages.nested.TonSignData).toBeDefined();
    expect(protocolV2Messages.nested.TonSignedData).toBeDefined();
    expect(protocolV2Messages.nested.MessageType.values.MessageType_TonSignData).toBe(11908);
    expect(protocolV2Messages.nested.MessageType.values.MessageType_TonSignedData).toBe(11909);
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
    (method as any).device = {
      features: {
        onekey_device_type: 'pro2',
      },
      originalDescriptor: {
        protocolType: 'V2',
      },
      getCommands: () => ({
        typedCall,
      }),
    };

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

  test('accepts string XRP payment amount values', () => {
    const method = new XrpSignTransaction({
      id: 1,
      payload: {
        method: 'xrpSignTransaction',
        path: "m/44'/144'/0'/0/0",
        transaction: {
          fee: '100000',
          flags: 2147483648,
          sequence: 25,
          maxLedgerVersion: 8820051,
          payment: {
            amount: '100000000',
            destination: 'rBKz5MC2iXdoS3XgnNSYmF69K1Yo4NS3Ws',
          },
        },
      },
    });

    expect(() => method.init()).not.toThrow();
    expect(method.params.payment?.amount).toBe('100000000');
  });

  test('accepts Conflux base32 recipient addresses without hex formatting them', () => {
    const to = 'cfx:aak2rra2njvd77ezwjvx04kkds9fzagfe6ku8scz91';
    const method = new ConfluxSignTransaction({
      id: 1,
      payload: {
        method: 'confluxSignTransaction',
        path: "m/44'/503'/0'/0/0",
        transaction: {
          to,
          value: '0x0',
          data: '0x',
          chainId: 1,
          nonce: '0x00',
          epochHeight: '0x00',
          gasLimit: '0x5208',
          storageLimit: '0x5208',
          gasPrice: '0xbebc200',
        },
      },
    });

    expect(() => method.init()).not.toThrow();
    expect(method.formattedTx?.to).toBe(to);
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
    (method as any).device = {
      originalDescriptor: { protocolType: 'V2' },
      features: normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
    };

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
    (method as any).device = {
      originalDescriptor: { protocolType: 'V2' },
      features: normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any),
    };

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.DeviceNotSupportMethod,
    });
  });
});

describe('Protocol V2 firmware update targets', () => {
  test('keeps Protocol V2 firmware updates off the legacy firmwareUpdateV3 path', async () => {
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
      },
    });
    (method as any).device = {
      originalDescriptor: { protocolType: 'V2' },
    };

    await expect(method.run()).rejects.toThrow('firmwareUpdateV4');
  });

  test('uses Protocol V2 features after BLE final reconnect without legacy Initialize', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const acquire = jest.fn().mockResolvedValue({ uuid: 'ble-session' });
    const typedCall = jest.fn().mockImplementation((name: string) => {
      if (name === 'DevGetDeviceInfo') {
        return Promise.resolve({ type: 'DeviceInfo', message: {} });
      }
      return Promise.reject(new Error(`unexpected call ${name}`));
    });
    const commands = { typedCall };

    (method as any).isBleReconnect = jest.fn(() => true);
    (method as any).device = {
      originalDescriptor: { id: 'ble-id', path: 'ble-path', protocolType: 'V2' },
      deviceConnector: { acquire },
      getCommands: () => commands,
      _updateFeatures: jest.fn(),
    };

    const versions = await (method as any).waitForProtocolV2FinalFeatures();

    expect(acquire).toHaveBeenCalledWith('ble-id', null, true, 'V2');
    expect(typedCall).toHaveBeenNthCalledWith(
      1,
      'DevGetDeviceInfo',
      'DeviceInfo',
      {
        targets: {
          hw: true,
          fw: true,
          bt: true,
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

  test('runs Protocol V2 upload and install without rebooting to bootloader first', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    method.init();

    (method as any).device = {
      originalDescriptor: { id: 'ble-id', path: 'ble-path', protocolType: 'V2' },
      features: { capabilities: [] },
    };
    (method as any).prepareResourceBinary = jest.fn().mockResolvedValue(null);
    (method as any).prepareFirmwareAndBleBinary = jest.fn().mockResolvedValue([
      {
        fileName: 'ble-firmware.bin',
        binary: new Uint8Array([1, 2, 3]).buffer,
      },
    ]);
    (method as any).prepareBootloaderBinary = jest.fn().mockResolvedValue(null);
    (method as any).executeProtocolV2Update = jest.fn().mockResolvedValue(undefined);
    (method as any).exitProtocolV2BootloaderToNormal = jest.fn().mockResolvedValue(undefined);
    (method as any).waitForProtocolV2FinalFeatures = jest.fn().mockResolvedValue({
      bootloaderVersion: '0.2.0',
      bleVersion: '4.5.6',
      firmwareVersion: '1.2.3',
    });
    (method as any).protocolV2Reboot = jest.fn();
    method.postTipMessage = jest.fn();

    await method.run();

    expect((method as any).executeProtocolV2Update).toHaveBeenCalledWith({
      resourceBinary: null,
      fwBinaryMap: [
        {
          fileName: 'ble-firmware.bin',
          binary: expect.any(ArrayBuffer),
        },
      ],
      bootloaderBinary: null,
    });
    expect((method as any).protocolV2Reboot).not.toHaveBeenCalledWith(DevRebootType.Bootloader);
    expect(method.postTipMessage).not.toHaveBeenCalledWith('AutoRebootToBootloader');
  });

  test('reboots Protocol V2 firmware flow back to normal before final feature polling', async () => {
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
    expect((method as any).protocolV2Reboot).toHaveBeenCalledWith(DevRebootType.Normal);
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

    (method as any).device = {
      getCommands: () => ({ typedCall }),
    };

    await expect((method as any).protocolV2Reboot(DevRebootType.Normal)).resolves.toEqual({
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

    (method as any).device = {
      getCommands: () => ({ typedCall }),
    };

    await expect((method as any).protocolV2Reboot(DevRebootType.Normal)).resolves.toEqual({
      message: 'Device rebooted successfully',
    });
  });

  test('continues Protocol V2 install polling through temporary expected V2 probe failures', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest
      .fn()
      .mockRejectedValueOnce(
        new Error(
          'Device protocol mismatch: expected V2, but device did not respond to expected protocol'
        )
      )
      .mockResolvedValueOnce({
        type: 'DevFirmwareUpdateStatus',
        message: {
          targets: [{ target_id: 2, status: 0 }],
        },
      });
    const reconnectProtocolV2Device = jest.fn().mockResolvedValue(undefined);

    (method as any).device = {
      getCommands: () => ({ typedCall }),
    };
    (method as any).reconnectProtocolV2Device = reconnectProtocolV2Device;
    method.postProgressMessage = jest.fn();

    await (method as any).waitForProtocolV2FirmwareUpdateComplete([
      { target_id: 2, path: 'vol1:ble-firmware.bin' },
    ]);

    expect(reconnectProtocolV2Device).toHaveBeenCalledTimes(1);
    expect(typedCall).toHaveBeenCalledTimes(2);
  });

  test('passes resource, bootloader, BLE, SE and app files to DevFirmwareUpdate targets', async () => {
    const resourceZip = new JSZip();
    resourceZip.file('icons/home.png', new Uint8Array([1, 2, 3]));
    const resourceBinary = await resourceZip.generateAsync({ type: 'arraybuffer' });
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });

    const writtenPaths: string[] = [];
    method.postTipMessage = jest.fn();
    (method as any).protocolV2CreateFolder = jest.fn().mockResolvedValue(undefined);
    (method as any).protocolV2CommonUpdateProcess = jest.fn().mockImplementation(params => {
      writtenPaths.push(params.filePath);
      return Number(params.processedSize ?? 0) + Number(params.payload.byteLength);
    });
    (method as any).protocolV2StartFirmwareUpdate = jest.fn().mockResolvedValue(undefined);
    (method as any).waitForProtocolV2FirmwareUpdateComplete = jest
      .fn()
      .mockResolvedValue(undefined);

    await (method as any).executeProtocolV2Update({
      resourceBinary,
      bootloaderBinary: new Uint8Array([4, 5]).buffer,
      fwBinaryMap: [
        {
          fileName: 'ble-firmware.bin',
          binary: new Uint8Array([6]).buffer,
        },
        {
          fileName: 'se1-firmware.bin',
          binary: new Uint8Array([7]).buffer,
        },
        {
          fileName: 'firmware.bin',
          binary: new Uint8Array([8]).buffer,
        },
      ],
    });

    expect((method as any).protocolV2CreateFolder).toHaveBeenCalledWith('vol1:res/');
    expect(writtenPaths).toEqual([
      'vol1:res/home.png',
      'vol1:bootloader.bin',
      'vol1:ble-firmware.bin',
      'vol1:se1-firmware.bin',
      'vol1:firmware.bin',
    ]);
    expect((method as any).protocolV2StartFirmwareUpdate).toHaveBeenCalledWith({
      targets: [
        { target_id: 10, path: 'vol1:res/' },
        { target_id: 1, path: 'vol1:bootloader.bin' },
        { target_id: 2, path: 'vol1:ble-firmware.bin' },
        { target_id: 3, path: 'vol1:se1-firmware.bin' },
        { target_id: 0, path: 'vol1:firmware.bin' },
      ],
    });
    expect((method as any).waitForProtocolV2FirmwareUpdateComplete).toHaveBeenCalled();
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

    (method as any).device = {
      getCommands: () => ({ typedCall }),
    };
    method.postProgressMessage = jest.fn();

    await (method as any).protocolV2CommonUpdateProcess({
      payload: new Uint8Array(4097).buffer,
      filePath: 'vol1:firmware.bin',
      processedSize: 0,
      totalSize: 4097,
    });

    const writePayloads = typedCall.mock.calls.map(call => call[2]);
    expect(writePayloads.map(payload => payload.file.offset)).toEqual([0, 4096]);
    expect(writePayloads.map(payload => payload.file.data.byteLength)).toEqual([4096, 1]);
    expect(writePayloads.map(payload => payload.overwrite)).toEqual([true, false]);
    expect(writePayloads.every(payload => payload.append === false)).toBe(true);
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
    (method as any).device = {
      getCommands: () => ({ typedCall }),
    };
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
  });

  test('consumes Protocol V2 install progress before final update success', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockResolvedValue({ type: 'Success', message: { message: 'ok' } });

    (method as any).device = {
      getCommands: () => ({ typedCall }),
    };
    method.postProgressMessage = jest.fn();
    method.postTipMessage = jest.fn();

    await (method as any).protocolV2StartFirmwareUpdate({
      targets: [{ target_id: 0, path: 'vol1:firmware.bin' }],
    });

    const callOptions = typedCall.mock.calls[0][3];
    expect(typedCall.mock.calls[0][1]).toEqual(['Success', 'DevFirmwareUpdateStatus']);
    expect(callOptions.intermediateTypes).toEqual(['DevFirmwareInstallProgress']);
    callOptions.onIntermediateResponse({
      type: 'DevFirmwareInstallProgress',
      message: { target_id: 0, progress: 42 },
    });

    expect(method.postProgressMessage).toHaveBeenCalledWith(42, 'installingFirmware');
  });

  test('accepts Protocol V2 firmware update status as start response', async () => {
    const method = new FirmwareUpdateV4({
      id: 1,
      payload: {
        method: 'firmwareUpdateV4',
      },
    });
    const typedCall = jest.fn().mockResolvedValue({
      type: 'DevFirmwareUpdateStatus',
      message: { targets: [{ target_id: 0, status: 1 }] },
    });

    (method as any).device = {
      getCommands: () => ({ typedCall }),
    };
    method.postProgressMessage = jest.fn();
    method.postTipMessage = jest.fn();

    await (method as any).protocolV2StartFirmwareUpdate({
      targets: [{ target_id: 0, path: 'vol1:firmware.bin' }],
    });

    expect(typedCall.mock.calls[0][1]).toEqual(['Success', 'DevFirmwareUpdateStatus']);
    expect(method.postTipMessage).toHaveBeenCalledWith('FirmwareUpdating');
  });
});

describe('Protocol V2 firmware update method', () => {
  test('returns DevFirmwareUpdateStatus from low-level update trigger', async () => {
    const method = new DeviceFirmwareUpdate({
      id: 1,
      payload: {
        method: 'deviceFirmwareUpdate',
        targetId: 3,
        path: 'vol0:firmware.bin',
      },
    });
    method.init();

    const typedCall = jest.fn().mockResolvedValue({
      type: 'DevFirmwareUpdateStatus',
      message: { targets: [{ target_id: 0, status: 1 }] },
    });

    (method as any).device = {
      commands: { typedCall },
    };

    await expect(method.run()).resolves.toEqual({
      targets: [{ target_id: 0, status: 1 }],
    });
    expect(typedCall.mock.calls[0][1]).toEqual(['Success', 'DevFirmwareUpdateStatus']);
    expect(typedCall.mock.calls[0][2]).toEqual({
      targets: [{ target_id: 3, path: 'vol0:firmware.bin' }],
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
    (method as any).device = {
      commands: { typedCall },
    };

    await expect(method.run()).rejects.toMatchObject({
      errorCode: HardwareErrorCode.CallMethodInvalidParameter,
    });
    expect(typedCall).not.toHaveBeenCalled();
  });

  test('accepts targetId alias inside firmware targets', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const method = new DeviceFirmwareUpdate({
      id: 1,
      payload: {
        method: 'deviceFirmwareUpdate',
        targets: [
          {
            target_id: undefined,
            targetId: 3,
            path: 'vol0:firmware.bin',
          },
        ],
      } as any,
    });
    method.init();
    (method as any).device = {
      commands: { typedCall },
    };

    await method.run();
    expect(typedCall.mock.calls[0][2]).toEqual({
      targets: [{ target_id: 3, path: 'vol0:firmware.bin' }],
    });
  });
});

describe('Protocol V2 onboarding status method', () => {
  test('returns OnboardingStatus from low-level status query', async () => {
    const method = new DeviceGetOnboardingStatus({
      id: 1,
      payload: {
        method: 'deviceGetOnboardingStatus',
      },
    });
    method.init();

    const typedCall = jest.fn().mockResolvedValue({
      type: 'OnboardingStatus',
      message: {
        step: 3,
        setup: {
          restore: {
            mnemonic: true,
          },
        },
        detail_code: 7,
        detail_str: 'Recovery Phrase',
      },
    });

    (method as any).device = {
      commands: { typedCall },
    };

    await expect(method.run()).resolves.toEqual({
      step: 3,
      setup: {
        restore: {
          mnemonic: true,
        },
      },
      detail_code: 7,
      detail_str: 'Recovery Phrase',
    });
    expect(typedCall).toHaveBeenCalledWith('GetOnboardingStatus', 'OnboardingStatus', {});
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
    (method as any).device = { commands: { typedCall } };
    method.postMessage = jest.fn();

    method.init();
    await method.run();

    expect(typedCall).toHaveBeenCalledWith('FilesystemFileWrite', 'FilesystemFile', {
      file: {
        path: 'vol1:test.bin',
        offset: 1,
        total_size: 2,
        data: new Uint8Array([1]),
      },
      overwrite: false,
      append: false,
      ui_percentage: 99,
    });
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
    (method as any).device = { commands: { typedCall } };
    method.postMessage = jest.fn();

    method.init();
    const result = await method.run();

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall).toHaveBeenNthCalledWith(1, 'FilesystemFileWrite', 'FilesystemFile', {
      file: {
        path: 'vol1:test.bin',
        offset: 0,
        total_size: 4097,
        data: data.slice(0, 4096),
      },
      overwrite: true,
      append: false,
      ui_percentage: 99,
    });
    expect(typedCall).toHaveBeenNthCalledWith(2, 'FilesystemFileWrite', 'FilesystemFile', {
      file: {
        path: 'vol1:test.bin',
        offset: 4096,
        total_size: 4097,
        data: data.slice(4096),
      },
      overwrite: false,
      append: false,
      ui_percentage: 99,
    });
    expect(result).toMatchObject({
      path: 'vol1:test.bin',
      processed_byte: 4097,
      chunks: 2,
    });
    expect(method.postMessage).toHaveBeenNthCalledWith(1, {
      event: 'UI_EVENT',
      type: UI_REQUEST.DEVICE_PROGRESS,
      payload: expect.objectContaining({
        progress: 99,
        transferredBytes: 4096,
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
    (method as any).device = { commands: { typedCall } };
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
    (method as any).device = { commands: { typedCall } };

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
      ui_percentage: 99,
    });
    expect(typedCall).toHaveBeenNthCalledWith(3, 'FilesystemFileRead', 'FilesystemFile', {
      file: {
        path: 'vol1:test.bin',
        offset: 64,
        total_size: 0,
      },
      chunk_len: 1,
      ui_percentage: 99,
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
    (method as any).device = { commands: { typedCall } };

    method.init();
    const result = await method.run();

    expect(result.data).toEqual(new Uint8Array([1, 2, 255]));
  });
});
