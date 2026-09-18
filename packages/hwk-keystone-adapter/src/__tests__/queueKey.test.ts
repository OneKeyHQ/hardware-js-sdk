import { createHardwareOperationId } from '@onekeyfe/hwk-adapter-core';

import {
  KEYSTONE_COLD_START_JOB_LABEL,
  keystoneCancelQueueKeys,
  keystoneQueueKey,
  keystoneWalletIdFromIdentifier,
} from '../utils/queueKey';

const WALLET_ID = 'a'.repeat(64);

describe('keystoneQueueKey', () => {
  it('prefers the operation id, then the device id, then the connect id', () => {
    const operationId = createHardwareOperationId('keystone');

    expect(keystoneQueueKey(operationId, WALLET_ID)).toBe(operationId);
    expect(keystoneQueueKey(`keystone-wallet:${WALLET_ID}`, WALLET_ID)).toBe(WALLET_ID);
    expect(keystoneQueueKey(`keystone-wallet:${WALLET_ID}`)).toBe(`keystone-wallet:${WALLET_ID}`);
    expect(keystoneQueueKey()).toBe(KEYSTONE_COLD_START_JOB_LABEL);
  });

  it('reads the wallet id out of either identifier spelling', () => {
    expect(keystoneWalletIdFromIdentifier(`keystone-wallet:${WALLET_ID.toUpperCase()}`)).toBe(
      WALLET_ID
    );
    expect(keystoneWalletIdFromIdentifier(WALLET_ID)).toBe(WALLET_ID);
    expect(keystoneWalletIdFromIdentifier('keystone-cold-start')).toBeUndefined();
  });

  it('fans a cancel out over every key one identifier can stand for', () => {
    const operationId = createHardwareOperationId('keystone');

    expect(
      keystoneCancelQueueKeys([`keystone-wallet:${WALLET_ID}`, undefined, operationId, ''])
    ).toEqual(new Set([`keystone-wallet:${WALLET_ID}`, WALLET_ID, operationId]));
  });
});
