import type { DeviceDescriptor, DeviceChangeEvent } from '@onekeyfe/hwk-adapter-core';
import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import type { DmkDiscoveredDevice } from '../types';
import { debugLog, debugError } from '../utils/debugLog';

/**
 * Manages device discovery, connection, and session tracking.
 * Wraps DMK's Observable APIs into simpler imperative calls.
 */
export class LedgerDeviceManager {
  private readonly _dmk: DeviceManagementKit;
  private readonly _discovered = new Map<string, DmkDiscoveredDevice>();
  private readonly _sessions = new Map<string, string>(); // deviceId → sessionId
  private readonly _sessionToDevice = new Map<string, string>(); // sessionId → deviceId
  private _listenSub: { unsubscribe: () => void } | null = null;

  constructor(dmk: DeviceManagementKit) {
    this._dmk = dmk;
  }

  /**
   * One-shot enumeration: subscribe to listenToAvailableDevices,
   * take the first emission, unsubscribe, return DeviceDescriptors.
   */
  enumerate(): Promise<DeviceDescriptor[]> {
    debugLog('[DMK] enumerate() called, dmk exists:', !!this._dmk);
    return new Promise<DeviceDescriptor[]>(resolve => {
      let resolved = false;
      let syncResult: DmkDiscoveredDevice[] | null = null;
      let sub: { unsubscribe: () => void } | null = null;

      sub = this._dmk.listenToAvailableDevices({}).subscribe({
        next: devices => {
          if (resolved) return;
          resolved = true;
          this._discovered.clear();
          debugLog('[DMK] enumerate raw devices:', devices.length);
          for (const d of devices) {
            this._discovered.set(d.id, d);
          }
          // If sub is already assigned (async emission), resolve and unsubscribe immediately
          if (sub) {
            sub.unsubscribe();
            resolve(
              devices.map(d => ({
                path: d.id,
                type: d.deviceModel.model,
                name: d.name,
                transport: d.transport,
              }))
            );
          } else {
            // Synchronous emission — sub not yet assigned, defer to after subscribe()
            syncResult = devices;
          }
        },
        error: () => {
          if (!resolved) {
            resolved = true;
            resolve([]);
          }
        },
      });

      // If BehaviorSubject fired synchronously, sub is now assigned
      if (syncResult !== null) {
        sub.unsubscribe();
        const devices = syncResult as DmkDiscoveredDevice[];
        resolve(
          devices.map(d => ({
            path: d.id,
            type: d.deviceModel.model,
            name: d.name,
            transport: d.transport,
          }))
        );
      }
    });
  }

  /**
   * Continuous listening: tracks device connect/disconnect via diffing.
   */
  listen(onChange: (event: DeviceChangeEvent) => void): void {
    this.stopListening();
    let previousIds = new Set<string>();

    this._listenSub = this._dmk.listenToAvailableDevices({}).subscribe({
      next: devices => {
        const currentIds = new Set(devices.map(d => d.id));

        for (const d of devices) {
          this._discovered.set(d.id, d);
          debugLog('[DMK] listen device:', d.id, d.name);
          if (!previousIds.has(d.id)) {
            onChange({
              type: 'device-connected',
              descriptor: {
                path: d.id,
                type: d.deviceModel.model,
                name: d.name,
                transport: d.transport,
              },
            });
          }
        }
        for (const id of previousIds) {
          if (!currentIds.has(id)) {
            this._discovered.delete(id);
            onChange({ type: 'device-disconnected', descriptor: { path: id } });
          }
        }
        previousIds = currentIds;
      },
    });
  }

  stopListening(): void {
    this._listenSub?.unsubscribe();
    this._listenSub = null;
  }

  /**
   * Trigger browser device selection (WebHID requestDevice).
   * Starts discovery for a short period, then stops.
   */
  /**
   * Start BLE discovery if not already running.
   * Does NOT stop — DMK keeps scanning in the background so that
   * listenToAvailableDevices() always has fresh data.
   */
  private _discoverySub: { unsubscribe: () => void } | null = null;

  requestDevice(): Promise<void> {
    if (this._discoverySub) {
      // Already scanning
      return Promise.resolve();
    }
    debugLog('[DMK] requestDevice() starting persistent BLE scan');
    this._discoverySub = this._dmk.startDiscovering({}).subscribe({
      next: d => {
        debugLog('[DMK] BLE discovered:', d.name || d.id);
        this._discovered.set(d.id, d);
      },
      error: err => {
        debugError('[DMK] BLE scan error:', err);
        this._discoverySub = null;
      },
    });
    return Promise.resolve();
  }

  /** Connect to a previously discovered device. Returns sessionId. */
  async connect(deviceId: string): Promise<string> {
    const device = this._discovered.get(deviceId);
    if (!device) {
      throw new Error(`Device "${deviceId}" not found. Call enumerate() or listen() first.`);
    }
    const sessionId = await this._dmk.connect({ device });
    this._sessions.set(deviceId, sessionId);
    this._sessionToDevice.set(sessionId, deviceId);
    return sessionId;
  }

  /** Disconnect a session. */
  async disconnect(sessionId: string): Promise<void> {
    await this._dmk.disconnect({ sessionId });
    const deviceId = this._sessionToDevice.get(sessionId);
    if (deviceId) this._sessions.delete(deviceId);
    this._sessionToDevice.delete(sessionId);
  }

  getSessionId(deviceId: string): string | undefined {
    return this._sessions.get(deviceId);
  }

  getDeviceId(sessionId: string): string | undefined {
    return this._sessionToDevice.get(sessionId);
  }

  /** Get the underlying DMK instance (needed by SignerManager). */
  getDmk(): DeviceManagementKit {
    return this._dmk;
  }

  stopDiscovery(): void {
    if (this._discoverySub) {
      this._discoverySub.unsubscribe();
      this._discoverySub = null;
      this._dmk.stopDiscovering();
    }
  }

  dispose(): void {
    this.stopListening();
    this.stopDiscovery();
    this._discovered.clear();
    this._sessions.clear();
    this._sessionToDevice.clear();
    this._dmk.close();
  }
}
