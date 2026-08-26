import bs58 from 'bs58';
import { v4 as uuidv4 } from 'uuid';
import {
  CHAIN_FINGERPRINT_PATHS,
  DEVICE,
  DeviceJobQueue,
  HardwareErrorCode,
  TypedEventEmitter,
  UI_REQUEST,
  UI_REQUEST_CANCELLED_TAG,
  UI_REQUEST_PREEMPTED_TAG,
  UI_REQUEST_TIMEOUT_TAG,
  UI_RESPONSE,
  UiRequestRegistry,
  createHwkError,
  deriveDeviceFingerprint,
  ensure0x,
  failure,
  rehydrateConnectorError,
  runAllNetworkGetAddress,
  stripHex,
  success,
} from '@onekeyfe/hwk-adapter-core';

import { KeystoneUrEngine } from '../urEngine/KeystoneUrEngine';
import {
  QR_CONNECT_ID_PREFIX,
  accountKey,
  createDeviceRecord,
  placeholderDeviceInfo,
  toDeviceInfo,
} from './deviceTable';
import { btcScriptTypeFromPath, normalizePath, splitAccountPath } from './pathUtils';

import type { KeystoneParsedMultiAccounts, KeystoneUr } from '../urEngine/types';
import type { KeystoneAccountEntry, KeystoneDeviceRecord } from './deviceTable';
import type {
  AllNetworkAddressResponse,
  AllNetworkGetAddressParams,
  BtcAddress,
  BtcGetAddressParams,
  BtcGetPublicKeyParams,
  BtcPublicKey,
  BtcSignMsgParams,
  BtcSignPsbtParams,
  BtcSignTxParams,
  BtcSignature,
  BtcSignedPsbt,
  BtcSignedTx,
  ChainCapability,
  ChainForFingerprint,
  ConnectorDevice,
  DeviceEventListener,
  DeviceInfo,
  EvmAddress,
  EvmGetAddressParams,
  EvmSignMsgParams,
  EvmSignTxParams,
  EvmSignTypedDataParams,
  EvmSignature,
  EvmSignedTx,
  HardwareEvent,
  HardwareEventMap,
  IConnector,
  IHardwareCallParams,
  IHardwareWallet,
  NullableCallArg,
  QrDisplayData,
  Response,
  SearchDevicesOptions,
  SolAddress,
  SolGetAddressParams,
  SolSignMsgParams,
  SolSignTxParams,
  SolSignature,
  SolSignedTx,
  TransportType,
  TronAddress,
  TronGetAddressParams,
  TronSignMsgParams,
  TronSignTxParams,
  TronSignature,
  TronSignedTx,
  UiResponseEvent,
} from '@onekeyfe/hwk-adapter-core';

const COLD_START_JOB_LABEL = 'keystone-cold-start';

const BIP44_COIN_TYPE_TO_CHAIN: Record<number, ChainCapability> = {
  60: 'evm',
  0: 'btc',
  501: 'sol',
  195: 'tron',
};

/**
 * Classifies a returned account by its BIP44 COIN TYPE (2nd path segment),
 * not the purpose (1st segment, 44'/49'/84'/86'/…). Fixed from an earlier
 * version that matched purpose 44' literally, which would silently drop
 * ANY response entry using a different purpose — including
 * `DEFAULT_IMPORT_SCHEMAS`'s own 49'/84' BTC requests below, since this
 * function decides which hwkChain a returned account belongs to regardless
 * of what was explicitly asked for.
 */
function inferHwkChainFromPath(path: string): ChainCapability | undefined {
  const match = normalizePath(path).match(/^m\/\d+'\/(\d+)'/);
  return match ? BIP44_COIN_TYPE_TO_CHAIN[Number(match[1])] : undefined;
}

const DEFAULT_IMPORT_SCHEMAS: Array<{ hwkChain: ChainCapability; path: string }> = [
  { hwkChain: 'evm', path: CHAIN_FINGERPRINT_PATHS.evm.replace(/\/0\/0$/, '') },
  // The 3 BTC purposes this package can actually derive addresses for
  // (btcScriptTypeFromPath: 44'→P2PKH, 49'→P2SH-P2WPKH, 84'→P2WPKH) —
  // explicitly requested, not left to chance on whether the device
  // volunteers the others unprompted. Still one combined round trip: these
  // are 3 more entries in the same qr-hardware-call, not 3 more scans.
  // 86' (P2TR/taproot) deliberately excluded — `deriveBtcAddressFromXpub`
  // can't use it yet (needs an elliptic-curve library not wired in), and
  // unlike app-monorepo's own sync-all bundle (which also requests 86', but
  // to compute a "full xfp" — a need this adapter doesn't have, since its
  // mfp already comes for free from the response envelope), there's no
  // other use for that xpub here — so it stays out until P2TR is real.
  { hwkChain: 'btc', path: CHAIN_FINGERPRINT_PATHS.btc },
  { hwkChain: 'btc', path: "m/49'/0'/0'" },
  { hwkChain: 'btc', path: "m/84'/0'/0'" },
  { hwkChain: 'sol', path: CHAIN_FINGERPRINT_PATHS.sol },
  { hwkChain: 'tron', path: CHAIN_FINGERPRINT_PATHS.tron.replace(/\/0\/0$/, '') },
];

export interface ImportFromQrOptions {
  /**
   * 'request': host asks for specific paths via a `qr-hardware-call`
   * (KeyDerivation) UR — precise, works regardless of what screen the device
   * is on. 'scan': just wait for whatever multi-account/HD-key export the
   * device is already showing. Defaults to 'request' with `paths`, or the
   * default EVM/BTC/SOL account set if `paths` is omitted.
   */
  mode?: 'request' | 'scan';
  paths?: Array<{ hwkChain: ChainCapability; path: string }>;
}

/**
 * Keystone hardware wallet adapter — QR and USB channels merged behind one
 * `IHardwareWallet` surface, keyed by the wallet's master fingerprint (mfp):
 * a caller sees the same `evmSignTransaction(...)` call regardless of which
 * channel actually carries it. Internally, a chain method's UR round trip
 * either drives one or two `REQUEST_QR_DISPLAY`/`REQUEST_QR_SCAN` UI events
 * (QR) or a direct `IConnector.call(sessionId, 'resolveUr', ur)` (USB) — see
 * `_resolveUr`.
 *
 * QR needs no physical enumeration or explicit connect step: a caller can
 * call any chain method with `connectId`/`deviceId` both null and the
 * adapter drives its own implicit cold-start sync. USB is the opposite —
 * WebUSB device pickers require a user gesture, so a USB session only comes
 * into existence via an explicit `searchDevices()` + `connectDevice()` (see
 * `_connectUsb`). Once a USB session exists for a wallet's mfp, later calls
 * for that same wallet route over USB automatically (unless pinned via
 * `switchTransport`) — matching docs/design/keystone-integration/README.md §4.3.
 */
export class KeystoneAdapter implements IHardwareWallet {
  readonly vendor = 'keystone' as const;

  private readonly urEngine: KeystoneUrEngine;

  private readonly emitter = new TypedEventEmitter<HardwareEventMap>();

  private readonly _uiRegistry = new UiRequestRegistry();

  private readonly _jobQueue: DeviceJobQueue;

  private readonly _devices = new Map<string, KeystoneDeviceRecord>();

  private readonly _origin: string;

  /** How long to wait for the app to answer a `REQUEST_QR_DISPLAY`/`REQUEST_QR_SCAN` before failing. Defaults to the registry's own 10-minute default. */
  private readonly _qrTimeoutMs: number | undefined;

  /** Optional USB `IConnector` — supplied by the host app (DI, same pattern as Trezor/Ledger), e.g. via `createKeystoneWebUsbConnector()` from `@onekeyfe/hwk-keystone-connector-usb`. Undefined means QR-only. */
  private readonly _usbConnector: IConnector | undefined;

  /** Explicit `switchTransport` pin. `undefined` means "auto": USB when a live session exists for the target wallet, else QR. */
  private _forcedTransport: 'qr' | 'usb' | undefined;

  constructor(options?: { origin?: string; qrTimeoutMs?: number; usbConnector?: IConnector }) {
    this._origin = options?.origin ?? 'OneKey';
    this._qrTimeoutMs = options?.qrTimeoutMs;
    this.urEngine = new KeystoneUrEngine(this._origin);
    this._jobQueue = new DeviceJobQueue();
    this._usbConnector = options?.usbConnector;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle / transport
  // ---------------------------------------------------------------------------

  get activeTransport(): TransportType | null {
    if (this._devices.size === 0) return null;
    const hasUsbSession = Array.from(this._devices.values()).some(r => r.usbSessionId);
    return hasUsbSession ? 'usb' : 'qr';
  }

  getAvailableTransports(): TransportType[] {
    return this._usbConnector ? ['qr', 'usb'] : ['qr'];
  }

  /** Pins subsequent calls to 'qr' or 'usb' (routing otherwise defaults to "USB when the target wallet has a live session, else QR" — see `_resolveUr`). Any other value clears the pin back to auto. */
  switchTransport(type: TransportType): Promise<void> {
    this._forcedTransport = type === 'qr' || type === 'usb' ? type : undefined;
    return Promise.resolve();
  }

  init(_config?: unknown): Promise<void> {
    return Promise.resolve();
  }

  dispose(): Promise<void> {
    this._uiRegistry.cancel();
    this._jobQueue.clear();
    this.emitter.removeAllListeners();
    this._devices.clear();
    this._usbConnector?.reset();
    return Promise.resolve();
  }

  // ---------------------------------------------------------------------------
  // Device table
  // ---------------------------------------------------------------------------

  /**
   * QR-synced wallets are always included (this instance's own state — no
   * enumeration exists for QR). When a USB connector is configured, its raw
   * scan results are appended as-is: a USB descriptor has no mfp until
   * `connectDevice()` actually opens+claims it (see
   * `KeystoneUsbConnectorBase.searchDevices`), so these entries carry an
   * empty `deviceId` and exist purely so a host can list "plugged in, click
   * to connect" candidates.
   */
  async searchDevices(_options?: SearchDevicesOptions): Promise<DeviceInfo[]> {
    const known = Array.from(this._devices.values()).map(toDeviceInfo);
    if (!this._usbConnector) return known;

    let usbDevices: ConnectorDevice[];
    try {
      usbDevices = await this._usbConnector.searchDevices();
    } catch {
      // A USB scan failing (no WebUSB support, permission not yet granted,
      // etc.) must not sink the QR-known devices this instance already has.
      return known;
    }
    const placeholders: DeviceInfo[] = usbDevices.map(d => ({
      vendor: 'keystone',
      model: d.model ?? 'unknown',
      modelName: d.modelName,
      firmwareVersion: '0.0.0',
      deviceId: d.deviceId,
      connectId: d.connectId,
      connectionType: 'usb',
      capabilities: d.capabilities ?? { persistentDeviceIdentity: true },
    }));
    return [...known, ...placeholders];
  }

  async connectDevice(connectId: string): Promise<Response<string>> {
    const existing = this._findByConnectId(connectId);
    if (existing) return success(existing.connectId);
    // Not a wallet this instance already knows about — the only other
    // legitimate case is a USB scan placeholder (see `searchDevices`), which
    // carries no usable mfp of its own; connecting always opens+claims
    // whatever the OS/browser currently has permission for, then merges by
    // whatever mfp comes back.
    if (!this._usbConnector) {
      return failure(HardwareErrorCode.DeviceNotFound, `Unknown Keystone connectId: ${connectId}`);
    }
    const result = await this._connectUsb();
    if (!result.success) return result;
    return success(result.payload.connectId);
  }

  /**
   * QR has no persistent connection to tear down — the account cache
   * survives so a later call resumes without re-syncing. For a USB session,
   * this closes the connector session and either demotes the record back to
   * QR-only (if it was ever QR-synced) or removes it entirely (pure-USB
   * wallet that was never seen over QR) — see §4.2 of the design doc.
   */
  async disconnectDevice(connectId: string): Promise<void> {
    const record = this._findByConnectId(connectId);
    if (!record?.usbSessionId) return;

    if (this._usbConnector) {
      try {
        await this._usbConnector.disconnect(record.usbSessionId);
      } catch {
        // Best-effort teardown — the record is dropped/demoted below either way.
      }
    }
    record.usbSessionId = undefined;

    if (record.qrSynced) {
      const info = toDeviceInfo(record);
      this.emitter.emit(DEVICE.CHANGED, { type: DEVICE.CHANGED, payload: info });
    } else {
      this._devices.delete(record.masterFingerprint);
      const info = toDeviceInfo(record);
      this.emitter.emit(DEVICE.DISCONNECT, { type: DEVICE.DISCONNECT, payload: info });
    }
  }

  getDeviceInfo(connectId: string, deviceId: string): Promise<Response<DeviceInfo>> {
    const record = this._findByConnectId(connectId) ?? this._devices.get(deviceId.toLowerCase());
    if (!record) {
      return Promise.resolve(
        failure(
          HardwareErrorCode.DeviceNotFound,
          `Unknown Keystone device: ${connectId || deviceId}`
        )
      );
    }
    return Promise.resolve(success(toDeviceInfo(record)));
  }

  getSupportedChains(): ChainCapability[] {
    return ['evm', 'btc', 'sol', 'tron'];
  }

  cancel(connectId?: string): void {
    const reason = createHwkError({
      code: HardwareErrorCode.UserAborted,
      message: 'User aborted operation',
    });
    this._uiRegistry.cancel();
    this._jobQueue.cancelActiveAndPending(connectId, reason);
  }

  getChainFingerprint(
    connectId: string,
    deviceId: string,
    chain: ChainForFingerprint
  ): Promise<Response<string>> {
    const mfp = deviceId ? deviceId.toLowerCase() : this._mfpFromConnectId(connectId);
    if (!mfp) {
      return Promise.resolve(failure(HardwareErrorCode.DeviceNotFound, 'Unknown Keystone device'));
    }
    // Unlike Ledger (ephemeral connectId, needs a derived address as a
    // stand-in identity), the mfp itself already IS Keystone's stable,
    // seed-level identity — no device round trip needed to re-derive it.
    // Still scoped per chain so the fingerprint format matches other vendors'.
    return Promise.resolve(success(deriveDeviceFingerprint(`keystone:${chain}:${mfp}`)));
  }

  uiResponse(response: UiResponseEvent): void {
    if (response.type === UI_RESPONSE.CANCEL) {
      this.cancel();
      return;
    }
    this._uiRegistry.resolve(response.type, response.payload);
  }

  on<K extends keyof HardwareEventMap>(
    event: K,
    listener: (event: HardwareEventMap[K]) => void
  ): void;

  on(event: string, listener: DeviceEventListener): void;

  on(event: string, listener: (event: HardwareEvent) => void): void {
    this.emitter.on(event, listener);
  }

  off<K extends keyof HardwareEventMap>(
    event: K,
    listener: (event: HardwareEventMap[K]) => void
  ): void;

  off(event: string, listener: DeviceEventListener): void;

  off(event: string, listener: (event: HardwareEvent) => void): void {
    this.emitter.off(event, listener);
  }

  // ---------------------------------------------------------------------------
  // Explicit account import — the recommended entry point before signing, so
  // signing calls don't each pay for their own cold-sync round trip.
  // ---------------------------------------------------------------------------

  async importFromQr(options: ImportFromQrOptions = {}): Promise<Response<DeviceInfo>> {
    try {
      return await this._jobQueue.enqueue(COLD_START_JOB_LABEL, async signal => {
        const displayDevice = placeholderDeviceInfo();
        let responseUr: KeystoneUr;
        let requestedChains: ChainCapability[] | undefined;

        if (options.mode === 'scan') {
          responseUr = await this._requestQrScanAndAwaitResponse(displayDevice);
        } else {
          const schemas = options.paths?.length ? options.paths : DEFAULT_IMPORT_SCHEMAS;
          requestedChains = schemas.map(s => s.hwkChain);
          const requestUr = this.urEngine.buildKeyDerivationRequest({
            schemas: schemas.map(s => ({
              path: s.path,
              curve: s.hwkChain === 'sol' ? 'ed25519' : 'secp256k1',
            })),
            origin: this._origin,
          });
          responseUr = await this._requestQrDisplayAndAwaitResponse(displayDevice, {
            ...requestUr,
            animated: false,
          });
        }
        KeystoneAdapter._throwIfAborted(signal);

        const parsed = this.urEngine.parseAccountResponse(responseUr);
        const record = this._upsertDeviceRecord(parsed);

        for (const account of parsed.accounts) {
          const hwkChain =
            requestedChains?.length === 1
              ? requestedChains[0]
              : inferHwkChainFromPath(account.path);
          if (hwkChain) {
            const entry: KeystoneAccountEntry = { ...account, hwkChain };
            record.accounts.set(accountKey(hwkChain, account.path), entry);
          }
        }

        return success(toDeviceInfo(record));
      });
    } catch (err) {
      return this._errorToFailure<DeviceInfo>(err);
    }
  }

  // ---------------------------------------------------------------------------
  // All-network bundle — dispatches to the same per-chain methods below, so
  // there's exactly one implementation of each chain's address logic.
  // ---------------------------------------------------------------------------

  allNetworkGetAddress = async (
    connectId: string,
    deviceId: string,
    params: AllNetworkGetAddressParams
  ): Promise<Response<AllNetworkAddressResponse[]>> => {
    try {
      return await runAllNetworkGetAddress({
        connectId,
        deviceId,
        params,
        callItem: async ({ chain, item }) => {
          const commonArgs = { path: item.path, showOnDevice: item.showOnDevice };
          switch (chain) {
            case 'evm':
              return this.evmGetAddress(connectId, deviceId, commonArgs);
            case 'btc':
              return this.btcGetAddress(connectId, deviceId, commonArgs);
            case 'sol':
              return this.solGetAddress(connectId, deviceId, commonArgs);
            case 'tron':
              return this.tronGetAddress(connectId, deviceId, commonArgs);
            default:
              return failure(HardwareErrorCode.MethodNotSupported, `Unsupported chain: ${chain}`);
          }
        },
        attachIdentity: context => {
          const mfp = deviceId ? deviceId.toLowerCase() : undefined;
          return Promise.resolve({
            ...context.item,
            success: true,
            payload: {
              ...context.payload,
              deviceIdentity: mfp
                ? { vendor: 'keystone' as const, type: 'masterFingerprint' as const, value: mfp }
                : undefined,
            },
          });
        },
      });
    } catch (err) {
      return this._errorToFailure<AllNetworkAddressResponse[]>(err);
    }
  };

  // ---------------------------------------------------------------------------
  // EVM
  // ---------------------------------------------------------------------------

  async evmGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<EvmGetAddressParams>>
  ): Promise<Response<EvmAddress>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'evmGetAddress requires params');
    if (!params.path)
      return failure(HardwareErrorCode.InvalidParams, 'evmGetAddress requires params.path');

    const { accountPath, relativeDerivePath } = splitAccountPath(params.path);
    if (!relativeDerivePath) {
      return failure(
        HardwareErrorCode.InvalidParams,
        "evmGetAddress requires a full leaf path, e.g. m/44'/60'/0'/0/0"
      );
    }

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          const { account } = await this._ensureAccountSynced(
            connectId,
            deviceId,
            'evm',
            accountPath,
            signal
          );
          KeystoneAdapter._throwIfAborted(signal);
          if (!account.extendedPublicKey) {
            throw createHwkError({
              code: HardwareErrorCode.MethodNotSupported,
              message: 'Keystone did not return an extended public key for this account path',
            });
          }
          // params.showOnDevice: Keystone on-device re-display/verification for
          // one leaf address isn't wired yet; the address itself is still
          // correct — it's derived offline from a device-verified xpub, just
          // not re-shown.
          const address = this.urEngine.deriveEvmAddressFromXpub(
            account.extendedPublicKey,
            relativeDerivePath
          );
          return success<EvmAddress>({ address, path: normalizePath(params.path) });
        }
      );
    } catch (err) {
      return this._errorToFailure<EvmAddress>(err);
    }
  }

  async evmSignTransaction(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<EvmSignTxParams>>
  ): Promise<Response<EvmSignedTx>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params)
      return failure(HardwareErrorCode.InvalidParams, 'evmSignTransaction requires params');
    if (!params.path) {
      return failure(HardwareErrorCode.InvalidParams, 'evmSignTransaction requires params.path');
    }
    if (
      !('serializedTx' in params) ||
      typeof params.serializedTx !== 'string' ||
      !params.serializedTx
    ) {
      return failure(
        HardwareErrorCode.MethodNotSupported,
        'Keystone only signs a fully RLP-serialized transaction (params.serializedTx) — structured-field signing is not supported'
      );
    }
    const rawTxHex = stripHex(params.serializedTx);
    const path = normalizePath(params.path);

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          // Signing only needs the wallet's mfp (the device re-derives the
          // signing key itself from path+xfp) — not a cached xpub for this
          // exact path, so this must NOT key off the leaf path the way
          // evmGetAddress's account-xpub cache does, or a wallet imported at
          // the account level would never hit cache for a sign call.
          const { record } = await this._ensureMfpKnown(connectId, deviceId, 'evm', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          // EIP-2718 typed-tx bytes always start with a type byte < 0x80; a
          // legacy RLP-encoded tx list always starts with a byte >= 0xc0 — the
          // standard disambiguation rule (that gap is exactly why EIP-2718
          // chose those type-byte values).
          const dataType =
            parseInt(rawTxHex.slice(0, 2), 16) < 0xc0 ? 'typedTransaction' : 'transaction';
          const requestUr = this.urEngine.buildEthSignRequest({
            requestId,
            unsignedTxHex: rawTxHex,
            dataType,
            path,
            xfp: record.masterFingerprint,
            chainId: params.chainId,
          });
          const responseUr = await this._resolveUr(record, requestUr, true);
          KeystoneAdapter._throwIfAborted(signal);

          const sig = this.urEngine.parseEthSignature(responseUr);
          KeystoneAdapter._assertRequestIdMatches(requestId, sig.requestId);
          return success<EvmSignedTx>({
            v: ensure0x(sig.v),
            r: ensure0x(sig.r),
            s: ensure0x(sig.s),
          });
        }
      );
    } catch (err) {
      return this._errorToFailure<EvmSignedTx>(err);
    }
  }

  async evmSignMessage(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<EvmSignMsgParams>>
  ): Promise<Response<EvmSignature>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'evmSignMessage requires params');
    if (!params.path || params.message === undefined) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'evmSignMessage requires params.path and params.message'
      );
    }
    const messageHex = params.hex
      ? stripHex(params.message)
      : Buffer.from(params.message, 'utf8').toString('hex');
    const path = normalizePath(params.path);

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          // Signing only needs the wallet's mfp (the device re-derives the
          // signing key itself from path+xfp) — not a cached xpub for this
          // exact path, so this must NOT key off the leaf path the way
          // evmGetAddress's account-xpub cache does, or a wallet imported at
          // the account level would never hit cache for a sign call.
          const { record } = await this._ensureMfpKnown(connectId, deviceId, 'evm', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          const requestUr = this.urEngine.buildEthSignRequest({
            requestId,
            unsignedTxHex: messageHex,
            dataType: 'personalMessage',
            path,
            xfp: record.masterFingerprint,
            chainId: params.chainId,
          });
          const responseUr = await this._resolveUr(record, requestUr, true);
          KeystoneAdapter._throwIfAborted(signal);

          const sig = this.urEngine.parseEthSignature(responseUr);
          KeystoneAdapter._assertRequestIdMatches(requestId, sig.requestId);
          return success<EvmSignature>({ signature: ensure0x(sig.r + sig.s + sig.v) });
        }
      );
    } catch (err) {
      return this._errorToFailure<EvmSignature>(err);
    }
  }

  async evmSignTypedData(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<EvmSignTypedDataParams>>
  ): Promise<Response<EvmSignature>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params)
      return failure(HardwareErrorCode.InvalidParams, 'evmSignTypedData requires params');
    if (!params.path) {
      return failure(HardwareErrorCode.InvalidParams, 'evmSignTypedData requires params.path');
    }
    if (params.mode === 'hash') {
      return failure(
        HardwareErrorCode.MethodNotSupported,
        'Keystone always displays the full EIP-712 payload for on-device review — pre-hashed signing is not supported'
      );
    }
    // Matches the Keystone USB SDK's own `signEIP712Message` convention
    // (JSON.stringify of the typed-data object) — QR and USB share the same
    // sign-request format, so the wire convention is the same either way.
    const signDataHex = Buffer.from(JSON.stringify(params.data), 'utf8').toString('hex');
    const path = normalizePath(params.path);

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          // Signing only needs the wallet's mfp (the device re-derives the
          // signing key itself from path+xfp) — not a cached xpub for this
          // exact path, so this must NOT key off the leaf path the way
          // evmGetAddress's account-xpub cache does, or a wallet imported at
          // the account level would never hit cache for a sign call.
          const { record } = await this._ensureMfpKnown(connectId, deviceId, 'evm', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          const requestUr = this.urEngine.buildEthSignRequest({
            requestId,
            unsignedTxHex: signDataHex,
            dataType: 'typedData',
            path,
            xfp: record.masterFingerprint,
            chainId: params.chainId,
          });
          const responseUr = await this._resolveUr(record, requestUr, true);
          KeystoneAdapter._throwIfAborted(signal);

          const sig = this.urEngine.parseEthSignature(responseUr);
          KeystoneAdapter._assertRequestIdMatches(requestId, sig.requestId);
          return success<EvmSignature>({ signature: ensure0x(sig.r + sig.s + sig.v) });
        }
      );
    } catch (err) {
      return this._errorToFailure<EvmSignature>(err);
    }
  }

  // ---------------------------------------------------------------------------
  // BTC — PSBT signing and message signing only for now. Address/pubkey
  // derivation needs script-type-aware xpub decoding (P2WPKH/P2TR/…) this
  // phase doesn't wire in yet; structured-field tx signing needs host-side
  // PSBT construction. Both are real, bounded follow-ups, not silent gaps.
  // ---------------------------------------------------------------------------

  async btcGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<BtcGetAddressParams>>
  ): Promise<Response<BtcAddress>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'btcGetAddress requires params');
    if (!params.path)
      return failure(HardwareErrorCode.InvalidParams, 'btcGetAddress requires params.path');

    const scriptType = btcScriptTypeFromPath(params.path);
    if (!scriptType) {
      return failure(
        HardwareErrorCode.InvalidParams,
        "btcGetAddress requires a path whose purpose is 44'/49'/84'/86' (P2PKH/P2SH-P2WPKH/P2WPKH/P2TR)"
      );
    }
    if (scriptType === 'p2tr') {
      return this._unsupported(
        'btcGetAddress',
        "P2TR (purpose 86') needs an elliptic-curve library for BIP-341 tweaking, not yet wired in — 44'/49'/84' work"
      );
    }

    const { accountPath, relativeDerivePath } = splitAccountPath(params.path);
    if (!relativeDerivePath) {
      return failure(
        HardwareErrorCode.InvalidParams,
        "btcGetAddress requires a full leaf path, e.g. m/84'/0'/0'/0/0"
      );
    }

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          const { account } = await this._ensureAccountSynced(
            connectId,
            deviceId,
            'btc',
            accountPath,
            signal
          );
          KeystoneAdapter._throwIfAborted(signal);
          if (!account.extendedPublicKey) {
            throw createHwkError({
              code: HardwareErrorCode.MethodNotSupported,
              message: 'Keystone did not return an extended public key for this account path',
            });
          }
          // Same on-device re-display caveat as evmGetAddress: the address is
          // still correct (derived offline from a device-verified xpub), it
          // just isn't re-shown on-device for this call yet.
          const address = this.urEngine.deriveBtcAddressFromXpub(
            account.extendedPublicKey,
            relativeDerivePath,
            scriptType
          );
          return success<BtcAddress>({ address, path: normalizePath(params.path) });
        }
      );
    } catch (err) {
      return this._errorToFailure<BtcAddress>(err);
    }
  }

  async btcGetPublicKey(
    _connectId?: NullableCallArg<string>,
    _deviceId?: NullableCallArg<string>,
    _params?: NullableCallArg<IHardwareCallParams<BtcGetPublicKeyParams>>
  ): Promise<Response<BtcPublicKey>> {
    return this._unsupported(
      'btcGetPublicKey',
      'not yet wired — the underlying synced xpub/chainCode data already exists in the device table'
    );
  }

  async btcSignTransaction(
    _connectId?: NullableCallArg<string>,
    _deviceId?: NullableCallArg<string>,
    _params?: NullableCallArg<IHardwareCallParams<BtcSignTxParams>>
  ): Promise<Response<BtcSignedTx>> {
    return this._unsupported(
      'btcSignTransaction',
      'use btcSignPsbt — structured input/output signing needs host-side PSBT construction, not yet wired in'
    );
  }

  async btcSignPsbt(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<BtcSignPsbtParams>>
  ): Promise<Response<BtcSignedPsbt>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'btcSignPsbt requires params');
    if (!params.psbt)
      return failure(HardwareErrorCode.InvalidParams, 'btcSignPsbt requires params.psbt');

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          // A PSBT can span multiple inputs/paths — there's no single leaf path
          // to scope a sync to, so this only needs the wallet's mfp to be known.
          const { record } = await this._ensureMfpKnown(connectId, deviceId, 'btc', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestUr = this.urEngine.buildBtcPsbtRequest(stripHex(params.psbt));
          const responseUr = await this._resolveUr(record, requestUr, true);
          KeystoneAdapter._throwIfAborted(signal);

          const signedPsbt = this.urEngine.parseBtcPsbt(responseUr);
          return success<BtcSignedPsbt>({ signedPsbt });
        }
      );
    } catch (err) {
      return this._errorToFailure<BtcSignedPsbt>(err);
    }
  }

  async btcSignMessage(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<BtcSignMsgParams>>
  ): Promise<Response<BtcSignature>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'btcSignMessage requires params');
    if (!params.path || params.message === undefined) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'btcSignMessage requires params.path and params.message'
      );
    }
    const messageHex = params.hex
      ? stripHex(params.message)
      : Buffer.from(params.message, 'utf8').toString('hex');
    const path = normalizePath(params.path);

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          const { record } = await this._ensureMfpKnown(connectId, deviceId, 'btc', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          const requestUr = this.urEngine.buildBtcMessageSignRequest({
            requestId,
            messageHex,
            accounts: [{ path, xfp: record.masterFingerprint }],
          });
          const responseUr = await this._resolveUr(record, requestUr, true);
          KeystoneAdapter._throwIfAborted(signal);

          const sig = this.urEngine.parseBtcSignature(responseUr);
          KeystoneAdapter._assertRequestIdMatches(requestId, sig.requestId);
          return success<BtcSignature>({ signature: sig.signature });
        }
      );
    } catch (err) {
      return this._errorToFailure<BtcSignature>(err);
    }
  }

  async btcGetMasterFingerprint(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>
  ): Promise<Response<{ masterFingerprint: string }>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          const { record } = await this._ensureMfpKnown(connectId, deviceId, 'btc', signal);
          return success({ masterFingerprint: record.masterFingerprint });
        }
      );
    } catch (err) {
      return this._errorToFailure<{ masterFingerprint: string }>(err);
    }
  }

  // ---------------------------------------------------------------------------
  // SOL
  // ---------------------------------------------------------------------------

  async solGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<SolGetAddressParams>>
  ): Promise<Response<SolAddress>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'solGetAddress requires params');
    if (!params.path)
      return failure(HardwareErrorCode.InvalidParams, 'solGetAddress requires params.path');
    const path = normalizePath(params.path);

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          const { account } = await this._ensureAccountSynced(
            connectId,
            deviceId,
            'sol',
            path,
            signal
          );
          KeystoneAdapter._throwIfAborted(signal);
          // Ed25519 public key IS the Solana address (base58) — no further
          // derivation, unlike EVM. params.showOnDevice: same on-device
          // re-display caveat as evmGetAddress.
          const address = bs58.encode(Buffer.from(account.publicKey, 'hex'));
          return success<SolAddress>({ address, path });
        }
      );
    } catch (err) {
      return this._errorToFailure<SolAddress>(err);
    }
  }

  async solSignTransaction(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<SolSignTxParams>>
  ): Promise<Response<SolSignedTx>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params)
      return failure(HardwareErrorCode.InvalidParams, 'solSignTransaction requires params');
    if (!params.path || !params.serializedTx) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'solSignTransaction requires params.path and params.serializedTx'
      );
    }
    const path = normalizePath(params.path);

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          // Same reasoning as evmSignTransaction — signing needs only the mfp.
          const { record } = await this._ensureMfpKnown(connectId, deviceId, 'sol', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          const requestUr = this.urEngine.buildSolSignRequest({
            requestId,
            unsignedPayloadHex: stripHex(params.serializedTx),
            dataType: 'transaction',
            path,
            xfp: record.masterFingerprint,
          });
          const responseUr = await this._resolveUr(record, requestUr, true);
          KeystoneAdapter._throwIfAborted(signal);

          const sig = this.urEngine.parseSolSignature(responseUr);
          KeystoneAdapter._assertRequestIdMatches(requestId, sig.requestId);
          return success<SolSignedTx>({ signature: sig.signature });
        }
      );
    } catch (err) {
      return this._errorToFailure<SolSignedTx>(err);
    }
  }

  async solSignMessage(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<SolSignMsgParams>>
  ): Promise<Response<SolSignature>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'solSignMessage requires params');
    if (!params.path || !params.message) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'solSignMessage requires params.path and params.message'
      );
    }
    const path = normalizePath(params.path);

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          // Same reasoning as evmSignTransaction — signing needs only the mfp.
          const { record } = await this._ensureMfpKnown(connectId, deviceId, 'sol', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          const requestUr = this.urEngine.buildSolSignRequest({
            requestId,
            unsignedPayloadHex: stripHex(params.message),
            dataType: 'message',
            path,
            xfp: record.masterFingerprint,
          });
          const responseUr = await this._resolveUr(record, requestUr, true);
          KeystoneAdapter._throwIfAborted(signal);

          const sig = this.urEngine.parseSolSignature(responseUr);
          KeystoneAdapter._assertRequestIdMatches(requestId, sig.requestId);
          return success<SolSignature>({ signature: sig.signature });
        }
      );
    } catch (err) {
      return this._errorToFailure<SolSignature>(err);
    }
  }

  // ---------------------------------------------------------------------------
  // TRON — routed through `TronSignRequest`/`TronSignature` (see
  // urEngine/TronSignRequest.ts), a port of OneKey's own already-proven
  // production TRON QR-wallet implementation — NOT keystone-sdk's own
  // bundled `sdk.tron` module (different, protobuf-based protocol with
  // unverified response semantics).
  // ---------------------------------------------------------------------------

  async tronGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<TronGetAddressParams>>
  ): Promise<Response<TronAddress>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'tronGetAddress requires params');
    if (!params.path)
      return failure(HardwareErrorCode.InvalidParams, 'tronGetAddress requires params.path');

    const { accountPath, relativeDerivePath } = splitAccountPath(params.path);
    if (!relativeDerivePath) {
      return failure(
        HardwareErrorCode.InvalidParams,
        "tronGetAddress requires a full leaf path, e.g. m/44'/195'/0'/0/0"
      );
    }

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          const { account } = await this._ensureAccountSynced(
            connectId,
            deviceId,
            'tron',
            accountPath,
            signal
          );
          KeystoneAdapter._throwIfAborted(signal);
          if (!account.extendedPublicKey) {
            throw createHwkError({
              code: HardwareErrorCode.MethodNotSupported,
              message: 'Keystone did not return an extended public key for this account path',
            });
          }
          const address = this.urEngine.deriveTronAddressFromXpub(
            account.extendedPublicKey,
            relativeDerivePath
          );
          return success<TronAddress>({ address, path: normalizePath(params.path) });
        }
      );
    } catch (err) {
      return this._errorToFailure<TronAddress>(err);
    }
  }

  async tronSignTransaction(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<TronSignTxParams>>
  ): Promise<Response<TronSignedTx>> {
    const connectId = connectIdArg ?? undefined;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params)
      return failure(HardwareErrorCode.InvalidParams, 'tronSignTransaction requires params');
    if (!params.path) {
      return failure(HardwareErrorCode.InvalidParams, 'tronSignTransaction requires params.path');
    }
    if (!params.rawTxHex) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'Keystone only signs a fully protobuf-serialized TRON transaction (params.rawTxHex) — the Trezor-style structured contract fields have no equivalent here'
      );
    }
    const rawTxHex = stripHex(params.rawTxHex);
    const path = normalizePath(params.path);

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          const { record } = await this._ensureMfpKnown(connectId, deviceId, 'tron', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          const requestUr = this.urEngine.buildTronSignRequest({
            requestId,
            rawTxHex,
            path,
            xfp: record.masterFingerprint,
          });
          const responseUr = await this._resolveUr(record, requestUr, true);
          KeystoneAdapter._throwIfAborted(signal);

          const sig = this.urEngine.parseTronSignature(responseUr);
          KeystoneAdapter._assertRequestIdMatches(requestId, sig.requestId);
          // Keystone signs the exact rawTxHex bytes it was given and returns
          // only the bare signature — unlike EVM/BTC there's no host-side
          // re-encoding step, so `serializedTx` stays unset (the caller
          // already has the raw tx it sent in).
          return success<TronSignedTx>({ signature: sig.signature });
        }
      );
    } catch (err) {
      return this._errorToFailure<TronSignedTx>(err);
    }
  }

  async tronSignMessage(
    _connectId?: NullableCallArg<string>,
    _deviceId?: NullableCallArg<string>,
    _params?: NullableCallArg<IHardwareCallParams<TronSignMsgParams>>
  ): Promise<Response<TronSignature>> {
    // `TronSignRequest`'s `signType` field DOES have message-signing modes
    // (SignMessage / SignMessageV2, alongside Transaction) — this isn't a
    // protocol gap the way tronSignTransaction's rawTxHex requirement is.
    // Left unimplemented because which of the two message variants a real
    // device actually expects for a plain personal-message sign isn't
    // verified yet — picking the wrong one would silently produce a
    // signature over the wrong preimage. A real, bounded follow-up, not an
    // oversight.
    return this._unsupported(
      'tronSignMessage',
      'Keystone TRON message signing needs signType V1-vs-V2 verified against real hardware first — not wired in'
    );
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private _mfpFromConnectId(connectId: string): string | undefined {
    return connectId?.startsWith(QR_CONNECT_ID_PREFIX)
      ? connectId.slice(QR_CONNECT_ID_PREFIX.length)
      : undefined;
  }

  /**
   * Handles both connectId shapes a caller might hand back: the QR-style
   * `keystone-qr:<mfp>` prefix, and a bare mfp — which is exactly what a
   * USB session's `sessionId`/`connectId` is (see `KeystoneUsbConnectorBase`
   * and `_connectUsb`).
   */
  private _findByConnectId(connectId: string): KeystoneDeviceRecord | undefined {
    const mfp = this._mfpFromConnectId(connectId) ?? connectId?.toLowerCase();
    return mfp ? this._devices.get(mfp) : undefined;
  }

  /**
   * Folds a parsed account-response UR into the device table. `viaUsb`
   * (defaults false) says which channel actually carried this round trip —
   * `_resolveUr` routes a KeyDerivation sync over USB when the target record
   * already has a live session, so this must NOT unconditionally mark
   * `qrSynced`, or a USB-only wallet would wrongly survive a later USB
   * disconnect as a "QR-synced, demote to QR-only" entry instead of being
   * dropped outright (see `disconnectDevice`).
   */
  private _upsertDeviceRecord(
    parsed: KeystoneParsedMultiAccounts,
    options?: { viaUsb?: boolean }
  ): KeystoneDeviceRecord {
    const mfp = parsed.masterFingerprint;
    let record = this._devices.get(mfp);
    const isNew = !record;
    if (!record) {
      record = createDeviceRecord(mfp);
      this._devices.set(mfp, record);
    }
    record.model = parsed.device ?? record.model;
    record.deviceVersion = parsed.deviceVersion ?? record.deviceVersion;
    if (!options?.viaUsb) record.qrSynced = true;

    const info = toDeviceInfo(record);
    const eventType = isNew ? DEVICE.CONNECT : DEVICE.CHANGED;
    this.emitter.emit(eventType, { type: eventType, payload: info });
    return record;
  }

  /**
   * Opens+claims whatever Keystone the USB connector currently has
   * permission for, learns its mfp via `getAppConfig`, and merges it into
   * the device table by that mfp — a QR-synced entry becomes
   * `{qr, usb}`-capable in place (one `device-changed`, not a second
   * `device-connect`); a wallet never seen before becomes a new USB-only
   * entry. See §4.2 of the design doc.
   */
  private async _connectUsb(): Promise<Response<DeviceInfo>> {
    if (!this._usbConnector) {
      return failure(
        HardwareErrorCode.TransportNotAvailable,
        'No USB connector configured for this Keystone adapter'
      );
    }
    try {
      const session = await this._usbConnector.connect();
      const mfp = session.deviceInfo.deviceId.toLowerCase();
      let record = this._devices.get(mfp);
      const isNew = !record;
      if (!record) {
        record = createDeviceRecord(mfp);
        this._devices.set(mfp, record);
      }
      record.model = session.deviceInfo.modelName ?? session.deviceInfo.model ?? record.model;
      record.deviceVersion = session.deviceInfo.firmwareVersion ?? record.deviceVersion;
      record.usbSessionId = session.sessionId;

      const info = toDeviceInfo(record);
      const eventType = isNew ? DEVICE.CONNECT : DEVICE.CHANGED;
      this.emitter.emit(eventType, { type: eventType, payload: info });
      return success(info);
    } catch (err) {
      return this._errorToFailure<DeviceInfo>(err);
    }
  }

  /**
   * The one place that decides QR vs. USB for a UR round trip and carries it
   * out. `record` is the (possibly not-yet-existing, for a true cold start)
   * device row for the target wallet — USB is only used when `record`
   * already has a live `usbSessionId` (a session comes from an explicit
   * `connectDevice()`, never conjured mid-call — see the class doc). A
   * `switchTransport('qr')` pin forces QR even for a USB-attached wallet;
   * `switchTransport('usb')` on a wallet with no live USB session fails
   * closed rather than silently falling back to QR.
   */
  private async _resolveUr(
    record: KeystoneDeviceRecord | undefined,
    requestUr: KeystoneUr,
    animated: boolean
  ): Promise<KeystoneUr> {
    const wantUsb =
      this._forcedTransport === 'usb' ||
      (this._forcedTransport !== 'qr' && Boolean(record?.usbSessionId));

    if (wantUsb) {
      if (!record?.usbSessionId || !this._usbConnector) {
        throw createHwkError({
          code: HardwareErrorCode.TransportNotAvailable,
          message: 'USB channel is not connected for this Keystone wallet',
        });
      }
      const result = await this._usbConnector.call(record.usbSessionId, 'resolveUr', requestUr);
      if (!result.success) throw rehydrateConnectorError(result.error);
      return result.payload as KeystoneUr;
    }

    const displayDevice = record ? toDeviceInfo(record) : placeholderDeviceInfo();
    return this._requestQrDisplayAndAwaitResponse(displayDevice, { ...requestUr, animated });
  }

  /**
   * Resolve (syncing over QR if needed) the account cached for `hwkChain` at
   * `syncPath`. Drives the "implicit account sync, then the real request" two
   * hop flow the first time a wallet/path pair is seen; a cache hit skips
   * straight to the caller's own round trip.
   */
  private async _ensureAccountSynced(
    connectId: string | undefined,
    deviceId: string | undefined,
    hwkChain: ChainCapability,
    syncPath: string,
    signal: AbortSignal
  ): Promise<{ record: KeystoneDeviceRecord; account: KeystoneAccountEntry }> {
    const wantMfp = deviceId ? deviceId.toLowerCase() : this._mfpFromConnectId(connectId ?? '');
    const key = accountKey(hwkChain, syncPath);

    const existingRecord = wantMfp ? this._devices.get(wantMfp) : undefined;
    const cached = existingRecord?.accounts.get(key);
    if (existingRecord && cached) {
      return { record: existingRecord, account: cached };
    }

    const requestUr = this.urEngine.buildKeyDerivationRequest({
      schemas: [{ path: syncPath, curve: hwkChain === 'sol' ? 'ed25519' : 'secp256k1' }],
      origin: this._origin,
    });
    const responseUr = await this._resolveUr(existingRecord, requestUr, false);
    KeystoneAdapter._throwIfAborted(signal);

    const parsed = this.urEngine.parseAccountResponse(responseUr);
    if (wantMfp && parsed.masterFingerprint !== wantMfp) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: `Scanned Keystone wallet (mfp ${parsed.masterFingerprint}) does not match the requested device (${wantMfp})`,
      });
    }

    const record = this._upsertDeviceRecord(parsed, {
      viaUsb: Boolean(existingRecord?.usbSessionId),
    });
    const account = parsed.accounts.find(a => normalizePath(a.path) === syncPath);
    if (!account) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: `Keystone did not return the requested derivation path (${syncPath})`,
      });
    }
    const entry: KeystoneAccountEntry = { ...account, hwkChain };
    record.accounts.set(key, entry);
    return { record, account: entry };
  }

  /**
   * Like `_ensureAccountSynced`, but for operations (PSBT signing, master
   * fingerprint) that only need to know WHICH wallet is attached, not a
   * specific cached path. Syncs the account-level path for `chain` as a
   * throwaway probe when the mfp isn't already known.
   *
   * `CHAIN_FINGERPRINT_PATHS[chain]` is a 5-segment LEAF path for `evm`
   * (`m/44'/60'/0'/0/0`) — sending that verbatim as a KeyDerivation request
   * asks Keystone for a non-standard path. Keystone's own docs
   * (dev.keyst.one's multichain KeyDerivation example) show the ETH
   * account-level path as `m/44'/60'/0'` (3 segments), same as what
   * `DEFAULT_IMPORT_SCHEMAS`/`_ensureAccountSynced` already request — so
   * truncate through `splitAccountPath` here too instead of using the raw
   * fingerprint leaf path. `btc`/`sol` are already 3-segment account paths
   * and pass through unchanged.
   */
  private async _ensureMfpKnown(
    connectId: string | undefined,
    deviceId: string | undefined,
    chain: ChainForFingerprint,
    signal: AbortSignal
  ): Promise<{ record: KeystoneDeviceRecord }> {
    const wantMfp = deviceId ? deviceId.toLowerCase() : this._mfpFromConnectId(connectId ?? '');
    const existing = wantMfp ? this._devices.get(wantMfp) : undefined;
    if (existing) return { record: existing };

    // No existing record for this mfp (or the mfp isn't known yet at all) —
    // a USB session can only exist on a record already in `_devices`, so
    // there is nothing to route over USB here; this is always a QR round
    // trip (`_resolveUr(undefined, ...)` falls back to QR on its own).
    const { accountPath } = splitAccountPath(CHAIN_FINGERPRINT_PATHS[chain]);
    const requestUr = this.urEngine.buildKeyDerivationRequest({
      schemas: [{ path: accountPath, curve: chain === 'sol' ? 'ed25519' : 'secp256k1' }],
      origin: this._origin,
    });
    const responseUr = await this._resolveUr(undefined, requestUr, false);
    KeystoneAdapter._throwIfAborted(signal);

    const parsed = this.urEngine.parseAccountResponse(responseUr);
    if (wantMfp && parsed.masterFingerprint !== wantMfp) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: `Scanned Keystone wallet (mfp ${parsed.masterFingerprint}) does not match the requested device (${wantMfp})`,
      });
    }
    return { record: this._upsertDeviceRecord(parsed) };
  }

  private async _requestQrDisplayAndAwaitResponse(
    device: DeviceInfo,
    data: QrDisplayData
  ): Promise<KeystoneUr> {
    const waitPromise = this._uiRegistry.wait<{ urType: string; urData: string }>(
      UI_REQUEST.REQUEST_QR_DISPLAY,
      { timeoutMs: this._qrTimeoutMs }
    );
    this.emitter.emit(UI_REQUEST.REQUEST_QR_DISPLAY, {
      type: UI_REQUEST.REQUEST_QR_DISPLAY,
      payload: { device, data },
    });
    const response = await waitPromise;
    return { urType: response.urType, urData: response.urData };
  }

  private async _requestQrScanAndAwaitResponse(device: DeviceInfo): Promise<KeystoneUr> {
    const waitPromise = this._uiRegistry.wait<{ urType: string; urData: string }>(
      UI_REQUEST.REQUEST_QR_SCAN,
      { timeoutMs: this._qrTimeoutMs }
    );
    this.emitter.emit(UI_REQUEST.REQUEST_QR_SCAN, {
      type: UI_REQUEST.REQUEST_QR_SCAN,
      payload: { device },
    });
    const response = await waitPromise;
    return { urType: response.urType, urData: response.urData };
  }

  private static _throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new Error('Operation aborted');
    }
  }

  private static _assertRequestIdMatches(expected: string, actual?: string): void {
    if (actual && actual.toLowerCase() !== expected.toLowerCase()) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message:
          'Keystone response requestId does not match the pending request — discarding a stale or unrelated scan',
      });
    }
  }

  private _unsupported<T>(method: string, reason: string): Promise<Response<T>> {
    return Promise.resolve(
      failure(
        HardwareErrorCode.MethodNotSupported,
        `KeystoneAdapter.${method} is not implemented yet: ${reason}`
      )
    );
  }

  private _errorToFailure<T>(err: unknown): Response<T> {
    if (err && typeof err === 'object') {
      const e = err as {
        code?: unknown;
        message?: string;
        params?: Record<string, unknown>;
        _tag?: string;
      };
      if (typeof e.code === 'number') {
        return failure(e.code as HardwareErrorCode, e.message ?? 'Unknown error', e.params);
      }
      if (e._tag === UI_REQUEST_CANCELLED_TAG || e._tag === UI_REQUEST_PREEMPTED_TAG) {
        return failure(
          HardwareErrorCode.UserAborted,
          e.message ?? 'Keystone QR interaction was cancelled'
        );
      }
      if (e._tag === UI_REQUEST_TIMEOUT_TAG) {
        return failure(
          HardwareErrorCode.OperationTimeout,
          e.message ?? 'Keystone QR interaction timed out'
        );
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    // An unrecognized JS error (not a coded HwkError) reaching here is
    // usually a real bug, not a device/user condition — keep the stack so
    // the app/demo can surface it without needing a debugger attached.
    const params = err instanceof Error && err.stack ? { stack: err.stack } : undefined;
    return failure(HardwareErrorCode.UnknownError, message, params);
  }
}
