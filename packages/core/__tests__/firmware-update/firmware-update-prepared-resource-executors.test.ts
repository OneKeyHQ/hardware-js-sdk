import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';
import JSZip from 'jszip';

import FirmwareUpdateV2 from '../../src/api/FirmwareUpdateV2';
import FirmwareUpdateV3 from '../../src/api/FirmwareUpdateV3';
import { DataManager } from '../../src/data-manager';
import {
  registerFirmwareUpdateHostBinding,
  unregisterFirmwareUpdateHostBinding,
} from '../../src/api/firmware/FirmwareHostBinding';
import { prepareFirmwareUpdatePlan } from '../../src/api/firmware/FirmwareUpdatePreparedPlan';
import { digestFirmwareUpdateContract } from '../../src/api/firmware/FirmwareUpdatePlan';
import {
  updateResourcesFromSources,
  uploadFirmwareFromSource,
} from '../../src/api/firmware/uploadFirmware';
import * as utils from '../../src/utils';

import type {
  FirmwareArtifactReader,
  FirmwareArtifactReference,
} from '../../src/types/api/firmwareUpdate';
import type { FirmwareUpdatePlan } from '../../src/types/api/firmwareUpdatePlan';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../../src/api/firmware/getBinary', () => ({
  getBinary: jest.fn(),
  getInfo: jest.fn(),
  getSysResourceBinary: jest.fn(),
}));

jest.mock('../../src/api/firmware/uploadFirmware', () => ({
  updateResources: jest.fn(),
  updateResourcesFromSources: jest.fn(),
  uploadFirmwareFromSource: jest.fn(),
}));

jest.mock('../../src/device/DevicePool', () => ({
  DevicePool: {
    clearDeviceCache: jest.fn(),
    devicesCache: {},
  },
}));

const mockUpdateResourcesFromSources = updateResourcesFromSources as jest.MockedFunction<
  typeof updateResourcesFromSources
>;
const mockUploadFirmwareFromSource = uploadFirmwareFromSource as jest.MockedFunction<
  typeof uploadFirmwareFromSource
>;

const createReference = (artifactRef: string, binary: ArrayBuffer): FirmwareArtifactReference => ({
  artifactRef,
  size: binary.byteLength,
  sha256: bytesToHex(sha256(new Uint8Array(binary))),
});

const createReader = (artifacts: Map<string, ArrayBuffer>): FirmwareArtifactReader => {
  const opened = new Map<string, ArrayBuffer>();
  let sequence = 0;
  return {
    open({ artifactRef }) {
      const binary = artifacts.get(artifactRef);
      if (!binary) throw new Error(`missing artifact: ${artifactRef}`);
      sequence += 1;
      const readerId = `reader-${sequence}`;
      opened.set(readerId, binary);
      return Promise.resolve({ readerId, size: binary.byteLength });
    },
    read({ readerId, offset, length }) {
      const binary = opened.get(readerId);
      if (!binary) throw new Error(`missing reader: ${readerId}`);
      const data = binary.slice(offset, offset + length);
      return Promise.resolve({
        data,
        bytesRead: data.byteLength,
        eof: offset + length === binary.byteLength,
      });
    },
    close({ readerId }) {
      opened.delete(readerId);
      return Promise.resolve();
    },
  };
};

const createPreparedPlan = async (
  executor: 'v2' | 'v3',
  componentTarget: 'firmware' | 'ble' = 'firmware'
) => {
  const firmwareBinary = Uint8Array.from([5, 6, 7, 8]).buffer;
  const resourceBinary = Uint8Array.from([1, 2, 3, 4]).buffer;
  const zip = new JSZip();
  zip.file('images/logo.bin', resourceBinary);
  const archiveBinary = await zip.generateAsync({ type: 'arraybuffer' });
  const firmwareArtifact = createReference('firmware-artifact', firmwareBinary);
  const archiveArtifact = createReference('resource-archive', archiveBinary);
  const resourceArtifact = createReference('resource-entry', resourceBinary);
  const planWithoutDigest: Omit<FirmwareUpdatePlan, 'planDigest'> = {
    schemaVersion: 2,
    executor,
    deviceIdentity: executor === 'v2' ? 'touch-device' : 'pro-device',
    deviceModel: String(executor === 'v2' ? EDeviceType.Touch : EDeviceType.Pro),
    firmwareType: EFirmwareType.Universal,
    platform: 'desktop',
    artifacts: [
      {
        artifactId: componentTarget,
        role: componentTarget,
        target: componentTarget,
        url: `https://firmware.onekey.so/${componentTarget}.bin`,
        container: 'raw',
        expectedSize: firmwareArtifact.size,
        expectedSha256: firmwareArtifact.sha256,
      },
      {
        artifactId: 'resource',
        role: 'resource',
        target: 'resource',
        url: 'https://firmware.onekey.so/resource.zip',
        container: 'zip',
        expectedSize: archiveArtifact.size,
        expectedSha256: archiveArtifact.sha256,
      },
    ],
    targetsToUpdate: [componentTarget, 'resource'],
  };
  const plan: FirmwareUpdatePlan = {
    ...planWithoutDigest,
    planDigest: digestFirmwareUpdateContract(planWithoutDigest),
  };
  const preparedPlan = prepareFirmwareUpdatePlan({
    plan,
    leaseRef: `${executor}-resource-executor`,
    artifacts: [
      { artifactId: componentTarget, artifact: firmwareArtifact },
      {
        artifactId: 'resource',
        artifact: archiveArtifact,
        materializedEntries: [{ entryName: 'images/logo.bin', artifact: resourceArtifact }],
      },
    ],
  });
  return {
    firmwareArtifact,
    firmwareBinary,
    archiveArtifact,
    archiveBinary,
    resourceBinary,
    preparedPlan,
  };
};

describe('prepared resource executors', () => {
  afterEach(() => {
    unregisterFirmwareUpdateHostBinding();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('FirmwareUpdateV3 derives resource bytes from the approved ZIP without duplicate entries', async () => {
    const prepared = await createPreparedPlan('v3');
    const artifactReader = createReader(
      new Map([
        [prepared.firmwareArtifact.artifactRef, prepared.firmwareBinary],
        [prepared.archiveArtifact.artifactRef, prepared.archiveBinary],
      ])
    );
    const hostBindingGeneration = registerFirmwareUpdateHostBinding({
      preparedPlanDigest: prepared.preparedPlan.preparedPlanDigest,
      artifactReader,
    });
    const method = new FirmwareUpdateV3({
      id: 1,
      payload: {
        method: 'firmwareUpdateV3',
        platform: 'desktop',
        preparedPlan: prepared.preparedPlan,
        hostBindingGeneration,
        artifacts: { firmware: prepared.firmwareArtifact },
      },
    });
    method.init();

    const result = await (method as any).prepareResourceInput(EFirmwareType.Universal);
    expect(result.resourceEntries).toHaveLength(1);
    expect(result.resourceEntries[0].entryName).toBe('logo.bin');
    await expect(result.resourceEntries[0].source.readAt(0, 4)).resolves.toEqual(
      prepared.resourceBinary
    );
    await (method as any).closeArtifactSources();
  });

  test('FirmwareUpdateV2 executes prepared resources without a live release record', async () => {
    const prepared = await createPreparedPlan('v2');
    const artifactReader = createReader(
      new Map([
        [prepared.firmwareArtifact.artifactRef, prepared.firmwareBinary],
        [prepared.archiveArtifact.artifactRef, prepared.archiveBinary],
      ])
    );
    const hostBindingGeneration = registerFirmwareUpdateHostBinding({
      preparedPlanDigest: prepared.preparedPlan.preparedPlanDigest,
      artifactReader,
    });
    const method = new FirmwareUpdateV2({
      id: 1,
      payload: {
        method: 'firmwareUpdateV2',
        connectId: 'touch-connect-id',
        platform: 'desktop',
        updateType: 'firmware',
        artifact: prepared.firmwareArtifact,
        preparedPlan: prepared.preparedPlan,
        hostBindingGeneration,
      },
    });
    method.init();

    const typedCall = jest.fn().mockResolvedValue({ type: 'Success' });
    const commands = { typedCall, checkDisposed: jest.fn(), disposed: false };
    method.device = {
      features: {
        deviceType: EDeviceType.Touch,
        serialNo: 'touch-device',
        firmwareVersion: '3.2.0',
        bootloaderVersion: '2.8.0',
      },
      commands,
      getCommands: () => commands,
      getCurrentDeviceType: () => EDeviceType.Touch,
      getCurrentFirmwareType: () => EFirmwareType.Universal,
      getCurrentFirmwareVersionString: () => '3.2.0',
      getCurrentBootloaderVersionString: () => '2.8.0',
      getCurrentSerialNo: () => 'touch-device',
      isBootloader: () => false,
      isProtocolV2: () => false,
      acquire: jest.fn().mockResolvedValue(undefined),
      toMessageObject: jest.fn(() => ({})),
    } as any;
    method.postMessage = jest.fn();
    jest.spyOn(method, 'checkDeviceToBootloader').mockImplementation(() => {
      method.checkPromise = { promise: Promise.resolve(true) } as any;
    });
    jest.spyOn(utils, 'wait').mockResolvedValue(undefined);
    const liveReleaseSpy = jest
      .spyOn(DataManager, 'getSysResourcesLatestRelease')
      .mockReturnValue(undefined);
    mockUpdateResourcesFromSources.mockImplementation(async (_call, _post, _device, entries) => {
      expect(entries).toHaveLength(1);
      expect(entries[0].entryName).toBe('logo.bin');
      await expect(entries[0].source.readAt(0, 4)).resolves.toEqual(prepared.resourceBinary);
      return true;
    });
    mockUploadFirmwareFromSource.mockResolvedValue({ success: true } as any);

    await expect(method.run()).resolves.toEqual({ success: true });
    expect(liveReleaseSpy).not.toHaveBeenCalled();
    expect(mockUpdateResourcesFromSources).toHaveBeenCalledTimes(1);
  });

  test('FirmwareUpdateV2 does not replay a plan resource during its BLE component phase', async () => {
    const prepared = await createPreparedPlan('v2', 'ble');
    const artifactReader = createReader(
      new Map([
        [prepared.firmwareArtifact.artifactRef, prepared.firmwareBinary],
        [prepared.archiveArtifact.artifactRef, prepared.archiveBinary],
      ])
    );
    const hostBindingGeneration = registerFirmwareUpdateHostBinding({
      preparedPlanDigest: prepared.preparedPlan.preparedPlanDigest,
      artifactReader,
    });
    const method = new FirmwareUpdateV2({
      id: 1,
      payload: {
        method: 'firmwareUpdateV2',
        connectId: 'touch-connect-id',
        platform: 'desktop',
        updateType: 'ble',
        preparedPlan: prepared.preparedPlan,
        hostBindingGeneration,
      },
    });
    method.init();

    const typedCall = jest.fn().mockResolvedValue({ type: 'Success' });
    const commands = { typedCall, checkDisposed: jest.fn(), disposed: false };
    method.device = {
      features: {
        deviceType: EDeviceType.Touch,
        serialNo: 'touch-device',
        firmwareVersion: '3.2.0',
        bootloaderVersion: '2.8.0',
      },
      commands,
      getCommands: () => commands,
      getCurrentDeviceType: () => EDeviceType.Touch,
      getCurrentFirmwareType: () => EFirmwareType.Universal,
      getCurrentFirmwareVersionString: () => '3.2.0',
      getCurrentBootloaderVersionString: () => '2.8.0',
      getCurrentSerialNo: () => 'touch-device',
      isBootloader: () => false,
      isProtocolV2: () => false,
      acquire: jest.fn().mockResolvedValue(undefined),
      toMessageObject: jest.fn(() => ({})),
    } as any;
    method.postMessage = jest.fn();
    jest.spyOn(method, 'checkDeviceToBootloader').mockImplementation(() => {
      method.checkPromise = { promise: Promise.resolve(true) } as any;
    });
    jest.spyOn(utils, 'wait').mockResolvedValue(undefined);
    const liveReleaseSpy = jest.spyOn(DataManager, 'getSysResourcesLatestRelease');
    mockUploadFirmwareFromSource.mockResolvedValue({ success: true } as any);

    await expect(method.run()).resolves.toEqual({ success: true });
    expect(liveReleaseSpy).not.toHaveBeenCalled();
    expect(mockUpdateResourcesFromSources).not.toHaveBeenCalled();
  });
});
