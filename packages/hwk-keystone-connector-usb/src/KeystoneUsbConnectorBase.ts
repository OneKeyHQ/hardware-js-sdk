import { UR, URDecoder, UREncoder } from '@ngraveio/bc-ur';
import { Actions } from '@keystonehq/hw-transport-usb';
import {
  EConnectorInteraction,
  HardwareErrorCode,
  TypedEventEmitter,
  createHwkError,
  serializeConnectorError,
  success,
} from '@onekeyfe/hwk-adapter-core';

import { mapKeystoneUsbError } from './errors';

import type {
  ConnectorCallResult,
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
export interface KeystoneUsbTransportStatic {
  connect(config?: TransportConfig): Promise<TransportHID>;
  getKeystoneDevices(): Promise<ReadonlyArray<{ serialNumber?: string; productName?: string }>>;
  requestPermission?(): Promise<void>;
  isSupported(): Promise<boolean>;
}

interface KeystoneUr {
  urType: string;
  urData: string;
}

interface UsbSession {
  transport: TransportHID;
  mfp?: string;
}

const DEFAULT_TIMEOUT_MS = 100_000; // SDK's own raw default is 15s ("may need users' action on the device") — too short for real confirmation.

function toUrEncoded(ur: KeystoneUr): string {
  return new UREncoder(new UR(Buffer.from(ur.urData, 'hex'), ur.urType), Infinity)
    .nextPart()
    .toUpperCase();
}

function fromUrEncoded(encoded: string): KeystoneUr {
  const decoder = new URDecoder();
  decoder.receivePart(encoded);
  if (!decoder.isComplete() || !decoder.isSuccess()) {
    throw new Error('Keystone USB response is not a complete, valid UR');
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

  constructor(transportClass: KeystoneUsbTransportStatic, options?: { timeoutMs?: number }) {
    this.transportClass = transportClass;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async searchDevices(_options?: ConnectorSearchDevicesOptions): Promise<ConnectorDevice[]> {
    const devices = await this.transportClass.getKeystoneDevices();
    // No mfp available without opening+claiming the device (a real I/O cost
    // just to enumerate) — connectId is a placeholder until connect()
    // resolves the real identity. There is also no reliable way to target
    // one of several already-connected Keystones by id: the underlying SDK's
    // own connect() re-scans and picks for itself (WebUSB re-prompts the
    // picker when more than one device already has permission; Node USB just
    // takes the first match) — a real limitation of the vendor SDK, not
    // something this connector can route around.
    return devices.map((device, index) => ({
      connectId: `keystone-usb:${device.serialNumber ?? index}`,
      deviceId: '',
      name: device.productName ?? 'Keystone',
      connectionType: 'usb',
      capabilities: { persistentDeviceIdentity: true },
    }));
  }

  async connect(deviceId?: string): Promise<ConnectorSession> {
    this.emitter.emit('ui-event', {
      type: EConnectorInteraction.Searching,
      payload: { sessionId: '' },
    });
    const transport = await this.transportClass.connect({ timeout: this.timeoutMs });
    try {
      const config = await this._readAppConfig(transport);
      if (deviceId && config.mfp && config.mfp.toLowerCase() !== deviceId.toLowerCase()) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceMismatch,
          message: `Connected Keystone wallet (mfp ${config.mfp}) does not match the requested device (${deviceId})`,
        });
      }
      const sessionId = config.mfp || 'keystone-usb';
      this.sessions.set(sessionId, { transport, mfp: config.mfp });
      const device: ConnectorDevice = {
        connectId: sessionId,
        deviceId: config.mfp ?? '',
        name: 'Keystone',
        connectionType: 'usb',
        capabilities: { persistentDeviceIdentity: true },
      };
      this.emitter.emit('device-connect', { device });
      return { sessionId, deviceInfo: this._toDeviceInfo(device, config.version) };
    } catch (err) {
      throw mapKeystoneUsbError(err);
    }
  }

  disconnect(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    if (session) {
      // No persistent claim to release (see class doc) — nothing to await
      // here beyond letting the underlying transport's own per-call close
      // run its course, which already happened on the last send().
      this.emitter.emit('device-disconnect', { connectId: sessionId });
    }
    return Promise.resolve();
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
          const response = await session.transport.send<{ payload: string }>(
            Actions.CMD_RESOLVE_UR,
            encoded
          );
          return success(fromUrEncoded(response.payload));
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
    this.sessions.clear();
  }

  private async _readAppConfig(
    transport: TransportHID
  ): Promise<{ version?: string; mfp?: string }> {
    const response = await transport.send<Record<string, unknown>>(
      Actions.CMD_GET_DEVICE_VERSION,
      ''
    );
    return {
      version: typeof response.firmwareVersion === 'string' ? response.firmwareVersion : undefined,
      mfp: typeof response.walletMFP === 'string' ? response.walletMFP.toLowerCase() : undefined,
    };
  }

  private _toDeviceInfo(device: ConnectorDevice, firmwareVersion?: string) {
    return {
      vendor: 'keystone' as const,
      model: 'unknown',
      firmwareVersion: firmwareVersion ?? '0.0.0',
      deviceId: device.deviceId,
      connectId: device.connectId,
      connectionType: 'usb' as const,
      capabilities: { persistentDeviceIdentity: true },
    };
  }
}
