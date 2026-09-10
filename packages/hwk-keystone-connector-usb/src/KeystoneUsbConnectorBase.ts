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
 * The static surface both `TransportWebUSB` and `TransportNodeUSB` expose
 * (verified against their real `.d.ts`/`.js` — both implement `TransportHID`
 * identically, differing only in how they enumerate/open the underlying
 * device). Parametrizing on this instead of importing either transport
 * package directly is what lets `KeystoneUsbConnectorBase` stay
 * platform-agnostic; `_subpath/webusb.ts` and `_subpath/nodeusb.ts` are the
 * only files that actually import a concrete transport.
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

interface KeystoneUsbRuntimeDevice extends KeystoneUsbDeviceDescriptor {
  configuration?: unknown;
  opened?: boolean;
}

interface KeystoneUsbRuntimeTransport {
  device?: KeystoneUsbRuntimeDevice;
}

interface KeystoneUsbTransportDebugState {
  enumeratedCount?: number;
  hasSessionDevice: boolean;
  sessionDevicePresent?: boolean;
  sessionDeviceOpened?: boolean;
  sessionDeviceConfigured?: boolean;
  enumerationFailed?: boolean;
  enumerationErrorName?: string;
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

const KEYSTONE_USB_DEBUG_PREFIX = '[KEYSTONE-USB-DEBUG]';
const KEYSTONE_PUBLIC_DATA_UR_TYPE = 'qr-hardware-call';
const KEYSTONE_USB_DEBUG_ENABLED = process.env.NODE_ENV !== 'production';

function stringifyKeystoneUsbDebugValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({
      stringifyError: error instanceof Error ? error.message : String(error),
    });
  }
}

function debugKeystoneUsb(label: string, value?: unknown): void {
  if (!KEYSTONE_USB_DEBUG_ENABLED) return;
  const valueText = value === undefined ? '' : ` ${stringifyKeystoneUsbDebugValue(value)}`;
  // eslint-disable-next-line no-console
  console.log(`${KEYSTONE_USB_DEBUG_PREFIX} sdk-connector trace-v1 ${label}${valueText}`);
}

let usbDebugSequence = 0;

async function traceUsbWait<T>(label: string, task: () => Promise<T>): Promise<T> {
  if (!KEYSTONE_USB_DEBUG_ENABLED) return task();
  const operation = ++usbDebugSequence;
  const started = Date.now();
  const state = () => ({ operation, elapsedMs: Date.now() - started });
  debugKeystoneUsb(`${label}-start`, state());
  // Observe pending work without cancelling or changing transport timeouts.
  const timer = setInterval(() => debugKeystoneUsb(`${label}-pending`, state()), 5000);
  try {
    const result = await task();
    debugKeystoneUsb(`${label}-complete`, state());
    return result;
  } catch (error) {
    debugKeystoneUsb(`${label}-failed`, {
      ...state(),
      errorName: error instanceof Error ? error.name : typeof error,
    });
    throw error;
  } finally {
    clearInterval(timer);
  }
}

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
 * `IConnector` implementation for Keystone over USB. Every `TransportHID`
 * call the underlying SDK exposes is its own self-contained
 * open→claim→transfer→release→close cycle (verified in `TransportWebUSB`/
 * `TransportNodeUSB` source — there is no persistent USB claim to hold
 * across calls), so `connect()` just resolves one `TransportHID` instance
 * and caches it; each `call()` reuses that same JS object, and the
 * underlying SDK's own per-command open/close still happens on every send.
 *
 * USB carries the exact same UR payloads the QR channel does — `call()`'s
 * `'resolveUr'` method is a generic `{urType, urData}` (hex CBOR, matching
 * `hwk-keystone-adapter`'s `KeystoneUr` shape) in, `{urType, urData}` out.
 * The caller (a future dual-channel `KeystoneAdapter`) can build the UR once
 * via the same `KeystoneUrEngine` used for QR and send it down either
 * channel — this connector has no chain-specific knowledge at all.
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
  private publicDataConfirmationShown = false;

  constructor(transportClass: KeystoneUsbTransportStatic, options?: { timeoutMs?: number }) {
    this.transportClass = transportClass;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    debugKeystoneUsb('runtime-ready', { timeoutMs: this.timeoutMs });
  }

  private _invalidateDiscoverySnapshot(): void {
    this.activeDiscoveryGeneration = undefined;
    this.discoveredDevices.clear();
  }

  private _invalidateAvailabilitySnapshot(): void {
    this.activeAvailabilityGeneration = undefined;
    this.availabilityDevices.clear();
  }

  /**
   * Capture object-lifetime facts without exposing USB serials or wallet data.
   * A device can remain physically connected while WebUSB replaces the
   * `USBDevice` object after re-enumeration; in that case enumeration succeeds
   * but the transport cached in this session points at a stale object.
   */
  private async _getTransportDebugState(
    transport: TransportHID
  ): Promise<KeystoneUsbTransportDebugState | undefined> {
    if (!KEYSTONE_USB_DEBUG_ENABLED) return undefined;

    const sessionDevice = (transport as unknown as KeystoneUsbRuntimeTransport).device;
    const sessionDeviceOpened =
      typeof sessionDevice?.opened === 'boolean' ? sessionDevice.opened : undefined;
    const sessionDeviceConfigured = sessionDevice ? sessionDevice.configuration != null : undefined;
    try {
      const enumeratedDevices = await this.transportClass.getKeystoneDevices();
      return {
        enumeratedCount: enumeratedDevices.length,
        hasSessionDevice: Boolean(sessionDevice),
        sessionDevicePresent: sessionDevice
          ? enumeratedDevices.some(device => device === sessionDevice)
          : undefined,
        sessionDeviceOpened,
        sessionDeviceConfigured,
      };
    } catch (error) {
      return {
        hasSessionDevice: Boolean(sessionDevice),
        sessionDeviceOpened,
        sessionDeviceConfigured,
        enumerationFailed: true,
        enumerationErrorName: error instanceof Error ? error.name : typeof error,
      };
    }
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
    const devices = await traceUsbWait('search-enumerate', () =>
      this.transportClass.getKeystoneDevices()
    );
    debugKeystoneUsb('search-result', { count: devices.length, isAvailabilitySearch });
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
    debugKeystoneUsb('connect-target-kind', { kind: target.type });
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
    debugKeystoneUsb('connect-start', {
      hasSearchTargetId: Boolean(searchTargetId),
      hasExpectedMasterFingerprint: Boolean(expectedMasterFingerprint),
    });
    this.emitter.emit('ui-event', {
      type: EConnectorInteraction.Searching,
      payload: { sessionId: '' },
    });
    let selectedDevice = searchTargetId
      ? this.discoveredDevices.get(searchTargetId) ?? this.availabilityDevices.get(searchTargetId)
      : undefined;
    if (searchTargetId && !selectedDevice) {
      debugKeystoneUsb('connect-target-rejected', { reason: 'descriptor-snapshot-expired' });
      throw createHwkError({
        code: HardwareErrorCode.DeviceNotFound,
        message: `Keystone USB search target is no longer available: ${searchTargetId}`,
        recovery: { scope: 'search-target' },
      });
    }
    let openedTransport: OpenedUsbTransport | undefined;
    debugKeystoneUsb('connect-device-selection', {
      descriptorFound: Boolean(selectedDevice),
      supportsExactDevice: typeof this.transportClass.connectDevice === 'function',
      matchExpectedFingerprint: Boolean(expectedMasterFingerprint),
    });
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
      debugKeystoneUsb('connect-transport-created');
      debugKeystoneUsb('connect-app-config-read', {
        hasMasterFingerprint: Boolean(config.mfp),
        hasFirmwareVersion: Boolean(config.version),
      });
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
      debugKeystoneUsb('connect-complete');
      return {
        sessionId,
        deviceInfo: this._toDeviceInfo(device, config.version, config.mfp),
      };
    } catch (err) {
      openedTransport?.dispose();
      const errorShape = err as {
        code?: unknown;
        message?: unknown;
        stack?: unknown;
        transportErrorCode?: unknown;
        name?: unknown;
      };
      debugKeystoneUsb('connect-failed', {
        name: errorShape?.name,
        code: errorShape?.code,
        transportErrorCode: errorShape?.transportErrorCode,
      });
      throw mapKeystoneUsbError(err);
    }
  }

  private async _openTransport(device?: KeystoneUsbDeviceDescriptor): Promise<OpenedUsbTransport> {
    // A rejected candidate can keep its USB disconnect listener. Give every
    // descriptor a separate holder so it cannot retire a later matched session.
    let connectedSessionId: string | undefined;
    const transportConfig: TransportConfig = {
      timeout: this.timeoutMs,
      disconnectListener: () => {
        debugKeystoneUsb('transport-disconnect-event', {
          sessionEstablished: Boolean(connectedSessionId),
        });
        return connectedSessionId ? this.disconnect(connectedSessionId) : undefined;
      },
    };
    const transport = await traceUsbWait('transport-open', () =>
      device && this.transportClass.connectDevice
        ? this.transportClass.connectDevice(device, transportConfig)
        : this.transportClass.connect(transportConfig)
    );
    let disposed = false;
    return {
      transport,
      bindSessionId(sessionId: string) {
        connectedSessionId = sessionId;
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        debugKeystoneUsb('transport-dispose-start');
        this.transportClass.disposeTransport?.(transport);
        debugKeystoneUsb('transport-dispose-complete');
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
    debugKeystoneUsb('session-disconnect', {
      sessionFound: Boolean(session),
      remainingSessionCount: this.sessions.size,
    });
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
    debugKeystoneUsb('resolve-send-start');
    const response = await traceUsbWait('resolve-send', () =>
      transport.send<{ payload: string }>(Actions.CMD_RESOLVE_UR, encodedUr)
    );
    const text = typeof response.payload === 'string' ? response.payload.trim() : '';
    const firstPart = text.split(/\s+/).find(Boolean);
    let urType: string | undefined;
    let sequenceNumber: number | undefined;
    let sequenceLength: number | undefined;
    if (firstPart) {
      try {
        const [type, components] = URDecoder.parse(firstPart);
        urType = type;
        if (components.length === 2) {
          [sequenceNumber, sequenceLength] = URDecoder.parseSequenceComponent(components[0]);
        }
      } catch {
        // The decoder below owns validation; this block only produces safe diagnostics.
      }
    }
    debugKeystoneUsb('resolve-response-received', {
      payloadLength: text.length,
      payloadPartCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
      urType,
      sequenceNumber,
      sequenceLength,
    });
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
          debugKeystoneUsb('resolve-call-start');
          const { urType, urData } = params as KeystoneUr;
          const encoded = toUrEncoded({ urType, urData });
          const isPublicDataRequest = urType === KEYSTONE_PUBLIC_DATA_UR_TYPE;
          const shouldShowConfirmation = !isPublicDataRequest || !this.publicDataConfirmationShown;
          if (shouldShowConfirmation) {
            this.emitter.emit('ui-event', {
              type: EConnectorInteraction.ConfirmOnDevice,
              payload: { sessionId },
            });
          }
          try {
            debugKeystoneUsb(
              'resolve-transport-before',
              await traceUsbWait('resolve-state-before', () =>
                this._getTransportDebugState(session.transport)
              )
            );
            const response = await this._sendResolveUr(session.transport, encoded);
            debugKeystoneUsb(
              'resolve-transport-after',
              await traceUsbWait('resolve-state-after', () =>
                this._getTransportDebugState(session.transport)
              )
            );
            if (isPublicDataRequest) {
              this.publicDataConfirmationShown = true;
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
      const errorShape = err as {
        code?: unknown;
        message?: unknown;
        stack?: unknown;
        transportErrorCode?: unknown;
        name?: unknown;
      };
      debugKeystoneUsb('call-failed', {
        method,
        name: errorShape?.name,
        code: errorShape?.code,
        transportErrorCode: errorShape?.transportErrorCode,
        transportState: await traceUsbWait('error-state', () =>
          this._getTransportDebugState(session.transport)
        ),
      });
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
    this.publicDataConfirmationShown = false;
  }

  private async _readAppConfig(
    transport: TransportHID
  ): Promise<{ version?: string; mfp?: string }> {
    const response = await traceUsbWait('device-version-send', () =>
      transport.send<Record<string, unknown>>(Actions.CMD_GET_DEVICE_VERSION, '')
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
