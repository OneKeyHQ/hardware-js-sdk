import * as publicMethods from '../src/api';
import {
  PROTOCOL_V2_RETRY_ON_LOCKED_METHODS,
  getProtocolV2UnlockPolicy,
} from '../src/protocols/protocol-v2/unlockPolicy';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

describe('Protocol V2 public method unlock policy', () => {
  test('classifies the complete public method table with an explicit replay allowlist', () => {
    const publicMethodNames = Object.keys(publicMethods);
    const retryMethodNames = new Set<string>(PROTOCOL_V2_RETRY_ON_LOCKED_METHODS);

    expect(publicMethodNames.length).toBeGreaterThan(100);
    expect(new Set(PROTOCOL_V2_RETRY_ON_LOCKED_METHODS).size).toBe(
      PROTOCOL_V2_RETRY_ON_LOCKED_METHODS.length
    );

    for (const methodName of PROTOCOL_V2_RETRY_ON_LOCKED_METHODS) {
      expect(publicMethods).toHaveProperty(methodName);
    }

    for (const methodName of publicMethodNames) {
      expect(getProtocolV2UnlockPolicy(methodName)).toBe(
        retryMethodNames.has(methodName) ? 'retry-on-locked' : 'none'
      );
    }
  });

  test.each([
    'deviceUnlock',
    'deviceLock',
    'deviceWipe',
    'deviceChangePin',
    'deviceSettings',
    'firmwareUpdateV4',
    'deviceUploadWallpaper',
    'uploadPortfolio',
  ])('does not make the state-changing method %s replayable by default', methodName => {
    expect(getProtocolV2UnlockPolicy(methodName)).toBe('none');
  });
});
