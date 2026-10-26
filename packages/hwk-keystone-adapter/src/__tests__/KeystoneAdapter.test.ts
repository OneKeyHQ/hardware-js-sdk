import bs58 from 'bs58';
import {
  CryptoCoinInfo,
  CryptoAccount,
  CryptoOutput,
  CryptoHDKey,
  CryptoKeypath,
  CryptoMultiAccounts,
  CryptoPSBT,
  Curve,
  PathComponent,
  QRHardwareCall,
  ScriptExpressions,
} from '@keystonehq/bc-ur-registry';
import { ETHSignature, EthSignRequest } from '@keystonehq/bc-ur-registry-eth';
import { SolSignRequest, SolSignature } from '@keystonehq/bc-ur-registry-sol';
import { UR } from '@keystonehq/keystone-sdk';
import {
  DEVICE,
  EConnectorInteraction,
  HardwareErrorCode,
  UI_REQUEST,
  UI_RESPONSE,
  createHardwareOperationId,
  createHardwareSearchTargetId,
  parseHardwareRuntimeId,
} from '@onekeyfe/hwk-adapter-core';
import HDKey from 'hdkey';
import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';

import { KeystoneAdapter } from '../adapter/KeystoneAdapter';
import { KEYSTONE_COLD_START_PATH } from '../adapter/deviceTable';
import { normalizePath } from '../adapter/pathUtils';
import { KeystoneUrEngine } from '../urEngine/KeystoneUrEngine';
import { TronSignRequest, TronSignType } from '../urEngine/TronSignRequest';
import { TronSignature as TronUrSignature } from '../urEngine/TronSignature';
import { KEYSTONE_BTC_ACCOUNT_EXPORT_CBOR, psbtFixtureHex, urJson } from './fixtures';

import type { KeyDerivation } from '@keystonehq/bc-ur-registry';
import type {
  ConnectorCallResult,
  ConnectorEventMap,
  DeviceInfo,
  DeviceJobQueue,
  HardwareEvent,
  IConnector,
  QrDisplayData,
} from '@onekeyfe/hwk-adapter-core';

// Short QR timeout so an unanswered request (a wiring bug) fails in seconds,
// not after the registry's 10-minute default.
jest.setTimeout(15000);
function newTestAdapter(usbConnector?: IConnector): KeystoneAdapter {
  return new KeystoneAdapter({ qrTimeoutMs: 5000, usbConnector });
}

function nextImmediate(): Promise<void> {
  return new Promise<void>(resolve => {
    setImmediate(resolve);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

// Synthetic 32-byte seed (all 0x09), not a real seed phrase; fixture keys derive
// from it via `hdkey` so xpubs are well-formed.
const FIXTURE_ROOT = HDKey.fromMasterSeed(Buffer.alloc(32, 0x09));
const OTHER_ROOT = HDKey.fromMasterSeed(Buffer.alloc(32, 0x0a));
function mfpOf(root: HDKey): string {
  return root.fingerprint.toString(16).padStart(8, '0');
}
const FIXTURE_MFP = mfpOf(FIXTURE_ROOT);
const FIXTURE_WALLET = `keystone-wallet:${FIXTURE_MFP}`;
const EVM_PATH = "m/44'/60'/0'/0/0";
// Fake EIP-1559-shaped payload (type byte 0x02).
const EVM_TX = { path: EVM_PATH, serializedTx: `02${'ab'.repeat(30)}` };

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

function fixtureHdKey(
  path: string,
  mfpHex: string,
  root = FIXTURE_ROOT,
  ed25519 = false
): CryptoHDKey {
  const node = root.derive(normalizePath(path));
  if (!node.publicKey || !node.chainCode) {
    throw new Error('fixtureHdKey: derived node is missing publicKey/chainCode');
  }
  // A stand-in Ed25519 key: 32 bytes, distinct from the secp256k1 key at the same path.
  const key = ed25519 ? Buffer.from(node.publicKey).subarray(1) : node.publicKey;
  const parentFingerprint = Buffer.alloc(4);
  parentFingerprint.writeUInt32BE(node.parentFingerprint, 0);
  return new CryptoHDKey({
    isMaster: false,
    key,
    chainCode: node.chainCode,
    // Required alongside chainCode for the SDK to populate extendedPublicKey
    // (see keystone-sdk's parseMultiAccounts: both must be non-empty).
    parentFingerprint,
    useInfo: new CryptoCoinInfo(),
    origin: new CryptoKeypath(pathComponents(path), Buffer.from(mfpHex, 'hex')),
  });
}

/**
 * Valid-shaped but wrong UUID (v4 nibbles set, 0xee filler); `uuid`'s strict stringify rejects it
 * before the adapter's requestId comparison runs.
 */
function wrongUuidBuffer(): Buffer {
  const bytes = Buffer.alloc(16, 0xee);
  bytes[6] = 0x4e; // version nibble
  bytes[8] = 0x8e; // variant nibble
  return bytes;
}

const UNSIGNED_PSBT_HEX = psbtFixtureHex();
const SIGNED_PSBT_HEX = psbtFixtureHex(9000n, true);

/** The requestId the fixture device echoes back, per the options under test. */
function echoedRequestId(
  options: FakeDeviceOptions,
  requestId: Buffer | undefined
): Buffer | undefined {
  if (options.omitRequestId) return undefined;
  if (options.wrongRequestId) return wrongUuidBuffer();
  return requestId;
}

interface FakeDeviceOptions {
  deviceVersion?: string;
  /** Have the fixture device echo back a requestId that doesn't match the pending request. */
  wrongRequestId?: boolean;
  /** Have the fixture device answer without any requestId. */
  omitRequestId?: boolean;
  /**
   * Answer a BTC account request with all four script-type variants, as real hardware does. Off
   * by default so 1-request/1-key fixtures stay exact.
   */
  bundleExtraBtcVariants?: boolean;
  root?: HDKey;
  /** Master fingerprint the device reports; defaults to the fixture wallet's. */
  mfpHex?: string;
  /** PSBT the device answers a crypto-psbt with; defaults to the signed fixture request. */
  psbtReplyHex?: string;
}

/**
 * The fixture device's answer to one request UR, built with the real registry types; undefined for
 * a request type it does not handle.
 */
function deviceReply(
  { urType, urData }: { urType: string; urData: string },
  options: FakeDeviceOptions & { mfpHex: string }
): { type: string; cbor: Buffer } | undefined {
  const cbor = Buffer.from(urData, 'hex');
  switch (urType) {
    case 'qr-hardware-call': {
      const call = QRHardwareCall.fromCBOR(cbor);
      const requestedSchemas = (call.getParams() as KeyDerivation).getSchemas();
      const requestedPaths = requestedSchemas.map(schema => `m/${schema.getKeypath().getPath()}`);
      // Like the device, answer each schema on the curve it asked for.
      const ed25519Paths = new Set(
        requestedSchemas
          .filter(schema => schema.getCurve() === Curve.ed25519)
          .map(schema => `m/${schema.getKeypath().getPath()}`)
      );
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
      const keys = bundledPaths.map(path =>
        fixtureHdKey(path, options.mfpHex, options.root, ed25519Paths.has(path))
      );
      return new CryptoMultiAccounts(
        Buffer.from(options.mfpHex, 'hex'),
        keys,
        'Keystone 3 Pro (fixture)',
        undefined,
        options.deviceVersion
      ).toUR();
    }
    case 'eth-sign-request': {
      const requestId = echoedRequestId(options, EthSignRequest.fromCBOR(cbor).getRequestId());
      return new ETHSignature(Buffer.alloc(65, 0x07), requestId).toUR();
    }
    case 'sol-sign-request': {
      const requestId = echoedRequestId(options, SolSignRequest.fromCBOR(cbor).getRequestId());
      return new SolSignature(Buffer.alloc(64, 0x08), requestId).toUR();
    }
    case 'crypto-psbt':
      return new CryptoPSBT(Buffer.from(options.psbtReplyHex ?? SIGNED_PSBT_HEX, 'hex')).toUR();
    case 'tron-sign-request': {
      const requestId = echoedRequestId(options, TronSignRequest.fromCBOR(cbor).getRequestId());
      return new TronUrSignature(Buffer.alloc(65, 0x06), requestId).toUR();
    }
    default:
      return undefined;
  }
}

/**
 * Fake QR device: decodes the UR the adapter built and answers through `uiResponse()`, so no
 * adapter internals are mocked.
 */
function attachFakeDevice(adapter: KeystoneAdapter, options: FakeDeviceOptions = {}) {
  const requests: Array<{ device: DeviceInfo; data: QrDisplayData }> = [];
  const mfpHex = options.mfpHex ?? FIXTURE_MFP;

  const handler = (event: { payload: { device: DeviceInfo; data: QrDisplayData } }) => {
    const { device, data } = event.payload;
    requests.push({ device, data });
    const reply = deviceReply(data, { ...options, mfpHex });
    if (!reply) throw new Error(`attachFakeDevice: unhandled urType ${data.urType}`);
    adapter.uiResponse({ type: UI_RESPONSE.RECEIVE_QR_RESPONSE, payload: urJson(reply) });
  };

  adapter.on(UI_REQUEST.REQUEST_QR_DISPLAY, handler);
  return { requests, detach: () => adapter.off(UI_REQUEST.REQUEST_QR_DISPLAY, handler) };
}

/** Answers every "show the oversized request as a QR?" prompt; the mock counts the prompts. */
function answerQrFallback(adapter: KeystoneAdapter, confirmed: boolean): jest.Mock {
  const asked = jest.fn();
  adapter.on(UI_REQUEST.REQUEST_QR_FALLBACK_CONFIRM, event => {
    asked(event.payload);
    adapter.uiResponse({
      type: UI_RESPONSE.RECEIVE_QR_FALLBACK_CONFIRM,
      payload: { confirmed, requestId: event.payload.requestId },
    });
  });
  return asked;
}

/**
 * Fake USB `IConnector` answering with real registry URs, so these tests cover USB routing and
 * merge logic; wire encoding is tested in `KeystoneUsbConnectorBase.test.ts`.
 */
interface FakeUsbOptions {
  firmwareVersion?: string;
  /** Wallet fingerprint the device claims; defaults to the root's. */
  mfpHex?: string;
  /** Fail every call (or only calls for `failOnUrType`) with this code. */
  failCallWith?: number;
  failOnUrType?: string;
  root?: HDKey;
  /** Reject every connect after the first. */
  failReconnect?: boolean;
  incrementSessionIds?: boolean;
  /** One discovered USB target per root. */
  searchRoots?: HDKey[];
}

type CallError = Extract<ConnectorCallResult, { success: false }>['error'];

function fakeUsbConnector({
  firmwareVersion = '1.7.0',
  mfpHex,
  failCallWith,
  failOnUrType,
  root = FIXTURE_ROOT,
  failReconnect = false,
  incrementSessionIds = false,
  searchRoots = [],
}: FakeUsbOptions = {}) {
  const walletMfp = mfpHex ?? mfpOf(root);
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
  let nextCallFailure: { code: number; params?: Record<string, unknown> } | undefined;
  let scheduledCallFailure: { callNumber: number; code: number } | undefined;
  let urTypeFailure: { urType: string; error: CallError } | undefined;
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
        const searchTargetId = createHardwareSearchTargetId('keystone');
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
        runtimeId?.kind === 'search-target' && runtimeId.vendor === 'keystone';
      if (deviceId && !isUsbSearchTarget && deviceId.toLowerCase() !== walletMfp.toLowerCase()) {
        return Promise.reject(
          Object.assign(
            new Error('Connected Keystone wallet does not match the requested device'),
            { code: HardwareErrorCode.DeviceMismatch }
          )
        );
      }
      const selectedRoot = rootsBySearchTarget.get(deviceId ?? '') ?? root;
      const selectedMfp = mfpOf(selectedRoot);
      const sessionId = `keystone-usb-session:${incrementSessionIds ? connectArgs.length : 1}`;
      rootsBySession.set(sessionId, selectedRoot);
      return Promise.resolve({
        sessionId,
        deviceInfo: {
          vendor: 'keystone',
          model: 'Keystone 3 Pro',
          firmwareVersion,
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
      const urType = (params as { urType?: string } | undefined)?.urType;
      // Answered before the call is recorded, as a host-side interception would be.
      if (urTypeFailure && urTypeFailure.urType === urType) {
        return Promise.resolve<ConnectorCallResult>({ success: false, error: urTypeFailure.error });
      }
      calls.push({ sessionId, method, params });
      if (nextCallFailure) {
        const { code, params: errorParams } = nextCallFailure;
        nextCallFailure = undefined;
        return Promise.resolve<ConnectorCallResult>({
          success: false,
          error: { message: 'fakeUsbConnector: one-shot failure', code, params: errorParams },
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
      const request = params as { urType: string; urData: string };
      const sessionRoot = rootsBySession.get(sessionId) ?? root;
      const reply = ['qr-hardware-call', 'eth-sign-request', 'crypto-psbt'].includes(request.urType)
        ? deviceReply(request, { root: sessionRoot, mfpHex: mfpOf(sessionRoot) })
        : undefined;
      return Promise.resolve<ConnectorCallResult>(
        reply
          ? { success: true, payload: urJson(reply) }
          : {
              success: false,
              error: { message: `fakeUsbConnector: unhandled urType ${request.urType}` },
            }
      );
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
    failNextCall: (code: number, errorParams?: Record<string, unknown>) => {
      nextCallFailure = { code, params: errorParams };
    },
    failCallAt: (callNumber: number, code: number) => {
      scheduledCallFailure = { callNumber, code };
    },
    /** Fails every call carrying `urType` until cleared with `undefined`. */
    failUrType: (failure: { urType: string; error: CallError } | undefined) => {
      urTypeFailure = failure;
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

function requestedPathsOfUr(urData: string): string[] {
  const call = QRHardwareCall.fromCBOR(Buffer.from(urData, 'hex'));
  return (call.getParams() as KeyDerivation)
    .getSchemas()
    .map(schema => `m/${schema.getKeypath().getPath()}`);
}

function requestedPathsOf(request: { data: QrDisplayData }): string[] {
  return requestedPathsOfUr(request.data.urData);
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

/** Connects and returns the operation id, failing the test if the connect fails. */
async function connectOperation(
  adapter: KeystoneAdapter,
  connect: typeof connectUsbDevice = connectUsbDevice
): Promise<string> {
  const connected = await connect(adapter);
  if (!connected.success) throw new Error(`Fixture connection failed: ${connected.payload.error}`);
  return connected.payload;
}

async function importQrWallet(adapter: KeystoneAdapter): Promise<DeviceInfo> {
  const imported = await adapter.importFromQr();
  if (!imported.success) throw new Error(`Fixture import failed: ${imported.payload.error}`);
  return imported.payload;
}

/** Leaves a QR-known wallet whose released USB session was then unplugged. */
async function loseUsbSession(
  adapter: KeystoneAdapter,
  usb: ReturnType<typeof fakeUsbConnector>
): Promise<void> {
  await importQrWallet(adapter);
  await adapter.releaseOperation(await connectOperation(adapter));
  usb.emitDisconnect();
}

/** Wraps a pending call so a test can check whether it has settled yet. */
function track<T>(promise: Promise<T>): [Promise<T>, () => boolean] {
  let settled = false;
  const pending = promise.then(result => {
    settled = true;
    return result;
  });
  return [pending, () => settled];
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('KeystoneAdapter', () => {
  it('detaches connector UI listeners before the connector is reused', async () => {
    const usb = fakeUsbConnector();
    const first = newTestAdapter(usb.connector);
    expect(usb.uiEventHandlerCount()).toBe(1);

    await first.dispose();
    expect(usb.uiEventHandlerCount()).toBe(0);

    const second = newTestAdapter(usb.connector);
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
    it('syncs the default account set and registers the wallet by its master fingerprint', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await importQrWallet(adapter);
      expect(result.deviceId).toBe(FIXTURE_MFP);
      expect(result.connectId).toBe(FIXTURE_WALLET);
      expect(result.vendor).toBe('keystone');
      expect(result.connectionType).toBe('qr');
      expect(fake.requests).toHaveLength(1);
      expect(fake.requests[0].data.urType).toBe('qr-hardware-call');

      const devices = await adapter.searchDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe(FIXTURE_MFP);
    });

    it('learns only the wallet identity; a later address request asks the device for its own path', async () => {
      // Key material is never retained on the wallet record, so importFromQr
      // requests just the cold-start xpub and every later address request pays
      // its own round trip for only the path it needs.
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      await importQrWallet(adapter);
      expect(fake.requests).toHaveLength(1);
      expect(requestedPathsOf(fake.requests[0])).toEqual([KEYSTONE_COLD_START_PATH]);

      const result = await adapter.btcGetAddress(null, FIXTURE_MFP, {
        path: "m/84'/0'/0'/0/0",
        showOnDevice: false,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.address).toMatch(/^bc1q[0-9a-z]{38}$/);
      expect(fake.requests).toHaveLength(2);
      expect(requestedPathsOf(fake.requests[1])).toEqual(["m/84'/0'/0'"]);
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

      const second = await adapter.btcGetAddress(null, FIXTURE_MFP, {
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

      await importQrWallet(adapter);
      expect(fake.requests).toHaveLength(1);

      const result = await adapter.btcGetPublicKey(null, FIXTURE_MFP, { path: "m/84'/0'/0'" });
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
  });

  describe('evmSignTransaction', () => {
    it('accepts common connection context without changing QR routing or serializing host metadata', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const buildRequest = jest.spyOn(KeystoneUrEngine.prototype, 'buildEthSignRequest');
      try {
        const result = await adapter.evmSignTransaction(null, null, {
          ...EVM_TX,
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

    it("signs the dApp's original EIP-712 bytes when dataJson is supplied", async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      // A uint256 wider than 2^53: JSON.parse/stringify would round it, so the
      // device must be handed the dApp's own bytes instead.
      const dataJson =
        '{"types":{"EIP712Domain":[]},"primaryType":"Permit","domain":{},"message":{"value":123456789012345678901234567890}}';

      await adapter.evmSignTypedData(null, null, {
        path: EVM_PATH,
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

    it('warm start: a previously-imported wallet skips the sync round trip', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const imported = await importQrWallet(adapter);

      const result = await adapter.evmSignTransaction(
        imported.connectId,
        imported.deviceId,
        EVM_TX
      );

      expect(result.success).toBe(true);
      // One request from importFromQr, exactly one more for the sign itself:
      // no second sync round trip since the wallet's mfp is already known.
      expect(fake.requests).toHaveLength(2);
      expect(fake.requests[1].data.urType).toBe('eth-sign-request');
    });
  });

  describe('evmGetAddress', () => {
    it('derives a leaf address offline from the synced account xpub', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.evmGetAddress(null, null, { path: EVM_PATH });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      // Only the account-level sync round trip, no separate leaf-path request.
      expect(fake.requests).toHaveLength(1);
      expect(fake.requests[0].data.urType).toBe('qr-hardware-call');
    });

    // Ledger Legacy puts the index straight under the hardened account: m/44'/60'/0'/<index>.
    it.each([0, 7])(
      "derives the Ledger Legacy address at index %i from the m/44'/60'/0' account key",
      async index => {
        const path = `m/44'/60'/0'/${index}`;
        const node = FIXTURE_ROOT.derive(path);
        const uncompressed = secp256k1.ProjectivePoint.fromHex(
          Buffer.from(node.publicKey ?? []).toString('hex')
        ).toRawBytes(false);
        const expected = `0x${Buffer.from(keccak256(uncompressed.slice(1)).slice(-20)).toString(
          'hex'
        )}`;
        const adapter = newTestAdapter();
        attachFakeDevice(adapter);

        const single = await adapter.evmGetAddress(null, null, { path });
        const bundled = await adapter.allNetworkGetAddress(null as unknown as string, '', {
          bundle: [{ methodName: 'evmGetAddress', network: 'evm', path }],
        });
        await adapter.dispose();

        expect(single.success).toBe(true);
        if (!single.success) return;
        expect(single.payload.address.toLowerCase()).toBe(expected);
        expect(bundled.success).toBe(true);
        if (!bundled.success) return;
        expect(bundled.payload[0]).toMatchObject({
          success: true,
          payload: { path, accountKey: { path: "m/44'/60'/0'" } },
        });
        expect((bundled.payload[0].payload as { address: string }).address.toLowerCase()).toBe(
          expected
        );
      }
    );
  });

  describe('accountKey', () => {
    // Hosts pin this key per account path, so it must be exactly what the device exported.
    it.each([
      ['evm', "m/44'/60'/0'/0/3", "m/44'/60'/0'"],
      ['evm', "m/44'/60'/0'/7", "m/44'/60'/0'"],
      ['evm', "m/44'/60'/2'/0/0", "m/44'/60'/2'"],
      ['btc', "m/84'/0'/0'/0/3", "m/84'/0'/0'"],
      ['tron', "m/44'/195'/0'/0/3", "m/44'/195'/0'"],
      ['btcPublicKey', "m/84'/0'/0'", "m/84'/0'/0'"],
    ] as const)(
      'returns the exported %s account key with the result',
      async (method, path, accountPath) => {
        const getAccountKey = async (root: HDKey) => {
          const adapter = newTestAdapter();
          attachFakeDevice(adapter, { root });
          const getters = {
            evm: () => adapter.evmGetAddress(null, null, { path }),
            btc: () => adapter.btcGetAddress(null, null, { path }),
            tron: () => adapter.tronGetAddress(null, null, { path }),
            btcPublicKey: () => adapter.btcGetPublicKey(null, null, { path }),
          };
          const result = await getters[method]();
          await adapter.dispose();
          if (!result.success) throw new Error(`${method} failed`);
          return result.payload.accountKey;
        };

        const node = FIXTURE_ROOT.derive(accountPath);
        const own = await getAccountKey(FIXTURE_ROOT);
        expect(own).toEqual({
          path: accountPath,
          publicKey: Buffer.from(node.publicKey ?? []).toString('hex'),
          chainCode: Buffer.from(node.chainCode ?? []).toString('hex'),
          xpub: node.publicExtendedKey,
        });
        // Same self-reported fingerprint, different seed: only the key tells them apart.
        const other = await getAccountKey(OTHER_ROOT);
        expect(other?.path).toBe(accountPath);
        expect(other?.publicKey).not.toBe(own?.publicKey);
      }
    );

    it('keeps the account key on each all-network item', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter);
      const result = await adapter.allNetworkGetAddress(null as unknown as string, '', {
        bundle: [{ methodName: 'evmGetAddress', network: 'evm', path: "m/44'/60'/0'/0/1" }],
      });
      await adapter.dispose();
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload[0].payload).toMatchObject({
        accountKey: {
          path: "m/44'/60'/0'",
          publicKey: Buffer.from(FIXTURE_ROOT.derive("m/44'/60'/0'").publicKey ?? []).toString(
            'hex'
          ),
        },
      });
    });

    it('returns the exported Solana public key with the address', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter);
      const path = "m/44'/501'/0'/0'";
      const result = await adapter.solGetAddress(null, null, { path });
      await adapter.dispose();
      expect(result.success).toBe(true);
      if (!result.success) return;
      const { address, accountKey } = result.payload;
      expect(accountKey?.path).toBe(path);
      expect(bs58.encode(Buffer.from(accountKey?.publicKey ?? '', 'hex'))).toBe(address);
    });
  });

  describe('untrusted input hardening', () => {
    /** Answer every displayed key request with keys built for the given paths. */
    function answerKeyRequestsWith(adapter: KeystoneAdapter, keysFor: () => CryptoHDKey[]) {
      adapter.on(UI_REQUEST.REQUEST_QR_DISPLAY, event => {
        if (event.payload.data.urType !== 'qr-hardware-call') return;
        const response = new CryptoMultiAccounts(
          Buffer.from(FIXTURE_MFP, 'hex'),
          keysFor(),
          'Keystone 3 Pro (fixture)'
        );
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_QR_RESPONSE,
          payload: urJson(response.toUR()),
        });
      });
    }

    it.each([
      ['an indefinite-length header', '9f'],
      ['a byte string declared longer than the reply', '5affffffff'],
    ])('refuses a scanned reply holding %s', async (_case, urData) => {
      const adapter = newTestAdapter();
      adapter.on(UI_REQUEST.REQUEST_QR_DISPLAY, () => {
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_QR_RESPONSE,
          payload: { urType: 'crypto-multi-accounts', urData },
        });
      });

      const result = await adapter.evmGetAddress(null, null, { path: EVM_PATH });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.InvalidParams },
      });
      await adapter.dispose();
    });

    it('records no wallet from an export that lacks the requested path', async () => {
      const adapter = newTestAdapter();
      answerKeyRequestsWith(adapter, () => [fixtureHdKey("m/44'/60'/7'", FIXTURE_MFP)]);

      const result = await adapter.evmGetAddress(null, null, { path: EVM_PATH });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceMismatch },
      });
      await expect(adapter.searchDevices()).resolves.toEqual([]);
      await adapter.dispose();
    });

    it('refuses an account export that carries a private key', async () => {
      const adapter = newTestAdapter();
      const path = "m/44'/60'/0'";
      answerKeyRequestsWith(adapter, () => {
        const node = FIXTURE_ROOT.derive(path);
        const parentFingerprint = Buffer.alloc(4);
        parentFingerprint.writeUInt32BE(node.parentFingerprint, 0);
        return [
          new CryptoHDKey({
            isMaster: false,
            isPrivateKey: true,
            key: Buffer.concat([Buffer.alloc(1), Buffer.from(node.privateKey ?? [])]),
            chainCode: node.chainCode ?? undefined,
            parentFingerprint,
            useInfo: new CryptoCoinInfo(),
            origin: new CryptoKeypath(pathComponents(path), Buffer.from(FIXTURE_MFP, 'hex')),
          }),
        ];
      });

      const result = await adapter.evmGetAddress(null, null, { path: `${path}/0/0` });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceMismatch },
      });
      await adapter.dispose();
    });

    it('refuses a Solana export whose key is not a 32-byte Ed25519 key', async () => {
      const adapter = newTestAdapter();
      const path = "m/44'/501'/0'/0'";
      // A 33-byte secp256k1 key where an Ed25519 key belongs.
      answerKeyRequestsWith(adapter, () => [fixtureHdKey(path, FIXTURE_MFP)]);

      const result = await adapter.solGetAddress(null, null, { path });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceMismatch },
      });
      await adapter.dispose();
    });

    it('accepts an uppercase 0X prefix as the same hex', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter);

      const result = await adapter.evmSignTransaction(null, FIXTURE_MFP, {
        path: EVM_PATH,
        serializedTx: `0X02${'ab'.repeat(30)}`,
      });

      expect(result.success).toBe(true);
      await adapter.dispose();
    });
  });

  describe('btcSignPsbt', () => {
    it('round-trips an unsigned PSBT through the QR channel', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.btcSignPsbt(null, null, {
        psbt: UNSIGNED_PSBT_HEX,
        coin: 'BTC',
        path: "m/84'/0'/0'",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.signedPsbt).toBe(SIGNED_PSBT_HEX);
      expect(fake.requests.map(r => r.data.urType)).toEqual(['qr-hardware-call', 'crypto-psbt']);
    });

    it('refuses a scanned PSBT signing another transaction', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter, { psbtReplyHex: psbtFixtureHex(8000n, true) });

      const result = await adapter.btcSignPsbt(null, null, {
        psbt: UNSIGNED_PSBT_HEX,
        coin: 'BTC',
        path: "m/84'/0'/0'",
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceMismatch },
      });
    });
  });

  describe('signing with a caller-supplied mfp and no known record', () => {
    function signSourceFingerprint(request: { data: QrDisplayData }): string {
      return EthSignRequest.fromCBOR(Buffer.from(request.data.urData, 'hex'))
        .getSourceFingerprint()
        .toString('hex');
    }

    it.each([
      ['deviceId', null, FIXTURE_MFP],
      ['connectId', FIXTURE_WALLET, null],
    ] as const)(
      'evmSignMessage by %s sends only the sign request, carrying that xfp',
      async (_name, connectId, deviceId) => {
        const adapter = newTestAdapter();
        const fake = attachFakeDevice(adapter);

        const result = await adapter.evmSignMessage(connectId, deviceId, {
          path: EVM_PATH,
          message: 'hi',
        });

        expect(result.success).toBe(true);
        expect(fake.requests.map(r => r.data.urType)).toEqual(['eth-sign-request']);
        expect(signSourceFingerprint(fake.requests[0])).toBe(FIXTURE_MFP);
      }
    );

    it('evmSignTransaction on a fresh adapter sends only the sign request, carrying that xfp', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.evmSignTransaction(null, FIXTURE_MFP, EVM_TX);

      expect(result.success).toBe(true);
      expect(fake.requests.map(r => r.data.urType)).toEqual(['eth-sign-request']);
      expect(signSourceFingerprint(fake.requests[0])).toBe(FIXTURE_MFP);
    });

    it('btcSignPsbt on a fresh adapter sends only the PSBT request', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.btcSignPsbt(FIXTURE_WALLET, FIXTURE_MFP, {
        psbt: UNSIGNED_PSBT_HEX,
        coin: 'BTC',
        path: "m/84'/0'/0'",
      });

      expect(result.success).toBe(true);
      expect(fake.requests.map(r => r.data.urType)).toEqual(['crypto-psbt']);
    });

    it('btcGetMasterFingerprint on a fresh adapter answers from the supplied mfp', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.btcGetMasterFingerprint(null, FIXTURE_MFP);

      expect(result).toMatchObject({
        success: true,
        payload: { masterFingerprint: FIXTURE_MFP },
      });
      expect(fake.requests).toHaveLength(0);
    });

    it.each([
      [
        'btcSignPsbt',
        "m/44'/0'/0'",
        (a: KeystoneAdapter) =>
          a.btcSignPsbt(null, null, { psbt: UNSIGNED_PSBT_HEX, coin: 'BTC', path: "m/84'/0'/0'" }),
      ],
      [
        'solSignTransaction',
        "m/44'/501'/0'",
        (a: KeystoneAdapter) =>
          a.solSignTransaction(null, null, { path: "m/44'/501'/0'", serializedTx: 'cafe' }),
      ],
    ] as const)(
      'a true cold start of %s asks once, for only the chain account path %s',
      async (_name, accountPath, call) => {
        const adapter = newTestAdapter();
        const fake = attachFakeDevice(adapter);

        const result = await call(adapter);

        expect(result.success).toBe(true);
        expect(fake.requests).toHaveLength(2);
        expect(fake.requests[0].data.urType).toBe('qr-hardware-call');
        expect(requestedPathsOf(fake.requests[0])).toEqual([accountPath]);
      }
    );

    it('rejects a response whose master fingerprint is 00000000', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter, { mfpHex: '00000000' });

      const result = await adapter.importFromQr();

      expect(result).toMatchObject({
        success: false,
        payload: { error: expect.stringMatching(/master fingerprint/i) },
      });
    });
  });

  it("names each requested path's chain type, which firmware before 3.0.4 requires", async () => {
    const adapter = newTestAdapter();
    const fake = attachFakeDevice(adapter);
    await adapter.allNetworkGetAddress(null as unknown as string, '', {
      bundle: [
        { methodName: 'evmGetAddress', network: 'evm', path: "m/44'/60'/0'/0/0" },
        { methodName: 'solGetAddress', network: 'sol', path: "m/44'/501'/0'/0'" },
        { methodName: 'tronGetAddress', network: 'tron', path: "m/44'/195'/0'/0/0" },
        { methodName: 'btcGetPublicKey', network: 'btc', path: "m/44'/0'/0'" },
        { methodName: 'btcGetPublicKey', network: 'btc', path: "m/49'/0'/0'" },
        { methodName: 'btcGetPublicKey', network: 'btc', path: "m/84'/0'/0'" },
        { methodName: 'btcGetPublicKey', network: 'btc', path: "m/86'/0'/0'" },
      ],
    });

    const call = QRHardwareCall.fromCBOR(Buffer.from(fake.requests[0].data.urData, 'hex'));
    const chainTypeByPath = Object.fromEntries(
      (call.getParams() as KeyDerivation)
        .getSchemas()
        .map(schema => [`m/${schema.getKeypath().getPath()}`, schema.getChainType()])
    );
    expect(chainTypeByPath).toEqual({
      "m/44'/60'/0'": 'ETH',
      "m/44'/501'/0'/0'": 'SOL',
      "m/44'/195'/0'": 'TRX',
      "m/44'/0'/0'": 'BTC_LEGACY',
      "m/49'/0'/0'": 'BTC',
      "m/84'/0'/0'": 'BTC_NATIVE_SEGWIT',
      "m/86'/0'/0'": 'BTC_TAPROOT',
    });
  });

  describe('BTC account index guard (firmware signs account 0 only)', () => {
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
      expect(requestedPathsOf(fake.requests[0])).not.toContain("m/86'/0'/1'");
      expect(result.payload[0].success).toBe(false);
      expect((result.payload[0].payload as { code?: number }).code).toBe(
        HardwareErrorCode.DevicePathForbidden
      );
      expect(result.payload[0].payload).toMatchObject({
        params: { reason: 'btc-account-limit' },
      });
      expect(result.payload[1].success).toBe(true);
    });
  });

  describe('parameter checks before any device request', () => {
    const INVALID = { code: HardwareErrorCode.InvalidParams };
    const UNSUPPORTED = { code: HardwareErrorCode.MethodNotSupported };
    const FORBIDDEN = { code: HardwareErrorCode.DevicePathForbidden };
    it.each<[string, (adapter: KeystoneAdapter) => Promise<unknown>, Record<string, unknown>]>([
      [
        'btcGetPublicKey rejects a leaf path — an xpub is an account-level key',
        a => a.btcGetPublicKey(null, FIXTURE_MFP, { path: "m/84'/0'/0'/0/0" }),
        { error: expect.stringMatching(/account path/i) },
      ],
      [
        'evmSignTransaction rejects a legacy structured-fields call — Keystone only signs a serializedTx',
        a =>
          a.evmSignTransaction(null, null, {
            path: EVM_PATH,
            to: '0x0000000000000000000000000000000000dEaD',
            value: '0x0',
          } as never),
        UNSUPPORTED,
      ],
      [
        'evmSignTransaction refuses a transaction with a non-hex character',
        a =>
          a.evmSignTransaction(null, FIXTURE_MFP, {
            path: EVM_PATH,
            serializedTx: `02${'ab'.repeat(10)}zz`,
          }),
        INVALID,
      ],
      [
        'evmSignTransaction refuses a transaction with an odd length',
        a =>
          a.evmSignTransaction(null, FIXTURE_MFP, {
            path: EVM_PATH,
            serializedTx: `02${'ab'.repeat(10)}a`,
          }),
        INVALID,
      ],
      [
        'evmSignTransaction refuses to sign with a key path of another chain',
        a => a.evmSignTransaction(null, FIXTURE_MFP, { ...EVM_TX, path: "m/44'/195'/0'/0/0" }),
        INVALID,
      ],
      [
        'evmSignTypedData requires the original typed-data JSON text',
        a =>
          a.evmSignTypedData(null, FIXTURE_MFP, {
            path: EVM_PATH,
            data: { types: {}, primaryType: 'Mail', domain: {}, message: {} },
          } as unknown as Parameters<KeystoneAdapter['evmSignTypedData']>[2]),
        INVALID,
      ],
      [
        'evmGetAddress rejects a short path with nothing to derive',
        a => a.evmGetAddress(null, null, { path: "m/44'/60'/0'" }),
        INVALID,
      ],
      [
        'evmGetAddress rejects conflicting positional and common operation ids',
        a =>
          a.evmGetAddress(createHardwareOperationId('keystone'), null, {
            path: EVM_PATH,
            operationId: createHardwareOperationId('keystone'),
          }),
        INVALID,
      ],
      [
        'evmGetAddress refuses a path under another chain coin type',
        a => a.evmGetAddress(null, FIXTURE_MFP, { path: "m/44'/501'/0'/0/0" }),
        INVALID,
      ],
      [
        'solGetAddress refuses a path under another chain coin type',
        a => a.solGetAddress(null, FIXTURE_MFP, { path: "m/44'/60'/0'/0'" }),
        INVALID,
      ],
      [
        'solSignMessage refuses the off-chain message format',
        a =>
          a.solSignMessage(null, null, {
            path: "m/44'/501'/0'",
            message: 'deadbeef',
            messageVersion: 1,
            requiredSigners: ['11'.repeat(32)],
          }),
        UNSUPPORTED,
      ],
      // Testnet: this package can only derive mainnet.
      [
        'btcGetAddress refuses a testnet (non-zero coin) account',
        a => a.btcGetAddress(null, null, { path: "m/84'/1'/0'/0/0" }),
        FORBIDDEN,
      ],
      [
        'btcSignMessage refuses a non-zero account',
        a => a.btcSignMessage(null, null, { path: "m/84'/0'/1'/0/0", message: 'hello' }),
        FORBIDDEN,
      ],
      [
        'btcGetPublicKey refuses a non-zero account',
        a => a.btcGetPublicKey(null, null, { path: "m/86'/0'/2'" }),
        FORBIDDEN,
      ],
      [
        'btcSignPsbt refuses a non-zero account',
        a =>
          a.btcSignPsbt(null, null, { psbt: UNSIGNED_PSBT_HEX, coin: 'BTC', path: "m/84'/0'/1'" }),
        FORBIDDEN,
      ],
      [
        'btcSignPsbt refuses a request with no path at all',
        a => a.btcSignPsbt(null, null, { psbt: UNSIGNED_PSBT_HEX, coin: 'BTC' }),
        INVALID,
      ],
      // P2TR needs an elliptic-curve library for BIP-341 tweaking.
      [
        'btcGetAddress (P2TR) returns MethodNotSupported rather than throwing',
        a => a.btcGetAddress(null, null, { path: "m/86'/0'/0'/0/0" }),
        UNSUPPORTED,
      ],
      [
        'btcGetAddress rejects a path whose purpose is not 44/49/84/86',
        a => a.btcGetAddress(null, null, { path: "m/999'/0'/0'/0/0" }),
        INVALID,
      ],
      [
        'btcGetAddress refuses a non-mainnet coin',
        a => a.btcGetAddress(null, FIXTURE_MFP, { path: "m/84'/0'/0'/0/0", coin: 'ltc' }),
        { code: HardwareErrorCode.ChainNotSupported },
      ],
      [
        'btcGetAddress refuses an addressIndex on top of the path',
        a => a.btcGetAddress(null, FIXTURE_MFP, { path: "m/84'/0'/0'/0/0", addressIndex: 3 }),
        INVALID,
      ],
      [
        'tronGetAddress rejects a short path with nothing to derive',
        a => a.tronGetAddress(null, null, { path: "m/44'/195'/0'" }),
        INVALID,
      ],
      [
        'tronGetAddress refuses a path under another chain coin type',
        a => a.tronGetAddress(null, FIXTURE_MFP, { path: EVM_PATH }),
        INVALID,
      ],
      // Firmware only has the TIP-191 V2 preimage.
      [
        'tronSignMessage rejects a missing messageType',
        a => a.tronSignMessage(null, null, { path: "m/44'/195'/0'/0/0", messageHex: 'deadbeef' }),
        UNSUPPORTED,
      ],
      [
        'tronSignMessage rejects messageType=V1',
        a =>
          a.tronSignMessage(null, null, {
            path: "m/44'/195'/0'/0/0",
            messageHex: 'deadbeef',
            messageType: 'V1',
          }),
        UNSUPPORTED,
      ],
      [
        'tronSignTransaction rejects a call with no rawTxHex — no structured-field equivalent',
        a =>
          a.tronSignTransaction(null, null, {
            path: "m/44'/195'/0'/0/0",
            ownerAddress: `41${'ab'.repeat(20)}`,
          } as never),
        INVALID,
      ],
    ])('%s', async (_name, call, payload) => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      expect(await call(adapter)).toMatchObject({ success: false, payload });
      expect(fake.requests).toHaveLength(0);
      await adapter.dispose();
    });
  });

  describe('scanned signatures', () => {
    it.each<[string, FakeDeviceOptions, (adapter: KeystoneAdapter) => Promise<unknown>]>([
      [
        'evmSignTransaction rejects a response that carries no requestId',
        { omitRequestId: true },
        a => a.evmSignTransaction(null, null, EVM_TX),
      ],
      [
        'evmSignTransaction rejects a response whose requestId does not match the pending request',
        { wrongRequestId: true },
        a => a.evmSignTransaction(null, null, EVM_TX),
      ],
      [
        'solSignTransaction rejects a response whose requestId does not match the pending request',
        { wrongRequestId: true },
        a => a.solSignTransaction(null, null, { path: "m/44'/501'/0'", serializedTx: 'cafe' }),
      ],
      [
        'tronSignTransaction rejects a response whose requestId does not match the pending request',
        { wrongRequestId: true },
        a =>
          a.tronSignTransaction(null, null, {
            path: "m/44'/195'/0'/0/0",
            rawTxHex: 'ca'.repeat(40),
          }),
      ],
    ])('%s', async (_name, options, call) => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter, options);
      expect(await call(adapter)).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceMismatch },
      });
    });

    const originOf: Record<string, (cbor: Buffer) => string | undefined> = {
      'eth-sign-request': cbor => EthSignRequest.fromCBOR(cbor).getOrigin(),
      'sol-sign-request': cbor => SolSignRequest.fromCBOR(cbor).getOrigin(),
      'tron-sign-request': cbor => TronSignRequest.fromCBOR(cbor).getOrigin(),
    };

    // A cold start asks once for the chain's account path (Keystone's documented account level,
    // not the 5-segment fingerprint leaf), then signs. The origin assertion catches an adapter
    // that stops forwarding it: sol.generateSignRequest has no config-level fallback and
    // TronSignRequest only writes a truthy origin.
    it.each<
      [
        string,
        (adapter: KeystoneAdapter) => Promise<unknown>,
        string,
        string,
        Record<string, unknown>
      ]
    >([
      [
        'evmSignTransaction',
        a => a.evmSignTransaction(null, null, EVM_TX),
        "m/44'/60'/0'",
        'eth-sign-request',
        {
          r: expect.stringMatching(/^0x[0-9a-f]{64}$/),
          s: expect.stringMatching(/^0x[0-9a-f]{64}$/),
          v: expect.stringMatching(/^0x/),
        },
      ],
      [
        'evmSignMessage',
        a => a.evmSignMessage(null, null, { path: EVM_PATH, message: 'hi' }),
        "m/44'/60'/0'",
        'eth-sign-request',
        { signature: expect.stringMatching(/^0x[0-9a-f]+$/) },
      ],
      [
        'solSignTransaction',
        a => a.solSignTransaction(null, null, { path: "m/44'/501'/0'", serializedTx: 'cafe' }),
        "m/44'/501'/0'",
        'sol-sign-request',
        { signature: '08'.repeat(64) },
      ],
      [
        'tronSignTransaction',
        // Opaque bytes: Keystone's tron-sign-request carries them unparsed.
        a =>
          a.tronSignTransaction(null, null, {
            path: "m/44'/195'/0'/0/0",
            rawTxHex: 'ca'.repeat(40),
          }),
        "m/44'/195'/0'",
        'tron-sign-request',
        // A bare 65-byte signature; Keystone returns no re-encoded transaction.
        { signature: '06'.repeat(65), serializedTx: undefined },
      ],
    ])(
      '%s cold start probes the account path once, then signs over QR with the origin',
      async (_method, call, probePath, signUrType, payload) => {
        const adapter = newTestAdapter();
        const fake = attachFakeDevice(adapter);

        expect(await call(adapter)).toEqual({ success: true, payload });
        expect(fake.requests.map(r => r.data.urType)).toEqual(['qr-hardware-call', signUrType]);
        expect(requestedPathsOf(fake.requests[0])).toEqual([probePath]);
        expect(originOf[signUrType](Buffer.from(fake.requests[1].data.urData, 'hex'))).toBe(
          'OneKey'
        );
      }
    );
  });

  describe('btcGetAddress', () => {
    it('always derives from the account xpub; showOnDevice adds no device request', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const path = "m/84'/0'/0'/0/7";

      const result = await adapter.btcGetAddress(null, null, { path, showOnDevice: true });

      expect(result.success).toBe(true);
      if (!result.success) return;
      // Keystone answers account-level KeyDerivation requests; nothing is
      // displayed on the device for this call, so a leaf-path request would
      // only cost an extra round trip.
      expect(requestedPathsOf(fake.requests[0])).toEqual(["m/84'/0'/0'"]);
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
      // Only the account-level sync round trip, offline derivation after that.
      expect(fake.requests).toHaveLength(1);
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
      // Only the account-level sync round trip, offline derivation after that.
      expect(fake.requests).toHaveLength(1);
      expect(fake.requests[0].data.urType).toBe('qr-hardware-call');
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
      // TronSignRequest only writes origin when truthy, so this regresses to a
      // missing origin if the adapter stops forwarding it.
      expect(decoded.getOrigin()).toBe('OneKey');
    });

    it.each([
      'm/44h/195h/0h/0/0',
      "m/44'/195'/0'/0x1/0",
      "m/44'/195'//0/0",
      "m/44'/195'/0'/2147483648/0",
    ])('refuses to sign with the malformed path %s before reaching the device', async path => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const results = await Promise.all([
        adapter.tronSignMessage(null, null, { path, messageHex: 'deadbeef', messageType: 'V2' }),
        adapter.tronSignTransaction(null, null, { path, rawTxHex: '0a02' }),
        adapter.evmSignMessage(null, null, { path, message: 'hi' }),
        adapter.solSignTransaction(null, null, { path, serializedTx: 'cafe' }),
      ]);
      for (const result of results) {
        expect(result).toMatchObject({
          success: false,
          payload: { code: HardwareErrorCode.InvalidParams },
        });
      }
      expect(fake.requests).toHaveLength(0);
    });

    it('TronSignRequest.parsePath refuses a segment it cannot encode exactly', () => {
      expect(() => TronSignRequest.parsePath("m/44h/195'/0'", FIXTURE_MFP)).toThrow();
      expect(TronSignRequest.parsePath("m/44'/195'/0'/0/1", FIXTURE_MFP).getPath()).toBe(
        "44'/195'/0'/0/1"
      );
    });
  });

  describe('error code range', () => {
    it('does not let a low-numbered thrown .code escape as an HWK code', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const connected = await connectOperation(adapter);

      jest
        .spyOn(usb.connector, 'call')
        .mockRejectedValueOnce(new DOMException('device is gone', 'NotFoundError'));

      const result = await adapter.evmSignTransaction(connected, FIXTURE_MFP, {
        ...EVM_TX,
        operationId: connected,
      });

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.UnknownError,
          error: expect.stringContaining('device is gone'),
        },
      });
    });
  });

  describe('cancel', () => {
    it('ignores an old operation cancellation while a newer USB operation is pending', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const first = await connectOperation(adapter);
      const second = await connectOperation(adapter);
      const rawCall = usb.connector.call.bind(usb.connector);
      let finishCall: (() => void) | undefined;
      jest.spyOn(usb.connector, 'call').mockImplementationOnce(
        (...args) =>
          new Promise(resolve => {
            finishCall = () => resolve(rawCall(...args));
          })
      );
      const [pending, settled] = track(
        adapter.evmSignTransaction(second, FIXTURE_MFP, { ...EVM_TX, operationId: second })
      );
      await nextImmediate();
      adapter.cancel(first);
      await nextImmediate();
      expect(settled()).toBe(false);
      expect(finishCall).toBeDefined();
      finishCall?.();
      await expect(pending).resolves.toMatchObject({ success: true });
      await adapter.dispose();
    });

    it.each([true, false])(
      'cancels only matching queued jobs (active matches=%s)',
      async matchesActive => {
        const usb = fakeUsbConnector();
        const adapter = newTestAdapter(usb.connector);
        const connected = await connectOperation(adapter);
        const rawCall = usb.connector.call.bind(usb.connector);
        let finishCall: (() => void) | undefined;
        const call = jest.spyOn(usb.connector, 'call').mockImplementationOnce(
          (...args) =>
            new Promise(resolve => {
              finishCall = () => resolve(rawCall(...args));
            })
        );
        const active = adapter.evmSignTransaction(connected, FIXTURE_MFP, EVM_TX);
        await nextImmediate();
        const target = matchesActive ? connected : FIXTURE_MFP;
        const queued = adapter.evmSignTransaction(target, FIXTURE_MFP, EVM_TX);
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

    it('keeps an unnamed QR request independent of the connection operation', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      await connectOperation(adapter, connectQrDevice);
      // Leave the signing request unanswered so it stays pending.
      fake.detach();
      const prompts: { payload: { operationId?: string } }[] = [];
      adapter.on(UI_REQUEST.REQUEST_QR_DISPLAY, event => {
        prompts.push(event);
      });

      // No operationId on the call, so the job queues under the wallet id.
      const pending = adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX);
      await sleep(10);
      expect(prompts).toHaveLength(1);
      expect(prompts[0].payload.operationId).toBeUndefined();

      adapter.cancel(FIXTURE_WALLET);
      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
      await adapter.dispose();
    });

    it('does not cancel a fresh request through an omitted operation', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const connected = await connectOperation(adapter, connectQrDevice);
      fake.detach();

      const [pending, settled] = track(
        adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX)
      );
      await sleep(10);

      // Named but unresolvable: no job under that key and no UI request it
      // owns. It must not decay into the untargeted form.
      adapter.cancel(`keystone-wallet:${'f'.repeat(64)}`);
      await sleep(10);
      expect(settled()).toBe(false);

      adapter.cancel(connected);
      await sleep(10);
      expect(settled()).toBe(false);

      adapter.cancel(FIXTURE_WALLET);
      expect((await pending).success).toBe(false);
      await adapter.dispose();
    });

    it('ends a QR call queued under its operation when the operation is released', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const connected = await connectOperation(adapter, connectQrDevice);
      // Leave the sign request unanswered: the call waits on the QR scan.
      fake.detach();

      const pending = adapter.evmSignTransaction(connected, FIXTURE_MFP, {
        ...EVM_TX,
        operationId: connected,
      });
      await sleep(10);
      await adapter.releaseOperation(connected);

      // Without this the call would hold the queue until the QR timeout.
      const settled = await Promise.race([pending.then(() => true), sleep(200).then(() => false)]);
      expect(settled).toBe(true);
      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.OperationEnded },
      });
      await adapter.dispose();
    });

    it.each([true, false])(
      'retains only an explicitly supplied operation during a QR prompt (supplied=%s)',
      async supplied => {
        const adapter = newTestAdapter();
        const fake = attachFakeDevice(adapter);
        const connected = await connectOperation(adapter, connectQrDevice);
        fake.detach();
        const operations = (
          adapter as unknown as {
            _operations: { _active: Map<string, { timer?: unknown }> };
          }
        )._operations._active;

        const pending = adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, {
          ...EVM_TX,
          ...(supplied ? { operationId: connected } : {}),
        });
        await sleep(10);
        if (supplied) expect(operations.get(connected)?.timer).toBeUndefined();
        else expect(operations.get(connected)?.timer).toBeDefined();

        adapter.cancel(supplied ? connected : FIXTURE_WALLET);
        await pending;
        expect(operations.get(connected)?.timer).toBeDefined();
        await adapter.dispose();
      }
    );

    it.each([
      [
        'released',
        (adapter: KeystoneAdapter, operationId: string) => adapter.releaseOperation(operationId),
      ],
      [
        'replaced by a new connect',
        async (adapter: KeystoneAdapter) => {
          // Reconnecting the known wallet ends its previous operation.
          await expect(adapter.connectDevice(FIXTURE_WALLET)).resolves.toMatchObject({
            success: true,
          });
        },
      ],
    ])(
      'keeps an unpinned QR prompt open when the live operation is %s',
      async (_label, endOperation) => {
        const adapter = newTestAdapter();
        const fake = attachFakeDevice(adapter);
        const connected = await connectOperation(adapter, connectQrDevice);
        fake.detach();
        const prompts: Array<{ payload: { data: QrDisplayData; operationId?: string } }> = [];
        adapter.on(UI_REQUEST.REQUEST_QR_DISPLAY, event => {
          prompts.push(event);
        });

        // No operationId on the call: neither the prompt nor the call belongs to the operation.
        const [pending, settled] = track(
          adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX)
        );
        await sleep(10);
        expect(prompts).toHaveLength(1);
        expect(prompts[0].payload.operationId).toBeUndefined();

        await endOperation(adapter, connected);
        const operations = (
          adapter as unknown as { _operations: { _active: Map<string, unknown> } }
        )._operations._active;
        expect(operations.has(connected)).toBe(false);
        await sleep(10);
        expect(settled()).toBe(false);

        const reply = deviceReply(prompts[0].payload.data, { mfpHex: FIXTURE_MFP });
        if (!reply) throw new Error('Expected a device reply for the sign request');
        adapter.uiResponse({ type: UI_RESPONSE.RECEIVE_QR_RESPONSE, payload: urJson(reply) });
        await expect(pending).resolves.toMatchObject({ success: true });
        await adapter.dispose();
      }
    );

    it('leaves no trace when the named operation has already ended', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const connected = await connectOperation(adapter, connectQrDevice);
      await adapter.releaseOperation(connected);
      // Leave the next request unanswered so it stays cancellable.
      fake.detach();

      const [pending, settled] = track(
        adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX)
      );
      await sleep(10);

      // Naming a finished operation cancels nothing: not this unrelated job on
      // the same wallet, and not the QR request it is waiting on.
      adapter.cancel(connected);
      await sleep(10);
      expect(settled()).toBe(false);

      adapter.cancel(FIXTURE_MFP);
      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
      await adapter.dispose();
    });

    it('cancels an operation-scoped job addressed by its wallet connectId', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const connected = await connectOperation(adapter, connectQrDevice);
      // Leave the signing request unanswered: it stays pending in the UI
      // registry until something cancels it.
      fake.detach();

      const pending = adapter.evmSignTransaction(connected, FIXTURE_MFP, {
        ...EVM_TX,
        operationId: connected,
      });
      await sleep(10);
      // The host cancels with the connectId it holds, not the operation id the
      // job was queued under.
      adapter.cancel(FIXTURE_WALLET);

      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
      await adapter.dispose();
    });

    it('refuses to put a cancelled command on the USB wire', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      attachFakeDevice(adapter);
      const imported = await importQrWallet(adapter);

      // Hold the best-effort USB re-attach open. It takes no signal, so a
      // cancel landing here is only seen once the call reaches the connector.
      const rawConnect = usb.connector.connect.bind(usb.connector);
      let finishConnect: (() => void) | undefined;
      jest.spyOn(usb.connector, 'connect').mockImplementationOnce(
        (...args) =>
          new Promise(resolve => {
            finishConnect = () => resolve(rawConnect(...args));
          })
      );

      const pending = adapter.evmSignTransaction(imported.connectId, imported.deviceId, EVM_TX);
      await sleep(10);
      expect(finishConnect).toBeDefined();
      adapter.cancel(imported.deviceId);
      finishConnect?.();

      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
      expect(usb.calls.map(call => (call.params as { urType?: string })?.urType)).not.toContain(
        'eth-sign-request'
      );
      await adapter.dispose();
    });

    it('rejects a pending QR display request with UserAborted', async () => {
      const adapter = newTestAdapter();
      // No fake device attached, the request is left pending until cancelled.
      const pending = adapter.evmSignTransaction(null, null, EVM_TX);

      // Let the job queue actually issue the display request before cancelling.
      await sleep(10);
      adapter.cancel();

      const result = await pending;
      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
    });

    it('returns USB cancellation immediately and drains the raw call before release', async () => {
      const usb = fakeUsbConnector();
      const disconnect = jest.spyOn(usb.connector, 'disconnect');
      const adapter = newTestAdapter(usb.connector);
      const connected = await connectOperation(adapter);

      let resolveRawCall: (value: ConnectorCallResult) => void = () => undefined;
      jest.spyOn(usb.connector, 'call').mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveRawCall = resolve;
          })
      );
      const pending = adapter.evmSignTransaction(connected, FIXTURE_MFP, {
        ...EVM_TX,
        operationId: connected,
      });
      await nextImmediate();
      adapter.cancel(connected);

      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
      const release = adapter.releaseOperation(connected);
      await nextImmediate();
      expect(disconnect).not.toHaveBeenCalled();

      await expect(adapter.evmSignTransaction(null, FIXTURE_MFP, EVM_TX)).resolves.toMatchObject({
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
      const adapter = newTestAdapter(usb.connector);
      const connected = await connectOperation(adapter);

      let resolveRawCall: (value: ConnectorCallResult) => void = () => undefined;
      jest.spyOn(usb.connector, 'call').mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveRawCall = resolve;
          })
      );
      const pending = adapter.evmSignTransaction(connected, FIXTURE_MFP, {
        ...EVM_TX,
        operationId: connected,
      });
      await nextImmediate();
      adapter.cancel(connected);
      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });

      const disposing = adapter.dispose();
      await nextImmediate();
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

  describe('QR operation timeout', () => {
    it('fails with OperationTimeout when the app never answers within qrTimeoutMs', async () => {
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 20 });
      // No fake device, nothing ever answers the display request.
      const result = await adapter.evmSignTransaction(null, null, EVM_TX);
      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.OperationTimeout },
      });
    });

    it('marks a timed-out QR signing response as possibly completed', async () => {
      const adapter = new KeystoneAdapter({ qrTimeoutMs: 20 });
      const fake = attachFakeDevice(adapter);
      await importQrWallet(adapter);
      fake.detach();

      const result = await adapter.evmSignTransaction(null, FIXTURE_MFP, EVM_TX);

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.OperationTimeout,
          recovery: { scope: 'unknown' },
          params: { operationMayHaveCompleted: true, method: 'evmSignTransaction' },
        },
      });
    });
  });

  describe('getChainFingerprint / btcGetMasterFingerprint', () => {
    it('getChainFingerprint derives a stable per-chain value without a device round trip', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const result = await adapter.getChainFingerprint(FIXTURE_WALLET, FIXTURE_MFP, 'evm');
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

      const second = await adapter.btcGetMasterFingerprint(FIXTURE_WALLET, FIXTURE_MFP);
      expect(second.success).toBe(true);
      expect(fake.requests).toHaveLength(1); // no additional round trip
    });

    it('honors an operation id instead of falling back to a persisted wallet id', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter);
      const connected = await connectOperation(adapter, connectQrDevice);

      await adapter.releaseOperation(connected);
      const result = await adapter.btcGetMasterFingerprint(FIXTURE_WALLET, FIXTURE_MFP, {
        operationId: connected,
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.OperationEnded },
      });
    });
  });

  describe('device account export scan', () => {
    const BTC_PATH = "m/84'/0'/0'";
    const bundle = [
      { methodName: 'btcGetPublicKey' as const, network: 'btc', path: BTC_PATH },
      { methodName: 'btcGetPublicKey' as const, network: 'btc', path: "m/86'/0'/0'" },
      { methodName: 'evmGetAddress' as const, network: 'evm', path: EVM_PATH },
    ];
    function exportedAccount(paths = [BTC_PATH], mfp = FIXTURE_MFP, deviceVersion = '3.1.4-C') {
      return new CryptoMultiAccounts(
        Buffer.from(mfp, 'hex'),
        paths.map(path => fixtureHdKey(path, mfp)),
        'Keystone 3 Pro',
        undefined,
        deviceVersion
      ).toUR();
    }
    function answerExport(adapter: KeystoneAdapter, exported = exportedAccount(), optIn = true) {
      const display = jest.fn();
      const scan = jest.fn();
      const respond = () =>
        adapter.uiResponse({
          type: UI_RESPONSE.RECEIVE_QR_RESPONSE,
          payload: { ...urJson(exported), ...(optIn ? { accountExport: true } : {}) },
        });
      const onDisplay = (event: { payload: { data: QrDisplayData } }) => {
        display(event.payload.data);
        respond();
      };
      const onScan = () => {
        scan();
        respond();
      };
      adapter.on(UI_REQUEST.REQUEST_QR_DISPLAY, onDisplay);
      adapter.on(UI_REQUEST.REQUEST_QR_SCAN, onScan);
      return {
        display,
        scan,
        detach: () => {
          adapter.off(UI_REQUEST.REQUEST_QR_DISPLAY, onDisplay);
          adapter.off(UI_REQUEST.REQUEST_QR_SCAN, onScan);
        },
      };
    }

    it('uses exported Bitcoin paths and keeps unavailable bundle items explicit', async () => {
      const adapter = newTestAdapter();
      const ui = answerExport(adapter);
      try {
        const result = await adapter.allNetworkGetAddress('', '', { bundle });
        expect(result).toMatchObject({
          success: true,
          payload: [
            {
              success: true,
              network: 'btc',
              payload: { accountExport: true, accountKey: { path: BTC_PATH } },
            },
            { success: false, payload: { params: { reason: 'account-not-exported' } } },
            { success: false, payload: { params: { reason: 'account-not-exported' } } },
          ],
        });
        expect(ui.display).toHaveBeenCalledWith(
          expect.objectContaining({ allowAccountExport: true })
        );
        expect(
          await adapter.btcGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
            path: `${BTC_PATH}/0/0`,
          })
        ).toMatchObject({ success: true });
        expect(ui.display).toHaveBeenCalledTimes(2);
        expect(ui.scan).not.toHaveBeenCalled();
      } finally {
        await adapter.dispose();
      }
    });

    it('retains full-path validation for a normal request response', async () => {
      const adapter = newTestAdapter();
      answerExport(adapter, exportedAccount(), false);
      expect(await adapter.allNetworkGetAddress('', '', { bundle })).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceMismatch },
      });
      await adapter.dispose();
    });

    it('keeps Bitcoin signing on its normal QR request after an export import', async () => {
      const adapter = newTestAdapter();
      const ui = answerExport(adapter);
      await adapter.allNetworkGetAddress('', '', { bundle });
      ui.detach();
      const signing = attachFakeDevice(adapter);
      expect(
        await adapter.btcSignPsbt(FIXTURE_WALLET, FIXTURE_MFP, {
          path: BTC_PATH,
          psbt: UNSIGNED_PSBT_HEX,
        })
      ).toMatchObject({ success: true, payload: { signedPsbt: SIGNED_PSBT_HEX } });
      expect(signing.requests).toHaveLength(1);
      expect(signing.requests[0].data.urType).toBe('crypto-psbt');
      expect(signing.requests[0].data.allowAccountExport).toBeUndefined();
      await adapter.dispose();
    });

    it('refuses an account export offered as a signing response', async () => {
      const adapter = newTestAdapter();
      answerExport(adapter);
      await adapter.allNetworkGetAddress('', '', { bundle });
      expect(
        await adapter.btcSignPsbt(FIXTURE_WALLET, FIXTURE_MFP, {
          path: BTC_PATH,
          psbt: UNSIGNED_PSBT_HEX,
        })
      ).toMatchObject({ success: false, payload: { code: HardwareErrorCode.InvalidParams } });
      await adapter.dispose();
    });

    it('does not create an EVM account merely because Cypherpunk exports an EVM key', async () => {
      const adapter = newTestAdapter();
      answerExport(adapter, exportedAccount([BTC_PATH, "m/44'/60'/0'"]));
      expect(await adapter.allNetworkGetAddress('', '', { bundle })).toMatchObject({
        success: true,
        payload: [{ success: true }, { success: false }, { success: false }],
      });
      await adapter.dispose();
    });

    it('reports an unmatched export without attributing it to the Bitcoin account limit', async () => {
      const adapter = newTestAdapter();
      answerExport(adapter, exportedAccount(["m/44'/60'/0'"]));
      expect(await adapter.allNetworkGetAddress('', '', { bundle })).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.DevicePathForbidden,
          params: { reason: 'account-not-exported' },
        },
      });
      expect(await adapter.searchDevices()).toEqual([]);
      await adapter.dispose();
    });

    it.each([false, true])(
      'checks wallet identity before missing paths in a single account export (wrongWallet=%s)',
      async wrongWallet => {
        const adapter = newTestAdapter();
        answerExport(
          adapter,
          exportedAccount([BTC_PATH], wrongWallet ? mfpOf(OTHER_ROOT) : FIXTURE_MFP)
        );
        try {
          expect(
            await adapter.evmGetAddress(FIXTURE_WALLET, FIXTURE_MFP, { path: EVM_PATH })
          ).toMatchObject({
            success: false,
            payload: wrongWallet
              ? { code: HardwareErrorCode.DeviceMismatch }
              : {
                  code: HardwareErrorCode.DevicePathForbidden,
                  params: { reason: 'account-not-exported' },
                },
          });
          expect(await adapter.searchDevices()).toEqual([]);
        } finally {
          await adapter.dispose();
        }
      }
    );

    it('refuses conflicting public keys for one exported path', async () => {
      const adapter = newTestAdapter();
      answerExport(
        adapter,
        new CryptoMultiAccounts(Buffer.from(FIXTURE_MFP, 'hex'), [
          fixtureHdKey(BTC_PATH, FIXTURE_MFP),
          fixtureHdKey(BTC_PATH, FIXTURE_MFP, OTHER_ROOT),
        ]).toUR()
      );
      expect(await adapter.allNetworkGetAddress('', '', { bundle })).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceMismatch },
      });
      await adapter.dispose();
    });

    it('refuses a descriptor whose script disagrees with its derivation path', async () => {
      const adapter = newTestAdapter();
      answerExport(
        adapter,
        new CryptoAccount(Buffer.from(FIXTURE_MFP, 'hex'), [
          new CryptoOutput(
            [ScriptExpressions.PUBLIC_KEY_HASH],
            fixtureHdKey(BTC_PATH, FIXTURE_MFP)
          ),
        ]).toUR()
      );
      expect(await adapter.allNetworkGetAddress('', '', { bundle })).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.InvalidParams },
      });
      await adapter.dispose();
    });

    it('accepts a standard Bitcoin crypto-account export', async () => {
      const adapter = newTestAdapter();
      const exported = new CryptoAccount(Buffer.from(FIXTURE_MFP, 'hex'), [
        new CryptoOutput(
          [ScriptExpressions.WITNESS_PUBLIC_KEY_HASH],
          fixtureHdKey(BTC_PATH, FIXTURE_MFP)
        ),
      ]).toUR();
      answerExport(adapter, exported);
      expect(await adapter.allNetworkGetAddress('', '', { bundle })).toMatchObject({
        success: true,
        payload: [{ success: true, payload: { accountExport: true } }, {}, {}],
      });
      await adapter.dispose();
    });

    it('creates the available accounts from the actual firmware BTC export', async () => {
      const adapter = newTestAdapter();
      answerExport(
        adapter,
        new UR(Buffer.from(KEYSTONE_BTC_ACCOUNT_EXPORT_CBOR, 'hex'), 'crypto-account')
      );
      expect(await adapter.allNetworkGetAddress('', '', { bundle })).toMatchObject({
        success: true,
        payload: [
          { success: true, payload: { accountExport: true } },
          { success: true, payload: { accountExport: true } },
          { success: false, payload: { params: { reason: 'account-not-exported' } } },
        ],
      });
      await adapter.dispose();
    });

    it('checks normal bundle items against the current QR response firmware', async () => {
      const adapter = newTestAdapter();
      const current = attachFakeDevice(adapter, { deviceVersion: '3.1.4-C' });
      try {
        expect(await adapter.allNetworkGetAddress('', '', { bundle })).toMatchObject({
          success: true,
          payload: [
            { success: true },
            { success: true },
            { success: false, payload: { code: HardwareErrorCode.ChainNotSupported } },
          ],
        });
        expect(current.requests).toHaveLength(1);
      } finally {
        current.detach();
        await adapter.dispose();
      }
    });

    it.each(['single', 'bundle'] as const)(
      'does not let a previous QR firmware block a new EVM %s request',
      async mode => {
        const adapter = newTestAdapter();
        const initial = answerExport(adapter);
        expect(await adapter.importFromQr({ mode: 'scan' })).toMatchObject({ success: true });
        initial.detach();

        const current = attachFakeDevice(adapter);
        try {
          const result =
            mode === 'single'
              ? await adapter.evmGetAddress(FIXTURE_WALLET, FIXTURE_MFP, { path: EVM_PATH })
              : await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
                  bundle: [{ methodName: 'evmGetAddress', network: 'evm', path: EVM_PATH }],
                });
          expect(result).toMatchObject({
            success: true,
            ...(mode === 'bundle' ? { payload: [{ success: true }] } : {}),
          });
          expect(current.requests).toHaveLength(1);
        } finally {
          current.detach();
          await adapter.dispose();
        }
      }
    );

    it('does not inherit physical-device metadata when the next QR export omits it', async () => {
      const adapter = newTestAdapter();
      const initial = answerExport(
        adapter,
        new CryptoMultiAccounts(
          Buffer.from(FIXTURE_MFP, 'hex'),
          [fixtureHdKey(BTC_PATH, FIXTURE_MFP)],
          'Keystone 3 Pro',
          'fixture-device',
          '3.1.4-C'
        ).toUR()
      );
      const imported = await adapter.importFromQr({ mode: 'scan' });
      expect(imported).toMatchObject({ success: true });
      if (imported.success) {
        expect(imported.payload.capabilities?.supportedChains).toBeUndefined();
      }
      initial.detach();

      const current = answerExport(
        adapter,
        new CryptoAccount(Buffer.from(FIXTURE_MFP, 'hex'), [
          new CryptoOutput(
            [ScriptExpressions.WITNESS_PUBLIC_KEY_HASH],
            fixtureHdKey(BTC_PATH, FIXTURE_MFP)
          ),
        ]).toUR()
      );
      try {
        const result = await adapter.importFromQr({ mode: 'scan' });
        expect(result).toMatchObject({
          success: true,
          payload: { model: 'unknown', firmwareVersion: '0.0.0' },
        });
        if (!result.success) return;
        expect(result.payload.raw?.hardwareDeviceId).toBeUndefined();
        expect(result.payload.capabilities?.supportedChains).toBeUndefined();
      } finally {
        current.detach();
        await adapter.dispose();
      }
    });

    it.each(['single', 'bundle'] as const)(
      'shows a new QR request for an EVM %s call after a manual Bitcoin export',
      async mode => {
        const adapter = newTestAdapter();
        const btcExport = new CryptoAccount(Buffer.from(FIXTURE_MFP, 'hex'), [
          new CryptoOutput(
            [ScriptExpressions.WITNESS_PUBLIC_KEY_HASH],
            fixtureHdKey(BTC_PATH, FIXTURE_MFP)
          ),
        ]).toUR();
        const initial = answerExport(adapter, btcExport);
        expect(await adapter.allNetworkGetAddress('', '', { bundle })).toMatchObject({
          success: true,
          payload: [{ success: true, payload: { accountExport: true } }, {}, {}],
        });
        initial.detach();

        const normal = attachFakeDevice(adapter);
        const unexpectedScan = jest.fn(() => {
          adapter.uiResponse({
            type: UI_RESPONSE.RECEIVE_QR_RESPONSE,
            payload: urJson(exportedAccount(["m/44'/60'/0'"], FIXTURE_MFP, '3.1.4')),
          });
        });
        adapter.on(UI_REQUEST.REQUEST_QR_SCAN, unexpectedScan);
        try {
          const result =
            mode === 'single'
              ? await adapter.evmGetAddress(FIXTURE_WALLET, FIXTURE_MFP, { path: EVM_PATH })
              : await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
                  bundle: [{ methodName: 'evmGetAddress', network: 'evm', path: EVM_PATH }],
                });
          expect(result).toMatchObject({ success: true });
          expect(unexpectedScan).not.toHaveBeenCalled();
          expect(normal.requests).toHaveLength(1);
          expect(normal.requests[0].data).toMatchObject({
            urType: 'qr-hardware-call',
            allowAccountExport: true,
          });
        } finally {
          normal.detach();
          adapter.off(UI_REQUEST.REQUEST_QR_SCAN, unexpectedScan);
          await adapter.dispose();
        }
      }
    );

    it('refuses another wallet even when the user selects a device export', async () => {
      const adapter = newTestAdapter();
      answerExport(adapter, exportedAccount([BTC_PATH], mfpOf(OTHER_ROOT)));
      expect(
        await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, { bundle })
      ).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceMismatch },
      });
      await adapter.dispose();
    });

    it.each([
      { type: 'crypto-psbt', cbor: Buffer.from(UNSIGNED_PSBT_HEX, 'hex') },
      { type: 'crypto-multi-accounts', cbor: Buffer.from('00', 'hex') },
    ])('refuses an unrelated or malformed $type without registering a wallet', async exported => {
      const adapter = newTestAdapter();
      answerExport(adapter, exported);
      expect(await adapter.allNetworkGetAddress('', '', { bundle })).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.InvalidParams },
      });
      expect(await adapter.searchDevices()).toEqual([]);
      await adapter.dispose();
    });
  });

  describe('USB firmware chain support', () => {
    it.each(['3.1.4-C', '3.1.4-CYPHERPUNK', '3.1.4-B', '3.1.4-BTC'])(
      'keeps a successful %s USB connection usable for Bitcoin',
      async firmwareVersion => {
        const usb = fakeUsbConnector({ firmwareVersion });
        const adapter = newTestAdapter(usb.connector);
        const qrFake = attachFakeDevice(adapter);
        const onConnected = jest.fn();
        adapter.on('device-connect', onConnected);
        const connected = await connectOperation(adapter);
        try {
          expect(onConnected).toHaveBeenCalledWith({
            type: DEVICE.CONNECT,
            payload: expect.objectContaining({
              firmwareVersion,
              capabilities: { persistentDeviceIdentity: true, supportedChains: ['btc'] },
            }),
          });
          const info = await adapter.getDeviceInfo(connected, FIXTURE_MFP);
          expect(info).toMatchObject({
            success: true,
            payload: { firmwareVersion, capabilities: { supportedChains: ['btc'] } },
          });
          const result = await adapter.btcGetPublicKey(connected, FIXTURE_MFP, {
            path: "m/84'/0'/0'",
          });
          expect(result.success).toBe(true);
          const signed = await adapter.btcSignPsbt(connected, FIXTURE_MFP, {
            path: "m/84'/0'/0'",
            psbt: UNSIGNED_PSBT_HEX,
          });
          expect(signed).toMatchObject({
            success: true,
            payload: { signedPsbt: SIGNED_PSBT_HEX },
          });
          expect(usb.calls).toHaveLength(2);
          expect(adapter.activeTransport).toBe('usb');
          expect(qrFake.requests).toHaveLength(0);
        } finally {
          await adapter.dispose();
        }
      }
    );

    it('refuses unsupported addresses and signing before sending to Cypherpunk firmware', async () => {
      const usb = fakeUsbConnector({ firmwareVersion: '3.1.4-C' });
      const adapter = newTestAdapter(usb.connector);
      const connected = await connectOperation(adapter);
      try {
        const results = await Promise.all([
          adapter.evmGetAddress(connected, FIXTURE_MFP, { path: EVM_PATH }),
          adapter.solGetAddress(connected, FIXTURE_MFP, { path: "m/44'/501'/0'/0'" }),
          adapter.tronGetAddress(connected, FIXTURE_MFP, { path: "m/44'/195'/0'/0/0" }),
          adapter.evmSignTransaction(connected, FIXTURE_MFP, EVM_TX),
        ]);
        for (const result of results) {
          expect(result).toMatchObject({
            success: false,
            payload: { code: HardwareErrorCode.ChainNotSupported },
          });
        }
        expect(usb.calls).toHaveLength(0);
      } finally {
        await adapter.dispose();
      }
    });

    it('keeps the supported Bitcoin item in a mixed Cypherpunk USB bundle', async () => {
      const usb = fakeUsbConnector({ firmwareVersion: '3.1.4-C' });
      const adapter = newTestAdapter(usb.connector);
      const connected = await connectOperation(adapter);
      try {
        const result = await adapter.allNetworkGetAddress(connected, FIXTURE_MFP, {
          bundle: [
            { methodName: 'btcGetPublicKey', network: 'btc', path: "m/84'/0'/0'" },
            { methodName: 'evmGetAddress', network: 'evm', path: EVM_PATH },
          ],
        });
        expect(result).toMatchObject({
          success: true,
          payload: [
            { success: true, network: 'btc' },
            {
              success: false,
              network: 'evm',
              payload: { code: HardwareErrorCode.ChainNotSupported },
            },
          ],
        });
        expect(usb.calls).toHaveLength(1);
      } finally {
        await adapter.dispose();
      }
    });

    it.each([
      { usbVersion: '3.1.4-C', qrVersion: '3.1.4', usbEvm: false, qrEvm: true },
      { usbVersion: '3.1.4', qrVersion: '3.1.4-C', usbEvm: true, qrEvm: false },
    ])('keeps USB $usbVersion and QR $qrVersion metadata separate', async options => {
      const usb = fakeUsbConnector({ firmwareVersion: options.usbVersion });
      const adapter = newTestAdapter(usb.connector);
      attachFakeDevice(adapter, { deviceVersion: options.qrVersion });
      try {
        const usbOperation = await connectOperation(adapter);
        await importQrWallet(adapter);
        expect(await adapter.getDeviceInfo(usbOperation, FIXTURE_MFP)).toMatchObject({
          success: true,
          payload: { connectionType: 'usb', firmwareVersion: options.usbVersion },
        });
        const usbResult = await adapter.evmGetAddress(usbOperation, FIXTURE_MFP, {
          path: EVM_PATH,
        });
        expect(usbResult.success).toBe(options.usbEvm);
        expect(usb.calls).toHaveLength(options.usbEvm ? 1 : 0);

        const qrOperation = await connectOperation(adapter, connectQrDevice);
        expect(await adapter.getDeviceInfo(qrOperation, FIXTURE_MFP)).toMatchObject({
          success: true,
          payload: { connectionType: 'qr', firmwareVersion: options.qrVersion },
        });
        const qrResult = await adapter.evmGetAddress(qrOperation, FIXTURE_MFP, { path: EVM_PATH });
        expect(qrResult.success).toBe(options.qrEvm);
        expect(usb.calls).toHaveLength(options.usbEvm ? 1 : 0);
        usb.emitDisconnect();
        expect(await adapter.getDeviceInfo(FIXTURE_WALLET, FIXTURE_MFP)).toMatchObject({
          success: true,
          payload: { connectionType: 'qr', firmwareVersion: options.qrVersion },
        });
      } finally {
        await adapter.dispose();
      }
    });

    it.each(['3.1.4-CYPHERPUNK-B', '3.1.4-BTC-ONLY'])(
      'checks the firmware from a parsed QR response with version %s',
      async deviceVersion => {
        const adapter = newTestAdapter();
        attachFakeDevice(adapter, { deviceVersion });
        try {
          const wallet = await importQrWallet(adapter);
          expect(wallet.firmwareVersion).toBe(deviceVersion);
          const result = await adapter.evmGetAddress(wallet.connectId, wallet.deviceId, {
            path: EVM_PATH,
          });
          expect(result).toMatchObject({
            success: false,
            payload: { code: HardwareErrorCode.ChainNotSupported },
          });
        } finally {
          await adapter.dispose();
        }
      }
    );

    it('checks the USB firmware after reattaching a QR-known wallet', async () => {
      const usb = fakeUsbConnector({ firmwareVersion: '3.1.4-C' });
      const adapter = newTestAdapter(usb.connector);
      attachFakeDevice(adapter, { deviceVersion: '3.1.4' });
      try {
        await importQrWallet(adapter);
        expect(
          await adapter.evmGetAddress(FIXTURE_WALLET, FIXTURE_MFP, { path: EVM_PATH })
        ).toMatchObject({
          success: false,
          payload: { code: HardwareErrorCode.ChainNotSupported },
        });
        expect(usb.connectArgs).toHaveLength(1);
        expect(usb.calls).toHaveLength(0);
      } finally {
        await adapter.dispose();
      }
    });
  });

  describe('wallet-creation burst', () => {
    it('keeps all-network calls pinned by commonParams.operationId', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      const connected = await connectOperation(adapter);
      const callsAfterConnect = usb.calls.length;

      const result = await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
        operationId: connected,
        bundle: [{ methodName: 'btcGetPublicKey', network: 'btc', path: "m/84'/0'/0'" }],
      });

      expect(result.success).toBe(true);
      expect(usb.calls.length).toBeGreaterThan(callsAfterConnect);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('keeps a QR-routed bundle on QR when the record still carries a USB session', async () => {
      // importFromQr remembers the record without clearing usbSessionId, so a
      // wallet that was on USB earlier still has one. The operation route, not
      // that leftover session, decides which transport the bundle uses.
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      await connectOperation(adapter);

      const qrConnected = await connectOperation(adapter, connectQrDevice);

      const usbCallsBeforeBundle = usb.calls.length;
      const qrRequestsBeforeBundle = qrFake.requests.length;

      const result = await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
        operationId: qrConnected,
        bundle: [
          { methodName: 'evmGetAddress', network: 'evm', path: EVM_PATH },
          { methodName: 'solGetAddress', network: 'sol', path: "m/44'/501'/0'/0'" },
        ],
      });

      expect(result.success).toBe(true);
      expect(usb.calls.length).toBe(usbCallsBeforeBundle);
      // One batched QR request covers both paths. The USB branch walks the
      // missing schemas one at a time, so taking it costs a scan per path.
      expect(qrFake.requests.length).toBe(qrRequestsBeforeBundle + 1);
    });

    it('uses single-path USB exports throughout the default-network creation burst', async () => {
      // The App's post-connect burst: wallet xfp, then one address per default network.
      // Each missing path is exported in its own USB request.
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);

      const found = await adapter.searchDevices({ transportType: 'usb' });
      const connected = await adapter.connectDevice(found[0].connectId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      const connectId = connected.payload;
      const roundTripsAfterConnect = usb.calls.length;

      // buildHwWalletXfp
      expect((await adapter.btcGetMasterFingerprint(connectId, FIXTURE_MFP)).success).toBe(true);
      expect(
        (await adapter.btcGetPublicKey(connectId, FIXTURE_MFP, { path: "m/86'/0'/0'" })).success
      ).toBe(true);
      // one address per default network
      expect(
        (await adapter.evmGetAddress(connectId, FIXTURE_MFP, { path: EVM_PATH })).success
      ).toBe(true);
      expect(
        (await adapter.solGetAddress(connectId, FIXTURE_MFP, { path: "m/44'/501'/0'" })).success
      ).toBe(true);
      expect(
        (await adapter.tronGetAddress(connectId, FIXTURE_MFP, { path: "m/44'/195'/0'/0/0" }))
          .success
      ).toBe(true);

      // Connect exports nothing and the xfp comes from the USB session: BTC, EVM,
      // SOL and Tron each pay one single-path export.
      expect(roundTripsAfterConnect).toBe(0);
      expect(usb.calls).toHaveLength(4);
      const schemaCounts = usb.calls.map(
        call => requestedPathsOfUr((call.params as { urData: string }).urData).length
      );
      expect(schemaCounts).toEqual([1, 1, 1, 1]);
    });
  });

  describe('key export consent', () => {
    it('connects without a key export and surfaces a rejected export on the first key request', async () => {
      const usb = fakeUsbConnector({ failCallWith: HardwareErrorCode.UserRejected });
      const adapter = newTestAdapter(usb.connector);

      const found = await adapter.searchDevices({ transportType: 'usb' });
      const connected = await adapter.connectDevice(found[0].connectId);

      expect(connected.success).toBe(true);
      if (!connected.success) return;
      expect(usb.calls).toHaveLength(0);

      const address = await adapter.evmGetAddress(connected.payload, FIXTURE_MFP, {
        path: EVM_PATH,
      });
      expect(address).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserRejected },
      });
      expect(usb.calls).toHaveLength(1);
    });

    it('asks for one path at a time over USB', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);

      const found = await adapter.searchDevices({ transportType: 'usb' });
      const connected = await adapter.connectDevice(found[0].connectId);
      if (!connected.success) return;
      const connectId = connected.payload;

      await adapter.evmGetAddress(connectId, FIXTURE_MFP, { path: EVM_PATH });
      // Connect exported nothing, so EVM pays its own export.
      expect(usb.calls).toHaveLength(1);

      await adapter.tronGetAddress(connectId, FIXTURE_MFP, { path: "m/44'/195'/0'/0/0" });
      await adapter.btcGetPublicKey(connectId, FIXTURE_MFP, { path: "m/84'/0'/0'" });
      expect(usb.calls).toHaveLength(3);
    });
  });

  describe('USB-first with silent QR fallback', () => {
    it.each(['cancelled', 'timed out'])(
      'ignores answers from a QR fallback prompt that was %s',
      async endedBy => {
        const usb = fakeUsbConnector();
        const adapter = newTestAdapter(usb.connector);
        const qrFake = attachFakeDevice(adapter);
        await adapter.releaseOperation(await connectOperation(adapter));
        const prompts: Array<{ requestId?: string }> = [];
        adapter.on(UI_REQUEST.REQUEST_QR_FALLBACK_CONFIRM, event => {
          prompts.push(event.payload);
        });
        usb.failUrType({
          urType: 'eth-sign-request',
          error: { code: HardwareErrorCode.PayloadTooLarge, message: 'USB size limit' },
        });
        jest.useFakeTimers({ doNotFake: ['setImmediate', 'performance'] });
        try {
          const first = adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX);
          await nextImmediate();
          expect(prompts).toHaveLength(1);
          if (endedBy === 'cancelled') adapter.cancel();
          else jest.advanceTimersByTime(600_000);
          await expect(first).resolves.toMatchObject({ success: false });

          const [second, settled] = track(
            adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX)
          );
          await nextImmediate();
          expect(prompts).toHaveLength(2);
          adapter.uiResponse({
            type: UI_RESPONSE.RECEIVE_QR_FALLBACK_CONFIRM,
            payload: { confirmed: true, requestId: prompts[0].requestId },
          });
          await nextImmediate();
          expect(settled()).toBe(false);
          expect(qrFake.requests).toHaveLength(0);

          adapter.uiResponse({
            type: UI_RESPONSE.RECEIVE_QR_FALLBACK_CONFIRM,
            payload: { confirmed: true },
          });
          await nextImmediate();
          expect(settled()).toBe(false);
          expect(qrFake.requests).toHaveLength(0);
          expect(typeof prompts[1].requestId).toBe('string');
          expect(prompts[1].requestId).not.toBe(prompts[0].requestId);

          adapter.uiResponse({
            type: UI_RESPONSE.RECEIVE_QR_FALLBACK_CONFIRM,
            payload: { confirmed: false, requestId: prompts[1].requestId },
          });
          await expect(second).resolves.toMatchObject({
            success: false,
            payload: { code: HardwareErrorCode.UserAborted },
          });
        } finally {
          await adapter.dispose();
          jest.useRealTimers();
        }
      }
    );

    it('does not attach USB for an empty or unsupported bundle', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      attachFakeDevice(adapter);
      const imported = await importQrWallet(adapter);

      const emptyResult = await adapter.allNetworkGetAddress(
        imported.connectId,
        imported.deviceId,
        { bundle: [] }
      );
      const unsupportedResult = await adapter.allNetworkGetAddress(
        imported.connectId,
        imported.deviceId,
        {
          bundle: [
            { methodName: 'unsupportedGetAddress', network: 'unsupported', path: "m/44'/0'/0'" },
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
      // The USB device holds another wallet, so the targeted connect is refused.
      const usb = fakeUsbConnector({ mfpHex: mfpOf(OTHER_ROOT) });
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      const imported = await importQrWallet(adapter);
      expect(qrFake.requests).toHaveLength(1);

      const result = await adapter.allNetworkGetAddress(imported.connectId, imported.deviceId, {
        bundle: [
          { methodName: 'btcGetPublicKey', network: 'btc', path: "m/44'/0'/0'" },
          { methodName: 'btcGetPublicKey', network: 'btc', path: "m/49'/0'/0'" },
          { methodName: 'btcGetPublicKey', network: 'btc', path: "m/84'/0'/0'" },
          { methodName: 'btcGetPublicKey', network: 'btc', path: "m/86'/0'/0'" },
          { methodName: 'evmGetAddress', network: 'evm', path: "m/44'/60'/1'/0/0" },
          {
            methodName: 'evmGetAddress',
            network: 'evm-secondary-network',
            path: "m/44'/60'/1'/0/0",
          },
          { methodName: 'tronGetAddress', network: 'tron', path: "m/44'/195'/1'/0/0" },
          { methodName: 'solGetAddress', network: 'sol', path: "m/44'/501'/1'/0'" },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload).toHaveLength(8);
      expect(result.payload.every(item => item.success)).toBe(true);
      expect(
        result.payload.every(
          item => item.payload?.rootFingerprint === Number.parseInt(FIXTURE_MFP, 16)
        )
      ).toBe(true);
      expect(usb.connectArgs).toEqual([FIXTURE_MFP]);
      expect(usb.calls).toHaveLength(0);
      expect(qrFake.requests).toHaveLength(2);

      // Nothing is retained from importFromQr, so the one fallback scan
      // carries every bundled path (BTC is account 0 only).
      expect(requestedPathsOf(qrFake.requests[1])).toEqual([
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
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      await connectUsbDevice(adapter);
      const originalCall = usb.connector.call.bind(usb.connector);
      jest.spyOn(usb.connector, 'call').mockImplementation(async (...args) => {
        const result = await originalCall(...args);
        usb.emitDisconnect();
        return result;
      });

      const result = await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
        bundle: [
          { methodName: 'btcGetPublicKey', network: 'btc', path: "m/44'/0'/0'" },
          { methodName: 'btcGetPublicKey', network: 'btc', path: "m/49'/0'/0'" },
        ],
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.TransportNotAvailable },
      });
      expect(usb.calls).toHaveLength(1);
      expect(usb.connectArgs).toHaveLength(1);
      expect(qrFake.requests).toHaveLength(0);
    });

    // Connect sends no export, so every call is a bundle item, and each USB item asks the device
    // itself; `shouldAbortBundle` itself is covered in hwk-adapter-core's allNetwork tests.
    it.each([
      ['a rejection of the first item', 1, HardwareErrorCode.UserRejected],
      ['a mid-operation disconnect', 2, HardwareErrorCode.DeviceNotFound],
      ['a rejection of a later chain', 3, HardwareErrorCode.UserRejected],
    ])(
      'stops a USB bundle after %s without retrying or switching to QR',
      async (_name, failAt, code) => {
        const usb = fakeUsbConnector({ failReconnect: true });
        const adapter = newTestAdapter(usb.connector);
        const qrFake = attachFakeDevice(adapter);

        await connectOperation(adapter);
        usb.failCallAt(failAt, code);

        const result = await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
          bundle: [
            { methodName: 'btcGetPublicKey', network: 'btc', path: "m/44'/0'/0'" },
            { methodName: 'btcGetPublicKey', network: 'btc', path: "m/49'/0'/0'" },
            { methodName: 'evmGetAddress', network: 'evm', path: "m/44'/60'/1'/0/0" },
            { methodName: 'solGetAddress', network: 'sol', path: "m/44'/501'/1'/0'" },
          ],
        });

        expect(result).toMatchObject({ success: false, payload: { code } });
        expect(usb.calls).toHaveLength(failAt);
        expect(usb.connectArgs).toHaveLength(1);
        expect(qrFake.requests).toHaveLength(0);
      }
    );

    // Each USB item asks the device itself, so a device answer about its own path fails it alone;
    // a safety answer (lock, another wallet) or an unattributed failure, which drops the session,
    // ends the whole bundle.
    it.each([
      ['the device declines the chain', HardwareErrorCode.ChainNotSupported, 'device', true],
      ['the device is locked', HardwareErrorCode.DeviceLocked, 'device', false],
      ['the wallet does not match', HardwareErrorCode.DeviceMismatch, 'device', false],
      ['the device rejects the parameters', HardwareErrorCode.InvalidParams, 'device', true],
      ['an unattributed chain failure', HardwareErrorCode.ChainNotSupported, undefined, false],
    ] as const)(
      'handles a USB bundle path failure where %s',
      async (_name, code, origin, continues) => {
        const usb = fakeUsbConnector();
        const adapter = newTestAdapter(usb.connector);
        const qrFake = attachFakeDevice(adapter);
        await connectOperation(adapter);
        const solPath = "m/44'/501'/1'/0'";
        const callUsb = usb.connector.call.bind(usb.connector);
        jest.spyOn(usb.connector, 'call').mockImplementation((sessionId, method, params) => {
          const { urType, urData } = params as { urType: string; urData: string };
          if (urType === 'qr-hardware-call' && requestedPathsOfUr(urData).includes(solPath)) {
            return Promise.resolve({
              success: false,
              error: { code, message: 'declined', params: origin ? { origin } : undefined },
            });
          }
          return callUsb(sessionId, method, params);
        });

        const result = await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
          bundle: [
            { methodName: 'btcGetPublicKey', network: 'btc', path: "m/44'/0'/0'" },
            { methodName: 'solGetAddress', network: 'sol', path: solPath },
            { methodName: 'evmGetAddress', network: 'evm', path: "m/44'/60'/1'/0/0" },
          ],
        });

        if (continues) {
          expect(result.success).toBe(true);
          if (!result.success) return;
          expect(result.payload.map(item => item.success)).toEqual([true, false, true]);
          expect(result.payload[1].payload).toMatchObject({ code });
        } else {
          expect(result).toMatchObject({ success: false, payload: { code } });
        }
        expect(qrFake.requests).toHaveLength(0);
        await adapter.dispose();
      }
    );

    it('a named cancel leaves a UI request that belongs to another flow alone', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrRequests: QrDisplayData[] = [];
      // Deliberately never answers: the prompt has to stay pending.
      adapter.on(UI_REQUEST.REQUEST_QR_DISPLAY, event => {
        qrRequests.push(event.payload.data);
      });

      const connected = await connectOperation(adapter);

      // A cold start belongs to no operation, so the USB operation's cancel
      // has no claim on its QR prompt.
      const [coldStart, coldStartSettled] = track(adapter.importFromQr());
      await sleep(10);
      expect(qrRequests).toHaveLength(1);

      adapter.cancel(connected);
      await sleep(10);
      expect(coldStartSettled()).toBe(false);

      // Teardown still clears everything.
      adapter.cancel();
      expect((await coldStart).success).toBe(false);
    });

    // Every case is the device answering, so the session must survive and a retry reuses it.
    // PassphraseRejected is not in the legacy code list, so it proves recovery keys on `origin`;
    // the bare UserRejected has no origin and relies on that list. Status-word mapping itself is
    // tested in the connector package.
    it.each([
      [
        'PassphraseRejected from the device',
        HardwareErrorCode.PassphraseRejected,
        { origin: 'device' },
      ],
      ['firmware status 9', HardwareErrorCode.PinInvalid, { origin: 'device', statusCode: 9 }],
      [
        'firmware status 15',
        HardwareErrorCode.DeviceBusyInternal,
        { origin: 'device', statusCode: 15 },
      ],
      ['an on-device rejection without origin', HardwareErrorCode.UserRejected, undefined],
    ])('keeps the USB session after %s, so a retry reuses it', async (_name, code, errorParams) => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      const connected = await connectOperation(adapter);
      const attachesAfterConnect = usb.connectArgs.length;
      usb.failNextCall(code, errorParams);

      // Signing always reaches the device, unlike an address that could be served locally.
      const first = await adapter.evmSignTransaction(connected, FIXTURE_MFP, EVM_TX);
      expect(first.success).toBe(false);

      const retry = await adapter.evmSignTransaction(connected, FIXTURE_MFP, EVM_TX);
      expect(retry.success).toBe(true);
      expect(usb.connectArgs).toHaveLength(attachesAfterConnect);
      expect(qrFake.requests).toHaveLength(0);
    });

    // The request is on the wire and the device may be mid-operation, or it refused outright:
    // either way the channel was chosen before sending and QR must not re-ask.
    it.each([
      ['an in-flight USB call fails', HardwareErrorCode.DeviceNotFound],
      ['the device itself rejected', HardwareErrorCode.UserRejected],
    ])('does NOT fall back to QR when %s', async (_name, failCallWith) => {
      const usb = fakeUsbConnector({ failCallWith, failOnUrType: 'eth-sign-request' });
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      await connectUsbDevice(adapter);
      const qrBefore = qrFake.requests.length;

      const signed = await adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX);

      expect(signed.success).toBe(false);
      expect(qrFake.requests).toHaveLength(qrBefore);
    });

    it('re-attaches USB by itself while the wallet record remains known', async () => {
      // Simulates a lost USB session while the public wallet record remains in
      // adapter memory. A real process restart needs host-side snapshot
      // hydration before it can reach this re-attach path.
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      const imported = await importQrWallet(adapter);
      const qrRoundTripsAfterImport = qrFake.requests.length;

      const signed = await adapter.evmSignTransaction(
        imported.connectId,
        imported.deviceId,
        EVM_TX
      );

      expect(signed.success).toBe(true);
      // Went over USB, no further QR prompts than the import already needed.
      expect(qrFake.requests).toHaveLength(qrRoundTripsAfterImport);
      expect(usb.connectArgs).toEqual([FIXTURE_MFP]);
    });

    it('falls back to QR without surfacing an error when USB cannot attach', async () => {
      // The wrong Keystone is on the bus. Per the fail-closed identity rule the USB attach is
      // rejected, but the user must still just get the QR, not an error dialog with a retry button.
      const usb = fakeUsbConnector({ mfpHex: '11223344' });
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      const imported = await importQrWallet(adapter);
      const qrRoundTripsAfterImport = qrFake.requests.length;

      const signed = await adapter.evmSignTransaction(
        imported.connectId,
        imported.deviceId,
        EVM_TX
      );

      expect(signed.success).toBe(true);
      // The signature came over QR instead.
      expect(qrFake.requests.length).toBeGreaterThan(qrRoundTripsAfterImport);
    });

    it.each<
      [string, (adapter: KeystoneAdapter, wallet: DeviceInfo) => Promise<{ success: boolean }>]
    >([
      ['a signing call', (a, w) => a.evmSignTransaction(w.connectId, w.deviceId, EVM_TX)],
      ['an address fetch', (a, w) => a.evmGetAddress(w.connectId, w.deviceId, { path: EVM_PATH })],
    ])('re-probes USB before %s and switches back once the device appears', async (_name, call) => {
      const usb = fakeUsbConnector();
      usb.setAvailable(false);
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      const wallet = await importQrWallet(adapter);
      const qrRequestsAfterImport = qrFake.requests.length;

      expect((await call(adapter, wallet)).success).toBe(true);
      expect(usb.searchCalls).toHaveLength(1);
      expect(usb.connectArgs).toHaveLength(0);
      // USB absent: served over QR (nothing was retained).
      expect(qrFake.requests).toHaveLength(qrRequestsAfterImport + 1);

      usb.setAvailable(true);
      expect((await call(adapter, wallet)).success).toBe(true);
      expect(usb.searchCalls).toHaveLength(2);
      expect(usb.connectArgs).toEqual([FIXTURE_MFP]);
      // USB back: served over USB, no further QR request.
      expect(qrFake.requests).toHaveLength(qrRequestsAfterImport + 1);
    });

    it('waits for a briefly re-enumerating USB device before falling back to QR', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      const imported = await importQrWallet(adapter);
      const connected = await connectOperation(adapter);
      await adapter.releaseOperation(connected);
      usb.searchCalls.length = 0;
      usb.connectArgs.length = 0;
      usb.setAvailable(false);
      usb.setAvailableAfterSearchCount(2);
      const qrRequestsAfterImport = qrFake.requests.length;

      const signed = await adapter.evmSignTransaction(
        imported.connectId,
        imported.deviceId,
        EVM_TX
      );

      expect(signed.success).toBe(true);
      expect(usb.searchCalls).toHaveLength(2);
      expect(usb.connectArgs).toEqual([FIXTURE_MFP]);
      expect(qrFake.requests).toHaveLength(qrRequestsAfterImport);
    });

    it.each([
      ['operation', 'transport'],
      ['forced', 'transport'],
      ['auto', 'transport'],
      ['operation', 'device'],
      ['forced', 'device'],
      ['auto', 'device'],
    ] as const)(
      'preserves USB ownership for a %s route with a %s size failure',
      async (route, origin) => {
        const usb = fakeUsbConnector();
        const adapter = newTestAdapter(usb.connector);
        const qrFake = attachFakeDevice(adapter);
        const connected = await connectOperation(adapter);
        if (route !== 'operation') await adapter.releaseOperation(connected);
        if (route === 'forced') await adapter.switchTransport('usb');
        const target = route === 'operation' ? connected : FIXTURE_WALLET;
        const askedQrFallback = answerQrFallback(adapter, true);
        usb.failUrType({
          urType: 'eth-sign-request',
          error: {
            code: HardwareErrorCode.PayloadTooLarge,
            message: 'USB size limit',
            params: { origin, recovery: { scope: 'transport' } },
          },
        });
        try {
          const signed = await adapter.evmSignTransaction(target, FIXTURE_MFP, EVM_TX);
          const shouldUseQr = route === 'auto' && origin === 'transport';
          expect(askedQrFallback).toHaveBeenCalledTimes(shouldUseQr ? 1 : 0);
          expect(signed.success).toBe(shouldUseQr);
          if (!signed.success) {
            expect(signed.payload.code).toBe(HardwareErrorCode.PayloadTooLarge);
            expect(signed.payload.recovery).toEqual({ scope: 'transport' });
            expect(signed.payload.params?.operationMayHaveCompleted).toBeUndefined();
          }
          expect(qrFake.requests).toHaveLength(shouldUseQr ? 1 : 0);
          expect(adapter.activeTransport).toBe('usb');

          const connectsAfterFailure = usb.connectArgs.length;
          usb.failUrType(undefined);
          // A later user request can still use the same operation and USB session.
          const retry = await adapter.evmSignTransaction(target, FIXTURE_MFP, EVM_TX);
          expect(retry.success).toBe(true);
          expect(usb.connectArgs).toHaveLength(connectsAfterFailure);
          expect(qrFake.requests).toHaveLength(shouldUseQr ? 1 : 0);
        } finally {
          await adapter.dispose();
        }
      }
    );

    it('fails as a user cancel without a QR when the user declines the QR for an oversized request', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      await adapter.releaseOperation(await connectOperation(adapter));
      const askedQrFallback = answerQrFallback(adapter, false);
      usb.failUrType({
        urType: 'eth-sign-request',
        error: {
          code: HardwareErrorCode.PayloadTooLarge,
          message: 'USB size limit',
          params: { origin: 'transport' },
        },
      });
      try {
        const signed = await adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX);

        expect(askedQrFallback).toHaveBeenCalledTimes(1);
        expect(askedQrFallback).toHaveBeenCalledWith(
          expect.objectContaining({ vendor: 'keystone' })
        );
        expect(signed).toMatchObject({
          success: false,
          payload: { code: HardwareErrorCode.UserAborted },
        });
        expect(qrFake.requests).toHaveLength(0);
      } finally {
        await adapter.dispose();
      }
    });

    it('asks once per USB bundle before showing its oversized items as QR codes', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      await adapter.releaseOperation(await connectOperation(adapter));
      const askedQrFallback = answerQrFallback(adapter, true);
      usb.failUrType({
        urType: 'qr-hardware-call',
        error: {
          code: HardwareErrorCode.PayloadTooLarge,
          message: 'USB size limit',
          params: { origin: 'transport' },
        },
      });
      try {
        const result = await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
          bundle: [
            { methodName: 'evmGetAddress', network: 'evm', path: "m/44'/60'/0'/0/0" },
            { methodName: 'evmGetAddress', network: 'evm', path: "m/44'/60'/1'/0/0" },
          ],
        });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.payload.map(item => item.success)).toEqual([true, true]);
        expect(askedQrFallback).toHaveBeenCalledTimes(1);
        expect(qrFake.requests).toHaveLength(2);
      } finally {
        await adapter.dispose();
      }
    });

    it('keeps the USB session and warns of a possible signature when the signed reply is unreadable', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      const connected = await connectOperation(adapter);
      await adapter.releaseOperation(connected);
      usb.failUrType({
        urType: 'eth-sign-request',
        error: {
          code: HardwareErrorCode.PayloadTooLarge,
          message: 'Keystone USB returned an incomplete BC-UR response',
          params: { origin: 'device', replyUnreadable: true },
        },
      });
      try {
        const signed = await adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX);
        expect(signed.success).toBe(false);
        if (signed.success) return;
        expect(signed.payload.params?.operationMayHaveCompleted).toBe(true);
        expect(signed.payload.recovery).toEqual({ scope: 'unknown' });
        // Not a lost link: no QR detour and no re-claim of another USB device.
        expect(qrFake.requests).toHaveLength(0);

        const connectsAfterFailure = usb.connectArgs.length;
        usb.failUrType(undefined);
        const retry = await adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX);
        expect(retry.success).toBe(true);
        expect(usb.connectArgs).toHaveLength(connectsAfterFailure);
      } finally {
        await adapter.dispose();
      }
    });

    it('reports two USB devices claiming the wallet instead of falling back to QR', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      const imported = await connectOperation(adapter, connectQrDevice);
      await adapter.releaseOperation(imported);
      const qrRequestsAfterImport = qrFake.requests.length;
      jest.spyOn(usb.connector, 'connect').mockRejectedValue(
        Object.assign(new Error('More than one connected Keystone reports this wallet'), {
          code: HardwareErrorCode.DeviceOneDeviceOnly,
        })
      );

      const result = await adapter.evmGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
        path: "m/44'/60'/1'/0/0",
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceOneDeviceOnly },
      });
      expect(qrFake.requests).toHaveLength(qrRequestsAfterImport);
      await adapter.dispose();
    });

    it('announces the switch to QR when a failed USB session is dropped', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      attachFakeDevice(adapter);
      const connected = await connectOperation(adapter);
      await adapter.releaseOperation(connected);
      const changes: string[] = [];
      adapter.on(DEVICE.CHANGED, event => changes.push(event.payload.connectionType));
      usb.failUrType({
        urType: 'eth-sign-request',
        error: {
          code: HardwareErrorCode.TransportError,
          message: 'USB transfer failed',
          params: { origin: 'transport' },
        },
      });

      await adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX);

      expect(changes).toContain('qr');
      await adapter.dispose();
    });
  });

  describe('generic searchDevices → connectDevice flow', () => {
    it('rejects a different Keystone when connectId commits to a wallet mfp', async () => {
      const usb = fakeUsbConnector({ root: OTHER_ROOT });
      const adapter = newTestAdapter(usb.connector);

      const connected = await adapter.connectDevice(FIXTURE_WALLET);

      expect(connected.success).toBe(false);
      expect(usb.connectArgs).toEqual([FIXTURE_MFP]);
      expect(usb.calls).toHaveLength(0);
    });

    it('rejects non-mfp identifiers without opening USB or starting QR', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      const legacyWalletId = 'ab'.repeat(32);
      for (const identifier of [
        legacyWalletId,
        `keystone-wallet:${legacyWalletId}`,
        `keystone-qr:${FIXTURE_MFP}`,
      ]) {
        const connected = await adapter.connectDevice(identifier);
        expect(connected.success).toBe(false);
        if (!connected.success) {
          expect(connected.payload.code).toBe(HardwareErrorCode.DeviceNotFound);
        }
      }
      const address = await adapter.evmGetAddress(null, legacyWalletId, { path: EVM_PATH });
      expect(address).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceNotFound },
      });
      expect(usb.connectArgs).toHaveLength(0);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('rejects a connectId and deviceId that name different wallets', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      const address = await adapter.evmGetAddress(FIXTURE_WALLET, mfpOf(OTHER_ROOT), {
        path: EVM_PATH,
      });

      expect(address).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceMismatch },
      });
      expect(usb.connectArgs).toHaveLength(0);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('returns a QR connection target without operation, then connectDevice completes one sync', async () => {
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
        kind: 'operation',
        vendor: 'keystone',
      });
      expect(fake.requests).toHaveLength(1);

      const info = await adapter.getDeviceInfo(connected.payload, '');
      expect(info.success).toBe(true);
      if (!info.success) return;
      expect(info.payload.deviceId).toBe(FIXTURE_MFP);
    });

    it('lists a QR target without operation and connectDevice binds its wallet', async () => {
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
      expect(info.payload.deviceId).toBe(FIXTURE_MFP);
      expect(fake.requests).toHaveLength(1);
    });

    it('cancelling one queued QR connect leaves the scan in progress on another target', async () => {
      const adapter = newTestAdapter();
      const displayed: QrDisplayData[] = [];
      adapter.on(UI_REQUEST.REQUEST_QR_DISPLAY, event => displayed.push(event.payload.data));

      const [first] = await adapter.searchDeviceTargets({ transportType: 'qr' });
      const [firstConnect, firstSettled] = track(adapter.connectDevice(first.searchTargetId));
      await nextImmediate();
      expect(displayed).toHaveLength(1);

      const [second] = await adapter.searchDeviceTargets({ transportType: 'qr' });
      const secondConnect = adapter.connectDevice(second.searchTargetId);
      await nextImmediate();
      adapter.cancel(second.searchTargetId);

      await expect(secondConnect).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
      expect(firstSettled()).toBe(false);

      const reply = deviceReply(displayed[0], { mfpHex: FIXTURE_MFP });
      if (!reply) throw new Error('no reply for the displayed request');
      adapter.uiResponse({ type: UI_RESPONSE.RECEIVE_QR_RESPONSE, payload: urJson(reply) });
      await expect(firstConnect).resolves.toMatchObject({ success: true });
      expect(displayed).toHaveLength(1);
      await adapter.dispose();
    });

    it('does not disconnect the replacement USB operation when the retired owner ends late', async () => {
      const usb = fakeUsbConnector({ incrementSessionIds: true });
      const disconnect = jest.spyOn(usb.connector, 'disconnect');
      const adapter = newTestAdapter(usb.connector);
      const targets = await adapter.searchDeviceTargets({ transportType: 'usb' });
      const first = await adapter.connectDevice(targets[0].searchTargetId);
      const second = await adapter.connectDevice(targets[0].searchTargetId);
      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      if (!first.success || !second.success) return;
      expect(disconnect).toHaveBeenCalledWith('keystone-usb-session:1');
      disconnect.mockClear();

      await adapter.releaseOperation(first.payload);

      expect(disconnect).not.toHaveBeenCalled();
      await expect(adapter.getDeviceInfo(second.payload, '')).resolves.toEqual({
        success: true,
        payload: expect.objectContaining({ connectId: FIXTURE_WALLET }),
      });

      await adapter.releaseOperation(second.payload);
      expect(disconnect).toHaveBeenCalledWith('keystone-usb-session:2');
    });

    it('cancels the active QR job without terminating its operation', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter);
      const targets = await adapter.searchDeviceTargets({ transportType: 'qr' });
      const connected = await adapter.connectDevice(targets[0].searchTargetId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;

      adapter.cancel(connected.payload);

      const info = await adapter.getDeviceInfo(connected.payload, '');
      expect(info.success).toBe(true);
      await adapter.releaseOperation(connected.payload);
    });

    it('defers public derivation until a business call uses the operation', async () => {
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);
      const targets = await adapter.searchDeviceTargets({ transportType: 'qr' });
      const solPath = "m/44'/501'/0'/0'";

      const connected = await adapter.connectDevice(targets[0].searchTargetId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      expect(fake.requests).toHaveLength(1);

      const address = await adapter.solGetAddress(connected.payload, FIXTURE_MFP, {
        path: solPath,
        operationId: connected.payload,
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
      const adapter = newTestAdapter(usb.connector);
      attachFakeDevice(adapter);
      await adapter.importFromQr();
      const enumerationError = Object.assign(new Error('WebUSB enumeration failed'), {
        code: HardwareErrorCode.DevicePermissionDenied,
      });
      jest.spyOn(usb.connector, 'searchDevices').mockRejectedValue(enumerationError);

      await expect(adapter.searchDevices()).resolves.toEqual([
        expect.objectContaining({ deviceId: FIXTURE_MFP, connectionType: 'qr' }),
      ]);
      await expect(adapter.searchDevices({ transportType: 'usb' })).rejects.toBe(enumerationError);
    });
  });

  describe('USB channel', () => {
    it('cancels USB first contact during connect and drains late completion before reuse', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ usbConnector: usb.connector });
      const [target] = await adapter.searchDeviceTargets({ transportType: 'usb' });
      const { promise: wait, resolve: resume } = deferred();
      const originalConnect = usb.connector.connect.bind(usb.connector);
      const connect = jest.spyOn(usb.connector, 'connect').mockImplementation(async (...args) => {
        await wait;
        return originalConnect(...args);
      });
      const call = jest.spyOn(usb.connector, 'call');
      const disconnect = jest.spyOn(usb.connector, 'disconnect');
      const events: HardwareEvent[] = [];
      adapter.on('device-connect', event => events.push(event));
      const pending = adapter.connectDevice(target.searchTargetId);
      await nextImmediate();
      expect(connect).toHaveBeenCalledTimes(1);
      adapter.cancel(target.searchTargetId);
      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
      await expect(adapter.connectDevice(target.searchTargetId)).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceBusyInternal },
      });
      expect(connect).toHaveBeenCalledTimes(1);
      resume();
      await nextImmediate();
      expect(disconnect).toHaveBeenCalledWith('keystone-usb-session:1');
      expect(events).toHaveLength(0);
      expect(call).not.toHaveBeenCalled();
      await expect(adapter.connectDevice(target.searchTargetId)).resolves.toMatchObject({
        success: true,
      });
      expect(events).toHaveLength(1);
      await adapter.dispose();
    });

    it('does not reopen the device for a reconnect while a cancelled call is still on the wire', async () => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ usbConnector: usb.connector });
      const [target] = await adapter.searchDeviceTargets({ transportType: 'usb' });
      const connected = await adapter.connectDevice(target.searchTargetId);
      if (!connected.success) throw new Error('connectDevice failed');
      const { promise: wait, resolve: resume } = deferred();
      const originalCall = usb.connector.call.bind(usb.connector);
      jest.spyOn(usb.connector, 'call').mockImplementationOnce(async (...args) => {
        await wait;
        return originalCall(...args);
      });
      const connect = jest.spyOn(usb.connector, 'connect');

      const pending = adapter.evmGetAddress(connected.payload, '', {
        path: EVM_PATH,
        operationId: connected.payload,
      });
      await nextImmediate();
      adapter.cancel(connected.payload);
      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });

      await expect(adapter.connectDevice(target.searchTargetId)).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceBusyInternal },
      });
      expect(connect).not.toHaveBeenCalled();

      resume();
      await nextImmediate();
      await expect(adapter.connectDevice(target.searchTargetId)).resolves.toMatchObject({
        success: true,
      });
      expect(connect).toHaveBeenCalledTimes(1);
      await adapter.dispose();
    });

    it.each([
      ['a search reset', false],
      ['a search reset', true],
      ['releaseOperation()', false],
      ['releaseOperation()', true],
    ] as const)('%s retires the USB session (QR-known wallet: %s)', async (trigger, qrKnown) => {
      const usb = fakeUsbConnector();
      const disconnect = jest.spyOn(usb.connector, 'disconnect');
      const adapter = newTestAdapter(usb.connector);
      const disconnects: HardwareEvent[] = [];
      adapter.on('device-disconnect', e => disconnects.push(e));
      if (qrKnown) {
        attachFakeDevice(adapter);
        await importQrWallet(adapter);
      }
      const connected = await connectOperation(adapter);

      if (trigger === 'releaseOperation()') await adapter.releaseOperation(connected);
      else await adapter.searchDevices({ transportType: 'usb', resetSession: true });

      expect(disconnect).toHaveBeenCalledWith('keystone-usb-session:1');
      const info = await adapter.getDeviceInfo(FIXTURE_WALLET, FIXTURE_MFP);
      const own = (await adapter.searchDevices()).find(d => d.deviceId === FIXTURE_MFP);
      if (qrKnown) {
        // Demoted back to QR-only, keeping the entry.
        expect(info).toEqual({
          success: true,
          payload: expect.objectContaining({ deviceId: FIXTURE_MFP, connectionType: 'qr' }),
        });
        expect(own?.connectionType).toBe('qr');
      } else {
        // Never QR-synced: dropped outright.
        expect(info).toMatchObject({
          success: false,
          payload: { code: HardwareErrorCode.DeviceNotFound },
        });
        expect(disconnects).toHaveLength(1);
        expect(own).toBeUndefined();
      }
    });

    it('returns only physical USB targets during explicit USB discovery', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
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
      });
    });

    it('keeps an explicit QR operation on QR when the wallet also has a live USB session', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      await connectUsbDevice(adapter);
      const usbCallsBeforeQrConnect = usb.calls.length;

      const qrConnected = await connectOperation(adapter, connectQrDevice);
      const qrRequestsAfterConnect = qrFake.requests.length;

      const result = await adapter.btcGetPublicKey(qrConnected, FIXTURE_MFP, {
        path: "m/84'/0'/0'",
        operationId: qrConnected,
      });

      expect(result.success).toBe(true);
      expect(usb.calls).toHaveLength(usbCallsBeforeQrConnect);
      expect(qrFake.requests).toHaveLength(qrRequestsAfterConnect + 1);

      await adapter.releaseOperation(qrConnected);
      expect(usb.connectArgs).toHaveLength(1);
    });

    it('keeps an all-network bundle on QR when the operation was routed to QR', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      const qrConnected = await connectOperation(adapter, connectQrDevice);
      const qrRequestsAfterConnect = qrFake.requests.length;
      const usbConnectsAfterConnect = usb.connectArgs.length;

      const result = await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
        operationId: qrConnected,
        bundle: [
          { methodName: 'btcGetPublicKey', network: 'btc', path: "m/84'/0'/0'" },
          { methodName: 'evmGetAddress', network: 'evm', path: EVM_PATH },
        ],
      });

      expect(result.success).toBe(true);
      expect(usb.connectArgs).toHaveLength(usbConnectsAfterConnect);
      expect(usb.calls).toHaveLength(0);
      expect(qrFake.requests).toHaveLength(qrRequestsAfterConnect + 1);
    });

    it("keeps a QR-routed all-network bundle on QR after switchTransport('usb')", async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      const qrConnected = await connectOperation(adapter, connectQrDevice);
      await adapter.switchTransport('usb');
      const qrRequestsBefore = qrFake.requests.length;

      const result = await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
        operationId: qrConnected,
        bundle: [{ methodName: 'evmGetAddress', network: 'evm', path: EVM_PATH }],
      });

      expect(result.success).toBe(true);
      expect(usb.calls).toHaveLength(0);
      expect(qrFake.requests).toHaveLength(qrRequestsBefore + 1);
    });

    it('restores USB from a persisted wallet identity before a cold account sync', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      const path = "m/84'/0'/0'";

      const result = await adapter.btcGetPublicKey(FIXTURE_WALLET, FIXTURE_MFP, { path });

      expect(result.success).toBe(true);
      expect(usb.connectArgs).toEqual([FIXTURE_MFP]);
      expect(qrFake.requests).toHaveLength(0);
      expect(usb.calls).toHaveLength(1);
      expect(requestedPathsOfUr((usb.calls[0].params as { urData: string }).urData)).toEqual([
        path,
      ]);
    });

    it('falls back to QR and rechecks USB on the next operation after a wallet mismatch', async () => {
      const usb = fakeUsbConnector({ root: OTHER_ROOT });
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      const first = await adapter.btcGetPublicKey(FIXTURE_WALLET, FIXTURE_MFP, {
        path: "m/84'/0'/0'",
      });
      // Second operation on a path the first sync did not cover (BTC is
      // account-0 only, so use an EVM account-1 path to force a new sync).
      const second = await adapter.evmGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
        path: "m/44'/60'/1'/0/0",
      });

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(usb.connectArgs).toHaveLength(2);
      expect(qrFake.requests).toHaveLength(2);
    });

    it.each([
      ['one attached device', {}],
      [
        'several attached devices',
        { incrementSessionIds: true, searchRoots: [OTHER_ROOT, FIXTURE_ROOT] },
      ],
    ])(
      'restores USB from a persisted mfp before a cold sign call, with %s, by connecting straight to it',
      async (_name, options) => {
        const usb = fakeUsbConnector(options);
        const adapter = newTestAdapter(usb.connector);
        const qrFake = attachFakeDevice(adapter);

        const result = await adapter.evmSignTransaction(FIXTURE_WALLET, FIXTURE_MFP, EVM_TX);

        expect(result.success).toBe(true);
        expect(usb.connectArgs).toEqual([FIXTURE_MFP]);
        expect(usb.calls.map(call => call.sessionId)).toEqual(['keystone-usb-session:1']);
        expect(usb.calls.map(call => (call.params as { urType: string }).urType)).toEqual([
          'eth-sign-request',
        ]);
        expect(qrFake.requests).toHaveLength(0);
      }
    );

    it('connectDevice() opens a new USB-only device entry', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);

      await connectOperation(adapter);
      expect(usb.connectArgs).toEqual([usb.searchTargetIds.at(-1)]);

      const devices = await adapter.searchDevices();
      const own = devices.find(d => d.deviceId === FIXTURE_MFP);
      expect(own).toBeDefined();
      expect(own?.connectionType).toBe('usb');
    });

    it('connectDevice() takes the USB-reported mfp and defers USB derivation', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);

      const targets = await adapter.searchDeviceTargets({ transportType: 'usb' });
      const connected = await adapter.connectDevice(targets[0].searchTargetId);
      expect(connected.success).toBe(true);
      if (!connected.success) return;
      expect(usb.calls).toHaveLength(0);

      const publicKey = await adapter.btcGetPublicKey(connected.payload, FIXTURE_MFP, {
        path: "m/84'/0'/0'",
        operationId: connected.payload,
      });
      expect(publicKey.success).toBe(true);
      expect(usb.calls).toHaveLength(1);
      expect(requestedPathsOfUr((usb.calls[0].params as { urData: string }).urData)).toEqual([
        "m/84'/0'/0'",
      ]);
    });

    it('merges a USB connect into an existing QR-synced wallet — device-changed, not a second device-connect', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      const events: HardwareEvent[] = [];
      adapter.on('device-connect', e => events.push(e));
      adapter.on('device-changed', e => events.push(e));

      await importQrWallet(adapter);

      await connectOperation(adapter);

      expect(events.map(e => e.type)).toEqual(['device-connect', 'device-changed']);

      const devices = await adapter.searchDevices();
      // Merged, not duplicated, still exactly one row for this wallet mfp.
      expect(devices.filter(d => d.deviceId === FIXTURE_MFP)).toHaveLength(1);
      expect(devices[0].connectionType).toBe('usb');
      expect(qrFake.requests).toHaveLength(1); // only the original QR import, no USB-side QR requests
    });

    it('routes a sign call over USB once the wallet has a live USB session, not QR', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      await connectUsbDevice(adapter);

      const result = await adapter.evmSignTransaction(null, FIXTURE_MFP, EVM_TX);

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload.r).toMatch(/^0x[0-9a-f]{64}$/);
      // Connect takes the mfp from the USB session, so the sign request is the
      // only USB call. QR never fires.
      expect(usb.calls.map(c => (c.params as { urType: string }).urType)).toEqual([
        'eth-sign-request',
      ]);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('does not replay a USB signing request after an ambiguous transport failure', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      await connectUsbDevice(adapter);
      usb.failNextCall(HardwareErrorCode.DeviceDisconnected);

      const result = await adapter.evmSignTransaction(null, FIXTURE_MFP, EVM_TX);

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.DeviceDisconnected,
          recovery: { scope: 'unknown' },
          params: { operationMayHaveCompleted: true, method: 'evmSignTransaction' },
        },
      });
      expect(usb.calls).toHaveLength(1);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('routes an implicit default-account sync over USB after connect', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      await connectUsbDevice(adapter);

      const result = await adapter.btcGetPublicKey(null, FIXTURE_MFP, { path: "m/84'/0'/0'" });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(usb.calls.map(c => (c.params as { urType: string }).urType)).toEqual([
        'qr-hardware-call',
      ]);
      expect(qrFake.requests).toHaveLength(0);
    });

    it('does not reconnect, retry or open QR after an account export loses USB', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);

      await connectOperation(adapter);
      usb.failNextCall(HardwareErrorCode.DeviceNotFound);

      const result = await adapter.btcGetPublicKey(null, FIXTURE_MFP, { path: "m/84'/0'/0'" });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceNotFound },
      });
      expect(usb.connectArgs).toHaveLength(1);
      expect(usb.calls).toHaveLength(1);
      expect(qrFake.requests).toHaveLength(0);
    });

    it("switchTransport('qr') pins a USB-merged wallet back to QR", async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter, { deviceVersion: '3.1.4' });

      await connectUsbDevice(adapter);
      await adapter.switchTransport('qr');

      expect(
        await adapter.evmGetAddress(FIXTURE_WALLET, FIXTURE_MFP, { path: EVM_PATH })
      ).toMatchObject({ success: true });
      const result = await adapter.evmSignTransaction(null, FIXTURE_MFP, EVM_TX);

      expect(result.success).toBe(true);
      // Connect sent nothing over USB. The explicit pin sends the sign request
      // through QR.
      expect(usb.calls).toHaveLength(0);
      expect(qrFake.requests.map(r => r.data.urType)).toEqual([
        'qr-hardware-call',
        'eth-sign-request',
      ]);
      usb.emitDisconnect();
      expect(await adapter.getDeviceInfo(FIXTURE_WALLET, FIXTURE_MFP)).toMatchObject({
        success: true,
        payload: { connectionType: 'qr', firmwareVersion: '3.1.4' },
      });
    });

    it("switchTransport('usb') preserves an availability scan error", async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      attachFakeDevice(adapter);
      await importQrWallet(adapter);
      await adapter.switchTransport('usb');
      const enumerationError = Object.assign(new Error('WebUSB permission was revoked'), {
        code: HardwareErrorCode.DevicePermissionDenied,
      });
      jest.spyOn(usb.connector, 'searchDevices').mockRejectedValue(enumerationError);

      const result = await adapter.btcGetPublicKey(null, FIXTURE_MFP, { path: "m/84'/0'/0'" });

      expect(result).toMatchObject({
        success: false,
        payload: {
          code: HardwareErrorCode.DevicePermissionDenied,
          error: 'WebUSB permission was revoked',
        },
      });
    });

    it('demotes immediately on physical USB disconnect and falls back to QR on the next call', async () => {
      const usb = fakeUsbConnector({ failReconnect: true });
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      const changedEvents: HardwareEvent[] = [];
      adapter.on('device-changed', event => changedEvents.push(event));

      await importQrWallet(adapter);
      await connectUsbDevice(adapter);
      const qrRequestsBeforeDisconnect = qrFake.requests.length;

      usb.emitDisconnect();

      const result = await adapter.evmSignTransaction(null, FIXTURE_MFP, EVM_TX);
      expect(result.success).toBe(true);
      expect(changedEvents).toHaveLength(2);
      expect(usb.connectArgs).toEqual([usb.searchTargetIds[0], FIXTURE_MFP]);
      expect(qrFake.requests).toHaveLength(qrRequestsBeforeDisconnect + 1);
      expect(qrFake.requests.at(-1)?.data.urType).toBe('eth-sign-request');
    });

    it.each([
      ['evmGetAddress', "m/44'/60'/0'/0h/0"],
      ['evmGetAddress', "m/44'/60'/0'/0/0abc"],
      ['evmGetAddress', "m/44'/60'/0'/0/-1"],
      ['btcGetAddress', "m/84'/0'/0'/0H/0"],
      ['tronGetAddress', "m/44'/195'/0'/0/0'"],
      ['solGetAddress', "m/44'/501'/0'/0"],
      ['solGetAddress', "m/44'/501'/0h/0'"],
    ] as const)('refuses %s for a malformed leaf path %s', async (method, path) => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      attachFakeDevice(adapter);
      const connected = await connectOperation(adapter);

      const result = await adapter[method](connected, FIXTURE_MFP, { path });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.InvalidParams },
      });
      await adapter.dispose();
    });

    it('fails a non-BTC network item instead of labelling a mainnet key', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter);

      const result = await adapter.allNetworkGetAddress('', FIXTURE_MFP, {
        bundle: [
          { methodName: 'btcGetPublicKey', network: 'ltc', path: "m/84'/0'/0'" },
          { methodName: 'btcGetPublicKey', network: 'btc', path: "m/84'/0'/0'" },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload[0]).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.ChainNotSupported },
      });
      expect(result.payload[1].success).toBe(true);
    });

    it('asks the device once per USB bundle item and keeps nothing between items', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      attachFakeDevice(adapter);
      const connected = await connectOperation(adapter);
      const paths = [EVM_PATH, "m/44'/60'/0'/0/1"];
      const singles = [];
      for (const path of paths) {
        // eslint-disable-next-line no-await-in-loop
        singles.push(await adapter.evmGetAddress(connected, FIXTURE_MFP, { path }));
      }
      usb.calls.length = 0;

      const result = await adapter.allNetworkGetAddress(connected, FIXTURE_MFP, {
        bundle: paths.map(path => ({ methodName: 'evmGetAddress' as const, network: 'evm', path })),
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      // Same account path, yet each item asked the device itself.
      expect(usb.calls).toHaveLength(2);
      expect(result.payload.map(item => item.payload?.address)).toEqual(
        singles.map(single => (single.success ? single.payload.address : undefined))
      );
      await adapter.dispose();
    });

    it('scans once and leaves a mistyped bundle item out of the QR request', async () => {
      const adapter = newTestAdapter();
      const qrFake = attachFakeDevice(adapter);

      const result = await adapter.allNetworkGetAddress('', FIXTURE_MFP, {
        bundle: [
          { methodName: 'evmGetAddress', network: 'evm', path: "m/44'/501'/0'/0/0" },
          { methodName: 'solGetAddress', network: 'sol', path: "m/44'/501'/0'/0'" },
        ],
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.payload[0]).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.InvalidParams },
      });
      expect(result.payload[1].success).toBe(true);
      expect(qrFake.requests).toHaveLength(1);
      expect(requestedPathsOf(qrFake.requests[0])).toEqual(["m/44'/501'/0'/0'"]);
    });

    it('refuses a positional wallet that differs from the operation wallet', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter, { root: OTHER_ROOT, mfpHex: mfpOf(OTHER_ROOT) });
      const otherWallet = await connectOperation(adapter, connectQrDevice);

      const result = await adapter.evmGetAddress(FIXTURE_WALLET, null, {
        path: EVM_PATH,
        operationId: otherWallet,
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.InvalidParams },
      });
    });

    it('checks a wallet named only on the bundle items', async () => {
      const adapter = newTestAdapter();
      attachFakeDevice(adapter, { root: OTHER_ROOT, mfpHex: mfpOf(OTHER_ROOT) });

      const result = await adapter.allNetworkGetAddress('', '', {
        bundle: [
          {
            methodName: 'evmGetAddress',
            network: 'evm',
            path: EVM_PATH,
            deviceId: FIXTURE_MFP,
          },
        ],
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceMismatch },
      });
    });

    it('refuses a bundle whose items name different wallets', async () => {
      const adapter = newTestAdapter();
      const qrFake = attachFakeDevice(adapter);

      const result = await adapter.allNetworkGetAddress('', FIXTURE_MFP, {
        bundle: [
          {
            methodName: 'evmGetAddress',
            network: 'evm',
            path: EVM_PATH,
            deviceId: mfpOf(OTHER_ROOT),
          },
        ],
      });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.InvalidParams },
      });
      expect(qrFake.requests).toHaveLength(0);
    });

    describe('QR key request size', () => {
      const ledgerLiveEvm = (count: number) =>
        Array.from({ length: count }, (_, index) => ({
          methodName: 'evmGetAddress' as const,
          network: 'evm' as const,
          path: `m/44'/60'/${index}'/0/0`,
        }));

      it('refuses a QR bundle needing more account paths than Keystone accepts, before asking', async () => {
        const adapter = newTestAdapter();
        const qrFake = attachFakeDevice(adapter);

        const result = await adapter.allNetworkGetAddress(null as unknown as string, '', {
          bundle: ledgerLiveEvm(25),
        });

        expect(result).toMatchObject({
          success: false,
          payload: {
            code: HardwareErrorCode.QrRequestTooLarge,
            params: { limit: 24, requested: 25 },
          },
        });
        expect(qrFake.requests).toHaveLength(0);
      });

      it('asks once for a QR bundle right at the limit', async () => {
        const adapter = newTestAdapter();
        const qrFake = attachFakeDevice(adapter);

        const result = await adapter.allNetworkGetAddress(null as unknown as string, '', {
          bundle: ledgerLiveEvm(24),
        });

        expect(result.success).toBe(true);
        expect(qrFake.requests).toHaveLength(1);
        expect(requestedPathsOf(qrFake.requests[0])).toHaveLength(24);
      });

      it('leaves the same bundle alone over USB, which asks per key', async () => {
        const usb = fakeUsbConnector();
        const adapter = newTestAdapter(usb.connector);
        const qrFake = attachFakeDevice(adapter);
        await adapter.releaseOperation(await connectOperation(adapter));
        try {
          const result = await adapter.allNetworkGetAddress(FIXTURE_WALLET, FIXTURE_MFP, {
            bundle: ledgerLiveEvm(25),
          });

          expect(result.success).toBe(true);
          if (!result.success) return;
          expect(result.payload.every(item => item.success)).toBe(true);
          expect(qrFake.requests).toHaveLength(0);
        } finally {
          await adapter.dispose();
        }
      });

      it('counts addresses under one account path once', async () => {
        const adapter = newTestAdapter();
        const qrFake = attachFakeDevice(adapter);

        const result = await adapter.allNetworkGetAddress(null as unknown as string, '', {
          bundle: Array.from({ length: 30 }, (_, index) => ({
            methodName: 'evmGetAddress' as const,
            network: 'evm' as const,
            path: `m/44'/60'/0'/0/${index}`,
          })),
        });

        expect(result.success).toBe(true);
        expect(requestedPathsOf(qrFake.requests[0])).toEqual(["m/44'/60'/0'"]);
      });
    });

    it('keeps a SOL key apart from another chain exported at the same path in a USB bundle', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      attachFakeDevice(adapter);
      const connected = await connectOperation(adapter);
      const solPath = "m/44'/501'/0'";
      const single = await adapter.solGetAddress(connected, FIXTURE_MFP, { path: solPath });
      expect(single.success).toBe(true);
      if (!single.success) return;

      for (const bundle of [
        [
          { methodName: 'solGetAddress' as const, network: 'sol', path: solPath },
          { methodName: 'evmGetAddress' as const, network: 'evm', path: `${solPath}/0/0` },
        ],
        [
          { methodName: 'evmGetAddress' as const, network: 'evm', path: `${solPath}/0/0` },
          { methodName: 'solGetAddress' as const, network: 'sol', path: solPath },
        ],
      ]) {
        // eslint-disable-next-line no-await-in-loop
        const result = await adapter.allNetworkGetAddress(connected, FIXTURE_MFP, { bundle });
        expect(result.success).toBe(true);
        if (!result.success) return;
        const solItem = result.payload.find(item => item.methodName === 'solGetAddress');
        expect(solItem).toMatchObject({
          success: true,
          payload: { address: single.payload.address },
        });
      }
      await adapter.dispose();
    });

    it("reattaches USB for a signing call pinned with switchTransport('usb') after a disconnect", async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      await loseUsbSession(adapter, usb);
      await adapter.switchTransport('usb');
      usb.connectArgs.length = 0;
      const qrRequestsBeforeSign = qrFake.requests.length;

      const result = await adapter.evmSignTransaction(null, FIXTURE_MFP, EVM_TX);

      expect(result.success).toBe(true);
      expect(usb.connectArgs).toEqual([FIXTURE_MFP]);
      expect(qrFake.requests).toHaveLength(qrRequestsBeforeSign);
      await adapter.dispose();
    });

    it('probes USB once for a pinned address call while the device is unplugged', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      attachFakeDevice(adapter);
      await loseUsbSession(adapter, usb);
      await adapter.switchTransport('usb');
      usb.setAvailable(false);
      usb.searchCalls.length = 0;

      const result = await adapter.evmGetAddress(null, FIXTURE_MFP, { path: "m/44'/60'/0'/0/1" });

      expect(result).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.TransportNotAvailable },
      });
      // One re-enumeration wait, not one per layer.
      expect(usb.searchCalls).toHaveLength(4);
      await adapter.dispose();
    });

    it('waits for re-enumeration once after a lost USB session, then probes once', async () => {
      const usb = fakeUsbConnector();
      const adapter = newTestAdapter(usb.connector);
      const qrFake = attachFakeDevice(adapter);
      await loseUsbSession(adapter, usb);
      usb.setAvailable(false);
      usb.searchCalls.length = 0;

      expect((await adapter.evmSignTransaction(null, FIXTURE_MFP, EVM_TX)).success).toBe(true);
      expect(usb.searchCalls).toHaveLength(4);
      expect((await adapter.evmSignTransaction(null, FIXTURE_MFP, EVM_TX)).success).toBe(true);
      expect(usb.searchCalls).toHaveLength(5);
      expect(qrFake.requests.slice(-2).map(r => r.data.urType)).toEqual([
        'eth-sign-request',
        'eth-sign-request',
      ]);
      await adapter.dispose();
    });
  });

  describe('implicit cold start', () => {
    it('answers a null-target allNetworkGetAddress bundle with exactly one QR scan', async () => {
      // QR onboarding without connectDevice: one scan yields identity and accounts, and
      // per-item calls must route to that wallet instead of re-syncing.
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const result = await adapter.allNetworkGetAddress(null as unknown as string, '', {
        bundle: [
          { methodName: 'btcGetPublicKey', network: 'btc', path: "m/86'/0'/0'" },
          { methodName: 'evmGetAddress', network: 'evm', path: EVM_PATH },
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
        ).toEqual({ vendor: 'keystone', type: 'walletId', value: FIXTURE_MFP });
      }
    });

    it('stops the bundle when cancel lands between two chains', async () => {
      // Between two per-chain jobs the queue is empty, so only the bundle scope can
      // carry the cancel.
      const adapter = newTestAdapter();
      const fake = attachFakeDevice(adapter);

      const queue = (adapter as unknown as { _jobQueue: DeviceJobQueue })._jobQueue;
      type EnqueueFn = (
        deviceId: string,
        job: (signal: AbortSignal) => Promise<unknown>,
        options?: unknown
      ) => Promise<unknown>;
      const realEnqueue = queue.enqueue.bind(queue) as EnqueueFn;
      let settledJobs = 0;
      let cancelled = false;
      (queue as unknown as { enqueue: EnqueueFn }).enqueue = async (deviceId, job, options) => {
        const result = await realEnqueue(deviceId, job, options);
        settledJobs += 1;
        // Job 1 is the bundle's QR scan, job 2 is the first chain.
        if (settledJobs === 2) {
          cancelled = true;
          expect(queue.getActiveJob()).toBeNull();
          adapter.cancel(FIXTURE_MFP);
        }
        return result;
      };

      const result = await adapter.allNetworkGetAddress(null as unknown as string, '', {
        bundle: [
          { methodName: 'evmGetAddress', network: 'evm', path: EVM_PATH },
          { methodName: 'solGetAddress', network: 'sol', path: "m/44'/501'/0'/0'" },
          { methodName: 'tronGetAddress', network: 'tron', path: "m/44'/195'/0'/0/0" },
        ],
      });

      expect(cancelled).toBe(true);
      // The cancelled chains neither reached the device nor came back from the
      // bundle's scan: the bundle ends, it does not quietly finish.
      expect(fake.requests).toHaveLength(1);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.payload.code).toBe(HardwareErrorCode.UserAborted);
      }
    });
  });
});

describe('Keystone operation transport ownership', () => {
  it.each(['usb', 'qr'] as const)(
    'USB disconnect ends only operations bound to USB (selected=%s)',
    async selected => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ usbConnector: usb.connector });
      const fake = attachFakeDevice(adapter);
      try {
        const usbOperation = await connectOperation(adapter);
        const connected =
          selected === 'qr' ? await connectOperation(adapter, connectQrDevice) : usbOperation;
        usb.emitDisconnect();
        const result = await adapter.evmGetAddress(connected, FIXTURE_MFP, {
          path: EVM_PATH,
          operationId: connected,
        });
        if (selected === 'usb') {
          expect(result).toMatchObject({
            success: false,
            payload: { code: HardwareErrorCode.OperationEnded },
          });
        } else {
          expect(result.success).toBe(true);
        }
      } finally {
        fake.detach();
        await adapter.dispose();
      }
    }
  );

  it.each([
    { method: 'btcGetPublicKey', path: "m/84'/0'/0'" },
    { method: 'evmGetAddress', path: "m/44'/60'/1'/0/0" },
    { method: 'solGetAddress', path: "m/44'/501'/0'/0'" },
    { method: 'tronGetAddress', path: "m/44'/195'/0'/0/0" },
  ] as const)(
    '$method verifies the QR wallet mfp even while an earlier USB session remains',
    async ({ method, path }) => {
      const usb = fakeUsbConnector();
      const adapter = new KeystoneAdapter({ usbConnector: usb.connector });
      const initial = attachFakeDevice(adapter);
      try {
        await connectUsbDevice(adapter);
        const connected = await connectOperation(adapter, connectQrDevice);
        initial.detach();
        // A different wallet answers the QR request with its own mfp.
        const wrongWallet = attachFakeDevice(adapter, {
          root: OTHER_ROOT,
          mfpHex: mfpOf(OTHER_ROOT),
        });
        try {
          const result = await adapter[method](connected, FIXTURE_MFP, {
            path,
            operationId: connected,
          });
          expect(result).toMatchObject({
            success: false,
            payload: { code: HardwareErrorCode.DeviceMismatch },
          });
          expect(requestedPathsOf(wrongWallet.requests[0])).toHaveLength(1);
        } finally {
          wrongWallet.detach();
        }
        const correctWallet = attachFakeDevice(adapter);
        try {
          // The positional operation id must carry the same route on retry.
          const retried = await adapter[method](connected, FIXTURE_MFP, { path });
          expect(retried.success).toBe(true);
          expect(requestedPathsOf(correctWallet.requests[0])).toHaveLength(1);
          expect(usb.calls).toHaveLength(0);
        } finally {
          correctWallet.detach();
        }
      } finally {
        initial.detach();
        await adapter.dispose();
      }
    }
  );
});

describe('Keystone automatic USB attach cancellation', () => {
  it.each(['enumerate', 'connect'] as const)(
    'stops after cancellation during %s and cleans up late results',
    async phase => {
      const usb = fakeUsbConnector({
        incrementSessionIds: true,
        searchRoots: [OTHER_ROOT, FIXTURE_ROOT],
      });
      const adapter = new KeystoneAdapter({ usbConnector: usb.connector });
      const { promise: wait, resolve: resume } = deferred();
      const originalSearch = usb.connector.searchDevices.bind(usb.connector);
      const originalConnect = usb.connector.connect.bind(usb.connector);
      jest.spyOn(usb.connector, 'searchDevices').mockImplementation(async (...args) => {
        if (phase === 'enumerate') await wait;
        return originalSearch(...args);
      });
      const connect = jest.spyOn(usb.connector, 'connect').mockImplementation(async (...args) => {
        if (phase === 'connect') await wait;
        return originalConnect(...args);
      });
      const call = jest.spyOn(usb.connector, 'call');
      const disconnect = jest.spyOn(usb.connector, 'disconnect');
      const connected = jest.fn();
      const qrDisplay = jest.fn();
      adapter.on('device-connect', connected);
      adapter.on(UI_REQUEST.REQUEST_QR_DISPLAY, qrDisplay);
      const [pending, settled] = track(adapter.evmGetAddress('', FIXTURE_MFP, { path: EVM_PATH }));
      try {
        await nextImmediate();
        adapter.cancel(FIXTURE_MFP);
        await nextImmediate();
        expect(settled()).toBe(true);
        await expect(pending).resolves.toMatchObject({
          success: false,
          payload: { code: HardwareErrorCode.UserAborted },
        });
        resume();
        await nextImmediate();
        expect(connect).toHaveBeenCalledTimes(phase === 'enumerate' ? 0 : 1);
        expect(call).not.toHaveBeenCalled();
        expect(disconnect).toHaveBeenCalledTimes(phase === 'enumerate' ? 0 : 1);
        expect(connected).not.toHaveBeenCalled();
        expect(qrDisplay).not.toHaveBeenCalled();
        const retried = await adapter.evmGetAddress('', FIXTURE_MFP, { path: EVM_PATH });
        expect(retried.success).toBe(true);
        expect(connected).toHaveBeenCalledTimes(1);
        expect(qrDisplay).not.toHaveBeenCalled();
      } finally {
        resume();
        await pending;
        await adapter.dispose();
      }
    }
  );

  it('does not probe again after cancellation in the re-enumeration delay', async () => {
    const usb = fakeUsbConnector();
    const adapter = new KeystoneAdapter({ usbConnector: usb.connector });
    const fake = attachFakeDevice(adapter);
    try {
      await connectUsbDevice(adapter);
      await adapter.importFromQr();
      usb.setAvailable(false);
      usb.emitDisconnect();
      const searchesBefore = usb.searchCalls.length;
      const requestsBefore = fake.requests.length;
      const pending = adapter.evmSignMessage('', FIXTURE_MFP, {
        path: EVM_PATH,
        message: 'cancellation fixture',
      });
      await nextImmediate();
      expect(usb.searchCalls.length).toBe(searchesBefore + 1);
      adapter.cancel(FIXTURE_MFP);
      await expect(pending).resolves.toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.UserAborted },
      });
      await sleep(550);
      expect(usb.searchCalls.length).toBe(searchesBefore + 1);
      expect(fake.requests).toHaveLength(requestsBefore);
    } finally {
      fake.detach();
      await adapter.dispose();
    }
  });

  it('reports busy on immediate USB reattach retry until the cancelled connect drains', async () => {
    const usb = fakeUsbConnector();
    const adapter = new KeystoneAdapter({ usbConnector: usb.connector });
    const fake = attachFakeDevice(adapter);
    const { promise: wait, resolve: resume } = deferred();
    const originalConnect = usb.connector.connect.bind(usb.connector);
    jest.spyOn(usb.connector, 'connect').mockImplementationOnce(async (...args) => {
      await wait;
      return originalConnect(...args);
    });
    const first = adapter.evmGetAddress('', FIXTURE_MFP, { path: EVM_PATH });
    try {
      await nextImmediate();
      adapter.cancel(FIXTURE_MFP);
      await first;
      const retried = await adapter.evmGetAddress('', FIXTURE_MFP, { path: EVM_PATH });
      expect(retried).toMatchObject({
        success: false,
        payload: { code: HardwareErrorCode.DeviceBusyInternal },
      });
      expect(fake.requests).toHaveLength(0);
      resume();
      await nextImmediate();
      const afterCleanup = await adapter.evmGetAddress('', FIXTURE_MFP, { path: EVM_PATH });
      expect(afterCleanup.success).toBe(true);
      expect(fake.requests).toHaveLength(0);
    } finally {
      resume();
      await first;
      fake.detach();
      await adapter.dispose();
    }
  });
});
