import { sha256 } from '@noble/hashes/sha256';
import JSZip from 'jszip';
import {
  parseProtocolV2ResourceManifest,
  selectProtocolV2ResourceManifestFiles,
} from '@onekeyfe/hd-core';

import type {
  CoreApi,
  FirmwareUpdateV4Target,
  IProtocolV2ResourceSource,
  ProtocolV2PreparedResourceFile,
} from '@onekeyfe/hd-core';

type FetchResponse = {
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type Fetcher = (url: string) => Promise<FetchResponse>;

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

function validateResourceArchive(archive: IProtocolV2ResourceSource | undefined) {
  if (!archive?.archiveUrl.startsWith('https://')) {
    throw new Error('Protocol V2 resource archive URL must use HTTPS');
  }
  if (!/^[a-fA-F0-9]{64}$/u.test(archive.archiveSha256)) {
    throw new Error('Invalid Protocol V2 resource archive SHA-256');
  }
  if (!Number.isSafeInteger(archive.archiveSize) || archive.archiveSize <= 0) {
    throw new Error('Invalid Protocol V2 resource archive size');
  }
  return archive;
}

export async function prepareRemoteProtocolV2ResourceFiles({
  hardwareSDK,
  archive,
  targetsToUpdate,
  fetcher = fetch as Fetcher,
}: {
  hardwareSDK: Pick<CoreApi, 'prepareProtocolV2ResourceFiles'>;
  archive: IProtocolV2ResourceSource | undefined;
  targetsToUpdate: FirmwareUpdateV4Target[];
  fetcher?: Fetcher;
}): Promise<ProtocolV2PreparedResourceFile[] | undefined> {
  if (!targetsToUpdate.includes('resource')) return undefined;

  const source = validateResourceArchive(archive);
  const response = await fetcher(source.archiveUrl);
  if (!response.ok) {
    throw new Error(`Failed to download Protocol V2 resource archive (${response.status})`);
  }

  const archiveBinary = await response.arrayBuffer();
  if (archiveBinary.byteLength !== source.archiveSize) {
    throw new Error('Protocol V2 resource archive size mismatch');
  }
  const archiveSha256 = bytesToHex(sha256(new Uint8Array(archiveBinary)));
  if (archiveSha256 !== source.archiveSha256.toLowerCase()) {
    throw new Error('Protocol V2 resource archive SHA-256 mismatch');
  }

  const zip = await JSZip.loadAsync(archiveBinary);
  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) {
    throw new Error('Protocol V2 resource archive has no manifest.json');
  }

  const manifest = parseProtocolV2ResourceManifest(
    JSON.parse(await manifestEntry.async('string')) as unknown
  );
  const selectedFiles = selectProtocolV2ResourceManifestFiles({ manifest, targetsToUpdate });
  const files = await Promise.all(
    selectedFiles.map(async file => {
      const entry = zip.file(file.archive_path);
      if (!entry) {
        throw new Error(`Protocol V2 resource archive is missing ${file.archive_path}`);
      }
      return {
        archivePath: file.archive_path,
        binary: await entry.async('arraybuffer'),
      };
    })
  );

  return hardwareSDK.prepareProtocolV2ResourceFiles({
    manifest,
    files,
    targetsToUpdate,
  });
}
