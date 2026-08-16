import { blake2s } from '@noble/hashes/blake2s';

import type { ResourceRequest, Success } from '@onekeyfe/hd-transport';

type TypedResponse<T extends string, Message> = {
  type: T;
  message: Message;
};

type ExtensionTypedCall = (
  type: string,
  responseType: string | string[],
  message?: Record<string, unknown>
) => Promise<TypedResponse<'ResourceRequest', ResourceRequest> | TypedResponse<'Success', Success>>;

const bytesToHex = (value: Uint8Array) =>
  Array.from(value)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

const INITIAL_CHUNK_SIZE = 16 * 1024;

const processResourceRequest = async (
  typedCall: ExtensionTypedCall,
  response: TypedResponse<'ResourceRequest', ResourceRequest> | TypedResponse<'Success', Success>,
  data: ArrayBuffer
): Promise<Success> => {
  if (response.type === 'Success') return response.message;

  const { offset, data_length: dataLength } = response.message;
  if (offset === undefined) throw new Error('Resource request offset is undefined');

  const chunk = new Uint8Array(
    data.slice(offset, Math.min(offset + (dataLength ?? 0), data.byteLength))
  );
  const nextResponse = await typedCall('ResourceAck', ['ResourceRequest', 'Success'], {
    data_chunk: bytesToHex(chunk),
    hash: bytesToHex(blake2s(chunk)),
  });
  return processResourceRequest(typedCall, nextResponse, data);
};

export const updateResource = async (
  typedCall: ExtensionTypedCall,
  fileName: string,
  data: ArrayBuffer
) => {
  const chunk = new Uint8Array(data.slice(0, Math.min(INITIAL_CHUNK_SIZE, data.byteLength)));
  const response = await typedCall('ResourceUpdate', ['ResourceRequest', 'Success'], {
    file_name: fileName,
    data_length: data.byteLength,
    initial_data_chunk: bytesToHex(chunk),
    hash: bytesToHex(blake2s(chunk)),
  });
  return processResourceRequest(typedCall, response, data);
};
