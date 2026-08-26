import {
  CryptoCoinInfo,
  CryptoHDKey,
  CryptoKeypath,
  CryptoMultiAccounts,
  CryptoPSBT,
  PathComponent,
  QRHardwareCall,
} from '@keystonehq/bc-ur-registry';
import { ETHSignature, EthSignRequest } from '@keystonehq/bc-ur-registry-eth';
import { SolSignRequest, SolSignature } from '@keystonehq/bc-ur-registry-sol';
import { HardwareErrorCode, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hwk-adapter-core';
import HDKey from 'hdkey';

import { KeystoneAdapter } from '../adapter/KeystoneAdapter';
import { normalizePath } from '../adapter/pathUtils';
import { TronSignRequest } from '../urEngine/TronSignRequest';
import { TronSignature as TronUrSignature } from '../urEngine/TronSignature';

import type { KeyDerivation } from '@keystonehq/bc-ur-registry';
import type {
  ConnectorCallResult,
  DeviceInfo,
  HardwareEvent,
  IConnector,
  QrDisplayData,
} from '@onekeyfe/hwk-adapter-core';

// Every test in this file either answers its own QR requests via
// attachFakeDevice or expects to fail fast (cancel/timeout tests). None of
// them should ever legitimately wait the registry's real 10-minute default,
// so give every adapter a short timeout up front — an unanswered request
// (a wiring bug, not a real timeout scenario) fails in seconds, not minutes.
jest.setTimeout(15000);
function newTestAdapter(): KeystoneAdapter {
  return new KeystoneAdapter({ qrTimeoutMs: 5000 });
}

// A fixed, clearly-synthetic 32-byte seed (all 0x09) — not a real seed
// phrase. Every fixture key below derives from it via the real `hdkey`
// library, so xpubs/pubkeys are cryptographically well-formed (needed for
// `evmGetAddress`'s address derivation to succeed), matching the technique
// already used in KeystoneUrEngine.test.ts.
const FIXTURE_ROOT = HDKey.fromMasterSeed(Buffer.alloc(32, 0x09));
const FIXTURE_MFP = FIXTURE_ROOT.fingerprint.toString(16).padStart(8, '0');
const OTHER_MFP = 'deadbeef';

function pathComponents(path: string): PathComponent[] {
  return normalizePath(path)
    .slice(2)
    .split('/')
    .map(segment => {
      const hardened = segment.endsWith("'");
      return new PathComponent({
        index: Number(hardened ? segment.slice(0, -1) : segment),
        hardened,
      });
    });
}

function fixtureHdKey(path: string, mfpHex: string): CryptoHDKey {
  const node = FIXTURE_ROOT.derive(normalizePath(path));
  if (!node.publicKey || !node.chainCode) {
    throw new Error('fixtureHdKey: derived node is missing publicKey/chainCode');
  }
  const parentFingerprint = Buffer.alloc(4);
  parentFingerprint.writeUInt32BE(node.parentFingerprint, 0);
  return new CryptoHDKey({
    isMaster: false,
    key: node.publicKey,
    chainCode: node.chainCode,
    // Required alongside chainCode for the SDK to populate extendedPublicKey
    // (see keystone-sdk's parseMultiAccounts: both must be non-empty).
    parentFingerprint,
    useInfo: new CryptoCoinInfo(),
    origin: new CryptoKeypath(pathComponents(path), Buffer.from(mfpHex, 'hex')),
  });
}

function urJson(ur: { type: string; cbor: Buffer }): { urType: string; urData: string } {
  return { urType: ur.type, urData: ur.cbor.toString('hex') };
}

/**
 * A syntactically valid but deterministically-wrong UUID (v4 version/variant
 * nibbles set, rest of the bytes clearly synthetic 0xee filler) — a plain
 * `Buffer.alloc(16, 0xee)` fails `uuid`'s own strict RFC4122 stringify
 * validation and throws before the adapter's requestId comparison ever runs.
 */
function wrongUuidBuffer(): Buffer {
  const bytes = Buffer.alloc(16, 0xee);
  bytes[6] = 0x4e; // version nibble
  bytes[8] = 0x8e; // variant nibble
  return bytes;
}

interface FakeDeviceOptions {
  /** Have the fixture device answer with a different mfp than requested — simulates scanning the wrong wallet. */
  mfpMismatch?: boolean;
  /** Have the fixture device echo back a requestId that doesn't match the pending request. */
  wrongRequestId?: boolean;
  /**
   * When a `qr-hardware-call` requests a BTC account (any purpose), also
   * volunteer the other three standard script-type variants at the same
   * account index — real Keystone hardware does this for a "connect
   * software wallet"-style KeyDerivation request (confirmed against real
   * hardware during this session), returning more keys than were literally
   * asked for. Off by default so the existing 1-request-in/1-key-out
   * fixtures stay exact.
   */
  bundleExtraBtcVariants?: boolean;
}

/**
 * Wires a fake Keystone device onto an adapter under test: answers every
 * `REQUEST_QR_DISPLAY` by decoding the actual UR the adapter built (via the
 * same registry classes a real device uses) and replying through the exact
 * `uiResponse()` path the app would in production. This exercises the real
 * event orchestration end to end — nothing about `KeystoneAdapter` internals
 * is mocked.
 */
function attachFakeDevice(adapter: KeystoneAdapter, options: FakeDeviceOptions = {}) {
  const requests: Array<{ device: DeviceInfo; data: QrDisplayData }> = [];
  const mfpHex = options.mfpMismatch ? OTHER_MFP : FIXTURE_MFP;

  const handler = (event: { payload: { device: DeviceInfo; data: QrDisplayData } }) => {
    const { device, data } = event.payload;
    requests.push({ device, data });
    const cbor = Buffer.from(data.urData, 'hex');

    switch (data.urType) {
      case 'qr-hardware-call': {
        const call = QRHardwareCall.fromCBOR(cbor);
        const requestedPaths = (call.getParams() as KeyDerivation)
          .getSchemas()
          .map(schema => `m/${schema.getKeypath().getPath()}`);
        const bundledPaths = [...requestedPaths];
        if (options.bundleExtraBtcVariants) {
          for (const requestedPath of requestedPaths) {
            const btcMatch = requestedPath.match(/^m\/\d+'\/0'\/(\d+)'$/);
            if (btcMatch) {
              for (const purpose of ["44'", "49'", "84'", "86'"]) {
                const variant = `m/${purpose}/0'/${btcMatch[1]}'`;
                if (!bundledPaths.includes(variant)) bundledPaths.push(variant);
              }
            }
          }
        }
        const keys = bundledPaths.map(path => fixtureHdKey(path, mfpHex));
        const response = new CryptoMultiAccounts(
          Buffer.from(mfpHex, 'hex'),
          keys,
          'Keystone 3 Pro (fixture)'
        );
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_QR_RESPONSE,
          payload: urJson(response.toUR()),
        });
        return;
      }
      case 'eth-sign-request': {
        const request = EthSignRequest.fromCBOR(cbor);
        const requestId = options.wrongRequestId ? wrongUuidBuffer() : request.getRequestId();
        const signature = new ETHSignature(Buffer.alloc(65, 0x07), requestId);
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_QR_RESPONSE,
          payload: urJson(signature.toUR()),
        });
        return;
      }
      case 'sol-sign-request': {
        const request = SolSignRequest.fromCBOR(cbor);
        const requestId = options.wrongRequestId ? wrongUuidBuffer() : request.getRequestId();
        const signature = new SolSignature(Buffer.alloc(64, 0x08), requestId);
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_QR_RESPONSE,
          payload: urJson(signature.toUR()),
        });
        return;
      }
      case 'crypto-psbt': {
        const signed = new CryptoPSBT(Buffer.from('signed-psbt-fixture-bytes'));
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_QR_RESPONSE,
          payload: urJson(signed.toUR()),
        });
        return;
      }
      case 'tron-sign-request': {
        const request = TronSignRequest.fromCBOR(cbor);
        const requestId = options.wrongRequestId ? wrongUuidBuffer() : request.getRequestId();
        const signature = new TronUrSignature(Buffer.alloc(65, 0x06), requestId);
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_QR_RESPONSE,
          payload: urJson(signature.toUR()),
        });
        return;
      }
      default:
        throw new Error(`attachFakeDevice: unhandled urType ${data.urType}`);
    }
  };

  adapter.on(UI_REQUEST.REQUEST_QR_DISPLAY, handler);
  return {
    requests,
    detach: () => adapter.off(UI_REQUEST.REQUEST_QR_DISPLAY, handler),
  };
}

/**
 * A fake `IConnector` standing in for `hwk-keystone-connector-usb`'s real
 * `KeystoneUsbConnectorBase` (that package has its own tests for actual UR
 * wire encoding — see `KeystoneUsbConnectorBase.test.ts`). This fake skips
 * straight to the `{urType, urData}` shape `KeystoneAdapter._resolveUr`
 * hands to `IConnector.call(sessionId, 'resolveUr', ur)`, and answers it the
 * same way `attachFakeDevice` answers a QR request — real registry classes,
 * not a mocked adapter internal — so what's under test is
 * `KeystoneAdapter`'s USB routing/merge logic, not UR encoding.
 */
function fakeUsbConnector(mfpHex: string = FIXTURE_MFP) {
  const calls: Array<{ sessionId: string; method: string; params: unknown }> = [];
  const connector: IConnector = {
    connectionType: 'usb',
    searchDevices: () =>
      Promise.resolve([
        {
          connectId: 'keystone-usb:FAKE-SERIAL',
          deviceId: '',
          name: 'Keystone 3 Pro',
          connectionType: 'usb',
          capabilities: { persistentDeviceIdentity: true },
        },
      ]),
    connect: () =>
      Promise.resolve({
        sessionId: mfpHex,
        deviceInfo: {
          vendor: 'keystone',
          model: 'Keystone 3 Pro',
          firmwareVersion: '1.7.0',
          deviceId: mfpHex,
          connectId: mfpHex,
          connectionType: 'usb',
          capabilities: { persistentDeviceIdentity: true },
        },
      }),
    disconnect: () => Promise.resolve(),
    call: (sessionId, method, params) => {
      calls.push({ sessionId, method, params });
      if (method !== 'resolveUr') {
        return Promise.resolve<ConnectorCallResult>({
          success: false,
          error: { message: `fakeUsbConnector: unhandled method ${method}` },
        });
      }
      const { urType, urData } = params as { urType: string; urData: string };
      const cbor = Buffer.from(urData, 'hex');
      switch (urType) {
        case 'qr-hardware-call': {
          const call = QRHardwareCall.fromCBOR(cbor);
          const keys = (call.getParams() as KeyDerivation)
            .getSchemas()
            .map(schema => fixtureHdKey(`m/${schema.getKeypath().getPath()}`, mfpHex));
          const response = new CryptoMultiAccounts(
            Buffer.from(mfpHex, 'hex'),
            keys,
            'Keystone 3 Pro (fixture)'
          );
          return Promise.resolve<ConnectorCallResult>({
            success: true,
            payload: urJson(response.toUR()),
          });
        }
        case 'eth-sign-request': {
          const request = EthSignRequest.fromCBOR(cbor);
          const signature = new ETHSignature(Buffer.alloc(65, 0x07), request.getRequestId());
          return Promise.resolve<ConnectorCallResult>({
            success: true,
            payload: urJson(signature.toUR()),
          });
        }
        default:
          return Promise.resolve<ConnectorCallResult>({
            success: false,
            error: { message: `fakeUsbConnector: unhandled urType ${urType}` },
          });
      }
    },
    cancel: () => Promise.resolve(),
    uiResponse: () => {},
    on: () => {},
    off: () => {},
    reset: () => {},
  };
  return { connector, calls };
}

describe('KeystoneAdapter', () => {
  describe('importFromQr', () => {
    it('syncs the default EVM/BTC/SOL/TRON account set and registers the device by mfp', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.importFromQr();

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.deviceId).toBe(FIXTURE_MFP);
      expect(result.payload.vendor).toBe('keystone');
      expect(result.payload.connectionType).toBe('qr');
      expect(fake.requests).toHaveLength(1);
      expect(fake.requests[0].data.urType).toBe('qr-hardware-call');

      const devices = await adapter.searchDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe(FIXTURE_MFP);
    });

    it("requests all 3 working BTC script types up front, so a P2WPKH (84') address needs no second round trip", async () => {
      // DEFAULT_IMPORT_SCHEMAS explicitly lists 44'/49'/84' now (not just
      // 44') — this is the deterministic fix; it does NOT rely on the device
      // volunteering anything on its own.
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      expect(fake.requests).toHaveLength(1); // still one round trip, not three

      const result = await adapter.btcGetAddress(null, FIXTURE_MFP, {
        path: "m/84'/0'/0'/0/0",
        showOnDevice: false,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.address).toMatch(/^bc1q[0-9a-z]{38}$/);
      // No second round trip — the 84' account was already cached from onboarding.
      expect(fake.requests).toHaveLength(1);
    });

    it('keeps a BTC script-type variant a device volunteers beyond what was explicitly requested', async () => {
      // Separate from the test above: even if only ONE BTC path is actually
      // requested (unlike the real default schema), `inferHwkChainFromPath`
      // must still correctly classify — not drop — a differently-prefixed
      // path the device throws in unprompted. This used to hardcode purpose
      // 44' and silently discard anything else.
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter, { bundleExtraBtcVariants: true });

      const imported = await adapter.importFromQr({
        paths: [{ hwkChain: 'btc', path: "m/44'/0'/0'" }],
      });
      expect(imported.success).toBe(true);
      expect(fake.requests).toHaveLength(1);

      const result = await adapter.btcGetAddress(null, FIXTURE_MFP, {
        path: "m/84'/0'/0'/0/0",
        showOnDevice: false,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.address).toMatch(/^bc1q[0-9a-z]{38}$/);
      // The 84' variant was never explicitly requested — only volunteered by
      // the fixture device alongside the 44' response — yet it's still
      // cached, so no second round trip is needed.
      expect(fake.requests).toHaveLength(1);
    });
  });

  describe('evmSignTransaction', () => {
    it('cold start: drives an implicit sync round trip, then the sign round trip', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.evmSignTransaction(null, null, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`, // fake EIP-1559-shaped payload (type byte 0x02)
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.r).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.payload.s).toMatch(/^0x[0-9a-f]{64}$/);
      expect(result.payload.v).toMatch(/^0x/);
      // Two round trips: implicit account sync (qr-hardware-call), then the
      // actual sign request (eth-sign-request) — exactly the "one UI request
      // to handle the wallet, then a second request to talk to the hardware"
      // flow for a call that doesn't know the wallet's xfp yet.
      expect(fake.requests.map(r => r.data.urType)).toEqual([
        'qr-hardware-call',
        'eth-sign-request',
      ]);
    });

    it("cold start's implicit mfp probe requests Keystone's documented ETH account path (m/44'/60'/0'), not the 5-segment fingerprint leaf path", async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      await adapter.evmSignMessage(null, null, { path: "m/44'/60'/0'/0/0", message: 'hi' });

      const probeRequest = fake.requests[0];
      expect(probeRequest.data.urType).toBe('qr-hardware-call');
      const call = QRHardwareCall.fromCBOR(Buffer.from(probeRequest.data.urData, 'hex'));
      const paths = (call.getParams() as KeyDerivation)
        .getSchemas()
        .map(schema => `m/${schema.getKeypath().getPath()}`);
      expect(paths).toEqual(["m/44'/60'/0'"]);
    });

    it('warm start: a previously-imported wallet skips the sync round trip', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      if (!imported.success) return;

      const result = await adapter.evmSignTransaction(
        imported.payload.connectId,
        imported.payload.deviceId,
        {
          path: "m/44'/60'/0'/0/0",
          serializedTx: `02${'ab'.repeat(30)}`,
        }
      );

      expect(result.success).toBe(true);
      // One request from importFromQr + exactly one more for the sign itself —
      // no second sync round trip since the account path was already cached.
      expect(fake.requests).toHaveLength(2);
      expect(fake.requests[1].data.urType).toBe('eth-sign-request');
    });

    it('rejects a legacy structured-fields call — Keystone only signs a serializedTx', async () => {
      const adapter = newTestAdapter();
      const result = await adapter.evmSignTransaction(null, null, {
        path: "m/44'/60'/0'/0/0",
        to: '0x0000000000000000000000000000000000dEaD',
        value: '0x0',
      } as never);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.MethodNotSupported);
    });

    it('rejects a scanned response whose requestId does not match the pending request', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter, { wrongRequestId: true });

      const result = await adapter.evmSignTransaction(null, null, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.DeviceMismatch);
    });

    it('fails closed when the scanned wallet does not match the requested deviceId', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter, { mfpMismatch: true });

      const result = await adapter.evmSignTransaction(`keystone-qr:${FIXTURE_MFP}`, FIXTURE_MFP, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.DeviceMismatch);
    });
  });

  describe('evmGetAddress', () => {
    it('derives a leaf address offline from the synced account xpub', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.evmGetAddress(null, null, { path: "m/44'/60'/0'/0/0" });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      // Only the account-level sync round trip — no separate leaf-path request.
      expect(fake.requests).toHaveLength(1);
      expect(fake.requests[0].data.urType).toBe('qr-hardware-call');
    });

    it('rejects a short path with nothing to derive', async () => {
      const adapter = newTestAdapter();
      const result = await adapter.evmGetAddress(null, null, { path: "m/44'/60'/0'" });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.InvalidParams);
    });
  });

  describe('btcSignPsbt', () => {
    it('round-trips an unsigned PSBT through the QR channel', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.btcSignPsbt(null, null, { psbt: 'cafe'.repeat(4), coin: 'BTC' });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.signedPsbt).toBe(
        Buffer.from('signed-psbt-fixture-bytes').toString('hex')
      );
      expect(fake.requests.map(r => r.data.urType)).toEqual(['qr-hardware-call', 'crypto-psbt']);
    });
  });

  describe('solSignTransaction', () => {
    it('signs via the QR channel and returns a hex signature', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.solSignTransaction(null, null, {
        path: "m/44'/501'/0'",
        serializedTx: 'cafe',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.signature).toBe('08'.repeat(64));
      expect(fake.requests.map(r => r.data.urType)).toEqual([
        'qr-hardware-call',
        'sol-sign-request',
      ]);
    });
  });

  describe('unsupported methods', () => {
    it.each([
      // P2PKH/P2SH-P2WPKH/P2WPKH (44'/49'/84') are implemented — see the
      // btcGetAddress describe block below. Only P2TR (86') remains
      // unsupported (needs an elliptic-curve library for BIP-341 tweaking).
      [
        'btcGetAddress (P2TR)',
        () => newTestAdapter().btcGetAddress(null, null, { path: "m/86'/0'/0'/0/0" }),
      ],
      [
        'tronSignMessage',
        () =>
          newTestAdapter().tronSignMessage(null, null, {
            path: "m/44'/195'/0'/0/0",
            messageHex: 'cafe',
          }),
      ],
    ])('%s returns MethodNotSupported rather than throwing', async (_name, call) => {
      const result = await call();
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.MethodNotSupported);
    });
  });

  describe('btcGetAddress', () => {
    it.each([
      ["m/44'/0'/0'/0/0", /^1[1-9A-HJ-NP-Za-km-z]{25,34}$/], // P2PKH
      ["m/49'/0'/0'/0/0", /^3[1-9A-HJ-NP-Za-km-z]{25,34}$/], // P2SH-P2WPKH
      ["m/84'/0'/0'/0/0", /^bc1q[0-9a-z]{38}$/], // P2WPKH
    ])('derives a real %s address for its script type', async (path, addressPattern) => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.btcGetAddress(null, null, { path, showOnDevice: false });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.address).toMatch(addressPattern);
      // Only the account-level sync round trip — offline derivation after that.
      expect(fake.requests).toHaveLength(1);
    });

    it('rejects a path whose purpose is not 44/49/84/86', async () => {
      const adapter = newTestAdapter();
      const result = await adapter.btcGetAddress(null, null, { path: "m/999'/0'/0'/0/0" });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.InvalidParams);
    });
  });

  describe('tronGetAddress', () => {
    it('derives a real TRON (base58check, 0x41-prefixed) address', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.tronGetAddress(null, null, { path: "m/44'/195'/0'/0/0" });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.address).toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);
      // Only the account-level sync round trip — offline derivation after that.
      expect(fake.requests).toHaveLength(1);
      expect(fake.requests[0].data.urType).toBe('qr-hardware-call');
    });

    it('rejects a short path with nothing to derive', async () => {
      const adapter = newTestAdapter();
      const result = await adapter.tronGetAddress(null, null, { path: "m/44'/195'/0'" });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.InvalidParams);
    });
  });

  describe('tronSignTransaction', () => {
    it('cold start: syncs the mfp then signs, returning a bare 65-byte signature', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.tronSignTransaction(null, null, {
        path: "m/44'/195'/0'/0/0",
        rawTxHex: 'ca'.repeat(40), // opaque bytes — Keystone's tron-sign-request carries them unparsed
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.signature).toBe('06'.repeat(65));
      expect(result.payload.serializedTx).toBeUndefined();
      // Implicit mfp sync (qr-hardware-call), then the sign round trip.
      expect(fake.requests.map(r => r.data.urType)).toEqual([
        'qr-hardware-call',
        'tron-sign-request',
      ]);
    });

    it('rejects a call with no rawTxHex — Keystone has no structured-field equivalent', async () => {
      const adapter = newTestAdapter();
      const result = await adapter.tronSignTransaction(null, null, {
        path: "m/44'/195'/0'/0/0",
        ownerAddress: `41${'ab'.repeat(20)}`,
      } as never);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.InvalidParams);
    });

    it('rejects a scanned response whose requestId does not match the pending request', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter, { wrongRequestId: true });

      const result = await adapter.tronSignTransaction(null, null, {
        path: "m/44'/195'/0'/0/0",
        rawTxHex: 'ca'.repeat(40),
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.DeviceMismatch);
    });
  });

  describe('cancel', () => {
    it('rejects a pending QR display request with UserAborted', async () => {
      const adapter = newTestAdapter();
      // No fake device attached — the request is left pending until cancelled.
      const pending = adapter.evmSignTransaction(null, null, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });

      // Let the job queue actually issue the display request before cancelling.
      await new Promise<void>(resolve => {
        setTimeout(resolve, 10);
      });
      adapter.cancel();

      const result = await pending;
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.UserAborted);
    });
  });

  describe('QR interaction timeout', () => {
    it('fails with OperationTimeout when the app never answers within qrTimeoutMs', async () => {
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 20 });
      // No fake device — nothing ever answers the display request.
      const result = await adapter.evmSignTransaction(null, null, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.OperationTimeout);
    });
  });

  describe('getChainFingerprint / btcGetMasterFingerprint', () => {
    it('getChainFingerprint derives a stable per-chain value without a device round trip', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const result = await adapter.getChainFingerprint(
        `keystone-qr:${FIXTURE_MFP}`,
        FIXTURE_MFP,
        'evm'
      );
      expect(result.success).toBe(true);
      expect(fake.requests).toHaveLength(0);
    });

    it('btcGetMasterFingerprint syncs once cold, then reuses the cached mfp', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const first = await adapter.btcGetMasterFingerprint(null, null);
      expect(first.success).toBe(true);
      if (!first.success) return;
      expect(first.payload.masterFingerprint).toBe(FIXTURE_MFP);
      expect(fake.requests).toHaveLength(1);

      const second = await adapter.btcGetMasterFingerprint(
        `keystone-qr:${FIXTURE_MFP}`,
        FIXTURE_MFP
      );
      expect(second.success).toBe(true);
      expect(fake.requests).toHaveLength(1); // no additional round trip
    });
  });

  describe('USB channel', () => {
    it('connectDevice() opens a new USB-only device entry', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });

      const result = await adapter.connectDevice('keystone-usb:FAKE-SERIAL');

      expect(result.success).toBe(true);
      if (!result.success) return;

      const devices = await adapter.searchDevices();
      const own = devices.find(d => d.deviceId === FIXTURE_MFP);
      expect(own).toBeDefined();
      expect(own?.connectionType).toBe('usb');
    });

    it('merges a USB connect into an existing QR-synced wallet — device-changed, not a second device-connect', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);
      const events: HardwareEvent[] = [];
      adapter.on('device-connect', e => events.push(e));
      adapter.on('device-changed', e => events.push(e));

      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);

      const connected = await adapter.connectDevice('keystone-usb:FAKE-SERIAL');
      expect(connected.success).toBe(true);

      expect(events.map(e => e.type)).toEqual(['device-connect', 'device-changed']);

      const devices = await adapter.searchDevices();
      // Merged, not duplicated — still exactly one row for this mfp.
      expect(devices.filter(d => d.deviceId === FIXTURE_MFP)).toHaveLength(1);
      expect(devices[0].connectionType).toBe('usb');
      expect(qrFake.requests).toHaveLength(1); // only the original QR import — no USB-side QR requests
    });

    it('routes a sign call over USB once the wallet has a live USB session, not QR', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      await adapter.connectDevice('keystone-usb:FAKE-SERIAL');

      const result = await adapter.evmSignTransaction(null, FIXTURE_MFP, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.r).toMatch(/^0x[0-9a-f]{64}$/);
      // `connectDevice()`'s own USB connect already learned the mfp (Keystone
      // USB `getAppConfig` returns it directly), so `_ensureMfpKnown` has
      // nothing left to sync — unlike a QR cold start, there's no separate
      // KeyDerivation round trip before the sign request. The QR handler
      // never fires either way.
      expect(usb.calls.map(c => (c.params as { urType: string }).urType)).toEqual([
        'eth-sign-request',
      ]);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('routes an implicit account sync over USB for a not-yet-cached evmGetAddress path', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      await adapter.connectDevice('keystone-usb:FAKE-SERIAL');

      const result = await adapter.evmGetAddress(null, FIXTURE_MFP, {
        path: "m/44'/60'/0'/0/0",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      // The account-level xpub isn't cached yet — `_ensureAccountSynced`
      // drives its own KeyDerivation round trip, routed over USB since this
      // wallet already has a live session; the address itself is then
      // derived offline (no further round trip), and QR never fires.
      expect(usb.calls.map(c => (c.params as { urType: string }).urType)).toEqual([
        'qr-hardware-call',
      ]);
      expect(qrFake.requests).toHaveLength(0);
    });

    it("switchTransport('qr') pins a USB-merged wallet back to QR", async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      await adapter.connectDevice('keystone-usb:FAKE-SERIAL');
      await adapter.switchTransport('qr');

      const result = await adapter.evmSignTransaction(null, FIXTURE_MFP, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });

      expect(result.success).toBe(true);
      expect(usb.calls).toHaveLength(0);
      // `_ensureMfpKnown` already has this mfp cached from the USB connect
      // itself, so there's no sync round trip to pin either way — only the
      // sign request's own routing is observable, and the `qr` pin sends it
      // through the QR handler instead of USB.
      expect(qrFake.requests.map(r => r.data.urType)).toEqual(['eth-sign-request']);
    });

    it('disconnectDevice() demotes a QR+USB merged wallet back to QR-only, keeping the entry', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      attachFakeDevice(adapter);
      await adapter.importFromQr();
      await adapter.connectDevice('keystone-usb:FAKE-SERIAL');

      await adapter.disconnectDevice(FIXTURE_MFP);

      const devices = await adapter.searchDevices();
      const own = devices.find(d => d.deviceId === FIXTURE_MFP);
      expect(own).toBeDefined();
      expect(own?.connectionType).toBe('qr');
    });

    it('disconnectDevice() drops a USB-only wallet outright (never QR-synced)', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const events: HardwareEvent[] = [];
      adapter.on('device-disconnect', e => events.push(e));
      await adapter.connectDevice('keystone-usb:FAKE-SERIAL');

      await adapter.disconnectDevice(FIXTURE_MFP);

      expect(events).toHaveLength(1);
      const devices = await adapter.searchDevices();
      expect(devices.find(d => d.deviceId === FIXTURE_MFP)).toBeUndefined();
    });
  });
});
