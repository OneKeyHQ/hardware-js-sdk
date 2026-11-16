import { DataManager } from '@onekeyfe/hd-core';
import { ERRORS, HardwareErrorCode, resolveOneKeyUsbDevicePath } from '@onekeyfe/hd-shared';
import ReactNativeBleTransport from '@onekeyfe/hd-transport-react-native';
import ReactNativeUsbTransport, {
  TRANSPORT_EVENT,
  createUsbEventEmitter,
  isOneKeyUsbDevice,
  setUsbPriorityMode,
  subscribeUsbDeviceEvents,
} from '@onekeyfe/hd-transport-react-native-usb';

import type EventEmitter from 'events';
import type {
  AcquireInput,
  MessageFromOneKey,
  OneKeyDeviceInfo,
  ProtocolType,
  Transport,
  TransportCallOptions,
  TransportDeviceDisconnectEvent,
} from '@onekeyfe/hd-transport';
import type {
  NativeUsbDeviceEvent,
  ReactNativeUsbTransportOptions,
} from '@onekeyfe/hd-transport-react-native-usb';

export interface ReactNativeCombinedTransportOptions {
  scanTimeout?: number;
  usbOptions?: ReactNativeUsbTransportOptions;
}

type InnerTransportKind = 'usb' | 'ble';
type TransportLogger = {
  debug?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  log?: (...args: unknown[]) => void;
};

const BLE_MAC_REGEX = /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i;
const BLE_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USB_FALLBACK_PATH_REGEX = /^usb-[0-9a-f]{4}-[0-9a-f]{4}-/i;
const USB_DEV_PATH_REGEX = /^\/dev\//;
const USB_ALL_ZERO_SERIAL_REGEX = /^0+$/;

function isBleIdentifierShape(value: string): boolean {
  return BLE_MAC_REGEX.test(value) || BLE_UUID_REGEX.test(value);
}

function isUsbIdentifierShape(value: string): boolean {
  return (
    USB_FALLBACK_PATH_REGEX.test(value) ||
    USB_DEV_PATH_REGEX.test(value) ||
    USB_ALL_ZERO_SERIAL_REGEX.test(value)
  );
}

export default class ReactNativeCombinedTransport implements Transport {
  private static activeInstances = new Set<ReactNativeCombinedTransport>();

  private static pendingPriorityMode = false;

  readonly usbTransport: ReactNativeUsbTransport;

  readonly bleTransport: ReactNativeBleTransport;

  name = 'ReactNativeCombinedTransport';

  version = '';

  configured = false;

  isOutdated = false;

  activeName?: string;

  Log?: TransportLogger;

  emitter?: EventEmitter;

  private pathToTransport = new Map<string, InnerTransportKind>();

  private activeSessions = new Map<string, InnerTransportKind>();

  private sessionAliases = new Map<string, Set<string>>();

  private inFlightAcquires = new Map<string, InnerTransportKind>();

  private inFlightUsbOps = 0;

  private inFlightBleOps = 0;

  private priorityMode = false;

  private usbSubscriptions: ReturnType<typeof subscribeUsbDeviceEvents> = [];

  private disconnectListener?: (event: TransportDeviceDisconnectEvent) => void;

  private boundEmitter?: EventEmitter;

  constructor(options?: ReactNativeCombinedTransportOptions) {
    this.usbTransport = new ReactNativeUsbTransport(options?.usbOptions);
    this.bleTransport = new ReactNativeBleTransport({
      scanTimeout: options?.scanTimeout,
    });
    ReactNativeCombinedTransport.activeInstances.add(this);
    DataManager.setActiveCommType(undefined);
    if (ReactNativeCombinedTransport.pendingPriorityMode) {
      this.priorityMode = true;
      this.usbTransport.setPriorityMode(true).catch(error => {
        this.Log?.debug?.(
          '[ReactNativeCombinedTransport] failed to apply initial priorityMode:',
          error
        );
      });
    }
  }

  static async setPriorityMode(enabled: boolean): Promise<void> {
    ReactNativeCombinedTransport.pendingPriorityMode = enabled;
    if (ReactNativeCombinedTransport.activeInstances.size === 0) {
      await setUsbPriorityMode(enabled).catch(() => undefined);
      return;
    }
    await Promise.all(
      Array.from(ReactNativeCombinedTransport.activeInstances, instance =>
        instance.setPriorityMode(enabled)
      )
    );
  }

  setPriorityMode(enabled: boolean): Promise<void> {
    this.priorityMode = enabled;
    if (
      enabled &&
      (DataManager.getActiveCommType() === 'usb' ||
        (this.hasKnownUsbDeviceOrSession() && !this.hasActiveBleSession()))
    ) {
      DataManager.setActiveCommType('usb');
      this.activeName = this.usbTransport.name;
    }
    return this.usbTransport.setPriorityMode(enabled).catch(error => {
      this.Log?.debug?.('[ReactNativeCombinedTransport] native setPriorityMode failed:', error);
    });
  }

  getPriorityMode(): boolean {
    return this.priorityMode;
  }

  async init(logger?: TransportLogger, emitter?: EventEmitter): Promise<string> {
    this.Log = logger;
    this.emitter = emitter;

    this.subscribeUsbEvents();
    this.subscribeTransportDisconnect(emitter);

    // Register combined USB listeners before inner USB transport so handleToPath is
    // still intact during detach events before inner cleanup removes it.
    await this.runOnBoth('init', async target => {
      if (target === this.usbTransport) {
        await this.usbTransport.init(logger, emitter);
      } else {
        await Promise.resolve(this.bleTransport.init(logger, emitter as EventEmitter));
      }
    });

    return '';
  }

  async configure(signedData: JSON | string): Promise<void> {
    await this.runOnBoth('configure', async target => {
      await target.configure(signedData);
    });
    this.configured = true;
  }

  async configureProtocolV2(signedData: JSON | string): Promise<void> {
    await this.runOnBoth('configureProtocolV2', async target => {
      await Promise.resolve(target.configureProtocolV2?.(signedData));
    });
  }

  async enumerate(): Promise<OneKeyDeviceInfo[]> {
    if (!this.priorityMode && this.hasActiveBleSession()) {
      DataManager.setActiveCommType('ble');
      this.activeName = this.bleTransport.name;
      return this.enumerateBle();
    }

    const usbDevices = await this.enumerateUsb();
    // Re-check after awaiting enumerateUsb() (which can block on a permission prompt)
    // so a BLE session/acquire that started meanwhile is not displaced by USB.
    if (!this.priorityMode && this.hasActiveBleSession()) {
      DataManager.setActiveCommType('ble');
      this.activeName = this.bleTransport.name;
      return this.enumerateBle();
    }

    if (usbDevices.length > 0) {
      DataManager.setActiveCommType('usb');
      this.activeName = this.usbTransport.name;
      return usbDevices;
    }

    if (this.priorityMode || this.hasActiveUsbSession()) {
      return [];
    }

    DataManager.setActiveCommType('ble');
    this.activeName = this.bleTransport.name;
    return this.enumerateBle();
  }

  async listen(_old?: Array<OneKeyDeviceInfo>): Promise<OneKeyDeviceInfo[]> {
    this.subscribeUsbEvents();
    this.usbTransport.listen();
    this.bleTransport.listen();
    return this.enumerate();
  }

  async acquire(input: AcquireInput): Promise<string> {
    const key = input.path || input.uuid || '';
    if (!key.trim()) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound, 'No device identifier provided');
    }

    const owner = await this.resolveOwnerForAcquire(key, input);
    this.inFlightAcquires.set(key, owner);
    this.incrementInFlight(owner, 1);
    try {
      if (owner === 'usb') {
        const usbInput: AcquireInput = {
          ...input,
          path: input.path ?? input.uuid,
        };
        const acquiredPath = await this.usbTransport.acquire(usbInput);
        this.recordPathOwner(acquiredPath, 'usb');
        this.recordPathOwner(key, 'usb');
        this.recordSession(acquiredPath, key, 'usb');
        DataManager.setActiveCommType('usb');
        this.activeName = this.usbTransport.name;
        return acquiredPath;
      }

      const bleInput = {
        ...input,
        uuid: input.uuid ?? input.path ?? '',
      };
      const bleResult = await this.bleTransport.acquire(bleInput);
      const resolvedId =
        bleResult && typeof bleResult === 'object' && 'uuid' in bleResult && bleResult.uuid
          ? bleResult.uuid
          : bleInput.uuid;
      this.recordPathOwner(resolvedId, 'ble');
      this.recordPathOwner(key, 'ble');
      this.recordSession(resolvedId, key, 'ble');
      DataManager.setActiveCommType('ble');
      this.activeName = this.bleTransport.name;
      return bleResult as unknown as string;
    } finally {
      if (this.inFlightAcquires.get(key) === owner) {
        this.inFlightAcquires.delete(key);
      }
      this.incrementInFlight(owner, -1);
    }
  }

  async call(
    session: string,
    name: string,
    data: Record<string, any>,
    options?: TransportCallOptions
  ): Promise<MessageFromOneKey> {
    const owner = await this.resolveOwnerForSession(session);
    this.incrementInFlight(owner, 1);
    try {
      if (owner === 'usb') {
        return await this.usbTransport.call(session, name, data, options);
      }
      return await this.bleTransport.call(session, name, data, options);
    } finally {
      this.incrementInFlight(owner, -1);
    }
  }

  async post(session: string, name: string, data: Record<string, any>): Promise<void> {
    const owner = await this.resolveOwnerForSession(session);
    this.incrementInFlight(owner, 1);
    try {
      if (owner === 'usb') {
        await this.usbTransport.post(session, name, data);
      } else {
        await this.bleTransport.post(session, name, data);
      }
    } finally {
      this.incrementInFlight(owner, -1);
    }
  }

  async read(session: string): Promise<MessageFromOneKey> {
    const owner = await this.resolveOwnerForSession(session);
    this.incrementInFlight(owner, 1);
    try {
      if (owner === 'usb') {
        return await this.usbTransport.read(session);
      }
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'read() is not supported by ReactNativeBleTransport'
      );
    } finally {
      this.incrementInFlight(owner, -1);
    }
  }

  async release(session: string, onclose = false, keepSession = false): Promise<void> {
    const owner = await this.resolveOwnerForSession(session);
    try {
      if (owner === 'usb') {
        await this.usbTransport.release(session, onclose);
      } else {
        await this.bleTransport.release(session, onclose, keepSession);
      }
    } finally {
      this.deleteSessionAndAliases(session);
    }
  }

  async disconnect(session: string): Promise<void> {
    const owner = await this.resolveOwnerForSession(session);
    try {
      if (owner === 'ble') {
        await this.bleTransport.disconnect(session);
      } else {
        await this.usbTransport.release(session, true);
      }
    } finally {
      this.deleteSessionAndAliases(session);
    }
  }

  getProtocolType(path: string): ProtocolType | undefined {
    const owner =
      this.activeSessions.get(path) ??
      this.inFlightAcquires.get(path) ??
      this.pathToTransport.get(path);
    if (owner === 'usb') {
      return this.usbTransport.getProtocolType(path);
    }
    if (owner === 'ble') {
      return this.bleTransport.getProtocolType(path);
    }
    return this.usbTransport.getProtocolType(path) ?? this.bleTransport.getProtocolType(path);
  }

  async cancel(): Promise<void> {
    const usbActive = this.hasActiveUsbSession();
    const bleActive = this.hasActiveBleSession();

    let targets: Array<
      readonly [InnerTransportKind, ReactNativeUsbTransport | ReactNativeBleTransport]
    >;
    if (usbActive && !bleActive) {
      targets = [['usb', this.usbTransport]];
    } else if (!usbActive && bleActive) {
      targets = [['ble', this.bleTransport]];
    } else if (usbActive && bleActive) {
      const activeCommType = DataManager.getActiveCommType();
      if (activeCommType === 'usb' || (activeCommType === undefined && this.priorityMode)) {
        targets = [['usb', this.usbTransport]];
      } else if (activeCommType === 'ble') {
        targets = [['ble', this.bleTransport]];
      } else {
        targets = [
          ['usb', this.usbTransport],
          ['ble', this.bleTransport],
        ];
      }
    } else {
      targets = [
        ['usb', this.usbTransport],
        ['ble', this.bleTransport],
      ];
    }

    await this.runOnTargets('cancel', targets, async target => {
      await target.cancel();
    });
  }

  async stop(): Promise<void> {
    this.clearUsbSubscriptions();
    this.clearDisconnectSubscription();
    this.priorityMode = false;
    ReactNativeCombinedTransport.activeInstances.delete(this);
    if (ReactNativeCombinedTransport.activeInstances.size === 0) {
      ReactNativeCombinedTransport.pendingPriorityMode = false;
    }

    try {
      await this.usbTransport.setPriorityMode(false);
    } catch (error) {
      this.Log?.debug?.('[ReactNativeCombinedTransport] reset priorityMode on stop failed:', error);
    }

    try {
      await this.runOnBoth('stop', async target => {
        await target.stop();
      });
    } finally {
      this.activeSessions.clear();
      this.sessionAliases.clear();
      this.inFlightAcquires.clear();
      this.pathToTransport.clear();
      this.inFlightUsbOps = 0;
      this.inFlightBleOps = 0;
      this.activeName = undefined;
      this.emitter = undefined;
      DataManager.setActiveCommType(undefined);
    }
  }

  dispose(): Promise<void> {
    return this.stop();
  }

  private hasActiveBleSession(): boolean {
    if (this.inFlightBleOps > 0) {
      return true;
    }
    for (const owner of this.activeSessions.values()) {
      if (owner === 'ble') return true;
    }
    for (const owner of this.inFlightAcquires.values()) {
      if (owner === 'ble') return true;
    }
    return false;
  }

  private hasActiveUsbSession(): boolean {
    if (this.inFlightUsbOps > 0) {
      return true;
    }
    for (const owner of this.activeSessions.values()) {
      if (owner === 'usb') return true;
    }
    for (const owner of this.inFlightAcquires.values()) {
      if (owner === 'usb') return true;
    }
    return false;
  }

  private hasKnownUsbDeviceOrSession(): boolean {
    if (this.hasActiveUsbSession()) {
      return true;
    }
    for (const owner of this.pathToTransport.values()) {
      if (owner === 'usb') return true;
    }
    return this.usbTransport.hasKnownDevice?.() ?? false;
  }

  private recordSession(sessionId: string, alias: string, owner: InnerTransportKind) {
    this.activeSessions.set(sessionId, owner);
    if (alias && alias !== sessionId) {
      this.activeSessions.set(alias, owner);
      const primaryAliases = this.sessionAliases.get(sessionId) ?? new Set<string>();
      primaryAliases.add(alias);
      this.sessionAliases.set(sessionId, primaryAliases);
      const secondaryAliases = this.sessionAliases.get(alias) ?? new Set<string>();
      secondaryAliases.add(sessionId);
      this.sessionAliases.set(alias, secondaryAliases);
    }
  }

  private deleteSessionAndAliases(session: string, expectedOwner?: InnerTransportKind) {
    if (!session) return;
    const owner = this.activeSessions.get(session);
    if (expectedOwner && owner !== expectedOwner) {
      return;
    }
    this.activeSessions.delete(session);
    const aliases = this.sessionAliases.get(session);
    if (aliases) {
      aliases.forEach(alias => {
        if (!expectedOwner || this.activeSessions.get(alias) === expectedOwner) {
          this.activeSessions.delete(alias);
        }
        const reverse = this.sessionAliases.get(alias);
        reverse?.delete(session);
        if (reverse && reverse.size === 0) {
          this.sessionAliases.delete(alias);
        }
      });
      this.sessionAliases.delete(session);
    }
  }

  private incrementInFlight(owner: InnerTransportKind, delta: 1 | -1) {
    if (owner === 'usb') {
      this.inFlightUsbOps = Math.max(0, this.inFlightUsbOps + delta);
    } else {
      this.inFlightBleOps = Math.max(0, this.inFlightBleOps + delta);
    }
  }

  private recordPathOwner(path: string | undefined, owner: InnerTransportKind) {
    if (!path) return;
    this.pathToTransport.set(path, owner);
  }

  private async enumerateUsb(): Promise<OneKeyDeviceInfo[]> {
    const devices = await this.usbTransport.enumerate();
    devices.forEach(device => {
      this.recordPathOwner(device.path, 'usb');
      this.recordPathOwner(device.id, 'usb');
    });
    return devices;
  }

  private async enumerateBle(): Promise<OneKeyDeviceInfo[]> {
    const devices = (await this.bleTransport.enumerate()) as unknown as OneKeyDeviceInfo[];
    devices.forEach(device => {
      this.recordPathOwner(device.id, 'ble');
      this.recordPathOwner(device.path, 'ble');
    });
    return devices;
  }

  private getKnownOwner(key: string): InnerTransportKind | undefined {
    const mapped =
      this.activeSessions.get(key) ??
      this.inFlightAcquires.get(key) ??
      this.pathToTransport.get(key);
    if (mapped) {
      return mapped;
    }
    if (this.usbTransport.getProtocolType(key)) {
      return 'usb';
    }
    if (this.bleTransport.getProtocolType(key)) {
      return 'ble';
    }
    return undefined;
  }

  private async lookupOwnerInCurrentMaps(
    key: string,
    allowBleScan: boolean
  ): Promise<InnerTransportKind | undefined> {
    const usbDevices = await this.enumerateUsb();
    if (usbDevices.some(d => d.path === key || d.id === key)) {
      return 'usb';
    }

    if (allowBleScan) {
      const bleDevices = await this.enumerateBle();
      const lowerKey = key.toLowerCase();
      if (
        bleDevices.some(
          d =>
            d.id === key ||
            d.path === key ||
            d.id?.toLowerCase() === lowerKey ||
            d.path?.toLowerCase() === lowerKey
        )
      ) {
        return 'ble';
      }
    }

    return undefined;
  }

  private fallbackOwnerByShapeOrContext(key: string, input?: AcquireInput): InnerTransportKind {
    if (this.priorityMode && DataManager.getActiveCommType() === 'usb') {
      return 'usb';
    }
    if (key && isBleIdentifierShape(key)) {
      return 'ble';
    }
    if (key && isUsbIdentifierShape(key)) {
      return 'usb';
    }
    if (this.priorityMode && DataManager.getActiveCommType() !== 'ble') {
      return 'usb';
    }
    if (DataManager.getActiveCommType() === 'usb') {
      return 'usb';
    }
    if (DataManager.getActiveCommType() === 'ble') {
      return 'ble';
    }
    if (input?.path && !input.uuid) {
      return 'usb';
    }
    if (input?.path && input?.uuid) {
      // Combined + missing commType + unknown activeCommType: neither USB nor BLE
      // enumerate matched and identifier isn't MAC/UUID shaped; keep USB so an
      // unplugged USB serial fails cleanly instead of dialing BLE.
      return 'usb';
    }
    return 'ble';
  }

  private async resolveOwnerForAcquire(
    key: string,
    input: AcquireInput
  ): Promise<InnerTransportKind> {
    const known = this.getKnownOwner(key);
    if (known) {
      return known;
    }

    if (!this.priorityMode && ((input.uuid && !input.path) || isBleIdentifierShape(key))) {
      return 'ble';
    }

    const allowBleScan = !this.priorityMode;
    const discovered = await this.lookupOwnerInCurrentMaps(key, allowBleScan);
    if (discovered) {
      return discovered;
    }

    return this.fallbackOwnerByShapeOrContext(key, input);
  }

  private async resolveOwnerForSession(session: string): Promise<InnerTransportKind> {
    const known = this.getKnownOwner(session);
    if (known) {
      return known;
    }

    const allowBleScan = !this.priorityMode;
    const discovered = await this.lookupOwnerInCurrentMaps(session, allowBleScan);
    if (discovered) {
      return discovered;
    }

    return this.fallbackOwnerByShapeOrContext(session);
  }

  private subscribeUsbEvents() {
    this.clearUsbSubscriptions();
    const nativeEmitter = createUsbEventEmitter();
    this.usbSubscriptions = subscribeUsbDeviceEvents(nativeEmitter, {
      onAttached: device => this.handleUsbAttached(device),
      onDetached: device => this.handleUsbDetached(device),
    });
  }

  private handleUsbAttached(device: NativeUsbDeviceEvent) {
    if (!isOneKeyUsbDevice(device) || device.hasPermission !== true) {
      return;
    }
    const path = resolveOneKeyUsbDevicePath(device);
    if (path) {
      this.recordPathOwner(path, 'usb');
    }
    if (!this.hasActiveBleSession()) {
      DataManager.setActiveCommType('usb');
      this.activeName = this.usbTransport.name;
    }
  }

  private handleUsbDetached(device: NativeUsbDeviceEvent) {
    if (this.usbTransport.isSupersededHandle?.(device.handle)) {
      return;
    }
    const keysToDrop = new Set<string>();
    const mappedPath = this.usbTransport.getPathForCurrentHandle?.(device.handle);
    if (mappedPath) {
      keysToDrop.add(mappedPath);
    }
    const rawSerial = device.serialNumber?.trim();
    if (rawSerial) {
      keysToDrop.add(rawSerial);
    }
    if (rawSerial || device.hasPermission === true) {
      const resolvedPath = resolveOneKeyUsbDevicePath(device);
      if (resolvedPath) {
        keysToDrop.add(resolvedPath);
      }
    }
    keysToDrop.forEach(key => {
      this.deleteSessionAndAliases(key, 'usb');
      if (this.pathToTransport.get(key) === 'usb') {
        this.pathToTransport.delete(key);
      }
    });
    // Keep activeCommType as 'usb' while priority mode is on so bootloader
    // re-enumeration stays on USB; otherwise the next enumerate() evaluates BLE.
  }

  private subscribeTransportDisconnect(emitter?: EventEmitter) {
    this.clearDisconnectSubscription();
    if (!emitter) {
      return;
    }
    const listener = (event: TransportDeviceDisconnectEvent) => {
      if (event.connectId) {
        this.deleteSessionAndAliases(event.connectId);
        if (this.pathToTransport.get(event.connectId) === 'usb') {
          this.pathToTransport.delete(event.connectId);
        }
      }
      if (event.id) {
        this.deleteSessionAndAliases(event.id);
        if (this.pathToTransport.get(event.id) === 'usb') {
          this.pathToTransport.delete(event.id);
        }
      }
    };
    this.disconnectListener = listener;
    this.boundEmitter = emitter;
    emitter.on(TRANSPORT_EVENT.DEVICE_DISCONNECT, listener);
  }

  private clearUsbSubscriptions() {
    this.usbSubscriptions.forEach(sub => sub.remove());
    this.usbSubscriptions = [];
  }

  private clearDisconnectSubscription() {
    if (this.boundEmitter && this.disconnectListener) {
      this.boundEmitter.removeListener(TRANSPORT_EVENT.DEVICE_DISCONNECT, this.disconnectListener);
    }
    this.boundEmitter = undefined;
    this.disconnectListener = undefined;
  }

  private runOnBoth(
    action: string,
    fn: (target: ReactNativeUsbTransport | ReactNativeBleTransport) => Promise<void>
  ): Promise<void> {
    return this.runOnTargets(
      action,
      [
        ['usb', this.usbTransport],
        ['ble', this.bleTransport],
      ],
      fn
    );
  }

  private async runOnTargets(
    action: string,
    targets: ReadonlyArray<
      readonly [InnerTransportKind, ReactNativeUsbTransport | ReactNativeBleTransport]
    >,
    fn: (target: ReactNativeUsbTransport | ReactNativeBleTransport) => Promise<void>
  ): Promise<void> {
    let firstError: Error | undefined;
    for (const [label, target] of targets) {
      try {
        await fn(target);
      } catch (error) {
        this.Log?.error?.(`[ReactNativeCombinedTransport] ${action} (${label}) failed:`, error);
        if (firstError === undefined) {
          firstError = error instanceof Error ? error : new Error(String(error));
        }
      }
    }
    if (firstError !== undefined) {
      throw firstError;
    }
  }
}
