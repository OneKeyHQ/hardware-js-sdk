import { EDeviceType, canonicalizePro2BleAdvertisementName } from '@onekeyfe/hd-shared';

import { BaseMethod } from './BaseMethod';
import TransportManager from '../data-manager/TransportManager';
import { DataManager } from '../data-manager';
import { LoggerNames, getDeviceTypeByBleName, getLogger } from '../utils';
import { DevicePool } from '../device/DevicePool';
import { buildProtocolV1FeaturesPayload } from '../deviceProfile/buildDeviceFeatures';
import { mapProtocolV2DeviceInfoToState } from '../device/DeviceStateMapper';
import { getSupportProtocolV1MessageSchema } from '../utils/deviceFeaturesUtils';
import { PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST } from '../protocols/protocol-v2/features';

import type { SearchDevice, UsbDeviceIdentity } from '../types/device';
import type { PROTO } from '../constants';
import type DeviceConnector from '../device/DeviceConnector';
import type {
  AcquireInput,
  OneKeyDeviceInfo as DeviceDescriptor,
  ProtocolV2DeviceInfo,
  Transport,
} from '@onekeyfe/hd-transport';
import type { Device } from '../device/Device';

const Log = getLogger(LoggerNames.DevicePool);

type RequestQueueLookup = {
  getRequestTasksIdByConnectId: (connectId: string) => number[];
  getTask: (requestId: number) => { method: { device?: Device } } | undefined;
};

export type UsbIdentityProbeDescriptor = Pick<DeviceDescriptor, 'path' | 'commType'> &
  Partial<Pick<DeviceDescriptor, 'id' | 'session'>>;

const getDescriptorKeys = (descriptor: UsbIdentityProbeDescriptor) =>
  [descriptor.path, descriptor.id].filter(
    (key): key is string => typeof key === 'string' && key.length > 0
  );

const isOwnedByActiveWebUsbRequest = (
  descriptor: DeviceDescriptor,
  requestQueue?: RequestQueueLookup
) => {
  if (!requestQueue) return false;
  return getDescriptorKeys(descriptor).some(
    key => requestQueue.getRequestTasksIdByConnectId(key).length > 0
  );
};

const getUsbHandle = (descriptor?: UsbIdentityProbeDescriptor) =>
  (descriptor as { device?: unknown } | undefined)?.device;

const getOwningRequestDevice = (
  descriptor: UsbIdentityProbeDescriptor,
  requestQueue?: RequestQueueLookup
) => {
  if (!requestQueue) return undefined;
  const usbHandle = getUsbHandle(descriptor);
  // A path alone can be shared (the all-zero bootloader path, a synthesized serial-less
  // path), so the owner's identity is only reported for the USB handle it actually bound.
  if (usbHandle === undefined) return undefined;
  for (const key of getDescriptorKeys(descriptor)) {
    for (const requestId of requestQueue.getRequestTasksIdByConnectId(key)) {
      const device = requestQueue.getTask(requestId)?.method.device;
      if (
        device?.features &&
        (device.mainId === key || device.originalDescriptor?.path === key) &&
        getUsbHandle(device.originalDescriptor) === usbHandle
      ) {
        return device;
      }
    }
  }
  return undefined;
};

export const getOwnedUsbDeviceIdentity = (
  descriptor: UsbIdentityProbeDescriptor,
  requestQueue: RequestQueueLookup
): UsbDeviceIdentity | undefined => {
  const owner = getOwningRequestDevice(descriptor, requestQueue);
  if (!owner || descriptor.commType !== 'webusb' || owner.originalDescriptor?.commType !== 'webusb')
    return undefined;
  return {
    path: descriptor.path,
    serialNo: owner.getCurrentSerialNo() || null,
    deviceId: owner.getCurrentDeviceId() || null,
    deviceType: owner.getCurrentDeviceType(),
    connectProtocol: owner.getProtocol(),
    commType: 'webusb',
  };
};

export type UsbIdentityProbeTransport = Pick<
  Transport,
  'release' | 'call' | 'getProtocolType' | 'configureProtocolV2'
> & {
  init: (logger: object) => unknown;
  enumerate: () => Promise<UsbIdentityProbeDescriptor[]>;
  acquire: (input: AcquireInput) => Promise<string | undefined>;
  configure: (signedData: string) => void | Promise<void>;
};

// Identity discovery must not publish device events or log raw Features/session data.
const identityProbeLogger = {
  debug: () => undefined,
  log: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/** Runs on a separate transport; never initializes or switches the current Core. */
export const probeUsbDeviceIdentitiesWithTransport = async (
  transport: UsbIdentityProbeTransport,
  commType: UsbDeviceIdentity['commType'],
  getOwnedIdentity?: (descriptor: UsbIdentityProbeDescriptor) => UsbDeviceIdentity | undefined
): Promise<UsbDeviceIdentity[]> => {
  await transport.init(identityProbeLogger);
  const defaultMessages = JSON.stringify(DataManager.getProtobufMessages());
  await transport.configure(defaultMessages);
  await transport.configureProtocolV2?.(
    JSON.stringify(DataManager.getProtobufMessages('v2Schema'))
  );
  const descriptors = await transport.enumerate();
  const identities: UsbDeviceIdentity[] = [];
  const readIdentity = async (
    descriptor: UsbIdentityProbeDescriptor
  ): Promise<UsbDeviceIdentity | undefined> => {
    const { path } = descriptor;
    if (!path || descriptor.commType !== commType) return undefined;
    if (descriptors.filter(candidate => candidate.path === path).length !== 1) return undefined;
    const owner = getOwnedIdentity?.(descriptor);
    if (owner) {
      return owner;
    }
    // Do not borrow a browser handle or replace a Bridge session owned by another call.
    if (descriptor.session || (getUsbHandle(descriptor) as USBDevice | undefined)?.opened)
      return undefined;

    let session: string | undefined;
    let identified: UsbDeviceIdentity | undefined;
    try {
      await transport.configure(defaultMessages);
      session = await transport.acquire({ path, previous: null, forceProtocolDetection: true });
      if (!session) return undefined;
      const protocol = transport.getProtocolType(path);
      if (protocol === 'V1') {
        const response = await transport.call(session, 'GetFeatures', {}, { timeoutMs: 3000 });
        if (response.type !== 'Features') return undefined;
        let features = buildProtocolV1FeaturesPayload(response.message as PROTO.Features);
        if (!features.serialNo) {
          const { messages, protocolV1MessageSchema } = getSupportProtocolV1MessageSchema(features);
          // Legacy V1 has no OnekeyGetFeatures; keep the identity confirmed by GetFeatures.
          if (protocolV1MessageSchema === 'v1CurrentSchema') {
            if (messages) await transport.configure(JSON.stringify(messages));
            const vendor = await transport.call(
              session,
              'OnekeyGetFeatures',
              {},
              { timeoutMs: 3000 }
            );
            if (vendor.type === 'OnekeyFeatures') {
              features = buildProtocolV1FeaturesPayload({
                ...response.message,
                ...vendor.message,
              } as PROTO.Features);
            }
          }
        }
        identified = {
          path,
          serialNo: features.serialNo || null,
          deviceId: features.deviceId || null,
          deviceType: features.deviceType,
          connectProtocol: 'V1',
          commType,
        };
      } else if (protocol === 'V2') {
        const response = await transport.call(
          session,
          'DeviceInfoGet',
          PROTOCOL_V2_FEATURES_DEVICE_INFO_REQUEST,
          { timeoutMs: 3000 }
        );
        if (response.type !== 'DeviceInfo') return undefined;
        const { identity } = mapProtocolV2DeviceInfoToState(
          response.message as ProtocolV2DeviceInfo
        );
        identified = {
          path,
          serialNo: identity?.serialNo || null,
          deviceId: identity?.deviceId || null,
          deviceType: identity?.deviceType ?? EDeviceType.Unknown,
          connectProtocol: 'V2',
          commType,
        };
      }
    } catch {
      // Discovery is best effort; a busy/disconnected device cannot confirm identity.
    } finally {
      if (session) {
        try {
          await transport.release(session, false);
        } catch {
          identified = undefined;
        }
      }
    }
    return identified;
  };
  for (const descriptor of descriptors) {
    const identity = await readIdentity(descriptor);
    if (identity) identities.push(identity);
  }
  return identities;
};

// A USB path is a routing key (the USB serial, a synthesized usb-vid-pid-name, or the
// bootloader placeholder), not a hardware identity, so it never fills uuid/serialNo.
const toSearchDeviceFromDescriptor = (descriptor: DeviceDescriptor): SearchDevice => {
  const connectId = descriptor.path || descriptor.id || null;
  return {
    connectId,
    uuid: '',
    serialNo: null,
    deviceId: null,
    deviceType: EDeviceType.Unknown,
    name: descriptor.name || connectId || '',
    commType: descriptor.commType,
  };
};

const toSearchDevice = (device: Device): SearchDevice | null => {
  const message = device.toMessageObject();
  return message ? (message as SearchDevice) : null;
};

export default class SearchDevices extends BaseMethod {
  connector?: DeviceConnector = undefined;

  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run(): Promise<SearchDevice[]> {
    const env = DataManager.getSettings('env');
    const isWebUsb = env === 'webusb' || env === 'desktop-webusb';
    const requestQueue = this.context?.requestQueue;
    const hasActiveWebUsbRequest = isWebUsb && (requestQueue?.getRequestTasksId().length ?? 0) > 0;
    // Bring up WebUSB even when schema configuration is deferred while a
    // business request owns the discovery lock. Failures here used to be
    // swallowed by configure(); keep searchDevices resolving empty.
    if (isWebUsb) {
      try {
        await TransportManager.ensureInitialized();
      } catch (error) {
        Log.debug('WebUSB bring-up unavailable', error);
      }
    }
    if (!hasActiveWebUsbRequest) await TransportManager.configure();
    const deviceDiff = await this.connector?.enumerate();
    const devicesDescriptor = deviceDiff?.descriptors ?? [];

    /**
     * No need to call features during Bluetooth scaning
     * to avoid device pairing
     */
    if (DataManager.isBleConnect(env)) {
      const devices: SearchDevice[] = [];
      const seenIds = new Set<string>();

      for (const device of devicesDescriptor) {
        const lowerId = device.id?.toLowerCase();
        if (!seenIds.has(lowerId)) {
          seenIds.add(lowerId);
          const rawBleName =
            device.name ?? (device as unknown as { localName?: string }).localName ?? '';
          const bleName = canonicalizePro2BleAdvertisementName(rawBleName);
          devices.push({
            ...device,
            connectId: device.id,
            serialNo: null,
            // BLE discovery cannot provide a physical-device identity before initialization.
            uuid: '',
            deviceId: null,
            name: bleName || device.name || '',
            deviceType: getDeviceTypeByBleName(bleName),
          });
        }
      }
      return devices;
    }

    const deviceList: SearchDevice[] = [];
    for (const descriptor of devicesDescriptor) {
      if (hasActiveWebUsbRequest && isOwnedByActiveWebUsbRequest(descriptor, requestQueue)) {
        const cached = DevicePool.getDeviceByPath(descriptor.path);
        const known = cached?.features ? cached : getOwningRequestDevice(descriptor, requestQueue);
        const message = known ? toSearchDevice(known) : null;
        // Do not probe a path an in-flight request already owns. A cache miss is still a
        // connected device: report the owning request's device, or the path with no identity.
        deviceList.push(message ?? toSearchDeviceFromDescriptor(descriptor));
      } else {
        try {
          // Discovery is best effort. Browsers may retain WebUSB grants for devices that
          // are offline, busy, or not ready, so one descriptor must not abort the scan.
          const result = await DevicePool.getDevices([descriptor], descriptor.path, {
            // Discovery must actively identify the protocol instead of trusting a caller hint.
            connectProtocol: undefined,
            forceProtocolDetection: true,
            refreshRuntimeState: true,
          });
          for (const device of result.deviceList) {
            const message = toSearchDevice(device);
            if (message) deviceList.push(message);
          }
        } catch (error) {
          const errorCode =
            error && typeof error === 'object' && 'errorCode' in error
              ? (error as { errorCode?: unknown }).errorCode
              : undefined;
          Log.debug('Skip unavailable device during search', {
            path: descriptor.path,
            ...(errorCode !== undefined ? { errorCode } : {}),
          });
        }
      }
    }

    return deviceList;
  }
}
