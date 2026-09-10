import { UR, URDecoder, UREncoder } from '@ngraveio/bc-ur';
import { Actions } from '@keystonehq/hw-transport-usb';
import {
  EConnectorInteraction,
  HardwareErrorCode,
  TypedEventEmitter,
  createHardwareConnectorSessionId,
  createHardwareSearchTargetId,
  createHwkError,
  hasHardwareRuntimeIdPrefix,
  parseBip32MasterFingerprint,
  parseHardwareRuntimeId,
  serializeConnectorError,
  success,
} from '@onekeyfe/hwk-adapter-core';

import { mapKeystoneUsbError } from './errors';

import type {
  ConnectorCallResult,
  ConnectorConnectTarget,
  ConnectorDevice,
  ConnectorEventMap,
  ConnectorEventType,
  ConnectorSearchDevicesOptions,
  ConnectorSession,
  IConnector,
  UiResponseEvent,
} from '@onekeyfe/hwk-adapter-core';
import type { TransportConfig, TransportHID } from '@keystonehq/hw-transport-usb';

/**
 * Static surface shared by `TransportWebUSB` and `TransportNodeUSB`; the
 * platform-specific transport is injected by `_subpath/*`.
 */
/**
 * What enumeration can see before the device is opened. WebUSB hands back a
 * `USBDevice`; node-usb's wrapper exposes the same descriptor strings. Every
 * field is optional because a device may simply not publish that string
 * descriptor — read defensively, never assume presence.
 */
export interface KeystoneUsbDeviceDescriptor {
  serialNumber?: string;
  productName?: string;
  manufacturerName?: string;
  vendorId?: number;
  productId?: number;
  /** Device release number (bcdDevice), split into its three nibble groups. */
  deviceVersionMajor?: number;
  deviceVersionMinor?: number;
  deviceVersionSubminor?: number;
  usbVersionMajor?: number;
  usbVersionMinor?: number;
  usbVersionSubminor?: number;
  deviceClass?: number;
  deviceSubclass?: number;
  deviceProtocol?: number;
}

/**
 * Enumeration-time display name. Every Keystone shares one vid/pid and reports
 * the same `productName`, so the name alone cannot tell two attached units
 * apart — the serial's suffix is the only discriminator available before the
 * device is opened. `M-76AB5599` -> `Keystone 76AB5599`.
 */
function usbDisplayName(device: KeystoneUsbDeviceDescriptor): string {
  const base = device.productName?.trim() || 'Keystone';
  const suffix = device.serialNumber?.split('-').pop()?.trim();
  return suffix ? `${base} ${suffix}` : base;
}

export interface KeystoneUsbTransportStatic {
  connect(config?: TransportConfig): Promise<TransportHID>;
  connectDevice?(
    device: KeystoneUsbDeviceDescriptor,
    config?: TransportConfig
  ): Promise<TransportHID>;
  getKeystoneDevices(): Promise<ReadonlyArray<KeystoneUsbDeviceDescriptor>>;
  requestPermission?(): Promise<void>;
  isSupported(): Promise<boolean>;
  /** Release transport-lifetime resources owned by the platform wrapper. */
  disposeTransport?(transport: TransportHID): void;
}

interface KeystoneUr {
  urType: string;
  urData: string;
}

interface UsbSession {
  transport: TransportHID;
  mfp?: string;
  dispose(): void;
}

interface OpenedUsbTransport {
  transport: TransportHID;
  bindSessionId(sessionId: string): void;
  dispose(): void;
}

type KeystoneUsbConnectInput =
  | { searchTargetId: string; expectedMasterFingerprint?: never }
  | { searchTargetId?: never; expectedMasterFingerprint: string }
  | { searchTargetId?: never; expectedMasterFingerprint?: never };

const DEFAULT_TIMEOUT_MS = 100_000; // SDK's own raw default is 15s ("may need users' action on the device") — too short for real confirmation.

const KEYSTONE_PUBLIC_DATA_UR_TYPE = 'qr-hardware-call';

function toUrEncoded(ur: KeystoneUr): string {
  return new UREncoder(new UR(Buffer.from(ur.urData, 'hex'), ur.urType), Infinity)
    .nextPart()
    .toUpperCase();
}

function fromUrEncoded(encoded: unknown): KeystoneUr {
  // Accept either one complete UR or multiple whitespace-separated parts.
  // The transport owns EAPDU framing; this function only validates and joins
  // the BC-UR text present in that response.
  const text = typeof encoded === 'string' ? encoded.trim() : '';
  const parts = text.split(/\s+/).filter(Boolean);
  const decoder = new URDecoder();
  for (const part of parts) {
    decoder.receivePart(part);
    if (decoder.isComplete()) break;
  }
  if (!parts.length || !decoder.isComplete() || !decoder.isSuccess()) {
    const shape =
      typeof encoded === 'string'
        ? `string len=${text.length} parts=${parts.length}`
        : typeof encoded;
    throw createHwkError({
      code: HardwareErrorCode.PayloadTooLarge,
      message: `Keystone USB returned an incomplete BC-UR response (${shape})`,
      origin: 'device',
    });
  }
  const ur = decoder.resultUR();
  return { urType: ur.type, urData: ur.cbor.toString('hex') };
}

/**
 * `IConnector` for Keystone over USB. Each transport call is its own
 * open/claim/transfer/close cycle, so `connect()` only caches the transport
 * object. `resolveUr` carries the same UR payloads as the QR channel.
 */
export class KeystoneUsbConnectorBase implements IConnector {
  readonly connectionType = 'usb' as const;

  private readonly transportClass: KeystoneUsbTransportStatic;

  private readonly timeoutMs: number;

  private readonly emitter = new TypedEventEmitter<ConnectorEventMap>();

  private readonly sessions = new Map<string, UsbSession>();

  private readonly discoveredDevices = new Map<string, KeystoneUsbDeviceDescriptor>();

  private readonly availabilityDevices = new Map<string, KeystoneUsbDeviceDescriptor>();

  private activeDiscoveryGeneration: symbol | undefined;

  private activeAvailabilityGeneration: symbol | undefined;

  // Keystone may re-enumerate on the USB bus between public-data exports,
  // which replaces the physical transport session without starting a new
  // user operation. Keep this UI-only state at connector lifetime scope so
  // an internal recovery does not look like another first connection.
  /** Wallets that already approved a public-data export, keyed by master fingerprint. */
  private readonly publicDataConfirmedWallets = new Set<string>();

  constructor(transportClass: KeystoneUsbTransportStatic, options?: { timeoutMs?: number }) {
    this.transportClass = transportClass;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private _invalidateDiscoverySnapshot(): void {
    this.activeDiscoveryGeneration = undefined;
    this.discoveredDevices.clear();
  }

  private _invalidateAvailabilitySnapshot(): void {
    this.activeAvailabilityGeneration = undefined;
    this.availabilityDevices.clear();
  }

  async searchDevices(options?: ConnectorSearchDevicesOptions): Promise<ConnectorDevice[]> {
    const isAvailabilitySearch = options?.purpose === 'availability';
    const discoveryGeneration = Symbol(
      isAvailabilitySearch ? 'keystone-usb-availability' : 'keystone-usb-discovery'
    );
    if (isAvailabilitySearch) {
      this._invalidateAvailabilitySnapshot();
      this.activeAvailabilityGeneration = discoveryGeneration;
    } else {
      this._invalidateDiscoverySnapshot();
      this.activeDiscoveryGeneration = discoveryGeneration;
    }
    const devices = await this.transportClass.getKeystoneDevices();
    // No mfp is available without opening+claiming the device. The target id
    // therefore identifies only this discovery snapshot; wallet identity is
    // learned and verified after connect. WebUSB can reopen the exact cached
    // descriptor. Platforms without that ability fail closed for multi-device
    // selection instead of silently opening a different unit.
    if (
      (isAvailabilitySearch
        ? this.activeAvailabilityGeneration
        : this.activeDiscoveryGeneration) !== discoveryGeneration
    ) {
      return [];
    }
    return devices.map(device => {
      const connectId = createHardwareSearchTargetId({
        vendor: 'keystone',
        connectionType: 'usb',
      });
      (isAvailabilitySearch ? this.availabilityDevices : this.discoveredDevices).set(
        connectId,
        device
      );
      return {
        connectId,
        deviceId: '',
        name: usbDisplayName(device),
        connectionType: 'usb',
        serialNumber: device.serialNumber,
        capabilities: { persistentDeviceIdentity: false },
        // Everything enumeration can see, verbatim. Nothing here is normalized
        // or defaulted: a missing key means the device published no such string
        // descriptor. Promote a field onto the typed surface above once
        // something actually consumes it.
        raw: {
          serialNumber: device.serialNumber,
          productName: device.productName,
          manufacturerName: device.manufacturerName,
          vendorId: device.vendorId,
          productId: device.productId,
          deviceVersionMajor: device.deviceVersionMajor,
          deviceVersionMinor: device.deviceVersionMinor,
          deviceVersionSubminor: device.deviceVersionSubminor,
          usbVersionMajor: device.usbVersionMajor,
          usbVersionMinor: device.usbVersionMinor,
          usbVersionSubminor: device.usbVersionSubminor,
          deviceClass: device.deviceClass,
          deviceSubclass: device.deviceSubclass,
          deviceProtocol: device.deviceProtocol,
        },
      };
    });
  }

  async connect(searchTargetIdOrExpectedMasterFingerprint?: string): Promise<ConnectorSession> {
    return this._connectResolved(
      this._resolveConnectInput(searchTargetIdOrExpectedMasterFingerprint)
    );
  }

  async connectTarget(target: ConnectorConnectTarget): Promise<ConnectorSession> {
    switch (target.type) {
      case 'default':
        return this._connectResolved({});
      case 'search-target':
        return this._connectResolved({ searchTargetId: target.searchTargetId });
      case 'expected-device-identity': {
        const expectedMasterFingerprint = parseBip32MasterFingerprint(target.deviceIdentity);
        if (!expectedMasterFingerprint) {
          throw createHwkError({
            code: HardwareErrorCode.InvalidParams,
            message: 'Keystone USB connector requires a valid master fingerprint identity',
          });
        }
        return this._connectResolved({ expectedMasterFingerprint });
      }
      default:
        throw createHwkError({
          code: HardwareErrorCode.InvalidParams,
          message: 'Unsupported Keystone USB connection target',
        });
    }
  }

  private async _connectResolved({
    searchTargetId,
    expectedMasterFingerprint,
  }: KeystoneUsbConnectInput): Promise<ConnectorSession> {
    this.emitter.emit('ui-event', {
      type: EConnectorInteraction.Searching,
      payload: { sessionId: '' },
    });
    let selectedDevice = searchTargetId
      ? this.discoveredDevices.get(searchTargetId) ?? this.availabilityDevices.get(searchTargetId)
      : undefined;
    if (searchTargetId && !selectedDevice) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: `Keystone USB search target is no longer available: ${searchTargetId}`,
        recovery: { scope: 'search-target' },
      });
    }
    let openedTransport: OpenedUsbTransport | undefined;
    try {
      let config: Awaited<ReturnType<KeystoneUsbConnectorBase['_readAppConfig']>>;

      if (expectedMasterFingerprint && !searchTargetId) {
        const availableDevices = await this.transportClass.getKeystoneDevices();
        if (!this.transportClass.connectDevice && availableDevices.length > 1) {
          throw createHwkError({
            code: HardwareErrorCode.DeviceOneDeviceOnly,
            message: 'This platform cannot identify one of multiple connected Keystone devices',
          });
        }

        if (this.transportClass.connectDevice) {
          let readableDeviceFound = false;
          let lastError: unknown;
          let matched:
            | {
                device: KeystoneUsbDeviceDescriptor;
                opened: OpenedUsbTransport;
                config: Awaited<ReturnType<KeystoneUsbConnectorBase['_readAppConfig']>>;
              }
            | undefined;
          for (const device of availableDevices) {
            let candidate: OpenedUsbTransport | undefined;
            try {
              // eslint-disable-next-line no-await-in-loop
              candidate = await this._openTransport(device);
              // eslint-disable-next-line no-await-in-loop
              const candidateConfig = await this._readAppConfig(candidate.transport);
              readableDeviceFound = true;
              if (candidateConfig.mfp?.toLowerCase() === expectedMasterFingerprint.toLowerCase()) {
                matched = { device, opened: candidate, config: candidateConfig };
                break;
              }
              candidate.dispose();
            } catch (error) {
              candidate?.dispose();
              lastError = error;
            }
          }
          if (!matched) {
            if (!readableDeviceFound && lastError) throw mapKeystoneUsbError(lastError);
            throw createHwkError({
              code: HardwareErrorCode.DeviceMismatch,
              message: `No connected Keystone wallet matches fingerprint ${expectedMasterFingerprint}`,
            });
          }
          selectedDevice = matched.device;
          openedTransport = matched.opened;
          config = matched.config;
        } else {
          openedTransport = await this._openTransport();
          config = await this._readAppConfig(openedTransport.transport);
        }
      } else {
        if (!selectedDevice && this.transportClass.connectDevice) {
          const availableDevices = await this.transportClass.getKeystoneDevices();
          if (availableDevices.length === 0) {
            throw createHwkError({
              code: HardwareErrorCode.DeviceNotFound,
              message: 'No Keystone USB device is available',
            });
          }
          if (availableDevices.length > 1) {
            throw createHwkError({
              code: HardwareErrorCode.DeviceOneDeviceOnly,
              message: 'Select a Keystone USB device before connecting',
            });
          }
          [selectedDevice] = availableDevices;
        }
        if (selectedDevice && !this.transportClass.connectDevice) {
          const availableDevices = await this.transportClass.getKeystoneDevices();
          if (availableDevices.length > 1) {
            throw createHwkError({
              code: HardwareErrorCode.DeviceOneDeviceOnly,
              message: 'This platform cannot target one of multiple connected Keystone devices',
            });
          }
        }
        openedTransport = await this._openTransport(selectedDevice);
        config = await this._readAppConfig(openedTransport.transport);
      }

      if (!openedTransport) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceNotFound,
          message: 'Keystone USB transport was not opened',
        });
      }
      const activeOpenedTransport = openedTransport;
      const { transport } = activeOpenedTransport;
      if (
        expectedMasterFingerprint &&
        config.mfp &&
        config.mfp.toLowerCase() !== expectedMasterFingerprint.toLowerCase()
      ) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceMismatch,
          message: `Connected Keystone wallet (mfp ${config.mfp}) does not match the requested wallet fingerprint (${expectedMasterFingerprint})`,
        });
      }
      const sessionId = createHardwareConnectorSessionId({
        vendor: 'keystone',
        connectionType: 'usb',
      });
      activeOpenedTransport.bindSessionId(sessionId);
      this.sessions.set(sessionId, {
        transport,
        mfp: config.mfp,
        dispose: () => activeOpenedTransport.dispose(),
      });
      openedTransport = undefined;
      const device: ConnectorDevice = {
        connectId: sessionId,
        deviceId: '',
        name: selectedDevice ? usbDisplayName(selectedDevice) : 'Keystone',
        model: selectedDevice?.productName,
        connectionType: 'usb',
        serialNumber: selectedDevice?.serialNumber,
        capabilities: { persistentDeviceIdentity: false },
        raw: { masterFingerprint: config.mfp },
      };
      this.emitter.emit('device-connect', { device });
      return {
        sessionId,
        deviceInfo: this._toDeviceInfo(device, config.version, config.mfp),
      };
    } catch (err) {
      openedTransport?.dispose();
      throw mapKeystoneUsbError(err);
    }
  }

  private async _openTransport(device?: KeystoneUsbDeviceDescriptor): Promise<OpenedUsbTransport> {
    // A rejected candidate can keep its USB disconnect listener. Give every
    // descriptor a separate holder so it cannot retire a later matched session.
    let connectedSessionId: string | undefined;
    const transportConfig: TransportConfig = {
      timeout: this.timeoutMs,
      disconnectListener: () =>
        connectedSessionId ? this.disconnect(connectedSessionId) : undefined,
    };
    const transport = await (device && this.transportClass.connectDevice
      ? this.transportClass.connectDevice(device, transportConfig)
      : this.transportClass.connect(transportConfig));
    let disposed = false;
    return {
      transport,
      bindSessionId(sessionId: string) {
        connectedSessionId = sessionId;
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        this.transportClass.disposeTransport?.(transport);
      },
    };
  }

  private _resolveConnectInput(value?: string): KeystoneUsbConnectInput {
    if (!value) return {};

    const runtimeId = parseHardwareRuntimeId(value);
    if (runtimeId) {
      if (
        runtimeId.kind === 'search-target' &&
        runtimeId.vendor === 'keystone' &&
        runtimeId.connectionType === 'usb'
      ) {
        return { searchTargetId: value };
      }
      throw createHwkError({
        code: HardwareErrorCode.InvalidParams,
        message: 'Keystone USB connector received an incompatible hardware runtime id',
        params: {
          kind: runtimeId.kind,
          vendor: runtimeId.vendor,
          ...(runtimeId.kind === 'search-target'
            ? { connectionType: runtimeId.connectionType }
            : {}),
        },
      });
    }

    if (hasHardwareRuntimeIdPrefix(value)) {
      throw createHwkError({
        code: HardwareErrorCode.InvalidParams,
        message: 'Keystone USB connector received a malformed hardware runtime id',
      });
    }

    const expectedMasterFingerprint = parseBip32MasterFingerprint(value);
    if (!expectedMasterFingerprint) {
      throw createHwkError({
        code: HardwareErrorCode.InvalidParams,
        message: 'Keystone USB connector requires a search target or master fingerprint',
      });
    }
    return { expectedMasterFingerprint };
  }

  disconnect(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    if (session) {
      session.dispose();
      // No persistent claim to release (see class doc) — nothing to await
      // here beyond letting the underlying transport's own per-call close
      // run its course, which already happened on the last send().
      this.emitter.emit('device-disconnect', { connectId: sessionId });
    }
    return Promise.resolve();
  }

  /** Keep the vendor transport as the EAPDU framing authority. */
  private async _sendResolveUr(transport: TransportHID, encodedUr: string): Promise<KeystoneUr> {
    const response = await transport.send<{ payload: string }>(Actions.CMD_RESOLVE_UR, encodedUr);
    return fromUrEncoded(response.payload);
  }

  async call(sessionId: string, method: string, params: unknown): Promise<ConnectorCallResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: serializeConnectorError(
          createHwkError({
            code: HardwareErrorCode.DeviceNotFound,
            message: `Unknown Keystone USB session: ${sessionId}`,
          })
        ),
      };
    }

    try {
      switch (method) {
        case 'resolveUr': {
          const { urType, urData } = params as KeystoneUr;
          const encoded = toUrEncoded({ urType, urData });
          const isPublicDataRequest = urType === KEYSTONE_PUBLIC_DATA_UR_TYPE;
          // Public-data export asks for approval once per wallet: internal USB
          // re-enumeration must not reopen the toast, but a different device
          // has not approved anything yet. Signing always confirms.
          const publicDataKey = session.mfp?.toLowerCase() ?? sessionId;
          const shouldShowConfirmation =
            !isPublicDataRequest || !this.publicDataConfirmedWallets.has(publicDataKey);
          if (shouldShowConfirmation) {
            this.emitter.emit('ui-event', {
              type: EConnectorInteraction.ConfirmOnDevice,
              payload: { sessionId },
            });
          }
          try {
            const response = await this._sendResolveUr(session.transport, encoded);
            if (isPublicDataRequest) {
              this.publicDataConfirmedWallets.add(publicDataKey);
            }
            return success(response);
          } finally {
            if (shouldShowConfirmation) {
              this.emitter.emit('ui-event', {
                type: EConnectorInteraction.InteractionComplete,
                payload: { sessionId },
              });
            }
          }
        }
        case 'checkLockStatus': {
          const response = await session.transport.send<{ payload: boolean }>(
            Actions.CMD_CHECK_LOCK_STATUS,
            ''
          );
          // Naming-only assumption (no positive-case fixture to confirm
          // against) — `checkDeviceLockStatus`'s own name is the only
          // evidence `true` means locked; verify against real hardware.
          return success({ locked: response.payload });
        }
        case 'getAppConfig': {
          const config = await this._readAppConfig(session.transport);
          return success(config);
        }
        default:
          return {
            success: false,
            error: serializeConnectorError(
              createHwkError({
                code: HardwareErrorCode.MethodNotSupported,
                message: `Unknown Keystone USB connector method: ${method}`,
              })
            ),
          };
      }
    } catch (err) {
      return { success: false, error: serializeConnectorError(mapKeystoneUsbError(err)) };
    }
  }

  // No protocol-level cancel exists over USB (verified: nothing in the SDK's
  // public surface can interrupt an in-flight transferIn/transferOut) — the
  // best this connector can do is stop waiting on its side; the underlying
  // `send()` promise still settles (or times out) on its own.
  cancel(_sessionId: string): Promise<void> {
    return Promise.resolve();
  }

  // Keystone USB never relays PIN/passphrase through the host — entry always
  // happens on the device's own touchscreen — so there is nothing to answer.
  uiResponse(_response: UiResponseEvent): void {}

  on<K extends ConnectorEventType>(event: K, handler: (data: ConnectorEventMap[K]) => void): void {
    this.emitter.on(event, handler);
  }

  off<K extends ConnectorEventType>(event: K, handler: (data: ConnectorEventMap[K]) => void): void {
    this.emitter.off(event, handler);
  }

  reset(): void {
    for (const session of this.sessions.values()) {
      session.dispose();
    }
    this.sessions.clear();
    this._invalidateDiscoverySnapshot();
    this._invalidateAvailabilitySnapshot();
    this.publicDataConfirmedWallets.clear();
  }

  private async _readAppConfig(
    transport: TransportHID
  ): Promise<{ version?: string; mfp?: string }> {
    const response = await transport.send<Record<string, unknown>>(
      Actions.CMD_GET_DEVICE_VERSION,
      ''
    );
    const rawMasterFingerprint = response.walletMFP;
    const masterFingerprint = parseBip32MasterFingerprint(rawMasterFingerprint);
    if (rawMasterFingerprint !== undefined && !masterFingerprint) {
      throw createHwkError({
        code: HardwareErrorCode.DeviceMismatch,
        message:
          'Keystone returned an invalid master fingerprint; expected exactly 4 bytes (8 hex characters)',
      });
    }
    return {
      version: typeof response.firmwareVersion === 'string' ? response.firmwareVersion : undefined,
      mfp: masterFingerprint,
    };
  }

  private _toDeviceInfo(
    device: ConnectorDevice,
    firmwareVersion?: string,
    masterFingerprint?: string
  ) {
    return {
      vendor: 'keystone' as const,
      // The device publishes its model as a USB string descriptor
      // (`productName`, e.g. "Keystone 3 Pro"); `device.model` carries it here.
      // Empty rather than a literal 'unknown' when it says nothing, so the
      // host's own default-name fallback can win instead of a fake model
      // reaching the UI and the persisted device settings.
      model: device.model ?? '',
      modelName: device.modelName,
      firmwareVersion: firmwareVersion ?? '0.0.0',
      deviceId: device.deviceId,
      connectId: device.connectId,
      connectionType: 'usb' as const,
      serialNumber: device.serialNumber,
      capabilities: { persistentDeviceIdentity: false },
      raw: { masterFingerprint },
    };
  }
}
