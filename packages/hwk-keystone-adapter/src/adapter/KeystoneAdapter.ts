import bs58 from 'bs58';
import { v4 as uuidv4 } from 'uuid';
import {
  CHAIN_FINGERPRINT_PATHS,
  DEVICE,
  DeviceJobQueue,
  HardwareErrorCode,
  MISSING_BIP32_MASTER_FINGERPRINT,
  OperationRegistry,
  SDK,
  TypedEventEmitter,
  UI_REQUEST,
  UI_REQUEST_CANCELLED_TAG,
  UI_REQUEST_PREEMPTED_TAG,
  UI_REQUEST_TIMEOUT_TAG,
  UI_RESPONSE,
  UiRequestRegistry,
  buildAllNetworkCancelledFailure,
  createHardwareSearchTargetId,
  createHwkError,
  deriveDeviceFingerprint,
  ensure0x,
  failure,
  getAllNetworkMethodChain,
  hasHardwareRuntimeIdPrefix,
  isAllNetworkMethodName,
  isConnectionLost,
  isHardwareOperationId,
  isHwkRecoveryHint,
  isUserRefusal,
  isWalletSafetyFailure,
  operationMayHaveCompletedParams,
  parseBip32MasterFingerprint,
  parseWalletMasterFingerprint,
  rehydrateConnectorError,
  resolveHardwareOperationTarget as resolveGenericHardwareOperationTarget,
  runAllNetworkGetAddress,
  success,
} from '@onekeyfe/hwk-adapter-core';

import { KeystoneUrEngine } from '../urEngine/KeystoneUrEngine';
import { getKeystoneFirmwareProfile } from './firmwareCapabilities';
import { TronSignType } from '../urEngine/TronSignRequest';
import {
  KEYSTONE_COLD_START_PATH,
  accountKey,
  createDeviceRecord,
  placeholderDeviceInfo,
  toDeviceInfo,
  toDeviceInfoForConnection,
  walletConnectId,
} from './deviceTable';
import {
  KEYSTONE_BTC_ACCOUNT_FORBIDDEN_MESSAGE,
  btcScriptTypeFromPath,
  isBip32Path,
  isKeystoneSignableBtcAccountPath,
  normalizePath,
  splitAccountPath,
} from './pathUtils';
import {
  KEYSTONE_COLD_START_JOB_LABEL,
  keystoneCancelQueueKeys,
  keystoneMfpFromIdentifier,
  keystoneQueueKey,
} from '../utils/queueKey';

import type {
  KeystoneEthSignRequestInput,
  KeystoneEthSignatureResult,
  KeystoneHardwareCallChainType,
  KeystoneKeySchema,
  KeystoneParsedMultiAccounts,
  KeystoneSolSignRequestInput,
  KeystoneUr,
} from '../urEngine/types';
import type { KeystoneAccountEntry, KeystoneDeviceRecord } from './deviceTable';
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
  CancelScopeHandle,
  ChainCapability,
  ChainForFingerprint,
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
  ExportedAccountKey,
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

/**
 * Keystone BTC addresses are always derived with mainnet parameters, and only from the full path:
 * another coin, or an index the path does not carry, would label a different address.
 */
function keystoneBtcParamsFailure(params: {
  coin?: unknown;
  addressIndex?: unknown;
  change?: unknown;
}): Response<never> | undefined {
  const { coin, addressIndex, change } = params;
  if (coin !== undefined && !['btc', 'bitcoin'].includes(String(coin).toLowerCase())) {
    return failure(
      HardwareErrorCode.ChainNotSupported,
      `Keystone BTC supports Bitcoin mainnet only, not ${String(coin)}`
    );
  }
  if (addressIndex !== undefined || change !== undefined) {
    return failure(
      HardwareErrorCode.InvalidParams,
      'Keystone BTC takes the full address path; addressIndex and change are not supported'
    );
  }
  return undefined;
}

/**
 * How an all-network item reads its key. QR: from the bundle's one scan, never the device again.
 * USB: straight from the device, on the session the bundle started with.
 */
type BundleAccess =
  | {
      channel: 'qr';
      scanned: ReadonlyMap<string, KeystoneAccountEntry>;
      firmwareVersion?: string;
      accountExport?: boolean;
    }
  | { channel: 'usb'; usbSessionId: string; qrFallback: QrFallbackChoice };

type QrAccountResponse = KeystoneUr & { accountExport?: boolean };

/** The answer to "show it as a QR?" for a request USB cannot carry; a bundle asks only once. */
type QrFallbackChoice = { confirmed?: boolean };

type OperationRoute = { operationId: string; connectionType: 'usb' | 'qr' };

type ExpectedWallet = { expectedMasterFingerprint?: string };

type CallTarget = { connectId: string | undefined; deviceId: string | undefined };

// Keystone briefly leaves the USB bus when entering external-wallet mode, so a persisted-wallet
// call must wait out re-enumeration instead of falling back to QR on one empty snapshot.
/**
 * Firmware MAX_KEY_DERIVATION_SCHEMAS (gui_key_derivation_request_widgets.c): a key request with more
 * paths is refused on the device. The Keystone SDK does not export it; use its value once it does.
 */
const KEYSTONE_MAX_KEY_DERIVATION_SCHEMAS = 24;

const KEYSTONE_USB_REATTACH_PROBE_ATTEMPTS = 4;
const KEYSTONE_USB_REATTACH_PROBE_INTERVAL_MS = 500;

const CHAIN_TYPE_BY_CHAIN: Partial<Record<ChainCapability, KeystoneHardwareCallChainType>> = {
  evm: 'ETH',
  sol: 'SOL',
  tron: 'TRX',
};

const BTC_CHAIN_TYPE_BY_PURPOSE: Record<number, KeystoneHardwareCallChainType> = {
  44: 'BTC_LEGACY',
  49: 'BTC',
  84: 'BTC_NATIVE_SEGWIT',
  86: 'BTC_TAPROOT',
};

/** Firmware before 3.0.4 rejects a path whose schema names no chain type it knows. */
function hardwareCallChainType(
  chain: ChainCapability,
  path: string
): KeystoneHardwareCallChainType | undefined {
  if (chain !== 'btc') return CHAIN_TYPE_BY_CHAIN[chain];
  const purpose = normalizePath(path).match(/^m\/(\d+)'/)?.[1];
  return purpose ? BTC_CHAIN_TYPE_BY_PURPOSE[Number(purpose)] : undefined;
}

function keySchema(chain: ChainCapability, path: string): KeystoneKeySchema {
  return {
    path,
    curve: chain === 'sol' ? 'ed25519' : 'secp256k1',
    chainType: hardwareCallChainType(chain, path),
  };
}

function waitForKeystoneUsbReattachProbe(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, KEYSTONE_USB_REATTACH_PROBE_INTERVAL_MS);
  });
}

const BIP44_COIN_TYPE_TO_CHAIN: Record<number, ChainCapability> = {
  60: 'evm',
  0: 'btc',
  501: 'sol',
  195: 'tron',
};

/** A path's BIP44 coin type (2nd segment) must belong to the chain asking for it. */
function hasChainCoinType(chain: ChainCapability, path: string): boolean {
  const match = normalizePath(path).match(/^m\/\d+'\/(\d+)'/);
  return Boolean(match) && BIP44_COIN_TYPE_TO_CHAIN[Number(match?.[1])] === chain;
}

/** Signing input must be exact hex: a lenient decode would silently sign a truncated payload. */
function exactHex(value: string): string | undefined {
  const hex = value.replace(/^0x/i, '');
  return /^(?:[0-9a-f]{2})*$/i.test(hex) ? hex : undefined;
}

function invalidHexFailure(field: string): Response<never> {
  return failure(HardwareErrorCode.InvalidParams, `${field} must be an even-length hex string`);
}

/** An export must contain the path that was asked for; anything else is not this request's answer. */
function requireExportedPath(
  parsed: KeystoneParsedMultiAccounts,
  path: string,
  accountExport = false
) {
  const account = parsed.accounts.find(returned => normalizePath(returned.path) === path);
  if (!account) {
    throw createHwkError({
      code: accountExport
        ? HardwareErrorCode.DevicePathForbidden
        : HardwareErrorCode.DeviceMismatch,
      message: `Keystone did not return the requested derivation path (${path})`,
      ...(accountExport ? { params: { reason: 'account-not-exported' } } : {}),
    });
  }
  return account;
}

function coinTypeFailure(chain: ChainCapability, path: string): Response<never> | undefined {
  if (hasChainCoinType(chain, path)) return undefined;
  return failure(
    HardwareErrorCode.InvalidParams,
    `Keystone ${chain} needs a path with its own BIP44 coin type, not ${path}`
  );
}

function btcAccountFailure(accountPath: string): Response<never> | undefined {
  if (isKeystoneSignableBtcAccountPath(accountPath)) return undefined;
  return failure(HardwareErrorCode.DevicePathForbidden, KEYSTONE_BTC_ACCOUNT_FORBIDDEN_MESSAGE, {
    reason: 'btc-account-limit',
  });
}

function missingParamFailure(method: string, param: string): Response<never> {
  return failure(HardwareErrorCode.InvalidParams, `${method} requires ${param}`);
}

/** Hex input must be exact hex; anything else is signed as its UTF-8 bytes. */
function messageToHex(message: string, hex: boolean | undefined): string | undefined {
  return hex ? exactHex(message) : Buffer.from(message, 'utf8').toString('hex');
}

function evmMessageSignature(sig: KeystoneEthSignatureResult): EvmSignature {
  return { signature: ensure0x(sig.r + sig.s + sig.v) };
}

export interface ImportFromQrOptions {
  /**
   * 'request' asks the device for one account; 'scan' waits for whatever export it already shows.
   * Only the wallet's master fingerprint is learned either way.
   */
  mode?: 'request' | 'scan';
}

/**
 * QR and USB behind one `IHardwareWallet`, keyed by the wallet's BIP32 master fingerprint.
 * Key material is fetched per operation and never retained.
 */
export class KeystoneAdapter implements IHardwareWallet {
  readonly vendor = 'keystone' as const;

  // No protocol-level cancel exists over Keystone USB, and QR has no transport
  // to interrupt at all. Cancelling ends the wait, not the device's prompt.
  readonly cancelCapability = 'stops-waiting' as const;

  private readonly urEngine: KeystoneUrEngine;

  private readonly emitter = new TypedEventEmitter<HardwareEventMap>();

  private readonly _operationRoutes = new Map<string, OperationRoute>();

  private readonly _operations = new OperationRegistry({
    vendor: 'keystone',
    onEnded: (operation, reason) => {
      const route = this._operationRoutes.get(operation.connectId);
      if (route?.operationId === operation.operationId) {
        this._operationRoutes.delete(operation.connectId);
        // A QR operation has no connection whose loss stops its work, so its queued calls and
        // prompts end with it; they could not be cancelled by name afterwards.
        if (route.connectionType === 'qr') {
          const ended = createHwkError({
            code: HardwareErrorCode.OperationEnded,
            message: 'Keystone operation has ended',
            params: { operationId: operation.operationId, reason },
          });
          const queueKey = keystoneQueueKey(operation.operationId);
          this._jobQueue.cancelActiveAndPending(queueKey, ended);
          this._uiRegistry.cancel(undefined, undefined, operation.operationId);
        }
      }
      this.emitter.emit(SDK.OPERATION_ENDED, {
        type: SDK.OPERATION_ENDED,
        payload: { operationId: operation.operationId, reason },
      });
      if (reason === 'timeout') {
        this._releaseOperationConnection(operation).catch(() => undefined);
      }
    },
  });

  private readonly _uiRegistry = new UiRequestRegistry();

  private readonly _jobQueue: DeviceJobQueue;

  private readonly _devices = new Map<string, KeystoneDeviceRecord>();

  private readonly _searchDeviceTargets = new Map<string, 'usb' | 'qr'>();

  private _activeSearchGeneration: symbol | undefined;

  private readonly _origin: string;

  /** Host answer timeout for QR display/scan requests; undefined uses the registry default. */
  private readonly _qrTimeoutMs: number | undefined;

  /** Host-supplied USB connector; undefined means QR-only. */
  private readonly _usbConnector: IConnector | undefined;

  /** Serializes USB open/identity handshakes that run outside the job queue. */
  private _usbConnectTail: Promise<void> = Promise.resolve();

  private readonly _unsettledUsbOperations = new Map<string, number>();

  private readonly _usbIdleWaiters = new Set<() => void>();

  private _abandonedUsbConnects = 0;

  private _usbTeardownTail: Promise<void> = Promise.resolve();

  private _pendingUsbTeardowns = 0;

  /** `switchTransport` pin; undefined means USB when the wallet has a live session, else QR. */
  private _forcedTransport: 'qr' | 'usb' | undefined;

  private readonly _handleUsbDisconnect = ({ connectId }: { connectId: string }): void => {
    const record = Array.from(this._devices.values()).find(item => item.usbSessionId === connectId);
    if (!record) return;

    // QR operations for the same wallet do not depend on this USB session.
    this._operations.endByConnectionKey(connectId, 'disconnect');

    record.usbSessionId = undefined;
    record.usbFirmwareVersion = undefined;
    const info = toDeviceInfo(record);
    if (record.qrSynced) {
      this.emitter.emit(DEVICE.CHANGED, { type: DEVICE.CHANGED, payload: info });
    } else {
      this._devices.delete(record.masterFingerprint);
      this.emitter.emit(DEVICE.DISCONNECT, { type: DEVICE.DISCONNECT, payload: info });
    }
  };

  private readonly _handleUsbUiEvent = (event: ConnectorEventMap['ui-event']): void => {
    const operationId = this._activeOperationId();
    this.emitter.emit('ui-event', operationId ? { ...event, operationId } : event);
  };

  constructor(options?: { origin?: string; qrTimeoutMs?: number; usbConnector?: IConnector }) {
    this._origin = options?.origin ?? 'OneKey';
    this._qrTimeoutMs = options?.qrTimeoutMs;
    this.urEngine = new KeystoneUrEngine(this._origin);
    this._jobQueue = new DeviceJobQueue();
    this._usbConnector = options?.usbConnector;
    this._usbConnector?.on('device-disconnect', this._handleUsbDisconnect);
    // Relayed verbatim like the Ledger adapter, so hosts reuse one handler.
    this._usbConnector?.on('ui-event', this._handleUsbUiEvent);
  }

  get activeTransport(): TransportType | null {
    if (this._devices.size === 0) return null;
    const hasUsbSession = Array.from(this._devices.values()).some(r => r.usbSessionId);
    return hasUsbSession ? 'usb' : 'qr';
  }

  getAvailableTransports(): TransportType[] {
    return this._usbConnector ? ['qr', 'usb'] : ['qr'];
  }

  /** Pins calls to 'qr' or 'usb'; any other value clears the pin back to auto routing. */
  switchTransport(type: TransportType): Promise<void> {
    this._forcedTransport = type === 'qr' || type === 'usb' ? type : undefined;
    return Promise.resolve();
  }

  init(_config?: unknown): Promise<void> {
    return Promise.resolve();
  }

  async dispose(): Promise<void> {
    this._operations.endAll('runtime-reset');
    this._uiRegistry.cancel();
    this._jobQueue.clear();
    this._searchDeviceTargets.clear();
    await this._usbConnectTail;
    await this._resetUsbSessions();
    this._usbConnector?.off('device-disconnect', this._handleUsbDisconnect);
    this._usbConnector?.off('ui-event', this._handleUsbUiEvent);
    this._usbConnector?.reset();
    this._devices.clear();
    this.emitter.removeAllListeners();
  }

  /**
   * Returns known wallets plus USB scan results; USB entries have no mfp until `connectDevice()`
   * claims them. Explicit QR discovery returns one virtual target.
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

    // QR has nothing to enumerate; a virtual target keeps the search/connect flow
    // without a device round trip during discovery.
    if (options?.transportType === 'qr') {
      const searchTargetId = createHardwareSearchTargetId('keystone');
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
      // A failed USB scan (no WebUSB, no permission) must not hide known QR wallets.
      if (options?.transportType === 'usb') throw error;
      return known;
    }
    if (this._activeSearchGeneration !== searchGeneration) return [];
    const placeholders: DeviceInfo[] = usbDevices.map(d => ({
      vendor: 'keystone',
      // Empty, not 'unknown': all models share one vid/pid, and a placeholder
      // string would beat the host's default-name fallback.
      model: d.model ?? '',
      modelName: d.modelName,
      // Unknown until the device is opened.
      firmwareVersion: '0.0.0',
      deviceId: d.deviceId,
      connectId: d.connectId,
      connectionType: 'usb',
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
      this._operations.endAll('runtime-reset');
      if (!this._usbConnector) return;

      const sessionIds = new Set(
        Array.from(this._devices.values())
          .map(record => record.usbSessionId)
          .filter((sessionId): sessionId is string => Boolean(sessionId))
      );
      for (const sessionId of sessionIds) {
        await this._retireUsbSession(sessionId);
      }
    });
  }

  /** Best-effort disconnect; the session is retired either way so it cannot be selected again. */
  private async _retireUsbSession(sessionId: string): Promise<void> {
    try {
      await this._usbConnector?.disconnect(sessionId);
    } catch {
      // Local routing state is cleared below regardless.
    }
    this._handleUsbDisconnect({ connectId: sessionId });
  }

  async searchDeviceTargets(options?: SearchDevicesOptions): Promise<DeviceSearchTarget[]> {
    const devices = await this.searchDevices(options);
    return devices.map(device => ({
      searchTargetId: device.connectId,
      // The master fingerprint is known only after the USB/QR handshake.
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

  async connectDevice(searchTargetId: string): Promise<Response<string>> {
    const scope = this._jobQueue.createCancelScope(searchTargetId);
    try {
      let connected: Response<DeviceInfo>;
      let selectedConnectionType: 'usb' | 'qr';
      const discoveredConnectionType = this._searchDeviceTargets.get(searchTargetId);
      if (discoveredConnectionType === 'qr') {
        selectedConnectionType = 'qr';
        // Queue under this search target so a cancel aimed at it stops only this scan, and return
        // on that cancel instead of waiting for an earlier scan to leave the queue.
        connected = await KeystoneAdapter._untilAborted(
          scope.signal,
          this._importFromQr({}, searchTargetId)
        );
      } else if (discoveredConnectionType === 'usb') {
        selectedConnectionType = 'usb';
        if (!this._usbConnector) {
          return failure(
            HardwareErrorCode.TransportNotAvailable,
            'No USB connector configured for this Keystone adapter'
          );
        }
        connected = await this._connectUsb(this._usbConnector, {}, searchTargetId, scope.signal);
      } else if (hasHardwareRuntimeIdPrefix(searchTargetId)) {
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
          connected = success(toDeviceInfo(target.record));
        } else if (!this._usbConnector) {
          return failure(
            HardwareErrorCode.DeviceNotFound,
            `Unknown Keystone device search target: ${searchTargetId}`
          );
        } else {
          selectedConnectionType = 'usb';
          connected = await this._connectUsb(this._usbConnector, target, undefined, scope.signal);
        }
      }
      KeystoneAdapter._throwIfAborted(scope.signal);
      if (!connected.success) return connected;

      const record = this._devices.get(connected.payload.deviceId);
      this._operations.endByConnectionKey(connected.payload.connectId, 'explicit');
      const operation = this._operations.create({
        searchTargetId,
        connectId: connected.payload.connectId,
        device: connected.payload,
        connectionType: selectedConnectionType,
        connectionKeys:
          selectedConnectionType === 'usb' && record?.usbSessionId ? [record.usbSessionId] : [],
      });
      this._operationRoutes.set(connected.payload.connectId, {
        operationId: operation.operationId,
        connectionType: selectedConnectionType,
      });
      return success(operation.operationId);
    } catch (err) {
      return this._errorToFailure<string>(err);
    } finally {
      scope.release();
    }
  }

  /**
   * QR has nothing to tear down. A USB session is closed, and the record is demoted to QR-only or
   * removed if it was never QR-synced.
   */
  async releaseOperation(operationId: string): Promise<void> {
    const operation = this._operations.find(operationId);
    if (!operation) {
      this._operations.resolve(operationId);
      return;
    }
    const endedOperation = this._operations.end(operationId, 'explicit');
    if (!endedOperation) return;
    await this._releaseOperationConnection(endedOperation);
  }

  private async _releaseOperationConnection(
    operation: NonNullable<ReturnType<OperationRegistry['find']>>
  ): Promise<void> {
    const { connectId } = operation;
    let record: KeystoneDeviceRecord | undefined;
    try {
      record = this._resolveTarget(connectId).record;
    } catch {
      return;
    }
    if (!record?.usbSessionId || !operation.connectionKeys.includes(record.usbSessionId)) {
      return;
    }

    const { usbSessionId } = record;
    await this._runUsbTeardown(() => this._retireUsbSession(usbSessionId));
  }

  getDeviceInfo(connectIdOrOperationId: string, deviceId: string): Promise<Response<DeviceInfo>> {
    try {
      const operation = isHardwareOperationId(connectIdOrOperationId)
        ? this._operations.resolve(connectIdOrOperationId)
        : undefined;
      const connectId = operation?.connectId ?? connectIdOrOperationId;
      const { record } = this._resolveTarget(connectId, deviceId);
      if (!record) {
        return Promise.resolve(
          failure(HardwareErrorCode.DeviceNotFound, 'Unknown Keystone device')
        );
      }
      const info = operation
        ? toDeviceInfoForConnection(record, operation.connectionType === 'qr' ? 'qr' : 'usb')
        : toDeviceInfo(record);
      return Promise.resolve(success(info));
    } catch (err) {
      return Promise.resolve(this._errorToFailure<DeviceInfo>(err));
    }
  }

  cancel(connectId?: string): void {
    // An ended operation id names nothing: return rather than decay into an
    // untargeted cancel that takes down an unrelated job.
    if (isHardwareOperationId(connectId)) {
      try {
        this._operations.resolve(connectId);
      } catch {
        // Ended (tombstoned) and never-existed both land here.
        return;
      }
    }
    const reason = createHwkError({
      code: HardwareErrorCode.UserAborted,
      message: 'User aborted operation',
    });
    if (connectId) {
      const scopedOperationId = isHardwareOperationId(connectId)
        ? connectId
        : this._operationRouteForIdentifier(connectId)?.operationId;
      // An operation-scoped cancel must not expand to unrelated wallet-scoped calls.
      const queueKeys = keystoneCancelQueueKeys([
        connectId,
        this._operationRoutes.get(connectId)?.operationId,
      ]);
      for (const key of queueKeys) {
        this._jobQueue.cancelActiveAndPending(key, reason);
      }
      // A named cancel clears only its own operation's prompts; an unresolvable
      // name clears nothing.
      if (scopedOperationId) {
        this._uiRegistry.cancel(undefined, undefined, scopedOperationId);
      }
    } else {
      // Nothing to name: teardown clears every waiter.
      this._jobQueue.cancelActiveAndPending(undefined, reason);
      this._uiRegistry.cancel();
    }
  }

  /**
   * Derived from the wallet's master fingerprint, which the caller already holds as deviceId; the
   * device is never asked. It names the wallet but cannot check which device is attached.
   */
  getChainFingerprint(
    connectId: string,
    deviceId: string,
    chain: ChainForFingerprint
  ): Promise<Response<string>> {
    try {
      const target = this._resolveTarget(connectId, deviceId);
      const masterFingerprint = target.expectedMasterFingerprint;
      if (!masterFingerprint) {
        return Promise.resolve(
          failure(HardwareErrorCode.DeviceNotFound, 'Unknown Keystone wallet identity')
        );
      }
      return Promise.resolve(
        success(deriveDeviceFingerprint(`keystone:${chain}:${masterFingerprint}`))
      );
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
  // Explicit account import: call before signing to avoid a cold sync per call.
  // ---------------------------------------------------------------------------

  async importFromQr(options: ImportFromQrOptions = {}): Promise<Response<DeviceInfo>> {
    return this._importFromQr(options, KEYSTONE_COLD_START_JOB_LABEL);
  }

  private async _importFromQr(
    options: ImportFromQrOptions,
    jobKey: string
  ): Promise<Response<DeviceInfo>> {
    try {
      return await this._jobQueue.enqueue(jobKey, async signal => {
        const displayDevice = placeholderDeviceInfo();
        let responseUr: QrAccountResponse;

        if (options.mode === 'scan') {
          responseUr = await this._requestQrAndAwaitResponse(displayDevice, undefined, signal);
        } else {
          const requestUr = this.urEngine.buildKeyDerivationRequest({
            schemas: [keySchema('evm', KEYSTONE_COLD_START_PATH)],
            origin: this._origin,
          });
          responseUr = await this._requestQrAndAwaitResponse(
            displayDevice,
            { ...requestUr, animated: false, allowAccountExport: true },
            signal
          );
        }
        KeystoneAdapter._throwIfAborted(signal);

        const parsed = responseUr.accountExport
          ? this.urEngine.parseAccountExport(responseUr)
          : this.urEngine.parseAccountResponse(responseUr);
        // A device-initiated scan carries whatever the device chose to sync; a displayed request
        // must be answered with the path it asked for.
        if (!responseUr.accountExport) requireExportedPath(parsed, KEYSTONE_COLD_START_PATH);
        const record = this._upsertDeviceRecord(parsed);
        return success(toDeviceInfo(record));
      });
    } catch (err) {
      return this._errorToFailure<DeviceInfo>(err);
    }
  }

  // ---------------------------------------------------------------------------
  // All-network bundle, dispatched to the per-chain methods below.
  // ---------------------------------------------------------------------------

  allNetworkGetAddress = async (
    connectId: string,
    deviceId: string,
    params: AllNetworkGetAddressParams
  ): Promise<Response<AllNetworkAddressResponse[]>> => {
    const operationTarget = this._resolveOperationTarget(connectId, params.operationId);
    if (!operationTarget.success) return operationTarget;
    const effectiveConnectId = operationTarget.payload.targetId ?? '';
    const { operationId } = operationTarget.payload;
    // The wallet may be named at the top or on any item; every name must agree.
    const namedWallets = new Set(
      [deviceId, ...params.bundle.map(item => (item as { deviceId?: unknown }).deviceId)].filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      )
    );
    if (namedWallets.size > 1) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'Keystone all-network items name different wallets'
      );
    }
    const [expectedDeviceId = ''] = namedWallets;
    let cancelScope: CancelScopeHandle | undefined;
    try {
      const prepared = await this._prepareAllNetworkBundle(effectiveConnectId, expectedDeviceId, {
        ...params,
        operationId,
      });
      const { access } = prepared;
      // On a cold start the QR scan established the wallet identity; route
      // per-item calls to it instead of re-syncing per item.
      const itemDeviceId = expectedDeviceId || prepared.masterFingerprint || '';
      // A cancel between two per-item jobs finds nothing to abort; the scope
      // carries it across that gap under the same queue key.
      const scope = this._jobQueue.createCancelScope(
        keystoneQueueKey(effectiveConnectId, itemDeviceId)
      );
      cancelScope = scope;
      const cancelledIndexes = new Set<number>();
      return await runAllNetworkGetAddress({
        connectId: effectiveConnectId,
        deviceId: itemDeviceId,
        params,
        callItem: async ({ method, item, index }) => {
          if (scope.signal.aborted) {
            cancelledIndexes.add(index);
            return buildAllNetworkCancelledFailure(scope.signal);
          }
          const commonArgs = {
            path: item.path,
            showOnDevice: item.showOnDevice,
            operationId,
          };
          switch (method) {
            case 'evmGetAddress':
              return this.evmGetAddress(effectiveConnectId, itemDeviceId, commonArgs, access);
            case 'btcGetAddress':
            case 'btcGetPublicKey': {
              // The item's network names the coin, so it is checked like a coin param.
              const btcArgs = {
                ...commonArgs,
                coin: (item as { coin?: string }).coin ?? item.network,
              };
              return method === 'btcGetAddress'
                ? this.btcGetAddress(effectiveConnectId, itemDeviceId, btcArgs, access)
                : this.btcGetPublicKey(effectiveConnectId, itemDeviceId, btcArgs, access);
            }
            case 'solGetAddress':
              return this.solGetAddress(effectiveConnectId, itemDeviceId, commonArgs, access);
            case 'tronGetAddress':
              return this.tronGetAddress(effectiveConnectId, itemDeviceId, commonArgs, access);
            // no default
          }
        },
        attachIdentity: context => {
          const { record } = this._resolveTarget(effectiveConnectId, itemDeviceId);
          return Promise.resolve({
            ...context.item,
            success: true,
            payload: {
              ...context.payload,
              ...(access?.channel === 'qr' && access.accountExport ? { accountExport: true } : {}),
              rootFingerprint: record ? Number.parseInt(record.masterFingerprint, 16) : undefined,
              deviceIdentity: record
                ? {
                    vendor: 'keystone' as const,
                    type: 'walletId' as const,
                    value: record.masterFingerprint,
                  }
                : undefined,
            },
          });
        },
        // Cancel, refusal, a lost connection or a safety answer (another wallet, a locked
        // device) ends the batch; other per-item failures carry on with the next chain.
        shouldAbortBundle: (response, { index }) => {
          const { code } = response.payload ?? {};
          const usbSessionLost =
            access?.channel === 'usb' &&
            this._resolveTarget(effectiveConnectId, itemDeviceId).record?.usbSessionId !==
              access.usbSessionId;
          return (
            cancelledIndexes.has(index) ||
            usbSessionLost ||
            isWalletSafetyFailure(code) ||
            isUserRefusal(code) ||
            isConnectionLost(code)
          );
        },
      });
    } catch (err) {
      return this._errorToFailure<AllNetworkAddressResponse[]>(err);
    } finally {
      cancelScope?.release();
    }
  };

  async evmGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<EvmGetAddressParams>>,
    bundle?: BundleAccess
  ): Promise<Response<EvmAddress>> {
    const call = this._beginCall('evmGetAddress', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { params } = call.payload;
    if (!params.path) return missingParamFailure('evmGetAddress', 'params.path');
    const evmCoinTypeFailure = coinTypeFailure('evm', params.path);
    if (evmCoinTypeFailure) return evmCoinTypeFailure;

    return this._addressFromAccountXpub(
      'evmGetAddress',
      'evm',
      call.payload,
      params.path,
      "m/44'/60'/0'/0/0",
      bundle,
      (xpub, relativeDerivePath) => this.urEngine.deriveEvmAddressFromXpub(xpub, relativeDerivePath)
    );
  }

  async evmSignTransaction(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<EvmSignTxParams>>
  ): Promise<Response<EvmSignedTx>> {
    const call = this._beginCall('evmSignTransaction', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { params } = call.payload;
    if (!params.path) return missingParamFailure('evmSignTransaction', 'params.path');
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
    const rawTxHex = exactHex(params.serializedTx);
    if (rawTxHex === undefined) return invalidHexFailure('serializedTx');
    // EIP-2718 typed txs start with a type byte < 0x80; legacy RLP lists start at >= 0xc0.
    const dataType = parseInt(rawTxHex.slice(0, 2), 16) < 0xc0 ? 'typedTransaction' : 'transaction';

    return this._evmSign(
      'evmSignTransaction',
      call.payload,
      params.path,
      params.chainId,
      rawTxHex,
      dataType,
      (sig): EvmSignedTx => ({ v: ensure0x(sig.v), r: ensure0x(sig.r), s: ensure0x(sig.s) })
    );
  }

  async evmSignMessage(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<EvmSignMsgParams>>
  ): Promise<Response<EvmSignature>> {
    const call = this._beginCall('evmSignMessage', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { params } = call.payload;
    if (!params.path || params.message === undefined) {
      return missingParamFailure('evmSignMessage', 'params.path and params.message');
    }
    const messageHex = messageToHex(params.message, params.hex);
    if (messageHex === undefined) return invalidHexFailure('message');

    return this._evmSign(
      'evmSignMessage',
      call.payload,
      params.path,
      params.chainId,
      messageHex,
      'personalMessage',
      evmMessageSignature
    );
  }

  async evmSignTypedData(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<EvmSignTypedDataParams>>
  ): Promise<Response<EvmSignature>> {
    const call = this._beginCall('evmSignTypedData', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { params } = call.payload;
    if (!params.path) return missingParamFailure('evmSignTypedData', 'params.path');
    if (params.mode === 'hash') {
      return failure(
        HardwareErrorCode.MethodNotSupported,
        'Keystone always displays the full EIP-712 payload for on-device review — pre-hashed signing is not supported'
      );
    }
    // The device parses and hashes the JSON itself, so it must be the caller's exact text:
    // re-stringifying `data` can rewrite integers above 2^53 into different values.
    if (typeof params.dataJson !== 'string' || !params.dataJson) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'Keystone evmSignTypedData requires params.dataJson, the original typed-data JSON text'
      );
    }
    const signDataHex = Buffer.from(params.dataJson, 'utf8').toString('hex');

    return this._evmSign(
      'evmSignTypedData',
      call.payload,
      params.path,
      params.chainId,
      signDataHex,
      'typedData',
      evmMessageSignature
    );
  }

  // ---------------------------------------------------------------------------
  // BTC: 44'/49'/84' addresses derive offline from the account xpub; P2TR addresses
  // and structured-field tx signing are unsupported (the host builds a PSBT instead).
  // ---------------------------------------------------------------------------

  async btcGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<BtcGetAddressParams>>,
    bundle?: BundleAccess
  ): Promise<Response<BtcAddress>> {
    const call = this._beginCall('btcGetAddress', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { params } = call.payload;
    if (!params.path) return missingParamFailure('btcGetAddress', 'params.path');
    const btcParamsFailure = keystoneBtcParamsFailure(params);
    if (btcParamsFailure) return btcParamsFailure;

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

    return this._addressFromAccountXpub(
      'btcGetAddress',
      'btc',
      call.payload,
      params.path,
      "m/84'/0'/0'/0/0",
      bundle,
      (xpub, relativeDerivePath) =>
        this.urEngine.deriveBtcAddressFromXpub(xpub, relativeDerivePath, scriptType)
    );
  }

  /**
   * `params.path` must be an account path (`m/84'/0'/0'`), the level Keystone syncs. An xpub is
   * script-type agnostic, so `86'` works here even though `btcGetAddress` rejects it.
   */
  async btcGetPublicKey(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<BtcGetPublicKeyParams>>,
    bundle?: BundleAccess
  ): Promise<Response<BtcPublicKey>> {
    const call = this._beginCall('btcGetPublicKey', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { connectId, deviceId, params } = call.payload;
    if (!params.path) return missingParamFailure('btcGetPublicKey', 'params.path');
    const btcParamsFailure = keystoneBtcParamsFailure(params);
    if (btcParamsFailure) return btcParamsFailure;

    const { accountPath, relativeDerivePath } = splitAccountPath(params.path);
    if (relativeDerivePath) {
      return failure(
        HardwareErrorCode.InvalidParams,
        "btcGetPublicKey requires an account path, e.g. m/84'/0'/0' (not a leaf path)"
      );
    }
    const accountFailure = btcAccountFailure(accountPath);
    if (accountFailure) return accountFailure;

    return this._runJob(connectId, deviceId, async signal => {
      const xpub = await this._fetchAccountXpub(
        connectId,
        deviceId,
        'btc',
        accountPath,
        signal,
        bundle
      );
      const meta = this.urEngine.parseXpubMeta(xpub);
      return success<BtcPublicKey>({
        xpub,
        publicKey: meta.publicKey,
        chainCode: meta.chainCode,
        depth: meta.depth,
        fingerprint: meta.parentFingerprint,
        path: normalizePath(accountPath),
        accountKey: this._exportedAccountKey(accountPath, xpub),
      });
    });
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
    const call = this._beginCall('btcSignPsbt', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { connectId, deviceId, params } = call.payload;
    if (!params.psbt) return missingParamFailure('btcSignPsbt', 'params.psbt');
    // `path` is optional in the shared type, but the account-0 gate needs it.
    if (!params.path) return missingParamFailure('btcSignPsbt', 'params.path');
    const accountFailure = btcAccountFailure(splitAccountPath(params.path).accountPath);
    if (accountFailure) return accountFailure;

    const requestPsbtHex = exactHex(params.psbt);
    if (requestPsbtHex === undefined) return invalidHexFailure('psbt');
    return this._runJob(connectId, deviceId, async signal => {
      // A PSBT may span several paths; only the wallet's mfp is needed.
      const { record } = await this._ensureWalletKnown(connectId, deviceId, 'btc', signal);
      KeystoneAdapter._throwIfAborted(signal);

      const requestUr = this.urEngine.buildBtcPsbtRequest(requestPsbtHex);
      const responseUr = await this._resolveUr(
        record,
        requestUr,
        true,
        connectId,
        signal,
        'btc',
        'btcSignPsbt'
      );
      KeystoneAdapter._throwIfAborted(signal);

      const signedPsbt = this.urEngine.parseBtcPsbt(responseUr, requestPsbtHex);
      return success<BtcSignedPsbt>({ signedPsbt });
    });
  }

  async btcSignMessage(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<BtcSignMsgParams>>
  ): Promise<Response<BtcSignature>> {
    const call = this._beginCall('btcSignMessage', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { connectId, deviceId, params } = call.payload;
    if (!params.path || params.message === undefined) {
      return missingParamFailure('btcSignMessage', 'params.path and params.message');
    }
    const messageHex = messageToHex(params.message, params.hex);
    if (messageHex === undefined) return invalidHexFailure('message');
    const path = normalizePath(params.path);
    const accountFailure = btcAccountFailure(splitAccountPath(path).accountPath);
    if (accountFailure) return accountFailure;

    return this._signWithWallet({
      connectId,
      deviceId,
      path,
      chain: 'btc',
      operationName: 'btcSignMessage',
      buildRequest: (requestId, xfp) =>
        this.urEngine.buildBtcMessageSignRequest({
          requestId,
          messageHex,
          accounts: [{ path, xfp }],
          origin: this._origin,
        }),
      parseResponse: ur => this.urEngine.parseBtcSignature(ur),
      toPayload: (sig): BtcSignature => ({ signature: sig.signature }),
    });
  }

  /**
   * Returns the known master fingerprint for the named wallet without asking the device (a QR
   * round trip only to repeat it would cost a scan). Use it to name the wallet, for example as a
   * PSBT xfp, which the device itself checks when signing; it cannot check the attached device.
   */
  async btcGetMasterFingerprint(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCommonCallParams>
  ): Promise<Response<{ masterFingerprint: string }>> {
    const operationTarget = this._resolveOperationTarget(connectIdArg, paramsArg?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
    return this._runJob(connectId, deviceId, async signal => {
      const { record } = await this._ensureWalletKnown(connectId, deviceId, 'btc', signal);
      return success({ masterFingerprint: record.masterFingerprint });
    });
  }

  async solGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<SolGetAddressParams>>,
    bundle?: BundleAccess
  ): Promise<Response<SolAddress>> {
    const call = this._beginCall('solGetAddress', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { connectId, deviceId, params } = call.payload;
    if (!params.path) return missingParamFailure('solGetAddress', 'params.path');
    const solCoinTypeFailure = coinTypeFailure('sol', params.path);
    if (solCoinTypeFailure) return solCoinTypeFailure;
    const path = normalizePath(params.path);
    // Ed25519 keys only derive along hardened segments; do not rely on firmware to refuse others.
    if (!/^m(\/\d+')+$/.test(path)) {
      return failure(
        HardwareErrorCode.InvalidParams,
        "solGetAddress requires a fully hardened path, e.g. m/44'/501'/0'/0'"
      );
    }

    return this._runJob(connectId, deviceId, async signal => {
      const { account } = await this._fetchAccount(
        connectId,
        deviceId,
        'sol',
        path,
        signal,
        bundle
      );
      KeystoneAdapter._throwIfAborted(signal);
      if (!/^[0-9a-f]{64}$/i.test(account.publicKey)) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceMismatch,
          message: 'Keystone returned a Solana key that is not a 32-byte Ed25519 public key',
        });
      }
      // The Ed25519 public key is the Solana address (base58).
      const address = bs58.encode(Buffer.from(account.publicKey, 'hex'));
      return success<SolAddress>({
        address,
        path,
        accountKey: { path, publicKey: account.publicKey },
      });
    });
  }

  async solSignTransaction(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<SolSignTxParams>>
  ): Promise<Response<SolSignedTx>> {
    const call = this._beginCall('solSignTransaction', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { params } = call.payload;
    if (!params.path || !params.serializedTx) {
      return missingParamFailure('solSignTransaction', 'params.path and params.serializedTx');
    }
    const unsignedPayloadHex = exactHex(params.serializedTx);
    if (unsignedPayloadHex === undefined) return invalidHexFailure('serializedTx');
    return this._solSign(
      'solSignTransaction',
      call.payload,
      params.path,
      unsignedPayloadHex,
      'transaction'
    );
  }

  async solSignMessage(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<SolSignMsgParams>>
  ): Promise<Response<SolSignature>> {
    const call = this._beginCall('solSignMessage', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { params } = call.payload;
    if (!params.path || !params.message) {
      return missingParamFailure('solSignMessage', 'params.path and params.message');
    }
    // The request carries only the message bytes; the off-chain message envelope and its signer
    // set never reach the device, so the signature would not verify as one.
    if (params.messageVersion !== undefined) {
      return failure(
        HardwareErrorCode.MethodNotSupported,
        'Keystone signs Solana messages as raw bytes only; off-chain message format is not supported'
      );
    }
    const unsignedPayloadHex = exactHex(params.message);
    if (unsignedPayloadHex === undefined) return invalidHexFailure('message');
    return this._solSign(
      'solSignMessage',
      call.payload,
      params.path,
      unsignedPayloadHex,
      'message'
    );
  }

  // ---------------------------------------------------------------------------
  // TRON: keystone-sdk-rust layout (tags 5201/5202, firmware >= 2.5.0), not sdk.tron's
  // protobuf module; OneKey Pro's encoding under the same tag is rejected by the firmware.
  // ---------------------------------------------------------------------------

  async tronGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<TronGetAddressParams>>,
    bundle?: BundleAccess
  ): Promise<Response<TronAddress>> {
    const call = this._beginCall('tronGetAddress', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { params } = call.payload;
    if (!params.path) return missingParamFailure('tronGetAddress', 'params.path');
    const tronCoinTypeFailure = coinTypeFailure('tron', params.path);
    if (tronCoinTypeFailure) return tronCoinTypeFailure;

    return this._addressFromAccountXpub(
      'tronGetAddress',
      'tron',
      call.payload,
      params.path,
      "m/44'/195'/0'/0/0",
      bundle,
      (xpub, relativeDerivePath) =>
        this.urEngine.deriveTronAddressFromXpub(xpub, relativeDerivePath)
    );
  }

  async tronSignTransaction(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<TronSignTxParams>>
  ): Promise<Response<TronSignedTx>> {
    const call = this._beginCall('tronSignTransaction', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { params } = call.payload;
    if (!params.path) return missingParamFailure('tronSignTransaction', 'params.path');
    if (!params.rawTxHex) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'Keystone only signs a fully protobuf-serialized TRON transaction (params.rawTxHex) — the Trezor-style structured contract fields have no equivalent here'
      );
    }
    const rawTxHex = exactHex(params.rawTxHex);
    if (rawTxHex === undefined) return invalidHexFailure('rawTxHex');

    // Keystone signs rawTxHex as given and returns only the signature, so no serializedTx.
    return this._tronSign('tronSignTransaction', call.payload, params.path, rawTxHex);
  }

  async tronSignMessage(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCallParams<TronSignMsgParams>>
  ): Promise<Response<TronSignature>> {
    const call = this._beginCall('tronSignMessage', connectIdArg, deviceIdArg, paramsArg);
    if (!call.success) return call;
    const { params } = call.payload;
    if (!params.path) return missingParamFailure('tronSignMessage', 'params.path');
    if (!params.messageHex) return missingParamFailure('tronSignMessage', 'params.messageHex');
    // Firmware implements TIP-191 signMessageV2 only.
    if (params.messageType !== 'V2') {
      return failure(
        HardwareErrorCode.MethodNotSupported,
        'Keystone signs TRON messages as TIP-191 signMessageV2 only (messageType: "V2")'
      );
    }
    const messageHex = exactHex(params.messageHex);
    if (messageHex === undefined) return invalidHexFailure('messageHex');

    return this._tronSign(
      'tronSignMessage',
      call.payload,
      params.path,
      messageHex,
      TronSignType.PersonalMessage
    );
  }

  /** Resolves the call's target and requires params, before any method-specific check. */
  private _beginCall<P extends IHardwareCommonCallParams>(
    method: string,
    connectIdArg: NullableCallArg<string>,
    deviceIdArg: NullableCallArg<string>,
    params: NullableCallArg<P>
  ): Response<CallTarget & { params: P }> {
    const operationTarget = this._resolveOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    if (!params) return missingParamFailure(method, 'params');
    return success({
      connectId: operationTarget.payload.targetId,
      deviceId: deviceIdArg ?? undefined,
      params,
    });
  }

  /** Derives a leaf address offline from its account xpub. */
  private async _addressFromAccountXpub(
    method: string,
    chain: 'evm' | 'btc' | 'tron',
    { connectId, deviceId }: CallTarget,
    path: string,
    leafExample: string,
    bundle: BundleAccess | undefined,
    derive: (xpub: string, relativeDerivePath: string) => string
  ): Promise<Response<{ address: string; path: string; accountKey: ExportedAccountKey }>> {
    const normalizedPath = normalizePath(path);
    const { accountPath, relativeDerivePath } = splitAccountPath(normalizedPath);
    if (!relativeDerivePath) {
      return failure(
        HardwareErrorCode.InvalidParams,
        `${method} requires a full leaf path, e.g. ${leafExample}`
      );
    }
    const accountFailure = chain === 'btc' ? btcAccountFailure(accountPath) : undefined;
    if (accountFailure) return accountFailure;

    return this._runJob(connectId, deviceId, async signal => {
      const xpub = await this._fetchAccountXpub(
        connectId,
        deviceId,
        chain,
        accountPath,
        signal,
        bundle
      );
      // showOnDevice is accepted but not wired: Keystone firmware cannot show an address on
      // request yet, so the address is derived offline from an unsigned export. Wire it here once
      // the device supports it.
      return success({
        address: derive(xpub, relativeDerivePath),
        path: normalizedPath,
        accountKey: this._exportedAccountKey(accountPath, xpub),
      });
    });
  }

  private _evmSign<T>(
    method: string,
    target: CallTarget,
    rawPath: string,
    chainId: number | undefined,
    signDataHex: string,
    dataType: KeystoneEthSignRequestInput['dataType'],
    toPayload: (signature: KeystoneEthSignatureResult) => T
  ): Promise<Response<T>> {
    const path = normalizePath(rawPath);
    return this._signWithWallet({
      connectId: target.connectId,
      deviceId: target.deviceId,
      path,
      chain: 'evm',
      operationName: method,
      buildRequest: (requestId, xfp) =>
        this.urEngine.buildEthSignRequest({
          requestId,
          unsignedTxHex: signDataHex,
          dataType,
          path,
          xfp,
          chainId,
          origin: this._origin,
        }),
      parseResponse: ur => this.urEngine.parseEthSignature(ur),
      toPayload,
    });
  }

  private _solSign(
    method: string,
    target: CallTarget,
    rawPath: string,
    unsignedPayloadHex: string,
    dataType: KeystoneSolSignRequestInput['dataType']
  ): Promise<Response<{ signature: string }>> {
    const path = normalizePath(rawPath);
    return this._signWithWallet({
      connectId: target.connectId,
      deviceId: target.deviceId,
      path,
      chain: 'sol',
      operationName: method,
      buildRequest: (requestId, xfp) =>
        this.urEngine.buildSolSignRequest({
          requestId,
          unsignedPayloadHex,
          dataType,
          path,
          xfp,
          origin: this._origin,
        }),
      parseResponse: ur => this.urEngine.parseSolSignature(ur),
      toPayload: sig => ({ signature: sig.signature }),
    });
  }

  private _tronSign(
    method: string,
    target: CallTarget,
    rawPath: string,
    signDataHex: string,
    signType?: TronSignType
  ): Promise<Response<{ signature: string }>> {
    const path = normalizePath(rawPath);
    return this._signWithWallet({
      connectId: target.connectId,
      deviceId: target.deviceId,
      path,
      chain: 'tron',
      operationName: method,
      buildRequest: (requestId, xfp) =>
        this.urEngine.buildTronSignRequest({
          requestId,
          rawTxHex: signDataHex,
          path,
          xfp,
          signType,
          origin: this._origin,
        }),
      parseResponse: ur => this.urEngine.parseTronSignature(ur),
      toPayload: sig => ({ signature: sig.signature }),
    });
  }

  private async _runJob<T>(
    connectId: string | undefined,
    deviceId: string | undefined,
    job: (signal: AbortSignal) => Promise<Response<T>>
  ): Promise<Response<T>> {
    try {
      return await this._jobQueue.enqueue(keystoneQueueKey(connectId, deviceId), job);
    } catch (err) {
      return this._errorToFailure<T>(err);
    }
  }

  private async _fetchAccountXpub(
    connectId: string | undefined,
    deviceId: string | undefined,
    hwkChain: ChainCapability,
    accountPath: string,
    signal: AbortSignal,
    bundle: BundleAccess | undefined
  ): Promise<string> {
    const { account } = await this._fetchAccount(
      connectId,
      deviceId,
      hwkChain,
      accountPath,
      signal,
      bundle
    );
    KeystoneAdapter._throwIfAborted(signal);
    if (!account.extendedPublicKey) {
      throw createHwkError({
        code: HardwareErrorCode.MethodNotSupported,
        message: 'Keystone did not return an extended public key for this account path',
      });
    }
    // BIP-32 serializes a public key as 02/03||x and a private key as 00||k; only the former is
    // an account export.
    const { publicKey } = this.urEngine.parseXpubMeta(account.extendedPublicKey);
    if (!/^0[23]/.test(publicKey)) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: 'Keystone returned an account key that is not a public key',
      });
    }
    return account.extendedPublicKey;
  }

  /** The exported key behind an address, reduced to the fields that identify it. */
  private _exportedAccountKey(accountPath: string, xpub: string): ExportedAccountKey {
    const { publicKey, chainCode } = this.urEngine.parseXpubMeta(xpub);
    return { path: normalizePath(accountPath), publicKey, chainCode, xpub };
  }

  /**
   * Signing needs only the wallet's mfp: the device re-derives the key from path+xfp, so no
   * per-path account lookup happens here.
   */
  private _signWithWallet<S extends { requestId?: string }, T>(args: {
    connectId: string | undefined;
    deviceId: string | undefined;
    path: string;
    chain: ChainForFingerprint;
    operationName: string;
    buildRequest: (requestId: string, xfp: string) => KeystoneUr;
    parseResponse: (responseUr: KeystoneUr) => S;
    toPayload: (signature: S) => T;
  }): Promise<Response<T>> {
    const { connectId, deviceId } = args;
    if (!isBip32Path(args.path)) {
      return Promise.resolve(
        failure(HardwareErrorCode.InvalidParams, `Invalid derivation path (${args.path})`)
      );
    }
    // Signing keys follow the same chain/coin-type pairing as the address methods.
    const chainCoinTypeFailure = coinTypeFailure(args.chain, args.path);
    if (chainCoinTypeFailure) return Promise.resolve(chainCoinTypeFailure);
    return this._runJob(connectId, deviceId, async signal => {
      const { record } = await this._ensureWalletKnown(connectId, deviceId, args.chain, signal);
      KeystoneAdapter._throwIfAborted(signal);

      const requestId = uuidv4();
      const requestUr = args.buildRequest(requestId, record.masterFingerprint);
      const responseUr = await this._resolveUr(
        record,
        requestUr,
        true,
        connectId,
        signal,
        args.chain,
        args.operationName
      );
      KeystoneAdapter._throwIfAborted(signal);

      const signature = args.parseResponse(responseUr);
      KeystoneAdapter._assertRequestIdMatches(requestId, signature.requestId);
      return success(args.toPayload(signature));
    });
  }

  private _allNetworkSyncSchema(
    item: AllNetworkAddressParams
  ): { hwkChain: ChainCapability; path: string } | undefined {
    if (!isAllNetworkMethodName(String(item.methodName)) || !item.path) return undefined;

    const method = item.methodName;
    const hwkChain = getAllNetworkMethodChain(method);
    const path = normalizePath(item.path);
    // Paths the per-item call refuses (another chain's coin type, an unsignable BTC account) stay
    // out of the QR request so the device is not asked to export them.
    if (!hasChainCoinType(hwkChain, path)) return undefined;
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
      // no default
    }
  }

  /**
   * Picks the bundle's channel. QR answers every item with one request QR and one scan; USB items
   * each ask the device directly, like other vendors, on the session found here.
   */
  private async _prepareAllNetworkBundle(
    connectId: string,
    deviceId: string,
    params: AllNetworkGetAddressParams
  ): Promise<{ access?: BundleAccess; masterFingerprint?: string }> {
    return this._jobQueue.enqueue(keystoneQueueKey(connectId, deviceId), async signal => {
      const target = this._resolveTarget(connectId, deviceId);
      let { record } = target;

      const requestedByKey = new Map<string, { hwkChain: ChainCapability; path: string }>();
      for (const item of params.bundle) {
        const schema = this._allNetworkSyncSchema(item);
        if (schema) requestedByKey.set(accountKey(schema.hwkChain, schema.path), schema);
      }
      const scanned = new Map<string, KeystoneAccountEntry>();
      // Nothing to export: no channel is opened, and no item can reach the device.
      if (!requestedByKey.size) {
        return { access: { channel: 'qr', scanned } };
      }

      // An operation routed to QR at connectDevice must stay on QR.
      const operation = isHardwareOperationId(params.operationId)
        ? this._operations.find(params.operationId)
        : undefined;
      const operationRoute = operation ? this._operationRoutes.get(operation.connectId) : undefined;
      const routedToQr =
        operationRoute?.operationId === operation?.operationId &&
        operationRoute?.connectionType === 'qr';

      if (
        this._forcedTransport !== 'qr' &&
        !routedToQr &&
        !record?.usbSessionId &&
        this._usbConnector &&
        target.expectedMasterFingerprint
      ) {
        record = (await this._tryUsbAttach(signal, target.expectedMasterFingerprint)) ?? record;
        KeystoneAdapter._throwIfAborted(signal);
      }

      // importFromQr keeps a leftover usbSessionId on the record; the route,
      // not that session, decides the channel.
      if (this._forcedTransport !== 'qr' && !routedToQr && record?.usbSessionId) {
        return {
          access: { channel: 'usb', usbSessionId: record.usbSessionId, qrFallback: {} },
          masterFingerprint: record.masterFingerprint,
        };
      }
      if (this._forcedTransport === 'usb' && !routedToQr) {
        throw createHwkError({
          code: HardwareErrorCode.TransportNotAvailable,
          message: 'USB channel is not connected for this Keystone wallet',
        });
      }

      const schemas = Array.from(requestedByKey.values());
      if (schemas.length > KEYSTONE_MAX_KEY_DERIVATION_SCHEMAS) {
        throw createHwkError({
          code: HardwareErrorCode.QrRequestTooLarge,
          message: `Keystone accepts at most ${KEYSTONE_MAX_KEY_DERIVATION_SCHEMAS} account paths per QR request; this one needs ${schemas.length}`,
          params: { limit: KEYSTONE_MAX_KEY_DERIVATION_SCHEMAS, requested: schemas.length },
        });
      }
      const request = {
        ...this.urEngine.buildKeyDerivationRequest({
          schemas: schemas.map(schema => keySchema(schema.hwkChain, schema.path)),
          origin: this._origin,
        }),
        animated: false,
        allowAccountExport: true,
      };
      const responseUr = await this._requestQrAndAwaitResponse(
        record ? toDeviceInfo(record) : placeholderDeviceInfo(),
        request,
        signal
      );
      KeystoneAdapter._throwIfAborted(signal);

      const parsed = responseUr.accountExport
        ? this.urEngine.parseAccountExport(responseUr)
        : this.urEngine.parseAccountResponse(responseUr);
      this._assertParsedIdentity(parsed, target);
      const firmware = getKeystoneFirmwareProfile(parsed.deviceVersion);
      if (responseUr.accountExport && parsed.accounts.some(account => !isBip32Path(account.path))) {
        throw createHwkError({
          code: HardwareErrorCode.InvalidParams,
          message: 'Account export contains an invalid derivation path',
        });
      }
      // Only requested paths are taken from the scan, each under the chain that asked for it.
      // Normal responses must contain every path; explicit device exports may contain a subset.
      for (const schema of schemas) {
        const exported = responseUr.accountExport
          ? parsed.accounts.find(account => normalizePath(account.path) === schema.path)
          : requireExportedPath(parsed, schema.path);
        if (
          exported &&
          (!responseUr.accountExport ||
            !firmware ||
            firmware.supportedChains.includes(schema.hwkChain))
        ) {
          scanned.set(accountKey(schema.hwkChain, schema.path), {
            ...exported,
            hwkChain: schema.hwkChain,
          });
        }
      }
      if (responseUr.accountExport && !scanned.size) {
        throw createHwkError({
          code: HardwareErrorCode.DevicePathForbidden,
          message: 'Account export contains none of the requested supported account paths',
          params: { reason: 'account-not-exported' },
        });
      }
      record = this._upsertDeviceRecord(parsed);
      return {
        access: {
          channel: 'qr',
          scanned,
          firmwareVersion: parsed.deviceVersion,
          ...(responseUr.accountExport ? { accountExport: true } : {}),
        },
        masterFingerprint: record.masterFingerprint,
      };
    });
  }

  /**
   * A positional wallet id and an operation id must name the same wallet: otherwise the call
   * would run on the operation's wallet while the caller files the result under the other one.
   * Ids that do not carry a master fingerprint cannot be compared and pass through.
   */
  private _resolveOperationTarget(
    positionalTargetId: string | null | undefined,
    operationId: string | null | undefined
  ): ReturnType<typeof resolveGenericHardwareOperationTarget> {
    const target = resolveGenericHardwareOperationTarget(
      positionalTargetId,
      operationId,
      'keystone'
    );
    if (
      !target.success ||
      !operationId ||
      !positionalTargetId ||
      isHardwareOperationId(positionalTargetId)
    ) {
      return target;
    }
    const operation = this._operations.find(operationId);
    const positionalMfp = keystoneMfpFromIdentifier(positionalTargetId);
    const operationMfp = operation ? keystoneMfpFromIdentifier(operation.connectId) : undefined;
    if (positionalMfp && operationMfp && positionalMfp !== operationMfp) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'Keystone connectId and operationId name different wallets'
      );
    }
    return target;
  }

  private _resolveTarget(
    connectId?: string,
    deviceId?: string
  ): ExpectedWallet & { record?: KeystoneDeviceRecord } {
    const resolvedConnectId = isHardwareOperationId(connectId)
      ? this._operations.resolve(connectId).connectId
      : connectId;
    const identifiers = [deviceId, resolvedConnectId].filter((identifier): identifier is string =>
      Boolean(identifier)
    );
    if (!identifiers.length) return {};

    const fingerprints = identifiers.map(identifier => keystoneMfpFromIdentifier(identifier));
    const expectedMasterFingerprint = fingerprints[0];
    if (!expectedMasterFingerprint || fingerprints.some(value => !value)) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: 'Keystone device lookup requires the wallet master fingerprint',
      });
    }
    if (fingerprints.some(value => value !== expectedMasterFingerprint)) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: 'Keystone connectId and deviceId identify different wallets',
      });
    }

    return {
      record: this._devices.get(expectedMasterFingerprint),
      expectedMasterFingerprint,
    };
  }

  private _assertParsedIdentity(
    parsed: KeystoneParsedMultiAccounts,
    expected: ExpectedWallet
  ): void {
    if (
      expected.expectedMasterFingerprint &&
      parsed.masterFingerprint !== expected.expectedMasterFingerprint
    ) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        // The master fingerprint identifies the wallet; keep it out of messages that reach logs.
        message: 'Connected Keystone wallet does not match the requested wallet',
      });
    }
  }

  /**
   * Folds a parsed account response into the device table. Only non-USB round trips mark
   * `qrSynced`, so a USB-only wallet is dropped on disconnect.
   */
  private _upsertDeviceRecord(
    parsed: KeystoneParsedMultiAccounts,
    options?: {
      viaUsb?: boolean;
      usbSessionId?: string;
      usbFirmwareVersion?: string;
    }
  ): KeystoneDeviceRecord {
    const { masterFingerprint } = parsed;
    let record = this._devices.get(masterFingerprint);
    const isNew = !record;
    if (!record) {
      record = createDeviceRecord(masterFingerprint);
      this._devices.set(masterFingerprint, record);
    }
    record.model = parsed.device;
    record.hardwareDeviceId = parsed.deviceId;
    if (options?.usbSessionId) {
      record.usbSessionId = options.usbSessionId;
      record.usbFirmwareVersion = options.usbFirmwareVersion;
      record.hadUsbSession = true;
    }
    if (!options?.viaUsb) {
      record.deviceVersion = parsed.deviceVersion;
      record.qrSynced = true;
    }

    const info = toDeviceInfo(record);
    const eventType = isNew ? DEVICE.CONNECT : DEVICE.CHANGED;
    this.emitter.emit(eventType, { type: eventType, payload: info });
    return record;
  }

  /**
   * Opens a permitted USB Keystone and takes its mfp as the wallet identity. A known wallet gains
   * USB in place (`device-changed`); an unseen one becomes USB-only.
   */
  private async _connectUsb(
    connector: IConnector,
    expected: ExpectedWallet,
    searchTargetId: string | undefined,
    signal: AbortSignal
  ): Promise<Response<DeviceInfo>> {
    if (this._pendingUsbTeardowns > 0 || this._abandonedUsbConnects > 0) {
      return failure(
        HardwareErrorCode.DeviceBusyInternal,
        'Keystone USB session is being released'
      );
    }
    KeystoneAdapter._throwIfAborted(signal);
    let abandoned = false;
    const onAbort = () => {
      abandoned = true;
      this._abandonedUsbConnects += 1;
    };
    signal.addEventListener('abort', onAbort, { once: true });
    // Cancellation releases the caller, not the physical USB transfer. Keep
    // the tail until the late result has been rejected and disconnected.
    const pending = this._usbConnectTail.then(async () => {
      KeystoneAdapter._throwIfAborted(signal);
      // A request still on the wire (e.g. from a cancelled call) would be reset by opening the
      // device again. While the connect holds the device, calls are refused and teardowns wait.
      if (this._unsettledUsbOperations.size > 0) {
        return failure(
          HardwareErrorCode.DeviceBusyInternal,
          'Keystone USB is still finishing an earlier request'
        );
      }
      const releaseConnect = this._retainUsbOperation('connect');
      try {
        return await this._connectUsbExclusive(connector, expected, searchTargetId, signal);
      } finally {
        releaseConnect();
      }
    });
    const settled = pending.finally(() => {
      signal.removeEventListener('abort', onAbort);
      if (abandoned) this._abandonedUsbConnects -= 1;
    });
    this._usbConnectTail = settled.then(
      () => undefined,
      () => undefined
    );
    return KeystoneAdapter._abortable(signal, settled);
  }

  private async _connectUsbExclusive(
    connector: IConnector,
    expected: ExpectedWallet,
    searchTargetId: string | undefined,
    signal: AbortSignal
  ): Promise<Response<DeviceInfo>> {
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
      const session = await (connector.connectTarget
        ? connector.connectTarget(connectTarget)
        : connector.connect(searchTargetId ?? expected.expectedMasterFingerprint));
      sessionId = session.sessionId;
      KeystoneAdapter._throwIfAborted(signal);
      const raw = session.deviceInfo.raw as { masterFingerprint?: unknown } | undefined;
      const mfpValue = parseWalletMasterFingerprint(raw?.masterFingerprint);
      if (!mfpValue) {
        const empty =
          parseBip32MasterFingerprint(raw?.masterFingerprint) === MISSING_BIP32_MASTER_FINGERPRINT;
        throw createHwkError({
          code: empty ? HardwareErrorCode.DeviceNotInitialized : HardwareErrorCode.DeviceMismatch,
          message: empty
            ? 'Keystone has no wallet yet; it reported an empty master fingerprint'
            : 'Keystone USB did not report a master fingerprint',
        });
      }
      const masterFingerprint = mfpValue.toLowerCase();
      this._assertParsedIdentity({ masterFingerprint, accounts: [] }, expected);

      const previousUsbSessionId = this._devices.get(masterFingerprint)?.usbSessionId;
      if (previousUsbSessionId && previousUsbSessionId !== session.sessionId) {
        try {
          await connector.disconnect(previousUsbSessionId);
        } catch {
          // The replacement session is authoritative even if stale teardown fails.
        }
      }
      KeystoneAdapter._throwIfAborted(signal);
      const record = this._upsertDeviceRecord(
        {
          masterFingerprint,
          accounts: [],
          device: session.deviceInfo.modelName ?? session.deviceInfo.model,
        },
        {
          viaUsb: true,
          usbSessionId: session.sessionId,
          usbFirmwareVersion: session.deviceInfo.firmwareVersion,
        }
      );
      KeystoneAdapter._throwIfAborted(signal);
      return success(toDeviceInfo(record));
    } catch (err) {
      if (sessionId) {
        try {
          await connector.disconnect(sessionId);
        } catch {
          // Preserve the identity/export failure; teardown is best-effort.
        }
      }
      return this._errorToFailure<DeviceInfo>(err);
    }
  }

  /**
   * Probes already-authorized USB devices without a permission picker, then attaches and verifies
   * the requested wallet if present.
   */
  private async _tryUsbAttach(
    signal: AbortSignal,
    expectedMasterFingerprint?: string,
    options?: { waitForReenumeration?: boolean }
  ): Promise<KeystoneDeviceRecord | undefined> {
    KeystoneAdapter._throwIfAborted(signal);
    if (!expectedMasterFingerprint || this._forcedTransport === 'qr' || !this._usbConnector) {
      return undefined;
    }

    const maxAttempts = options?.waitForReenumeration ? KEYSTONE_USB_REATTACH_PROBE_ATTEMPTS : 1;
    let availableDevices: ConnectorDevice[] = [];
    let lastSearchError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      KeystoneAdapter._throwIfAborted(signal);
      try {
        // eslint-disable-next-line no-await-in-loop
        availableDevices = await KeystoneAdapter._abortable(
          signal,
          this._usbConnector.searchDevices({ purpose: 'availability' })
        );
        lastSearchError = undefined;
      } catch (error) {
        lastSearchError = error;
      }
      KeystoneAdapter._throwIfAborted(signal);
      if (availableDevices.length) {
        break;
      }
      if (attempt < maxAttempts) {
        // eslint-disable-next-line no-await-in-loop
        await KeystoneAdapter._abortable(signal, waitForKeystoneUsbReattachProbe());
      }
    }
    if (!availableDevices.length) {
      // Waiting for re-enumeration is for the first call after a session was lost; once a full
      // wait finds nothing, later calls probe once.
      const record = options?.waitForReenumeration
        ? this._devices.get(expectedMasterFingerprint)
        : undefined;
      if (record) record.hadUsbSession = false;
      if (this._forcedTransport === 'usb' && lastSearchError) {
        throw lastSearchError instanceof Error
          ? lastSearchError
          : new Error(String(lastSearchError));
      }
      return undefined;
    }

    // Enumeration retries are silent; the connect runs once, targeted at the expected mfp.
    const attached = await this._connectUsb(
      this._usbConnector,
      { expectedMasterFingerprint },
      undefined,
      signal
    );
    KeystoneAdapter._throwIfAborted(signal);
    // A cancelled transfer still draining is busy, not absent; don't fall back to QR. Two devices
    // claiming this wallet are not a missing device either: the user must see it and unplug one.
    if (
      !attached.success &&
      (attached.payload.code === HardwareErrorCode.DeviceBusyInternal ||
        attached.payload.code === HardwareErrorCode.DeviceOneDeviceOnly)
    ) {
      throw createHwkError({
        ...attached.payload,
        message: attached.payload.error,
      });
    }
    return attached.success ? this._devices.get(expectedMasterFingerprint) : undefined;
  }

  /**
   * Decides QR vs USB for one UR round trip. A pinned 'usb' with no live session reattaches once
   * and fails closed if that fails; otherwise a failed USB reattach leaves the call on QR.
   */
  private async _resolveUr(
    record: KeystoneDeviceRecord | undefined,
    requestUr: KeystoneUr,
    animated: boolean,
    operationId: string | undefined,
    signal: AbortSignal,
    chain: ChainCapability,
    operationName?: string,
    qrFallback?: QrFallbackChoice
  ): Promise<QrAccountResponse> {
    const releaseOperationRetention = isHardwareOperationId(operationId)
      ? this._operations.retain(operationId)
      : undefined;
    try {
      return await this._resolveUrWithRoute(
        record,
        requestUr,
        animated,
        operationId,
        signal,
        chain,
        operationName,
        qrFallback
      );
    } finally {
      releaseOperationRetention?.();
    }
  }

  private async _resolveUrWithRoute(
    callerRecord: KeystoneDeviceRecord | undefined,
    requestUr: KeystoneUr,
    animated: boolean,
    operationId: string | undefined,
    signal: AbortSignal,
    chain: ChainCapability,
    operationName?: string,
    qrFallback?: QrFallbackChoice
  ): Promise<QrAccountResponse> {
    let record = callerRecord;
    let interactionRoute: OperationRoute | undefined;
    if (isHardwareOperationId(operationId)) {
      const operation = this._operations.resolve(operationId);
      const route = this._operationRoutes.get(operation.connectId);
      if (!route || route.operationId !== operationId) {
        throw this._endDisconnectedOperation(
          operationId,
          'Keystone hardware operation is no longer connected'
        );
      }
      interactionRoute = route;
    }
    // One USB reattach. Unpinned, a failure is not surfaced and the call stays on QR; pinned to
    // USB, an enumeration error surfaces and a missing device fails closed below.
    if (
      !interactionRoute &&
      this._forcedTransport !== 'qr' &&
      record &&
      !record.usbSessionId &&
      this._usbConnector
    ) {
      record =
        (await this._tryUsbAttach(signal, record.masterFingerprint, {
          waitForReenumeration: record.hadUsbSession,
        })) ?? record;
    }

    const wantUsb = interactionRoute
      ? interactionRoute.connectionType === 'usb'
      : this._forcedTransport === 'usb' ||
        (this._forcedTransport !== 'qr' && Boolean(record?.usbSessionId));
    if (wantUsb) {
      if (!record?.usbSessionId || !this._usbConnector) {
        if (interactionRoute) {
          throw this._endDisconnectedOperation(
            interactionRoute.operationId,
            'Keystone operation USB connection was lost'
          );
        }
        throw createHwkError({
          code: HardwareErrorCode.TransportNotAvailable,
          message: 'USB channel is not connected for this Keystone wallet',
        });
      }
      this._assertChainSupported(record.usbFirmwareVersion, chain);
      const result = await this._callUsbResolveUr(
        this._usbConnector,
        record.usbSessionId,
        requestUr,
        signal
      );
      if (result.success) {
        const ur = result.payload as KeystoneUr;
        return { urType: ur.urType, urData: ur.urData };
      }

      const usbError = rehydrateConnectorError(result.error);
      const { origin: usbErrorOrigin, code: usbErrorCode } = usbError as Error & {
        origin?: string;
        code?: number;
      };
      if (usbErrorCode === HardwareErrorCode.PayloadTooLarge && usbErrorOrigin !== 'device') {
        if (!interactionRoute && !this._forcedTransport) {
          if (!(await this._confirmQrFallback(signal, qrFallback))) {
            throw createHwkError({
              code: HardwareErrorCode.UserAborted,
              message: 'User declined to show the request too large for USB as a QR code',
            });
          }
          const displayDevice = toDeviceInfo(record);
          return this._requestQrAndAwaitResponse(
            displayDevice,
            {
              ...requestUr,
              animated,
              ...(!operationName ? { allowAccountExport: true } : {}),
            },
            signal
          );
        }
        // Rejected by the host before sending: keep the pinned session and report
        // the limit without implying the operation ran.
        throw usbError;
      }
      // No QR retry once the request is on the wire. Only a pipe failure drops the session;
      // `origin` decides when stamped, else the code list of device answers.
      const deviceAnswered =
        usbErrorOrigin !== undefined
          ? usbErrorOrigin === 'device'
          : usbErrorCode === HardwareErrorCode.UserRejected ||
            usbErrorCode === HardwareErrorCode.UserAborted ||
            usbErrorCode === HardwareErrorCode.DeviceLocked ||
            usbErrorCode === HardwareErrorCode.DeviceMismatch;
      if (!deviceAnswered) {
        // Hand the session back so the connector releases its transport and listener.
        const lostSessionId = record.usbSessionId;
        if (lostSessionId) {
          this._usbConnector?.disconnect(lostSessionId).catch(() => undefined);
        }
        record.usbSessionId = undefined;
        record.usbFirmwareVersion = undefined;
        // Later calls for this wallet fall back to QR; announce it as an unplug would, so the host
        // can tell the user the channel changed instead of switching silently.
        this.emitter.emit(DEVICE.CHANGED, { type: DEVICE.CHANGED, payload: toDeviceInfo(record) });
        if (interactionRoute) {
          throw this._endDisconnectedOperation(
            interactionRoute.operationId,
            operationName
              ? `Keystone ${operationName} may have completed before the USB connection was lost`
              : 'Keystone operation USB connection was lost',
            operationName
          );
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
      // The device answered with a reply that cannot be read. The session stays, but a signing
      // request may already have been approved on the device, so it must not be resent blindly.
      if (operationName && (usbError as { replyUnreadable?: unknown }).replyUnreadable === true) {
        throw createHwkError({
          code: (usbErrorCode as HardwareErrorCode) ?? HardwareErrorCode.UnknownError,
          message: `Keystone ${operationName} may have completed but its reply could not be read`,
          origin: 'device',
          recovery: { scope: 'unknown' },
          params: operationMayHaveCompletedParams(operationName),
        });
      }
      throw usbError;
    }

    const displayDevice = record ? toDeviceInfo(record) : placeholderDeviceInfo();
    try {
      return await this._requestQrAndAwaitResponse(
        displayDevice,
        { ...requestUr, animated, ...(!operationName ? { allowAccountExport: true } : {}) },
        signal
      );
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

  /** Ends the operation as disconnected and returns the error to throw. */
  private _endDisconnectedOperation(
    operationId: string,
    message: string,
    operationName?: string
  ): Error {
    this._operations.end(operationId, 'disconnect');
    const params = { operationId, reason: 'disconnect' };
    return createHwkError({
      code: HardwareErrorCode.OperationEnded,
      message,
      recovery: operationName ? { scope: 'unknown' } : undefined,
      params: operationName ? operationMayHaveCompletedParams(operationName, params) : params,
    });
  }

  /**
   * Fetches one account's key material. An all-network QR item takes it from the bundle's scan; a
   * USB item asks the device on the bundle's session. A failed USB export ends the operation
   * without replaying or switching transports.
   */
  private async _fetchAccount(
    connectId: string | undefined,
    deviceId: string | undefined,
    hwkChain: ChainCapability,
    syncPath: string,
    signal: AbortSignal,
    bundle?: BundleAccess
  ): Promise<{ record: KeystoneDeviceRecord; account: KeystoneAccountEntry }> {
    const target = this._resolveTarget(connectId, deviceId);
    if (bundle?.channel === 'qr') {
      const scanned = bundle.scanned.get(accountKey(hwkChain, syncPath));
      if (target.record && !scanned && bundle.accountExport) {
        throw createHwkError({
          code: HardwareErrorCode.DevicePathForbidden,
          message: 'Scanned account export does not include this account path',
          params: { reason: 'account-not-exported' },
        });
      }
      if (!target.record || !scanned) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceMismatch,
          message: `Keystone did not return the requested derivation path (${syncPath})`,
        });
      }
      this._assertChainSupported(bundle.firmwareVersion, hwkChain);
      return { record: target.record, account: scanned };
    }
    if (bundle?.channel === 'usb' && target.record?.usbSessionId !== bundle.usbSessionId) {
      throw createHwkError({
        code: HardwareErrorCode.TransportNotAvailable,
        message: 'Keystone USB connection was lost during the bundle',
      });
    }
    const operationConnectionType = isHardwareOperationId(connectId)
      ? this._operations.resolve(connectId).connectionType
      : undefined;
    let existingRecord = target.record;
    if (!existingRecord) {
      existingRecord = await this._tryUsbAttach(signal, target.expectedMasterFingerprint);
      KeystoneAdapter._throwIfAborted(signal);
    }
    const schemas = [keySchema(hwkChain, syncPath)];
    const requestUr = this.urEngine.buildKeyDerivationRequest({ schemas, origin: this._origin });
    const responseUr = await this._resolveUr(
      existingRecord,
      requestUr,
      false,
      connectId,
      signal,
      hwkChain,
      undefined,
      bundle?.channel === 'usb' ? bundle.qrFallback : undefined
    );
    KeystoneAdapter._throwIfAborted(signal);

    const parsed = responseUr.accountExport
      ? this.urEngine.parseAccountExport(responseUr)
      : this.urEngine.parseAccountResponse(responseUr);
    this._assertParsedIdentity(parsed, target);
    const account = requireExportedPath(parsed, syncPath, responseUr.accountExport);
    // Read the session after resolveUr, which may reattach USB. An explicit QR route still wins.
    const useSinglePathUsbExport =
      !responseUr.accountExport &&
      (operationConnectionType
        ? operationConnectionType === 'usb'
        : this._forcedTransport === 'usb' ||
          (this._forcedTransport !== 'qr' && Boolean(existingRecord?.usbSessionId)));
    let record: KeystoneDeviceRecord;
    if (useSinglePathUsbExport && existingRecord) {
      if (parsed.masterFingerprint !== existingRecord.masterFingerprint) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceMismatch,
          message: 'Keystone USB account export returned a different master fingerprint',
        });
      }
      record = existingRecord;
    } else {
      this._assertChainSupported(parsed.deviceVersion, hwkChain);
      record = this._upsertDeviceRecord(parsed);
    }
    return { record, account: { ...account, hwkChain } };
  }

  /**
   * Resolves which wallet is attached, without a per-path account. `CHAIN_FINGERPRINT_PATHS.evm` is
   * a leaf path, so it is cut to the account path Keystone expects.
   */
  private async _ensureWalletKnown(
    connectId: string | undefined,
    deviceId: string | undefined,
    chain: ChainForFingerprint,
    signal: AbortSignal
  ): Promise<{ record: KeystoneDeviceRecord }> {
    const target = this._resolveTarget(connectId, deviceId);
    if (target.record) return { record: target.record };

    const attached = await this._tryUsbAttach(signal, target.expectedMasterFingerprint);
    KeystoneAdapter._throwIfAborted(signal);
    if (attached) return { record: attached };

    // The caller named the wallet: its mfp is all a signing request needs, and a wrong wallet is
    // refused by the device itself. No identity round trip first.
    if (target.expectedMasterFingerprint) {
      return { record: createDeviceRecord(target.expectedMasterFingerprint) };
    }

    // A true cold start: ask the device once for any account, which carries the mfp.
    const { accountPath } = splitAccountPath(CHAIN_FINGERPRINT_PATHS[chain]);
    const requestUr = this.urEngine.buildKeyDerivationRequest({
      schemas: [keySchema(chain, accountPath)],
      origin: this._origin,
    });
    const responseUr = await this._resolveUr(undefined, requestUr, false, connectId, signal, chain);
    KeystoneAdapter._throwIfAborted(signal);

    const parsed = responseUr.accountExport
      ? this.urEngine.parseAccountExport(responseUr)
      : this.urEngine.parseAccountResponse(responseUr);
    requireExportedPath(parsed, normalizePath(accountPath), responseUr.accountExport);
    this._assertChainSupported(parsed.deviceVersion, chain);
    const record = this._upsertDeviceRecord(parsed);
    return { record };
  }

  private _assertChainSupported(firmwareVersion: string | undefined, chain: ChainCapability): void {
    const firmware = getKeystoneFirmwareProfile(firmwareVersion);
    if (firmware && !firmware.supportedChains.includes(chain)) {
      throw createHwkError({
        code: HardwareErrorCode.ChainNotSupported,
        message: `Keystone ${firmware.variant} firmware cannot use ${chain} through this adapter`,
        params: { firmwareVariant: firmware.variant, chain },
      });
    }
  }

  /** Only an operation id supplied to the running call owns its UI prompts. */
  private _activeOperationId(): string | undefined {
    return this._operations.findOperationIdByJobKey(this._jobQueue.getActiveJob()?.deviceId);
  }

  /** Routes are keyed by connectId; a job key may be the bare master fingerprint. */
  private _operationRouteForIdentifier(identifier: string): OperationRoute | undefined {
    for (const key of keystoneCancelQueueKeys([identifier])) {
      const route = this._operationRoutes.get(key);
      if (route) return route;
    }
    const masterFingerprint = keystoneMfpFromIdentifier(identifier);
    return masterFingerprint
      ? this._operationRoutes.get(walletConnectId(masterFingerprint))
      : undefined;
  }

  /**
   * A QR prompt has no transport to interrupt; releasing the registry slot on abort is what lets
   * a cancel reach the wait before the QR timeout.
   */
  private async _awaitQrResponse<T>(
    requestType: string,
    pending: Promise<T>,
    signal: AbortSignal
  ): Promise<T> {
    let settled = false;
    const onAbort = () => {
      if (!settled) this._uiRegistry.cancel(requestType);
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
    try {
      return await pending;
    } catch (error) {
      // An ended operation aborts its calls with OperationEnded; report that, not the prompt's cancel.
      const reason = signal.reason as { code?: unknown } | undefined;
      if (signal.aborted && reason?.code === HardwareErrorCode.OperationEnded) throw signal.reason;
      throw error;
    } finally {
      settled = true;
      signal.removeEventListener('abort', onAbort);
    }
  }

  /**
   * Asks whether a request too large for USB may be shown as a QR. A timeout or an unanswered
   * prompt reads as no; a cancelled call keeps its own error.
   */
  private async _confirmQrFallback(
    signal: AbortSignal,
    choice: QrFallbackChoice | undefined
  ): Promise<boolean> {
    if (choice?.confirmed !== undefined) return choice.confirmed;
    const requestType = UI_REQUEST.REQUEST_QR_FALLBACK_CONFIRM;
    const operationId = this._activeOperationId();
    const release = operationId ? this._operations.retain(operationId) : undefined;
    try {
      const waitPromise = this._uiRegistry.wait<{ confirmed: boolean }>(requestType, {
        operationId,
      });
      this.emitter.emit(requestType, {
        type: requestType,
        payload: { vendor: 'keystone', operationId },
      });
      let confirmed = false;
      try {
        confirmed = Boolean(
          (await this._awaitQrResponse(requestType, waitPromise, signal))?.confirmed
        );
      } catch (error) {
        if (signal.aborted) throw error;
      }
      if (choice) choice.confirmed = confirmed;
      return confirmed;
    } finally {
      release?.();
    }
  }

  /** Shows `data` for the device to scan, or with no `data` asks the host to scan the device. */
  private async _requestQrAndAwaitResponse(
    device: DeviceInfo,
    data: QrDisplayData | undefined,
    signal: AbortSignal
  ): Promise<QrAccountResponse> {
    const requestType = data ? UI_REQUEST.REQUEST_QR_DISPLAY : UI_REQUEST.REQUEST_QR_SCAN;
    const operationId = this._activeOperationId();
    // An open prompt keeps its operation alive, so the operation's TTL cannot end a pending scan.
    const release = operationId ? this._operations.retain(operationId) : undefined;
    try {
      const waitPromise = this._uiRegistry.wait<QrAccountResponse>(requestType, {
        timeoutMs: this._qrTimeoutMs,
        operationId,
      });
      if (data) {
        this.emitter.emit(UI_REQUEST.REQUEST_QR_DISPLAY, {
          type: UI_REQUEST.REQUEST_QR_DISPLAY,
          payload: { device, data, operationId },
        });
      } else {
        this.emitter.emit(UI_REQUEST.REQUEST_QR_SCAN, {
          type: UI_REQUEST.REQUEST_QR_SCAN,
          payload: { device, operationId },
        });
      }
      const response = await this._awaitQrResponse(requestType, waitPromise, signal);
      if (response.accountExport && data && !data.allowAccountExport) {
        throw createHwkError({
          code: HardwareErrorCode.InvalidParams,
          message: 'This request cannot be answered with an account export',
        });
      }
      return {
        urType: response.urType,
        urData: response.urData,
        ...(!data || response.accountExport ? { accountExport: true } : {}),
      };
    } finally {
      release?.();
    }
  }

  private async _callUsbResolveUr(
    connector: IConnector,
    sessionId: string,
    requestUr: KeystoneUr,
    signal: AbortSignal
  ): Promise<ConnectorCallResult> {
    if (this._pendingUsbTeardowns > 0 || this._unsettledUsbOperations.size > 0) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceBusyInternal,
        message: 'Keystone USB is busy while calling resolveUr',
      });
    }
    // Checked before the connector call: racing an aborted signal would still put
    // the command on the wire.
    if (signal.aborted) {
      throw signal.reason instanceof Error
        ? signal.reason
        : createHwkError({
            code: HardwareErrorCode.UserAborted,
            message: 'User aborted operation',
          });
    }
    const releaseOperation = this._retainUsbOperation(`call:${sessionId}`);
    let rawCall: Promise<ConnectorCallResult>;
    try {
      rawCall = connector.call(sessionId, 'resolveUr', requestUr).finally(releaseOperation);
    } catch (error) {
      releaseOperation();
      throw error;
    }
    return KeystoneAdapter._abortable(signal, rawCall);
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
        await previous;
        await this._waitForUsbOperationsToDrain();
        await task();
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
    const abortReason = () =>
      signal.reason instanceof Error ? signal.reason : new Error('Aborted');
    if (signal.aborted) return Promise.reject(abortReason());
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(abortReason());
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

  /** Settles with `signal`'s reason once it aborts; a later outcome of `promise` is dropped. */
  private static _untilAborted<T>(signal: AbortSignal, promise: Promise<T>): Promise<T> {
    promise.catch(() => undefined);
    if (signal.aborted) return Promise.reject(signal.reason);
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
      promise
        .then(resolve, reject)
        .finally(() => signal.removeEventListener('abort', onAbort))
        .catch(() => undefined);
    });
  }

  private static _throwIfAborted(signal: AbortSignal | undefined): void {
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new Error('Operation aborted');
    }
  }

  /** A response without the request's id is as unrelated as one with another id. */
  private static _assertRequestIdMatches(expected: string, actual?: string): void {
    if (!actual || actual.toLowerCase() !== expected.toLowerCase()) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message: actual
          ? 'Keystone response requestId does not match the pending request — discarding a stale or unrelated scan'
          : 'Keystone response carries no requestId — discarding a stale or unrelated scan',
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
      // Only five-digit codes are HWK codes; a DOMException code or errno falls
      // through to UnknownError with its message.
      if (typeof e.code === 'number' && e.code >= 10000 && e.code <= 99999) {
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
          e.message ?? 'Keystone QR operation was cancelled'
        );
      }
      if (e._tag === UI_REQUEST_TIMEOUT_TAG) {
        return failure(
          HardwareErrorCode.OperationTimeout,
          e.message ?? 'Keystone QR operation timed out'
        );
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    // An uncoded error here is usually a real bug; keep the stack for the host.
    const params = err instanceof Error && err.stack ? { stack: err.stack } : undefined;
    return failure(HardwareErrorCode.UnknownError, message, params);
  }
}
