import bs58 from 'bs58';
import { v4 as uuidv4 } from 'uuid';
import {
  CHAIN_FINGERPRINT_PATHS,
  DEVICE,
  DeviceJobQueue,
  HardwareErrorCode,
  InteractionRegistry,
  SDK,
  TypedEventEmitter,
  UI_REQUEST,
  UI_REQUEST_CANCELLED_TAG,
  UI_REQUEST_PREEMPTED_TAG,
  UI_REQUEST_TIMEOUT_TAG,
  UI_RESPONSE,
  UiRequestRegistry,
  createHardwareSearchTargetId,
  createHwkError,
  deriveDeviceFingerprint,
  ensure0x,
  failure,
  getAllNetworkMethodChain,
  hasHardwareRuntimeIdPrefix,
  isAllNetworkMethodName,
  isHardwareInteractionId,
  isHwkRecoveryHint,
  operationMayHaveCompletedParams,
  parseBip32MasterFingerprint,
  parseHardwareRuntimeId,
  rehydrateConnectorError,
  resolveHardwareOperationTarget as resolveGenericHardwareOperationTarget,
  runAllNetworkGetAddress,
  stripHex,
  success,
} from '@onekeyfe/hwk-adapter-core';

import { KeystoneUrEngine } from '../urEngine/KeystoneUrEngine';
import { TronSignType } from '../urEngine/TronSignRequest';
import {
  KEYSTONE_WALLET_CONNECT_ID_PREFIX,
  KEYSTONE_WALLET_ID_PATH,
  accountKey,
  createDeviceRecord,
  deriveKeystoneWalletId,
  placeholderDeviceInfo,
  toDeviceInfo,
} from './deviceTable';
import {
  KEYSTONE_BTC_ACCOUNT_FORBIDDEN_MESSAGE,
  btcScriptTypeFromPath,
  isKeystoneSignableBtcAccountPath,
  normalizePath,
  splitAccountPath,
} from './pathUtils';

import type { KeystoneParsedMultiAccounts, KeystoneUr } from '../urEngine/types';
import type { KeystoneAccountEntry, KeystoneDeviceRecord } from './deviceTable';

/**
 * Key material for one operation, keyed by `accountKey()`; never retained.
 */
type AccountBook = Map<string, KeystoneAccountEntry>;
import type {
  AllNetworkAddressParams,
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
  ConnectionTarget,
  ConnectorCallResult,
  ConnectorConnectTarget,
  ConnectorDevice,
  ConnectorEventMap,
  DeviceEventListener,
  DeviceInfo,
  DeviceSearchTarget,
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
  IHardwareCommonCallParams,
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

const KEYSTONE_USB_DEBUG_PREFIX = '[KEYSTONE-USB-DEBUG]';

// Keystone briefly leaves the USB bus while entering external-wallet mode.
// A persisted-wallet call can therefore race the macOS/Chromium re-enumeration
// and must not fall back to QR after a single empty snapshot.
const KEYSTONE_USB_REATTACH_PROBE_ATTEMPTS = 4;
const KEYSTONE_USB_REATTACH_PROBE_INTERVAL_MS = 500;

function stringifyKeystoneUsbDebugValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({
      stringifyError: error instanceof Error ? error.message : String(error),
    });
  }
}

function debugKeystoneUsb(label: string, value?: unknown): void {
  if (process.env.NODE_ENV === 'production') return;
  const valueText = value === undefined ? '' : ` ${stringifyKeystoneUsbDebugValue(value)}`;
  // eslint-disable-next-line no-console
  console.log(`${KEYSTONE_USB_DEBUG_PREFIX} sdk-adapter trace-v1 ${label}${valueText}`);
}

let usbDebugSequence = 0;
const usbDebugRuntimeRefs = new Map<string, number>();
let usbDebugRuntimeSequence = 0;

function debugTarget(value?: string | null): unknown {
  if (process.env.NODE_ENV === 'production') return undefined;
  if (!value) return { kind: 'absent' };
  const parsed = parseHardwareRuntimeId(value);
  if (!parsed) {
    return {
      kind: hasHardwareRuntimeIdPrefix(value) ? 'invalid-runtime-id' : 'persistent-or-legacy-id',
    };
  }
  let ref = usbDebugRuntimeRefs.get(value);
  if (ref === undefined) {
    ref = ++usbDebugRuntimeSequence;
    // Keep temporary diagnostics bounded; never print the opaque ID itself.
    if (usbDebugRuntimeRefs.size >= 256) {
      const oldest = usbDebugRuntimeRefs.keys().next().value;
      if (oldest !== undefined) usbDebugRuntimeRefs.delete(oldest);
    }
    usbDebugRuntimeRefs.set(value, ref);
  }
  return {
    ref,
    kind: parsed.kind,
    vendor: parsed.vendor,
    connectionType: parsed.kind === 'interaction' ? undefined : parsed.connectionType,
  };
}

async function traceUsbWait<T>(label: string, task: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === 'production') return task();
  const operation = ++usbDebugSequence;
  const started = Date.now();
  const state = () => ({ operation, elapsedMs: Date.now() - started });
  debugKeystoneUsb(`${label}-start`, state());
  // Observe pending work without cancelling or changing transport timeouts.
  const timer = setInterval(() => debugKeystoneUsb(`${label}-pending`, state()), 5000);
  try {
    const result = await task();
    debugKeystoneUsb(`${label}-complete`, state());
    return result;
  } catch (error) {
    debugKeystoneUsb(`${label}-failed`, {
      ...state(),
      errorName: error instanceof Error ? error.name : typeof error,
    });
    throw error;
  } finally {
    clearInterval(timer);
  }
}

function resolveHardwareOperationTarget(
  positionalTargetId: string | null | undefined,
  interactionId: string | null | undefined
) {
  const result = resolveGenericHardwareOperationTarget(
    positionalTargetId,
    interactionId,
    'keystone'
  );
  debugKeystoneUsb('operation-target-decision', {
    positional: debugTarget(positionalTargetId),
    explicitInteraction: debugTarget(interactionId),
    success: result.success,
    selectedInteraction: result.success ? debugTarget(result.payload.interactionId) : undefined,
  });
  return result;
}

function keystoneIdentityDebugTag(kind: string, value: string | undefined): string | undefined {
  return value ? deriveDeviceFingerprint(`keystone-identity-debug:${kind}:${value}`) : undefined;
}

function waitForKeystoneUsbReattachProbe(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, KEYSTONE_USB_REATTACH_PROBE_INTERVAL_MS);
  });
}

function isKeystoneUsbReconnectableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code } = error as { code?: unknown };
  return code === HardwareErrorCode.DeviceNotFound || code === HardwareErrorCode.DeviceDisconnected;
}

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
 * the multi-purpose BTC requests, since this
 * function decides which hwkChain a returned account belongs to regardless
 * of what was explicitly asked for.
 */
function inferHwkChainFromPath(path: string): ChainCapability | undefined {
  const match = normalizePath(path).match(/^m\/\d+'\/(\d+)'/);
  return match ? BIP44_COIN_TYPE_TO_CHAIN[Number(match[1])] : undefined;
}

export interface ImportFromQrOptions {
  /**
   * 'request': ask the device for the fixed identity xpub via a
   * `qr-hardware-call` (KeyDerivation) UR. 'scan': just wait for whatever
   * multi-account/HD-key export the device is already showing. Either way
   * only the wallet identity is learned; key material is never retained.
   */
  mode?: 'request' | 'scan';
}

/**
 * Keystone hardware wallet adapter — QR and USB channels merged behind one
 * `IHardwareWallet` surface, keyed by a SHA-256 wallet id derived from one
 * fixed account-level xpub. The 32-bit master fingerprint remains BC-UR
 * protocol metadata only:
 * a caller sees the same `evmSignTransaction(...)` call regardless of which
 * channel actually carries it. Internally, a chain method's UR round trip
 * either drives one or two `REQUEST_QR_DISPLAY`/`REQUEST_QR_SCAN` UI events
 * (QR) or a direct `IConnector.call(sessionId, 'resolveUr', ur)` (USB) — see
 * `_resolveUr`.
 *
 * QR has no physical device to enumerate. An explicit QR discovery returns a
 * virtual connection target, and `connectDevice()` performs the account-sync
 * round trip. Chain methods can still use null `connectId`/`deviceId` for an
 * implicit cold start. USB sessions require the same explicit
 * `searchDevices()` + `connectDevice()` sequence, with discovery returning a
 * physical transport target. A chain call carrying a persisted 64-hex wallet
 * identity also attempts to restore USB before falling back to QR, so a host
 * restart does not discard the user's already-authorized USB route. Once a USB
 * session exists for a wallet id, later calls for that wallet route over USB
 * automatically (unless pinned via `switchTransport`) — matching
 * docs/design/keystone-integration/README.md §4.3.
 */
export class KeystoneAdapter implements IHardwareWallet {
  readonly vendor = 'keystone' as const;

  private readonly urEngine: KeystoneUrEngine;

  private readonly emitter = new TypedEventEmitter<HardwareEventMap>();

  private readonly _interactionRoutes = new Map<
    string,
    { interactionId: string; connectionType: 'usb' | 'qr' }
  >();

  private readonly _interactions = new InteractionRegistry({
    vendor: 'keystone',
    onEnded: (interaction, reason) => {
      const route = this._interactionRoutes.get(interaction.connectId);
      debugKeystoneUsb('interaction-ended', {
        interaction: debugTarget(interaction.interactionId),
        reason,
        routeFound: Boolean(route),
        ownsCurrentRoute: route?.interactionId === interaction.interactionId,
      });
      if (route?.interactionId === interaction.interactionId) {
        this._interactionRoutes.delete(interaction.connectId);
      }
      this.emitter.emit(SDK.INTERACTION_ENDED, {
        type: SDK.INTERACTION_ENDED,
        payload: { interactionId: interaction.interactionId, reason },
      });
      if (reason === 'timeout') {
        this._releaseInteractionConnection(interaction).catch(() => undefined);
      }
    },
  });

  private readonly _uiRegistry = new UiRequestRegistry();

  private readonly _jobQueue: DeviceJobQueue;

  private readonly _devices = new Map<string, KeystoneDeviceRecord>();

  private readonly _searchDeviceTargets = new Map<string, 'usb' | 'qr'>();

  private _activeSearchGeneration: symbol | undefined;

  private readonly _origin: string;

  /** How long to wait for the app to answer a `REQUEST_QR_DISPLAY`/`REQUEST_QR_SCAN` before failing. Defaults to the registry's own 10-minute default. */
  private readonly _qrTimeoutMs: number | undefined;

  /** Optional USB `IConnector` — supplied by the host app (DI, same pattern as Trezor/Ledger), e.g. via `createKeystoneWebUsbConnector()` from `@onekeyfe/hwk-keystone-connector-usb`. Undefined means QR-only. */
  private readonly _usbConnector: IConnector | undefined;

  /** Serializes USB open/identity handshakes that run outside the job queue. */
  private _usbConnectTail: Promise<void> = Promise.resolve();

  private readonly _unsettledUsbOperations = new Map<string, number>();

  private readonly _usbIdleWaiters = new Set<() => void>();

  private _usbTeardownTail: Promise<void> = Promise.resolve();

  private _pendingUsbTeardowns = 0;

  /** Explicit `switchTransport` pin. `undefined` means "auto": USB when a live session exists for the target wallet, else QR. */
  private _forcedTransport: 'qr' | 'usb' | undefined;

  private readonly _handleUsbDisconnect = ({ connectId }: { connectId: string }): void => {
    const record = Array.from(this._devices.values()).find(item => item.usbSessionId === connectId);
    if (!record) return;

    this._interactions.endByConnectionKey(connectId, 'disconnect');
    this._interactions.endByConnectionKey(record.connectId, 'disconnect');

    record.usbSessionId = undefined;
    const info = toDeviceInfo(record);
    if (record.qrSynced) {
      this.emitter.emit(DEVICE.CHANGED, { type: DEVICE.CHANGED, payload: info });
    } else {
      this._devices.delete(record.walletId);
      this.emitter.emit(DEVICE.DISCONNECT, { type: DEVICE.DISCONNECT, payload: info });
    }
  };

  private readonly _handleUsbUiEvent = (event: ConnectorEventMap['ui-event']): void => {
    this.emitter.emit('ui-event', event);
  };

  constructor(options?: { origin?: string; qrTimeoutMs?: number; usbConnector?: IConnector }) {
    this._origin = options?.origin ?? 'OneKey';
    this._qrTimeoutMs = options?.qrTimeoutMs;
    this.urEngine = new KeystoneUrEngine(this._origin);
    this._jobQueue = new DeviceJobQueue();
    this._usbConnector = options?.usbConnector;
    debugKeystoneUsb('created', { hasUsbConnector: Boolean(this._usbConnector) });
    this._usbConnector?.on('device-disconnect', this._handleUsbDisconnect);
    // Relay connector interaction events (ConfirmOnDevice / InteractionComplete
    // around every USB UR round trip) to the host verbatim — same pass-through
    // the Ledger adapter does, so hosts reuse one handler for both vendors.
    this._usbConnector?.on('ui-event', this._handleUsbUiEvent);
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

  async dispose(): Promise<void> {
    this._interactions.endAll('runtime-reset');
    this._uiRegistry.cancel();
    this._jobQueue.clear();
    this._searchDeviceTargets.clear();
    await this._resetUsbSessions();
    this._usbConnector?.off('device-disconnect', this._handleUsbDisconnect);
    this._usbConnector?.off('ui-event', this._handleUsbUiEvent);
    this._usbConnector?.reset();
    this._devices.clear();
    this.emitter.removeAllListeners();
  }

  // ---------------------------------------------------------------------------
  // Device table
  // ---------------------------------------------------------------------------

  /**
   * Unscoped discovery includes QR-synced wallets already known to this
   * adapter. Explicit QR discovery returns a virtual connection target because
   * there is no physical descriptor to enumerate. When a USB connector is
   * configured, its raw scan results are appended as-is: a USB descriptor has
   * no mfp until `connectDevice()` actually opens+claims it (see
   * `KeystoneUsbConnectorBase.searchDevices`), so these entries carry an
   * empty `deviceId` and exist purely so a host can list "plugged in, click
   * to connect" candidates.
   */
  async searchDevices(options?: SearchDevicesOptions): Promise<DeviceInfo[]> {
    const searchGeneration = Symbol('keystone-device-search');
    this._activeSearchGeneration = searchGeneration;
    this._searchDeviceTargets.clear();
    if (options?.resetSession) {
      await this._resetUsbSessions();
    } else {
      await this._usbTeardownTail;
    }
    const known = Array.from(this._devices.values()).map(toDeviceInfo);

    // QR has no physical descriptor to enumerate. Return one virtual target so
    // the host can keep the common search -> connect flow without starting a
    // wallet protocol round trip during discovery.
    if (options?.transportType === 'qr') {
      const searchTargetId = createHardwareSearchTargetId({
        vendor: 'keystone',
        connectionType: 'qr',
      });
      this._searchDeviceTargets.set(searchTargetId, 'qr');
      return [
        {
          ...placeholderDeviceInfo(),
          model: '',
          connectId: searchTargetId,
          capabilities: { persistentDeviceIdentity: false },
        },
      ];
    }

    if (options?.transportType === 'ble') return [];
    if (!this._usbConnector) return options?.transportType === 'usb' ? [] : known;

    let usbDevices: ConnectorDevice[];
    try {
      usbDevices = await this._usbConnector.searchDevices();
    } catch (error) {
      // A USB scan failing (no WebUSB support, permission not yet granted,
      // etc.) must not sink the QR-known devices this instance already has.
      if (options?.transportType === 'usb') throw error;
      return known;
    }
    if (this._activeSearchGeneration !== searchGeneration) return [];
    const placeholders: DeviceInfo[] = usbDevices.map(d => ({
      vendor: 'keystone',
      // Empty, not 'unknown': enumeration genuinely cannot tell the model
      // apart (every Keystone shares one vid/pid), and a literal placeholder
      // string would beat the host's own default-name fallback and surface as
      // a device called "unknown".
      model: d.model ?? '',
      modelName: d.modelName,
      // Placeholders — neither is knowable until the device is opened.
      firmwareVersion: '0.0.0',
      deviceId: d.deviceId,
      connectId: d.connectId,
      connectionType: 'usb',
      // The USB product name, which IS readable at enumeration time.
      label: d.name,
      serialNumber: d.serialNumber,
      capabilities: d.capabilities ?? { persistentDeviceIdentity: false },
      raw: d.raw,
    }));
    for (const placeholder of placeholders) {
      this._searchDeviceTargets.set(placeholder.connectId, 'usb');
    }
    return options?.transportType === 'usb' ? placeholders : [...known, ...placeholders];
  }

  private async _resetUsbSessions(): Promise<void> {
    await this._runUsbTeardown(async () => {
      await this._usbConnectTail;
      this._interactions.endAll('runtime-reset');
      if (!this._usbConnector) return;

      const sessionIds = new Set(
        Array.from(this._devices.values())
          .map(record => record.usbSessionId)
          .filter((sessionId): sessionId is string => Boolean(sessionId))
      );
      for (const sessionId of sessionIds) {
        try {
          await this._usbConnector.disconnect(sessionId);
        } catch {
          // The adapter state is still retired below so a stale session cannot
          // be selected after an explicit reset.
        }
        this._handleUsbDisconnect({ connectId: sessionId });
      }
    });
  }

  async searchDeviceTargets(options?: SearchDevicesOptions): Promise<DeviceSearchTarget[]> {
    const devices = await this.searchDevices(options);
    return devices.map(device => ({
      searchTargetId: device.connectId,
      // Keystone's wallet id is stable only after the USB/QR handshake. The
      // selectable handle remains owned by the current discovery snapshot.
      searchTargetReusePolicy: 'current-discovery',
      vendor: device.vendor,
      connectionType: device.connectionType,
      kind: device.connectionType === 'qr' ? 'interactive' : 'physical',
      label: device.label,
      model: device.model,
      modelName: device.modelName,
      serialNumber: device.serialNumber,
    }));
  }

  async listConnectionTargets(options?: SearchDevicesOptions): Promise<ConnectionTarget[]> {
    const targets = await this.searchDeviceTargets(options);
    return targets.map(({ searchTargetId, ...target }) => ({
      ...target,
      targetId: searchTargetId,
    }));
  }

  async connectDevice(searchTargetId: string): Promise<Response<string>> {
    try {
      let connected: Response<DeviceInfo>;
      let selectedConnectionType: 'usb' | 'qr';
      const discoveredConnectionType = this._searchDeviceTargets.get(searchTargetId);
      debugKeystoneUsb('connect-target-decision', {
        target: debugTarget(searchTargetId),
        discoveryHit: Boolean(discoveredConnectionType),
        discoveredConnectionType,
        hasUsbConnector: Boolean(this._usbConnector),
      });
      if (discoveredConnectionType === 'qr') {
        selectedConnectionType = 'qr';
        connected = await this.importFromQr();
      } else if (discoveredConnectionType === 'usb') {
        selectedConnectionType = 'usb';
        if (!this._usbConnector) {
          return failure(
            HardwareErrorCode.TransportNotAvailable,
            'No USB connector configured for this Keystone adapter'
          );
        }
        connected = await this._connectUsb({}, searchTargetId);
      } else if (hasHardwareRuntimeIdPrefix(searchTargetId)) {
        debugKeystoneUsb('connect-target-rejected', { reason: 'not-in-current-discovery' });
        return failure(
          HardwareErrorCode.DeviceNotFound,
          'Keystone search target has expired; search for devices again',
          undefined,
          undefined,
          { scope: 'search-target' }
        );
      } else {
        const target = this._resolveTarget(searchTargetId);
        if (target.record) {
          selectedConnectionType = target.record.usbSessionId ? 'usb' : 'qr';
          debugKeystoneUsb('connect-record-reused', { selectedConnectionType });
          connected = success(toDeviceInfo(target.record));
        } else if (!this._usbConnector) {
          return failure(
            HardwareErrorCode.DeviceNotFound,
            `Unknown Keystone device search target: ${searchTargetId}`
          );
        } else {
          selectedConnectionType = 'usb';
          connected = await this._connectUsb(target);
        }
      }
      if (!connected.success) return connected;

      const record = this._devices.get(connected.payload.deviceId);
      debugKeystoneUsb('interaction-replace-start', {
        selectedConnectionType,
        hasRecord: Boolean(record),
        hasUsbSession: Boolean(record?.usbSessionId),
      });
      this._interactions.endByConnectionKey(connected.payload.connectId, 'explicit');
      const interaction = this._interactions.create({
        searchTargetId,
        connectId: connected.payload.connectId,
        device: connected.payload,
        connectionKeys:
          selectedConnectionType === 'usb' && record?.usbSessionId ? [record.usbSessionId] : [],
      });
      this._interactionRoutes.set(connected.payload.connectId, {
        interactionId: interaction.interactionId,
        connectionType: selectedConnectionType,
      });
      debugKeystoneUsb('interaction-created', {
        interaction: debugTarget(interaction.interactionId),
        searchTarget: debugTarget(searchTargetId),
        session: debugTarget(record?.usbSessionId),
        selectedConnectionType,
        connectionKeyCount: interaction.connectionKeys.length,
      });
      return success(interaction.interactionId);
    } catch (err) {
      return this._errorToFailure<string>(err);
    }
  }

  /**
   * QR has no persistent connection to tear down — the account cache
   * survives so a later call resumes without re-syncing. For a USB session,
   * this closes the connector session and either demotes the record back to
   * QR-only (if it was ever QR-synced) or removes it entirely (pure-USB
   * wallet that was never seen over QR) — see §4.2 of the design doc.
   */
  async releaseInteraction(interactionId: string): Promise<void> {
    const interaction = this._interactions.find(interactionId);
    debugKeystoneUsb('interaction-release-request', {
      interaction: debugTarget(interactionId),
      found: Boolean(interaction),
    });
    if (!interaction) {
      this._interactions.resolve(interactionId);
      return;
    }
    const endedInteraction = this._interactions.end(interactionId, 'explicit');
    if (!endedInteraction) return;
    await this._releaseInteractionConnection(endedInteraction);
  }

  private async _releaseInteractionConnection(
    interaction: NonNullable<ReturnType<InteractionRegistry['find']>>
  ): Promise<void> {
    const { connectId } = interaction;
    let record: KeystoneDeviceRecord | undefined;
    try {
      record = this._resolveTarget(connectId).record;
    } catch {
      return;
    }
    const ownsSession = Boolean(
      record?.usbSessionId && interaction.connectionKeys.includes(record.usbSessionId)
    );
    debugKeystoneUsb('interaction-release-ownership', {
      interaction: debugTarget(interaction.interactionId),
      session: debugTarget(record?.usbSessionId),
      hasRecord: Boolean(record),
      ownsSession,
    });
    if (!record?.usbSessionId || !interaction.connectionKeys.includes(record.usbSessionId)) {
      return;
    }

    const { usbSessionId } = record;
    await this._runUsbTeardown(async () => {
      if (this._usbConnector) {
        try {
          await this._usbConnector.disconnect(usbSessionId);
        } catch {
          // Best-effort teardown — local routing state is cleared below either way.
        }
      }
      this._handleUsbDisconnect({ connectId: usbSessionId });
    });
  }

  getDeviceInfo(connectIdOrInteractionId: string, deviceId: string): Promise<Response<DeviceInfo>> {
    try {
      const connectId = isHardwareInteractionId(connectIdOrInteractionId)
        ? this._interactions.resolve(connectIdOrInteractionId).connectId
        : connectIdOrInteractionId;
      const { record } = this._resolveTarget(connectId, deviceId);
      if (!record) {
        return Promise.resolve(
          failure(
            HardwareErrorCode.DeviceNotFound,
            `Unknown Keystone device: ${connectId || deviceId}`
          )
        );
      }
      return Promise.resolve(success(toDeviceInfo(record)));
    } catch (err) {
      return Promise.resolve(this._errorToFailure<DeviceInfo>(err));
    }
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
    const activeJobId = this._jobQueue.getActiveJob()?.deviceId;
    const targetId = connectId ?? activeJobId;
    this._jobQueue.cancelActiveAndPending(
      targetId && isHardwareInteractionId(targetId) ? activeJobId ?? targetId : targetId,
      reason
    );
  }

  getChainFingerprint(
    connectId: string,
    deviceId: string,
    chain: ChainForFingerprint
  ): Promise<Response<string>> {
    try {
      const target = this._resolveTarget(connectId, deviceId);
      const walletId = target.record?.walletId ?? target.expectedWalletId;
      if (!walletId) {
        return Promise.resolve(
          failure(HardwareErrorCode.DeviceNotFound, 'Unknown Keystone wallet identity')
        );
      }
      return Promise.resolve(success(deriveDeviceFingerprint(`keystone:${chain}:${walletId}`)));
    } catch (err) {
      return Promise.resolve(this._errorToFailure<string>(err));
    }
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

        if (options.mode === 'scan') {
          responseUr = await this._requestQrScanAndAwaitResponse(displayDevice);
        } else {
          // Identity only; key material is never retained.
          const requestUr = this.urEngine.buildKeyDerivationRequest({
            schemas: [{ path: KEYSTONE_WALLET_ID_PATH, curve: 'secp256k1' }],
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
    const operationTarget = resolveHardwareOperationTarget(connectId, params.interactionId);
    if (!operationTarget.success) return operationTarget;
    const effectiveConnectId = operationTarget.payload.targetId ?? '';
    const { interactionId } = operationTarget.payload;
    try {
      const prefetched = await this._prefetchAllNetworkAccounts(
        effectiveConnectId,
        deviceId,
        params
      );
      const { book } = prefetched;
      // Implicit cold start (no connectId/deviceId): the prefetch round trip
      // just established the wallet identity, so route the per-item calls to
      // it instead of resolving an empty target and re-syncing per item.
      const itemDeviceId = deviceId || prefetched.walletId || '';
      return await runAllNetworkGetAddress({
        connectId: effectiveConnectId,
        deviceId: itemDeviceId,
        params,
        callItem: async ({ method, item }) => {
          const commonArgs = {
            path: item.path,
            showOnDevice: item.showOnDevice,
            interactionId,
          };
          switch (method) {
            case 'evmGetAddress':
              return this.evmGetAddress(effectiveConnectId, itemDeviceId, commonArgs, book);
            case 'btcGetAddress':
              return this.btcGetAddress(effectiveConnectId, itemDeviceId, commonArgs, book);
            case 'btcGetPublicKey':
              return this.btcGetPublicKey(effectiveConnectId, itemDeviceId, commonArgs, book);
            case 'solGetAddress':
              return this.solGetAddress(effectiveConnectId, itemDeviceId, commonArgs, book);
            case 'tronGetAddress':
              return this.tronGetAddress(effectiveConnectId, itemDeviceId, commonArgs, book);
            default:
              return failure(
                HardwareErrorCode.MethodNotSupported,
                `Unsupported method: ${String(method)}`
              );
          }
        },
        attachIdentity: context => {
          const { record } = this._resolveTarget(effectiveConnectId, itemDeviceId);
          return Promise.resolve({
            ...context.item,
            success: true,
            payload: {
              ...context.payload,
              rootFingerprint: record ? Number.parseInt(record.masterFingerprint, 16) : undefined,
              deviceIdentity: record
                ? {
                    vendor: 'keystone' as const,
                    type: 'walletId' as const,
                    value: record.walletId,
                  }
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
    paramsArg?: NullableCallArg<IHardwareCallParams<EvmGetAddressParams>>,
    book?: AccountBook
  ): Promise<Response<EvmAddress>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
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
          const { account } = await this._fetchAccount(
            connectId,
            deviceId,
            'evm',
            accountPath,
            signal,
            { book }
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
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
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
          const { record } = await this._ensureWalletKnown(connectId, deviceId, 'evm', signal);
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
          const responseUr = await this._resolveUr(
            record,
            requestUr,
            true,
            connectId,
            signal,
            'evmSignTransaction'
          );
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
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
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
          const { record } = await this._ensureWalletKnown(connectId, deviceId, 'evm', signal);
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
          const responseUr = await this._resolveUr(
            record,
            requestUr,
            true,
            connectId,
            signal,
            'evmSignMessage'
          );
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
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
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
          const { record } = await this._ensureWalletKnown(connectId, deviceId, 'evm', signal);
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
          const responseUr = await this._resolveUr(
            record,
            requestUr,
            true,
            connectId,
            signal,
            'evmSignTypedData'
          );
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
    paramsArg?: NullableCallArg<IHardwareCallParams<BtcGetAddressParams>>,
    book?: AccountBook
  ): Promise<Response<BtcAddress>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
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

    const normalizedPath = normalizePath(params.path);
    const { accountPath, relativeDerivePath } = splitAccountPath(normalizedPath);
    if (!relativeDerivePath) {
      return failure(
        HardwareErrorCode.InvalidParams,
        "btcGetAddress requires a full leaf path, e.g. m/84'/0'/0'/0/0"
      );
    }
    if (!isKeystoneSignableBtcAccountPath(accountPath)) {
      return failure(HardwareErrorCode.DevicePathForbidden, KEYSTONE_BTC_ACCOUNT_FORBIDDEN_MESSAGE);
    }

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          const syncPath = params.showOnDevice ? normalizedPath : accountPath;
          debugKeystoneUsb('btc-address-request', {
            showOnDevice: params.showOnDevice === true,
            requestedPath: normalizedPath,
            syncPath,
          });
          const { account } = await this._fetchAccount(
            connectId,
            deviceId,
            'btc',
            syncPath,
            signal,
            { exactPathOnly: params.showOnDevice === true, book }
          );
          KeystoneAdapter._throwIfAborted(signal);
          if (params.showOnDevice) {
            const address = this.urEngine.deriveBtcAddressFromPublicKey(
              account.publicKey,
              scriptType
            );
            return success<BtcAddress>({ address, path: normalizedPath });
          }
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
          return success<BtcAddress>({ address, path: normalizedPath });
        }
      );
    } catch (err) {
      return this._errorToFailure<BtcAddress>(err);
    }
  }

  /**
   * Returns the account-level extended public key. `params.path` must be an
   * ACCOUNT path (`m/84'/0'/0'`), not a leaf — that is the level Keystone
   * actually syncs, and it is what a host needs to derive a whole account's
   * addresses offline. Unlike `btcGetAddress` this has no script-type
   * restriction: an xpub is script-type agnostic, so `86'` (taproot) works
   * here even though deriving a taproot ADDRESS still needs an EC library
   * this package doesn't wire in.
   */
  async btcGetPublicKey(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<BtcGetPublicKeyParams>>,
    book?: AccountBook
  ): Promise<Response<BtcPublicKey>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'btcGetPublicKey requires params');
    if (!params.path)
      return failure(HardwareErrorCode.InvalidParams, 'btcGetPublicKey requires params.path');

    const { accountPath, relativeDerivePath } = splitAccountPath(params.path);
    if (relativeDerivePath) {
      return failure(
        HardwareErrorCode.InvalidParams,
        "btcGetPublicKey requires an account path, e.g. m/84'/0'/0' (not a leaf path)"
      );
    }
    if (!isKeystoneSignableBtcAccountPath(accountPath)) {
      return failure(HardwareErrorCode.DevicePathForbidden, KEYSTONE_BTC_ACCOUNT_FORBIDDEN_MESSAGE);
    }

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          const { account } = await this._fetchAccount(
            connectId,
            deviceId,
            'btc',
            accountPath,
            signal,
            { book }
          );
          KeystoneAdapter._throwIfAborted(signal);
          if (!account.extendedPublicKey) {
            throw createHwkError({
              code: HardwareErrorCode.MethodNotSupported,
              message: 'Keystone did not return an extended public key for this account path',
            });
          }
          const meta = this.urEngine.parseXpubMeta(account.extendedPublicKey);
          return success<BtcPublicKey>({
            xpub: account.extendedPublicKey,
            publicKey: meta.publicKey,
            chainCode: meta.chainCode,
            depth: meta.depth,
            fingerprint: meta.parentFingerprint,
            path: normalizePath(accountPath),
          });
        }
      );
    } catch (err) {
      return this._errorToFailure<BtcPublicKey>(err);
    }
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
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'btcSignPsbt requires params');
    if (!params.psbt)
      return failure(HardwareErrorCode.InvalidParams, 'btcSignPsbt requires params.psbt');
    if (
      params.path &&
      !isKeystoneSignableBtcAccountPath(splitAccountPath(params.path).accountPath)
    ) {
      return failure(HardwareErrorCode.DevicePathForbidden, KEYSTONE_BTC_ACCOUNT_FORBIDDEN_MESSAGE);
    }

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          // A PSBT can span multiple inputs/paths — there's no single leaf path
          // to scope a sync to, so this only needs the wallet's mfp to be known.
          const { record } = await this._ensureWalletKnown(connectId, deviceId, 'btc', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestUr = this.urEngine.buildBtcPsbtRequest(stripHex(params.psbt));
          const responseUr = await this._resolveUr(
            record,
            requestUr,
            true,
            connectId,
            signal,
            'btcSignPsbt'
          );
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
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
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
          const { record } = await this._ensureWalletKnown(connectId, deviceId, 'btc', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          const requestUr = this.urEngine.buildBtcMessageSignRequest({
            requestId,
            messageHex,
            accounts: [{ path, xfp: record.masterFingerprint }],
          });
          const responseUr = await this._resolveUr(
            record,
            requestUr,
            true,
            connectId,
            signal,
            'btcSignMessage'
          );
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
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCommonCallParams>
  ): Promise<Response<{ masterFingerprint: string }>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          const { record } = await this._ensureWalletKnown(connectId, deviceId, 'btc', signal);
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
    paramsArg?: NullableCallArg<IHardwareCallParams<SolGetAddressParams>>,
    book?: AccountBook
  ): Promise<Response<SolAddress>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
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
          const { account } = await this._fetchAccount(connectId, deviceId, 'sol', path, signal, {
            book,
          });
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
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
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
          const { record } = await this._ensureWalletKnown(connectId, deviceId, 'sol', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          const requestUr = this.urEngine.buildSolSignRequest({
            requestId,
            unsignedPayloadHex: stripHex(params.serializedTx),
            dataType: 'transaction',
            path,
            xfp: record.masterFingerprint,
          });
          const responseUr = await this._resolveUr(
            record,
            requestUr,
            true,
            connectId,
            signal,
            'solSignTransaction'
          );
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
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
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
          const { record } = await this._ensureWalletKnown(connectId, deviceId, 'sol', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          const requestUr = this.urEngine.buildSolSignRequest({
            requestId,
            unsignedPayloadHex: stripHex(params.message),
            dataType: 'message',
            path,
            xfp: record.masterFingerprint,
          });
          const responseUr = await this._resolveUr(
            record,
            requestUr,
            true,
            connectId,
            signal,
            'solSignMessage'
          );
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
    paramsArg?: NullableCallArg<IHardwareCallParams<TronGetAddressParams>>,
    book?: AccountBook
  ): Promise<Response<TronAddress>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
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
          const { account } = await this._fetchAccount(
            connectId,
            deviceId,
            'tron',
            accountPath,
            signal,
            { book }
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
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
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
          const { record } = await this._ensureWalletKnown(connectId, deviceId, 'tron', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          const requestUr = this.urEngine.buildTronSignRequest({
            requestId,
            rawTxHex,
            path,
            xfp: record.masterFingerprint,
          });
          const responseUr = await this._resolveUr(
            record,
            requestUr,
            true,
            connectId,
            signal,
            'tronSignTransaction'
          );
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
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<TronSignMsgParams>>
  ): Promise<Response<TronSignature>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.interactionId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
    const params = paramsArg;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'tronSignMessage requires params');
    if (!params.path) {
      return failure(HardwareErrorCode.InvalidParams, 'tronSignMessage requires params.path');
    }
    if (!params.messageHex) {
      return failure(HardwareErrorCode.InvalidParams, 'tronSignMessage requires params.messageHex');
    }
    // Firmware implements TIP-191 signMessageV2 only.
    if (params.messageType !== 'V2') {
      return failure(
        HardwareErrorCode.MethodNotSupported,
        'Keystone signs TRON messages as TIP-191 signMessageV2 only (messageType: "V2")'
      );
    }
    const messageHex = stripHex(params.messageHex);
    const path = normalizePath(params.path);

    try {
      return await this._jobQueue.enqueue(
        deviceId ?? connectId ?? COLD_START_JOB_LABEL,
        async signal => {
          const { record } = await this._ensureWalletKnown(connectId, deviceId, 'tron', signal);
          KeystoneAdapter._throwIfAborted(signal);

          const requestId = uuidv4();
          const requestUr = this.urEngine.buildTronSignRequest({
            requestId,
            rawTxHex: messageHex,
            path,
            xfp: record.masterFingerprint,
            signType: TronSignType.PersonalMessage,
          });
          const responseUr = await this._resolveUr(
            record,
            requestUr,
            true,
            connectId,
            signal,
            'tronSignMessage'
          );
          KeystoneAdapter._throwIfAborted(signal);

          const sig = this.urEngine.parseTronSignature(responseUr);
          KeystoneAdapter._assertRequestIdMatches(requestId, sig.requestId);
          return success<TronSignature>({ signature: sig.signature });
        }
      );
    } catch (err) {
      return this._errorToFailure<TronSignature>(err);
    }
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private _walletIdFromIdentifier(identifier: string): string | undefined {
    const value = identifier.startsWith(KEYSTONE_WALLET_CONNECT_ID_PREFIX)
      ? identifier.slice(KEYSTONE_WALLET_CONNECT_ID_PREFIX.length)
      : identifier;
    return /^[0-9a-f]{64}$/i.test(value) ? value.toLowerCase() : undefined;
  }

  private _allNetworkSyncSchema(
    item: AllNetworkAddressParams
  ): { hwkChain: ChainCapability; path: string } | undefined {
    if (!isAllNetworkMethodName(String(item.methodName)) || !item.path) return undefined;

    const method = item.methodName;
    const hwkChain = getAllNetworkMethodChain(method);
    const path = normalizePath(item.path);
    // Unsignable BTC accounts are refused by the per-item call; keep them out
    // of the prefetch so the device is not asked to export them.
    if (
      hwkChain === 'btc' &&
      !isKeystoneSignableBtcAccountPath(splitAccountPath(path).accountPath)
    ) {
      return undefined;
    }
    switch (method) {
      case 'evmGetAddress':
      case 'btcGetAddress':
      case 'tronGetAddress':
        return { hwkChain, path: splitAccountPath(path).accountPath };
      case 'btcGetPublicKey':
      case 'solGetAddress':
        return { hwkChain, path };
      default:
        return undefined;
    }
  }

  /**
   * QR is an interactive batch transport: one account-creation action must
   * produce one request QR and one response scan, regardless of how many
   * chains or derivation paths the host bundled. USB keeps its proven
   * one-path-at-a-time export flow because the device limits that channel.
   */
  private async _prefetchAllNetworkAccounts(
    connectId: string,
    deviceId: string,
    params: AllNetworkGetAddressParams
  ): Promise<{ book: AccountBook; walletId?: string }> {
    return this._jobQueue.enqueue(deviceId || connectId || COLD_START_JOB_LABEL, async signal => {
      const target = this._resolveTarget(connectId, deviceId);
      const { record: targetRecord } = target;
      let record = targetRecord;

      const requestedByKey = new Map<string, { hwkChain: ChainCapability; path: string }>();
      for (const item of params.bundle) {
        const schema = this._allNetworkSyncSchema(item);
        if (schema) requestedByKey.set(accountKey(schema.hwkChain, schema.path), schema);
      }

      const book: AccountBook = new Map();
      if (!requestedByKey.size) {
        debugKeystoneUsb('all-network-prefetch-skipped', { reason: 'no-supported-items' });
        return { book };
      }

      if (
        this._forcedTransport !== 'qr' &&
        !record?.usbSessionId &&
        this._usbConnector &&
        target.expectedWalletId
      ) {
        record =
          (await this._tryUsbAttach(
            target.expectedWalletId,
            record?.masterFingerprint ?? target.expectedMasterFingerprint
          )) ?? record;
        KeystoneAdapter._throwIfAborted(signal);
      }

      if (this._forcedTransport !== 'qr' && record?.usbSessionId) {
        const missingSchemas = Array.from(requestedByKey.values());
        debugKeystoneUsb('all-network-usb-prefetch-start', {
          bundleCount: params.bundle.length,
          schemaCount: missingSchemas.length,
        });
        for (const [index, schema] of missingSchemas.entries()) {
          // Already answered by an earlier QR fallback in this operation.
          if (book.has(accountKey(schema.hwkChain, schema.path))) continue;
          const synced = await this._fetchAccount(
            connectId,
            deviceId,
            schema.hwkChain,
            schema.path,
            signal,
            { qrFallbackSchemaPaths: missingSchemas.slice(index), book }
          );
          record = synced.record;
          if (!record.usbSessionId) break;
        }
        for (const schema of missingSchemas) {
          if (!book.has(accountKey(schema.hwkChain, schema.path))) {
            throw createHwkError({
              code: HardwareErrorCode.DeviceMismatch,
              message: `Keystone did not return the requested derivation path (${schema.path})`,
            });
          }
        }
        debugKeystoneUsb('all-network-usb-prefetch-complete', {
          schemaCount: missingSchemas.length,
          transport: record.usbSessionId ? 'usb' : 'qr',
        });
        return { book, walletId: record.walletId };
      }
      if (this._forcedTransport === 'usb') {
        throw createHwkError({
          code: HardwareErrorCode.TransportNotAvailable,
          message: 'USB channel is not connected for this Keystone wallet',
        });
      }

      const missingSchemas = Array.from(requestedByKey.values());

      const schemas = [
        { hwkChain: 'evm' as const, path: KEYSTONE_WALLET_ID_PATH },
        ...missingSchemas.filter(schema => normalizePath(schema.path) !== KEYSTONE_WALLET_ID_PATH),
      ];
      debugKeystoneUsb('all-network-qr-prefetch-start', {
        bundleCount: params.bundle.length,
        schemaCount: schemas.length,
      });
      const requestUr = this.urEngine.buildKeyDerivationRequest({
        schemas: schemas.map(schema => ({
          path: schema.path,
          curve: schema.hwkChain === 'sol' ? 'ed25519' : 'secp256k1',
        })),
        origin: this._origin,
      });
      const responseUr = await this._requestQrDisplayAndAwaitResponse(
        record ? toDeviceInfo(record) : placeholderDeviceInfo(),
        { ...requestUr, animated: false }
      );
      KeystoneAdapter._throwIfAborted(signal);

      const parsed = this.urEngine.parseAccountResponse(responseUr);
      this._assertParsedIdentity(parsed, target, 'qr');
      record = this._upsertDeviceRecord(parsed);
      const requestedChainByPath = new Map(
        schemas.map(schema => [normalizePath(schema.path), schema.hwkChain] as const)
      );
      for (const account of parsed.accounts) {
        const normalizedPath = normalizePath(account.path);
        const hwkChain =
          requestedChainByPath.get(normalizedPath) ?? inferHwkChainFromPath(normalizedPath);
        if (hwkChain) {
          book.set(accountKey(hwkChain, normalizedPath), {
            ...account,
            hwkChain,
          });
        }
      }
      for (const schema of missingSchemas) {
        if (!book.has(accountKey(schema.hwkChain, schema.path))) {
          throw createHwkError({
            code: HardwareErrorCode.DeviceMismatch,
            message: `Keystone did not return the requested derivation path (${schema.path})`,
          });
        }
      }
      debugKeystoneUsb('all-network-qr-prefetch-complete', {
        accountCount: parsed.accounts.length,
      });
      return { book, walletId: record.walletId };
    });
  }

  /**
   * Resolve only the stable 64-hex wallet identity. The 8-hex BIP32 master
   * fingerprint is protocol metadata and is never accepted as a lookup key.
   */
  private _resolveTarget(
    connectId?: string,
    deviceId?: string
  ): {
    record?: KeystoneDeviceRecord;
    expectedWalletId?: string;
    expectedMasterFingerprint?: string;
  } {
    let resolvedConnectId = connectId;
    if (isHardwareInteractionId(connectId)) {
      resolvedConnectId = this._interactions.resolve(connectId).connectId;
    }
    const identifiers = [deviceId, resolvedConnectId].filter((identifier): identifier is string =>
      Boolean(identifier)
    );
    if (!identifiers.length) return {};

    const walletIds = identifiers
      .map(identifier => this._walletIdFromIdentifier(identifier))
      .filter((walletId): walletId is string => Boolean(walletId));
    if (!walletIds.length) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: 'Keystone device lookup requires a 64-hex wallet identity',
      });
    }

    const expectedWalletId = walletIds[0];
    if (walletIds.some(walletId => walletId !== expectedWalletId)) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: 'Keystone connectId and deviceId identify different wallets',
      });
    }
    if (identifiers.some(identifier => !this._walletIdFromIdentifier(identifier))) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: 'Keystone connectId and deviceId are inconsistent',
      });
    }

    const record = this._devices.get(expectedWalletId);
    debugKeystoneUsb('wallet-target-resolved', {
      input: debugTarget(connectId),
      recordFound: Boolean(record),
      hasUsbSession: Boolean(record?.usbSessionId),
      hasExpectedFingerprint: Boolean(record?.masterFingerprint),
    });
    return record
      ? {
          record,
          expectedWalletId,
          expectedMasterFingerprint: record.masterFingerprint,
        }
      : { expectedWalletId };
  }

  private _assertParsedIdentity(
    parsed: KeystoneParsedMultiAccounts,
    expected: { expectedWalletId?: string; expectedMasterFingerprint?: string },
    channel: 'qr' | 'usb'
  ): string {
    const walletId = deriveKeystoneWalletId(parsed.accounts);
    if (process.env.NODE_ENV !== 'production') {
      const identityAccount = parsed.accounts.find(
        account => normalizePath(account.path) === KEYSTONE_WALLET_ID_PATH
      );
      let xpubMeta:
        | {
            publicKey: string;
            chainCode: string;
            depth: number;
            parentFingerprint: number;
          }
        | undefined;
      try {
        xpubMeta = identityAccount?.extendedPublicKey
          ? this.urEngine.parseXpubMeta(identityAccount.extendedPublicKey)
          : undefined;
      } catch {
        xpubMeta = undefined;
      }
      debugKeystoneUsb('identity-check', {
        channel,
        accountCount: parsed.accounts.length,
        identityPath: KEYSTONE_WALLET_ID_PATH,
        identityPathPresent: Boolean(identityAccount),
        expectedWalletTag: keystoneIdentityDebugTag('wallet-id', expected.expectedWalletId),
        actualWalletTag: keystoneIdentityDebugTag('wallet-id', walletId),
        walletIdMatches:
          expected.expectedWalletId === undefined || walletId === expected.expectedWalletId,
        expectedMasterFingerprintTag: keystoneIdentityDebugTag(
          'master-fingerprint',
          expected.expectedMasterFingerprint
        ),
        actualMasterFingerprintTag: keystoneIdentityDebugTag(
          'master-fingerprint',
          parsed.masterFingerprint
        ),
        masterFingerprintMatches:
          expected.expectedMasterFingerprint === undefined ||
          parsed.masterFingerprint === expected.expectedMasterFingerprint,
        xpubLength: identityAccount?.extendedPublicKey?.length,
        xpubTag: keystoneIdentityDebugTag('xpub', identityAccount?.extendedPublicKey),
        accountPublicKeyTag: keystoneIdentityDebugTag('public-key', identityAccount?.publicKey),
        xpubPublicKeyTag: keystoneIdentityDebugTag('public-key', xpubMeta?.publicKey),
        publicKeyRepresentationsMatch:
          identityAccount?.publicKey !== undefined && xpubMeta?.publicKey !== undefined
            ? identityAccount.publicKey === xpubMeta.publicKey
            : undefined,
        chainCodeTag: keystoneIdentityDebugTag('chain-code', xpubMeta?.chainCode),
        depth: xpubMeta?.depth,
        parentFingerprintTag: keystoneIdentityDebugTag(
          'parent-fingerprint',
          xpubMeta?.parentFingerprint.toString(16)
        ),
      });
    }
    if (
      expected.expectedMasterFingerprint &&
      parsed.masterFingerprint !== expected.expectedMasterFingerprint
    ) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: `Connected Keystone wallet (mfp ${parsed.masterFingerprint}) does not match the requested wallet fingerprint (${expected.expectedMasterFingerprint})`,
      });
    }
    if (expected.expectedWalletId && walletId !== expected.expectedWalletId) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: 'Connected Keystone wallet does not match the requested wallet identity',
      });
    }
    return walletId;
  }

  /**
   * Folds a parsed account-response UR into the device table. `viaUsb`
   * (defaults false) says which channel actually carried this round trip —
   * `_resolveUr` routes a KeyDerivation sync over USB when the target record
   * already has a live session, so this must NOT unconditionally mark
   * `qrSynced`, or a USB-only wallet would wrongly survive a later USB
   * disconnect as a "QR-synced, demote to QR-only" entry instead of being
   * dropped outright (see `releaseInteraction`).
   */
  private _upsertDeviceRecord(
    parsed: KeystoneParsedMultiAccounts,
    options?: { viaUsb?: boolean; usbSessionId?: string }
  ): KeystoneDeviceRecord {
    const walletId = deriveKeystoneWalletId(parsed.accounts);
    let record = this._devices.get(walletId);
    const isNew = !record;
    if (!record) {
      record = createDeviceRecord(walletId, parsed.masterFingerprint);
      this._devices.set(walletId, record);
    } else if (record.masterFingerprint !== parsed.masterFingerprint) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: 'Keystone wallet identity returned an inconsistent master fingerprint',
      });
    }
    record.model = parsed.device ?? record.model;
    record.deviceVersion = parsed.deviceVersion ?? record.deviceVersion;
    record.hardwareDeviceId = parsed.deviceId ?? record.hardwareDeviceId;
    record.usbSessionId = options?.usbSessionId ?? record.usbSessionId;
    if (!options?.viaUsb) record.qrSynced = true;

    const info = toDeviceInfo(record);
    const eventType = isNew ? DEVICE.CONNECT : DEVICE.CHANGED;
    this.emitter.emit(eventType, { type: eventType, payload: info });
    return record;
  }

  /**
   * Opens+claims whatever Keystone the USB connector currently has
   * permission for, learns its protocol mfp via `getAppConfig`, then requests
   * one fixed account-level xpub and derives the stable wallet id. A
   * QR-synced entry becomes
   * `{qr, usb}`-capable in place (one `device-changed`, not a second
   * `device-connect`); a wallet never seen before becomes a new USB-only
   * entry. See §4.2 of the design doc.
   */
  private async _connectUsb(
    expected: {
      expectedWalletId?: string;
      expectedMasterFingerprint?: string;
    },
    searchTargetId?: string
  ): Promise<Response<DeviceInfo>> {
    if (this._pendingUsbTeardowns > 0) {
      return failure(
        HardwareErrorCode.DeviceBusyInternal,
        'Keystone USB session is being released'
      );
    }
    const previous = this._usbConnectTail;
    let release: (() => void) | undefined;
    this._usbConnectTail = new Promise<void>(resolve => {
      release = resolve;
    });
    await traceUsbWait('connect-queue', () => previous);
    try {
      return await this._connectUsbExclusive(expected, searchTargetId);
    } finally {
      release?.();
    }
  }

  private async _connectUsbExclusive(
    expected: {
      expectedWalletId?: string;
      expectedMasterFingerprint?: string;
    },
    searchTargetId?: string
  ): Promise<Response<DeviceInfo>> {
    debugKeystoneUsb('connect-start', {
      hasExpectedWalletId: Boolean(expected.expectedWalletId),
      hasExpectedMasterFingerprint: Boolean(expected.expectedMasterFingerprint),
    });
    if (!this._usbConnector) {
      debugKeystoneUsb('connect-no-usb-connector');
      return failure(
        HardwareErrorCode.TransportNotAvailable,
        'No USB connector configured for this Keystone adapter'
      );
    }
    let sessionId: string | undefined;
    try {
      let connectTarget: ConnectorConnectTarget = { type: 'default' };
      if (searchTargetId) {
        connectTarget = { type: 'search-target', searchTargetId };
      } else if (expected.expectedMasterFingerprint) {
        connectTarget = {
          type: 'expected-device-identity',
          deviceIdentity: expected.expectedMasterFingerprint,
        };
      }
      const connector = this._usbConnector;
      const session = await traceUsbWait('connector-connect', () =>
        connector.connectTarget
          ? connector.connectTarget(connectTarget)
          : connector.connect(searchTargetId ?? expected.expectedMasterFingerprint)
      );
      sessionId = session.sessionId;
      debugKeystoneUsb('connect-transport-opened');
      const raw = session.deviceInfo.raw as { masterFingerprint?: unknown } | undefined;
      const mfpValue = parseBip32MasterFingerprint(raw?.masterFingerprint);
      if (!mfpValue) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceMismatch,
          message: 'Keystone USB did not report a master fingerprint',
        });
      }
      const masterFingerprint = mfpValue.toLowerCase();
      if (
        expected.expectedMasterFingerprint &&
        masterFingerprint !== expected.expectedMasterFingerprint
      ) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceMismatch,
          message: `Connected Keystone wallet (mfp ${masterFingerprint}) does not match the requested wallet fingerprint (${expected.expectedMasterFingerprint})`,
        });
      }

      const identityRequest = this.urEngine.buildKeyDerivationRequest({
        schemas: [{ path: KEYSTONE_WALLET_ID_PATH, curve: 'secp256k1' }],
        origin: this._origin,
      });
      debugKeystoneUsb('connect-identity-request-start', { schemaCount: 1 });
      const identityResult = await this._callUsbConnector(
        session.sessionId,
        'resolveUr',
        identityRequest
      );
      debugKeystoneUsb('connect-identity-request-result', { success: identityResult.success });
      if (!identityResult.success) {
        throw rehydrateConnectorError(identityResult.error);
      }
      const parsed = this.urEngine.parseAccountResponse(identityResult.payload as KeystoneUr);
      debugKeystoneUsb('connect-identity-parsed', { accountCount: parsed.accounts.length });
      this._assertParsedIdentity(
        parsed,
        {
          ...expected,
          expectedMasterFingerprint: expected.expectedMasterFingerprint ?? masterFingerprint,
        },
        'usb'
      );
      const walletId = deriveKeystoneWalletId(parsed.accounts);
      const previousUsbSessionId = this._devices.get(walletId)?.usbSessionId;
      const record = this._upsertDeviceRecord(parsed, {
        viaUsb: true,
        usbSessionId: session.sessionId,
      });
      if (previousUsbSessionId && previousUsbSessionId !== session.sessionId) {
        try {
          await this._usbConnector.disconnect(previousUsbSessionId);
        } catch {
          // The replacement session is authoritative even if stale teardown fails.
        }
      }
      record.hadUsbSession = true;
      record.model = session.deviceInfo.modelName ?? session.deviceInfo.model ?? record.model;
      record.deviceVersion = session.deviceInfo.firmwareVersion ?? record.deviceVersion;
      const info = toDeviceInfo(record);
      debugKeystoneUsb('connect-complete');
      return success(info);
    } catch (err) {
      const errorShape = err as {
        code?: unknown;
        transportErrorCode?: unknown;
        name?: unknown;
      };
      debugKeystoneUsb('connect-failed', {
        stage: sessionId ? 'identity' : 'transport',
        name: errorShape?.name,
        code: errorShape?.code,
        transportErrorCode: errorShape?.transportErrorCode,
      });
      if (sessionId) {
        try {
          await this._usbConnector.disconnect(sessionId);
        } catch {
          // Preserve the identity/export failure; teardown is best-effort.
        }
      }
      return this._errorToFailure<DeviceInfo>(err);
    }
  }

  /**
   * Probe already-authorized USB devices without opening a permission picker,
   * then attach and verify the requested wallet when one is present. This is
   * used both after an adapter restart and after a QR-only period, so plugging
   * USB back in affects the next business call without changing an in-flight
   * QR interaction.
   */
  private async _tryUsbAttach(
    expectedWalletId?: string,
    expectedMasterFingerprint?: string,
    options?: { waitForReenumeration?: boolean }
  ): Promise<KeystoneDeviceRecord | undefined> {
    if (!expectedWalletId || this._forcedTransport === 'qr' || !this._usbConnector) {
      return undefined;
    }

    const maxAttempts = options?.waitForReenumeration ? KEYSTONE_USB_REATTACH_PROBE_ATTEMPTS : 1;
    debugKeystoneUsb('usb-probe-start', { maxAttempts });
    let availableDevices: ConnectorDevice[] = [];
    let lastSearchError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        availableDevices = await this._usbConnector.searchDevices({ purpose: 'availability' });
        lastSearchError = undefined;
        debugKeystoneUsb('usb-probe-result', {
          attempt,
          count: availableDevices.length,
        });
      } catch (error) {
        lastSearchError = error;
        debugKeystoneUsb('usb-probe-result', { attempt, count: 0, failed: true });
      }
      if (availableDevices.length) {
        break;
      }
      if (attempt < maxAttempts) {
        // eslint-disable-next-line no-await-in-loop
        await waitForKeystoneUsbReattachProbe();
      }
    }
    if (!availableDevices.length) {
      if (this._forcedTransport === 'usb' && lastSearchError) {
        throw lastSearchError instanceof Error
          ? lastSearchError
          : new Error(String(lastSearchError));
      }
      return undefined;
    }

    // Enumeration retries are silent. Perform the identity handshake only
    // once so a temporarily unhealthy channel cannot flash the device's
    // connection approval screen four times.
    let attached: Response<DeviceInfo> | undefined;
    let record: KeystoneDeviceRecord | undefined;
    const candidates = expectedMasterFingerprint ? [undefined] : availableDevices;
    for (const device of candidates) {
      // A cold adapter has only the persisted wallet id, not the short master
      // fingerprint. Probe each exact discovery target and verify the fixed
      // identity xpub before any business/signing request is dispatched.
      // eslint-disable-next-line no-await-in-loop
      attached = await this._connectUsb(
        { expectedWalletId, expectedMasterFingerprint },
        device?.connectId
      );
      if (attached.success) {
        record = this._devices.get(expectedWalletId);
        if (record) break;
      }
    }
    debugKeystoneUsb('usb-attach-result', {
      success: Boolean(record),
      ...(attached && !attached.success ? { code: attached.payload.code } : {}),
    });
    return record;
  }

  /**
   * The one place that decides QR vs. USB for a UR round trip and carries it
   * out. `record` is the (possibly not-yet-existing, for a true cold start)
   * device row for the target wallet. USB is the preferred channel: a known
   * wallet record with no live session gets ONE best-effort re-attach here,
   * and anything that goes wrong just leaves the call on QR. A
   * `switchTransport('qr')` pin forces QR even for a USB-attached wallet;
   * `switchTransport('usb')` on a wallet with no live USB session fails
   * closed rather than silently falling back to QR.
   */
  private async _resolveUr(
    record: KeystoneDeviceRecord | undefined,
    requestUr: KeystoneUr,
    animated: boolean,
    interactionId: string | undefined,
    signal: AbortSignal,
    operationName?: string
  ): Promise<KeystoneUr> {
    const releaseInteractionRetention = isHardwareInteractionId(interactionId)
      ? this._interactions.retain(interactionId)
      : undefined;
    try {
      return await this._resolveUrWithRoute(
        record,
        requestUr,
        animated,
        interactionId,
        signal,
        operationName
      );
    } finally {
      releaseInteractionRetention?.();
    }
  }

  private async _resolveUrWithRoute(
    record: KeystoneDeviceRecord | undefined,
    requestUr: KeystoneUr,
    animated: boolean,
    interactionId: string | undefined,
    signal: AbortSignal,
    operationName?: string
  ): Promise<KeystoneUr> {
    let interactionRoute: { interactionId: string; connectionType: 'usb' | 'qr' } | undefined;
    if (isHardwareInteractionId(interactionId)) {
      const interaction = this._interactions.resolve(interactionId);
      const route = this._interactionRoutes.get(interaction.connectId);
      debugKeystoneUsb('interaction-route-validate', {
        interaction: debugTarget(interactionId),
        routeFound: Boolean(route),
        matchesCurrentInteraction: route?.interactionId === interactionId,
        connectionType: route?.connectionType,
      });
      if (!route || route.interactionId !== interactionId) {
        this._interactions.end(interactionId, 'disconnect');
        throw createHwkError({
          code: HardwareErrorCode.InteractionEnded,
          message: 'Keystone hardware interaction is no longer connected',
          params: { interactionId, reason: 'disconnect' },
        });
      }
      interactionRoute = route;
    }
    debugKeystoneUsb('resolve-route-start', {
      hasRecord: Boolean(record),
      hasUsbSession: Boolean(record?.usbSessionId),
      hasUsbConnector: Boolean(this._usbConnector),
      forcedTransport: this._forcedTransport,
    });
    // USB is the preferred channel, so a record with no live session gets one
    // best-effort attempt to (re)attach before anything falls back to QR. This
    // covers an expired or physically disconnected USB session while the
    // adapter still knows the wallet. Cold adapter restarts are handled in
    // `_tryUsbAttach` before this method is called.
    //
    // Best-effort is the whole point — a failure here (nothing plugged in, a
    // different wallet on the bus, permission not granted) must NOT surface.
    // Leaving `usbSessionId` unset makes the code below route to QR on its
    // own, which is exactly the desired fallback: no error dialog, no retry
    // button, the user just gets the QR they would have gotten anyway.
    // Skipped when the caller pinned a transport explicitly.
    if (
      !interactionRoute &&
      !this._forcedTransport &&
      record &&
      !record.usbSessionId &&
      this._usbConnector
    ) {
      debugKeystoneUsb('resolve-attach-start');
      const attached = await this._tryUsbAttach(record.walletId, record.masterFingerprint, {
        waitForReenumeration: record.hadUsbSession,
      });
      debugKeystoneUsb('resolve-attach-result', { success: Boolean(attached) });
    }

    const wantUsb = interactionRoute
      ? interactionRoute.connectionType === 'usb'
      : this._forcedTransport === 'usb' ||
        (this._forcedTransport !== 'qr' && Boolean(record?.usbSessionId));
    let routeReason = 'session-availability';
    if (interactionRoute) routeReason = 'interaction-pinned';
    else if (this._forcedTransport) routeReason = 'explicit-override';
    debugKeystoneUsb('resolve-route-selected', {
      transport: wantUsb ? 'usb' : 'qr',
      reason: routeReason,
      interaction: debugTarget(interactionId),
      session: debugTarget(record?.usbSessionId),
    });

    if (wantUsb) {
      if (!record?.usbSessionId || !this._usbConnector) {
        if (interactionRoute) {
          this._interactions.end(interactionRoute.interactionId, 'disconnect');
          throw createHwkError({
            code: HardwareErrorCode.InteractionEnded,
            message: 'Keystone interaction USB connection was lost',
            params: {
              interactionId: interactionRoute.interactionId,
              reason: 'disconnect',
            },
          });
        }
        throw createHwkError({
          code: HardwareErrorCode.TransportNotAvailable,
          message: 'USB channel is not connected for this Keystone wallet',
        });
      }
      const result = await this._callUsbConnector(
        record.usbSessionId,
        'resolveUr',
        requestUr,
        signal
      );
      debugKeystoneUsb('resolve-usb-result', { success: result.success });
      if (result.success) return result.payload as KeystoneUr;

      const usbError = rehydrateConnectorError(result.error);
      const usbErrorOrigin = (usbError as Error & { origin?: string }).origin;
      const usbErrorCode = (usbError as Error & { code?: number }).code;
      if (
        !interactionRoute &&
        !this._forcedTransport &&
        usbErrorCode === HardwareErrorCode.PayloadTooLarge &&
        usbErrorOrigin !== 'device'
      ) {
        debugKeystoneUsb('resolve-usb-payload-too-large-fallback-qr');
        const displayDevice = toDeviceInfo(record);
        return this._requestQrDisplayAndAwaitResponse(displayDevice, {
          ...requestUr,
          animated,
        });
      }
      // Deliberately does NOT retry over QR. By this point the request has
      // been put on the wire and the device may well be mid-interaction —
      // showing a passphrase keyboard or a confirm screen. Swapping channels
      // here throws away work the user is in the middle of and asks them to
      // redo it a different way, which is worse than either succeeding or
      // failing. Channel selection happens once, before the request goes out.
      //
      // The case this used to cover — a cable pulled after connect, leaving a
      // stale session — is now handled at its source: the connector wires the
      // transport's disconnect listener, so an unplug drops the session and
      // the next call takes the attach path (which does fall back to QR).
      // Keep the session when the DEVICE answered. Declining on screen, a
      // locked device, the wrong wallet — none of those say anything about the
      // cable, and dropping the session there is what made "cancel, then
      // retry and confirm" impossible: the retry no longer had a live session
      // to reuse and had to re-open the transport from scratch. Only a failure
      // of the pipe itself makes the session untrustworthy.
      //
      // `origin` is authoritative when the mapper stamped it; the code list
      // below is the legacy fallback for errors that predate the field.
      const deviceAnswered =
        usbErrorOrigin !== undefined
          ? usbErrorOrigin === 'device'
          : usbErrorCode === HardwareErrorCode.UserRejected ||
            usbErrorCode === HardwareErrorCode.UserAborted ||
            usbErrorCode === HardwareErrorCode.DeviceLocked ||
            usbErrorCode === HardwareErrorCode.DeviceMismatch;
      debugKeystoneUsb('usb-error-session-decision', {
        code: usbErrorCode,
        origin: usbErrorOrigin,
        deviceAnswered,
        keepSession: deviceAnswered,
        interactionPinned: Boolean(interactionRoute),
        operationMayHaveCompleted: !deviceAnswered && Boolean(operationName),
      });
      if (!deviceAnswered) {
        record.usbSessionId = undefined;
        if (interactionRoute) {
          this._interactions.end(interactionRoute.interactionId, 'disconnect');
          throw createHwkError({
            code: HardwareErrorCode.InteractionEnded,
            message: operationName
              ? `Keystone ${operationName} may have completed before the USB connection was lost`
              : 'Keystone interaction USB connection was lost',
            recovery: operationName ? { scope: 'unknown' } : undefined,
            params: operationName
              ? operationMayHaveCompletedParams(operationName, {
                  interactionId: interactionRoute.interactionId,
                  reason: 'disconnect',
                })
              : {
                  interactionId: interactionRoute.interactionId,
                  reason: 'disconnect',
                },
          });
        }
        if (operationName) {
          throw createHwkError({
            code: (usbErrorCode as HardwareErrorCode) ?? HardwareErrorCode.TransportError,
            message: `Keystone ${operationName} may have completed before the USB connection was lost`,
            origin: 'transport',
            recovery: { scope: 'unknown' },
            params: operationMayHaveCompletedParams(operationName),
          });
        }
      }
      throw usbError;
    }

    const displayDevice = record ? toDeviceInfo(record) : placeholderDeviceInfo();
    try {
      return await this._requestQrDisplayAndAwaitResponse(displayDevice, {
        ...requestUr,
        animated,
      });
    } catch (error) {
      const { code, _tag: tag } = error as { code?: unknown; _tag?: unknown };
      if (
        operationName &&
        (code === HardwareErrorCode.OperationTimeout || tag === UI_REQUEST_TIMEOUT_TAG)
      ) {
        throw createHwkError({
          code: HardwareErrorCode.OperationTimeout,
          message: `Keystone ${operationName} may have completed before the QR response timed out`,
          recovery: { scope: 'unknown' },
          params: operationMayHaveCompletedParams(operationName),
        });
      }
      throw error;
    }
  }

  /**
   * Fetch one account's key material from the device for this operation only.
   * `book` lets earlier fetches of the same operation be reused; nothing is
   * retained on the record. On a USB drop the remaining paths fall back to one
   * QR request.
   */
  private async _fetchAccount(
    connectId: string | undefined,
    deviceId: string | undefined,
    hwkChain: ChainCapability,
    syncPath: string,
    signal: AbortSignal,
    options?: {
      qrFallbackSchemaPaths?: Array<{ hwkChain: ChainCapability; path: string }>;
      exactPathOnly?: boolean;
      book?: AccountBook;
    }
  ): Promise<{ record: KeystoneDeviceRecord; account: KeystoneAccountEntry }> {
    const target = this._resolveTarget(connectId, deviceId);
    const key = accountKey(hwkChain, syncPath);

    let existingRecord = target.record;
    if (!existingRecord) {
      const attached = await this._tryUsbAttach(target.expectedWalletId);
      KeystoneAdapter._throwIfAborted(signal);
      existingRecord = attached;
    }
    const book = options?.book;
    const booked = book?.get(key);
    if (existingRecord && booked) {
      return { record: existingRecord, account: booked };
    }
    if (existingRecord && !existingRecord.usbSessionId && this._forcedTransport === 'usb') {
      // Pinned to USB without a session: attach here so enumeration errors
      // surface (resolveUr skips its probe for pinned transports).
      await this._tryUsbAttach(existingRecord.walletId, existingRecord.masterFingerprint, {
        waitForReenumeration: existingRecord.hadUsbSession,
      });
      KeystoneAdapter._throwIfAborted(signal);
      existingRecord = this._devices.get(existingRecord.walletId) ?? existingRecord;
    }

    // Match the proven browser-demo flow: USB exports one missing account path
    // per request, while QR keeps its batched import flow. The all-network API
    // still returns one result bundle after these per-chain calls complete.
    const useSinglePathUsbExport =
      this._forcedTransport !== 'qr' && Boolean(existingRecord?.usbSessionId);
    const requestedSchemaPaths: Array<{ hwkChain: ChainCapability; path: string }> = [
      { hwkChain, path: syncPath },
    ];
    const schemaPaths =
      useSinglePathUsbExport ||
      requestedSchemaPaths.some(schema => normalizePath(schema.path) === KEYSTONE_WALLET_ID_PATH)
        ? requestedSchemaPaths
        : [{ hwkChain: 'evm' as const, path: KEYSTONE_WALLET_ID_PATH }, ...requestedSchemaPaths];
    const requestUr = this.urEngine.buildKeyDerivationRequest({
      schemas: schemaPaths.map(s => ({
        path: s.path,
        curve: s.hwkChain === 'sol' ? 'ed25519' : 'secp256k1',
      })),
      origin: this._origin,
    });
    debugKeystoneUsb('account-sync-request-start', {
      transport: useSinglePathUsbExport ? 'usb' : 'qr',
      chain: hwkChain,
      schemaCount: schemaPaths.length,
      requestedPaths: schemaPaths.map(schema => normalizePath(schema.path)),
    });
    let resolvedViaUsb = useSinglePathUsbExport;
    let responseUr: KeystoneUr | undefined;
    try {
      responseUr = await this._resolveUr(existingRecord, requestUr, false, connectId, signal);
    } catch (error) {
      if (
        isHardwareInteractionId(connectId) ||
        !useSinglePathUsbExport ||
        !isKeystoneUsbReconnectableError(error)
      ) {
        throw error;
      }

      debugKeystoneUsb('account-sync-usb-recovery-start', { chain: hwkChain });
      await waitForKeystoneUsbReattachProbe();
      KeystoneAdapter._throwIfAborted(signal);
      const recoveredRecord = await this._tryUsbAttach(
        existingRecord?.walletId,
        existingRecord?.masterFingerprint,
        { waitForReenumeration: true }
      );
      KeystoneAdapter._throwIfAborted(signal);
      if (recoveredRecord?.usbSessionId) {
        try {
          responseUr = await this._resolveUr(recoveredRecord, requestUr, false, connectId, signal);
          existingRecord = recoveredRecord;
          debugKeystoneUsb('account-sync-usb-recovery-result', {
            chain: hwkChain,
            success: true,
          });
        } catch (retryError) {
          if (!isKeystoneUsbReconnectableError(retryError)) throw retryError;
          debugKeystoneUsb('account-sync-usb-recovery-result', {
            chain: hwkChain,
            success: false,
          });
        }
      } else {
        debugKeystoneUsb('account-sync-usb-recovery-result', {
          chain: hwkChain,
          success: false,
        });
      }

      if (!responseUr) {
        if (this._forcedTransport === 'usb') throw error;
        const fallbackSchemaPaths = options?.qrFallbackSchemaPaths ?? [
          { hwkChain, path: syncPath },
        ];
        const qrFallbackSchemas = [
          { hwkChain: 'evm' as const, path: KEYSTONE_WALLET_ID_PATH },
          ...fallbackSchemaPaths.filter(
            schema => normalizePath(schema.path) !== KEYSTONE_WALLET_ID_PATH
          ),
        ].map(schema => ({
          path: schema.path,
          curve: schema.hwkChain === 'sol' ? ('ed25519' as const) : ('secp256k1' as const),
        }));
        const qrRequestUr = this.urEngine.buildKeyDerivationRequest({
          schemas: qrFallbackSchemas,
          origin: this._origin,
        });
        const displayDevice = existingRecord
          ? toDeviceInfo(existingRecord)
          : placeholderDeviceInfo();
        responseUr = await this._requestQrDisplayAndAwaitResponse(displayDevice, {
          ...qrRequestUr,
          animated: false,
        });
        resolvedViaUsb = false;
        debugKeystoneUsb('account-sync-fallback-selected', {
          transport: 'qr',
          chain: hwkChain,
          schemaCount: qrFallbackSchemas.length,
        });
      }
    }
    KeystoneAdapter._throwIfAborted(signal);

    const parsed = this.urEngine.parseAccountResponse(responseUr);
    debugKeystoneUsb('account-sync-response-parsed', {
      transport: resolvedViaUsb ? 'usb' : 'qr',
      chain: hwkChain,
      accountCount: parsed.accounts.length,
    });
    let record: KeystoneDeviceRecord;
    if (resolvedViaUsb && existingRecord) {
      if (parsed.masterFingerprint !== existingRecord.masterFingerprint) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceMismatch,
          message: 'Keystone USB account export returned a different master fingerprint',
        });
      }
      record = existingRecord;
    } else {
      this._assertParsedIdentity(parsed, target, 'qr');
      record = this._upsertDeviceRecord(parsed, {
        viaUsb: Boolean(existingRecord?.usbSessionId),
      });
    }
    const account = parsed.accounts.find(a => normalizePath(a.path) === syncPath);
    if (!account) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: `Keystone did not return the requested derivation path (${syncPath})`,
      });
    }
    const entry: KeystoneAccountEntry = { ...account, hwkChain };
    if (book) {
      // Everything the device answered stays usable for this operation.
      for (const returned of parsed.accounts) {
        const returnedChain = inferHwkChainFromPath(returned.path);
        if (returnedChain) {
          book.set(accountKey(returnedChain, returned.path), {
            ...returned,
            hwkChain: returnedChain,
          });
        }
      }
      book.set(key, entry);
    }
    return { record, account: entry };
  }

  /**
   * Like `_fetchAccount`, but for operations (PSBT signing, master
   * fingerprint) that only need to know WHICH wallet is attached, not a
   * specific cached path. Syncs the account-level path for `chain` as a
   * throwaway probe when the wallet record isn't already known.
   *
   * `CHAIN_FINGERPRINT_PATHS[chain]` is a 5-segment LEAF path for `evm`
   * (`m/44'/60'/0'/0/0`) — sending that verbatim as a KeyDerivation request
   * asks Keystone for a non-standard path. Keystone's own docs
   * (dev.keyst.one's multichain KeyDerivation example) show the ETH
   * account-level path as `m/44'/60'/0'` (3 segments), same as what
   * `_fetchAccount` already requests — so
   * truncate through `splitAccountPath` here too instead of using the raw
   * fingerprint leaf path. `btc`/`sol` are already 3-segment account paths
   * and pass through unchanged.
   */
  private async _ensureWalletKnown(
    connectId: string | undefined,
    deviceId: string | undefined,
    chain: ChainForFingerprint,
    signal: AbortSignal
  ): Promise<{ record: KeystoneDeviceRecord }> {
    const target = this._resolveTarget(connectId, deviceId);
    if (target.record) return { record: target.record };

    const attached = await this._tryUsbAttach(target.expectedWalletId);
    KeystoneAdapter._throwIfAborted(signal);
    if (attached) return { record: attached };

    // No known or restorable USB record remains, so continue with QR.
    const { accountPath } = splitAccountPath(CHAIN_FINGERPRINT_PATHS[chain]);
    const schemas =
      accountPath === KEYSTONE_WALLET_ID_PATH
        ? [{ path: KEYSTONE_WALLET_ID_PATH, curve: 'secp256k1' as const }]
        : [
            { path: KEYSTONE_WALLET_ID_PATH, curve: 'secp256k1' as const },
            {
              path: accountPath,
              curve: chain === 'sol' ? ('ed25519' as const) : ('secp256k1' as const),
            },
          ];
    const requestUr = this.urEngine.buildKeyDerivationRequest({
      schemas,
      origin: this._origin,
    });
    const responseUr = await this._resolveUr(undefined, requestUr, false, connectId, signal);
    KeystoneAdapter._throwIfAborted(signal);

    const parsed = this.urEngine.parseAccountResponse(responseUr);
    this._assertParsedIdentity(parsed, target, 'qr');
    const record = this._upsertDeviceRecord(parsed);
    return { record };
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

  private async _callUsbConnector(
    sessionId: string,
    method: string,
    params: unknown,
    signal?: AbortSignal
  ): Promise<ConnectorCallResult> {
    if (!this._usbConnector) {
      throw createHwkError({
        code: HardwareErrorCode.TransportNotAvailable,
        message: 'No USB connector configured for this Keystone adapter',
      });
    }
    if (this._pendingUsbTeardowns > 0 || this._unsettledUsbOperations.size > 0) {
      debugKeystoneUsb('call-busy', {
        method,
        pendingTeardowns: this._pendingUsbTeardowns,
        unsettledOperations: this._unsettledUsbOperations.size,
      });
      throw createHwkError({
        code: HardwareErrorCode.DeviceBusyInternal,
        message: `Keystone USB is busy while calling ${method}`,
      });
    }
    const releaseOperation = this._retainUsbOperation(`call:${sessionId}`);
    let rawCall: Promise<ConnectorCallResult>;
    try {
      const connector = this._usbConnector;
      rawCall = traceUsbWait('connector-call', () =>
        connector.call(sessionId, method, params)
      ).finally(releaseOperation);
    } catch (error) {
      releaseOperation();
      throw error;
    }
    return signal ? KeystoneAdapter._abortable(signal, rawCall) : rawCall;
  }

  private _runUsbTeardown(task: () => Promise<void>): Promise<void> {
    const previous = this._usbTeardownTail;
    let releaseTail: () => void = () => undefined;
    this._usbTeardownTail = new Promise<void>(resolve => {
      releaseTail = resolve;
    });
    this._pendingUsbTeardowns += 1;
    return (async () => {
      try {
        await traceUsbWait('teardown-queue', () => previous);
        await traceUsbWait('teardown-drain', () => this._waitForUsbOperationsToDrain());
        await traceUsbWait('teardown-task', task);
      } finally {
        this._pendingUsbTeardowns -= 1;
        releaseTail();
      }
    })();
  }

  private _waitForUsbOperationsToDrain(): Promise<void> {
    if (this._unsettledUsbOperations.size === 0) return Promise.resolve();
    return new Promise(resolve => {
      this._usbIdleWaiters.add(resolve);
    });
  }

  private _retainUsbOperation(key: string): () => void {
    this._unsettledUsbOperations.set(key, (this._unsettledUsbOperations.get(key) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const remaining = (this._unsettledUsbOperations.get(key) ?? 1) - 1;
      if (remaining > 0) {
        this._unsettledUsbOperations.set(key, remaining);
      } else {
        this._unsettledUsbOperations.delete(key);
      }
      if (this._unsettledUsbOperations.size === 0) {
        for (const resolve of this._usbIdleWaiters) resolve();
        this._usbIdleWaiters.clear();
      }
    };
  }

  private static _abortable<T>(signal: AbortSignal, promise: Promise<T>): Promise<T> {
    if (signal.aborted) {
      return Promise.reject(signal.reason instanceof Error ? signal.reason : new Error('Aborted'));
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        reject(signal.reason instanceof Error ? signal.reason : new Error('Aborted'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      promise.then(
        value => {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        error => {
          signal.removeEventListener('abort', onAbort);
          reject(error);
        }
      );
    });
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
        recovery?: unknown;
      };
      if (typeof e.code === 'number') {
        const { origin } = e as { origin?: unknown };
        return failure(
          e.code as HardwareErrorCode,
          e.message ?? 'Unknown error',
          e.params,
          origin === 'device' || origin === 'transport' || origin === 'host' ? origin : undefined,
          isHwkRecoveryHint(e.recovery) ? e.recovery : undefined
        );
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
