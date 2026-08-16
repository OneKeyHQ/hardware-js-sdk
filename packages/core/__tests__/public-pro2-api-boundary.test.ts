import * as publicMethods from '../src/api';
import { CoreExtensionBaseMethod } from '../src';
import { findMethod } from '../src/api/utils';
import { createCoreApi } from '../src/inject';

import type { CoreApi, CoreMethodExtension } from '../src';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

const isolatedMethodNames = [
  'deviceProvisionFactoryInfo',
  'deviceReadFactoryInfo',
  'deviceWriteFactoryCertificate',
  'deviceReadFactoryCertificate',
  'deviceSignFactoryChallenge',
  'deviceInfoSettings',
  'deviceGetInfo',
  'deviceWriteSEPrivateKey',
  'deviceWriteSEPublicCert',
  'testInitializeDeviceDuration',
  'testProtocolV2Ping',
] as const;

class ExtensionMethod extends CoreExtensionBaseMethod {
  init() {}

  async run() {
    return Promise.resolve('extension-result');
  }
}

const extension: CoreMethodExtension = {
  name: 'boundary-test',
  methods: { extensionMethod: ExtensionMethod },
  destructiveMethods: ['extensionMethod'],
};

describe('public factory and test API boundary', () => {
  test('keeps factory and test APIs out of the production API', () => {
    const api = createCoreApi(jest.fn() as CoreApi['call']) as Record<string, unknown>;

    expect(api.deviceGetOnboardingStatus).toBeInstanceOf(Function);
    expect(api.deviceReadSEPublicCert).toBeInstanceOf(Function);
    expect(api.deviceSESignMessage).toBeInstanceOf(Function);
    expect(publicMethods.deviceReadSEPublicCert).toBeInstanceOf(Function);
    expect(publicMethods.deviceSESignMessage).toBeInstanceOf(Function);
    expect(api.deviceUploadNft).toBeInstanceOf(Function);
    expect(api.uploadPortfolio).toBeInstanceOf(Function);

    isolatedMethodNames.forEach(name => {
      expect(api).not.toHaveProperty(name);
      expect(publicMethods).not.toHaveProperty(name);
      expect(() => findMethod({ id: 1, payload: { method: name } } as any)).toThrow(
        `Method ${name} is not set`
      );
    });
  });

  test('resolves an injected method only when the extension is configured', () => {
    const message = { id: 1, payload: { method: 'extensionMethod' } } as any;

    expect(() => findMethod(message)).toThrow('Method extensionMethod is not set');
    expect(() => findMethod(message, { extensions: [extension] })).toThrow(
      'Destructive method extensionMethod requires allowDestructiveOperations'
    );
    expect(
      findMethod(message, {
        extensions: [extension],
        allowDestructiveOperations: true,
      })
    ).toBeInstanceOf(ExtensionMethod);
  });

  test('rejects ambiguous extension registrations', () => {
    expect(() =>
      findMethod({ id: 1, payload: { method: 'extensionMethod' } } as any, {
        extensions: [extension, { ...extension, name: 'duplicate' }],
      })
    ).toThrow('Method extensionMethod is registered by multiple extensions');
  });
});
