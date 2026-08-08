import type { FirmwareUpdateV4Target } from './firmwareUpdate';

export type ProtocolV2ResourceManifestBinary = {
  archivePath: string;
  binary: ArrayBuffer;
};

export type ProtocolV2PreparedResourceFile = {
  binary: ArrayBuffer;
  devicePath: string;
  size: number;
  fileHash: string;
};

export declare function prepareProtocolV2ResourceFiles(input: {
  manifest: unknown;
  files: ProtocolV2ResourceManifestBinary[];
  targetsToUpdate: readonly FirmwareUpdateV4Target[];
}): ProtocolV2PreparedResourceFile[];
