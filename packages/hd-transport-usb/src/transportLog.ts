import type { ProtocolType } from '@onekeyfe/hd-transport';

const HIGH_VOLUME_CALLS = new Set(['FileWrite', 'FilesystemFileWrite', 'EmmcFileWrite']);

export function shouldSuppressHighVolumeCallLog(name: string) {
  return HIGH_VOLUME_CALLS.has(name);
}

export function createTransportCallLog(name: string, protocol: ProtocolType) {
  return { name, protocol };
}
