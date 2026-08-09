import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import type { CoreApi } from '../../types/api';
import type {
  FirmwareArtifactReader,
  FirmwareArtifactReference,
  FirmwareUpdateV4Target,
} from '../../types/api/firmwareUpdate';
import type { FirmwareUpdatePlan } from '../../types/api/firmwareUpdatePlan';

export type FirmwareMemoryArtifactEntry = {
  entryName: string;
  binary: ArrayBuffer;
};

export type FirmwareMemoryArtifact = {
  artifactId: string;
  binary: ArrayBuffer;
  materializedEntries?: FirmwareMemoryArtifactEntry[];
};

export type FirmwareUpdateV4MemoryHost = {
  preparedPlan: ReturnType<CoreApi['prepareFirmwareUpdatePlan']>;
  hostBindingGeneration: number;
  targetsToUpdate: FirmwareUpdateV4Target[];
  expectedDeviceId: string;
  expectedTargetVersions: Partial<Record<FirmwareUpdateV4Target, string>>;
  componentArtifacts: Partial<
    Record<Exclude<FirmwareUpdateV4Target, 'resource'>, FirmwareArtifactReference>
  >;
  release: () => void;
};

let memoryHostSequence = 0;

const FIRMWARE_UPDATE_V4_COMPONENT_TARGETS = new Set<Exclude<FirmwareUpdateV4Target, 'resource'>>([
  'boot',
  'app_v1',
  'app_v2',
  'coprocessor',
  'se01',
  'se02',
  'se03',
  'se04',
]);

const isFirmwareUpdateV4ComponentTarget = (
  target: string
): target is Exclude<FirmwareUpdateV4Target, 'resource'> =>
  FIRMWARE_UPDATE_V4_COMPONENT_TARGETS.has(target as Exclude<FirmwareUpdateV4Target, 'resource'>);

const createReference = (binary: ArrayBuffer, prefix: string): FirmwareArtifactReference => {
  const digest = bytesToHex(sha256(new Uint8Array(binary)));
  return {
    artifactRef: `fwmem:${prefix}:${digest.slice(0, 32)}`,
    size: binary.byteLength,
    sha256: digest,
  };
};

export function prepareFirmwareUpdateV4MemoryHost({
  sdk,
  plan,
  artifacts,
}: {
  sdk: Pick<
    CoreApi,
    | 'prepareFirmwareUpdatePlan'
    | 'registerFirmwareUpdateHostBinding'
    | 'unregisterFirmwareUpdateHostBinding'
  >;
  plan: FirmwareUpdatePlan;
  artifacts: FirmwareMemoryArtifact[];
}): FirmwareUpdateV4MemoryHost {
  if (plan.executor !== 'v4') {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'Firmware memory host only supports V4 plans'
    );
  }
  memoryHostSequence += 1;
  const hostId = `${Date.now()}:${memoryHostSequence}`;
  const binaries = new Map<string, Uint8Array>();
  const inputs = artifacts.map((input, artifactIndex) => {
    const artifact = createReference(input.binary, `${hostId}:artifact:${artifactIndex}`);
    binaries.set(artifact.artifactRef, new Uint8Array(input.binary));
    const materializedEntries = input.materializedEntries?.map((entry, entryIndex) => {
      const entryArtifact = createReference(
        entry.binary,
        `${hostId}:entry:${artifactIndex}:${entryIndex}`
      );
      binaries.set(entryArtifact.artifactRef, new Uint8Array(entry.binary));
      return {
        entryName: entry.entryName,
        artifact: entryArtifact,
      };
    });
    return {
      artifactId: input.artifactId,
      artifact,
      ...(materializedEntries?.length ? { materializedEntries } : {}),
    };
  });
  const preparedPlan = sdk.prepareFirmwareUpdatePlan({
    plan,
    leaseRef: `fwmemlease:${hostId}`,
    artifacts: inputs,
  });
  const readers = new Map<string, Uint8Array>();
  let readerSequence = 0;
  const artifactReader: FirmwareArtifactReader = {
    open({ artifactRef }) {
      const binary = binaries.get(artifactRef);
      if (!binary) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'Firmware memory artifact is unavailable'
        );
      }
      readerSequence += 1;
      const readerId = `fwmemreader:${hostId}:${readerSequence}`;
      readers.set(readerId, binary);
      return Promise.resolve({ readerId, size: binary.byteLength });
    },
    read({ readerId, offset, length }) {
      const binary = readers.get(readerId);
      if (!binary || offset < 0 || length <= 0 || offset + length > binary.byteLength) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'Firmware memory artifact read is invalid'
        );
      }
      const data = binary.slice(offset, offset + length).buffer;
      return Promise.resolve({
        data,
        bytesRead: data.byteLength,
        eof: offset + length === binary.byteLength,
      });
    },
    close({ readerId }) {
      readers.delete(readerId);
      return Promise.resolve();
    },
  };
  const hostBindingGeneration = sdk.registerFirmwareUpdateHostBinding({
    artifactReader,
    preparedPlanDigest: preparedPlan.preparedPlanDigest,
  });
  const componentArtifacts: FirmwareUpdateV4MemoryHost['componentArtifacts'] = {};
  const expectedTargetVersions: FirmwareUpdateV4MemoryHost['expectedTargetVersions'] = {};
  for (const artifact of preparedPlan.artifacts) {
    if (artifact.role === 'component' && isFirmwareUpdateV4ComponentTarget(artifact.target)) {
      componentArtifacts[artifact.target] = artifact.artifact;
    }
    if (artifact.targetVersion) {
      expectedTargetVersions[artifact.target as FirmwareUpdateV4Target] = artifact.targetVersion;
    }
  }
  return {
    preparedPlan,
    hostBindingGeneration,
    targetsToUpdate: [...preparedPlan.targetsToUpdate] as FirmwareUpdateV4Target[],
    expectedDeviceId: preparedPlan.deviceIdentity,
    expectedTargetVersions,
    componentArtifacts,
    release: () => {
      sdk.unregisterFirmwareUpdateHostBinding(hostBindingGeneration);
      readers.clear();
      binaries.clear();
    },
  };
}
