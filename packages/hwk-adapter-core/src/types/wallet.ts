import type { ConnectorUiEvent, EConnectorInteraction } from './connector';
import type { DEVICE } from '../events/device';
import type { Response } from './response';
import type {
  ConnectionTarget,
  ConnectionType,
  DeviceInfo,
  DeviceSearchTarget,
  TransportType,
  WalletIdentity,
} from './device';
import type { IEvmMethods } from './chain-evm';
import type { IBtcMethods } from './chain-btc';
import type { ISolMethods } from './chain-sol';
import type { ITronMethods } from './chain-tron';
import type { QrDisplayData } from './qr';
import type { ChainForFingerprint } from './fingerprint';
import type { UI_REQUEST, UiResponseEvent } from '../events/ui-request';
import type { SDK } from '../events/sdk';
import type { HardwareErrorCode } from './errors';
import type { InteractionEndReason } from '../utils/InteractionRegistry';
import type { AllNetworkMethodName } from '../utils/methodCatalog';

/**
 * Wallet-level `ui-event` variants. Same shape as `ConnectorUiEvent` except
 * the AppInstallProgress variant's payload is re-keyed by the adapter from
 * connector-internal `sessionId` to the public `connectId`.
 */
export type HardwareUiEvent =
  | Exclude<ConnectorUiEvent, { type: EConnectorInteraction.AppInstallProgress }>
  | {
      type: EConnectorInteraction.AppInstallProgress;
      payload: { connectId: string; appName: string; progress: number };
    };

export type ChainCapability = 'evm' | 'btc' | 'sol' | 'tron' | 'zcash';

export type TrezorDisplayRotation = 'North' | 'East' | 'South' | 'West';

export type TrezorSafetyCheckLevel = 'Strict' | 'PromptAlways' | 'PromptTemporarily';

export type TrezorDeviceSettingsParams = {
  language?: string;
  label?: string;
  use_passphrase?: boolean;
  homescreen?: string;
  auto_lock_delay_ms?: number;
  display_rotation?: TrezorDisplayRotation;
  passphrase_always_on_device?: boolean;
  safety_checks?: TrezorSafetyCheckLevel;
  experimental_features?: boolean;
  hide_passphrase_from_host?: boolean;
  haptic_feedback?: boolean;
  auto_lock_delay_battery_ms?: number;
};

export type TrezorBrightnessParams = {
  value?: number;
};

export type TrezorChangePinParams = {
  remove?: boolean;
};

export type DeviceAuthenticityParams = {
  /**
   * 32-byte server nonce encoded as hex. Trezor signs the protocol-framed
   * AuthenticateDevice payload containing these bytes with its factory
   * attestation key. Omit only for local diagnostics where the SDK may generate
   * a random nonce itself.
   */
  challenge?: string;
  /**
   * OneKey relay base returned by a short-lived backend challenge session.
   * Ledger DMK connects to this URL instead of Ledger directly so the backend
   * can witness the genuine-check transcript and issue a server-side receipt.
   */
  ledgerGenuineCheckWebSocketUrl?: string;
  /**
   * Trezor development/simulator roots. Production reward flows must never
   * enable this.
   */
  dangerouslyAllowDebugKeys?: boolean;
};

export type DeviceAuthenticityResult = {
  vendor: 'trezor' | 'ledger';
  verified: boolean;
  deviceId?: string;
  deviceCertPubKey?: string;
  serialNumber?: string;
  rootPubKey?: string;
  caPubKey?: string;
  usedDebugKey?: boolean;
  error?: string;
  /**
   * Trezor-only server-verifiable envelope. The backend must verify this proof
   * against the nonce stored for the challenge session; it must not trust the
   * client's `verified` boolean.
   */
  trezorProof?: {
    challenge: string;
    deviceModel: string;
    proof: {
      optiga_certificates: string[];
      optiga_signature: string;
      tropic_certificates?: string[];
      tropic_signature?: string;
      mcu_certificates?: string[];
      mcu_signature?: string;
    };
  };
};

/**
 * Cross-chain / cross-vendor options passed alongside any chain method's
 * own params (the optional last argument). Holds operation-level switches
 * that aren't specific to one chain. Vendor-specific options can be added
 * as typed sub-fields here when a vendor actually needs them.
 */
/** Persisted connection hints, never proof of device or wallet identity. */
export type KnownDeviceConnection =
  | { transport: 'usb' | 'ble'; connectId: string }
  | { transport: 'qr' };

/** Opaque host lookup identifiers. Never forward these to firmware or logs. */
export type HardwareCallExtra = Readonly<Record<string, string>>;

export interface IHardwareConnectionContext {
  knownConnections?: readonly KnownDeviceConnection[];
  extra?: HardwareCallExtra;
  /** False makes discovery fail instead of asking the user to select a new endpoint. */
  allowDeviceSelection?: boolean;
}

export type DeviceSelectionContext =
  | { kind: 'select-device'; transport: 'usb'; reason: 'multiple-candidates' }
  | {
      kind: 'bind-connection';
      transport: 'ble';
      reason: 'missing-binding' | 'known-connection-unavailable' | 'manual-rebind';
    };

export interface DeviceSelectionRequest {
  devices: DeviceInfo[];
  requestId: string;
  context: DeviceSelectionContext;
  extra?: HardwareCallExtra;
  /** Repeated snapshots with this requestId update one SDK-owned binding scan. */
  scanning?: boolean;
  bindingSessionId?: string;
  /** A candidate rejected by SDK identity verification in this binding session. */
  rejectedConnectId?: string;
}

/** The SDK has verified this endpoint; the host must persist it before acknowledging. */
export interface SaveDeviceBindingRequest {
  requestId: string;
  selectionRequestId: string;
  connection: { transport: 'ble'; connectId: string };
  identity: Extract<WalletIdentity, { vendor: 'ledger' | 'trezor' }>;
  extra?: HardwareCallExtra;
}

export type BindBleDeviceParams = Pick<SaveDeviceBindingRequest, 'identity' | 'extra'>;

export interface DeviceBindingStatus {
  selectionRequestId: string;
  status: 'verifying' | 'saved' | 'failed' | 'cancelled';
}

export interface ICommonCallParams extends IHardwareConnectionContext {
  /**
   * When the required device app is missing, prompt the user (UI request)
   * to install it, stream install progress, then retry the operation once.
   * Off by default — preserves the plain "app not installed" failure.
   */
  autoInstallApp?: boolean;
  /** Runtime-only id returned by connectDevice(). When present, discovery and fallback are disabled. */
  interactionId?: string;
}

export type NullableCallArg<T> = T | null | undefined;

export interface IPassphraseCallParams {
  passphraseState?: string;
  useEmptyPassphrase?: boolean;
}

export type IHardwareCommonCallParams = ICommonCallParams & IPassphraseCallParams;

export type IHardwareCallParams<T> = T & IHardwareCommonCallParams;

/**
 * Runtime-only context for device-manager operations. The expected identity
 * lets an adapter fail closed before a read or mutation is replayed after a
 * reconnect. It must never be forwarded to vendor firmware.
 */
export interface IDeviceManagerOperationContext extends IHardwareConnectionContext {
  interactionId?: string;
  expectedDeviceIdentity?: WalletIdentity;
}

export interface AllNetworkAddressParams {
  network: string;
  path: string;
  showOnDevice?: boolean;
  methodName: AllNetworkMethodName;
  [key: string]: unknown;
}

export interface AllNetworkGetAddressParams extends IHardwareCommonCallParams {
  bundle: AllNetworkAddressParams[];
}

export type AllNetworkDeviceIdentity = WalletIdentity;

export type AllNetworkAddressResponsePayload = Record<string, unknown> & {
  error?: string;
  code?: HardwareErrorCode | number;
  errorCode?: string | number;
  connectId?: string;
  deviceId?: string;
  deviceIdentity?: AllNetworkDeviceIdentity;
  rootFingerprint?: number;
  chainFingerprint?: string;
  chainFingerprintChain?: ChainForFingerprint;
  params?: Record<string, unknown>;
};

export type AllNetworkAddressResponse = AllNetworkAddressParams & {
  success: boolean;
  payload?: AllNetworkAddressResponsePayload;
};

export interface PassphraseResponse {
  passphrase: string;
  /** If true, passphrase will be entered on the device. `passphrase` field is ignored. */
  onDevice?: boolean;
}

export type DeviceEvent =
  | { type: typeof DEVICE.CONNECT; payload: DeviceInfo }
  | { type: typeof DEVICE.DISCONNECT; payload: { connectId: string } }
  | { type: typeof DEVICE.CHANGED; payload: DeviceInfo }
  | {
      type: typeof DEVICE.FEATURES;
      device: DeviceInfo & { features: Record<string, unknown> };
      payload: { device: DeviceInfo & { features: Record<string, unknown> } };
    }
  | {
      type: typeof DEVICE.TREZOR_THP_CREDENTIALS_CHANGED;
      payload: { connectId: string; deviceId?: string; credentials: Record<string, unknown>[] };
    };

export type UiRequestEvent =
  | {
      type: typeof UI_REQUEST.REQUEST_PIN;
      payload: { device?: DeviceInfo; connectId?: string; type?: string };
    }
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
  | { type: typeof UI_REQUEST.REQUEST_SELECT_DEVICE; payload: DeviceSelectionRequest }
  | { type: typeof UI_REQUEST.REQUEST_SAVE_DEVICE_BINDING; payload: SaveDeviceBindingRequest }
  | { type: typeof UI_REQUEST.DEVICE_BINDING_STATUS; payload: DeviceBindingStatus }
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
  | {
      type: typeof UI_REQUEST.REQUEST_INSTALL_APP;
      payload: { vendor: string; appName: string };
    }
  | {
      type: typeof UI_REQUEST.REQUEST_TREZOR_THP_PAIRING;
      payload: {
        connectId: string;
        availableMethods: number[];
        selectedMethod: number;
        nfcData?: string;
      };
    }
  | { type: typeof UI_REQUEST.CLOSE_UI_WINDOW; payload: Record<string, never> };

export type SdkEvent =
  | { type: typeof SDK.DEVICE_INTERACTION; payload: { connectId: string; action: string } }
  | { type: typeof SDK.DEVICE_STUCK; payload: { connectId: string } }
  | { type: typeof SDK.DEVICE_UNRESPONSIVE; payload: { connectId: string } }
  | { type: typeof SDK.DEVICE_RECOVERED; payload: { connectId: string } }
  | {
      type: typeof SDK.INTERACTION_ENDED;
      payload: {
        interactionId: string;
        reason: InteractionEndReason;
      };
    };

export type HardwareEvent = DeviceEvent | UiRequestEvent | SdkEvent | HardwareUiEvent;
export type DeviceEventListener = (event: HardwareEvent) => void;

/**
 * Type-safe event map for IHardwareWallet.on / .off.
 *
 * Each key is a concrete event string (e.g. DEVICE.CONNECT = 'device-connect'),
 * and the value is the narrowed event object the listener will receive.
 */
export interface HardwareEventMap {
  [UI_REQUEST.DEVICE_BINDING_STATUS]: {
    type: typeof UI_REQUEST.DEVICE_BINDING_STATUS;
    payload: DeviceBindingStatus;
  };
  [UI_REQUEST.REQUEST_SAVE_DEVICE_BINDING]: {
    type: typeof UI_REQUEST.REQUEST_SAVE_DEVICE_BINDING;
    payload: SaveDeviceBindingRequest;
  };
  // Low-level connector UI event (forwarded from IConnector 'ui-event').
  // Carries every EConnectorInteraction variant — interaction prompts
  // (ConfirmOnDevice / ConfirmOpenApp / UnlockDevice / InteractionComplete /
  // Searching) and AppInstallProgress (Ledger OS-level app install). The
  // adapter re-keys AppInstallProgress payload from connector-internal
  // `sessionId` to public `connectId`. Subscribe with hw.on('ui-event', handler).
  'ui-event': HardwareUiEvent;

  // Device events
  [DEVICE.CONNECT]: { type: typeof DEVICE.CONNECT; payload: DeviceInfo };
  [DEVICE.DISCONNECT]: { type: typeof DEVICE.DISCONNECT; payload: { connectId: string } };
  [DEVICE.CHANGED]: { type: typeof DEVICE.CHANGED; payload: DeviceInfo };
  [DEVICE.FEATURES]: {
    type: typeof DEVICE.FEATURES;
    device: DeviceInfo & { features: Record<string, unknown> };
    payload: { device: DeviceInfo & { features: Record<string, unknown> } };
  };
  [DEVICE.TREZOR_THP_CREDENTIALS_CHANGED]: {
    type: typeof DEVICE.TREZOR_THP_CREDENTIALS_CHANGED;
    payload: { connectId: string; deviceId?: string; credentials: Record<string, unknown>[] };
  };

  // UI request events
  [UI_REQUEST.REQUEST_PIN]: {
    type: typeof UI_REQUEST.REQUEST_PIN;
    payload: { device?: DeviceInfo; connectId?: string; type?: string };
  };
  [UI_REQUEST.REQUEST_PASSPHRASE]: {
    type: typeof UI_REQUEST.REQUEST_PASSPHRASE;
    payload: {
      device?: DeviceInfo;
      connectId?: string;
      passphraseState?: string;
      useEmptyPassphrase?: boolean;
    };
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
    payload: DeviceSelectionRequest;
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
  [UI_REQUEST.REQUEST_INSTALL_APP]: {
    type: typeof UI_REQUEST.REQUEST_INSTALL_APP;
    payload: { vendor: string; appName: string };
  };
  [UI_REQUEST.REQUEST_TREZOR_THP_PAIRING]: {
    type: typeof UI_REQUEST.REQUEST_TREZOR_THP_PAIRING;
    payload: {
      connectId: string;
      availableMethods: number[];
      selectedMethod: number;
      nfcData?: string;
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
  [SDK.INTERACTION_ENDED]: {
    type: typeof SDK.INTERACTION_ENDED;
    payload: {
      interactionId: string;
      reason: InteractionEndReason;
    };
  };
}

export interface IDeviceManagerMethods {
  getFeatures?(
    connectId: string,
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<Record<string, unknown>>>;
  deviceSettings?(
    connectId: string,
    params: TrezorDeviceSettingsParams,
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<Record<string, unknown>>>;
  setBrightness?(
    connectId: string,
    params?: TrezorBrightnessParams,
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<Record<string, unknown>>>;
  changePin?(
    connectId: string,
    params?: TrezorChangePinParams,
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<Record<string, unknown>>>;
  wipeDevice?(
    connectId: string,
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<Record<string, unknown>>>;
  // Sends AuthenticateDevice and returns the raw AuthenticityProof message.
  // The challenge must be generated host-side and passed in.
  authenticateDevice?(
    connectId: string,
    params: { challenge: string },
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<Record<string, unknown>>>;
}

export interface IWalletStateMethods {
  // Passphrase session (optional — Trezor only)
  /**
   * Resolve the device's active passphrase wallet identity (`passphraseState`).
   * Today this is the compressed public key derived at `m/44'/0'/0'`, not the
   * 4-byte master fingerprint. Two modes:
   *
   *  - **Discover** (no `passphraseState`): for a **standard wallet** (passphrase
   *    protection off) returns `null` — there's one wallet and nothing to pin.
   *    The SDK may still create a THP app session and derive once so it can
   *    unlock and re-read fresh Features, but it does not ask for a passphrase.
   *    For a **passphrase wallet** it creates a fresh session (prompts the user),
   *    derives its state, and returns it so the host can persist the wallet.
   *    Mirrors OneKey's null-for-standard convention.
   *  - **Verify** (`passphraseState` given): align the device to that wallet and
   *    confirm the derived state matches. Fails with `PassphraseStateMismatch`
   *    when the entered passphrase yields a different wallet.
   *
   * SECURITY: every wallet-bound op that carries a `passphraseState` (getAddress,
   * sign, …) creates a fresh session, re-derives, and confirms the state before
   * the chain method runs. Standard wallets should pass `useEmptyPassphrase` so
   * the host can explicitly create the empty-passphrase session.
   *
   * Optional: vendors without host-managed passphrase sessions (Ledger) omit
   * it. Implemented by `TrezorAdapter`.
   */
  getPassphraseState?(
    connectId: string,
    passphraseState?: string,
    operationContext?: IDeviceManagerOperationContext
  ): Promise<Response<string | null>>;
}

export interface IHardwareWallet<TConfig = unknown>
  extends IEvmMethods,
    IBtcMethods,
    ISolMethods,
    ITronMethods,
    IDeviceManagerMethods,
    IWalletStateMethods {
  readonly vendor: string;
  readonly activeTransport: TransportType | null;

  init(config: TConfig): Promise<void>;
  dispose(): Promise<void>;

  // Transport
  getAvailableTransports(): TransportType[];
  switchTransport(type: TransportType): Promise<void>;

  // Device
  searchDevices(options?: SearchDevicesOptions): Promise<DeviceInfo[]>;
  /** Discover selectable hardware entries without claiming identified devices or wallets. */
  searchDeviceTargets(options?: SearchDevicesOptions): Promise<DeviceSearchTarget[]>;
  /** @deprecated Use searchDeviceTargets(). */
  listConnectionTargets(options?: SearchDevicesOptions): Promise<ConnectionTarget[]>;
  /** Connect or logically bind a selected search result and return a runtime-only interaction id. */
  connectDevice(searchTargetId: string): Promise<Response<string>>;
  /** Explicit Device Manager binding: verify the existing identity before replacing its BLE locator. */
  bindBleDevice?(params: BindBleDeviceParams): Promise<Response<string>>;
  /** Resolve operation-first routing/selection and pin it. The caller must verify wallet identity before business calls. */
  acquireInteraction?(
    connectId: string,
    context: IHardwareConnectionContext
  ): Promise<Response<string>>;
  /** Release an interaction owned by the caller. Disconnect events end matching interactions automatically. */
  releaseInteraction(interactionId: string): Promise<void>;
  getDeviceInfo(connectId: string, deviceId: string): Promise<Response<DeviceInfo>>;
  getSupportedChains(): ChainCapability[];
  /** Abort the in-flight call. Omit connectId to cancel whatever is active. */
  cancel(connectId?: string): void;

  allNetworkGetAddress(
    connectId: string,
    deviceId: string,
    params: AllNetworkGetAddressParams
  ): Promise<Response<AllNetworkAddressResponse[]>>;

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

  verifyDeviceAuthenticity?(
    connectId: string,
    params?: DeviceAuthenticityParams
  ): Promise<Response<DeviceAuthenticityResult>>;

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

export interface SearchDevicesOptions {
  /**
   * Clear cached adapter sessions before scanning.
   *
   * Use this for an explicit "search/add another device" flow on transports
   * whose connectId is not stable, such as Ledger WebHID. Normal refresh scans
   * should leave this false so an active session can still be reused.
   */
  resetSession?: boolean;
  /**
   * Wait for every physical transport behind a fused connector. Use this for
   * transport binding/pairing UIs that must show BLE candidates even when USB
   * was discovered first.
   */
  waitForAllTransports?: boolean;
  /**
   * Restrict discovery to one transport. A non-enumerable channel may return
   * a virtual connection target (for example Keystone QR), but discovery must
   * not start a wallet protocol or account-export interaction. The target is
   * resolved by the following `connectDevice()` call. Omit to scan everything
   * available.
   */
  transportType?: ConnectionType;
}
