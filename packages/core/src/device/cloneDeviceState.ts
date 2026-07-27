/**
 * Host-independent deep clone for DeviceState snapshots.
 *
 * Avoid the global structuredClone API because older Hermes and WebView hosts do not
 * provide it. Explicitly clone plain objects, arrays, binary buffers, and common
 * built-ins so initialization and state snapshots remain portable.
 */
export const cloneDeviceState = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Copy underlying binary memory so external mutation cannot alter a snapshot.
  if (value instanceof Uint8Array) {
    return new Uint8Array(value) as unknown as T;
  }
  if (value instanceof ArrayBuffer) {
    return value.slice(0) as unknown as T;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => cloneDeviceState(item)) as unknown as T;
  }

  // DeviceState contains only plain objects at this boundary.
  const cloned: Record<string, unknown> = {};
  const source = value as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    cloned[key] = cloneDeviceState(source[key]);
  }
  return cloned as unknown as T;
};
