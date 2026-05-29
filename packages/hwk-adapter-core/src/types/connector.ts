import type { ConnectionType, DeviceCapabilities, DeviceInfo, VendorType } from './device';
import type { UiResponseEvent } from '../events/ui-request';

// =====================================================================
// Connector types — transport-level abstraction for device communication
// =====================================================================

/**
 * Minimal device info returned during discovery (searchDevices).
 * At scan time, full DeviceInfo fields like firmwareVersion are not yet available.
 */
export interface ConnectorDevice {
  connectId: string;
  deviceId: string;
  name: string;
  /** Machine model id (e.g. "nanoX"). */
  model?: string;
  /** Human-readable model name (e.g. "Ledger Nano X"). */
  modelName?: string;
  /** BLE signal strength (BLE only). */
  rssi?: number | null;
  /** BLE connectable flag (BLE only). */
  isConnectable?: boolean | null;
  /** USB serial number (USB only). */
  serialNumber?: string;

  /** Device capabilities — available from scan time */
  capabilities?: DeviceCapabilities;
}

export interface ConnectorSession {
  sessionId: string;
  deviceInfo: DeviceInfo;
}

// =====================================================================
// Connector call result — device errors travel as DATA, not exceptions
//
// `IConnector.call` never throws for device-level failures. It resolves a
// discriminated result so the failure crosses any process boundary
// (IHardwareBridge / extension offscreen↔SW) as plain `data`. This mirrors
// the OneKey HD-SDK `IDeviceResponseResult` contract.
//
// WHY: when a thrown Error crosses the extension JsBridge it is run through
// `toPlainError`, a fixed field whitelist that drops custom own-properties
// (e.g. `appName`). Returning the failure as data keeps every field intact.
//
// Contract for `ConnectorSerializedError`: only `message` / `code` /
// `errorCode` live at the top level; ALL other domain fields (`appName`,
// `_tag`, `statusCode`, …) are nested under `params`.
// =====================================================================

/**
 * Vendor-agnostic bag of extra error fields. Known keys are documented for
 * discoverability; the index signature keeps it open so any connector can
 * carry vendor-specific data without losing it across the bridge.
 */
export interface ConnectorErrorParams {
  /** Vendor SDK error tag (e.g. Ledger DMK `_tag`). */
  _tag?: string;
  /** App involved, e.g. the Ledger app being opened/installed. */
  appName?: string;
  /** Transport / APDU status code (string or number depending on vendor). */
  statusCode?: unknown;
  /**
   * Shallow snapshot of a nested cause. A raw Error does not survive JSON
   * serialization (its `message`/`stack` are non-enumerable), so recovery
   * predicates that recurse into a cause get this plain-object copy instead.
   */
  originalError?: {
    message?: string;
    code?: number;
    errorCode?: string;
    statusCode?: unknown;
    _tag?: string;
  };
  [key: string]: unknown;
}

export interface ConnectorSerializedError {
  message: string;
  code?: number;
  errorCode?: string;
  params?: ConnectorErrorParams;
}

export type ConnectorCallResult =
  | { success: true; payload: unknown }
  | { success: false; error: ConnectorSerializedError };

export type ConnectorEventType = 'device-connect' | 'device-disconnect' | 'ui-request' | 'ui-event';

/**
 * Interaction event types emitted via 'ui-event'.
 * These map to user-facing prompts (confirm on device, open app, etc.).
 */
export enum EConnectorInteraction {
  /** Adapter is actively searching for the device (no session yet) */
  Searching = 'searching',
  /** Device requires user to open a specific app */
  ConfirmOpenApp = 'confirm-open-app',
  /** Device requires user to unlock */
  UnlockDevice = 'unlock-device',
  /** Device needs user to confirm on device (sign, verify, etc.) */
  ConfirmOnDevice = 'confirm-on-device',
  /** Previous interaction completed — clear UI prompt */
  InteractionComplete = 'interaction-complete',
  /**
   * OS-level Ledger app install progress. `progress` is a 0..1 fraction
   * reported by DMK's InstallOrUpdateAppsDeviceAction. Emitted from inside
   * the connector so the progress callback ref never has to cross the
   * IHardwareBridge boundary.
   */
  AppInstallProgress = 'app-install-progress',
}

// Discriminated union: most variants only carry `sessionId`, but
// AppInstallProgress also carries `appName` + `progress`. Searching has no
// session yet so it carries an empty `sessionId`.
export type ConnectorUiEvent =
  | { type: EConnectorInteraction.Searching; payload: { sessionId: string } }
  | { type: EConnectorInteraction.ConfirmOpenApp; payload: { sessionId: string } }
  | { type: EConnectorInteraction.UnlockDevice; payload: { sessionId: string } }
  | { type: EConnectorInteraction.ConfirmOnDevice; payload: { sessionId: string } }
  | { type: EConnectorInteraction.InteractionComplete; payload: { sessionId: string } }
  | {
      type: EConnectorInteraction.AppInstallProgress;
      payload: { sessionId: string; appName: string; progress: number };
    };

export interface ConnectorEventMap {
  'device-connect': { device: ConnectorDevice };
  'device-disconnect': { connectId: string };
  'ui-request': { type: string; payload?: unknown };
  'ui-event': ConnectorUiEvent;
}

export interface IConnector {
  /** Physical connection type this connector uses. Fixed at construction. */
  readonly connectionType: ConnectionType;

  searchDevices(): Promise<ConnectorDevice[]>;
  connect(deviceId?: string): Promise<ConnectorSession>;
  disconnect(sessionId: string): Promise<void>;
  // `call` resolves a discriminated result; device-level failures are returned
  // as data, never thrown (see ConnectorCallResult). Only `call` uses this
  // contract because it is the one method that carries rich, vendor-specific
  // domain errors across the IHardwareBridge boundary, where a thrown Error
  // would be stripped by the host bridge's error whitelist. The other methods
  // surface plain operational failures and still reject normally.
  call(sessionId: string, method: string, params: unknown): Promise<ConnectorCallResult>;
  cancel(sessionId: string): Promise<void>;

  /** Send a UI response (e.g. PIN, passphrase) to the device. */
  uiResponse(response: UiResponseEvent): void;

  on<K extends ConnectorEventType>(event: K, handler: (data: ConnectorEventMap[K]) => void): void;
  off<K extends ConnectorEventType>(event: K, handler: (data: ConnectorEventMap[K]) => void): void;

  reset(): void;
}

// =====================================================================
// Hardware bridge — generic forwarding interface for cross-boundary IConnector
//
// The same shape works across any process / context boundary that needs to
// expose a multi-vendor backend behind a single-vendor IConnector facade:
//   - Electron (renderer ↔ preload/main via contextBridge)
//   - Browser Extension (popup/content ↔ background/offscreen via chrome.runtime)
//   - React Native (JS ↔ native module via NativeModules)
//   - Web Worker / iframe (postMessage)
//
// Each method takes a `vendor` discriminator so a single bridge implementation
// can multiplex across vendors (ledger, trezor, ...).
// =====================================================================

export interface IHardwareBridge {
  searchDevices(params: { vendor: VendorType }): Promise<ConnectorDevice[]>;
  connect(params: { vendor: VendorType; deviceId?: string }): Promise<ConnectorSession>;
  disconnect(params: { vendor: VendorType; sessionId: string }): Promise<void>;
  call(params: {
    vendor: VendorType;
    sessionId: string;
    method: string;
    callParams: unknown;
  }): Promise<ConnectorCallResult>;
  cancel(params: { vendor: VendorType; sessionId: string }): Promise<void>;
  uiResponse(params: { vendor: VendorType; response: UiResponseEvent }): void;
  reset(params: { vendor: VendorType }): void;

  /** Register an event handler for connector events forwarded across the bridge. */
  onEvent(
    params: { vendor: VendorType },
    handler: (event: { type: ConnectorEventType; data: unknown }) => void
  ): void;

  /** Unregister a previously registered event handler. */
  offEvent(
    params: { vendor: VendorType },
    handler: (event: { type: ConnectorEventType; data: unknown }) => void
  ): void;
}

/**
 * Adapt an IHardwareBridge (multi-vendor backend) into a single-vendor IConnector.
 * Every IConnector method becomes a transparent forward to bridge.<method>({ vendor, ... }).
 * Events are forwarded via bridge.onEvent / offEvent.
 *
 * Use this anywhere the actual hardware lives behind a process / context boundary
 * (Electron main, extension background, native module, worker, iframe).
 */
export function createBridgedConnector(
  vendor: VendorType,
  connectionType: ConnectionType,
  bridge: IHardwareBridge
): IConnector {
  // Keyed by (event, handler). A flat handler-only map would collide when the
  // same function is registered for multiple events — second .on() would
  // overwrite the first bridge handler reference, leaking it permanently.
  type UserHandler = (data: ConnectorEventMap[ConnectorEventType]) => void;
  type BridgeHandler = (event: { type: ConnectorEventType; data: unknown }) => void;
  const handlerMap = new Map<ConnectorEventType, Map<UserHandler, BridgeHandler>>();

  return {
    connectionType,
    searchDevices: () => bridge.searchDevices({ vendor }),
    connect: deviceId => bridge.connect({ vendor, deviceId }),
    disconnect: sessionId => bridge.disconnect({ vendor, sessionId }),
    call: (sessionId, method, callParams) => bridge.call({ vendor, sessionId, method, callParams }),
    cancel: sessionId => bridge.cancel({ vendor, sessionId }),
    uiResponse: response => bridge.uiResponse({ vendor, response }),
    on: (event, handler) => {
      const bridgeHandler: BridgeHandler = e => {
        if (e.type === event) {
          handler(e.data as ConnectorEventMap[typeof event]);
        }
      };
      let inner = handlerMap.get(event);
      if (!inner) {
        inner = new Map();
        handlerMap.set(event, inner);
      }
      inner.set(handler as UserHandler, bridgeHandler);
      bridge.onEvent({ vendor }, bridgeHandler);
    },
    off: (event, handler) => {
      const inner = handlerMap.get(event);
      const bridgeHandler = inner?.get(handler as UserHandler);
      if (!bridgeHandler || !inner) return;
      bridge.offEvent({ vendor }, bridgeHandler);
      inner.delete(handler as UserHandler);
      if (inner.size === 0) handlerMap.delete(event);
    },
    reset: () => bridge.reset({ vendor }),
  };
}

// =====================================================================
// ConnectorCallResult error (de)serialization — the canonical, vendor-agnostic
// helpers every IConnector implementation / adapter should use, so the
// "errors as data" contract is identical across vendors.
// =====================================================================

const SERIALIZED_ERROR_TOP_LEVEL_KEYS = new Set([
  'message',
  'code',
  'errorCode',
  'stack',
  'params',
]);

/**
 * Flatten a thrown error into the cross-boundary-safe `ConnectorSerializedError`
 * shape. `message`/`code`/`errorCode` are lifted to the top level; every other
 * own-enumerable field is copied into `params` so NO domain data is lost when
 * the result crosses a host bridge (which may run thrown errors through a
 * field whitelist). A nested `originalError` is shallow-snapshotted because a
 * raw Error does not survive JSON serialization.
 */
export function serializeConnectorError(err: unknown): ConnectorSerializedError {
  if (!err || typeof err !== 'object') {
    return { message: typeof err === 'string' ? err : 'Unknown error' };
  }
  const e = err as Record<string, unknown>;
  const message = typeof e.message === 'string' ? e.message : 'Unknown error';
  const code = typeof e.code === 'number' ? e.code : undefined;
  const errorCode = e.errorCode != null ? String(e.errorCode) : undefined;

  const params: ConnectorErrorParams = {};
  // Flatten an existing `params` bag, then copy every other own field (so
  // vendor-specific keys like `_tag` / `statusCode` / `appName` / step context
  // are preserved without being named here).
  if (e.params && typeof e.params === 'object') {
    Object.assign(params, e.params as Record<string, unknown>);
  }
  for (const key of Object.keys(e)) {
    if (SERIALIZED_ERROR_TOP_LEVEL_KEYS.has(key)) continue;
    params[key] = e[key];
  }
  const orig = e.originalError;
  if (orig && typeof orig === 'object') {
    const o = orig as Record<string, unknown>;
    params.originalError = {
      message: typeof o.message === 'string' ? o.message : undefined,
      code: typeof o.code === 'number' ? o.code : undefined,
      errorCode: o.errorCode != null ? String(o.errorCode) : undefined,
      statusCode: o.statusCode,
      _tag: typeof o._tag === 'string' ? o._tag : undefined,
    };
  }

  // The result crosses host bridges via JSON.stringify. Drop any single field
  // that isn't JSON-safe (circular ref / non-serializable) so a pathological
  // error degrades to "one field missing" instead of crashing the transport.
  for (const key of Object.keys(params)) {
    try {
      JSON.stringify(params[key]);
    } catch {
      delete params[key];
    }
  }

  return {
    message,
    ...(code !== undefined ? { code } : {}),
    ...(errorCode !== undefined ? { errorCode } : {}),
    ...(Object.keys(params).length ? { params } : {}),
  };
}

/**
 * Inverse of `serializeConnectorError`: rebuild a flat Error instance, lifting
 * `params.*` back to own-properties so existing throw-based classifiers/recovery
 * logic (which read `err._tag` / `err.code` / `err.appName` / …) keep working
 * unchanged. The Result shape stays confined to the connector boundary.
 */
export function rehydrateConnectorError(error: ConnectorSerializedError): Error {
  const { message, code, errorCode, params } = error;
  return Object.assign(new Error(message), {
    ...(code !== undefined ? { code } : {}),
    ...(errorCode !== undefined ? { errorCode } : {}),
    ...(params ?? {}),
  });
}
