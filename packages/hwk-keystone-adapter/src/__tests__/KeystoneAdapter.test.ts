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
import {
  EConnectorInteraction,
  HardwareErrorCode,
  UI_REQUEST,
  UI_RESPONSE,
  createHardwareInteractionId,
  createHardwareSearchTargetId,
  deriveWalletId,
  parseHardwareRuntimeId,
} from '@onekeyfe/hwk-adapter-core';
import HDKey from 'hdkey';

import { KeystoneAdapter } from '../adapter/KeystoneAdapter';
import { KEYSTONE_WALLET_ID_PATH } from '../adapter/deviceTable';
import { normalizePath } from '../adapter/pathUtils';
import { KeystoneUrEngine } from '../urEngine/KeystoneUrEngine';
import { TronSignRequest, TronSignType } from '../urEngine/TronSignRequest';
import { TronSignature as TronUrSignature } from '../urEngine/TronSignature';

import type { KeyDerivation } from '@keystonehq/bc-ur-registry';
import type {
  ConnectorCallResult,
  ConnectorEventMap,
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
const OTHER_ROOT = HDKey.fromMasterSeed(Buffer.alloc(32, 0x0a));
const FIXTURE_MFP = FIXTURE_ROOT.fingerprint.toString(16).padStart(8, '0');
const FIXTURE_WALLET_ID = deriveWalletId(
  `keystone:secp256k1:${KEYSTONE_WALLET_ID_PATH}:${FIXTURE_ROOT.derive(
    KEYSTONE_WALLET_ID_PATH
  ).publicExtendedKey.trim()}`
);

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

function fixtureHdKey(path: string, mfpHex: string, root = FIXTURE_ROOT): CryptoHDKey {
  const node = root.derive(normalizePath(path));
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
  root?: HDKey;
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
  const mfpHex = FIXTURE_MFP;

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
        const keys = bundledPaths.map(path => fixtureHdKey(path, mfpHex, options.root));
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
function fakeUsbConnector(
  mfpHex?: string,
  failCallWith?: number,
  failOnUrType?: string,
  root: HDKey = FIXTURE_ROOT,
  failReconnect = false,
  incrementSessionIds = false,
  searchRoots: HDKey[] = []
) {
  const walletMfp = mfpHex ?? root.fingerprint.toString(16).padStart(8, '0');
  const calls: Array<{ sessionId: string; method: string; params: unknown }> = [];
  const searchCalls: number[] = [];
  const searchTargetIds: string[] = [];
  // What connectDevice() handed down as the "must be this wallet" expectation.
  const connectArgs: Array<string | undefined> = [];
  const disconnectHandlers = new Set<(data: { connectId: string }) => void>();
  const uiEventHandlers = new Set<(event: ConnectorEventMap['ui-event']) => void>();
  const rootsBySearchTarget = new Map<string, HDKey>();
  const rootsBySession = new Map<string, HDKey>();
  let available = true;
  let availableAfterSearchCount: number | undefined;
  let nextCallFailureCode: number | undefined;
  let scheduledCallFailure: { callNumber: number; code: number } | undefined;
  const connector: IConnector = {
    connectionType: 'usb',
    searchDevices: () => {
      searchCalls.push(Date.now());
      if (
        availableAfterSearchCount !== undefined &&
        searchCalls.length >= availableAfterSearchCount
      ) {
        available = true;
      }
      const discoveredRoots = searchRoots?.length ? searchRoots : [root];
      const devices = discoveredRoots.map(discoveredRoot => {
        const searchTargetId = createHardwareSearchTargetId({
          vendor: 'keystone',
          connectionType: 'usb',
        });
        searchTargetIds.push(searchTargetId);
        rootsBySearchTarget.set(searchTargetId, discoveredRoot);
        return {
          connectId: searchTargetId,
          deviceId: '',
          name: 'Keystone 3 Pro',
          connectionType: 'usb' as const,
          capabilities: { persistentDeviceIdentity: false },
        };
      });
      return Promise.resolve(available ? devices : []);
    },
    connect: (deviceId?: string) => {
      connectArgs.push(deviceId);
      if (!available) {
        return Promise.reject(
          Object.assign(new Error('Keystone USB is not available'), {
            code: HardwareErrorCode.DeviceNotFound,
          })
        );
      }
      if (failReconnect && connectArgs.length > 1) {
        return Promise.reject(
          Object.assign(new Error('Keystone USB is no longer available'), {
            code: HardwareErrorCode.DeviceNotFound,
          })
        );
      }
      // Search target ids select a physical descriptor. Persisted wallet
      // fingerprints remain post-connect identity assertions.
      const runtimeId = parseHardwareRuntimeId(deviceId);
      const isUsbSearchTarget =
        runtimeId?.kind === 'search-target' &&
        runtimeId.vendor === 'keystone' &&
        runtimeId.connectionType === 'usb';
      if (deviceId && !isUsbSearchTarget && deviceId.toLowerCase() !== walletMfp.toLowerCase()) {
        return Promise.reject(
          Object.assign(
            new Error('Connected Keystone wallet does not match the requested device'),
            {
              code: HardwareErrorCode.DeviceMismatch,
            }
          )
        );
      }
      const selectedRoot = rootsBySearchTarget.get(deviceId ?? '') ?? root;
      const selectedMfp = selectedRoot.fingerprint.toString(16).padStart(8, '0');
      const sessionId = `keystone-usb-session:${incrementSessionIds ? connectArgs.length : 1}`;
      rootsBySession.set(sessionId, selectedRoot);
      return Promise.resolve({
        sessionId,
        deviceInfo: {
          vendor: 'keystone',
          model: 'Keystone 3 Pro',
          firmwareVersion: '1.7.0',
          deviceId: '',
          connectId: sessionId,
          connectionType: 'usb',
          capabilities: { persistentDeviceIdentity: false },
          raw: { masterFingerprint: selectedMfp },
        },
      });
    },
    disconnect: sessionId => {
      disconnectHandlers.forEach(handler => handler({ connectId: sessionId }));
      return Promise.resolve();
    },
    call: (sessionId, method, params) => {
      calls.push({ sessionId, method, params });
      const urType = (params as { urType?: string } | undefined)?.urType;
      if (nextCallFailureCode !== undefined) {
        const code = nextCallFailureCode;
        nextCallFailureCode = undefined;
        return Promise.resolve<ConnectorCallResult>({
          success: false,
          error: { message: 'fakeUsbConnector: one-shot failure', code },
        });
      }
      if (scheduledCallFailure?.callNumber === calls.length) {
        const { code } = scheduledCallFailure;
        scheduledCallFailure = undefined;
        return Promise.resolve<ConnectorCallResult>({
          success: false,
          error: { message: 'fakeUsbConnector: scheduled failure', code },
        });
      }
      if (failCallWith !== undefined && (!failOnUrType || failOnUrType === urType)) {
        return Promise.resolve<ConnectorCallResult>({
          success: false,
          error: { message: 'fakeUsbConnector: forced failure', code: failCallWith },
        });
      }
      if (method !== 'resolveUr') {
        return Promise.resolve<ConnectorCallResult>({
          success: false,
          error: { message: `fakeUsbConnector: unhandled method ${method}` },
        });
      }
      const { urType: requestUrType, urData } = params as { urType: string; urData: string };
      const cbor = Buffer.from(urData, 'hex');
      const sessionRoot = rootsBySession.get(sessionId) ?? root;
      const sessionMfp = sessionRoot.fingerprint.toString(16).padStart(8, '0');
      switch (requestUrType) {
        case 'qr-hardware-call': {
          const call = QRHardwareCall.fromCBOR(cbor);
          const keys = (call.getParams() as KeyDerivation)
            .getSchemas()
            .map(schema =>
              fixtureHdKey(`m/${schema.getKeypath().getPath()}`, sessionMfp, sessionRoot)
            );
          const response = new CryptoMultiAccounts(
            Buffer.from(sessionMfp, 'hex'),
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
            error: { message: `fakeUsbConnector: unhandled urType ${requestUrType}` },
          });
      }
    },
    cancel: () => Promise.resolve(),
    uiResponse: () => {},
    on: (event, handler) => {
      if (event === 'device-disconnect') {
        disconnectHandlers.add(handler as (data: { connectId: string }) => void);
      } else if (event === 'ui-event') {
        uiEventHandlers.add(handler as (data: ConnectorEventMap['ui-event']) => void);
      }
    },
    off: (event, handler) => {
      if (event === 'device-disconnect') {
        disconnectHandlers.delete(handler as (data: { connectId: string }) => void);
      } else if (event === 'ui-event') {
        uiEventHandlers.delete(handler as (data: ConnectorEventMap['ui-event']) => void);
      }
    },
    reset: () => {},
  };
  return {
    connector,
    calls,
    searchCalls,
    searchTargetIds,
    connectArgs,
    setAvailable: (value: boolean) => {
      available = value;
    },
    setAvailableAfterSearchCount: (count: number) => {
      availableAfterSearchCount = count;
    },
    failNextCall: (code: number) => {
      nextCallFailureCode = code;
    },
    failCallAt: (callNumber: number, code: number) => {
      scheduledCallFailure = { callNumber, code };
    },
    emitDisconnect: (connectId = 'keystone-usb-session:1') => {
      disconnectHandlers.forEach(handler => handler({ connectId }));
    },
    emitUiEvent: (event: ConnectorEventMap['ui-event']) => {
      uiEventHandlers.forEach(handler => handler(event));
    },
    uiEventHandlerCount: () => uiEventHandlers.size,
  };
}

function requestedPathsOf(request: { data: QrDisplayData }): string[] {
  const call = QRHardwareCall.fromCBOR(Buffer.from(request.data.urData, 'hex'));
  return (call.getParams() as KeyDerivation)
    .getSchemas()
    .map(schema => `m/${schema.getKeypath().getPath()}`);
}

async function connectUsbDevice(
  adapter: KeystoneAdapter
): ReturnType<KeystoneAdapter['connectDevice']> {
  const targets = await adapter.searchDeviceTargets({ transportType: 'usb' });
  if (!targets[0]) throw new Error('Expected one Keystone USB search target');
  return adapter.connectDevice(targets[0].searchTargetId);
}

async function connectQrDevice(
  adapter: KeystoneAdapter
): ReturnType<KeystoneAdapter['connectDevice']> {
  const targets = await adapter.searchDeviceTargets({ transportType: 'qr' });
  if (!targets[0]) throw new Error('Expected one Keystone QR search target');
  return adapter.connectDevice(targets[0].searchTargetId);
}

describe('KeystoneAdapter', () => {
  it('detaches connector UI listeners before the connector is reused', async () => {
    const usb = fakeUsbConnector();
    const first = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
    expect(usb.uiEventHandlerCount()).toBe(1);

    await first.dispose();
    expect(usb.uiEventHandlerCount()).toBe(0);

    const second = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
    const events: HardwareEvent[] = [];
    second.on('ui-event', event => events.push(event));
    usb.emitUiEvent({
      type: EConnectorInteraction.ConfirmOnDevice,
      payload: { sessionId: 'keystone-usb-session:1' },
    });

    expect(events).toHaveLength(1);
    await second.dispose();
    expect(usb.uiEventHandlerCount()).toBe(0);
  });

  describe('importFromQr', () => {
    it('syncs the default account set and registers a collision-resistant wallet id', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.importFromQr();

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.deviceId).toBe(FIXTURE_WALLET_ID);
      expect(result.payload.connectId).toBe(`keystone-wallet:${FIXTURE_WALLET_ID}`);
      expect(result.payload.vendor).toBe('keystone');
      expect(result.payload.connectionType).toBe('qr');
      expect(fake.requests).toHaveLength(1);
      expect(fake.requests[0].data.urType).toBe('qr-hardware-call');

      const devices = await adapter.searchDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe(FIXTURE_WALLET_ID);
    });

    it('keeps two wallets with the same 8-hex MFP separate and rejects 8-hex lookup', async () => {
      const adapter = newTestAdapter();
      const firstDevice = attachFakeDevice(adapter);
      const first = await adapter.importFromQr();
      expect(first.success).toBe(true);
      firstDevice.detach();

      attachFakeDevice(adapter, { root: OTHER_ROOT });
      const second = await adapter.importFromQr();
      expect(second.success).toBe(true);
      if (!first.success || !second.success) return;

      expect(second.payload.deviceId).not.toBe(first.payload.deviceId);
      expect(await adapter.searchDevices()).toHaveLength(2);

      for (const identifier of [FIXTURE_MFP, `keystone-qr:${FIXTURE_MFP}`]) {
        const lookup = await adapter.getDeviceInfo(identifier, identifier);
        expect(lookup.success).toBe(false);
        if (!lookup.success) {
          expect(lookup.payload.code).toBe(HardwareErrorCode.DeviceNotFound);
        }
      }
    });

    it('learns only the wallet identity; a later address request asks the device for its own path', async () => {
      // Key material is never retained on the wallet record, so importFromQr
      // requests just the identity xpub and every later address request pays
      // its own round trip (identity + the path it needs).
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      expect(fake.requests).toHaveLength(1);
      expect(requestedPathsOf(fake.requests[0])).toEqual([KEYSTONE_WALLET_ID_PATH]);

      const result = await adapter.btcGetAddress(null, FIXTURE_WALLET_ID, {
        path: "m/84'/0'/0'/0/0",
        showOnDevice: false,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.address).toMatch(/^bc1q[0-9a-z]{38}$/);
      expect(fake.requests).toHaveLength(2);
      expect(requestedPathsOf(fake.requests[1])).toEqual([KEYSTONE_WALLET_ID_PATH, "m/84'/0'/0'"]);
    });

    it('does not retain a BTC script-type variant the device volunteers beyond the current operation', async () => {
      // A differently-prefixed path the device throws in unprompted must be
      // classified correctly (not dropped) for the operation that received
      // it, but it is not kept: the next operation asks the device again.
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter, { bundleExtraBtcVariants: true });

      const first = await adapter.btcGetAddress(null, null, {
        path: "m/44'/0'/0'/0/0",
        showOnDevice: false,
      });
      expect(first.success).toBe(true);
      expect(fake.requests).toHaveLength(1);

      const second = await adapter.btcGetAddress(null, FIXTURE_WALLET_ID, {
        path: "m/84'/0'/0'/0/0",
        showOnDevice: false,
      });
      expect(second.success).toBe(true);
      if (!second.success) return;
      expect(second.payload.address).toMatch(/^bc1q[0-9a-z]{38}$/);
      expect(fake.requests).toHaveLength(2);
    });

    it('returns the synced account xpub and its decoded BIP-32 fields', async () => {
      // A host that builds BTC accounts needs the account-level xpub, not one
      // address.
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      expect(fake.requests).toHaveLength(1);

      const result = await adapter.btcGetPublicKey(null, FIXTURE_WALLET_ID, {
        path: "m/84'/0'/0'",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      const { xpub, publicKey, chainCode, depth, path } = result.payload;
      expect(xpub).toMatch(/^xpub[1-9A-HJ-NP-Za-km-z]+$/);
      // Decoded straight off the xpub's fixed-width BIP-32 serialization.
      expect(publicKey).toMatch(/^0[23][0-9a-f]{64}$/);
      expect(chainCode).toMatch(/^[0-9a-f]{64}$/);
      expect(depth).toBe(3); // m/84'/0'/0' is an account-level key
      expect(path).toBe("m/84'/0'/0'");
      // Its own round trip: nothing was retained from the import.
      expect(fake.requests).toHaveLength(2);
    });

    it('rejects a leaf path — an xpub is an account-level key', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter);
      await adapter.importFromQr();

      const result = await adapter.btcGetPublicKey(null, FIXTURE_WALLET_ID, {
        path: "m/84'/0'/0'/0/0",
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.error).toMatch(/account path/i);
    });
  });

  describe('evmSignTransaction', () => {
    it('accepts common connection context without changing QR routing or serializing host metadata', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const buildRequest = jest.spyOn(KeystoneUrEngine.prototype, 'buildEthSignRequest');
      try {
        const result = await adapter.evmSignTransaction(null, null, {
          path: "m/44'/60'/0'/0/0",
          serializedTx: `02${'ab'.repeat(30)}`,
          knownConnections: [{ transport: 'qr' }],
          extra: { dbDeviceId: 'keystone-db' },
        });
        expect(result.success).toBe(true);
        expect(fake.requests.map(r => r.data.urType)).toEqual([
          'qr-hardware-call',
          'eth-sign-request',
        ]);
        expect(buildRequest).toHaveBeenCalledTimes(1);
        expect(buildRequest.mock.calls[0][0]).not.toHaveProperty('knownConnections');
        expect(buildRequest.mock.calls[0][0]).not.toHaveProperty('extra');
      } finally {
        buildRequest.mockRestore();
        await adapter.dispose();
      }
    });

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

    it('signs the dApp\'s original EIP-712 bytes when dataJson is supplied', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      // A uint256 wider than 2^53: JSON.parse/stringify would round it, so the
      // device must be handed the dApp's own bytes instead.
      const dataJson =
        '{"types":{"EIP712Domain":[]},"primaryType":"Permit","domain":{},"message":{"value":123456789012345678901234567890}}';

      await adapter.evmSignTypedData(null, null, {
        path: "m/44'/60'/0'/0/0",
        data: JSON.parse(dataJson) as never,
        dataJson,
      });

      const signRequest = fake.requests.find(r => r.data.urType === 'eth-sign-request');
      const signed = Buffer.from(
        EthSignRequest.fromCBOR(Buffer.from(signRequest?.data.urData ?? '', 'hex')).getSignData()
      ).toString('utf8');
      expect(signed).toBe(dataJson);
      expect(signed).toContain('123456789012345678901234567890');
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

    it('fails closed when the scanned 64-hex wallet identity does not match deviceId', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter, { root: OTHER_ROOT });

      const result = await adapter.evmSignTransaction(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        {
          path: "m/44'/60'/0'/0/0",
          serializedTx: `02${'ab'.repeat(30)}`,
        }
      );

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

  describe('BTC account index guard (firmware signs account 0 only)', () => {
    it('refuses a testnet account, which this package can only derive as mainnet', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const result = await adapter.btcGetAddress(null, null, { path: "m/84'/1'/0'/0/0" });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.DevicePathForbidden);
      expect(fake.requests).toHaveLength(0);
    });

    it('btcSignMessage refuses a non-zero account before any round trip', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const result = await adapter.btcSignMessage(null, null, {
        path: "m/84'/0'/1'/0/0",
        message: 'hello',
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.DevicePathForbidden);
      expect(fake.requests).toHaveLength(0);
    });

    it('btcGetPublicKey refuses a non-zero account without touching the device', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const result = await adapter.btcGetPublicKey(null, null, { path: "m/86'/0'/2'" });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.DevicePathForbidden);
      expect(fake.requests).toHaveLength(0);
    });

    it('btcSignPsbt refuses a non-zero account path before any round trip', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const result = await adapter.btcSignPsbt(null, null, {
        psbt: 'cafe'.repeat(4),
        coin: 'BTC',
        path: "m/84'/0'/1'",
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.DevicePathForbidden);
      expect(fake.requests).toHaveLength(0);
    });

    it('allNetworkGetAddress fails only the non-zero BTC item and never asks the device for it', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const result = await adapter.allNetworkGetAddress(null as unknown as string, '', {
        bundle: [
          { methodName: 'btcGetPublicKey', network: 'btc', path: "m/86'/0'/1'" },
          { methodName: 'evmGetAddress', network: 'evm', path: "m/44'/60'/1'/0/0" },
        ],
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(fake.requests).toHaveLength(1);
      const requestedPaths = (
        QRHardwareCall.fromCBOR(
          Buffer.from(fake.requests[0].data.urData, 'hex')
        ).getParams() as KeyDerivation
      )
        .getSchemas()
        .map(schema => `m/${schema.getKeypath().getPath()}`);
      expect(requestedPaths).not.toContain("m/86'/0'/1'");
      expect(result.payload[0].success).toBe(false);
      expect((result.payload[0].payload as { code?: number }).code).toBe(
        HardwareErrorCode.DevicePathForbidden
      );
      expect(result.payload[1].success).toBe(true);
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
    ])('%s returns MethodNotSupported rather than throwing', async (_name, call) => {
      const result = await call();
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.MethodNotSupported);
    });
  });

  describe('btcGetAddress', () => {
    it('always derives from the account xpub; showOnDevice adds no device request', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const path = "m/84'/0'/0'/0/7";

      const result = await adapter.btcGetAddress(null, null, {
        path,
        showOnDevice: true,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      const request = QRHardwareCall.fromCBOR(Buffer.from(fake.requests[0].data.urData, 'hex'));
      const requestedPaths = (request.getParams() as KeyDerivation)
        .getSchemas()
        .map(schema => `m/${schema.getKeypath().getPath()}`);
      // Keystone answers account-level KeyDerivation requests; nothing is
      // displayed on the device for this call, so a leaf-path request would
      // only cost an extra round trip.
      expect(requestedPaths).toEqual([KEYSTONE_WALLET_ID_PATH, "m/84'/0'/0'"]);
      expect(result.payload.path).toBe(path);
      expect(result.payload.address).toMatch(/^bc1q[0-9a-z]{38}$/);
    });

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
    it('tronSignMessage V2: syncs the mfp then signs a personal message with dataType=2', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.tronSignMessage(null, null, {
        path: "m/44'/195'/0'/0/0",
        messageHex: Buffer.from('hello tron').toString('hex'),
        messageType: 'V2',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.signature).toBe('06'.repeat(65));
      const signRequest = fake.requests.find(r => r.data.urType === 'tron-sign-request');
      expect(signRequest).toBeDefined();
      if (!signRequest) return;
      const decoded = TronSignRequest.fromCBOR(Buffer.from(signRequest.data.urData, 'hex'));
      expect(decoded.getSignType()).toBe(TronSignType.PersonalMessage);
      expect(decoded.getSignData().toString('utf8')).toBe('hello tron');
    });

    it.each([undefined, 'V1'] as const)(
      'tronSignMessage rejects messageType=%s — firmware only has the TIP-191 V2 preimage',
      async messageType => {
        const adapter = newTestAdapter();
        const fake = attachFakeDevice(adapter);
        const result = await adapter.tronSignMessage(null, null, {
          path: "m/44'/195'/0'/0/0",
          messageHex: 'deadbeef',
          ...(messageType ? { messageType } : {}),
        });
        expect(result.success).toBe(false);
        if (result.success) return;
        expect(result.payload.code).toBe(HardwareErrorCode.MethodNotSupported);
        expect(fake.requests).toHaveLength(0);
      }
    );

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
    it('ignores an old interaction cancellation while a newer USB operation is pending', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const first = await connectUsbDevice(adapter);
      const second = await connectUsbDevice(adapter);
      if (!first.success || !second.success) throw new Error('Fixture connection failed');
      const rawCall = usb.connector.call.bind(usb.connector);
      let finishCall: (() => void) | undefined;
      jest.spyOn(usb.connector, 'call').mockImplementationOnce(
        (...args) =>
          new Promise(resolve => {
            finishCall = () => resolve(rawCall(...args));
          })
      );
      let settled = false;
      const pending = adapter
        .evmSignTransaction(second.payload, FIXTURE_WALLET_ID, {
          path: "m/44'/60'/0'/0/0",
          serializedTx: `02${'ab'.repeat(30)}`,
          interactionId: second.payload,
        })
        .then(result => {
          settled = true;
          return result;
        });
      await new Promise<void>(resolve => {
        setImmediate(resolve);
      });
      adapter.cancel(first.payload);
      await new Promise<void>(resolve => {
        setImmediate(resolve);
      });
      expect(settled).toBe(false);
      expect(finishCall).toBeDefined();
      finishCall?.();
      await expect(pending).resolves.toMatchObject({ success: true });
      await adapter.dispose();
    });

    it.each([true, false])(
      'cancels only matching queued jobs (active matches=%s)',
      async matchesActive => {
        const usb = fakeUsbConnector();
        const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
        const connected = await connectUsbDevice(adapter);
        if (!connected.success) throw new Error('Fixture connection failed');
        const rawCall = usb.connector.call.bind(usb.connector);
        let finishCall: (() => void) | undefined;
        const call = jest.spyOn(usb.connector, 'call').mockImplementationOnce(
          (...args) =>
            new Promise(resolve => {
              finishCall = () => resolve(rawCall(...args));
            })
        );
        const params = { path: "m/44'/60'/0'/0/0", serializedTx: `02${'ab'.repeat(30)}` };
        const active = adapter.evmSignTransaction(connected.payload, FIXTURE_WALLET_ID, params);
        await new Promise<void>(resolve => {
          setImmediate(resolve);
        });
        const target = matchesActive ? connected.payload : FIXTURE_WALLET_ID;
        const queued = adapter.evmSignTransaction(target, FIXTURE_WALLET_ID, params);
        adapter.cancel(target);
        expect(finishCall).toBeDefined();
        finishCall?.();
        const [activeResult, queuedResult] = await Promise.all([active, queued]);
        expect(activeResult.success).toBe(!matchesActive);
        expect(queuedResult).toMatchObject({
          success: false,
          payload: { code: HardwareErrorCode.UserAborted },
        });
        expect(call).toHaveBeenCalledTimes(1);
        await adapter.dispose();
      }
    );

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

    it('returns USB cancellation immediately and drains the raw call before release', async () => {
      const usb = fakeUsbConnector();
      const disconnect = jest.spyOn(usb.connector, 'disconnect');
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);
      if (!connected.success) return;

      let resolveRawCall: (value: ConnectorCallResult) => void = () => undefined;
      jest.spyOn(usb.connector, 'call').mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveRawCall = resolve;
          })
      );
      const params = {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
        interactionId: connected.payload,
      };
      const pending = adapter.evmSignTransaction(connected.payload, FIXTURE_WALLET_ID, params);
      await new Promise<void>(resolve => {
        setImmediate(resolve);
      });
      adapter.cancel(connected.payload);

      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
      const release = adapter.releaseInteraction(connected.payload);
      await new Promise<void>(resolve => {
        setImmediate(resolve);
      });
      expect(disconnect).not.toHaveBeenCalled();

      await expect(
        adapter.evmSignTransaction(null, FIXTURE_WALLET_ID, {
          path: params.path,
          serializedTx: params.serializedTx,
        })
      ).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceBusyInternal },
      });

      resolveRawCall({
        success: false,
        error: { message: 'cancelled raw call settled', code: HardwareErrorCode.UserAborted },
      });
      await release;
      expect(disconnect).toHaveBeenCalledWith('keystone-usb-session:1');
    });

    it('drains a cancelled raw USB call before dispose resets the connector', async () => {
      const usb = fakeUsbConnector();
      const disconnect = jest.spyOn(usb.connector, 'disconnect');
      const reset = jest.spyOn(usb.connector, 'reset');
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);
      if (!connected.success) return;

      let resolveRawCall: (value: ConnectorCallResult) => void = () => undefined;
      jest.spyOn(usb.connector, 'call').mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveRawCall = resolve;
          })
      );
      const pending = adapter.evmSignTransaction(connected.payload, FIXTURE_WALLET_ID, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
        interactionId: connected.payload,
      });
      await new Promise<void>(resolve => {
        setImmediate(resolve);
      });
      adapter.cancel(connected.payload);
      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });

      const disposing = adapter.dispose();
      await new Promise<void>(resolve => {
        setImmediate(resolve);
      });
      expect(disconnect).not.toHaveBeenCalled();
      expect(reset).not.toHaveBeenCalled();

      resolveRawCall({
        success: false,
        error: { message: 'cancelled raw call settled', code: HardwareErrorCode.UserAborted },
      });
      await disposing;
      expect(disconnect).toHaveBeenCalledWith('keystone-usb-session:1');
      expect(reset).toHaveBeenCalledTimes(1);
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

    it('marks a timed-out QR signing response as possibly completed', async () => {
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 20 });
      const fake = attachFakeDevice(adapter);
      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      fake.detach();

      const result = await adapter.evmSignTransaction(null, FIXTURE_WALLET_ID, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.OperationTimeout,
          recovery: { scope: 'unknown' },
          params: {
            operationMayHaveCompleted: true,
            method: 'evmSignTransaction',
          },
        },
      });
    });
  });

  describe('getChainFingerprint / btcGetMasterFingerprint', () => {
    it('getChainFingerprint derives a stable per-chain value without a device round trip', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const result = await adapter.getChainFingerprint(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
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
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID
      );
      expect(second.success).toBe(true);
      expect(fake.requests).toHaveLength(1); // no additional round trip
    });

    it('honors an interaction id instead of falling back to a persisted wallet id', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter);
      const targets = await adapter.searchDeviceTargets({ transportType: 'qr' });
      const connected = await adapter.connectDevice(targets[0].searchTargetId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;

      await adapter.releaseInteraction(connected.payload);
      const result = await adapter.btcGetMasterFingerprint(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        { interactionId: connected.payload }
      );

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.payload.code).toBe(HardwareErrorCode.InteractionEnded);
    });
  });

  describe('wallet-creation burst', () => {
    it('rejects conflicting positional and common interaction ids before any device call', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const positionalInteractionId = createHardwareInteractionId('keystone');
      const commonInteractionId = createHardwareInteractionId('keystone');

      const result = await adapter.evmGetAddress(positionalInteractionId, null, {
        path: "m/44'/60'/0'/0/0",
        interactionId: commonInteractionId,
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.InvalidParams },
      });
      expect(fake.requests).toHaveLength(0);
    });

    it('keeps all-network calls pinned by commonParams.interactionId', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);
      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      const callsAfterConnect = usb.calls.length;

      const result = await adapter.allNetworkGetAddress(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        {
          interactionId: connected.payload,
          bundle: [
            {
              methodName: 'btcGetPublicKey',
              network: 'btc',
              path: "m/84'/0'/0'",
            },
          ],
        }
      );

      expect(result.success).toBe(true);
      expect(usb.calls.length).toBeGreaterThan(callsAfterConnect);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('uses single-path USB exports throughout the default-network creation burst', async () => {
      // What app-monorepo actually does right after connectDevice: build the
      // wallet xfp (mfp + first taproot xpub), then derive an address per
      // default network. Each missing path follows the proven browser-demo
      // shape and is exported in its own USB request.
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });

      const found = await adapter.searchDevices({ transportType: 'usb' });
      const connected = await adapter.connectDevice(found[0].connectId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      const connectId = connected.payload;
      const roundTripsAfterConnect = usb.calls.length;

      // buildHwWalletXfp
      expect((await adapter.btcGetMasterFingerprint(connectId, FIXTURE_WALLET_ID)).success).toBe(
        true
      );
      expect(
        (await adapter.btcGetPublicKey(connectId, FIXTURE_WALLET_ID, { path: "m/86'/0'/0'" }))
          .success
      ).toBe(true);
      // one address per default network
      expect(
        (
          await adapter.evmGetAddress(connectId, FIXTURE_WALLET_ID, {
            path: "m/44'/60'/0'/0/0",
          })
        ).success
      ).toBe(true);
      expect(
        (await adapter.solGetAddress(connectId, FIXTURE_WALLET_ID, { path: "m/44'/501'/0'" }))
          .success
      ).toBe(true);
      expect(
        (
          await adapter.tronGetAddress(connectId, FIXTURE_WALLET_ID, {
            path: "m/44'/195'/0'/0/0",
          })
        ).success
      ).toBe(true);

      // Nothing from the identity export is retained: BTC, EVM, SOL and
      // Tron each pay one single-path export.
      expect(roundTripsAfterConnect).toBe(1);
      expect(usb.calls).toHaveLength(5);
      const schemaCounts = usb.calls.map(call => {
        const request = QRHardwareCall.fromCBOR(
          Buffer.from((call.params as { urData: string }).urData, 'hex')
        );
        return (request.getParams() as KeyDerivation).getSchemas().length;
      });
      expect(schemaCounts).toEqual([1, 1, 1, 1, 1]);
    });
  });

  describe('key export consent', () => {
    it('fails connect when the fixed identity key export is rejected', async () => {
      const usb = fakeUsbConnector(FIXTURE_MFP, HardwareErrorCode.UserRejected);
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });

      const found = await adapter.searchDevices({ transportType: 'usb' });
      const connected = await adapter.connectDevice(found[0].connectId);

      expect(connected.success).toBe(false);
      if (connected.success) return;
      expect(connected.payload.code).toBe(HardwareErrorCode.UserRejected);
      expect(usb.calls).toHaveLength(1);
    });

    it('asks for one path at a time over USB', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });

      const found = await adapter.searchDevices({ transportType: 'usb' });
      const connected = await adapter.connectDevice(found[0].connectId);
      if (!connected.success) return;
      const connectId = connected.payload;

      await adapter.evmGetAddress(connectId, FIXTURE_WALLET_ID, {
        path: "m/44'/60'/0'/0/0",
      });
      // Call 1 was the identity export at connect; nothing from it is
      // retained, so EVM pays its own export too.
      expect(usb.calls).toHaveLength(2);

      await adapter.tronGetAddress(connectId, FIXTURE_WALLET_ID, {
        path: "m/44'/195'/0'/0/0",
      });
      await adapter.btcGetPublicKey(connectId, FIXTURE_WALLET_ID, { path: "m/84'/0'/0'" });
      expect(usb.calls).toHaveLength(4);
    });
  });

  describe('USB-first with silent QR fallback', () => {
    it('does not attach USB for an empty or unsupported bundle', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      attachFakeDevice(adapter);
      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      if (!imported.success) return;

      const emptyResult = await adapter.allNetworkGetAddress(
        imported.payload.connectId,
        imported.payload.deviceId,
        { bundle: [] }
      );
      const unsupportedResult = await adapter.allNetworkGetAddress(
        imported.payload.connectId,
        imported.payload.deviceId,
        {
          bundle: [
            {
              methodName: 'unsupportedGetAddress',
              network: 'unsupported',
              path: "m/44'/0'/0'",
            },
          ],
        } as never
      );

      expect(emptyResult).toEqual({ success: true, payload: [] });
      expect(unsupportedResult.success).toBe(true);
      if (!unsupportedResult.success) return;
      expect(unsupportedResult.payload[0].success).toBe(false);
      expect(usb.searchCalls).toHaveLength(0);
      expect(usb.connectArgs).toHaveLength(0);
      expect(usb.calls).toHaveLength(0);
    });

    it('falls back from one rejected USB attach to one QR scan for the complete account bundle', async () => {
      const usb = fakeUsbConnector(FIXTURE_MFP, HardwareErrorCode.DeviceLocked, 'qr-hardware-call');
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);
      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      if (!imported.success) return;
      expect(qrFake.requests).toHaveLength(1);

      const result = await adapter.allNetworkGetAddress(
        imported.payload.connectId,
        imported.payload.deviceId,
        {
          bundle: [
            {
              methodName: 'btcGetPublicKey',
              network: 'btc',
              path: "m/44'/0'/0'",
            },
            {
              methodName: 'btcGetPublicKey',
              network: 'btc',
              path: "m/49'/0'/0'",
            },
            {
              methodName: 'btcGetPublicKey',
              network: 'btc',
              path: "m/84'/0'/0'",
            },
            {
              methodName: 'btcGetPublicKey',
              network: 'btc',
              path: "m/86'/0'/0'",
            },
            {
              methodName: 'evmGetAddress',
              network: 'evm',
              path: "m/44'/60'/1'/0/0",
            },
            {
              methodName: 'evmGetAddress',
              network: 'evm-secondary-network',
              path: "m/44'/60'/1'/0/0",
            },
            {
              methodName: 'tronGetAddress',
              network: 'tron',
              path: "m/44'/195'/1'/0/0",
            },
            {
              methodName: 'solGetAddress',
              network: 'sol',
              path: "m/44'/501'/1'/0'",
            },
          ],
        }
      );

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload).toHaveLength(8);
      expect(result.payload.every(item => item.success)).toBe(true);
      expect(
        result.payload.every(
          item => item.payload?.rootFingerprint === Number.parseInt(FIXTURE_MFP, 16)
        )
      ).toBe(true);
      expect(usb.calls).toHaveLength(1);
      expect(qrFake.requests).toHaveLength(2);

      const request = QRHardwareCall.fromCBOR(Buffer.from(qrFake.requests[1].data.urData, 'hex'));
      const requestedPaths = (request.getParams() as KeyDerivation)
        .getSchemas()
        .map(schema => `m/${schema.getKeypath().getPath()}`);
      // Nothing is retained from importFromQr, so the one fallback scan
      // carries every bundled path (BTC is account 0 only).
      expect(requestedPaths).toEqual([
        KEYSTONE_WALLET_ID_PATH,
        "m/44'/0'/0'",
        "m/49'/0'/0'",
        "m/84'/0'/0'",
        "m/86'/0'/0'",
        "m/44'/60'/1'",
        "m/44'/195'/1'",
        "m/44'/501'/1'/0'",
      ]);
    });

    it('does not reconnect when USB disconnects after a successful bundle item', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);
      await connectUsbDevice(adapter);
      const originalCall = usb.connector.call.bind(usb.connector);
      jest.spyOn(usb.connector, 'call').mockImplementation(async (...args) => {
        const result = await originalCall(...args);
        usb.emitDisconnect();
        return result;
      });

      const result = await adapter.allNetworkGetAddress(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        {
          bundle: [
            { methodName: 'btcGetPublicKey', network: 'btc', path: "m/44'/0'/0'" },
            { methodName: 'btcGetPublicKey', network: 'btc', path: "m/49'/0'/0'" },
          ],
        }
      );

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.TransportNotAvailable },
      });
      expect(usb.calls).toHaveLength(2);
      expect(usb.connectArgs).toHaveLength(1);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('stops a USB bundle after a mid-operation disconnect without retrying or switching to QR', async () => {
      const usb = fakeUsbConnector(undefined, undefined, undefined, FIXTURE_ROOT, true);
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);
      // Call 1 is the identity export. Let the first bundle item succeed and
      // fail the second one. No later bundle item may be sent.
      usb.failCallAt(3, HardwareErrorCode.DeviceNotFound);

      const result = await adapter.allNetworkGetAddress(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        {
          bundle: [
            {
              methodName: 'btcGetPublicKey',
              network: 'btc',
              path: "m/44'/0'/0'",
            },
            {
              methodName: 'btcGetPublicKey',
              network: 'btc',
              path: "m/49'/0'/0'",
            },
            {
              methodName: 'evmGetAddress',
              network: 'evm',
              path: "m/44'/60'/1'/0/0",
            },
            {
              methodName: 'solGetAddress',
              network: 'sol',
              path: "m/44'/501'/1'/0'",
            },
          ],
        }
      );

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceNotFound },
      });
      expect(usb.calls).toHaveLength(3);
      expect(usb.connectArgs).toHaveLength(1);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('stops the USB bundle after a device rejection instead of prompting for later paths', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);
      usb.failCallAt(2, HardwareErrorCode.UserRejected);

      const result = await adapter.allNetworkGetAddress(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        {
          bundle: [
            {
              methodName: 'btcGetPublicKey',
              network: 'btc',
              path: "m/44'/0'/0'",
            },
            {
              methodName: 'btcGetPublicKey',
              network: 'btc',
              path: "m/49'/0'/0'",
            },
          ],
        }
      );

      expect(result.success).toBe(false);
      expect(usb.calls).toHaveLength(2);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('origin beats the legacy code list when deciding whether the device answered', async () => {
      // A device-origin failure whose code is NOT in the legacy fallback list
      // (PassphraseRejected) must still keep the session — proving recovery
      // keys on `origin` when the mapper stamped one, and the code list is
      // only the fallback for unlabeled errors.
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const found = await adapter.searchDevices({ transportType: 'usb' });
      const connected = await adapter.connectDevice(found[0].connectId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      const attachesAfterConnect = usb.connectArgs.length;

      const realCall = usb.connector.call.bind(usb.connector);
      let failedOnce = false;
      usb.connector.call = (sessionId, method, params) => {
        if (!failedOnce) {
          failedOnce = true;
          return Promise.resolve({
            success: false as const,
            error: {
              message: 'device declined the passphrase',
              code: HardwareErrorCode.PassphraseRejected,
              params: { origin: 'device' },
            },
          });
        }
        return realCall(sessionId, method, params);
      };

      const params = { path: "m/44'/60'/0'/0/0", serializedTx: `02${'ab'.repeat(30)}` };
      const first = await adapter.evmSignTransaction(connected.payload, FIXTURE_WALLET_ID, params);
      expect(first.success).toBe(false);

      const retry = await adapter.evmSignTransaction(connected.payload, FIXTURE_WALLET_ID, params);
      expect(retry.success).toBe(true);
      expect(usb.connectArgs).toHaveLength(attachesAfterConnect); // no re-attach
      expect(qrFake.requests).toHaveLength(0); // never leaked to QR
    });

    it('keeps the USB session after an on-device rejection, so a retry reuses it', async () => {
      // Repro: onboard over USB, tap CANCEL on the device, then retry and
      // confirm. Declining says nothing about the cable — the session is still
      // good. Dropping it here forced the retry to re-open the transport from
      // scratch, which is what made the second attempt fail instead of signing.
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const found = await adapter.searchDevices({ transportType: 'usb' });
      const connected = await adapter.connectDevice(found[0].connectId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      const attachesAfterConnect = usb.connectArgs.length;

      // The device declines exactly once, then behaves normally.
      const realCall = usb.connector.call.bind(usb.connector);
      let declinedOnce = false;
      usb.connector.call = (sessionId, method, params) => {
        if (!declinedOnce) {
          declinedOnce = true;
          return Promise.resolve({
            success: false as const,
            error: {
              message: 'fakeUsbConnector: user declined on device',
              code: HardwareErrorCode.UserRejected,
            },
          });
        }
        return realCall(sessionId, method, params);
      };

      // Signing always goes to the device (an address would be served from
      // the cache the connect already filled, so it would never exercise this).
      const params = {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      };
      const first = await adapter.evmSignTransaction(connected.payload, FIXTURE_WALLET_ID, params);
      expect(first.success).toBe(false);

      const retry = await adapter.evmSignTransaction(connected.payload, FIXTURE_WALLET_ID, params);
      expect(retry.success).toBe(true);
      // The crux: the retry reused the live session instead of re-attaching,
      // and never leaked onto the QR channel.
      expect(usb.connectArgs).toHaveLength(attachesAfterConnect);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('does NOT swap to QR when an in-flight USB call fails', async () => {
      // The request is already on the wire and the device may be showing a
      // passphrase keyboard or a confirm screen. Switching channels here
      // discards work the user is in the middle of. Channel selection happens
      // once, before the request goes out — never during.
      const usb = fakeUsbConnector(
        FIXTURE_MFP,
        HardwareErrorCode.DeviceNotFound,
        'eth-sign-request'
      );
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const found = await adapter.searchDevices({ transportType: 'usb' });
      await adapter.connectDevice(found[0].connectId);
      const qrBefore = qrFake.requests.length;

      const signed = await adapter.evmSignTransaction(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        {
          path: "m/44'/60'/0'/0/0",
          serializedTx: `02${'ab'.repeat(30)}`,
        }
      );

      expect(signed.success).toBe(false);
      expect(qrFake.requests).toHaveLength(qrBefore);
    });

    it('does NOT fall back to QR when the device itself rejected', async () => {
      // A rejection is a real answer from the device. Retrying it over QR
      // would ask the user to approve something they just refused.
      const usb = fakeUsbConnector(FIXTURE_MFP, HardwareErrorCode.UserRejected, 'eth-sign-request');
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const found = await adapter.searchDevices({ transportType: 'usb' });
      await adapter.connectDevice(found[0].connectId);
      const qrBefore = qrFake.requests.length;

      const signed = await adapter.evmSignTransaction(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        {
          path: "m/44'/60'/0'/0/0",
          serializedTx: `02${'ab'.repeat(30)}`,
        }
      );

      expect(signed.success).toBe(false);
      expect(qrFake.requests).toHaveLength(qrBefore);
    });

    it('re-attaches USB by itself while the wallet record remains known', async () => {
      // Simulates a lost USB session while the public wallet record remains in
      // adapter memory. A real process restart needs host-side snapshot
      // hydration before it can reach this re-attach path.
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      if (!imported.success) return;
      const qrRoundTripsAfterImport = qrFake.requests.length;

      const signed = await adapter.evmSignTransaction(
        imported.payload.connectId,
        imported.payload.deviceId,
        {
          path: "m/44'/60'/0'/0/0",
          serializedTx: `02${'ab'.repeat(30)}`,
        }
      );

      expect(signed.success).toBe(true);
      // Went over USB — no further QR prompts than the import already needed.
      expect(qrFake.requests).toHaveLength(qrRoundTripsAfterImport);
      expect(usb.connectArgs).toEqual([FIXTURE_MFP]);
    });

    it('falls back to QR without surfacing an error when USB cannot attach', async () => {
      // The wrong Keystone is on the bus. Per the fail-closed identity rule the
      // USB attach is rejected — but the user must still just get the QR, not
      // an error dialog with a retry button.
      const usb = fakeUsbConnector('11223344');
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      if (!imported.success) return;
      const qrRoundTripsAfterImport = qrFake.requests.length;

      const signed = await adapter.evmSignTransaction(
        imported.payload.connectId,
        imported.payload.deviceId,
        {
          path: "m/44'/60'/0'/0/0",
          serializedTx: `02${'ab'.repeat(30)}`,
        }
      );

      expect(signed.success).toBe(true);
      // The signature came over QR instead.
      expect(qrFake.requests.length).toBeGreaterThan(qrRoundTripsAfterImport);
    });

    it('re-probes USB on a later operation and switches back after the device appears', async () => {
      const usb = fakeUsbConnector();
      usb.setAvailable(false);
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const imported = await adapter.importFromQr();
      if (!imported.success) return;
      const params = { path: "m/44'/60'/0'/0/0", serializedTx: `02${'ab'.repeat(30)}` };
      const qrRequestsAfterImport = qrFake.requests.length;
      await adapter.evmSignTransaction(
        imported.payload.connectId,
        imported.payload.deviceId,
        params
      );
      expect(usb.connectArgs).toHaveLength(0);
      expect(qrFake.requests).toHaveLength(qrRequestsAfterImport + 1);

      usb.setAvailable(true);
      await adapter.evmSignTransaction(
        imported.payload.connectId,
        imported.payload.deviceId,
        params
      );

      expect(usb.connectArgs).toHaveLength(1);
      expect(qrFake.requests).toHaveLength(qrRequestsAfterImport + 1);
    });

    it('waits for a briefly re-enumerating USB device before falling back to QR', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      if (!imported.success) return;
      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      await adapter.releaseInteraction(connected.payload);
      usb.searchCalls.length = 0;
      usb.connectArgs.length = 0;
      usb.setAvailable(false);
      usb.setAvailableAfterSearchCount(2);
      const qrRequestsAfterImport = qrFake.requests.length;

      const signed = await adapter.evmSignTransaction(
        imported.payload.connectId,
        imported.payload.deviceId,
        {
          path: "m/44'/60'/0'/0/0",
          serializedTx: `02${'ab'.repeat(30)}`,
        }
      );

      expect(signed.success).toBe(true);
      expect(usb.searchCalls).toHaveLength(2);
      expect(usb.connectArgs).toEqual([FIXTURE_MFP]);
      expect(qrFake.requests).toHaveLength(qrRequestsAfterImport);
    });

    it('does not fall back to QR when an interaction-pinned USB call fails', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);
      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      const qrRequestsBeforeSign = qrFake.requests.length;

      usb.failNextCall(HardwareErrorCode.PayloadTooLarge);
      const signed = await adapter.evmSignTransaction(connected.payload, FIXTURE_WALLET_ID, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });

      expect(signed.success).toBe(false);
      if (!signed.success) {
        expect(signed.payload.code).toBe(HardwareErrorCode.InteractionEnded);
      }
      expect(qrFake.requests).toHaveLength(qrRequestsBeforeSign);
    });

    it('probes USB before each fetch and attaches when USB returns', async () => {
      const usb = fakeUsbConnector();
      usb.setAvailable(false);
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);
      const imported = await adapter.importFromQr();
      if (!imported.success) return;
      const qrRequestsAfterImport = qrFake.requests.length;
      const params = { path: "m/44'/60'/0'/0/0" };

      const qrOnlyAddress = await adapter.evmGetAddress(
        imported.payload.connectId,
        imported.payload.deviceId,
        params
      );
      expect(qrOnlyAddress.success).toBe(true);
      expect(usb.searchCalls).toHaveLength(1);
      expect(usb.connectArgs).toHaveLength(0);
      // USB absent: the address is fetched over QR (nothing was retained).
      expect(qrFake.requests).toHaveLength(qrRequestsAfterImport + 1);

      usb.setAvailable(true);
      const usbPreferredAddress = await adapter.evmGetAddress(
        imported.payload.connectId,
        imported.payload.deviceId,
        params
      );
      expect(usbPreferredAddress.success).toBe(true);
      expect(usb.searchCalls).toHaveLength(2);
      expect(usb.connectArgs).toEqual([FIXTURE_MFP]);
      // USB back: exported over USB, no further QR request.
      expect(qrFake.requests).toHaveLength(qrRequestsAfterImport + 1);
    });
  });

  describe('generic searchDevices → connectDevice flow', () => {
    it('does not enforce an mfp when connecting a USB scan placeholder', async () => {
      // First-time USB onboarding: the placeholder names a slot on the bus,
      // not a wallet. Enforcing it would reject every new device.
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });

      const found = await adapter.searchDevices({ transportType: 'usb' });
      const connected = await adapter.connectDevice(found[0].connectId);

      expect(connected.success).toBe(true);
      expect(usb.connectArgs).toEqual([usb.searchTargetIds.at(-1)]);
    });

    it('rejects a different Keystone when connectId commits to a 64-hex wallet identity', async () => {
      const usb = fakeUsbConnector(undefined, undefined, undefined, OTHER_ROOT);
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });

      const connected = await adapter.connectDevice(`keystone-wallet:${FIXTURE_WALLET_ID}`);

      expect(connected.success).toBe(false);
      expect(usb.connectArgs).toEqual([undefined]);
      expect(usb.calls).toHaveLength(1);
    });

    it('rejects 8-hex identifiers without opening USB or starting QR', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      for (const identifier of [FIXTURE_MFP, `keystone-qr:${FIXTURE_MFP}`]) {
        const connected = await adapter.connectDevice(identifier);
        expect(connected.success).toBe(false);
        if (!connected.success) {
          expect(connected.payload.code).toBe(HardwareErrorCode.DeviceNotFound);
        }
      }
      const address = await adapter.evmGetAddress(null, FIXTURE_MFP, {
        path: "m/44'/60'/0'/0/0",
      });
      expect(address.success).toBe(false);
      expect(usb.connectArgs).toHaveLength(0);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('returns a QR connection target without interaction, then connectDevice completes one sync', async () => {
      // The host uses the same search -> connect sequence as USB, while the
      // wallet protocol round trip remains owned by the connect phase.
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const found = await adapter.searchDevices({ transportType: 'qr' });
      expect(found).toHaveLength(1);
      expect(found[0].connectId).toBeTruthy();
      expect(found[0].deviceId).toBe('');
      expect(found[0].connectionType).toBe('qr');
      expect(found[0].capabilities?.persistentDeviceIdentity).toBe(false);
      expect(fake.requests).toHaveLength(0);

      const connected = await adapter.connectDevice(found[0].connectId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      expect(parseHardwareRuntimeId(connected.payload)).toMatchObject({
        kind: 'interaction',
        vendor: 'keystone',
      });
      expect(fake.requests).toHaveLength(1);

      const info = await adapter.getDeviceInfo(connected.payload, '');
      expect(info.success).toBe(true);
      if (!info.success) return;
      expect(info.payload.deviceId).toBe(FIXTURE_WALLET_ID);
    });

    it('lists a QR target without interaction and connectDevice binds its wallet', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const targets = await adapter.searchDeviceTargets({ transportType: 'qr' });
      expect(targets).toEqual([
        expect.objectContaining({
          searchTargetId: expect.any(String),
          searchTargetReusePolicy: 'current-discovery',
          vendor: 'keystone',
          connectionType: 'qr',
          kind: 'interactive',
        }),
      ]);
      expect(fake.requests).toHaveLength(0);

      const connected = await adapter.connectDevice(targets[0].searchTargetId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      const info = await adapter.getDeviceInfo(connected.payload, '');
      expect(info.success).toBe(true);
      if (!info.success) return;
      expect(info.payload.deviceId).toBe(FIXTURE_WALLET_ID);
      expect(fake.requests).toHaveLength(1);
    });

    it('does not disconnect the replacement USB interaction when the retired owner ends late', async () => {
      const usb = fakeUsbConnector(undefined, undefined, undefined, FIXTURE_ROOT, false, true);
      const disconnect = jest.spyOn(usb.connector, 'disconnect');
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const targets = await adapter.searchDeviceTargets({ transportType: 'usb' });
      const first = await adapter.connectDevice(targets[0].searchTargetId);
      const second = await adapter.connectDevice(targets[0].searchTargetId);
      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      if (!first.success || !second.success) return;
      expect(disconnect).toHaveBeenCalledWith('keystone-usb-session:1');
      disconnect.mockClear();

      await adapter.releaseInteraction(first.payload);

      expect(disconnect).not.toHaveBeenCalled();
      await expect(adapter.getDeviceInfo(second.payload, '')).resolves.toEqual({
        success: true,
        payload: expect.objectContaining({
          connectId: `keystone-wallet:${FIXTURE_WALLET_ID}`,
        }),
      });

      await adapter.releaseInteraction(second.payload);
      expect(disconnect).toHaveBeenCalledWith('keystone-usb-session:2');
    });

    it('cancels the active QR job without terminating its interaction', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter);
      const targets = await adapter.searchDeviceTargets({ transportType: 'qr' });
      const connected = await adapter.connectDevice(targets[0].searchTargetId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;

      adapter.cancel(connected.payload);

      const info = await adapter.getDeviceInfo(connected.payload, '');
      expect(info.success).toBe(true);
      await adapter.releaseInteraction(connected.payload);
    });

    it('defers public derivation until a business call uses the interaction', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const targets = await adapter.searchDeviceTargets({ transportType: 'qr' });
      const solPath = "m/44'/501'/0'/0'";

      const connected = await adapter.connectDevice(targets[0].searchTargetId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      expect(fake.requests).toHaveLength(1);

      const address = await adapter.solGetAddress(connected.payload, FIXTURE_WALLET_ID, {
        path: solPath,
        interactionId: connected.payload,
      });
      expect(address.success).toBe(true);
      expect(fake.requests).toHaveLength(2);
    });

    it('never prompts for QR on an unscoped scan, so polling scans stay silent', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const found = await adapter.searchDevices();

      expect(found).toEqual([]);
      expect(fake.requests).toHaveLength(0);
    });

    it('preserves known QR wallets on aggregate scan failure but surfaces explicit USB errors', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      attachFakeDevice(adapter);
      await adapter.importFromQr();
      const enumerationError = Object.assign(new Error('WebUSB enumeration failed'), {
        code: HardwareErrorCode.DevicePermissionDenied,
      });
      jest.spyOn(usb.connector, 'searchDevices').mockRejectedValue(enumerationError);

      await expect(adapter.searchDevices()).resolves.toEqual([
        expect.objectContaining({ deviceId: FIXTURE_WALLET_ID, connectionType: 'qr' }),
      ]);
      await expect(adapter.searchDevices({ transportType: 'usb' })).rejects.toBe(enumerationError);
    });
  });

  describe('USB channel', () => {
    it('search reset disconnects and retires a pure-USB wallet session', async () => {
      const usb = fakeUsbConnector();
      const disconnect = jest.spyOn(usb.connector, 'disconnect');
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);

      await adapter.searchDevices({ transportType: 'usb', resetSession: true });

      expect(disconnect).toHaveBeenCalledWith('keystone-usb-session:1');
      await expect(
        adapter.getDeviceInfo(`keystone-wallet:${FIXTURE_WALLET_ID}`, FIXTURE_WALLET_ID)
      ).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceNotFound },
      });
    });

    it('search reset demotes a QR-known wallet back to QR after USB disconnects', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      attachFakeDevice(adapter);
      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      await connectUsbDevice(adapter);

      await adapter.searchDevices({ transportType: 'usb', resetSession: true });

      const info = await adapter.getDeviceInfo(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID
      );
      expect(info).toEqual({
        success: true,
        payload: expect.objectContaining({
          deviceId: FIXTURE_WALLET_ID,
          connectionType: 'qr',
        }),
      });
    });

    it('returns only physical USB targets during explicit USB discovery', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      attachFakeDevice(adapter);
      await adapter.importFromQr();

      const targets = await adapter.searchDeviceTargets({ transportType: 'usb' });

      expect(targets).toEqual([
        expect.objectContaining({
          searchTargetId: usb.searchTargetIds.at(-1),
          connectionType: 'usb',
          kind: 'physical',
        }),
      ]);
      expect(parseHardwareRuntimeId(targets[0].searchTargetId)).toMatchObject({
        kind: 'search-target',
        vendor: 'keystone',
        connectionType: 'usb',
      });
    });

    it('keeps an explicit QR interaction on QR when the wallet also has a live USB session', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);
      await connectUsbDevice(adapter);
      const usbCallsBeforeQrConnect = usb.calls.length;

      const qrConnected = await connectQrDevice(adapter);
      expect(qrConnected.success).toBe(true);
      if (!qrConnected.success) return;
      const qrRequestsAfterConnect = qrFake.requests.length;

      const result = await adapter.btcGetPublicKey(qrConnected.payload, FIXTURE_WALLET_ID, {
        path: "m/84'/0'/0'",
        interactionId: qrConnected.payload,
      });

      expect(result.success).toBe(true);
      expect(usb.calls).toHaveLength(usbCallsBeforeQrConnect);
      expect(qrFake.requests).toHaveLength(qrRequestsAfterConnect + 1);

      await adapter.releaseInteraction(qrConnected.payload);
      expect(usb.connectArgs).toHaveLength(1);
    });

    it('restores USB from a persisted wallet identity before a cold account sync', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);
      const path = "m/84'/0'/0'";

      const result = await adapter.btcGetPublicKey(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        { path }
      );

      expect(result.success).toBe(true);
      expect(parseHardwareRuntimeId(usb.connectArgs[0])).toMatchObject({
        kind: 'search-target',
        vendor: 'keystone',
        connectionType: 'usb',
      });
      expect(qrFake.requests).toHaveLength(0);
      expect(usb.calls).toHaveLength(2);
      const accountCall = QRHardwareCall.fromCBOR(
        Buffer.from((usb.calls[1].params as { urData: string }).urData, 'hex')
      );
      expect(
        (accountCall.getParams() as KeyDerivation)
          .getSchemas()
          .map(schema => `m/${schema.getKeypath().getPath()}`)
      ).toEqual([path]);
    });

    it('falls back to QR and rechecks USB on the next operation after a wallet mismatch', async () => {
      const usb = fakeUsbConnector(undefined, undefined, undefined, OTHER_ROOT);
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const first = await adapter.btcGetPublicKey(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        { path: "m/84'/0'/0'" }
      );
      // Second operation on a path the first sync did not cover (BTC is
      // account-0 only, so use an EVM account-1 path to force a new sync).
      const second = await adapter.evmGetAddress(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        { path: "m/44'/60'/1'/0/0" }
      );

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(usb.connectArgs).toHaveLength(2);
      expect(qrFake.requests).toHaveLength(2);
    });

    it('restores USB from a persisted wallet identity before a cold sign call', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const result = await adapter.evmSignTransaction(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        {
          path: "m/44'/60'/0'/0/0",
          serializedTx: `02${'ab'.repeat(30)}`,
        }
      );

      expect(result.success).toBe(true);
      expect(parseHardwareRuntimeId(usb.connectArgs[0])).toMatchObject({
        kind: 'search-target',
        vendor: 'keystone',
        connectionType: 'usb',
      });
      expect(usb.calls.map(c => (c.params as { urType: string }).urType)).toEqual([
        'qr-hardware-call',
        'eth-sign-request',
      ]);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('probes exact USB targets until a cold persisted wallet identity matches', async () => {
      const usb = fakeUsbConnector(undefined, undefined, undefined, FIXTURE_ROOT, false, true, [
        OTHER_ROOT,
        FIXTURE_ROOT,
      ]);
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const result = await adapter.evmSignTransaction(
        `keystone-wallet:${FIXTURE_WALLET_ID}`,
        FIXTURE_WALLET_ID,
        {
          path: "m/44'/60'/0'/0/0",
          serializedTx: `02${'ab'.repeat(30)}`,
        }
      );

      expect(result.success).toBe(true);
      expect(usb.connectArgs).toEqual(usb.searchTargetIds.slice(0, 2));
      expect(usb.calls.map(call => call.sessionId)).toEqual([
        'keystone-usb-session:1',
        'keystone-usb-session:2',
        'keystone-usb-session:2',
      ]);
      expect(usb.calls.map(call => (call.params as { urType: string }).urType)).toEqual([
        'qr-hardware-call',
        'qr-hardware-call',
        'eth-sign-request',
      ]);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('connectDevice() opens a new USB-only device entry', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });

      const result = await connectUsbDevice(adapter);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(usb.connectArgs).toEqual([usb.searchTargetIds.at(-1)]);

      const devices = await adapter.searchDevices();
      const own = devices.find(d => d.deviceId === FIXTURE_WALLET_ID);
      expect(own).toBeDefined();
      expect(own?.connectionType).toBe('usb');
    });

    it('connectDevice() resolves only identity and defers USB derivation', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });

      const targets = await adapter.searchDeviceTargets({ transportType: 'usb' });
      const connected = await adapter.connectDevice(targets[0].searchTargetId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      const identityCall = QRHardwareCall.fromCBOR(
        Buffer.from((usb.calls[0].params as { urData: string }).urData, 'hex')
      );
      const identityPaths = (identityCall.getParams() as KeyDerivation)
        .getSchemas()
        .map(schema => `m/${schema.getKeypath().getPath()}`);
      expect(identityPaths).toEqual([KEYSTONE_WALLET_ID_PATH]);
      expect(usb.calls).toHaveLength(1);

      const publicKey = await adapter.btcGetPublicKey(connected.payload, FIXTURE_WALLET_ID, {
        path: "m/84'/0'/0'",
        interactionId: connected.payload,
      });
      expect(publicKey.success).toBe(true);
      expect(usb.calls).toHaveLength(2);
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

      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);

      expect(events.map(e => e.type)).toEqual(['device-connect', 'device-changed']);

      const devices = await adapter.searchDevices();
      // Merged, not duplicated — still exactly one row for this wallet id.
      expect(devices.filter(d => d.deviceId === FIXTURE_WALLET_ID)).toHaveLength(1);
      expect(devices[0].connectionType).toBe('usb');
      expect(qrFake.requests).toHaveLength(1); // only the original QR import — no USB-side QR requests
    });

    it('routes a sign call over USB once the wallet has a live USB session, not QR', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      await connectUsbDevice(adapter);

      const result = await adapter.evmSignTransaction(null, FIXTURE_WALLET_ID, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.r).toMatch(/^0x[0-9a-f]{64}$/);
      // Connect derives the wallet id from one fixed account xpub, then the
      // sign request uses the cached mfp. QR never fires.
      expect(usb.calls.map(c => (c.params as { urType: string }).urType)).toEqual([
        'qr-hardware-call',
        'eth-sign-request',
      ]);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('does not replay a USB signing request after an ambiguous transport failure', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);
      await connectUsbDevice(adapter);
      usb.failNextCall(HardwareErrorCode.DeviceDisconnected);

      const result = await adapter.evmSignTransaction(null, FIXTURE_WALLET_ID, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.DeviceDisconnected,
          recovery: { scope: 'unknown' },
          params: {
            operationMayHaveCompleted: true,
            method: 'evmSignTransaction',
          },
        },
      });
      expect(usb.calls).toHaveLength(2);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('routes an implicit default-account sync over USB after identity connect', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      await connectUsbDevice(adapter);

      const result = await adapter.btcGetPublicKey(null, FIXTURE_WALLET_ID, {
        path: "m/84'/0'/0'",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(usb.calls.map(c => (c.params as { urType: string }).urType)).toEqual([
        'qr-hardware-call',
        'qr-hardware-call',
      ]);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('does not reconnect or retry an account export after a USB disconnect', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);
      usb.failNextCall(HardwareErrorCode.DeviceNotFound);

      const result = await adapter.btcGetPublicKey(null, FIXTURE_WALLET_ID, {
        path: "m/84'/0'/0'",
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceNotFound },
      });
      expect(usb.connectArgs).toHaveLength(1);
      expect(usb.calls).toHaveLength(2);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('does not open QR after an account export loses its USB connection', async () => {
      const usb = fakeUsbConnector(undefined, undefined, undefined, FIXTURE_ROOT, true);
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);
      usb.failNextCall(HardwareErrorCode.DeviceNotFound);

      const result = await adapter.btcGetPublicKey(null, FIXTURE_WALLET_ID, {
        path: "m/84'/0'/0'",
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceNotFound },
      });
      expect(usb.connectArgs).toHaveLength(1);
      expect(usb.calls).toHaveLength(2);
      expect(qrFake.requests).toHaveLength(0);
    });

    it("switchTransport('qr') pins a USB-merged wallet back to QR", async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);

      await connectUsbDevice(adapter);
      await adapter.switchTransport('qr');

      const result = await adapter.evmSignTransaction(null, FIXTURE_WALLET_ID, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });

      expect(result.success).toBe(true);
      // USB carried only the identity request from connect. The explicit pin
      // sends the actual sign request through QR.
      expect(usb.calls).toHaveLength(1);
      expect(qrFake.requests.map(r => r.data.urType)).toEqual(['eth-sign-request']);
    });

    it("switchTransport('usb') preserves an availability scan error", async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      attachFakeDevice(adapter);
      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      await adapter.switchTransport('usb');
      const enumerationError = Object.assign(new Error('WebUSB permission was revoked'), {
        code: HardwareErrorCode.DevicePermissionDenied,
      });
      jest.spyOn(usb.connector, 'searchDevices').mockRejectedValue(enumerationError);

      const result = await adapter.btcGetPublicKey(null, FIXTURE_WALLET_ID, {
        path: "m/84'/0'/0'",
      });

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.DevicePermissionDenied,
          error: 'WebUSB permission was revoked',
        },
      });
    });

    it('demotes immediately on physical USB disconnect and falls back to QR on the next call', async () => {
      const usb = fakeUsbConnector(undefined, undefined, undefined, FIXTURE_ROOT, true);
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const qrFake = attachFakeDevice(adapter);
      const changedEvents: HardwareEvent[] = [];
      adapter.on('device-changed', event => changedEvents.push(event));

      const imported = await adapter.importFromQr();
      expect(imported.success).toBe(true);
      await connectUsbDevice(adapter);
      const qrRequestsBeforeDisconnect = qrFake.requests.length;

      usb.emitDisconnect();

      const result = await adapter.evmSignTransaction(null, FIXTURE_WALLET_ID, {
        path: "m/44'/60'/0'/0/0",
        serializedTx: `02${'ab'.repeat(30)}`,
      });
      expect(result.success).toBe(true);
      expect(changedEvents).toHaveLength(2);
      expect(usb.connectArgs).toEqual([usb.searchTargetIds[0], FIXTURE_MFP]);
      expect(qrFake.requests).toHaveLength(qrRequestsBeforeDisconnect + 1);
      expect(qrFake.requests.at(-1)?.data.urType).toBe('eth-sign-request');
    });

    it('releaseInteraction() demotes a QR+USB merged wallet back to QR-only, keeping the entry', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      attachFakeDevice(adapter);
      await adapter.importFromQr();
      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);
      if (!connected.success) return;

      await adapter.releaseInteraction(connected.payload);

      const devices = await adapter.searchDevices();
      const own = devices.find(d => d.deviceId === FIXTURE_WALLET_ID);
      expect(own).toBeDefined();
      expect(own?.connectionType).toBe('qr');
    });

    it('releaseInteraction() drops a USB-only wallet outright (never QR-synced)', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector: usb.connector });
      const events: HardwareEvent[] = [];
      adapter.on('device-disconnect', e => events.push(e));
      const connected = await connectUsbDevice(adapter);
      expect(connected.success).toBe(true);
      if (!connected.success) return;

      await adapter.releaseInteraction(connected.payload);

      expect(events).toHaveLength(1);
      const devices = await adapter.searchDevices();
      expect(devices.find(d => d.deviceId === FIXTURE_WALLET_ID)).toBeUndefined();
    });
  });

  describe('implicit cold start', () => {
    it('answers a null-target allNetworkGetAddress bundle with exactly one QR scan', async () => {
      // app-monorepo third-party QR onboarding: no connectDevice, one
      // all-network scan yields both the wallet identity and every default
      // account. Per-item calls must route to the wallet the prefetch just
      // established instead of re-syncing against an empty target.
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.allNetworkGetAddress(null as unknown as string, '', {
        bundle: [
          { methodName: 'btcGetPublicKey', network: 'btc', path: "m/86'/0'/0'" },
          { methodName: 'evmGetAddress', network: 'evm', path: "m/44'/60'/0'/0/0" },
          { methodName: 'solGetAddress', network: 'sol', path: "m/44'/501'/0'/0'" },
          { methodName: 'tronGetAddress', network: 'tron', path: "m/44'/195'/0'/0/0" },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(fake.requests).toHaveLength(1);
      expect(result.payload).toHaveLength(4);
      for (const item of result.payload) {
        expect(item.success).toBe(true);
        expect(
          (item.payload as { deviceIdentity?: { type: string; value: string } }).deviceIdentity
        ).toEqual({ vendor: 'keystone', type: 'walletId', value: FIXTURE_WALLET_ID });
      }
    });
  });
});
