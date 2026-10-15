import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

import { summarizeForLog } from '../utils/logSummary';

import type { LogPayloadDescriber } from '../utils/logSummary';

const sha16 = (input: string | Uint8Array) =>
  bytesToHex(sha256(typeof input === 'string' ? utf8ToBytes(input) : input)).slice(0, 16);

const XPUB =
  'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';
const EVM_ADDRESS = '0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b9f0e';
const EVM_PUBKEY = `0x04${'ab'.repeat(64)}`;
const EIP1559_TX = `0x02f86c0180843b9aca00850ba43b7400825208${'94'}${'cd'.repeat(
  20
)}880de0b6b3a764000080c0`;
const TYPED_DATA = {
  domain: { name: 'Mail', chainId: 1, verifyingContract: EVM_ADDRESS },
  types: { EIP712Domain: [], Mail: [{ name: 'contents', type: 'string' }] },
  primaryType: 'Mail',
  message: { contents: 'secret-mail-contents' },
};

describe('summarizeForLog', () => {
  it('keeps paths, chain ids, flags and enums, and masks addresses', () => {
    expect(
      summarizeForLog({
        path: "m/44'/60'/0'/0/0",
        chainId: 137,
        showOnDevice: true,
        mode: 'full',
        messageVersion: 1,
        coin: 'btc',
        scriptType: 'p2wpkh',
        address: EVM_ADDRESS,
        requiredSigners: ['9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'],
      })
    ).toEqual({
      path: "m/44'/60'/0'/0/0",
      chainId: 137,
      showOnDevice: true,
      mode: 'full',
      messageVersion: 1,
      coin: 'btc',
      scriptType: 'p2wpkh',
      address: '0x1a2b…9f0e',
      requiredSigners: ['9xQeWv…VFin'],
    });
  });

  it('reduces xpubs, public keys and chain codes to a prefix and length', () => {
    expect(
      summarizeForLog({
        xpub: XPUB,
        publicKey: EVM_PUBKEY,
        chainCode: 'cc'.repeat(32),
        accountKey: { path: "m/84'/0'/0'", publicKey: '02'.repeat(33), xpub: XPUB },
      })
    ).toEqual({
      xpub: `xpub… len=${XPUB.length}`,
      publicKey: `… len=${EVM_PUBKEY.length}`,
      chainCode: '… len=64',
      accountKey: { path: "m/84'/0'/0'", publicKey: '… len=66', xpub: `xpub… len=${XPUB.length}` },
    });
    // An xpub is recognised by its shape even under an unknown key or on its own.
    expect(summarizeForLog(XPUB)).toBe(`xpub… len=${XPUB.length}`);
    expect(summarizeForLog({ extended: XPUB })).toEqual({ extended: `xpub… len=${XPUB.length}` });
  });

  it('summarizes an EVM serialized transaction with its type', () => {
    const out = summarizeForLog(
      { path: "m/44'/60'/0'/0/0", serializedTx: EIP1559_TX },
      { method: 'evmSignTransaction' }
    ) as Record<string, string>;
    expect(out.serializedTx).toBe(
      `<hex len=${EIP1559_TX.length} sha256=${sha16(EIP1559_TX)} type=eip1559>`
    );
    const legacy = summarizeForLog(
      { serializedTx: 'f86c098504a817c800825208' },
      { method: 'evmSignTransaction' }
    ) as Record<string, string>;
    expect(legacy.serializedTx).toContain('type=legacy');
    for (const [prefix, type] of [
      ['01', 'eip2930'],
      ['03', 'eip4844'],
      ['04', 'eip7702'],
    ]) {
      const tx = `0x${prefix}f8${'00'.repeat(8)}`;
      expect(
        (summarizeForLog({ serializedTx: tx }, { method: 'evmSignTransaction' }) as any)
          .serializedTx
      ).toContain(`type=${type}`);
    }
  });

  it('summarizes typed data as JSON with its primaryType', () => {
    const out = summarizeForLog(
      { path: "m/44'/60'/0'/0/0", data: TYPED_DATA },
      { method: 'evmSignTypedData' }
    ) as Record<string, string>;
    const json = JSON.stringify(TYPED_DATA);
    expect(out.data).toBe(`<json len=${json.length} sha256=${sha16(json)} primaryType=Mail>`);
    const asString = summarizeForLog({ dataJson: json }) as Record<string, string>;
    expect(asString.dataJson).toBe(out.data);
  });

  it('hashes messages and bytes, and reduces signatures to their length', () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    expect(
      summarizeForLog({
        message: 'hello world',
        rawTx: bytes,
        signature: `0x${'ef'.repeat(65)}`,
        signatures: ['aa', 'bb'],
        r: '0x01',
        s: '0x02',
        v: '0x1b',
      })
    ).toEqual({
      message: `<str len=11 sha256=${sha16('hello world')}>`,
      rawTx: `<hex len=4 sha256=${sha16(bytes)}>`,
      signature: '<signature len=132>',
      signatures: '<signatures count=2>',
      r: '<signature len=4>',
      s: '<signature len=4>',
      v: '<signature len=4>',
    });
    expect(
      summarizeForLog(
        { signedPsbt: 'ab'.repeat(40), serializedTx: 'cd'.repeat(40) },
        {
          role: 'result',
        }
      )
    ).toEqual({ signedPsbt: '<psbt len=80>', serializedTx: '<signedTx len=80>' });
  });

  it('keeps error fields and messages but not params nested in them', () => {
    const err = Object.assign(new Error('Failed to open "Ethereum"'), {
      _tag: 'OpenAppCommandError',
      code: 0x6807,
      statusCode: '6807',
    });
    expect(summarizeForLog({ error: err })).toEqual({
      error: {
        name: 'Error',
        message: 'Failed to open "Ethereum"',
        _tag: 'OpenAppCommandError',
        code: 0x6807,
        statusCode: '6807',
      },
    });
    expect(
      summarizeForLog({ error: { message: 'x'.repeat(80), params: { message: 'y'.repeat(80) } } })
    ).toEqual({
      error: {
        message: 'x'.repeat(80),
        params: { message: `<str len=80 sha256=${sha16('y'.repeat(80))}>` },
      },
    });
  });

  it('redacts viewing keys and passphrase state entirely', () => {
    expect(summarizeForLog({ ufvk: 'uview1secret', passphraseState: 'state' })).toEqual({
      ufvk: '<redacted len=12>',
      passphraseState: '<redacted len=5>',
    });
  });

  it('hashes long unknown strings and caps arrays and depth', () => {
    const long = 'z'.repeat(65);
    const out = summarizeForLog({
      note: long,
      list: Array.from({ length: 25 }, (_, i) => i),
      deep: { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } },
    }) as Record<string, unknown>;
    expect(out.note).toBe(`<str len=65 sha256=${sha16(long)}>`);
    expect(out.list).toHaveLength(21);
    expect((out.list as unknown[])[20]).toBe('…+5 more');
    expect(JSON.stringify(out.deep)).toContain('<depth>');
  });

  it('never throws on odd inputs', () => {
    const circular: Record<string, unknown> = { path: "m/0'" };
    circular.self = circular;
    expect(summarizeForLog(circular)).toEqual({ path: "m/0'", self: '<circular>' });
    expect(summarizeForLog({ amount: 10n, data: { value: 1n } })).toEqual({
      amount: '<amount>',
      data: expect.stringMatching(/^<json len=\d+ sha256=[0-9a-f]{16}>$/),
    });
    expect(summarizeForLog(undefined)).toBeUndefined();
    expect(summarizeForLog(null)).toBeNull();
    expect(summarizeForLog({ fn: () => 1, sym: Symbol('x'), nan: NaN })).toEqual({
      fn: '<function>',
      sym: '<symbol>',
      nan: 'NaN',
    });
    const circularPayload: Record<string, unknown> = {};
    circularPayload.loop = circularPayload;
    expect(summarizeForLog({ transaction: circularPayload })).toEqual({
      transaction: '<object unhashable>',
    });
    const hostile = {
      get path() {
        throw new Error('boom');
      },
    };
    expect(summarizeForLog(hostile)).toBe('<unloggable>');
    expect(() => JSON.stringify(summarizeForLog({ x: 1n, y: [circular] }))).not.toThrow();
  });
});

describe('summarizeForLog key normalization and secrets', () => {
  it('matches snake_case and kebab-case keys like their camelCase spelling', () => {
    expect(
      summarizeForLog({
        private_key: 'pk',
        chain_code_keep: 'not-sensitive',
        node: { private_key: 'pk2', public_key: '02'.repeat(33), chain_code: 'cc'.repeat(32) },
        'serialized-tx': 'ab'.repeat(40),
        to_address: EVM_ADDRESS,
      })
    ).toEqual({
      private_key: '<redacted len=2>',
      chain_code_keep: 'not-sensitive',
      node: { private_key: '<redacted len=3>', public_key: '… len=66', chain_code: '… len=64' },
      'serialized-tx': `<hex len=80 sha256=${sha16('ab'.repeat(40))}>`,
      to_address: '0x1a2b…9f0e',
    });
  });

  it('redacts PIN, passphrase, seed-level, THP and session material', () => {
    const secrets: Record<string, unknown> = {
      pin: '1234',
      passphrase: 'secret',
      password: 'pw',
      passphraseState: 'st',
      credential: 'c',
      credentials: [{ trezor_static_public_key: 'tk', credential: 'c' }],
      host_static_key: 'hk',
      trezor_static_public_key: 'tk',
      entropy: 'deadbeef',
      mnemonic: 'abandon abandon',
      mnemonics: ['abandon abandon'],
      seed: 'seedhex',
      word: 'abandon',
      words: ['abandon'],
      privateKey: 'pk',
      xprv: 'xprv-material',
      session: 'session-hex',
      sessionId: 'session-hex',
      knownConnections: [{ connectId: 'c1' }],
      extra: { anything: 1 },
      mac: 'ff'.repeat(32),
    };
    const out = summarizeForLog(secrets) as Record<string, string>;
    for (const key of Object.keys(secrets)) {
      expect(out[key]).toMatch(/^<redacted len=\d+>$/);
    }
    const text = JSON.stringify(out);
    for (const leaked of ['1234', 'secret', 'abandon', 'seedhex', 'session-hex', 'xprv-material']) {
      expect(text).not.toContain(leaked);
    }
  });

  it('summarizes binary and JSON-serialized Buffers by length and hash', () => {
    const bytes = new Uint8Array([9, 8, 7]);
    expect(
      summarizeForLog({
        definitions: bytes.buffer,
        raw: new DataView(bytes.buffer),
        ipc: { type: 'Buffer', data: [9, 8, 7] },
      })
    ).toEqual({
      definitions: `<hex len=3 sha256=${sha16(bytes)}>`,
      raw: `<hex len=3 sha256=${sha16(bytes)}>`,
      ipc: `<hex len=3 sha256=${sha16(bytes)}>`,
    });
  });

  it('masks short addresses to their length only', () => {
    expect(summarizeForLog({ address: '0xabc' })).toEqual({ address: '<addr len=5>' });
  });
});

describe('summarizeForLog payload describer', () => {
  it('appends describer hints to hex, string and byte payloads with a normalized key', () => {
    const describe = jest.fn<ReturnType<LogPayloadDescriber>, Parameters<LogPayloadDescriber>>(
      key => (key === 'serializedtx' ? 'extra=1' : undefined)
    );
    const bytes = new Uint8Array([1, 2]);
    const out = summarizeForLog(
      { serialized_tx: EIP1559_TX, rawTx: bytes, message: 'hello' },
      { method: 'evmSignTransaction', describePayload: describe }
    ) as Record<string, string>;
    expect(out.serialized_tx).toBe(
      `<hex len=${EIP1559_TX.length} sha256=${sha16(EIP1559_TX)} type=eip1559 extra=1>`
    );
    expect(out.rawTx).toBe(`<hex len=2 sha256=${sha16(bytes)}>`);
    expect(out.message).toBe(`<str len=5 sha256=${sha16('hello')}>`);
    expect(describe).toHaveBeenCalledWith('serializedtx', EIP1559_TX, {
      method: 'evmSignTransaction',
      role: 'params',
    });
    expect(describe).toHaveBeenCalledWith('rawtx', bytes, {
      method: 'evmSignTransaction',
      role: 'params',
    });
  });

  it('ignores a describer that throws or returns nothing useful', () => {
    const out = summarizeForLog(
      { psbt: 'deadbeef', data: 'cafe' },
      {
        describePayload: key => {
          if (key === 'psbt') throw new Error('boom');
          return '';
        },
      }
    );
    expect(out).toEqual({
      psbt: `<hex len=8 sha256=${sha16('deadbeef')}>`,
      data: `<hex len=4 sha256=${sha16('cafe')}>`,
    });
  });

  it('does not call the describer for JSON payloads or non-payload fields', () => {
    const describe = jest.fn(() => 'never');
    summarizeForLog(
      { path: "m/0'", dataJson: JSON.stringify(TYPED_DATA), address: EVM_ADDRESS },
      { describePayload: describe }
    );
    expect(describe).not.toHaveBeenCalled();
  });

  it('hides amounts in structured transaction params', () => {
    const out = JSON.stringify(
      summarizeForLog(
        {
          to: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9f0e',
          value: '0xde0b6b3a7640000',
          nonce: '0x5',
        },
        { method: 'evmSignTransaction' }
      )
    );
    expect(out).not.toContain('de0b6b3a7640000');
    expect(out).toContain('"value":"<amount>"');
    expect(out).toContain('"nonce":"0x5"');
  });
});
