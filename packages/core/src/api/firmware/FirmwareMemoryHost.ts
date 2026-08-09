import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import type { CoreApi } from '../../types/api';
import type {
  FirmwareArtifactReader,
  FirmwareArtifactReference,
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
  release: () => void;
};

let memoryHostSequence = 0;

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
    const artifactBinary = new Uint8Array(input.binary).slice();
    const artifact = createReference(
      artifactBinary.buffer as ArrayBuffer,
      `${hostId}:artifact:${artifactIndex}`
    );
    binaries.set(artifact.artifactRef, artifactBinary);
    const materializedEntries = input.materializedEntries?.map((entry, entryIndex) => {
      const entryBinary = new Uint8Array(entry.binary).slice();
      const entryArtifact = createReference(
        entryBinary.buffer as ArrayBuffer,
        `${hostId}:entry:${artifactIndex}:${entryIndex}`
      );
      binaries.set(entryArtifact.artifactRef, entryBinary);
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
  return {
    preparedPlan,
    hostBindingGeneration,
    release: () => {
      sdk.unregisterFirmwareUpdateHostBinding(hostBindingGeneration);
      readers.clear();
      binaries.clear();
    },
  };
}
