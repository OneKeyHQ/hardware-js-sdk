import type { DEVICE } from '../events/device';
import type { Response } from './response';
import type { DeviceInfo, TransportType } from './device';
import type { IEvmMethods } from './chain-evm';
import type { IBtcMethods } from './chain-btc';
import type { ISolMethods } from './chain-sol';
import type { ITronMethods } from './chain-tron';
import type { QrDisplayData, QrResponseData } from './qr';
import type { ChainForFingerprint } from './fingerprint';
import type { ActiveJobInfo, Interruptibility } from '../utils/DeviceJobQueue';
import type { UI_REQUEST, UiResponseEvent } from '../events/ui-request';
import type { SDK } from '../events/sdk';

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
  | { type: typeof UI_REQUEST.REQUEST_DEVICE_PERMISSION; payload: Record<string, never> }
  | { type: typeof UI_REQUEST.REQUEST_SELECT_DEVICE; payload: { devices: DeviceInfo[] } }
  | {
      type: typeof UI_REQUEST.REQUEST_DEVICE_CONNECT;
      payload: { message: string; retryCount: number; maxRetries: number };
    }
  | {
      type: typeof UI_REQUEST.REQUEST_PREEMPTION;
      payload: {
        deviceId: string;
        currentJob: ActiveJobInfo;
        newJob: { label?: string; interruptibility: Interruptibility };
      };
    }
  | { type: typeof UI_REQUEST.CLOSE_UI_WINDOW; payload: Record<string, never> };

export type SdkEvent =
  | { type: typeof SDK.DEVICE_INTERACTION; payload: { connectId: string; action: string } }
  | { type: typeof SDK.DEVICE_STUCK; payload: { connectId: string } }
  | { type: typeof SDK.DEVICE_UNRESPONSIVE; payload: { connectId: string } }
  | { type: typeof SDK.DEVICE_RECOVERED; payload: { connectId: string } };

export type HardwareEvent = DeviceEvent | UiRequestEvent | SdkEvent;
export type DeviceEventListener = (event: HardwareEvent) => void;

/**
 * Type-safe event map for IHardwareWallet.on / .off.
 *
 * Each key is a concrete event string (e.g. DEVICE.CONNECT = 'device-connect'),
 * and the value is the narrowed event object the listener will receive.
 */
export interface HardwareEventMap {
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
    payload: Record<string, never>;
  };
  [UI_REQUEST.REQUEST_SELECT_DEVICE]: {
    type: typeof UI_REQUEST.REQUEST_SELECT_DEVICE;
    payload: { devices: DeviceInfo[] };
  };
  [UI_REQUEST.REQUEST_DEVICE_CONNECT]: {
    type: typeof UI_REQUEST.REQUEST_DEVICE_CONNECT;
    payload: { message: string; retryCount: number; maxRetries: number };
  };
  [UI_REQUEST.REQUEST_PREEMPTION]: {
    type: typeof UI_REQUEST.REQUEST_PREEMPTION;
    payload: {
      deviceId: string;
      currentJob: ActiveJobInfo;
      newJob: { label?: string; interruptibility: Interruptibility };
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

/**
 * Same-process callbacks for prompts and OS-level permission.
 * Cross-process flows use events + `uiResponse` + `UiRequestRegistry` instead.
 */
export interface IUiHandler {
  onPinRequest(device: DeviceInfo): Promise<string>;
  onPassphraseRequest(device: DeviceInfo): Promise<string | PassphraseResponse>;
  onQrDisplay(device: DeviceInfo, data: QrDisplayData): Promise<QrResponseData>;

  /**
   * Check if device access permission is already granted.
   * Returns { granted, context? }.
   * - granted: true → skip onDevicePermission
   * - granted: false → adapter calls onDevicePermission with the context
   * - context: consumer-defined data passed through to onDevicePermission
   *
   * When connectId/deviceId are undefined (searchDevices), check environment-level
   * permissions (USB: any paired device exists; BLE: bluetooth on + location permission).
   * When connectId/deviceId are provided (business methods), check device-level
   * permissions (USB: target device authorized; BLE: bluetooth on + device connected).
   */
  checkDevicePermission?(params: {
    transportType: TransportType;
    connectId?: string;
    deviceId?: string;
  }): Promise<{
    granted: boolean;
    context?: Record<string, unknown>;
  }>;

  /**
   * Request device access permission from the user.
   * Only called when checkDevicePermission returns granted: false (or is not set).
   *
   * The handler decides what to do based on transportType + context:
   * - usb/hid: open pairing page or call requestWebUSBDevice
   * - ble: enable bluetooth, request location permission, start scanning
   */
  onDevicePermission(params: {
    transportType: TransportType;
    context?: Record<string, unknown>;
  }): Promise<void>;
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
  cancel(connectId: string): void;

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

  // UI handler (request-response)
  setUiHandler(handler: Partial<IUiHandler>): void;

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
