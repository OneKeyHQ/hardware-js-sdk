import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import { LedgerConnectorBase } from '../connector/LedgerConnectorBase';
import { ERROR_TAG } from '../errors';

describe('LedgerConnectorBase error wrapping', () => {
  it('preserves serialized hardware errors without remapping them', () => {
    const connector = new LedgerConnectorBase(async () => ({}));
    const source = Object.assign(new Error('Failed to open "Tron"'), {
      _tag: ERROR_TAG.OpenAppCommand,
      code: HardwareErrorCode.AppNotInstalled,
      appName: 'Tron',
      errorCode: '',
    });

    const wrapped = (connector as any)._wrapError(source, {
      defaultAppName: 'Tron',
    });

    expect(wrapped).toMatchObject({
      code: HardwareErrorCode.AppNotInstalled,
      appName: 'Tron',
      _tag: ERROR_TAG.OpenAppCommand,
      errorCode: '',
    });
    expect(wrapped.message).toBe('Failed to open "Tron"');
  });

  it('does not treat raw numeric APDU codes as serialized hardware errors', () => {
    const connector = new LedgerConnectorBase(async () => ({}));
    const source = Object.assign(new Error('Invalid data'), {
      _tag: ERROR_TAG.EthAppCommand,
      code: 0x6a80,
      errorCode: '6a80',
    });

    const wrapped = (connector as any)._wrapError(source, {
      defaultAppName: 'Ethereum',
    });

    expect(wrapped).toMatchObject({
      code: HardwareErrorCode.UnknownError,
      appName: 'Ethereum',
      _tag: ERROR_TAG.EthAppCommand,
      errorCode: '6a80',
    });
  });
});
