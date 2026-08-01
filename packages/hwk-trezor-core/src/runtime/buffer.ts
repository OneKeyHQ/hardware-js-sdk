import { Buffer as RuntimeBuffer } from 'buffer';

const globalScope = globalThis as typeof globalThis & {
  Buffer?: typeof RuntimeBuffer;
};

const uint8ArraySubarray = Uint8Array.prototype.subarray;

const toBufferView = (view: Uint8Array): Buffer =>
  RuntimeBuffer.from(view.buffer, view.byteOffset, view.byteLength);

export const toRuntimeBuffer = (bytes: Buffer | Uint8Array | ArrayBuffer): Buffer => {
  if (bytes instanceof ArrayBuffer) {
    return RuntimeBuffer.from(bytes);
  }

  return RuntimeBuffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
};

export const installBufferRuntime = () => {
  if (typeof globalScope.Buffer === 'undefined') {
    globalScope.Buffer = RuntimeBuffer;
  }

  RuntimeBuffer.prototype.subarray = function subarray(start?: number, end?: number) {
    return toBufferView(uint8ArraySubarray.call(this, start, end));
  } as typeof RuntimeBuffer.prototype.subarray;

  RuntimeBuffer.prototype.slice = function slice(start?: number, end?: number) {
    return toBufferView(uint8ArraySubarray.call(this, start, end));
  } as typeof RuntimeBuffer.prototype.slice;

  return RuntimeBuffer;
};

installBufferRuntime();

export const Buffer = RuntimeBuffer;
export default RuntimeBuffer;
