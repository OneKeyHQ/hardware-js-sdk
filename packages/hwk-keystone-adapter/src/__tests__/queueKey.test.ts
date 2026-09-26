import { createHardwareOperationId } from '@onekeyfe/hwk-adapter-core';

import {
  KEYSTONE_COLD_START_JOB_LABEL,
  keystoneCancelQueueKeys,
  keystoneMfpFromIdentifier,
  keystoneQueueKey,
} from '../utils/queueKey';

const MFP = 'a1b2c3d4';

describe('keystoneQueueKey', () => {
  it('prefers the operation id, then the device id, then the connect id', () => {
    const operationId = createHardwareOperationId('keystone');

    expect(keystoneQueueKey(operationId, MFP)).toBe(operationId);
    expect(keystoneQueueKey(`keystone-wallet:${MFP}`, MFP)).toBe(MFP);
    expect(keystoneQueueKey(`keystone-wallet:${MFP}`)).toBe(`keystone-wallet:${MFP}`);
    expect(keystoneQueueKey()).toBe(KEYSTONE_COLD_START_JOB_LABEL);
  });

  it('reads the master fingerprint out of either identifier spelling', () => {
    expect(keystoneMfpFromIdentifier(`keystone-wallet:${MFP.toUpperCase()}`)).toBe(MFP);
    expect(keystoneMfpFromIdentifier(MFP)).toBe(MFP);
    expect(keystoneMfpFromIdentifier('keystone-cold-start')).toBeUndefined();
    expect(keystoneMfpFromIdentifier('a'.repeat(64))).toBeUndefined();
  });

  it('fans a cancel out over every key one identifier can stand for', () => {
    const operationId = createHardwareOperationId('keystone');

    expect(keystoneCancelQueueKeys([`keystone-wallet:${MFP}`, undefined, operationId, ''])).toEqual(
      new Set([`keystone-wallet:${MFP}`, MFP, operationId])
    );
  });
});
