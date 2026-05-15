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
}

// All variants share the same payload shape so that emit sites where the
// `type` is a broad `EConnectorInteraction` value (e.g. piped through
// `collapseSignerInteraction`) still type-check. Searching has no session
// yet so it carries an empty `sessionId`.
export type ConnectorUiEvent =
  | { type: EConnectorInteraction.Searching; payload: { sessionId: string } }
  | { type: EConnectorInteraction.ConfirmOpenApp; payload: { sessionId: string } }
  | { type: EConnectorInteraction.UnlockDevice; payload: { sessionId: string } }
  | { type: EConnectorInteraction.ConfirmOnDevice; payload: { sessionId: string } }
  | { type: EConnectorInteraction.InteractionComplete; payload: { sessionId: string } };

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
  call(sessionId: string, method: string, params: unknown): Promise<unknown>;
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
  }): Promise<unknown>;
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
