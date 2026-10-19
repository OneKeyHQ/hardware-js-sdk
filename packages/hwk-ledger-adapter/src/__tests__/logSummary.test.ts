import { bytesToHex } from '@onekeyfe/hwk-adapter-core';
import { Psbt, Transaction, crypto as btcCrypto } from 'bitcoinjs-lib';

import { LedgerConnectorBase } from '../connector/LedgerConnectorBase';
import { SignerEth } from '../signer/SignerEth';
import { summarizeForLog } from '../utils/logSummary';
import { onSdkEvent } from '../utils/sdkEventBus';

const sha16 = (input: string | Uint8Array) => bytesToHex(btcCrypto.sha256(input)).slice(0, 16);

const P2WPKH_SCRIPT = Buffer.concat([Buffer.from([0x00, 0x14]), Buffer.alloc(20, 0x22)]);
const PREV_TXID_BYTES = Buffer.alloc(32, 0x11);

function buildPsbt(): { hex: string; txid: string } {
  const psbt = new Psbt();
  psbt.addInput({
    hash: PREV_TXID_BYTES,
    index: 1,
    witnessUtxo: { script: P2WPKH_SCRIPT, value: 10_000n },
  });
  psbt.addOutput({ script: P2WPKH_SCRIPT, value: 9_000n });
  psbt.addOutput({ script: P2WPKH_SCRIPT, value: 500n });
  // Same unsigned transaction built independently of the PSBT.
  const tx = new Transaction();
  tx.version = 2;
  tx.addInput(PREV_TXID_BYTES, 1, 0xffffffff);
  tx.addOutput(P2WPKH_SCRIPT, 9_000n);
  tx.addOutput(P2WPKH_SCRIPT, 500n);
  return { hex: psbt.toHex(), txid: tx.getId() };
}

const XPUB =
  'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';
const EIP1559_TX = `0x02f86c0180843b9aca00850ba43b7400825208${'94'}${'cd'.repeat(
  20
)}880de0b6b3a764000080c0`;

describe('summarizeForLog with the Ledger PSBT describer', () => {
  it('summarizes a PSBT with its input/output counts and unsigned txid', () => {
    const { hex, txid } = buildPsbt();
    const out = summarizeForLog({ psbt: hex, coin: 'btc' }, { method: 'btcSignPsbt' }) as Record<
      string,
      string
    >;
    expect(out.psbt).toBe(
      `<hex len=${hex.length} sha256=${sha16(hex)} inputs=1 outputs=2 txid=${txid}>`
    );
    const base64 = Buffer.from(hex, 'hex').toString('base64');
    expect((summarizeForLog({ psbt: base64 }) as Record<string, string>).psbt).toContain(
      `txid=${txid}`
    );
    const bytes = Buffer.from(hex, 'hex');
    expect((summarizeForLog({ psbt: bytes }) as Record<string, string>).psbt).toBe(
      `<hex len=${bytes.length} sha256=${sha16(bytes)} inputs=1 outputs=2 txid=${txid}>`
    );
    // Unparseable PSBT: length and hash only.
    expect((summarizeForLog({ psbt: 'deadbeef' }) as Record<string, string>).psbt).toBe(
      `<hex len=8 sha256=${sha16('deadbeef')}>`
    );
  });

  it('keeps the generic summary for non-PSBT fields', () => {
    expect(summarizeForLog({ path: "m/84'/0'/0'", xpub: XPUB })).toEqual({
      path: "m/84'/0'/0'",
      xpub: `xpub… len=${XPUB.length}`,
    });
  });
});

// ---------------------------------------------------------------------------
// Real connector: every Ledger transport connector inherits LedgerConnectorBase.call
// ---------------------------------------------------------------------------

function completedAction(output: unknown) {
  return {
    observable: {
      subscribe(observer: { next: (state: unknown) => void }) {
        void Promise.resolve().then(() => observer.next({ status: 'completed', output }));
        return { unsubscribe: () => undefined };
      },
    },
    cancel: jest.fn(),
  };
}

const fakeBtcSdk = {
  signPsbt: jest.fn(() => completedAction([])),
  getExtendedPublicKey: jest.fn(() => completedAction({ extendedPublicKey: XPUB })),
};

const fakeBtcKit = {
  SignerBtcBuilder: jest.fn().mockImplementation(() => ({ build: () => fakeBtcSdk })),
  DefaultWallet: jest.fn(),
  DefaultDescriptorTemplate: {
    LEGACY: 'pkh(@0/**)',
    NESTED_SEGWIT: 'sh(wpkh(@0/**))',
    NATIVE_SEGWIT: 'wpkh(@0/**)',
    TAPROOT: 'tr(@0/**)',
  },
};

class LoggingTestConnector extends LedgerConnectorBase {
  constructor() {
    super(async () => ({}), {
      dmk: {} as never,
      importLedgerKit: async (pkg: string) => {
        if (pkg === '@ledgerhq/device-signer-kit-bitcoin') return fakeBtcKit;
        throw new Error(`unexpected kit ${pkg}`);
      },
    });
    const ethSdk = {
      signTransaction: jest.fn(() => completedAction({ r: '0x01', s: '0x02', v: 27 })),
    };
    (this as unknown as { _signerManager: unknown })._signerManager = {
      getOrCreate: async () => new SignerEth(ethSdk as never),
      invalidate: jest.fn(),
      clearAll: jest.fn(),
    };
  }
}

async function captureLogs(run: () => Promise<unknown>): Promise<string[]> {
  const logs: string[] = [];
  const stop = onSdkEvent(event => logs.push(event.message));
  try {
    await run();
  } finally {
    stop();
  }
  return logs;
}

describe('LedgerConnectorBase call logs', () => {
  it('logs an EVM transaction by path, type, length and hash, never its hex', async () => {
    const connector = new LoggingTestConnector();
    let result: unknown;
    const logs = await captureLogs(async () => {
      result = await connector.call('session-1', 'evmSignTransaction', {
        path: "m/44'/60'/0'/0/0",
        serializedTx: EIP1559_TX,
        chainId: 1,
      });
    });

    expect(result).toMatchObject({ success: true });
    const text = logs.join('\n');
    const callLine = logs.find(line => line.startsWith('[DMK] call: evmSignTransaction '));
    expect(callLine).toBeDefined();
    expect(callLine).toContain(`"path":"m/44'/60'/0'/0/0"`);
    expect(callLine).toContain('"chainId":1');
    expect(callLine).toContain(`len=${EIP1559_TX.length}`);
    expect(callLine).toContain(`sha256=${sha16(EIP1559_TX)}`);
    expect(callLine).toContain('type=eip1559');
    expect(text).not.toContain(EIP1559_TX);
    expect(text).not.toContain(EIP1559_TX.slice(2));
  });

  it('logs a PSBT by path, counts, txid, length and hash, never its bytes', async () => {
    const connector = new LoggingTestConnector();
    const { hex, txid } = buildPsbt();
    let result: unknown;
    const logs = await captureLogs(async () => {
      result = await connector.call('session-1', 'btcSignPsbt', {
        psbt: hex,
        coin: 'btc',
        path: "m/84'/0'/0'",
      });
    });

    expect(result).toMatchObject({ success: true });
    const text = logs.join('\n');
    const callLine = logs.find(line => line.startsWith('[DMK] call: btcSignPsbt '));
    expect(callLine).toContain(`"path":"m/84'/0'/0'"`);
    expect(callLine).toContain(`len=${hex.length}`);
    expect(callLine).toContain(`sha256=${sha16(hex)}`);
    expect(callLine).toContain(`inputs=1 outputs=2 txid=${txid}`);
    expect(text).not.toContain(hex);
    // No fragment of the PSBT beyond the magic header reaches the log.
    expect(text).not.toContain(hex.slice(10, 74));
  });

  it('never logs the xpub returned for btcGetPublicKey', async () => {
    const connector = new LoggingTestConnector();
    let result: unknown;
    const logs = await captureLogs(async () => {
      result = await connector.call('session-1', 'btcGetPublicKey', {
        path: "m/84'/0'/0'",
        coin: 'btc',
      });
    });

    expect(result).toMatchObject({ success: true, payload: { xpub: XPUB } });
    const text = logs.join('\n');
    expect(text).toContain(`xpub… len=${XPUB.length}`);
    expect(text).not.toContain(XPUB.slice(0, 12));
  });

  it('still logs the call when params cannot be serialized', async () => {
    const connector = new LoggingTestConnector();
    const params: Record<string, unknown> = { path: "m/44'/60'/0'/0/0", amount: 5n };
    params.self = params;
    const logs = await captureLogs(() => connector.call('session-1', 'unknownMethod', params));
    expect(logs).toContain(
      `[DMK] call: unknownMethod {"path":"m/44'/60'/0'/0/0","amount":"<amount>","self":"<circular>"}`
    );
  });
});
