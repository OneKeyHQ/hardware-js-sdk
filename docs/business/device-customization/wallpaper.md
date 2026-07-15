# Pro2 壁纸上传

## 适用范围

本文描述 Pro2 / Protocol V2 的锁屏壁纸编码、上传和激活流程。平台负责把图片解码为 RGBA，SDK 负责编码为设备格式、写入设备文件系统并设置活动壁纸。

## 公共接口

```ts
deviceUploadWallpaper(connectId, {
  width: 604,
  height: 1024,
  rgba,
  fileName,
  chunkSize,
});
```

返回值：

```ts
{
  path: string;
  size: number;
  colorFormat: 'RGB565' | 'RGB565A8';
  message?: string;
}
```

## 输入与编码约束

- 图片尺寸必须为 `604 × 1024`。
- RGBA 数据长度必须等于 `width * height * 4`。
- 完全不透明的图片编码为 `RGB565`。
- 存在透明像素时编码为 `RGB565A8`。
- 编码过程使用 8×8 阈值矩阵进行有序抖动，并生成 Pro2 可读取的二进制头和像素数据。

## 文件名策略

- 文件名仅允许字母、数字、下划线、连字符和可选的 `.bin` 后缀。
- 未指定文件名时，SDK 使用编码结果的 BLAKE2s 哈希前 12 位生成稳定名称。
- 最终路径固定在 `vol0:/wallpapers/user`，调用方不能借此写入任意设备路径。

## 上传和激活流程

1. 校验尺寸、RGBA 长度、文件名和 `chunkSize`。
2. 检测 alpha 并编码为 `RGB565` 或 `RGB565A8`。
3. 创建 `vol0:/wallpapers/user`；目录已存在时按成功处理。
4. 使用 `FilesystemFileWrite` 分片上传，第一片设置 `overwrite=true`。
5. 优先根据固件返回的 `processed_byte` 推进 offset；返回值无法推进时才使用本地 chunk 长度。
6. 上传完成后调用 `DeviceSettingsSet`，将 `settings.wallpaper_path` 设置为上传路径。

默认 chunk 大小按 BLE 或 WebUSB 环境选择。调用方提供的 `chunkSize` 不得超过当前传输上限，最终值不得小于 64 字节。文件写请求不使用普通业务调用的默认短超时。

## 失败与恢复边界

当前流程没有事务式回滚。上传中断可能留下不完整文件，同名文件会从首片开始覆盖；激活失败也不会自动删除已上传文件。应用应把上传结果与壁纸激活结果作为一次完整操作展示，并允许用户重新上传。

通过 `deviceSettingsSet({ settings: { wallpaper_path: '' } })` 可恢复设备内置默认壁纸。

## 关键代码

- `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`
- `packages/core/src/utils/pro2Wallpaper.ts`
- `packages/core/src/api/FileWrite.ts`
- `packages/core/src/api/helpers/protocolV2FileWrite.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsSet.ts`
