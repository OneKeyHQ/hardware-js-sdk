import { HardwareErrorCode, createHwkError } from './errors';

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
  /**
   * Physical transport this device was discovered on. Mirrors Trezor
   * Connect's `descriptor.apiType` — when several transports are fused behind
   * one connector (see `createCombinedConnector`), the merged device list
   * carries this so the host can tell a USB entry from a BLE one and route
   * `connect()` back to the owning transport. Single-transport connectors may
   * leave it undefined.
   */
  connectionType?: ConnectionType;
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

  /**
   * Vendor-specific raw blob from the transport descriptor (USB / BLE).
   * Populated by `descriptorToConnectorDevice` in each connector. Treat as
   * informational; promote any field consumed by the app layer onto the
   * typed surface above.
   */
  raw?: Record<string, unknown>;
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

export type ConnectorEventType =
  | 'device-connect'
  | 'device-disconnect'
  | 'features'
  | 'device-trezor-thp-credentials-changed'
  | 'ui-request'
  | 'ui-event';

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
  features: { device: ConnectorDevice & { features: Record<string, unknown> } };
  'device-trezor-thp-credentials-changed': {
    connectId: string;
    deviceId?: string;
    credentials: Record<string, unknown>[];
  };
  'ui-request': { type: string; payload?: unknown };
  'ui-event': ConnectorUiEvent;
}

export interface ConnectorSearchDevicesOptions {
  /**
   * Wait for every child transport in a fused connector. Default discovery can
   * return shortly after USB appears so BLE does not slow down USB flows;
   * binding pickers can opt in when they need BLE candidates too.
   */
  waitForAll?: boolean;
}

export interface ConnectorConfig {
  /**
   * Optional OneKey-controlled WebSocket relay base used only for Ledger's
   * genuine check. DMK appends its `/genuine` path and device query params.
   *
   * The value may contain a short-lived opaque relay token, so connectors must
   * never log it. Passing `undefined` restores Ledger's official default.
   */
  ledgerGenuineCheckWebSocketUrl?: string;
}

export interface IConnector {
  /** Physical connection type this connector uses. Fixed at construction. */
  readonly connectionType: ConnectionType;

  searchDevices(options?: ConnectorSearchDevicesOptions): Promise<ConnectorDevice[]>;
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

  /**
   * Reconfigure vendor-specific transport services before the next connect.
   * Ledger uses this to rebuild DMK against a short-lived OneKey genuine-check
   * relay. Vendors without runtime configuration may omit it.
   */
  configure?(config: ConnectorConfig): Promise<void> | void;

  // Vendor-specific opt-in: warm-load persisted credentials before the first
  // session. Trezor uses this for THP `knownCredentials` (host-stored pairing
  // credentials replayed in `ThpHandshakeInitRequest` to skip the CodeEntry /
  // QrCode / NFC pairing UX on every connect). Vendors without persistent
  // credentials (Ledger, etc.) simply don't implement it.
  setKnownCredentials?(credentials: unknown[]): Promise<void> | void;
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
  searchDevices(params: {
    vendor: VendorType;
    options?: ConnectorSearchDevicesOptions;
  }): Promise<ConnectorDevice[]>;
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
  configure?(params: { vendor: VendorType; config: ConnectorConfig }): Promise<void> | void;

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

  /**
   * Warm-load vendor-specific persisted credentials. Currently only Trezor
   * uses this (THP `knownCredentials`); the bridge implementation can
   * dispatch on `vendor` and route to the right connector instance.
   */
  setKnownCredentials?(params: {
    vendor: VendorType;
    credentials: unknown[];
  }): Promise<void> | void;
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
    searchDevices: options => bridge.searchDevices({ vendor, options }),
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
    configure: bridge.configure ? config => bridge.configure?.({ vendor, config }) : undefined,
    setKnownCredentials: bridge.setKnownCredentials
      ? credentials => bridge.setKnownCredentials!({ vendor, credentials })
      : undefined,
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
    if (!SERIALIZED_ERROR_TOP_LEVEL_KEYS.has(key)) {
      params[key] = e[key];
    }
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

/**
 * Fuse several single-transport IConnectors (e.g. WebUSB + BLE for one
 * vendor) into one IConnector whose device list is the union of all of them.
 *
 * This mirrors how Trezor Connect's `DeviceList` keeps one `TransportManager`
 * per `apiType` running concurrently and merges their devices into a single
 * list: there is no "switch" between transports — both are always live, and
 * each discovered device carries its `connectionType` so the host knows which
 * channel it came in on. `connect()` routes back to the transport that owns
 * the chosen device; later calls route by `sessionId`.
 *
 * Notes / current limitations:
 *   - `searchDevices()` fans out concurrently; a transport that throws while
 *     scanning is treated as "no devices" so a dead/absent channel never sinks
 *     the others.
 *   - USB entries sort ahead of BLE ones (Trezor's `getPrioritizedDevices`).
 *   - The same physical device reachable on two transports surfaces as two
 *     entries with different `connectId`s — we do NOT dedup, so the host can
 *     present (or pick) a channel explicitly.
 *   - `uiResponse()` carries no sessionId, so it is broadcast to every child;
 *     a child with no matching pending request ignores it.
 */
function isDeviceUnavailableError(error: unknown): boolean {
  const typed = error as { code?: unknown };
  if (
    typed.code === HardwareErrorCode.DeviceNotFound ||
    typed.code === HardwareErrorCode.DeviceDisconnected
  ) {
    return true;
  }
  return false;
}

function combinedDeviceNotFoundError(message: string): Error {
  return createHwkError({
    code: HardwareErrorCode.DeviceNotFound,
    message,
  });
}

function combinedSessionNotFoundError(message: string): Error {
  return createHwkError({
    code: HardwareErrorCode.DeviceDisconnected,
    message,
  });
}

export function createCombinedConnector(connectors: IConnector[]): IConnector {
  if (connectors.length === 0) {
    throw new Error('createCombinedConnector: at least one connector is required');
  }
  const SEARCH_SETTLE_AFTER_FIRST_DEVICE_MS = 250;

  // connectId -> the child connector that discovered it (set on searchDevices).
  const deviceOwner = new Map<string, IConnector>();
  // sessionId -> the child connector that owns the live session.
  const sessionOwner = new Map<string, IConnector>();
  // userHandler -> the per-child forwarders we attached, so off() can detach.
  type UserHandler = (data: ConnectorEventMap[ConnectorEventType]) => void;
  const forwarders = new Map<
    ConnectorEventType,
    Map<UserHandler, Array<{ child: IConnector; handler: UserHandler }>>
  >();

  // BLE ranks after USB — matches Trezor's getPrioritizedDevices().
  const rank = (device: ConnectorDevice): number => (device.connectionType === 'ble' ? 1 : 0);

  // Shared THP pairing credentials across all child transports. A credential is
  // keyed by the device's static public key (transport-agnostic, see
  // `findKnownPairingCredentials`), so a credential minted while pairing over
  // one transport (e.g. USB) must reach the sibling transports (e.g. BLE) or
  // they re-pair instead of autoconnecting. Each child keeps its OWN
  // knownCredentials array, so we maintain the union here and re-broadcast it to
  // every child whenever any child mints a fresh one.
  const sharedCredentials: Array<Record<string, unknown>> = [];
  const credentialKey = (c: Record<string, unknown>): string =>
    (c.credential as string) ?? JSON.stringify(c);
  const mergeShared = (incoming: ReadonlyArray<Record<string, unknown>>): boolean => {
    let changed = false;
    for (const cred of incoming) {
      const key = credentialKey(cred);
      if (!sharedCredentials.some(e => credentialKey(e) === key)) {
        sharedCredentials.push(cred);
        changed = true;
      }
    }
    return changed;
  };
  const broadcastCredentials = async (): Promise<void> => {
    await Promise.all(
      connectors.map(child => Promise.resolve(child.setKnownCredentials?.(sharedCredentials)))
    );
  };

  // Internal subscription (independent of user on()/off()): when any child mints
  // fresh pairing credentials, fold them into the shared union and push the
  // union down to every child so the next handshake on ANY transport
  // autoconnects rather than re-pairing.
  for (const child of connectors) {
    child.on('device-trezor-thp-credentials-changed', data => {
      if (mergeShared(data.credentials)) void broadcastCredentials();
    });
  }

  const searchDevices = async (
    options: { waitForAll?: boolean } = {}
  ): Promise<ConnectorDevice[]> => {
    const perConnector: Array<{
      index: number;
      devices: ConnectorDevice[];
    }> = [];

    await new Promise<void>(resolve => {
      let finished = false;
      let remaining = connectors.length;
      let settleTimer: ReturnType<typeof setTimeout> | undefined;

      const finish = () => {
        if (finished) return;
        finished = true;
        if (settleTimer) clearTimeout(settleTimer);
        resolve();
      };

      connectors.forEach((child, index) => {
        void child
          .searchDevices()
          .then(devices =>
            devices.map(device => ({
              ...device,
              connectionType: device.connectionType ?? child.connectionType,
            }))
          )
          .catch(
            () =>
              // A transport that can't scan (powered off, unauthorized, absent)
              // must not fail the whole fused search.
              [] as ConnectorDevice[]
          )
          .then(devices => {
            remaining -= 1;
            if (!finished) {
              perConnector.push({ index, devices });
            }
            if (remaining === 0) {
              finish();
              return;
            }
            const hasUsbDevice = devices.some(device => device.connectionType === 'usb');
            if (hasUsbDevice && !settleTimer && !options.waitForAll) {
              settleTimer = setTimeout(finish, SEARCH_SETTLE_AFTER_FIRST_DEVICE_MS);
            }
          });
      });
    });

    perConnector.sort((a, b) => a.index - b.index);

    deviceOwner.clear();
    const merged: ConnectorDevice[] = [];
    perConnector.forEach(({ index, devices }) => {
      for (const device of devices) {
        deviceOwner.set(device.connectId, connectors[index]);
        merged.push(device);
      }
    });
    return merged.sort((a, b) => rank(a) - rank(b));
  };

  const resolveOwner = async (
    deviceId?: string
  ): Promise<{ owner: IConnector; deviceId?: string }> => {
    if (deviceId && deviceOwner.has(deviceId)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return { owner: deviceOwner.get(deviceId)!, deviceId };
    }
    const devices = await searchDevices({ waitForAll: Boolean(deviceId) });
    if (deviceId) {
      const owner = deviceOwner.get(deviceId);
      if (!owner)
        throw combinedDeviceNotFoundError(`Combined connector: device not found: ${deviceId}`);
      return { owner, deviceId };
    }
    const first = devices[0];
    if (!first) throw combinedDeviceNotFoundError('Combined connector: no devices found');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { owner: deviceOwner.get(first.connectId)!, deviceId: first.connectId };
  };

  const connectByExplicitId = async (
    deviceId: string
  ): Promise<{ session: ConnectorSession; owner: IConnector }> => {
    const cachedOwner = deviceOwner.get(deviceId);
    if (cachedOwner) {
      return { session: await cachedOwner.connect(deviceId), owner: cachedOwner };
    }

    let lastError: unknown;
    for (const child of connectors) {
      try {
        const session = await child.connect(deviceId);
        deviceOwner.set(deviceId, child);
        return { session, owner: child };
      } catch (error) {
        if (!isDeviceUnavailableError(error)) {
          throw error;
        }
        lastError = error;
      }
    }
    const message =
      lastError instanceof Error
        ? lastError.message
        : `Combined connector: device not found: ${deviceId}`;
    throw createHwkError({
      code: HardwareErrorCode.DeviceNotFound,
      message,
    });
  };

  return {
    // Nominal value only — the per-device `connectionType` is authoritative
    // for a fused connector.
    connectionType: connectors[0].connectionType,

    searchDevices: options => searchDevices({ waitForAll: options?.waitForAll }),

    connect: async deviceId => {
      let owner: IConnector;
      let session: ConnectorSession;
      if (deviceId) {
        ({ session, owner } = await connectByExplicitId(deviceId));
      } else {
        const resolved = await resolveOwner();
        owner = resolved.owner;
        session = await owner.connect(resolved.deviceId);
      }
      // Use the owner resolved during connect — re-deriving via
      // session.deviceInfo.connectId breaks for ephemeral-id transports (the id
      // can change on connect → missed lookup → orphaned session).
      sessionOwner.set(session.sessionId, owner);
      return session;
    },

    disconnect: async sessionId => {
      const owner = sessionOwner.get(sessionId);
      if (!owner) return;
      await owner.disconnect(sessionId);
      sessionOwner.delete(sessionId);
    },

    call: async (sessionId, method, params) => {
      const owner = sessionOwner.get(sessionId);
      if (!owner) {
        throw combinedSessionNotFoundError(`Combined connector: session not found: ${sessionId}`);
      }
      return owner.call(sessionId, method, params);
    },

    cancel: async sessionId => {
      const owner = sessionOwner.get(sessionId);
      if (!owner) return;
      await owner.cancel(sessionId);
    },

    uiResponse: response => {
      // No sessionId on the response — broadcast; children without a matching
      // pending request ignore it.
      for (const child of connectors) child.uiResponse(response);
    },

    on: (event, handler) => {
      const attached = connectors.map(child => {
        const forward: UserHandler = data => (handler as UserHandler)(data);
        child.on(event, forward as Parameters<IConnector['on']>[1]);
        return { child, handler: forward };
      });
      let inner = forwarders.get(event);
      if (!inner) {
        inner = new Map();
        forwarders.set(event, inner);
      }
      inner.set(handler as UserHandler, attached);
    },

    off: (event, handler) => {
      const inner = forwarders.get(event);
      const attached = inner?.get(handler as UserHandler);
      if (!attached || !inner) return;
      for (const { child, handler: forward } of attached) {
        child.off(event, forward as Parameters<IConnector['off']>[1]);
      }
      inner.delete(handler as UserHandler);
      if (inner.size === 0) forwarders.delete(event);
    },

    reset: () => {
      for (const child of connectors) child.reset();
      deviceOwner.clear();
      sessionOwner.clear();
      forwarders.clear();
    },

    configure: connectors.some(c => c.configure)
      ? async config => {
          await Promise.all(connectors.map(child => Promise.resolve(child.configure?.(config))));
          deviceOwner.clear();
          sessionOwner.clear();
        }
      : undefined,

    setKnownCredentials: connectors.some(c => c.setKnownCredentials)
      ? async credentials => {
          // Seed the shared union from the host (warm-load) and fan out to all
          // children so every transport starts from the same credential set.
          sharedCredentials.length = 0;
          mergeShared((credentials ?? []) as Array<Record<string, unknown>>);
          await broadcastCredentials();
        }
      : undefined,
  };
}
