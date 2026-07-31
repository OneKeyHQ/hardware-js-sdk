import { ProtocolV2FirmwareTargetType } from '../src/protocols/protocol-v2/firmware';
import { isProtocolV2FirmwareFingerprintValid } from '../src/api/FirmwareUpdateV4';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

describe('Protocol V2 firmware target contract', () => {
  test('matches the current firmware-pro2 target ids', () => {
    expect(ProtocolV2FirmwareTargetType).toEqual({
      FW_MGMT_TARGET_INVALID: 0,
      FW_MGMT_TARGET_CRATE: 1,
      FW_MGMT_TARGET_ROMLOADER: 2,
      FW_MGMT_TARGET_BOOTLOADER: 3,
      FW_MGMT_TARGET_APPLICATION_P1: 4,
      FW_MGMT_TARGET_APPLICATION_P2: 5,
      FW_MGMT_TARGET_COPROCESSOR: 6,
      FW_MGMT_TARGET_SE01: 7,
      FW_MGMT_TARGET_SE02: 8,
      FW_MGMT_TARGET_SE03: 9,
      FW_MGMT_TARGET_SE04: 10,
    });
  });

  test('validates the full package SHA-256 fingerprint from config', () => {
    const binary = Uint8Array.from([1, 2, 3]);

    expect(
      isProtocolV2FirmwareFingerprintValid(
        binary,
        '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81'
      )
    ).toBe(true);
    expect(isProtocolV2FirmwareFingerprintValid(binary, '00'.repeat(32))).toBe(false);
  });
});
