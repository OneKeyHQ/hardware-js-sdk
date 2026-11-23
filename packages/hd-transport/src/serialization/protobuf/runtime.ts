import { ensureTextEncoding } from './text-encoding';

import type * as ProtobufModule from '@bufbuild/protobuf';
// eslint-disable-next-line import/no-unresolved
import type * as ProtobufWktModule from '@bufbuild/protobuf/wkt';

let cachedProtobuf: typeof ProtobufModule | undefined;
let cachedProtobufWkt: typeof ProtobufWktModule | undefined;

/**
 * Lazily load `@bufbuild/protobuf` after `ensureTextEncoding()` has run.
 *
 * `@bufbuild/protobuf` and `@bufbuild/protobuf/wkt` decode embedded well-known
 * type descriptors via `BinaryReader` at module import time, which throws on
 * React Native (Hermes) hosts lacking `TextEncoder`/`TextDecoder` if loaded
 * before `configureTextEncoding()` is registered.
 */
export const getProtobuf = (): typeof ProtobufModule => {
  if (!cachedProtobuf) {
    ensureTextEncoding();
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    cachedProtobuf = require('@bufbuild/protobuf') as typeof ProtobufModule;
  }
  return cachedProtobuf;
};

export const getProtobufWkt = (): typeof ProtobufWktModule => {
  if (!cachedProtobufWkt) {
    ensureTextEncoding();
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires, import/no-unresolved
    cachedProtobufWkt = require('@bufbuild/protobuf/wkt') as typeof ProtobufWktModule;
  }
  return cachedProtobufWkt;
};
