import type { ProtocolType } from '@onekeyfe/hd-transport';

export function createTransportCallLog(
  name: string,
  protocol: ProtocolType,
  data: Record<string, unknown>
) {
  if (name === 'ResourceUpdate' || name === 'ResourceAck') {
    return {
      name,
      protocol,
      file_name: data.file_name,
      hash: data.hash,
    };
  }

  return { name, protocol };
}
