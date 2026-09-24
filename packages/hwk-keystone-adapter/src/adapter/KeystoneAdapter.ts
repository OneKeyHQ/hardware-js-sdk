import bs58 from 'bs58';
import { v4 as uuidv4 } from 'uuid';
import {
  CHAIN_FINGERPRINT_PATHS,
  DEVICE,
  DeviceJobQueue,
  HardwareErrorCode,
  OperationRegistry,
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
  isConnectionLost,
  isHardwareOperationId,
  isHwkRecoveryHint,
  isUserRefusal,
  operationMayHaveCompletedParams,
  parseBip32MasterFingerprint,
  rehydrateConnectorError,
  resolveHardwareOperationTarget as resolveGenericHardwareOperationTarget,
  runAllNetworkGetAddress,
  stripHex,
  success,
} from '@onekeyfe/hwk-adapter-core';

import { KeystoneUrEngine } from '../urEngine/KeystoneUrEngine';
import { TronSignType } from '../urEngine/TronSignRequest';
import {
  KEYSTONE_COLD_START_PATH,
  accountKey,
  createDeviceRecord,
  placeholderDeviceInfo,
  toDeviceInfo,
  walletConnectId,
} from './deviceTable';
import {
  KEYSTONE_BTC_ACCOUNT_FORBIDDEN_MESSAGE,
  btcScriptTypeFromPath,
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

import type { KeystoneKeySchema, KeystoneParsedMultiAccounts, KeystoneUr } from '../urEngine/types';
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

/** Key material for one operation, keyed by `accountKey()`; never retained. */
type AccountBook = Map<string, KeystoneAccountEntry>;

type OperationRoute = { operationId: string; connectionType: 'usb' | 'qr' };

type ExpectedWallet = { expectedMasterFingerprint?: string };

// Keystone briefly leaves the USB bus when entering external-wallet mode, so a persisted-wallet
// call must wait out re-enumeration instead of falling back to QR on one empty snapshot.
const KEYSTONE_USB_REATTACH_PROBE_ATTEMPTS = 4;
const KEYSTONE_USB_REATTACH_PROBE_INTERVAL_MS = 500;

function resolveHardwareOperationTarget(
  positionalTargetId: string | null | undefined,
  operationId: string | null | undefined
) {
  return resolveGenericHardwareOperationTarget(positionalTargetId, operationId, 'keystone');
}

function keySchema(chain: string, path: string): KeystoneKeySchema {
  return { path, curve: chain === 'sol' ? 'ed25519' : 'secp256k1' };
}

function waitForKeystoneUsbReattachProbe(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, KEYSTONE_USB_REATTACH_PROBE_INTERVAL_MS);
  });
}

/** UserAborted is a top-level abort code, so this ends the bundle. */
function buildCancelledFailure<T>(signal: AbortSignal): Response<T> {
  const reason = signal.reason as { code?: unknown; message?: unknown } | undefined;
  const code =
    typeof reason?.code === 'number'
      ? (reason.code as HardwareErrorCode)
      : HardwareErrorCode.UserAborted;
  const message = typeof reason?.message === 'string' ? reason.message : '';
  return failure(code, message || 'All-network get-address cancelled');
}

const BIP44_COIN_TYPE_TO_CHAIN: Record<number, ChainCapability> = {
  60: 'evm',
  0: 'btc',
  501: 'sol',
  195: 'tron',
};

/**
 * Classifies a returned account by BIP44 coin type (2nd segment), not by
 * purpose, so 44'/49'/84'/86' BTC entries all map to `btc`.
 */
function inferHwkChainFromPath(path: string): ChainCapability | undefined {
  const match = normalizePath(path).match(/^m\/\d+'\/(\d+)'/);
  return match ? BIP44_COIN_TYPE_TO_CHAIN[Number(match[1])] : undefined;
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
    const info = toDeviceInfo(record);
    if (record.qrSynced) {
      this.emitter.emit(DEVICE.CHANGED, { type: DEVICE.CHANGED, payload: info });
    } else {
      this._devices.delete(record.masterFingerprint);
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
    this._usbConnector?.on('device-disconnect', this._handleUsbDisconnect);
    // Relayed verbatim like the Ledger adapter, so hosts reuse one handler.
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

  // ---------------------------------------------------------------------------
  // Device table
  // ---------------------------------------------------------------------------

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
    if (this._usbConnector) {
      try {
        await this._usbConnector.disconnect(sessionId);
      } catch {
        // Local routing state is cleared below regardless.
      }
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

  async listConnectionTargets(options?: SearchDevicesOptions): Promise<ConnectionTarget[]> {
    const targets = await this.searchDeviceTargets(options);
    return targets.map(({ searchTargetId, ...target }) => ({
      ...target,
      targetId: searchTargetId,
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
        // The cold-start job queues under its own label; forward a cancel aimed
        // at this search target to it.
        const abortColdStart = () =>
          this._jobQueue.cancelActiveAndPending(
            KEYSTONE_COLD_START_JOB_LABEL,
            scope.signal.reason as Error
          );
        scope.signal.addEventListener('abort', abortColdStart, { once: true });
        try {
          connected = await this.importFromQr();
        } finally {
          scope.signal.removeEventListener('abort', abortColdStart);
        }
      } else if (discoveredConnectionType === 'usb') {
        selectedConnectionType = 'usb';
        if (!this._usbConnector) {
          return failure(
            HardwareErrorCode.TransportNotAvailable,
            'No USB connector configured for this Keystone adapter'
          );
        }
        connected = await this._connectUsb({}, searchTargetId, scope.signal);
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
          connected = await this._connectUsb(target, undefined, scope.signal);
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
      const connectId = isHardwareOperationId(connectIdOrOperationId)
        ? this._operations.resolve(connectIdOrOperationId).connectId
        : connectIdOrOperationId;
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

  cancel(connectId?: string): void {
    // An ended operation id names nothing: return rather than decay into an
    // untargeted cancel that takes down an unrelated job.
    let namedOperationConnectId: string | undefined;
    if (isHardwareOperationId(connectId)) {
      try {
        namedOperationConnectId = this._operations.resolve(connectId).connectId;
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
      // An operation-scoped call queues under its operation id, so cancel every
      // queue key this identifier can stand for.
      const queueKeys = keystoneCancelQueueKeys([
        connectId,
        this._operationRoutes.get(connectId)?.operationId,
        namedOperationConnectId,
      ]);
      for (const key of queueKeys) {
        this._jobQueue.cancelActiveAndPending(key, reason);
      }
      // A named cancel clears only its own operation's prompts; an unresolvable
      // name clears nothing.
      const scopedOperationId = isHardwareOperationId(connectId)
        ? connectId
        : this._operationRouteForIdentifier(connectId)?.operationId;
      if (scopedOperationId) {
        this._uiRegistry.cancel(undefined, undefined, scopedOperationId);
      }
    } else {
      // Nothing to name: teardown clears every waiter.
      this._jobQueue.cancelActiveAndPending(undefined, reason);
      this._uiRegistry.cancel();
    }
  }

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
    try {
      return await this._jobQueue.enqueue(KEYSTONE_COLD_START_JOB_LABEL, async signal => {
        const displayDevice = placeholderDeviceInfo();
        let responseUr: KeystoneUr;

        if (options.mode === 'scan') {
          responseUr = await this._requestQrScanAndAwaitResponse(displayDevice, signal);
        } else {
          const requestUr = this.urEngine.buildKeyDerivationRequest({
            schemas: [keySchema('evm', KEYSTONE_COLD_START_PATH)],
            origin: this._origin,
          });
          responseUr = await this._requestQrDisplayAndAwaitResponse(
            displayDevice,
            { ...requestUr, animated: false },
            signal
          );
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
  // All-network bundle, dispatched to the per-chain methods below.
  // ---------------------------------------------------------------------------

  allNetworkGetAddress = async (
    connectId: string,
    deviceId: string,
    params: AllNetworkGetAddressParams
  ): Promise<Response<AllNetworkAddressResponse[]>> => {
    const operationTarget = resolveHardwareOperationTarget(connectId, params.operationId);
    if (!operationTarget.success) return operationTarget;
    const effectiveConnectId = operationTarget.payload.targetId ?? '';
    const { operationId } = operationTarget.payload;
    let cancelScope: CancelScopeHandle | undefined;
    try {
      const prefetched = await this._prefetchAllNetworkAccounts(effectiveConnectId, deviceId, {
        ...params,
        operationId,
      });
      const { book } = prefetched;
      // On a cold start the prefetch established the wallet identity; route
      // per-item calls to it instead of re-syncing per item.
      const itemDeviceId = deviceId || prefetched.masterFingerprint || '';
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
            return buildCancelledFailure(scope.signal);
          }
          const commonArgs = {
            path: item.path,
            showOnDevice: item.showOnDevice,
            operationId,
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
                    value: record.masterFingerprint,
                  }
                : undefined,
            },
          });
        },
        // Cancel, refusal or a lost session ends the batch; other per-item
        // failures carry on with the next chain.
        shouldAbortBundle: (response, { index }) => {
          const { code } = response.payload ?? {};
          return cancelledIndexes.has(index) || isUserRefusal(code) || isConnectionLost(code);
        },
      });
    } catch (err) {
      return this._errorToFailure<AllNetworkAddressResponse[]>(err);
    } finally {
      cancelScope?.release();
    }
  };

  // ---------------------------------------------------------------------------
  // EVM
  // ---------------------------------------------------------------------------

  async evmGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<EvmGetAddressParams>>,
    book?: AccountBook
  ): Promise<Response<EvmAddress>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
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

    return this._runJob(connectId, deviceId, async signal => {
      const xpub = await this._fetchAccountXpub(
        connectId,
        deviceId,
        'evm',
        accountPath,
        signal,
        book
      );
      // showOnDevice is not wired; the address is derived offline from a device-verified xpub.
      const address = this.urEngine.deriveEvmAddressFromXpub(xpub, relativeDerivePath);
      return success<EvmAddress>({ address, path: normalizePath(params.path) });
    });
  }

  async evmSignTransaction(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<EvmSignTxParams>>
  ): Promise<Response<EvmSignedTx>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
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
    // EIP-2718 typed txs start with a type byte < 0x80; legacy RLP lists start at >= 0xc0.
    const dataType = parseInt(rawTxHex.slice(0, 2), 16) < 0xc0 ? 'typedTransaction' : 'transaction';

    return this._signWithWallet({
      connectId,
      deviceId,
      chain: 'evm',
      operationName: 'evmSignTransaction',
      buildRequest: (requestId, xfp) =>
        this.urEngine.buildEthSignRequest({
          requestId,
          unsignedTxHex: rawTxHex,
          dataType,
          path,
          xfp,
          chainId: params.chainId,
          origin: this._origin,
        }),
      parseResponse: ur => this.urEngine.parseEthSignature(ur),
      toPayload: (sig): EvmSignedTx => ({
        v: ensure0x(sig.v),
        r: ensure0x(sig.r),
        s: ensure0x(sig.s),
      }),
    });
  }

  async evmSignMessage(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<EvmSignMsgParams>>
  ): Promise<Response<EvmSignature>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
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

    return this._signWithWallet({
      connectId,
      deviceId,
      chain: 'evm',
      operationName: 'evmSignMessage',
      buildRequest: (requestId, xfp) =>
        this.urEngine.buildEthSignRequest({
          requestId,
          unsignedTxHex: messageHex,
          dataType: 'personalMessage',
          path,
          xfp,
          chainId: params.chainId,
          origin: this._origin,
        }),
      parseResponse: ur => this.urEngine.parseEthSignature(ur),
      toPayload: (sig): EvmSignature => ({ signature: ensure0x(sig.r + sig.s + sig.v) }),
    });
  }

  async evmSignTypedData(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<EvmSignTypedDataParams>>
  ): Promise<Response<EvmSignature>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
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
    // Typed-data JSON as UTF-8, the Keystone USB SDK convention. Prefer `dataJson`:
    // re-stringifying can rewrite integers above 2^53.
    const signDataHex = Buffer.from(
      params.dataJson ?? JSON.stringify(params.data),
      'utf8'
    ).toString('hex');
    const path = normalizePath(params.path);

    return this._signWithWallet({
      connectId,
      deviceId,
      chain: 'evm',
      operationName: 'evmSignTypedData',
      buildRequest: (requestId, xfp) =>
        this.urEngine.buildEthSignRequest({
          requestId,
          unsignedTxHex: signDataHex,
          dataType: 'typedData',
          path,
          xfp,
          chainId: params.chainId,
          origin: this._origin,
        }),
      parseResponse: ur => this.urEngine.parseEthSignature(ur),
      toPayload: (sig): EvmSignature => ({ signature: ensure0x(sig.r + sig.s + sig.v) }),
    });
  }

  // ---------------------------------------------------------------------------
  // BTC: 44'/49'/84' addresses derive offline from the account xpub; P2TR addresses
  // and structured-field tx signing are unsupported (the host builds a PSBT instead).
  // ---------------------------------------------------------------------------

  async btcGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<BtcGetAddressParams>>,
    book?: AccountBook
  ): Promise<Response<BtcAddress>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
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

    return this._runJob(connectId, deviceId, async signal => {
      const xpub = await this._fetchAccountXpub(
        connectId,
        deviceId,
        'btc',
        accountPath,
        signal,
        book
      );
      const address = this.urEngine.deriveBtcAddressFromXpub(xpub, relativeDerivePath, scriptType);
      return success<BtcAddress>({ address, path: normalizedPath });
    });
  }

  /**
   * `params.path` must be an account path (`m/84'/0'/0'`), the level Keystone syncs. An xpub is
   * script-type agnostic, so `86'` works here even though `btcGetAddress` rejects it.
   */
  async btcGetPublicKey(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<BtcGetPublicKeyParams>>,
    book?: AccountBook
  ): Promise<Response<BtcPublicKey>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
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

    return this._runJob(connectId, deviceId, async signal => {
      const xpub = await this._fetchAccountXpub(
        connectId,
        deviceId,
        'btc',
        accountPath,
        signal,
        book
      );
      const meta = this.urEngine.parseXpubMeta(xpub);
      return success<BtcPublicKey>({
        xpub,
        publicKey: meta.publicKey,
        chainCode: meta.chainCode,
        depth: meta.depth,
        fingerprint: meta.parentFingerprint,
        path: normalizePath(accountPath),
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
    params?: NullableCallArg<IHardwareCallParams<BtcSignPsbtParams>>
  ): Promise<Response<BtcSignedPsbt>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'btcSignPsbt requires params');
    if (!params.psbt)
      return failure(HardwareErrorCode.InvalidParams, 'btcSignPsbt requires params.psbt');
    // `path` is optional in the shared type, but the account-0 gate needs it.
    if (!params.path)
      return failure(HardwareErrorCode.InvalidParams, 'btcSignPsbt requires params.path');
    if (!isKeystoneSignableBtcAccountPath(splitAccountPath(params.path).accountPath)) {
      return failure(HardwareErrorCode.DevicePathForbidden, KEYSTONE_BTC_ACCOUNT_FORBIDDEN_MESSAGE);
    }

    return this._runJob(connectId, deviceId, async signal => {
      // A PSBT may span several paths; only the wallet's mfp is needed.
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
    });
  }

  async btcSignMessage(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<BtcSignMsgParams>>
  ): Promise<Response<BtcSignature>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
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
    if (!isKeystoneSignableBtcAccountPath(splitAccountPath(path).accountPath)) {
      return failure(HardwareErrorCode.DevicePathForbidden, KEYSTONE_BTC_ACCOUNT_FORBIDDEN_MESSAGE);
    }

    return this._signWithWallet({
      connectId,
      deviceId,
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

  async btcGetMasterFingerprint(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    paramsArg?: NullableCallArg<IHardwareCommonCallParams>
  ): Promise<Response<{ masterFingerprint: string }>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, paramsArg?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
    return this._runJob(connectId, deviceId, async signal => {
      const { record } = await this._ensureWalletKnown(connectId, deviceId, 'btc', signal);
      return success({ masterFingerprint: record.masterFingerprint });
    });
  }

  // ---------------------------------------------------------------------------
  // SOL
  // ---------------------------------------------------------------------------

  async solGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<SolGetAddressParams>>,
    book?: AccountBook
  ): Promise<Response<SolAddress>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'solGetAddress requires params');
    if (!params.path)
      return failure(HardwareErrorCode.InvalidParams, 'solGetAddress requires params.path');
    const path = normalizePath(params.path);

    return this._runJob(connectId, deviceId, async signal => {
      const { account } = await this._fetchAccount(connectId, deviceId, 'sol', path, signal, book);
      KeystoneAdapter._throwIfAborted(signal);
      // The Ed25519 public key is the Solana address (base58).
      const address = bs58.encode(Buffer.from(account.publicKey, 'hex'));
      return success<SolAddress>({ address, path });
    });
  }

  async solSignTransaction(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<SolSignTxParams>>
  ): Promise<Response<SolSignedTx>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
    if (!params)
      return failure(HardwareErrorCode.InvalidParams, 'solSignTransaction requires params');
    if (!params.path || !params.serializedTx) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'solSignTransaction requires params.path and params.serializedTx'
      );
    }
    const path = normalizePath(params.path);

    return this._signWithWallet({
      connectId,
      deviceId,
      chain: 'sol',
      operationName: 'solSignTransaction',
      buildRequest: (requestId, xfp) =>
        this.urEngine.buildSolSignRequest({
          requestId,
          unsignedPayloadHex: stripHex(params.serializedTx),
          dataType: 'transaction',
          path,
          xfp,
          origin: this._origin,
        }),
      parseResponse: ur => this.urEngine.parseSolSignature(ur),
      toPayload: (sig): SolSignedTx => ({ signature: sig.signature }),
    });
  }

  async solSignMessage(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<SolSignMsgParams>>
  ): Promise<Response<SolSignature>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
    if (!params) return failure(HardwareErrorCode.InvalidParams, 'solSignMessage requires params');
    if (!params.path || !params.message) {
      return failure(
        HardwareErrorCode.InvalidParams,
        'solSignMessage requires params.path and params.message'
      );
    }
    const path = normalizePath(params.path);

    return this._signWithWallet({
      connectId,
      deviceId,
      chain: 'sol',
      operationName: 'solSignMessage',
      buildRequest: (requestId, xfp) =>
        this.urEngine.buildSolSignRequest({
          requestId,
          unsignedPayloadHex: stripHex(params.message),
          dataType: 'message',
          path,
          xfp,
          origin: this._origin,
        }),
      parseResponse: ur => this.urEngine.parseSolSignature(ur),
      toPayload: (sig): SolSignature => ({ signature: sig.signature }),
    });
  }

  // ---------------------------------------------------------------------------
  // TRON: keystone-sdk-rust layout (tags 5201/5202, firmware >= 2.5.0), not sdk.tron's
  // protobuf module; OneKey Pro's encoding under the same tag is rejected by the firmware.
  // ---------------------------------------------------------------------------

  async tronGetAddress(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<TronGetAddressParams>>,
    book?: AccountBook
  ): Promise<Response<TronAddress>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
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

    return this._runJob(connectId, deviceId, async signal => {
      const xpub = await this._fetchAccountXpub(
        connectId,
        deviceId,
        'tron',
        accountPath,
        signal,
        book
      );
      const address = this.urEngine.deriveTronAddressFromXpub(xpub, relativeDerivePath);
      return success<TronAddress>({ address, path: normalizePath(params.path) });
    });
  }

  async tronSignTransaction(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<TronSignTxParams>>
  ): Promise<Response<TronSignedTx>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
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

    return this._signWithWallet({
      connectId,
      deviceId,
      chain: 'tron',
      operationName: 'tronSignTransaction',
      buildRequest: (requestId, xfp) =>
        this.urEngine.buildTronSignRequest({
          requestId,
          rawTxHex,
          path,
          xfp,
          origin: this._origin,
        }),
      parseResponse: ur => this.urEngine.parseTronSignature(ur),
      // Keystone signs rawTxHex as given and returns only the signature, so no serializedTx.
      toPayload: (sig): TronSignedTx => ({ signature: sig.signature }),
    });
  }

  async tronSignMessage(
    connectIdArg?: NullableCallArg<string>,
    deviceIdArg?: NullableCallArg<string>,
    params?: NullableCallArg<IHardwareCallParams<TronSignMsgParams>>
  ): Promise<Response<TronSignature>> {
    const operationTarget = resolveHardwareOperationTarget(connectIdArg, params?.operationId);
    if (!operationTarget.success) return operationTarget;
    const connectId = operationTarget.payload.targetId;
    const deviceId = deviceIdArg ?? undefined;
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

    return this._signWithWallet({
      connectId,
      deviceId,
      chain: 'tron',
      operationName: 'tronSignMessage',
      buildRequest: (requestId, xfp) =>
        this.urEngine.buildTronSignRequest({
          requestId,
          rawTxHex: messageHex,
          path,
          xfp,
          signType: TronSignType.PersonalMessage,
          origin: this._origin,
        }),
      parseResponse: ur => this.urEngine.parseTronSignature(ur),
      toPayload: (sig): TronSignature => ({ signature: sig.signature }),
    });
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

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
    book: AccountBook | undefined
  ): Promise<string> {
    const { account } = await this._fetchAccount(
      connectId,
      deviceId,
      hwkChain,
      accountPath,
      signal,
      book
    );
    KeystoneAdapter._throwIfAborted(signal);
    if (!account.extendedPublicKey) {
      throw createHwkError({
        code: HardwareErrorCode.MethodNotSupported,
        message: 'Keystone did not return an extended public key for this account path',
      });
    }
    return account.extendedPublicKey;
  }

  /**
   * Signing needs only the wallet's mfp: the device re-derives the key from path+xfp, so no
   * per-path account lookup happens here.
   */
  private _signWithWallet<S extends { requestId?: string }, T>(args: {
    connectId: string | undefined;
    deviceId: string | undefined;
    chain: ChainForFingerprint;
    operationName: string;
    buildRequest: (requestId: string, xfp: string) => KeystoneUr;
    parseResponse: (responseUr: KeystoneUr) => S;
    toPayload: (signature: S) => T;
  }): Promise<Response<T>> {
    const { connectId, deviceId } = args;
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
   * QR answers the whole bundle with one request QR and one scan. USB exports one path per
   * request because the device limits that channel.
   */
  private async _prefetchAllNetworkAccounts(
    connectId: string,
    deviceId: string,
    params: AllNetworkGetAddressParams
  ): Promise<{ book: AccountBook; masterFingerprint?: string }> {
    return this._jobQueue.enqueue(keystoneQueueKey(connectId, deviceId), async signal => {
      const target = this._resolveTarget(connectId, deviceId);
      let { record } = target;

      const requestedByKey = new Map<string, { hwkChain: ChainCapability; path: string }>();
      for (const item of params.bundle) {
        const schema = this._allNetworkSyncSchema(item);
        if (schema) requestedByKey.set(accountKey(schema.hwkChain, schema.path), schema);
      }

      const book: AccountBook = new Map();
      if (!requestedByKey.size) {
        return { book };
      }
      const requestedSchemas = Array.from(requestedByKey.values());
      const assertAllBooked = () => {
        for (const schema of requestedSchemas) {
          if (!book.has(accountKey(schema.hwkChain, schema.path))) {
            throw createHwkError({
              code: HardwareErrorCode.DeviceMismatch,
              message: `Keystone did not return the requested derivation path (${schema.path})`,
            });
          }
        }
      };

      // An operation routed to QR at connectDevice must stay on QR: attaching
      // USB here would export per path while `_resolveUr` still prompts a QR.
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
        const bundleSessionId = record.usbSessionId;
        const assertBundleSession = () => {
          if (record?.usbSessionId !== bundleSessionId) {
            throw createHwkError({
              code: HardwareErrorCode.TransportNotAvailable,
              message: 'Keystone USB connection was lost during account export',
            });
          }
        };
        for (const schema of requestedSchemas) {
          if (!book.has(accountKey(schema.hwkChain, schema.path))) {
            assertBundleSession();
            const synced = await this._fetchAccount(
              connectId,
              deviceId,
              schema.hwkChain,
              schema.path,
              signal,
              book
            );
            record = synced.record;
            assertBundleSession();
          }
        }
        assertAllBooked();
        return { book, masterFingerprint: record.masterFingerprint };
      }
      if (this._forcedTransport === 'usb') {
        throw createHwkError({
          code: HardwareErrorCode.TransportNotAvailable,
          message: 'USB channel is not connected for this Keystone wallet',
        });
      }

      const schemas = requestedSchemas;
      const requestUr = this.urEngine.buildKeyDerivationRequest({
        schemas: schemas.map(schema => keySchema(schema.hwkChain, schema.path)),
        origin: this._origin,
      });
      const responseUr = await this._requestQrDisplayAndAwaitResponse(
        record ? toDeviceInfo(record) : placeholderDeviceInfo(),
        { ...requestUr, animated: false },
        signal
      );
      KeystoneAdapter._throwIfAborted(signal);

      const parsed = this.urEngine.parseAccountResponse(responseUr);
      this._assertParsedIdentity(parsed, target);
      record = this._upsertDeviceRecord(parsed);
      const requestedChainByPath = new Map(
        schemas.map(schema => [normalizePath(schema.path), schema.hwkChain] as const)
      );
      for (const account of parsed.accounts) {
        const normalizedPath = normalizePath(account.path);
        const hwkChain =
          requestedChainByPath.get(normalizedPath) ?? inferHwkChainFromPath(normalizedPath);
        if (hwkChain) {
          book.set(accountKey(hwkChain, normalizedPath), { ...account, hwkChain });
        }
      }
      assertAllBooked();
      return { book, masterFingerprint: record.masterFingerprint };
    });
  }

  /** Resolve the wallet's master fingerprint from the connectId and/or deviceId the caller passed. */
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
        message: `Connected Keystone wallet (mfp ${parsed.masterFingerprint}) does not match the requested wallet fingerprint (${expected.expectedMasterFingerprint})`,
      });
    }
  }

  /**
   * Folds a parsed account response into the device table. Only non-USB round trips mark
   * `qrSynced`, so a USB-only wallet is dropped on disconnect.
   */
  private _upsertDeviceRecord(
    parsed: KeystoneParsedMultiAccounts,
    options?: { viaUsb?: boolean; usbSessionId?: string }
  ): KeystoneDeviceRecord {
    const { masterFingerprint } = parsed;
    let record = this._devices.get(masterFingerprint);
    const isNew = !record;
    if (!record) {
      record = createDeviceRecord(masterFingerprint);
      this._devices.set(masterFingerprint, record);
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
   * Opens a permitted USB Keystone and takes its mfp as the wallet identity. A known wallet gains
   * USB in place (`device-changed`); an unseen one becomes USB-only.
   */
  private async _connectUsb(
    expected: ExpectedWallet,
    searchTargetId?: string,
    signal?: AbortSignal
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
    signal?.addEventListener('abort', onAbort, { once: true });
    // Cancellation releases the caller, not the physical USB transfer. Keep
    // the tail until the late result has been rejected and disconnected.
    const pending = this._usbConnectTail.then(async () => {
      KeystoneAdapter._throwIfAborted(signal);
      return this._connectUsbExclusive(expected, searchTargetId, signal);
    });
    const settled = pending.finally(() => {
      signal?.removeEventListener('abort', onAbort);
      if (abandoned) this._abandonedUsbConnects -= 1;
    });
    this._usbConnectTail = settled.then(
      () => undefined,
      () => undefined
    );
    return signal ? KeystoneAdapter._abortable(signal, settled) : settled;
  }

  private async _connectUsbExclusive(
    expected: ExpectedWallet,
    searchTargetId?: string,
    signal?: AbortSignal
  ): Promise<Response<DeviceInfo>> {
    if (!this._usbConnector) {
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
      const session = await (connector.connectTarget
        ? connector.connectTarget(connectTarget)
        : connector.connect(searchTargetId ?? expected.expectedMasterFingerprint));
      sessionId = session.sessionId;
      KeystoneAdapter._throwIfAborted(signal);
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

      const previousUsbSessionId = this._devices.get(masterFingerprint)?.usbSessionId;
      if (previousUsbSessionId && previousUsbSessionId !== session.sessionId) {
        try {
          await this._usbConnector.disconnect(previousUsbSessionId);
        } catch {
          // The replacement session is authoritative even if stale teardown fails.
        }
      }
      KeystoneAdapter._throwIfAborted(signal);
      const record = this._upsertDeviceRecord(
        { masterFingerprint, accounts: [] },
        {
          viaUsb: true,
          usbSessionId: session.sessionId,
        }
      );
      KeystoneAdapter._throwIfAborted(signal);
      record.hadUsbSession = true;
      record.model = session.deviceInfo.modelName ?? session.deviceInfo.model ?? record.model;
      record.deviceVersion = session.deviceInfo.firmwareVersion ?? record.deviceVersion;
      return success(toDeviceInfo(record));
    } catch (err) {
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
      if (this._forcedTransport === 'usb' && lastSearchError) {
        throw lastSearchError instanceof Error
          ? lastSearchError
          : new Error(String(lastSearchError));
      }
      return undefined;
    }

    // Enumeration retries are silent; the connect runs once, targeted at the expected mfp.
    const attached = await this._connectUsb({ expectedMasterFingerprint }, undefined, signal);
    KeystoneAdapter._throwIfAborted(signal);
    // A cancelled transfer still draining is busy, not absent; don't fall back to QR.
    if (!attached.success && attached.payload.code === HardwareErrorCode.DeviceBusyInternal) {
      throw createHwkError({
        ...attached.payload,
        message: attached.payload.error,
      });
    }
    return attached.success ? this._devices.get(expectedMasterFingerprint) : undefined;
  }

  /**
   * Decides QR vs USB for one UR round trip. A pinned 'usb' with no live session fails closed;
   * otherwise a failed USB reattach leaves the call on QR.
   */
  private async _resolveUr(
    record: KeystoneDeviceRecord | undefined,
    requestUr: KeystoneUr,
    animated: boolean,
    operationId: string | undefined,
    signal: AbortSignal,
    operationName?: string
  ): Promise<KeystoneUr> {
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
        operationName
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
    operationName?: string
  ): Promise<KeystoneUr> {
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
    // One best-effort USB reattach; a failure is not surfaced and the call stays on QR.
    if (
      !interactionRoute &&
      !this._forcedTransport &&
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
      const result = await this._callUsbConnector(
        record.usbSessionId,
        'resolveUr',
        requestUr,
        signal
      );
      if (result.success) return result.payload as KeystoneUr;

      const usbError = rehydrateConnectorError(result.error);
      const { origin: usbErrorOrigin, code: usbErrorCode } = usbError as Error & {
        origin?: string;
        code?: number;
      };
      if (usbErrorCode === HardwareErrorCode.PayloadTooLarge && usbErrorOrigin !== 'device') {
        if (!interactionRoute && !this._forcedTransport) {
          const displayDevice = toDeviceInfo(record);
          return this._requestQrDisplayAndAwaitResponse(
            displayDevice,
            { ...requestUr, animated },
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
      throw usbError;
    }

    const displayDevice = record ? toDeviceInfo(record) : placeholderDeviceInfo();
    try {
      return await this._requestQrDisplayAndAwaitResponse(
        displayDevice,
        { ...requestUr, animated },
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
   * Fetches one account's key material for this operation only; `book` reuses earlier fetches. A
   * failed USB export ends the operation without replaying or switching transports.
   */
  private async _fetchAccount(
    connectId: string | undefined,
    deviceId: string | undefined,
    hwkChain: ChainCapability,
    syncPath: string,
    signal: AbortSignal,
    book?: AccountBook
  ): Promise<{ record: KeystoneDeviceRecord; account: KeystoneAccountEntry }> {
    const target = this._resolveTarget(connectId, deviceId);
    const operationConnectionType = isHardwareOperationId(connectId)
      ? this._operations.resolve(connectId).connectionType
      : undefined;
    const key = accountKey(hwkChain, syncPath);

    let existingRecord = target.record;
    if (!existingRecord) {
      existingRecord = await this._tryUsbAttach(signal, target.expectedMasterFingerprint);
      KeystoneAdapter._throwIfAborted(signal);
    }
    const booked = book?.get(key);
    if (existingRecord && booked) {
      return { record: existingRecord, account: booked };
    }
    if (
      !operationConnectionType &&
      existingRecord &&
      !existingRecord.usbSessionId &&
      this._forcedTransport === 'usb'
    ) {
      // Pinned to USB without a session: attach here so enumeration errors
      // surface (resolveUr skips its probe for pinned transports).
      await this._tryUsbAttach(signal, existingRecord.masterFingerprint, {
        waitForReenumeration: existingRecord.hadUsbSession,
      });
      KeystoneAdapter._throwIfAborted(signal);
      existingRecord = this._devices.get(existingRecord.masterFingerprint) ?? existingRecord;
    }

    // A leftover USB session must not change a QR operation's request.
    const useSinglePathUsbExport = operationConnectionType
      ? operationConnectionType === 'usb'
      : this._forcedTransport !== 'qr' && Boolean(existingRecord?.usbSessionId);
    const schemas = [keySchema(hwkChain, syncPath)];
    const requestUr = this.urEngine.buildKeyDerivationRequest({ schemas, origin: this._origin });
    const responseUr = await this._resolveUr(existingRecord, requestUr, false, connectId, signal);
    KeystoneAdapter._throwIfAborted(signal);

    const parsed = this.urEngine.parseAccountResponse(responseUr);
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
      this._assertParsedIdentity(parsed, target);
      record = this._upsertDeviceRecord(parsed, {
        viaUsb: operationConnectionType !== 'qr' && Boolean(existingRecord?.usbSessionId),
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
    const responseUr = await this._resolveUr(undefined, requestUr, false, connectId, signal);
    KeystoneAdapter._throwIfAborted(signal);

    return { record: this._upsertDeviceRecord(this.urEngine.parseAccountResponse(responseUr)) };
  }

  /**
   * The operation owning the running job, so a mid-call UI request can name it. Unpinned jobs map
   * through the operation route; a cold start returns undefined.
   */
  private _activeOperationId(): string | undefined {
    const activeJobId = this._jobQueue.getActiveJob()?.deviceId;
    if (!activeJobId) return undefined;
    if (isHardwareOperationId(activeJobId)) return activeJobId;
    return this._operationRouteForIdentifier(activeJobId)?.operationId;
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
    signal?: AbortSignal
  ): Promise<T> {
    if (!signal) return pending;
    let settled = false;
    const onAbort = () => {
      if (!settled) this._uiRegistry.cancel(requestType);
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
    try {
      return await pending;
    } finally {
      settled = true;
      signal.removeEventListener('abort', onAbort);
    }
  }

  private async _requestQrDisplayAndAwaitResponse(
    device: DeviceInfo,
    data: QrDisplayData,
    signal?: AbortSignal
  ): Promise<KeystoneUr> {
    const operationId = this._activeOperationId();
    const waitPromise = this._uiRegistry.wait<{ urType: string; urData: string }>(
      UI_REQUEST.REQUEST_QR_DISPLAY,
      { timeoutMs: this._qrTimeoutMs, operationId }
    );
    this.emitter.emit(UI_REQUEST.REQUEST_QR_DISPLAY, {
      type: UI_REQUEST.REQUEST_QR_DISPLAY,
      payload: { device, data, operationId },
    });
    const response = await this._awaitQrResponse(
      UI_REQUEST.REQUEST_QR_DISPLAY,
      waitPromise,
      signal
    );
    return { urType: response.urType, urData: response.urData };
  }

  private async _requestQrScanAndAwaitResponse(
    device: DeviceInfo,
    signal?: AbortSignal
  ): Promise<KeystoneUr> {
    const operationId = this._activeOperationId();
    const waitPromise = this._uiRegistry.wait<{ urType: string; urData: string }>(
      UI_REQUEST.REQUEST_QR_SCAN,
      { timeoutMs: this._qrTimeoutMs, operationId }
    );
    this.emitter.emit(UI_REQUEST.REQUEST_QR_SCAN, {
      type: UI_REQUEST.REQUEST_QR_SCAN,
      payload: { device, operationId },
    });
    const response = await this._awaitQrResponse(UI_REQUEST.REQUEST_QR_SCAN, waitPromise, signal);
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
      throw createHwkError({
        code: HardwareErrorCode.DeviceBusyInternal,
        message: `Keystone USB is busy while calling ${method}`,
      });
    }
    // Checked before the connector call: racing an aborted signal would still put
    // the command on the wire.
    if (signal?.aborted) {
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
      rawCall = this._usbConnector.call(sessionId, method, params).finally(releaseOperation);
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

  private static _throwIfAborted(signal: AbortSignal | undefined): void {
    if (signal?.aborted) {
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
