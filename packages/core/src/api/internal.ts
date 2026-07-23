/**
 * SDK 内部原生命令注册表。
 *
 * 这些方法允许开发工具通过低层 `call` 调试 Protocol V2，但不会进入
 * `CoreApi` 或公开的便捷方法集合；业务接入仍应使用统一 DeviceState API。
 */
export { default as deviceInfoGet } from './protocol-v2/DeviceInfoGet';
export { default as deviceStatusGet } from './protocol-v2/DeviceStatusGet';
export { default as deviceSettingsGet } from './protocol-v2/DeviceSettingsGet';
