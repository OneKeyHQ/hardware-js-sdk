/* eslint-disable import/no-relative-packages */
import * as publicMethods from '../../core/src/api';
import { findMethod } from '../../core/src/api/utils';
import { createCoreApi } from '../../core/src/inject';
import { hardwareTestApiExtension } from '../src';
import * as testMethods from '../src/test-api';
import { TEST_API_METHOD_NAMES } from '../src/test-api/method-names';

import type { CoreApi, CoreMethodConstructor } from '@onekeyfe/hd-core';

jest.mock('../../core/src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

describe('complete test API boundary', () => {
  test('keeps every test/api method outside the production Core registry', () => {
    const api = createCoreApi(jest.fn() as CoreApi['call']) as Record<string, unknown>;

    TEST_API_METHOD_NAMES.forEach(name => {
      if (name === 'deviceReadSEPublicCert' || name === 'deviceSESignMessage') {
        expect(api[name]).toBeInstanceOf(Function);
        expect(publicMethods[name]).toBeInstanceOf(Function);
      } else {
        expect(api).not.toHaveProperty(name);
        expect(publicMethods).not.toHaveProperty(name);
        expect(hardwareTestApiExtension.methods[name]).toBeInstanceOf(Function);
      }
    });
  });

  test('preserves Protocol V1 routing for migrated test methods', () => {
    Object.values(testMethods).forEach(Method => {
      const instance = new (Method as CoreMethodConstructor)({
        id: 1,
        payload: { method: 'test-method' },
      } as any);
      expect(instance.getSupportedProtocols()).toEqual(['V1']);
    });
  });

  test('requires explicit authorization for destructive test methods', () => {
    const message = { id: 1, payload: { method: 'firmwareErase' } } as any;

    expect(() => findMethod(message)).toThrow('Method firmwareErase is not set');
    expect(() => findMethod(message, { extensions: [hardwareTestApiExtension] })).toThrow(
      'Destructive method firmwareErase requires allowDestructiveOperations'
    );
    expect(
      findMethod(message, {
        extensions: [hardwareTestApiExtension],
        allowDestructiveOperations: true,
      }).name
    ).toBe('firmwareErase');
  });
});
