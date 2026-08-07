import { Psbt } from 'bitcoinjs-lib';

import { _applySignaturesToPsbt } from '../connector/chains/btc';

// P2TR scriptPubKey: OP_1 <32-byte x-only>
const P2TR_SCRIPT = Buffer.concat([Buffer.from([0x51, 0x20]), Buffer.alloc(32)]);
// P2WPKH scriptPubKey: OP_0 <20-byte hash160>
const P2WPKH_SCRIPT = Buffer.concat([Buffer.from([0x00, 0x14]), Buffer.alloc(20)]);

function buildPsbt(
  inputs: Array<{
    script: Buffer;
    tapInternalKey?: Buffer;
    tapLeafScript?: Array<{ leafVersion: number; script: Buffer; controlBlock: Buffer }>;
  }>
): string {
  const psbt = new Psbt();
  for (const i of inputs) {
    psbt.addInput({
      hash: Buffer.alloc(32),
      index: 0,
      witnessUtxo: { script: i.script, value: 10_000n },
      ...(i.tapInternalKey ? { tapInternalKey: i.tapInternalKey } : {}),
      ...(i.tapLeafScript ? { tapLeafScript: i.tapLeafScript } : {}),
    });
  }
  return psbt.toHex();
}

const LEAF = {
  leafVersion: 0xc0,
  script: Buffer.from([0x51]),
  controlBlock: Buffer.concat([Buffer.from([0xc0]), Buffer.alloc(32)]),
};

// Minimal DER-encoded ECDSA signature with SIGHASH_ALL trailing byte.
// bip174 partialSig validator enforces DER shape, not just length.
const FAKE_DER_SIG = Buffer.concat([
  Buffer.from([0x30, 0x44, 0x02, 0x20]),
  Buffer.alloc(32, 0x01),
  Buffer.from([0x02, 0x20]),
  Buffer.alloc(32, 0x01),
  Buffer.from([0x01]),
]);

describe('_applySignaturesToPsbt', () => {
  it('writes partialSig for ECDSA (P2WPKH) input', () => {
    const psbtHex = buildPsbt([{ script: P2WPKH_SCRIPT }]);
    const out = Psbt.fromHex(
      _applySignaturesToPsbt(psbtHex, [
        {
          inputIndex: 0,
          pubkey: new Uint8Array(33).fill(0x02),
          signature: FAKE_DER_SIG,
        },
      ])
    );
    expect(out.data.inputs[0].partialSig).toHaveLength(1);
    expect(out.data.inputs[0].tapKeySig).toBeUndefined();
    expect(out.data.inputs[0].tapScriptSig).toBeUndefined();
  });

  it('writes tapKeySig for taproot key-path input', () => {
    const psbtHex = buildPsbt([{ script: P2TR_SCRIPT, tapInternalKey: Buffer.alloc(32) }]);
    const out = Psbt.fromHex(
      _applySignaturesToPsbt(psbtHex, [
        { inputIndex: 0, pubkey: new Uint8Array(32), signature: new Uint8Array(64) },
      ])
    );
    expect(out.data.inputs[0].tapKeySig).toBeDefined();
    expect(out.data.inputs[0].partialSig).toBeUndefined();
    expect(out.data.inputs[0].tapScriptSig).toBeUndefined();
  });

  it('writes tapScriptSig for taproot script-path input', () => {
    const psbtHex = buildPsbt([{ script: P2TR_SCRIPT, tapLeafScript: [LEAF] }]);
    const out = Psbt.fromHex(
      _applySignaturesToPsbt(psbtHex, [
        {
          inputIndex: 0,
          pubkey: new Uint8Array(32),
          signature: new Uint8Array(64),
          tapleafHash: new Uint8Array(32).fill(0xaa),
        },
      ])
    );
    expect(out.data.inputs[0].tapScriptSig).toHaveLength(1);
    expect(out.data.inputs[0].tapKeySig).toBeUndefined();
    expect(out.data.inputs[0].partialSig).toBeUndefined();
  });

  it('throws when script-path signature is missing tapleafHash', () => {
    const psbtHex = buildPsbt([{ script: P2TR_SCRIPT, tapLeafScript: [LEAF] }]);
    expect(() =>
      _applySignaturesToPsbt(psbtHex, [
        { inputIndex: 0, pubkey: new Uint8Array(32), signature: new Uint8Array(64) },
      ])
    ).toThrow(/script-path signature missing tapleafHash/);
  });

  it('throws when taproot input receives a 33B pubkey', () => {
    const psbtHex = buildPsbt([{ script: P2TR_SCRIPT, tapInternalKey: Buffer.alloc(32) }]);
    expect(() =>
      _applySignaturesToPsbt(psbtHex, [
        {
          inputIndex: 0,
          pubkey: new Uint8Array(33).fill(0x02),
          signature: new Uint8Array(64),
        },
      ])
    ).toThrow(/taproot key-path pubkey must be 32B/);
  });

  it('throws when ECDSA input receives a 32B pubkey', () => {
    const psbtHex = buildPsbt([{ script: P2WPKH_SCRIPT }]);
    expect(() =>
      _applySignaturesToPsbt(psbtHex, [
        { inputIndex: 0, pubkey: new Uint8Array(32), signature: new Uint8Array(64) },
      ])
    ).toThrow(/ECDSA pubkey must be 33B or 65B/);
  });

  it('throws when ECDSA signature carries tapleafHash', () => {
    const psbtHex = buildPsbt([{ script: P2WPKH_SCRIPT }]);
    expect(() =>
      _applySignaturesToPsbt(psbtHex, [
        {
          inputIndex: 0,
          pubkey: new Uint8Array(33).fill(0x02),
          signature: new Uint8Array(64),
          tapleafHash: new Uint8Array(32),
        },
      ])
    ).toThrow(/ECDSA signature must not carry tapleafHash/);
  });

  it('throws when inputIndex is out of range', () => {
    const psbtHex = buildPsbt([{ script: P2WPKH_SCRIPT }]);
    expect(() =>
      _applySignaturesToPsbt(psbtHex, [
        { inputIndex: 5, pubkey: new Uint8Array(33).fill(0x02), signature: new Uint8Array(64) },
      ])
    ).toThrow(/no PSBT input at index 5/);
  });
});
