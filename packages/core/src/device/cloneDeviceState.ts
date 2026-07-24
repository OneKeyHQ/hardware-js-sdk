/**
 * 宿主无关的深拷贝工具，专门用于 DeviceState 快照。
 *
 * 不依赖运行时全局 structuredClone：部分宿主（旧版 Hermes / WebView）未提供该 API，
 * 直接使用会导致设备初始化、getDeviceState 与 DEVICE.STATE 在首个快照产生前抛出
 * ReferenceError。这里显式复制普通对象、数组、二进制缓冲与常见内置对象，避免依赖宿主全局。
 */
export const cloneDeviceState = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // 二进制缓冲：复制底层内存，避免外部修改污染快照
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

  // 普通对象：逐键递归复制（DeviceState 仅由接口描述，无类实例原型需保留）
  const cloned: Record<string, unknown> = {};
  const source = value as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    cloned[key] = cloneDeviceState(source[key]);
  }
  return cloned as unknown as T;
};
