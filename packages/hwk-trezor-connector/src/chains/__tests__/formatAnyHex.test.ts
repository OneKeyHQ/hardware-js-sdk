import { normalizeEvmSignTxHexFields } from '../evm';
import { assertHexString, formatAnyHex } from '../utils';

import type { EvmSignTxTrezorParams } from '@onekeyfe/hwk-adapter-core';

/**
 * `formatAnyHex` is the reusable outgoing-param normalizer (OneKey hd-core
 * parity). It MUST: strip 0x, even-pad odd hex, recurse arrays/objects, and
 * never corrupt non-hex containers (it is scoped by callers, but the safety
 * guards are still asserted here).
 */
describe('formatAnyHex', () => {
  it('strips 0x and even-pads odd-length hex', () => {
    expect(formatAnyHex('0x1')).toBe('01');
    expect(formatAnyHex('0x4a817c800')).toBe('04a817c800');
    expect(formatAnyHex('0X0A')).toBe('0A');
  });

  it('leaves even-length hex unchanged and does NOT strip leading zero bytes', () => {
    // minimality stripping is trezorHexAmount's job, not formatAnyHex's.
    expect(formatAnyHex('0x0100')).toBe('0100');
    expect(formatAnyHex('00ab')).toBe('00ab');
  });

  it('passes numbers, booleans, null and undefined through untouched', () => {
    expect(formatAnyHex(60)).toBe(60);
    expect(formatAnyHex(true)).toBe(true);
    expect(formatAnyHex(null)).toBe(null);
    expect(formatAnyHex(undefined)).toBe(undefined);
  });

  it('recurses arrays and plain objects', () => {
    expect(formatAnyHex(['0x1', '0xab'])).toEqual(['01', 'ab']);
    expect(formatAnyHex({ a: '0x1', b: { c: '0xabc' }, n: 5 })).toEqual({
      a: '01',
      b: { c: '0abc' },
      n: 5,
    });
  });

  it('does not flatten ArrayBuffer / typed arrays to {}', () => {
    const buf = new ArrayBuffer(4);
    expect(formatAnyHex(buf)).toBe(buf);
    const u8 = new Uint8Array([1, 2, 3]);
    expect(formatAnyHex(u8)).toBe(u8);
  });
});

/**
 * The guard that turns silent `Buffer.from(v,'hex')` truncation into a loud
 * InvalidParams. MUST accept every shape valid hex takes (empty, 0x prefix,
 * odd length, any case) and reject only strings with non-hex characters.
 */
describe('assertHexString', () => {
  it('accepts empty, 0x-prefixed, odd-length and mixed-case hex', () => {
    expect(() => assertHexString('f', '')).not.toThrow();
    expect(() => assertHexString('f', '0x')).not.toThrow();
    expect(() => assertHexString('f', '0X1')).not.toThrow();
    expect(() => assertHexString('f', '5')).not.toThrow();
    expect(() => assertHexString('f', 'ABCDEF')).not.toThrow();
    expect(() => assertHexString('f', '0x16345785d8a0000')).not.toThrow();
  });

  it('rejects non-hex characters (would otherwise truncate to wrong bytes)', () => {
    expect(() => assertHexString('value', 'zz')).toThrow(/value must be a hex string/);
    expect(() => assertHexString('value', '12zz34')).toThrow(/hex string/);
    expect(() => assertHexString('value', '0xgg')).toThrow(/hex string/);
    expect(() => assertHexString('value', '12 34')).toThrow(/hex string/);
  });
});

/**
 * The single EVM chokepoint. Hex fields get normalized; non-hex fields
 * (path / chainId / paymentRequest / ethereumDefinitions) MUST be preserved
 * verbatim — that is exactly what keeps this safe to call in one place.
 */
describe('normalizeEvmSignTxHexFields', () => {
  it('normalizes amount fields (the nonce/gas truncation bug)', () => {
    const out = normalizeEvmSignTxHexFields({
      path: "m/44'/60'/0'/0/0",
      nonce: '0x1',
      gasPrice: '0x4a817c800',
      gasLimit: '0x5208',
      value: '0x16345785d8a0000',
      chainId: 1,
    } as EvmSignTxTrezorParams);
    expect(out.nonce).toBe('01');
    expect(out.gasPrice).toBe('04a817c800');
    expect(out.gasLimit).toBe('5208');
    expect(out.value).toBe('016345785d8a0000');
  });

  it('deep-normalizes accessList address + storageKeys (N4)', () => {
    const out = normalizeEvmSignTxHexFields({
      path: "m/44'/60'/0'/0/0",
      maxFeePerGas: '0x3',
      maxPriorityFeePerGas: '0x1',
      accessList: [
        {
          address: '0xabcdef0000000000000000000000000000000001',
          storageKeys: ['0x01', '0x00ff'],
        },
      ],
    } as EvmSignTxTrezorParams);
    expect(out.maxFeePerGas).toBe('03');
    expect(out.maxPriorityFeePerGas).toBe('01');
    expect(out.accessList).toEqual([
      {
        address: 'abcdef0000000000000000000000000000000001',
        storageKeys: ['01', '00ff'],
      },
    ]);
  });

  it('rejects invalid hex in an accessList address instead of signing truncated bytes', () => {
    expect(() =>
      normalizeEvmSignTxHexFields({
        path: "m/44'/60'/0'/0/0",
        maxFeePerGas: '0x3',
        maxPriorityFeePerGas: '0x1',
        accessList: [
          {
            address: '0xzzcdef0000000000000000000000000000000001',
            storageKeys: ['0x01'],
          },
        ],
      } as EvmSignTxTrezorParams)
    ).toThrow(/accessList\[0\]\.address must be a hex string/);
  });

  it('rejects invalid hex in an accessList storage key instead of signing truncated bytes', () => {
    expect(() =>
      normalizeEvmSignTxHexFields({
        path: "m/44'/60'/0'/0/0",
        maxFeePerGas: '0x3',
        maxPriorityFeePerGas: '0x1',
        accessList: [
          {
            address: '0xabcdef0000000000000000000000000000000001',
            storageKeys: ['0x01', '0xGG'],
          },
        ],
      } as EvmSignTxTrezorParams)
    ).toThrow(/accessList\[0\]\.storageKeys\[1\] must be a hex string/);
  });

  it('accepts an empty accessList and an entry carrying no storageKeys', () => {
    // The per-item hex validation must not turn these into a hard failure:
    // an empty list is the normal EIP-1559 case, and storageKeys is optional
    // in practice even though the type declares it.
    const out = normalizeEvmSignTxHexFields({
      path: "m/44'/60'/0'/0/0",
      maxFeePerGas: '0x3',
      maxPriorityFeePerGas: '0x1',
      accessList: [],
    } as unknown as EvmSignTxTrezorParams);
    expect(out.accessList).toEqual([]);

    const noKeys = normalizeEvmSignTxHexFields({
      path: "m/44'/60'/0'/0/0",
      maxFeePerGas: '0x3',
      maxPriorityFeePerGas: '0x1',
      accessList: [{ address: '0xabcdef0000000000000000000000000000000001' }],
    } as unknown as EvmSignTxTrezorParams);
    expect(noKeys.accessList).toEqual([
      { address: 'abcdef0000000000000000000000000000000001' },
    ]);
  });

  it('rejects invalid hex in amount fields instead of signing truncated bytes', () => {
    expect(() =>
      normalizeEvmSignTxHexFields({
        path: "m/44'/60'/0'/0/0",
        value: 'zz',
        chainId: 1,
      } as EvmSignTxTrezorParams)
    ).toThrow(/value must be a hex string/);
  });

  it('pads odd-length data exactly like Trezor Suite (upstream parity)', () => {
    // Suite's EthereumSignTransaction deep-pads the whole tx, calldata
    // included. Excluding data from the padding is what once produced
    // Buffer.from truncation and a fractional data_length here.
    const out = normalizeEvmSignTxHexFields({
      path: "m/44'/60'/0'/0/0",
      value: '0x1',
      data: '0xabc',
      chainId: 1,
    } as EvmSignTxTrezorParams);
    expect(out.data).toBe('0abc'); // 2 whole bytes, data_length = 2
  });

  it('rejects invalid hex in the data field', () => {
    expect(() =>
      normalizeEvmSignTxHexFields({
        path: "m/44'/60'/0'/0/0",
        value: '0x1',
        data: '0xdead__beef',
        chainId: 1,
      } as EvmSignTxTrezorParams)
    ).toThrow(/data must be a hex string/);
  });

  it('leaves non-hex fields untouched (path, chainId, paymentRequest, definitions)', () => {
    const definitionsBuf = new ArrayBuffer(8);
    const out = normalizeEvmSignTxHexFields({
      path: "m/44'/60'/0'/0/0",
      chainId: 137,
      txType: 1,
      nonce: '0x1',
      paymentRequest: { recipientName: 'Alice', nonce: '0x1' },
      ethereumDefinitions: { encodedNetwork: definitionsBuf },
    } as unknown as EvmSignTxTrezorParams);
    expect(out.path).toBe("m/44'/60'/0'/0/0"); // not padded/stripped
    expect(out.chainId).toBe(137);
    expect(out.txType).toBe(1);
    expect(out.paymentRequest?.recipientName).toBe('Alice'); // plain text intact
    expect(out.ethereumDefinitions?.encodedNetwork).toBe(definitionsBuf); // binary intact
  });
});
