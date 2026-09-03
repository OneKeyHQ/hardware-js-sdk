import transport, {
  PROTOCOL_V1_MESSAGE_HEADER_SIZE,
  PROTOCOL_V2_BLE_FRAME_MAX_BYTES,
  PROTOCOL_V2_CHANNEL_BLE_UART,
  ProtocolV2FrameAssembler,
  ProtocolV2LinkManager,
  TRANSPORT_EVENT,
  bytesToHex,
  detectProtocolV2LinkDisabledError,
  hexToBytes,
  isProtocolV2LinkDisabledError,
  probeProtocolV2 as probeProtocolV2Helper,
  writeProtocolV2BleFrame,
} from '@onekeyfe/hd-transport';
import {
  EBleDisconnectReason,
  ERRORS,
  HardwareErrorCode,
  HardwareErrorCodeMessage,
  createDeferred,
  isBleStaleBondErrorText,
  isBleStaleBondHardwareError,
  isHeaderChunk,
} from '@onekeyfe/hd-shared';

import { resolveBlePacketCapacity } from './ble-packet-capacity';

import type { Deferred } from '@onekeyfe/hd-shared';
import type { DesktopAPI } from '@onekeyfe/hd-transport-electron';
import type {
  OneKeyDeviceInfo,
  ProtocolType,
  ProtocolV2CallContext,
  TransportCallOptions,
} from '@onekeyfe/hd-transport';
import type EventEmitter from 'events';

const { parseConfigure, ProtocolV1, check } = transport;

declare global {
  interface Window {
    desktopApi?: DesktopAPI;
  }
}

export type BleAcquireInput = {
  uuid: string;
  forceCleanRunPromise?: boolean;
  expectedProtocol?: ProtocolType;
  protocolHint?: ProtocolType;
};

interface PacketProcessResult {
  isComplete: boolean;
  completePacket?: string;
  error?: string;
}

const toBleDescriptor = (
  device: { id: string; name: string | null },
  protocolType?: ProtocolType
): OneKeyDeviceInfo =>
  ({
    id: device.id,
    name: device.name,
    path: device.id,
    debug: false,
    commType: 'electron-ble',
    ...(protocolType ? { protocolType } : {}),
  } as OneKeyDeviceInfo);

const BLE_PACKET_SIZE_FALLBACK = 192;
const BLE_PACKET_SIZE_MAXIMUM = 244;
const BLE_WRITE_DELAY_MS = 5;
const PROTOCOL_PROBE_TIMEOUT_MS = 3000;
const PROTOCOL_V2_PROBE_TIMEOUT_MS = 5000;

/**
 * Desktop Electron BLE transport with automatic Protocol V1/V2 detection.
 *
 * Protocol V1 devices continue using chunked packets. Protocol V2 is detected
 * after a Protocol V1 GetFeatures timeout by probing Protocol V2 Ping.
 */
export default class ElectronBleTransport {
  private _messages: ReturnType<typeof transport.parseConfigure> | undefined;

  private _messagesV2: ReturnType<typeof transport.parseConfigure> | undefined;

  private protocolV2SchemaConfiguration: string | undefined;

  name = 'ElectronBleTransport';

  configured = false;

  runPromise: Deferred<Uint8Array | string> | null = null;

  private runPromiseDeviceId: string | null = null;

  Log?: any;

  emitter?: EventEmitter;

  private connectedDevices: Set<string> = new Set();

  private deviceProtocol: Map<string, ProtocolType> = new Map();

  private deviceProtocolHints: Map<string, ProtocolType> = new Map();

  /** Endpoints that answered a V2 probe in this transport lifetime. Survives disconnect. */
  private confirmedProtocolV2 = new Set<string>();

  private deviceMtus: Map<string, number> = new Map();

  private devicePacketCapacities: Map<string, number> = new Map();

  private v1Buffers: Map<string, { buffer: number[]; bufferLength: number }> = new Map();

  private v2Assemblers: Map<string, ProtocolV2FrameAssembler> = new Map();

  private v2FrameQueues: Map<string, Uint8Array[]> = new Map();

  private v2FramePromises: Map<string, Deferred<Uint8Array>> = new Map();

  private protocolV2Links = new ProtocolV2LinkManager<string>({
    getSchemas: () => {
      if (!this._messages || !this._messagesV2) {
        throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
      }
      return {
        protocolV1: this._messages,
        protocolV2: this._messagesV2,
      };
    },
    classifyError: () => 'link-fatal',
    onLinkInvalidated: async (uuid, reason) => {
      this.v2Assemblers.get(uuid)?.reset();
      this.rejectProtocolV2Frames(uuid, new Error(reason));
      this.Log?.debug('[Electron BLE] Protocol V2 link invalidated:', uuid, reason);
      if (reason.startsWith('Protocol V2 link-fatal error:')) {
        await this.releaseNative(uuid);
      }
    },
  });

  /** One-shot guard so a missing preload `release` bridge is reported once. */
  private warnedMissingRelease = false;

  private notificationCleanups: Map<string, () => void> = new Map();

  private mtuCleanups: Map<string, () => void> = new Map();

  /**
   * Transport-lifetime subscription to host BLE disconnects.
   *
   * This must NOT be scoped to acquire()/release(): a logical release keeps the
   * native link alive for the keep-alive window, so a device that drops while
   * idle would otherwise go unobserved and consumers would never learn it left
   * (OK-60486).
   */
  private hostDisconnectCleanup?: () => void;

  private notificationTokens: Map<string, number> = new Map();

  private nextNotificationToken = 1;

  private toStaleBondError(error: unknown): Error | null {
    if (isBleStaleBondHardwareError(error)) {
      return error as Error;
    }
    const errorMessage =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : String(error ?? '');
    if (!isBleStaleBondErrorText(errorMessage)) {
      return null;
    }
    const normalizedErrorMessage = errorMessage.toLowerCase();
    if (
      normalizedErrorMessage.includes('cberrordomain:14') ||
      normalizedErrorMessage.includes('cbatterrordomain:14')
    ) {
      return ERRORS.TypedError(HardwareErrorCode.BleBondInvalid, undefined, {
        nativeErrorMessage: errorMessage,
      });
    }
    return ERRORS.TypedError(
      normalizedErrorMessage.includes('peer removed pairing information')
        ? HardwareErrorCode.BlePeerRemovedPairingInformation
        : HardwareErrorCode.BleDeviceBondError,
      errorMessage
    );
  }

  private handleBluetoothError(error: any, mapProtocolV2StaleBond = false): never {
    if (mapProtocolV2StaleBond) {
      const staleBondError = this.toStaleBondError(error);
      if (staleBondError) {
        throw staleBondError;
      }
    }
    if (error && typeof error === 'object') {
      if ('code' in error) {
        if (error.code === HardwareErrorCode.BlePoweredOff) {
          throw ERRORS.TypedError(HardwareErrorCode.BlePoweredOff);
        }
        if (error.code === HardwareErrorCode.BleUnsupported) {
          throw ERRORS.TypedError(HardwareErrorCode.BleUnsupported);
        }
        if (error.code === HardwareErrorCode.BlePermissionError) {
          throw ERRORS.TypedError(HardwareErrorCode.BlePermissionError);
        }
      }
      const errorMessage = error.message || String(error);
      const poweredOffMessage = HardwareErrorCodeMessage[HardwareErrorCode.BlePoweredOff];
      const unsupportedMessage = HardwareErrorCodeMessage[HardwareErrorCode.BleUnsupported];
      const permissionMessage = HardwareErrorCodeMessage[HardwareErrorCode.BlePermissionError];

      if (errorMessage.includes(poweredOffMessage) || errorMessage.includes('poweredOff')) {
        throw ERRORS.TypedError(HardwareErrorCode.BlePoweredOff);
      }
      if (errorMessage.includes(unsupportedMessage) || errorMessage.includes('unsupported')) {
        throw ERRORS.TypedError(HardwareErrorCode.BleUnsupported);
      }
      if (errorMessage.includes(permissionMessage) || errorMessage.includes('unauthorized')) {
        throw ERRORS.TypedError(HardwareErrorCode.BlePermissionError);
      }
    }
    throw error;
  }

  private cleanupDeviceState(deviceId: string): void {
    this.protocolV2Links
      .invalidateLink(deviceId, 'Electron BLE device state cleaned')
      .catch(error => this.Log?.debug('[Electron BLE] link cleanup failed:', error));
    this.connectedDevices.delete(deviceId);
    this.deviceProtocol.delete(deviceId);
    this.deviceMtus.delete(deviceId);
    this.devicePacketCapacities.delete(deviceId);
    // Keep deviceProtocolHints — it's inferred from device name (e.g. "Pro 2" → V2)
    // and doesn't depend on connection state. Preserving it avoids redundant V1 probe on reconnect.
    this.v1Buffers.delete(deviceId);
    this.v2Assemblers.delete(deviceId);
    this.resetProtocolV2Frames(deviceId);
    this.notificationTokens.delete(deviceId);
    if (this.runPromise && this.runPromiseDeviceId === deviceId) {
      this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleDeviceDisconnected));
      this.runPromise = null;
      this.runPromiseDeviceId = null;
    }

    const notifyCleanup = this.notificationCleanups.get(deviceId);
    if (notifyCleanup) {
      notifyCleanup();
      this.notificationCleanups.delete(deviceId);
    }

    const mtuCleanup = this.mtuCleanups.get(deviceId);
    if (mtuCleanup) {
      mtuCleanup();
      this.mtuCleanups.delete(deviceId);
    }
  }

  init(logger: any, emitter?: EventEmitter) {
    this.Log = logger;
    this.emitter = emitter;

    if (!window.desktopApi?.nobleBle) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Noble BLE API is not available. Please ensure you are running in Electron with Noble support.'
      );
    }

    this.subscribeHostDisconnects();

    this.Log?.debug('[Electron BLE] Transport initialized');
  }

  /**
   * One host subscription for the whole transport lifetime. init() can run
   * again after an SDK reset, so drop the previous listener first rather than
   * stacking duplicates.
   */
  private subscribeHostDisconnects() {
    this.hostDisconnectCleanup?.();
    this.hostDisconnectCleanup = window.desktopApi?.nobleBle?.onDeviceDisconnected(
      (disconnectedDevice: { id: string; name: string; reason?: EBleDisconnectReason }) => {
        const uuid = disconnectedDevice?.id;
        if (!uuid) return;

        // The link is gone, so renderer-side state must go with it; the next
        // acquire reconnects from scratch.
        this.cleanupDeviceState(uuid);

        // Every link drop is reported, including the main process reclaiming
        // an idle link on its keep-alive timer: consumers track whether a BLE
        // link is live, not whether the peripheral is theoretically in range,
        // and a link we closed ourselves is still a closed link. Nothing
        // reconnects on its own, so this settles once until the user acts.
        // `reason` is carried for diagnostics only — behaviour is uniform.
        this.Log?.debug(
          '[Electron BLE] Device link dropped:',
          uuid,
          disconnectedDevice.reason ?? EBleDisconnectReason.DeviceDisconnected
        );

        this.emitter?.emit(TRANSPORT_EVENT.DEVICE_DISCONNECT, {
          name: disconnectedDevice.name,
          id: uuid,
          connectId: uuid,
        });
      }
    );
  }

  configure(signedData: any) {
    this._messages = parseConfigure(signedData);
    this.configured = true;
  }

  configureProtocolV2(signedData: any) {
    const configuration = typeof signedData === 'string' ? signedData : JSON.stringify(signedData);
    if (this.protocolV2SchemaConfiguration === configuration) {
      return;
    }

    const isReconfiguration = this.protocolV2SchemaConfiguration !== undefined;
    this._messagesV2 = parseConfigure(signedData);
    this.protocolV2SchemaConfiguration = configuration;
    if (isReconfiguration) {
      this.protocolV2Links
        .invalidateAllLinks('Protocol V2 schema reconfigured')
        .catch(error => this.Log?.debug('[Electron BLE] schema link cleanup failed:', error));
    }
  }

  async listen() {
    return this.enumerate();
  }

  async enumerate(): Promise<OneKeyDeviceInfo[]> {
    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE API not available');
      }
      const devices = await window.desktopApi.nobleBle.enumerate();
      this.Log?.debug(`[Electron BLE] enumerate found ${devices.length} device(s):`);
      for (const dev of devices) {
        this.Log?.debug(`[Electron BLE]   id="${dev.id}" name="${dev.name}"`);
      }
      return devices.map(device => toBleDescriptor(device));
    } catch (error) {
      this.Log?.error('[Electron BLE] enumerate failed:', error);
      this.handleBluetoothError(error);
    }
  }

  async acquire(input: BleAcquireInput) {
    const { uuid, forceCleanRunPromise, expectedProtocol } = input;
    const shouldMapProtocolV2StaleBond = expectedProtocol
      ? expectedProtocol === 'V2'
      : this.confirmedProtocolV2.has(uuid);

    if (!uuid) {
      throw ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);
    }

    if (this.connectedDevices.has(uuid)) {
      await this.release(uuid);
    }

    if (forceCleanRunPromise && this.runPromise) {
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.runPromise = null;
      this.runPromiseDeviceId = null;
    }

    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE API not available');
      }

      const device = await window.desktopApi.nobleBle.getDevice(uuid);
      if (!device) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, `Device ${uuid} not found`);
      }
      const protocolHint = expectedProtocol
        ? undefined
        : input.protocolHint ?? this.deviceProtocolHints.get(uuid);
      if (protocolHint) {
        this.deviceProtocolHints.set(uuid, protocolHint);
      }

      try {
        await window.desktopApi.nobleBle.connect(uuid);
        this.connectedDevices.add(uuid);
      } catch (error) {
        this.handleBluetoothError(error, shouldMapProtocolV2StaleBond);
      }

      const mtuCleanup = this.createMtuSubscription(uuid);
      if (mtuCleanup) {
        this.mtuCleanups.set(uuid, mtuCleanup);
      }

      this.v1Buffers.set(uuid, { buffer: [], bufferLength: 0 });
      this.v2Assemblers.set(uuid, new ProtocolV2FrameAssembler(PROTOCOL_V2_BLE_FRAME_MAX_BYTES));

      try {
        await window.desktopApi.nobleBle.subscribe(uuid);
      } catch (error) {
        this.handleBluetoothError(error, shouldMapProtocolV2StaleBond);
      }
      await this.refreshBlePacketCapacity(uuid);

      const cleanup = this.createNotificationSubscription(uuid);
      this.notificationCleanups.set(uuid, cleanup);

      const protocolType = await this.detectProtocol(uuid, expectedProtocol, protocolHint);
      if (protocolType === 'V2') {
        this.Log?.debug('[Electron BLE] Protocol V2 write configured', {
          writeMode: 'withoutResponse',
          negotiatedMtu: this.deviceMtus.get(uuid),
          packetCapacity: this.devicePacketCapacities.get(uuid) ?? BLE_PACKET_SIZE_FALLBACK,
        });
      }

      return {
        ...toBleDescriptor({ id: device.id, name: device.name }, protocolType),
        uuid,
      };
    } catch (error) {
      this.Log?.error('[Electron BLE] acquire failed:', error);
      try {
        if (window.desktopApi?.nobleBle && this.connectedDevices.has(uuid)) {
          await window.desktopApi.nobleBle.unsubscribe(uuid);
          await window.desktopApi.nobleBle.disconnect(uuid);
        }
      } catch (cleanupError) {
        this.Log?.debug('[Electron BLE] acquire cleanup failed:', cleanupError);
      }
      this.cleanupDeviceState(uuid);
      throw error;
    }
  }

  async release(id: string, _onclose?: boolean, keepSession?: boolean) {
    try {
      await this.protocolV2Links.invalidateLink(id, 'Electron BLE transport released');
      await this.releaseLogical(id, keepSession);
    } catch (error) {
      this.Log?.error('[Electron BLE] release failed:', error);
      this.cleanupDeviceState(id);
    }
  }

  // DeviceConnector.disconnect feature-detects this; without it REQUIRE_DISCONNECT
  // recovery is a no-op and keep-alive hands the wedged link to every retry.
  async disconnect(id: string) {
    return this.releaseNative(id);
  }

  // Hard teardown, error paths only: a link presumed dead must not be reused.
  private async releaseNative(id: string) {
    try {
      if (this.connectedDevices.has(id)) {
        if (window.desktopApi?.nobleBle) {
          await window.desktopApi.nobleBle.unsubscribe(id);
          await window.desktopApi.nobleBle.disconnect(id);
        }
        this.cleanupDeviceState(id);
      }
    } catch (error) {
      this.Log?.error('[Electron BLE] release failed:', error);
      this.cleanupDeviceState(id);
    }
  }

  // Logical release: link and subscription stay up for the next call. Renderer
  // listeners are still torn down, or fresh ones would double-process packets.
  private async releaseLogical(id: string, keepSession?: boolean) {
    try {
      if (!this.connectedDevices.has(id)) return;
      this.cleanupDeviceState(id);

      const release = window.desktopApi?.nobleBle?.release;
      if (!release) {
        // Degraded, not broken: say it once, it just looks like a slow device.
        if (!this.warnedMissingRelease) {
          this.warnedMissingRelease = true;
          this.Log?.error(
            '[Electron BLE] desktopApi.nobleBle.release is missing from the preload bridge; ' +
              'keep-alive idle countdown will never start — map NOBLE_BLE_RELEASE in the desktop preload'
          );
        }
        return;
      }
      await release(id, keepSession);
    } catch (error) {
      this.Log?.error('[Electron BLE] logical release failed:', error);
      this.cleanupDeviceState(id);
    }
  }

  private createProtocolMismatchError(expected: ProtocolType, uuid: string) {
    // A generic Ping miss is not a bond failure. Only a later miss after this
    // endpoint already answered V2, or a native encryption/pairing error, is.
    const isStaleV2Bond = expected === 'V2' && this.confirmedProtocolV2.has(uuid);
    return ERRORS.TypedError(
      isStaleV2Bond ? HardwareErrorCode.BleDeviceBondError : HardwareErrorCode.RuntimeError,
      `Device protocol mismatch: expected ${expected}, but device did not respond to expected protocol`
    );
  }

  private createProtocolDetectionError() {
    return ERRORS.TypedError(
      HardwareErrorCode.BleTimeoutError,
      'Unable to detect BLE protocol: device did not respond to Protocol V1 GetFeatures or Protocol V2 Ping'
    );
  }

  private clearProbeProtocol(uuid: string, protocol: ProtocolType) {
    if (this.deviceProtocol.get(uuid) === protocol) {
      this.deviceProtocol.delete(uuid);
    }
  }

  private async detectProtocol(
    uuid: string,
    expectedProtocol?: ProtocolType,
    protocolHint?: ProtocolType
  ): Promise<ProtocolType> {
    // A declared V1 is taken at face value, as the React Native transport
    // already does on iOS: the caller reads the protocol off its own device
    // record, so probing re-asks a question that is already answered and adds a
    // round trip to every cold connect. It also fails in a way that costs the
    // session: a device whose protocol session has stalled ignores the probe
    // frame, and the timeout became a protocol-mismatch error that stopped Core
    // from ever sending Initialize — the one frame such a device still answers,
    // and how it gets revived. A declared V2 keeps probing, matching iOS, so a
    // USB-priority "link disabled" surfaces here rather than as an unmapped
    // error later. An undeclared protocol still goes through full detection.
    if (expectedProtocol === 'V1') {
      this.deviceProtocol.set(uuid, 'V1');
      this.Log?.debug(`[Electron BLE] detectProtocol: uuid=${uuid} -> V1 (expected, no probe)`);
      return 'V1';
    }

    if (expectedProtocol === 'V2') {
      if (await this.probeProtocolV2(uuid)) {
        this.deviceProtocol.set(uuid, 'V2');
        this.confirmedProtocolV2.add(uuid);
        this.Log?.debug(`[Electron BLE] detectProtocol: uuid=${uuid} -> V2 (expected)`);
        return 'V2';
      }
      throw this.createProtocolMismatchError(expectedProtocol, uuid);
    }

    // Protocol must be actively probed after connection. Name, PID, and descriptors only
    // influence probe order; a V2 hint probes V2 first and falls back to V1.
    const probeOrder: ProtocolType[] =
      protocolHint === 'V2' || this.deviceProtocol.get(uuid) === 'V2' ? ['V2', 'V1'] : ['V1', 'V2'];

    for (let i = 0; i < probeOrder.length; i += 1) {
      const protocol = probeOrder[i];
      if (i > 0) {
        // Keep the physical BLE link while switching probes. Reconnecting here can
        // summon a second OS pairing prompt for a device that is still onboarding.
        await this.resetProbeStateAfterProtocolProbe(uuid, probeOrder[i - 1]);
      }
      const detected =
        protocol === 'V1' ? await this.probeProtocolV1(uuid) : await this.probeProtocolV2(uuid);
      if (detected) {
        this.deviceProtocol.set(uuid, protocol);
        if (protocol === 'V2') {
          this.confirmedProtocolV2.add(uuid);
        }
        this.Log?.debug(`[Electron BLE] detectProtocol: uuid=${uuid} -> ${protocol}`);
        return protocol;
      }
    }

    this.deviceProtocol.delete(uuid);
    throw this.createProtocolDetectionError();
  }

  private createNotificationSubscription(uuid: string) {
    if (!window.desktopApi?.nobleBle) {
      throw new Error('Noble BLE API not available');
    }

    const notificationToken = this.nextNotificationToken;
    this.nextNotificationToken += 1;
    this.notificationTokens.set(uuid, notificationToken);

    return window.desktopApi.nobleBle.onNotification((deviceId: string, data: string) => {
      if (deviceId === uuid && this.notificationTokens.get(uuid) === notificationToken) {
        this.handleNotification(uuid, data);
      }
    });
  }

  private async resetProbeStateAfterProtocolProbe(uuid: string, protocol: ProtocolType) {
    await this.protocolV2Links.invalidateLink(
      uuid,
      `Reset notify state after Protocol ${protocol} probe`
    );
    this.v1Buffers.set(uuid, { buffer: [], bufferLength: 0 });
    this.v2Assemblers.get(uuid)?.reset();
    this.resetProtocolV2Frames(uuid);
    if (this.runPromise && this.runPromiseDeviceId === uuid) {
      const error = ERRORS.TypedError(HardwareErrorCode.BleForceCleanRunPromise);
      this.runPromise.reject(error);
      this.runPromise = null;
      this.runPromiseDeviceId = null;
    }

    // A timed-out V1 probe retires its renderer notification token so a late V1
    // response cannot satisfy the V2 probe. Install a fresh listener without
    // touching the native GATT subscription or physical connection.
    if (!this.notificationCleanups.has(uuid)) {
      const cleanup = this.createNotificationSubscription(uuid);
      this.notificationCleanups.set(uuid, cleanup);
    }
  }

  private async probeProtocolV1(uuid: string) {
    if (!this._messages) {
      return false;
    }

    try {
      this.deviceProtocol.set(uuid, 'V1');
      // GetFeatures identifies Protocol V1 without resetting an existing wallet
      // session before Core has a chance to restore a hidden wallet.
      await this.callProtocolV1(uuid, 'GetFeatures', {}, { timeoutMs: PROTOCOL_PROBE_TIMEOUT_MS });
      return true;
    } catch (error) {
      this.clearProbeProtocol(uuid, 'V1');
      this.Log?.debug('[Electron BLE] Protocol V1 GetFeatures probe failed:', error);
      if (isProtocolV2LinkDisabledError(error)) {
        throw error;
      }
      return false;
    }
  }

  private async probeProtocolV2(uuid: string) {
    if (!this._messages || !this._messagesV2) {
      return false;
    }

    this.deviceProtocol.set(uuid, 'V2');
    this.v2Assemblers.get(uuid)?.reset();
    const detected = await probeProtocolV2Helper({
      call: (name, data, options) => this.callProtocolV2(uuid, name, data, options),
      timeoutMs: PROTOCOL_V2_PROBE_TIMEOUT_MS,
      logger: this.Log,
      logPrefix: 'ProtocolV2 BLE',
      onProbeFailed: () => {
        this.v2Assemblers.get(uuid)?.reset();
        this.resetProtocolV2Frames(uuid);
      },
      shouldRethrow: error =>
        isBleStaleBondHardwareError(error) || isProtocolV2LinkDisabledError(error),
    });
    if (!detected) {
      this.clearProbeProtocol(uuid, 'V2');
    }
    return detected;
  }

  private async writeOnce(uuid: string, hexData: string): Promise<void> {
    const nobleBle = window.desktopApi?.nobleBle;
    if (!nobleBle) {
      throw new Error('Noble BLE API not available');
    }

    try {
      await nobleBle.write(uuid, hexData, { pacingDelayMs: 0 });
    } catch (error) {
      const staleBondError = this.toStaleBondError(error);
      if (staleBondError) {
        throw staleBondError;
      }
      throw error;
    }
  }

  private async refreshBlePacketCapacity(uuid: string): Promise<void> {
    const device = await window.desktopApi?.nobleBle?.getDevice(uuid);
    this.updateBlePacketCapacity(uuid, device?.mtu);
  }

  private updateBlePacketCapacity(uuid: string, mtu?: number): void {
    const packetCapacity = resolveBlePacketCapacity(
      mtu,
      BLE_PACKET_SIZE_MAXIMUM,
      BLE_PACKET_SIZE_FALLBACK
    );
    if (typeof mtu === 'number') {
      this.deviceMtus.set(uuid, mtu);
    } else {
      this.deviceMtus.delete(uuid);
    }
    this.devicePacketCapacities.set(uuid, packetCapacity);
  }

  private createMtuSubscription(uuid: string): (() => void) | undefined {
    const onMtuChanged = window.desktopApi?.nobleBle?.onMtuChanged;
    if (!onMtuChanged) return undefined;
    return onMtuChanged(device => {
      if (device.id === uuid) {
        this.updateBlePacketCapacity(uuid, device.mtu);
      }
    });
  }

  private writeProtocolV2Frame(
    uuid: string,
    frame: Uint8Array,
    context: ProtocolV2CallContext,
    assertCurrentGeneration: () => void
  ) {
    const packetCapacity = this.devicePacketCapacities.get(uuid) ?? BLE_PACKET_SIZE_FALLBACK;
    const shouldPace = !context.highThroughput;
    return writeProtocolV2BleFrame({
      frame,
      packetCapacity,
      assertActive: assertCurrentGeneration,
      signal: context.signal,
      abortMessage: `Protocol V2 BLE write aborted for ${context.messageName}`,
      initialDelayMs: shouldPace && frame.length <= packetCapacity ? BLE_WRITE_DELAY_MS : 0,
      burstSize: shouldPace ? 1 : undefined,
      burstPauseMs: shouldPace ? BLE_WRITE_DELAY_MS : 0,
      writePacket: packet => this.writeOnce(uuid, bytesToHex(packet)),
    });
  }

  private handleNotification(deviceId: string, hexData: string): void {
    if (hexData === 'PAIRING_REJECTED') {
      this.Log?.debug('[Electron BLE] Pairing rejection detected for device:', deviceId);
      const error = ERRORS.TypedError(HardwareErrorCode.BleDeviceBondedCanceled);
      if (this.deviceProtocol.get(deviceId) === 'V2') {
        this.rejectProtocolV2Frames(deviceId, error);
      } else if (this.runPromise && this.runPromiseDeviceId === deviceId) {
        this.runPromise.reject(error);
      }
      return;
    }

    const protocol = this.deviceProtocol.get(deviceId);
    if (!protocol) {
      this.Log?.debug('[Electron BLE] Ignore notification before protocol detection:', deviceId);
      return;
    }
    if (protocol === 'V2') {
      this.handleProtocolV2Notification(deviceId, hexData);
      return;
    }
    const linkDisabledError = this.readProtocolV2LinkDisabledFailure(deviceId, hexData);
    if (linkDisabledError) {
      if (this.runPromise && this.runPromiseDeviceId === deviceId) {
        this.runPromise.reject(linkDisabledError);
      }
      return;
    }
    this.handleProtocolV1Notification(deviceId, hexData);
  }

  private readProtocolV2LinkDisabledFailure(deviceId: string, hexData: string) {
    if (!this._messages || !this._messagesV2) return undefined;

    const assembler = this.v2Assemblers.get(deviceId);
    if (!assembler) return undefined;

    return detectProtocolV2LinkDisabledError({
      schemas: { protocolV1: this._messages, protocolV2: this._messagesV2 },
      assembler,
      bytes: hexToBytes(hexData),
    });
  }

  private handleProtocolV2Notification(deviceId: string, hexData: string): void {
    try {
      const bytes = hexToBytes(hexData);
      if (bytes.length === 0) return;

      const assembler = this.v2Assemblers.get(deviceId);
      if (!assembler) return;

      for (const frameData of assembler.drain(bytes)) {
        this.resolveProtocolV2Frame(deviceId, frameData);
      }
    } catch (error) {
      this.Log?.error('[Electron BLE] Protocol V2 notification error:', error);
      const notifyError = ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError);
      this.rejectProtocolV2Frames(deviceId, notifyError);
    }
  }

  private getProtocolV2FrameQueue(uuid: string) {
    let queue = this.v2FrameQueues.get(uuid);
    if (!queue) {
      queue = [];
      this.v2FrameQueues.set(uuid, queue);
    }
    return queue;
  }

  private resolveProtocolV2Frame(uuid: string, frame: Uint8Array) {
    const framePromise = this.v2FramePromises.get(uuid);
    if (framePromise) {
      framePromise.resolve(frame);
      this.v2FramePromises.delete(uuid);
      return;
    }
    this.getProtocolV2FrameQueue(uuid).push(frame);
  }

  private resetProtocolV2Frames(uuid: string) {
    this.rejectProtocolV2Frames(uuid, new Error(`Protocol V2 frame state reset for ${uuid}`));
  }

  private rejectProtocolV2Frames(uuid: string, error: Error) {
    this.v2FrameQueues.delete(uuid);
    const framePromise = this.v2FramePromises.get(uuid);
    if (framePromise) {
      this.v2FramePromises.delete(uuid);
      framePromise.reject(error);
    }
  }

  private async readProtocolV2Frame(uuid: string) {
    const queuedFrame = this.getProtocolV2FrameQueue(uuid).shift();
    if (queuedFrame) {
      return queuedFrame;
    }

    const framePromise = createDeferred<Uint8Array>();
    this.v2FramePromises.set(uuid, framePromise);
    try {
      return await framePromise.promise;
    } finally {
      if (this.v2FramePromises.get(uuid) === framePromise) {
        this.v2FramePromises.delete(uuid);
      }
    }
  }

  private handleProtocolV1Notification(deviceId: string, hexData: string): void {
    const result = this.processProtocolV1Notification(deviceId, hexData);

    if (result.error) {
      this.Log?.error('[Electron BLE] Protocol V1 packet processing error:', result.error);
      if (this.runPromise && this.runPromiseDeviceId === deviceId) {
        this.runPromise.reject(ERRORS.TypedError(HardwareErrorCode.BleWriteCharacteristicError));
      }
      return;
    }

    if (
      result.isComplete &&
      result.completePacket &&
      this.runPromise &&
      this.runPromiseDeviceId === deviceId
    ) {
      this.runPromise.resolve(result.completePacket);
    }
  }

  async call(
    uuid: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    if (!this._messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    if (!this.connectedDevices.has(uuid)) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotFound, `Device ${uuid} not connected`);
    }

    const protocol = this.deviceProtocol.get(uuid);
    if (!protocol) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Device protocol has not been detected for ${uuid}`
      );
    }
    if (protocol === 'V2') {
      return this.callProtocolV2(uuid, name, data, options);
    }
    return this.callProtocolV1(uuid, name, data, options);
  }

  async post(uuid: string, name: string, data: Record<string, unknown>) {
    if (this.deviceProtocol.get(uuid) === 'V2') {
      await this.protocolV2Links.sendFlowControl(
        uuid,
        () => this.createProtocolV2Adapter(uuid),
        name,
        data
      );
      return;
    }
    await this.callProtocolV1(uuid, name, data);
  }

  private async callProtocolV1(
    uuid: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    if (!this._messages) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const forceRun = name === 'Initialize' || name === 'Cancel';
    if (this.runPromise && !forceRun) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportCallInProgress);
    }

    const runPromise = createDeferred<Uint8Array | string>();
    runPromise.promise.catch(() => undefined);
    this.runPromise = runPromise;
    this.runPromiseDeviceId = uuid;
    const messages = this._messages;
    const buffers = ProtocolV1.encodeTransportPackets(messages, name, data);
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      if (!window.desktopApi?.nobleBle) {
        throw new Error('Noble BLE write API not available');
      }

      for (let i = 0; i < buffers.length; i++) {
        const buffer = buffers[i];
        if (!buffer || typeof buffer.toString !== 'function') {
          throw new Error(`Buffer ${i + 1} is invalid`);
        }
        const hexString = buffer.toString('hex');
        if (hexString.length === 0) {
          throw new Error(`Buffer ${i + 1} is empty`);
        }
        await window.desktopApi.nobleBle.write(uuid, hexString);
      }

      const response = await Promise.race([
        runPromise.promise,
        new Promise<never>((_, reject) => {
          if (options?.timeoutMs) {
            timeout = setTimeout(() => {
              const error = ERRORS.TypedError(
                HardwareErrorCode.BleTimeoutError,
                `BLE response timeout after ${options.timeoutMs}ms for ${name}`
              );
              runPromise.reject(error);
              reject(error);
            }, options.timeoutMs);
          }
        }),
      ]);
      if (typeof response !== 'string') {
        throw new Error('Returning data is not string.');
      }

      const jsonData = ProtocolV1.decodeMessage(messages, response);
      return check.call(jsonData);
    } catch (e) {
      this.Log?.error('[Electron BLE] Protocol V1 call error:', e);
      const isProbeTimeout =
        name === 'GetFeatures' && options?.timeoutMs === PROTOCOL_PROBE_TIMEOUT_MS;
      if ((e as { errorCode?: unknown })?.errorCode === HardwareErrorCode.BleTimeoutError) {
        this.v1Buffers.set(uuid, { buffer: [], bufferLength: 0 });
        const notifyCleanup = this.notificationCleanups.get(uuid);
        notifyCleanup?.();
        this.notificationCleanups.delete(uuid);
        this.notificationTokens.delete(uuid);
        if (!isProbeTimeout) {
          await this.releaseNative(uuid);
        }
      }
      throw e;
    } finally {
      if (timeout) clearTimeout(timeout);
      if (this.runPromise === runPromise) {
        this.runPromise = null;
        this.runPromiseDeviceId = null;
      }
    }
  }

  private async callProtocolV2(
    uuid: string,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    if (!this._messages || !this._messagesV2) {
      throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
    }

    const callOptions = options;

    try {
      return await this.protocolV2Links.call(
        uuid,
        () => this.createProtocolV2Adapter(uuid),
        name,
        data,
        callOptions
      );
    } catch (e) {
      this.Log?.error('[Electron BLE] Protocol V2 call error:', e);
      throw e;
    }
  }

  private createProtocolV2Adapter(uuid: string) {
    const generation = this.notificationTokens.get(uuid) ?? 0;
    const assertCurrentGeneration = () => {
      if (this.notificationTokens.get(uuid) !== generation) {
        throw new Error(`Protocol V2 notification generation changed for ${uuid}`);
      }
    };

    return {
      router: PROTOCOL_V2_CHANNEL_BLE_UART,
      maxFrameBytes: PROTOCOL_V2_BLE_FRAME_MAX_BYTES,
      generation,
      prepareCall: () => {
        assertCurrentGeneration();
        this.v2Assemblers.get(uuid)?.reset();
        this.resetProtocolV2Frames(uuid);
      },
      writeFrame: (frame: Uint8Array, context: ProtocolV2CallContext) =>
        this.writeProtocolV2Frame(uuid, frame, context, assertCurrentGeneration),
      readFrame: async () => {
        assertCurrentGeneration();
        const rxFrame = await this.readProtocolV2Frame(uuid);
        if (!(rxFrame instanceof Uint8Array)) {
          throw new Error('Response is not Uint8Array');
        }
        return rxFrame;
      },
      reset: (reason: string) => {
        this.v2Assemblers.get(uuid)?.reset();
        this.rejectProtocolV2Frames(uuid, new Error(reason));
      },
      logger: this.Log,
      logPrefix: 'ProtocolV2 BLE',
      createTimeoutError: (messageName: string, timeout: number) =>
        ERRORS.TypedError(
          HardwareErrorCode.BleTimeoutError,
          `BLE response timeout after ${timeout}ms for ${messageName}`
        ),
    };
  }

  private processProtocolV1Notification(deviceId: string, hexData: string): PacketProcessResult {
    try {
      if (typeof hexData !== 'string') {
        return { isComplete: false, error: 'Invalid hexData type' };
      }

      const data = hexToBytes(hexData);
      if (data.length === 0) {
        return { isComplete: false, error: 'Empty or invalid hex data' };
      }

      const bufferState = this.v1Buffers.get(deviceId);
      if (!bufferState) {
        return { isComplete: false, error: 'No buffer state for device' };
      }

      if (isHeaderChunk(data)) {
        const dataView = new DataView(data.buffer);
        bufferState.bufferLength = dataView.getInt32(5, false);
        bufferState.buffer = [...data.subarray(3)];
      } else {
        if (bufferState.buffer.length === 0) {
          // Tail of a cancelled call, arriving after the buffer was reset. Not an
          // `error`: the caller rejects the in-flight call on that field.
          this.Log?.debug('[Electron BLE] Orphan continuation chunk discarded');
          return { isComplete: false };
        }
        bufferState.buffer = bufferState.buffer.concat([...data]);
      }

      if (bufferState.buffer.length - PROTOCOL_V1_MESSAGE_HEADER_SIZE >= bufferState.bufferLength) {
        const completeBuffer = new Uint8Array(bufferState.buffer);
        bufferState.bufferLength = 0;
        bufferState.buffer = [];

        return { isComplete: true, completePacket: bytesToHex(completeBuffer) };
      }

      return { isComplete: false };
    } catch (error) {
      return { isComplete: false, error: `Packet processing error: ${error}` };
    }
  }

  getProtocolType(path: string): ProtocolType | undefined {
    return this.deviceProtocol.get(path);
  }
}
