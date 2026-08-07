import * as publicMethods from '../src/api';
import * as methods from '../src/api/testMethods';
import DeviceWipe from '../src/api/device/DeviceWipe';
import { TEST_API_METHOD_NAMES } from '../src/api/extensionMethodNames';
import { testApiMethodExtension } from '../src/api/methodExtension';
import { findMethod } from '../src/api/utils';
import { createCoreApi, createTestApi } from '../src/inject';

import type { BaseMethod } from '../src/api/BaseMethod';
import type { CoreApi } from '../src/types/api';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const testApiNames = [
  'btcGetOwnershipId',
  'btcGetOwnershipProof',
  'btcAuthorizeCoinJoin',
  'cryptoBatchGetPublickeys',
  'cryptoCipherKeyValue',
  'cryptoCosiCommit',
  'cryptoCosiSign',
  'cryptoGetECDHSessionKey',
  'cryptoSignIdentity',
  'evmGetAddressTrezor',
  'evmGetPublicKeyTrezor',
  'evmSignMessageTrezor',
  'evmSignTransactionTrezor',
  'evmSignTypedDataTrezor',
  'evmVerifyMessageTrezor',
  'nemDecryptMessage',
  'deviceSpiFlashWrite',
  'deviceSpiFlashRead',
  'deviceInfoSettings',
  'deviceGetInfo',
  'deviceReadSEPublicCert',
  'deviceWriteSEPrivateKey',
  'deviceWriteSEPublicCert',
  'deviceSESignMessage',
  'devicePing',
  'deviceGetEntropy',
  'deviceGetFirmwareHash',
  'deviceUnlockPath',
  'deviceSdProtect',
  'deviceChangeWipeCode',
  'deviceEndSession',
  'deviceLoad',
  'deviceDoPreauthorized',
  'deviceCancelAuthorization',
  'emmcDirList',
  'emmcDirMake',
  'emmcDirRemove',
  'emmcFileDelete',
  'emmcFileRead',
  'emmcFileWrite',
  'emmcFixPermission',
  'emmcPathInfo',
  'debugLinkDecision',
  'debugLinkEraseSdCard',
  'debugLinkFlashErase',
  'debugLinkGetState',
  'debugLinkMemoryRead',
  'debugLinkMemoryWrite',
  'debugLinkRecordScreen',
  'debugLinkReseedRandom',
  'debugLinkStop',
  'debugLinkWatchLayout',
  'firmwareErase',
  'firmwareEraseEx',
  'firmwareUpdateEmmcTest',
  'firmwareUploadTest',
  'reboot',
  'selfTest',
  'tezosGetAddress',
  'tezosGetPublicKey',
  'tezosSignTx',
  'moneroGetAddress',
  'moneroGetWatchKey',
  'eosGetPublicKey',
  'eosSignTx',
  'binanceGetAddress',
  'binanceGetPublicKey',
  'binanceSignTx',
  'webAuthnAddResidentCredential',
  'webAuthnListResidentCredentials',
  'webAuthnRemoveResidentCredential',
  'getPublicKeyMultiple',
  'listResDir',
  'nftWriteData',
  'nftWriteInfo',
  'readSEPublicKey',
  'resourceUpdate',
  'bixinBackupDevice',
  'bixinLoadDevice',
  'bixinMessageSE',
  'bixinVerifyDeviceRequest',
] as const;

describe('public test API boundary', () => {
  test('keeps every test API behind the explicit extension', () => {
    expect(testApiNames).toEqual(TEST_API_METHOD_NAMES);
    expect(Object.keys(testApiMethodExtension.methods).sort()).toEqual(
      [...TEST_API_METHOD_NAMES].sort()
    );
    const call = jest.fn() as CoreApi['call'];
    const publicApi = createCoreApi(call) as Record<string, unknown>;
    const api = createTestApi(call) as Record<string, unknown>;

    testApiNames.forEach(name => {
      expect(typeof methods[name]).toBe('function');
      expect(typeof api[name]).toBe('function');
      expect(publicMethods).not.toHaveProperty(name);
      expect(publicApi).not.toHaveProperty(name);
    });
  });

  test('keeps imported test methods on Protocol V1', () => {
    testApiNames.forEach(name => {
      const Method = methods[name] as new (message: {
        id?: number;
        payload: unknown;
      }) => BaseMethod;
      const instance = new Method({ id: 1, payload: { method: name } });

      expect(instance.getSupportedProtocols()).toEqual(['V1']);
    });
  });

  test('preserves the current shared wipe behavior for Protocol V1 and V2', () => {
    const wipe = new DeviceWipe({ id: 1, payload: { method: 'deviceWipe' } });

    expect(wipe.getSupportedProtocols()).toEqual(['V1', 'V2']);
  });

  test('routes representative calls through the current public call boundary', async () => {
    const call = jest.fn().mockResolvedValue({ success: true });
    const api = createTestApi(call as CoreApi['call']);

    await api.devicePing('usb:1', { message: 'ping' });
    await api.evmGetAddressTrezor('usb:1', 'device:1', {
      path: "m/44'/60'/0'/0/0",
      showOnOneKey: false,
    });

    expect(call).toHaveBeenNthCalledWith(1, {
      connectId: 'usb:1',
      message: 'ping',
      method: 'devicePing',
    });
    expect(call).toHaveBeenNthCalledWith(2, {
      connectId: 'usb:1',
      deviceId: 'device:1',
      method: 'evmGetAddressTrezor',
      path: "m/44'/60'/0'/0/0",
      showOnOneKey: false,
    });
  });

  test('resolves test methods only for the configured Core instance', () => {
    const message = { id: 1, payload: { method: 'devicePing' } } as any;

    expect(() => findMethod(message)).toThrow('Method devicePing is not set');
    expect(findMethod(message, { extensions: [testApiMethodExtension] }).name).toBe('devicePing');
  });
});
