/**
 * SDK 内部原生命令注册表。
 *
 * 这些方法允许开发工具通过低层 `call` 调试 Protocol V2，但不会进入
 * `CoreApi` 或公开的便捷方法集合；业务接入仍应使用统一 DeviceState API。
 */
export { default as deviceInfoGet } from './protocol-v2/DeviceInfoGet';
export { default as deviceStatusGet } from './protocol-v2/DeviceStatusGet';
export { default as deviceSettingsGet } from './protocol-v2/DeviceSettingsGet';
export { default as protocolInfoRequest } from './protocol-v2/ProtocolInfoRequest';
export { default as ping } from './protocol-v2/Ping';
export { default as deviceSessionOpen } from './protocol-v2/DeviceSessionOpen';
export { default as deviceFirmwareUpdate } from './protocol-v2/DeviceFirmwareUpdate';
export { default as deviceGetFirmwareUpdateStatus } from './protocol-v2/DeviceGetFirmwareUpdateStatus';
export { default as deviceFactoryInfoSet } from './protocol-v2/DeviceFactoryInfoSet';
export { default as deviceFactoryInfoGet } from './protocol-v2/DeviceFactoryInfoGet';
export { default as deviceSettingsSet } from './protocol-v2/DeviceSettingsSet';
export { default as deviceSettingsPageShow } from './protocol-v2/DeviceSettingsPageShow';
export { default as filesystemPermissionFix } from './protocol-v2/FilesystemPermissionFix';
export { default as filesystemFormat } from './protocol-v2/FilesystemFormat';
