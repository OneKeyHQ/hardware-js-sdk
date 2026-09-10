import { bytesToHex, prepareSolanaOffchainMessageV1 } from '..';

describe('prepareSolanaOffchainMessageV1', () => {
  it('builds finalized V1 bytes with sorted signers and no length prefix', () => {
    const signerA = '01'.repeat(32);
    const signerB = '02'.repeat(32);

    const result = prepareSolanaOffchainMessageV1({
      message: Uint8Array.of(0x68, 0x65, 0x6c, 0x6c, 0x6f),
      requiredSigners: [signerB, signerA],
    });

    expect(result.messageText).toBe('hello');
    expect(result.requiredSigners).toEqual([signerA, signerB]);
    expect(bytesToHex(result.serializedMessage)).toBe(
      `ff${Buffer.from('solana offchain').toString('hex')}0102${signerA}${signerB}${Buffer.from(
        'hello'
      ).toString('hex')}`
    );
  });

  it('rejects duplicate signers and invalid UTF-8 before device communication', () => {
    const signer = '01'.repeat(32);

    expect(() =>
      prepareSolanaOffchainMessageV1({
        message: Uint8Array.of(0x68, 0x65, 0x6c, 0x6c, 0x6f),
        requiredSigners: [signer, signer],
      })
    ).toThrow('must be unique');
    expect(() =>
      prepareSolanaOffchainMessageV1({
        message: Uint8Array.of(0xff),
        requiredSigners: [signer],
      })
    ).toThrow('valid UTF-8');
  });

  it('does not require TextEncoder or TextDecoder globals', () => {
    const originalTextEncoder = globalThis.TextEncoder;
    const originalTextDecoder = globalThis.TextDecoder;
    Object.defineProperties(globalThis, {
      TextEncoder: { configurable: true, value: undefined },
      TextDecoder: { configurable: true, value: undefined },
    });

    try {
      expect(
        prepareSolanaOffchainMessageV1({
          message: Uint8Array.of(0x68, 0x69),
          requiredSigners: ['01'.repeat(32)],
        }).messageText
      ).toBe('hi');
    } finally {
      Object.defineProperties(globalThis, {
        TextEncoder: { configurable: true, value: originalTextEncoder },
        TextDecoder: { configurable: true, value: originalTextDecoder },
      });
    }
  });
});
