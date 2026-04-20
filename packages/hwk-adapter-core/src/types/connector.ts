import type { DeviceCapabilities, DeviceInfo, VendorType } from './device';
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
  model?: string;

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
  /** Device requires user to open a specific app */
  ConfirmOpenApp = 'confirm-open-app',
  /** Device requires user to unlock */
  UnlockDevice = 'unlock-device',
  /** Device needs user to confirm on device (sign, verify, etc.) */
  ConfirmOnDevice = 'confirm-on-device',
  /** Previous interaction completed — clear UI prompt */
  InteractionComplete = 'interaction-complete',
}

export type ConnectorUiEvent =
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
  bridge: IHardwareBridge
): IConnector {
  // Map from typed IConnector handlers to the bridge handler so we can
  // unregister them correctly via off().
  const handlerMap = new Map<
    (data: ConnectorEventMap[ConnectorEventType]) => void,
    (event: { type: ConnectorEventType; data: unknown }) => void
  >();

  return {
    searchDevices: () => bridge.searchDevices({ vendor }),
    connect: deviceId => bridge.connect({ vendor, deviceId }),
    disconnect: sessionId => bridge.disconnect({ vendor, sessionId }),
    call: (sessionId, method, callParams) => bridge.call({ vendor, sessionId, method, callParams }),
    cancel: sessionId => bridge.cancel({ vendor, sessionId }),
    uiResponse: response => bridge.uiResponse({ vendor, response }),
    on: (event, handler) => {
      const bridgeHandler = (e: { type: ConnectorEventType; data: unknown }) => {
        if (e.type === event) {
          handler(e.data as ConnectorEventMap[typeof event]);
        }
      };
      handlerMap.set(
        handler as (data: ConnectorEventMap[ConnectorEventType]) => void,
        bridgeHandler
      );
      bridge.onEvent({ vendor }, bridgeHandler);
    },
    off: (_event, handler) => {
      const bridgeHandler = handlerMap.get(
        handler as (data: ConnectorEventMap[ConnectorEventType]) => void
      );
      if (bridgeHandler) {
        bridge.offEvent({ vendor }, bridgeHandler);
        handlerMap.delete(handler as (data: ConnectorEventMap[ConnectorEventType]) => void);
      }
    },
    reset: () => bridge.reset({ vendor }),
  };
}
