import { createHardwareCommonConnectSdk } from '@onekeyfe/hd-common-connect-sdk';

import protocolV2Schema from './protobuf/messages-protocol-v2.json';
import protocolV1Schema from './protobuf/messages-v1.json';
import protocolV1LegacySchema from './protobuf/messages-v1-legacy.json';
import {
  DeviceFactoryCertificateRead,
  DeviceFactoryCertificateWrite,
  DeviceFactoryChallengeSign,
  DeviceFactoryInfoGet,
  DeviceFactoryInfoSet,
} from './factory/methods';
import {
  DeviceInfoSettings,
  DeviceWriteSEPrivateKey,
  DeviceWriteSEPublicCert,
  GetDeviceInfoSettings,
} from './factory/v1-methods';
import { TestInitializeDeviceDuration, TestProtocolV2Ping } from './test/methods';
import * as TestMethods from './test-api';

import type { CoreApi, CoreMethodConstructor, CoreMethodExtension } from '@onekeyfe/hd-core';
import type { FactoryApi } from './factory/types';
import type { TestApiMethods } from './test-api-types';

export type TestHardwareSdkOptions = {
  allowDestructiveOperations?: boolean;
};

export type TestApi = CoreApi &
  FactoryApi & {
    testInitializeDeviceDuration(
      connectId?: string,
      params?: Record<string, unknown>
    ): ReturnType<CoreApi['call']>;
    testProtocolV2Ping(
      connectId: string,
      params?: Record<string, unknown>
    ): ReturnType<CoreApi['call']>;
  } & TestApiMethods;

const DESTRUCTIVE_METHODS = [
  'deviceProvisionFactoryInfo',
  'deviceWriteFactoryCertificate',
  'deviceInfoSettings',
  'deviceWriteSEPrivateKey',
  'deviceWriteSEPublicCert',
  'deviceSpiFlashWrite',
  'deviceSdProtect',
  'deviceChangeWipeCode',
  'deviceLoad',
  'emmcDirMake',
  'emmcDirRemove',
  'emmcFileDelete',
  'emmcFileWrite',
  'emmcFixPermission',
  'debugLinkEraseSdCard',
  'debugLinkFlashErase',
  'debugLinkMemoryWrite',
  'debugLinkReseedRandom',
  'firmwareErase',
  'firmwareEraseEx',
  'firmwareUpdateEmmcTest',
  'firmwareUploadTest',
  'webAuthnAddResidentCredential',
  'webAuthnRemoveResidentCredential',
  'nftWriteData',
  'nftWriteInfo',
  'resourceUpdate',
  'bixinLoadDevice',
] as const;

export const hardwareTestApiExtension: CoreMethodExtension = {
  name: 'hardware-test-api',
  methods: {
    deviceProvisionFactoryInfo: DeviceFactoryInfoSet,
    deviceReadFactoryInfo: DeviceFactoryInfoGet,
    deviceWriteFactoryCertificate: DeviceFactoryCertificateWrite,
    deviceReadFactoryCertificate: DeviceFactoryCertificateRead,
    deviceSignFactoryChallenge: DeviceFactoryChallengeSign,
    deviceInfoSettings: DeviceInfoSettings,
    deviceGetInfo: GetDeviceInfoSettings,
    deviceWriteSEPrivateKey: DeviceWriteSEPrivateKey,
    deviceWriteSEPublicCert: DeviceWriteSEPublicCert,
    ...(TestMethods as unknown as Record<string, CoreMethodConstructor>),
    testInitializeDeviceDuration: TestInitializeDeviceDuration,
    testProtocolV2Ping: TestProtocolV2Ping,
  },
  protobufSchemas: {
    v1CurrentSchema: protocolV1Schema,
    v1LegacySchema: protocolV1LegacySchema,
    v2Schema: protocolV2Schema,
  },
  destructiveMethods: DESTRUCTIVE_METHODS,
};

const createFactoryApi = (call: CoreApi['call']): FactoryApi => ({
  deviceProvisionFactoryInfo: (connectId, params) =>
    call({ ...params, connectId, method: 'deviceProvisionFactoryInfo' }),
  deviceReadFactoryInfo: (connectId, params) =>
    call({ ...params, connectId, method: 'deviceReadFactoryInfo' }),
  deviceWriteFactoryCertificate: (connectId, params) =>
    call({ ...params, connectId, method: 'deviceWriteFactoryCertificate' }),
  deviceReadFactoryCertificate: (connectId, params) =>
    call({ ...params, connectId, method: 'deviceReadFactoryCertificate' }),
  deviceSignFactoryChallenge: (connectId, params) =>
    call({ ...params, connectId, method: 'deviceSignFactoryChallenge' }),
  deviceInfoSettings: (connectId, params) =>
    call({ ...params, connectId, method: 'deviceInfoSettings' }),
  deviceGetInfo: (connectId, params) => call({ ...params, connectId, method: 'deviceGetInfo' }),
  deviceWriteSEPrivateKey: (connectId, params) =>
    call({ ...params, connectId, method: 'deviceWriteSEPrivateKey' }),
  deviceWriteSEPublicCert: (connectId, params) =>
    call({ ...params, connectId, method: 'deviceWriteSEPublicCert' }),
});

const createTestApi = (call: CoreApi['call']): TestApiMethods =>
  Object.fromEntries(
    (Object.keys(TestMethods) as Array<keyof TestApiMethods>).map(method => [
      method,
      (
        connectId: string,
        deviceIdOrParams?: string | Record<string, unknown>,
        params?: Record<string, unknown>
      ) => {
        const usesDeviceId = typeof deviceIdOrParams === 'string';
        return call({
          ...(usesDeviceId ? params : deviceIdOrParams),
          connectId,
          ...(usesDeviceId ? { deviceId: deviceIdOrParams } : {}),
          method,
        });
      },
    ])
  ) as unknown as TestApiMethods;

export const createTestHardwareSdk = (options: TestHardwareSdkOptions = {}): TestApi => {
  const coreApi = createHardwareCommonConnectSdk({
    methodExtensions: [hardwareTestApiExtension],
    allowDestructiveOperations: options.allowDestructiveOperations === true,
  });
  return Object.assign(coreApi, createFactoryApi(coreApi.call), createTestApi(coreApi.call), {
    testInitializeDeviceDuration: (connectId?: string, params?: Record<string, unknown>) =>
      coreApi.call({ ...params, connectId, method: 'testInitializeDeviceDuration' }),
    testProtocolV2Ping: (connectId: string, params?: Record<string, unknown>) =>
      coreApi.call({ ...params, connectId, method: 'testProtocolV2Ping' }),
  });
};

const HardwareTestSdk = createTestHardwareSdk();

export default HardwareTestSdk;

export type { FactoryApi } from './factory/types';
export type { TestApiMethods } from './test-api-types';
export { TEST_API_METHOD_NAMES } from './test-api/method-names';
