import type { DEVICE } from '../events/device';
import type { Response } from './response';
import type { DeviceInfo, TransportType } from './device';
import type { IEvmMethods } from './chain-evm';
import type { IBtcMethods } from './chain-btc';
import type { ISolMethods } from './chain-sol';
import type { ITronMethods } from './chain-tron';
import type { QrDisplayData } from './qr';
import type { ChainForFingerprint } from './fingerprint';
import type { UI_REQUEST, UiResponseEvent } from '../events/ui-request';
import type { SDK } from '../events/sdk';
import type { ConnectorUiEvent } from './connector';

export type ChainCapability = 'evm' | 'btc' | 'sol' | 'tron';

export interface PassphraseResponse {
  passphrase: string;
  /** If true, passphrase will be entered on the device. `passphrase` field is ignored. */
  onDevice?: boolean;
}

export type DeviceEvent =
  | { type: typeof DEVICE.CONNECT; payload: DeviceInfo }
  | { type: typeof DEVICE.DISCONNECT; payload: { connectId: string } }
  | { type: typeof DEVICE.CHANGED; payload: DeviceInfo };

export type UiRequestEvent =
  | { type: typeof UI_REQUEST.REQUEST_PIN; payload: { device: DeviceInfo } }
  | { type: typeof UI_REQUEST.REQUEST_PASSPHRASE; payload: { device: DeviceInfo } }
  | { type: typeof UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE; payload: { device: DeviceInfo } }
  | { type: typeof UI_REQUEST.REQUEST_BUTTON; payload: { device: DeviceInfo; code?: string } }
  | {
      type: typeof UI_REQUEST.REQUEST_QR_DISPLAY;
      payload: { device: DeviceInfo; data: QrDisplayData };
    }
  | { type: typeof UI_REQUEST.REQUEST_QR_SCAN; payload: { device: DeviceInfo } }
  | {
      type: typeof UI_REQUEST.REQUEST_DEVICE_PERMISSION;
      payload: { transportType: TransportType; connectId?: string; deviceId?: string };
    }
  | { type: typeof UI_REQUEST.REQUEST_SELECT_DEVICE; payload: { devices: DeviceInfo[] } }
  | {
      type: typeof UI_REQUEST.REQUEST_DEVICE_CONNECT;
      payload: {
        /** Vendor that emitted the request, e.g. 'ledger', 'trezor'. */
        vendor: string;
        /**
         * Why the SDK is asking for a reconnect. Lets the app render
         * vendor-aware copy without inspecting message strings.
         * - 'device-not-found': search returned 0 / device not reachable.
         * Future values can be added (e.g. 'pairing-failed') as new fallback
         * causes are surfaced.
         */
        reason: string;
        /**
         * Best-effort English fallback. Apps should prefer rendering via
         * `vendor` + `reason` for i18n; fall back to this if the combination
         * isn't recognized.
         */
        message: string;
      };
    }
  | { type: typeof UI_REQUEST.CLOSE_UI_WINDOW; payload: Record<string, never> };

export type SdkEvent =
  | { type: typeof SDK.DEVICE_INTERACTION; payload: { connectId: string; action: string } }
  | { type: typeof SDK.DEVICE_STUCK; payload: { connectId: string } }
  | { type: typeof SDK.DEVICE_UNRESPONSIVE; payload: { connectId: string } }
  | { type: typeof SDK.DEVICE_RECOVERED; payload: { connectId: string } };

export type HardwareEvent = DeviceEvent | UiRequestEvent | SdkEvent | ConnectorUiEvent;
export type DeviceEventListener = (event: HardwareEvent) => void;

/**
 * Type-safe event map for IHardwareWallet.on / .off.
 *
 * Each key is a concrete event string (e.g. DEVICE.CONNECT = 'device-connect'),
 * and the value is the narrowed event object the listener will receive.
 */
export interface HardwareEventMap {
  // Low-level connector UI event (forwarded from IConnector 'ui-event').
  // Carries the four EConnectorInteraction values: ConfirmOnDevice / ConfirmOpenApp /
  // UnlockDevice / InteractionComplete. Subscribe with hw.on('ui-event', handler).
  'ui-event': ConnectorUiEvent;

  // Device events
  [DEVICE.CONNECT]: { type: typeof DEVICE.CONNECT; payload: DeviceInfo };
  [DEVICE.DISCONNECT]: { type: typeof DEVICE.DISCONNECT; payload: { connectId: string } };
  [DEVICE.CHANGED]: { type: typeof DEVICE.CHANGED; payload: DeviceInfo };

  // UI request events
  [UI_REQUEST.REQUEST_PIN]: {
    type: typeof UI_REQUEST.REQUEST_PIN;
    payload: { device: DeviceInfo };
  };
  [UI_REQUEST.REQUEST_PASSPHRASE]: {
    type: typeof UI_REQUEST.REQUEST_PASSPHRASE;
    payload: { device: DeviceInfo };
  };
  [UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE]: {
    type: typeof UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE;
    payload: { device: DeviceInfo };
  };
  [UI_REQUEST.REQUEST_BUTTON]: {
    type: typeof UI_REQUEST.REQUEST_BUTTON;
    payload: { device: DeviceInfo; code?: string };
  };
  [UI_REQUEST.REQUEST_QR_DISPLAY]: {
    type: typeof UI_REQUEST.REQUEST_QR_DISPLAY;
    payload: { device: DeviceInfo; data: QrDisplayData };
  };
  [UI_REQUEST.REQUEST_QR_SCAN]: {
    type: typeof UI_REQUEST.REQUEST_QR_SCAN;
    payload: { device: DeviceInfo };
  };
  [UI_REQUEST.REQUEST_DEVICE_PERMISSION]: {
    type: typeof UI_REQUEST.REQUEST_DEVICE_PERMISSION;
    payload: { transportType: TransportType; connectId?: string; deviceId?: string };
  };
  [UI_REQUEST.REQUEST_SELECT_DEVICE]: {
    type: typeof UI_REQUEST.REQUEST_SELECT_DEVICE;
    payload: { devices: DeviceInfo[] };
  };
  [UI_REQUEST.REQUEST_DEVICE_CONNECT]: {
    type: typeof UI_REQUEST.REQUEST_DEVICE_CONNECT;
    payload: {
      vendor: string;
      reason: string;
      message: string;
    };
  };
  [UI_REQUEST.REQUEST_BTC_HIGH_INDEX_CONFIRM]: {
    type: typeof UI_REQUEST.REQUEST_BTC_HIGH_INDEX_CONFIRM;
    payload: {
      vendor: string;
      path: string;
      accountIndex: number;
    };
  };
  [UI_REQUEST.CLOSE_UI_WINDOW]: {
    type: typeof UI_REQUEST.CLOSE_UI_WINDOW;
    payload: Record<string, never>;
  };

  // SDK events
  [SDK.DEVICE_INTERACTION]: {
    type: typeof SDK.DEVICE_INTERACTION;
    payload: { connectId: string; action: string };
  };
  [SDK.DEVICE_STUCK]: { type: typeof SDK.DEVICE_STUCK; payload: { connectId: string } };
  [SDK.DEVICE_UNRESPONSIVE]: {
    type: typeof SDK.DEVICE_UNRESPONSIVE;
    payload: { connectId: string };
  };
  [SDK.DEVICE_RECOVERED]: { type: typeof SDK.DEVICE_RECOVERED; payload: { connectId: string } };
}

export interface IHardwareWallet<TConfig = unknown>
  extends IEvmMethods,
    IBtcMethods,
    ISolMethods,
    ITronMethods {
  readonly vendor: string;
  readonly activeTransport: TransportType | null;

  init(config: TConfig): Promise<void>;
  dispose(): Promise<void>;

  // Transport
  getAvailableTransports(): TransportType[];
  switchTransport(type: TransportType): Promise<void>;

  // Device
  searchDevices(): Promise<DeviceInfo[]>;
  connectDevice(connectId: string): Promise<Response<string>>;
  disconnectDevice(connectId: string): Promise<void>;
  getDeviceInfo(connectId: string, deviceId: string): Promise<Response<DeviceInfo>>;
  getSupportedChains(): ChainCapability[];
  /** Abort the in-flight call. Omit connectId to cancel whatever is active. */
  cancel(connectId?: string): void;

  /** Respond to any pending `ui-request-*`. */
  uiResponse(response: UiResponseEvent): void;

  // Device fingerprint
  /**
   * Derive a chain-specific fingerprint for the connected device.
   *
   * For Ledger: derives an address at a fixed testnet path and hashes it.
   * For Trezor: returns the hardware device_id from firmware features.
   *
   * Used to verify that the same seed/device is connected across sessions,
   * especially for vendors with ephemeral connectId/deviceId.
   */
  getChainFingerprint(
    connectId: string,
    deviceId: string,
    chain: ChainForFingerprint
  ): Promise<Response<string>>;

  // Events (notifications only: connect, disconnect, button, interaction)
  on<K extends keyof HardwareEventMap>(
    event: K,
    listener: (event: HardwareEventMap[K]) => void
  ): void;
  on(event: string, listener: DeviceEventListener): void;
  off<K extends keyof HardwareEventMap>(
    event: K,
    listener: (event: HardwareEventMap[K]) => void
  ): void;
  off(event: string, listener: DeviceEventListener): void;
}
